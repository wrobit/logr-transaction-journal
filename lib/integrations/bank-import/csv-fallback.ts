import { createHash } from "node:crypto";

import type { NormalizedBankTransaction } from "@/lib/integrations/types";
import { normalizeCurrency } from "@/lib/integrations/utils";

type CsvFallbackInput = {
  accountRef: string;
  csvContent: string;
};

export function parsePolishBankCsvFallback(input: CsvFallbackInput): NormalizedBankTransaction[] {
  const lines = splitCsvLines(input.csvContent);
  if (lines.length < 2) {
    return [];
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvRow(lines[0], delimiter).map((header) => normalizeHeader(header));

  return lines.slice(1).flatMap((line, index) => {
    if (!line.trim()) {
      return [];
    }

    const values = parseCsvRow(line, delimiter);
    const row = mapRow(headers, values);

    const bookedAt = row.bookingdate || row.bookedat || row.date || row.operationdate;
    const amountRaw = row.amount || row.kwota || row.value;
    const currencyRaw = row.currency || row.waluta || "PLN";

    if (!bookedAt || !amountRaw) {
      return [];
    }

    const transactionId =
      row.transactionid ||
      row.transaction_id ||
      row.id ||
      createHash("sha256")
        .update(`${input.accountRef}-${line}-${index + 1}`)
        .digest("hex")
        .slice(0, 24);

    const amount = Number(amountRaw.replaceAll(" ", "").replace(",", "."));
    if (!Number.isFinite(amount)) {
      return [];
    }

    return [
      {
        provider: "gocardless_bad",
        accountRef: input.accountRef,
        providerTransactionId: transactionId,
        bookedAt: bookedAt.slice(0, 10),
        amount,
        currency: normalizeCurrency(currencyRaw),
        counterparty: row.counterparty || row.receiver || row.sender || row.kontrahent || null,
        description: row.description || row.title || row.tytul || null,
        category: row.category || row.kategoria || null,
        rawSnapshot: row,
      } satisfies NormalizedBankTransaction,
    ];
  });
}

function splitCsvLines(csvContent: string) {
  return csvContent.replace(/^\uFEFF/, "").split(/\r?\n/);
}

function detectDelimiter(header: string) {
  const semicolons = (header.match(/;/g) ?? []).length;
  const commas = (header.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCsvRow(line: string, delimiter: string) {
  const output: string[] = [];
  let token = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        token += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      output.push(token.trim());
      token = "";
      continue;
    }

    token += char;
  }

  output.push(token.trim());
  return output;
}

function normalizeHeader(header: string) {
  return header.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function mapRow(headers: string[], values: string[]) {
  return headers.reduce<Record<string, string>>((acc, header, index) => {
    acc[header] = values[index] ?? "";
    return acc;
  }, {});
}
