// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildRowFingerprint, previewExchangeImport } from "@/lib/exchange-import/service";

const fixturePath = (path: string) => resolve(process.cwd(), "test/fixtures/exchange-import", path);

describe("exchange import service", () => {
  it("builds deterministic row fingerprint", () => {
    const row = {
      provider: "kraken" as const,
      externalId: "tx-k-1",
      executedAt: "2026-01-02T10:00:00.000Z",
      operation: "BUY" as const,
      baseAsset: "BTC",
      quoteCurrency: "USD",
      quantity: "0.001",
      pricePerUnit: "42000",
      fullPrice: "42",
      commission: "0.12",
      commissionCurrency: "USD",
      sourceName: "Kraken",
      rowNumber: 2,
      rawRow: {},
    };

    const first = buildRowFingerprint(row);
    const second = buildRowFingerprint(row);
    expect(first).toBe(second);
  });

  it("builds preview summary from fixture", () => {
    const content = readFileSync(fixturePath("binance/spot-valid.csv"), "utf8");
    const result = previewExchangeImport({
      provider: "binance",
      filename: "spot-valid.csv",
      content,
    });

    expect(result.status).toBe("success");
    expect(result.totalRows).toBe(2);
    expect(result.validRows).toBe(2);
    expect(result.invalidRows).toBe(0);
    expect(result.unsupportedRows).toBe(0);
  });
});
