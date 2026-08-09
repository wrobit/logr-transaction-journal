import { normalizeHeader } from "@/lib/exchange-import/csv";
import { parseBinanceCsv } from "@/lib/exchange-import/adapters/binance";
import { parseKrakenCsv } from "@/lib/exchange-import/adapters/kraken";
import type { ExchangeCsvParseResult, ExchangeCsvProvider } from "@/lib/exchange-import/types";

export function parseExchangeCsv(input: {
  content: string | Uint8Array;
  filename?: string;
  provider?: ExchangeCsvProvider;
}): ExchangeCsvParseResult {
  if (input.provider === "kraken") {
    return parseKrakenCsv(input);
  }

  if (input.provider === "binance") {
    return parseBinanceCsv(input);
  }

  const headerLine = readFirstLine(input.content);
  const normalized = headerLine.split(/[,;\t]/).map((header) => normalizeHeader(header));

  if (normalized.includes("txid") && normalized.includes("ordertype") && normalized.includes("pair")) {
    return parseKrakenCsv(input);
  }

  if (normalized.includes("dateutc") && normalized.includes("executed") && normalized.includes("fee")) {
    return parseBinanceCsv(input);
  }

  return parseBinanceCsv(input);
}

function readFirstLine(input: string | Uint8Array): string {
  const text = typeof input === "string" ? input : new TextDecoder("utf-8").decode(input);
  return text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
}
