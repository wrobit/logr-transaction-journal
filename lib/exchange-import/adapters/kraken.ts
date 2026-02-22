import { detectDelimiter, decodeCsvInput, mapRow, normalizeHeader, parseCsvRows } from "@/lib/exchange-import/csv";
import type { ExchangeCsvParseResult } from "@/lib/exchange-import/types";
import { buildIssue, normalizeDateToIso, normalizeDecimal, normalizeOperation } from "@/lib/exchange-import/validation";

import {
  buildInvalidRow,
  buildMissingColumnsIssues,
  buildValidRow,
  splitMarketPair,
} from "@/lib/exchange-import/adapters/shared";

const REQUIRED_HEADERS = ["txid", "pair", "time", "type", "price", "cost", "fee", "vol"];

export function parseKrakenCsv(input: { content: string | Uint8Array; filename?: string }): ExchangeCsvParseResult {
  const decoded = decodeCsvInput(input.content);
  const firstLine = decoded.text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = parseCsvRows(decoded.text, delimiter);
  const headers = (rows[0] ?? []).map((header) => normalizeHeader(header));

  const headerIssues = buildMissingColumnsIssues(headers, REQUIRED_HEADERS);
  if (headerIssues.length > 0) {
    return {
      provider: "kraken",
      filename: input.filename ?? null,
      delimiter,
      encoding: decoded.encoding,
      headers,
      rows: [buildInvalidRow(1, {}, headerIssues)],
    };
  }

  const parsedRows = rows.slice(1).map((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const mapped = mapRow(headers, row);
    const issues = [];

    const txid = mapped.txid?.trim();
    if (!txid) {
      issues.push(
        buildIssue({
          category: "schema",
          code: "missing_required_value",
          field: "txid",
          message: "Transaction id is required.",
        }),
      );
    }

    const operation = normalizeOperation(mapped.type);
    if (!operation) {
      issues.push(
        buildIssue({
          category: "mapping",
          code: "unsupported_operation",
          field: "type",
          message: `Unsupported operation: ${mapped.type ?? ""}`,
        }),
      );
    }

    const pair = splitMarketPair(mapped.pair ?? "");
    if (!pair) {
      issues.push(
        buildIssue({
          category: "mapping",
          code: "unsupported_market",
          field: "pair",
          message: `Unsupported market pair: ${mapped.pair ?? ""}`,
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

    const quantity = normalizeDecimal(mapped.vol);
    if (!quantity) {
      issues.push(
        buildIssue({
          category: "business_rule",
          code: "invalid_quantity",
          field: "vol",
          message: `Invalid quantity: ${mapped.vol ?? ""}`,
        }),
      );
    }

    const price = normalizeDecimal(mapped.price);
    if (!price) {
      issues.push(
        buildIssue({
          category: "business_rule",
          code: "invalid_price",
          field: "price",
          message: `Invalid price: ${mapped.price ?? ""}`,
        }),
      );
    }

    const fullPrice = normalizeDecimal(mapped.cost);
    if (!fullPrice) {
      issues.push(
        buildIssue({
          category: "business_rule",
          code: "invalid_price",
          field: "cost",
          message: `Invalid full price: ${mapped.cost ?? ""}`,
        }),
      );
    }

    const fee = normalizeDecimal(mapped.fee);
    if (mapped.fee && !fee) {
      issues.push(
        buildIssue({
          category: "business_rule",
          code: "invalid_fee",
          field: "fee",
          message: `Invalid fee: ${mapped.fee}`,
        }),
      );
    }

    if (issues.length > 0 || !txid || !operation || !pair || !executedAt || !quantity || !price || !fullPrice) {
      return buildInvalidRow(rowNumber, mapped, issues);
    }

    return buildValidRow("kraken", rowNumber, mapped, {
      externalId: txid,
      executedAt,
      operation,
      baseAsset: pair.baseAsset,
      quoteCurrency: pair.quoteCurrency,
      quantity,
      pricePerUnit: price,
      fullPrice,
      commission: fee,
      commissionCurrency: pair.quoteCurrency,
      sourceName: "Kraken",
    });
  });

  return {
    provider: "kraken",
    filename: input.filename ?? null,
    delimiter,
    encoding: decoded.encoding,
    headers,
    rows: parsedRows,
  };
}
