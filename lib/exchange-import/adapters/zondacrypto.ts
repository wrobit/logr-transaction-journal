import { detectDelimiter, decodeCsvInput, mapRow, normalizeHeader, parseCsvRows } from "@/lib/exchange-import/csv";
import type { ExchangeCsvParseResult } from "@/lib/exchange-import/types";
import { buildIssue, normalizeDateToIso, normalizeDecimal, normalizeOperation } from "@/lib/exchange-import/validation";

import {
  buildInvalidRow,
  buildMissingColumnsIssues,
  buildValidRow,
  splitMarketPair,
} from "@/lib/exchange-import/adapters/shared";

const REQUIRED_HEADERS = ["market", "time", "useraction", "amount", "rate", "commissionvalue"];

const HEADER_ALIASES: Record<string, string> = {
  pair: "market",
  symbol: "market",
  operation: "useraction",
  side: "useraction",
  date: "time",
  timestamp: "time",
  fee: "commissionvalue",
};

export function parseZondaCryptoCsv(input: {
  content: string | Uint8Array;
  filename?: string;
}): ExchangeCsvParseResult {
  const decoded = decodeCsvInput(input.content);
  const firstLine = decoded.text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = parseCsvRows(decoded.text, delimiter);
  const headers = (rows[0] ?? []).map((header) => normalizeHeader(header));
  const canonicalHeaders = headers.map((header) => HEADER_ALIASES[header] ?? header);

  const headerIssues = buildMissingColumnsIssues(canonicalHeaders, REQUIRED_HEADERS);
  if (headerIssues.length > 0) {
    return {
      provider: "zondacrypto",
      filename: input.filename ?? null,
      delimiter,
      encoding: decoded.encoding,
      headers: canonicalHeaders,
      rows: [buildInvalidRow(1, {}, headerIssues)],
    };
  }

  const parsedRows = rows.slice(1).map((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const mapped = mapRow(canonicalHeaders, row);
    const issues = [];

    const operation = normalizeOperation(mapped.useraction);
    if (!operation) {
      issues.push(
        buildIssue({
          category: "mapping",
          code: "unsupported_operation",
          field: "useraction",
          message: `Unsupported operation: ${mapped.useraction ?? ""}`,
        }),
      );
    }

    const pair = splitMarketPair(mapped.market ?? "");
    if (!pair) {
      issues.push(
        buildIssue({
          category: "mapping",
          code: "unsupported_market",
          field: "market",
          message: `Unsupported market pair: ${mapped.market ?? ""}`,
        }),
      );
    }

    const executedAt = normalizeDateToIso(mapped.time);
    if (!executedAt) {
      issues.push(
        buildIssue({
          category: "schema",
          code: "invalid_date",
          field: "time",
          message: `Invalid execution date: ${mapped.time ?? ""}`,
        }),
      );
    }

    const quantity = normalizeDecimal(mapped.amount);
    if (!quantity) {
      issues.push(
        buildIssue({
          category: "business_rule",
          code: "invalid_quantity",
          field: "amount",
          message: `Invalid amount: ${mapped.amount ?? ""}`,
        }),
      );
    }

    const price = normalizeDecimal(mapped.rate);
    if (!price) {
      issues.push(
        buildIssue({
          category: "business_rule",
          code: "invalid_price",
          field: "rate",
          message: `Invalid rate: ${mapped.rate ?? ""}`,
        }),
      );
    }

    const fee = normalizeDecimal(mapped.commissionvalue);
    if (mapped.commissionvalue && !fee) {
      issues.push(
        buildIssue({
          category: "business_rule",
          code: "invalid_fee",
          field: "commissionvalue",
          message: `Invalid commission: ${mapped.commissionvalue}`,
        }),
      );
    }

    const fullPrice = quantity && price ? String(Number(quantity) * Number(price)) : null;
    if (!fullPrice || Number.isNaN(Number(fullPrice)) || Number(fullPrice) <= 0) {
      issues.push(
        buildIssue({
          category: "business_rule",
          code: "invalid_price",
          field: "amount|rate",
          message: "Cannot derive full price from amount and rate.",
        }),
      );
    }

    const externalId = `${mapped.id ?? mapped.offerid ?? mapped.historyid ?? "zonda"}-${rowNumber}`;

    if (issues.length > 0 || !operation || !pair || !executedAt || !quantity || !price || !fullPrice) {
      return buildInvalidRow(rowNumber, mapped, issues);
    }

    return buildValidRow("zondacrypto", rowNumber, mapped, {
      externalId,
      executedAt,
      operation,
      baseAsset: pair.baseAsset,
      quoteCurrency: pair.quoteCurrency,
      quantity,
      pricePerUnit: price,
      fullPrice,
      commission: fee,
      commissionCurrency: pair.quoteCurrency,
      sourceName: "ZondaCrypto",
    });
  });

  return {
    provider: "zondacrypto",
    filename: input.filename ?? null,
    delimiter,
    encoding: decoded.encoding,
    headers: canonicalHeaders,
    rows: parsedRows,
  };
}
