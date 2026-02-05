// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDashboardData } from "@/actions/dashboard";
import type { DashboardQuery } from "@/lib/dashboard/query";
import { dayjs } from "@/lib/dayjs";
import { encryptEntryPayload } from "@/lib/entries/encryption";
import type { EntryPayload } from "@/lib/entries/types";

const selectMock = vi.hoisted(() => vi.fn());
const ensureUserIdMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());
const dek = vi.hoisted(() => Buffer.alloc(32, 5));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

vi.mock("@/lib/auth/users", () => ({
  ensureUserId: ensureUserIdMock,
}));

vi.mock("@/lib/entries/encryption", async () => {
  const actual = await vi.importActual<typeof import("@/lib/entries/encryption")>(
    "@/lib/entries/encryption",
  );

  return {
    ...actual,
    getUserDek: vi.fn().mockResolvedValue(dek),
  };
});

const createSelectChain = <T,>(result: T) => ({
  from: () => ({
    where: () => ({
      orderBy: () => Promise.resolve(result),
    }),
  }),
});

const createSelectLimitChain = <T,>(result: T) => ({
  from: () => ({
    where: () => ({
      limit: () => Promise.resolve(result),
    }),
  }),
});


const createUpdateChain = () => ({
  set: () => ({
    where: () => Promise.resolve([]),
  }),
});

const baseQuery: DashboardQuery = { range: "all" };

describe("dashboard aggregations", () => {
  const originalKek = process.env.ENTRY_KEK;

  beforeEach(() => {
    selectMock.mockReset();
    ensureUserIdMock.mockReset();
    updateMock.mockReset();
    updateMock.mockReturnValue(createUpdateChain());
    process.env.ENTRY_KEK = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  });

  afterEach(() => {
    if (originalKek === undefined) {
      delete process.env.ENTRY_KEK;
    } else {
      process.env.ENTRY_KEK = originalKek;
    }
  });

  it("returns empty data when user is missing", async () => {
    ensureUserIdMock.mockResolvedValue(null);

    const result = await getDashboardData({}, baseQuery);

    expect(result).toEqual({
      displayCurrency: "PLN",
      totals: { buyValue: 0, sellValue: 0, pnlValue: 0 },
      series: [],
      holdings: [],
      holdingsMix: [],
      assets: [],
    });
  });

  it("aggregates totals, series, and holdings", async () => {
    ensureUserIdMock.mockResolvedValue("user-1");

    const buildPayload = (payload: Pick<EntryPayload, "operation" | "baseAsset" | "quantity" | "valuePln">): EntryPayload => ({
      operation: payload.operation,
      baseAsset: payload.baseAsset,
      quoteCurrency: "USD",
      quantity: payload.quantity,
      pricePerUnit: "100",
      fullPrice: payload.valuePln,
      commission: null,
      source: null,
      note: null,
      nbpRateDate: "2025-01-01",
      nbpRate: "4.0",
      valuePln: payload.valuePln,
    });

    const entryRows = [
      {
        date: dayjs.utc("2025-01-01").toDate(),
        encryptedPayload: encryptEntryPayload(
          buildPayload({ operation: "BUY", baseAsset: "SOL", quantity: "2", valuePln: "100" }),
          dek,
        ),
      },
      {
        date: dayjs.utc("2025-01-01").toDate(),
        encryptedPayload: encryptEntryPayload(
          buildPayload({ operation: "SELL", baseAsset: "SOL", quantity: "1", valuePln: "60" }),
          dek,
        ),
      },
      {
        date: dayjs.utc("2025-01-02").toDate(),
        encryptedPayload: encryptEntryPayload(
          buildPayload({ operation: "BUY", baseAsset: "BTC", quantity: "0.5", valuePln: "200" }),
          dek,
        ),
      },
      {
        date: dayjs.utc("2025-01-02").toDate(),
        encryptedPayload: encryptEntryPayload(
          buildPayload({ operation: "SELL", baseAsset: "BTC", quantity: "0.5", valuePln: "500" }),
          dek,
        ),
      },
    ];

    selectMock
      .mockReturnValueOnce(createSelectLimitChain([{ displayCurrency: "PLN" }]))
      .mockReturnValueOnce(createSelectChain(entryRows));

    const result = await getDashboardData({ id: "user-1" }, baseQuery);


    expect(result.totals).toEqual({ buyValue: 300, sellValue: 560, pnlValue: 260 });
    expect(result.series).toEqual([
      { date: "2025-01-01", buyValue: 100, sellValue: 60, pnlValue: -40 },
      { date: "2025-01-02", buyValue: 200, sellValue: 500, pnlValue: 260 },
    ]);
    expect(result.holdings).toEqual([
      {
        asset: "BTC",
        netQuantity: 0,
        buyValue: 200,
        sellValue: 500,
        pnlValue: 300,
        netValue: -300,
      },
      {
        asset: "SOL",
        netQuantity: 1,
        buyValue: 100,
        sellValue: 60,
        pnlValue: -40,
        netValue: 40,
      },
    ]);
    expect(result.holdingsMix).toEqual([{ asset: "SOL", value: 40 }]);
    expect(result.assets).toEqual(["BTC", "SOL"]);
  });
});
