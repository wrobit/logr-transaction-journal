// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const valuesMock = vi.hoisted(() => vi.fn(async () => undefined));
const resolveBankProvidersMock = vi.hoisted(() => vi.fn());
const emitAlertMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({
      values: valuesMock,
    }),
  },
}));

vi.mock("@/lib/integrations/bank-import/registry", () => ({
  resolveBankImportProvidersForCountry: resolveBankProvidersMock,
}));

vi.mock("@/lib/integrations/alerts", () => ({
  emitIntegrationAlert: emitAlertMock,
}));

import { parsePolishBankCsvFallback } from "@/lib/integrations/bank-import/csv-fallback";
import { importBankTransactions } from "@/lib/integrations/bank-import/service";

describe("bank import integration", () => {
  beforeEach(() => {
    valuesMock.mockReset();
    resolveBankProvidersMock.mockReset();
    emitAlertMock.mockReset();
  });

  it("parses Polish CSV fallback and normalizes transaction fields", () => {
    const parsed = parsePolishBankCsvFallback({
      accountRef: "acc-1",
      csvContent: [
        "Booking Date;Amount;Currency;Counterparty;Description;TransactionId",
        "2025-02-01;123,45;PLN;Sklep;Zakupy;tx-1",
      ].join("\n"),
    });

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.providerTransactionId).toBe("tx-1");
    expect(parsed[0]?.amount).toBe(123.45);
    expect(parsed[0]?.currency).toBe("PLN");
  });

  it("falls back to CSV when aggregator fails", async () => {
    resolveBankProvidersMock.mockResolvedValue([
      {
        name: "gocardless_bad",
        listAccounts: vi.fn(async () => {
          throw new Error("down");
        }),
        listTransactions: vi.fn(),
        refreshConsent: vi.fn(),
      },
    ]);

    const result = await importBankTransactions({
      userId: "user-1",
      countryCode: "PL",
      csvFilename: "pko.csv",
      csvContent: [
        "Booking Date,Amount,Currency,Counterparty,Description,TransactionId",
        "2025-02-01,99.10,PLN,PKO,Przelew,tx-2",
      ].join("\n"),
    });

    expect(result.source).toBe("csv_fallback");
    expect(result.importedCount).toBe(1);
    expect(result.warnings[0]).toContain("CSV fallback");
    expect(emitAlertMock).toHaveBeenCalled();
    expect(valuesMock).toHaveBeenCalledOnce();
  });
});
