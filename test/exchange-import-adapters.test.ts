// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseBinanceCsv } from "@/lib/exchange-import/adapters/binance";
import { parseKrakenCsv } from "@/lib/exchange-import/adapters/kraken";
import { parseExchangeCsv } from "@/lib/exchange-import/adapters";
import { decodeCsvInput } from "@/lib/exchange-import/csv";

const fixturePath = (path: string) => resolve(process.cwd(), "test/fixtures/exchange-import", path);
const samplePath = (path: string) => resolve(process.cwd(), "public/samples", path);

describe("exchange CSV adapters", () => {
  it("parses Kraken trades CSV into canonical row", () => {
    const result = parseKrakenCsv({
      content: [
        "txid,ordertxid,pair,time,type,ordertype,price,cost,fee,vol",
        "tx-1,ord-1,XXBTZUSD,2026-01-02 10:00:00,buy,limit,42000,42,0.12,0.001",
      ].join("\n"),
    });

    expect(result.provider).toBe("kraken");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.status).toBe("valid");

    if (result.rows[0]?.status === "valid") {
      expect(result.rows[0].transaction.baseAsset).toBe("BTC");
      expect(result.rows[0].transaction.quoteCurrency).toBe("USD");
      expect(result.rows[0].transaction.operation).toBe("BUY");
      expect(result.rows[0].transaction.fullPrice).toBe("42");
    }
  });

  it("parses Binance spot trade CSV with alias headers", () => {
    const result = parseBinanceCsv({
      content: [
        "Date(UTC),Pair,Side,Price,Executed,Amount,Fee,Fee Coin",
        "2026-01-03 11:30:00,BTCUSDT,SELL,43000,0.002,86,0.043,USDT",
      ].join("\n"),
    });

    expect(result.provider).toBe("binance");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.status).toBe("valid");

    if (result.rows[0]?.status === "valid") {
      expect(result.rows[0].transaction.operation).toBe("SELL");
      expect(result.rows[0].transaction.baseAsset).toBe("BTC");
      expect(result.rows[0].transaction.quoteCurrency).toBe("USDT");
      expect(result.rows[0].transaction.commissionCurrency).toBe("USDT");
    }
  });

  it("auto-detects provider using headers", () => {
    const result = parseExchangeCsv({
      content: [
        "txid,ordertxid,pair,time,type,ordertype,price,cost,fee,vol",
        "tx-2,ord-2,XETHZEUR,2026-01-04 09:00:00,sell,market,3000,300,1,0.1",
      ].join("\n"),
    });

    expect(result.provider).toBe("kraken");
    expect(result.rows[0]?.status).toBe("valid");
  });

  it("detects UTF-8 BOM encoded CSV", () => {
    const bytes = new Uint8Array([
      0xef,
      0xbb,
      0xbf,
      ...new TextEncoder().encode("Date(UTC),Pair,Side,Price,Executed,Amount,Fee\n2026-01-03,BTCUSDT,BUY,1,1,1,0"),
    ]);

    const decoded = decodeCsvInput(bytes);
    expect(decoded.encoding).toBe("utf-8-bom");
    expect(decoded.text.startsWith("Date(UTC)")).toBe(true);
  });

  it("parses Kraken fixture CSV", () => {
    const content = readFileSync(fixturePath("kraken/trades-valid.csv"), "utf8");
    const result = parseKrakenCsv({ content });

    expect(result.rows.length).toBe(2);
    expect(result.rows.every((row) => row.status === "valid")).toBe(true);
  });

  it("parses reusable Kraken sample CSV", () => {
    const content = readFileSync(samplePath("kraken-import-sample.csv"), "utf8");
    const result = parseKrakenCsv({ content });
    const validRows = result.rows.filter((row) => row.status === "valid");
    const buyRows = validRows.filter((row) => row.transaction.operation === "BUY");
    const sellRows = validRows.filter((row) => row.transaction.operation === "SELL");

    expect(result.provider).toBe("kraken");
    expect(result.rows).toHaveLength(60);
    expect(validRows).toHaveLength(60);
    expect(buyRows).toHaveLength(30);
    expect(sellRows).toHaveLength(30);
  });

  it("parses reusable Binance sample CSV", () => {
    const content = readFileSync(samplePath("binance-import-sample.csv"), "utf8");
    const result = parseBinanceCsv({ content });
    const validRows = result.rows.filter((row) => row.status === "valid");
    const buyRows = validRows.filter((row) => row.transaction.operation === "BUY");
    const sellRows = validRows.filter((row) => row.transaction.operation === "SELL");

    expect(result.provider).toBe("binance");
    expect(result.rows).toHaveLength(60);
    expect(validRows).toHaveLength(60);
    expect(buyRows).toHaveLength(30);
    expect(sellRows).toHaveLength(30);
  });

  it("parses Binance fixture CSV", () => {
    const content = readFileSync(fixturePath("binance/spot-valid.csv"), "utf8");
    const result = parseBinanceCsv({ content });

    expect(result.rows.length).toBe(2);
    expect(result.rows.every((row) => row.status === "valid")).toBe(true);
  });

});
