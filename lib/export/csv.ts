const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function neutralizeSpreadsheetFormula(value: string) {
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

export function csvEscape(value: unknown) {
  const safe = neutralizeSpreadsheetFormula(String(value));
  return `"${safe.replace(/"/g, '""')}"`;
}
