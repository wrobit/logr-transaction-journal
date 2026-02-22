import { detectDelimiter, decodeCsvInput, mapRow, normalizeHeader, parseCsvRows } from "@/lib/exchange-import/csv";
import type { ExchangeCsvParseResult } from "@/lib/exchange-import/types";
import { buildIssue, normalizeDateToIso, normalizeDecimal, normalizeOperation } from "@/lib/exchange-import/validation";

import {
  buildInvalidRow,
  buildMissingColumnsIssues,
  buildValidRow,
  splitMarketPair,
} from "@/lib/exchange-import/adapters/shared";

const REQUIRED_HEADERS = ["dateutc", "pair", "side", "price", "executed", "amount", "fee"];

const HEADER_ALIASES: Record<string, string> = {
  date: "dateutc",
  datetime: "dateutc",
  time: "dateutc",
  symbol: "pair",
  market: "pair",
  qty: "executed",
  quantity: "executed",
  quoteqty: "amount",
  total: "amount",
  feeamount: "fee",
  feecoin: "feeasset",
  commissionasset: "feeasset",
};

export function parseBinanceCsv(input: { content: string | Uint8Array; filename?: string }): ExchangeCsvParseResult {
  const decoded = decodeCsvInput(input.content);
  const firstLine = decoded.text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows = parseCsvRows(decoded.text, delimiter);
  const headers = (rows[0] ?? []).map((header) => normalizeHeader(header));
  const canonicalHeaders = headers.map((header) => HEADER_ALIASES[header] ?? header);

  const headerIssues = buildMissingColumnsIssues(canonicalHeaders, REQUIRED_HEADERS);
  if (headerIssues.length > 0) {
    return {
      provider: "binance",
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

    const operation = normalizeOperation(mapped.side);
    if (!operation) {
      issues.push(
        buildIssue({
          category: "mapping",
          code: "unsupported_operation",
          field: "side",
          message: `Unsupported operation: ${mapped.side ?? ""}`,
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

    const executedAt = normalizeDateToIso(mapped.dateutc);
    if (!executedAt) {
      issues.push(
        buildIssue({
          category: "schema",
          code: "invalid_date",
          field: "dateutc",
          message: `Invalid execution date: ${mapped.dateutc ?? ""}`,
        }),
      );
    }

    const quantity = normalizeDecimal(mapped.executed);
    if (!quantity) {
      issues.push(
        buildIssue({
          category: "business_rule",
          code: "invalid_quantity",
          field: "executed",
          message: `Invalid executed quantity: ${mapped.executed ?? ""}`,
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

    const fullPrice = normalizeDecimal(mapped.amount);
    if (!fullPrice) {
      issues.push(
        buildIssue({
          category: "business_rule",
          code: "invalid_price",
          field: "amount",
          message: `Invalid quote amount: ${mapped.amount ?? ""}`,
        }),
      );
    }

    const fee = normalizeDecimal(mapped.fee);
    if (!fee) {
      issues.push(
        buildIssue({
          category: "business_rule",
          code: "invalid_fee",
          field: "fee",
          message: `Invalid fee: ${mapped.fee ?? ""}`,
        }),
      );
    }

    const externalId = `${mapped.pair ?? "pair"}-${mapped.dateutc ?? "time"}-${rowNumber}`;

    if (issues.length > 0 || !operation || !pair || !executedAt || !quantity || !price || !fullPrice || !fee) {
      return buildInvalidRow(rowNumber, mapped, issues);
    }

    return buildValidRow("binance", rowNumber, mapped, {
      externalId,
      executedAt,
      operation,
      baseAsset: pair.baseAsset,
      quoteCurrency: pair.quoteCurrency,
      quantity,
      pricePerUnit: price,
      fullPrice,
      commission: fee,
      commissionCurrency: mapped.feeasset?.trim() || pair.quoteCurrency,
      sourceName: "Binance",
    });
  });

  return {
    provider: "binance",
    filename: input.filename ?? null,
    delimiter,
    encoding: decoded.encoding,
    headers: canonicalHeaders,
    rows: parsedRows,
  };
}
