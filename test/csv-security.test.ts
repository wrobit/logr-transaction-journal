import { describe, expect, it } from "vitest";

import { csvEscape, neutralizeSpreadsheetFormula } from "@/lib/export/csv";
import {
  CsvLimitError,
  MAX_CSV_CELL_LENGTH,
  MAX_CSV_COLUMNS,
  MAX_CSV_ROWS,
  parseCsvRows,
} from "@/lib/exchange-import/csv";

describe("CSV security boundaries", () => {
  it.each(["=1+1", "+cmd", "-2+3", "@SUM(A1)", "\tformula", "\rformula"])(
    "neutralizes spreadsheet formula prefix %s",
    (value) => {
      expect(neutralizeSpreadsheetFormula(value)).toBe(`'${value}`);
      expect(csvEscape(value)).toBe(`"'${value}"`);
    },
  );

  it("rejects an oversized final cell", () => {
    expect(() => parseCsvRows("a".repeat(MAX_CSV_CELL_LENGTH + 1), ",")).toThrow(CsvLimitError);
  });

  it("rejects too many columns in the final row", () => {
    expect(() => parseCsvRows(Array(MAX_CSV_COLUMNS + 1).fill("a").join(","), ",")).toThrow(
      CsvLimitError,
    );
  });

  it("rejects too many rows without requiring a trailing newline", () => {
    expect(() => parseCsvRows(Array(MAX_CSV_ROWS + 1).fill("a").join("\n"), ",")).toThrow(
      CsvLimitError,
    );
  });
});
