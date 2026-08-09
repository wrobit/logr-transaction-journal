export type CsvDelimiter = "," | ";" | "\t";

export const MAX_CSV_BYTES = 5 * 1024 * 1024;
export const MAX_CSV_ROWS = 10_000;
export const MAX_CSV_COLUMNS = 100;
export const MAX_CSV_CELL_LENGTH = 10_000;

export class CsvLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvLimitError";
  }
}

export function decodeCsvInput(input: string | Uint8Array): {
  text: string;
  encoding: "utf-8" | "utf-8-bom" | "utf-16le" | "utf-16be";
} {
  if (typeof input === "string") {
    return { text: stripUtf8Bom(input), encoding: "utf-8" };
  }

  if (input.length >= 3 && input[0] === 0xef && input[1] === 0xbb && input[2] === 0xbf) {
    return {
      text: new TextDecoder("utf-8").decode(input.slice(3)),
      encoding: "utf-8-bom",
    };
  }

  if (input.length >= 2 && input[0] === 0xff && input[1] === 0xfe) {
    return {
      text: new TextDecoder("utf-16le").decode(input.slice(2)),
      encoding: "utf-16le",
    };
  }

  if (input.length >= 2 && input[0] === 0xfe && input[1] === 0xff) {
    const swapped = new Uint8Array(input.length - 2);
    for (let index = 2; index + 1 < input.length; index += 2) {
      swapped[index - 2] = input[index + 1]!;
      swapped[index - 1] = input[index]!;
    }

    return {
      text: new TextDecoder("utf-16le").decode(swapped),
      encoding: "utf-16be",
    };
  }

  return {
    text: new TextDecoder("utf-8").decode(input),
    encoding: "utf-8",
  };
}

export function detectDelimiter(headerLine: string): CsvDelimiter {
  const candidates: CsvDelimiter[] = [",", ";", "\t"];
  const winner = candidates.reduce(
    (acc, delimiter) => {
      const score = (headerLine.match(new RegExp(escapeRegex(delimiter), "g")) ?? []).length;
      if (score > acc.score) {
        return { delimiter, score };
      }

      return acc;
    },
    { delimiter: "," as CsvDelimiter, score: -1 },
  );

  return winner.delimiter;
}

export function parseCsvRows(text: string, delimiter: CsvDelimiter): string[][] {
  if (new TextEncoder().encode(text).byteLength > MAX_CSV_BYTES) {
    throw new CsvLimitError("CSV file exceeds the 5 MB limit.");
  }

  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  const assertFieldLimit = () => {
    if (currentField.length > MAX_CSV_CELL_LENGTH) {
      throw new CsvLimitError("CSV cell exceeds the maximum length.");
    }
  };

  const pushField = () => {
    assertFieldLimit();
    currentRow.push(currentField.trim());
    if (currentRow.length > MAX_CSV_COLUMNS) {
      throw new CsvLimitError("CSV row exceeds the column limit.");
    }
    currentField = "";
  };

  const pushRow = () => {
    pushField();
    if (!isRowEmpty(currentRow)) {
      rows.push(currentRow);
      if (rows.length > MAX_CSV_ROWS) {
        throw new CsvLimitError("CSV file exceeds the row limit.");
      }
    }
    currentRow = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    const next = text[index + 1];

    if (currentField.length > MAX_CSV_CELL_LENGTH) {
      throw new CsvLimitError("CSV cell exceeds the maximum length.");
    }

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      pushField();
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      pushRow();
      continue;
    }

    currentField += char;
  }

  if (currentField || currentRow.length > 0) {
    pushRow();
  }

  return rows;
}

export function mapRow(headers: string[], values: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  for (let index = 0; index < headers.length; index += 1) {
    row[headers[index]!] = values[index] ?? "";
  }
  return row;
}

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function stripUtf8Bom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isRowEmpty(row: string[]): boolean {
  return row.every((field) => field.trim() === "");
}
