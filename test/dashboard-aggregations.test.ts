// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDashboardData } from "@/actions/dashboard";
import type { DashboardQuery } from "@/lib/dashboard/query";

const selectMock = vi.hoisted(() => vi.fn());
const selectDistinctMock = vi.hoisted(() => vi.fn());
const ensureUserIdMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
    selectDistinct: selectDistinctMock,
  },
}));

vi.mock("@/lib/auth/users", () => ({
  ensureUserId: ensureUserIdMock,
}));

const createSelectChain = <T,>(result: T) => ({
  from: () => ({
    where: () => ({
      orderBy: () => Promise.resolve(result),
    }),
  }),
});

const baseQuery: DashboardQuery = { range: "all" };

describe("dashboard aggregations", () => {
  beforeEach(() => {
    selectMock.mockReset();
    selectDistinctMock.mockReset();
    ensureUserIdMock.mockReset();
  });

  it("returns empty data when user is missing", async () => {
    ensureUserIdMock.mockResolvedValue(null);

    const result = await getDashboardData({}, baseQuery);

    expect(result).toEqual({
      totals: { buyValue: 0, sellValue: 0, pnlValue: 0 },
      series: [],
      holdings: [],
      holdingsMix: [],
      assets: [],
    });
  });

  it("aggregates totals, series, and holdings", async () => {
    ensureUserIdMock.mockResolvedValue("user-1");

    const entryRows = [
      {
        date: new Date("2025-01-01T00:00:00Z"),
        operation: "BUY",
        baseAsset: "SOL",
        quantity: "2",
        valuePln: "100",
      },
      {
        date: new Date("2025-01-01T00:00:00Z"),
        operation: "SELL",
        baseAsset: "SOL",
        quantity: "1",
        valuePln: "60",
      },
      {
        date: new Date("2025-01-02T00:00:00Z"),
        operation: "BUY",
        baseAsset: "BTC",
        quantity: "0.5",
        valuePln: "200",
      },
      {
        date: new Date("2025-01-02T00:00:00Z"),
        operation: "SELL",
        baseAsset: "BTC",
        quantity: "0.5",
        valuePln: "500",
      },
    ];
    const assetRows = [{ baseAsset: "BTC" }, { baseAsset: "SOL" }];

    selectMock.mockReturnValue(createSelectChain(entryRows));
    selectDistinctMock.mockReturnValue(createSelectChain(assetRows));

    const result = await getDashboardData({ id: "user-1" }, baseQuery);

    expect(result.totals).toEqual({ buyValue: 300, sellValue: 560, pnlValue: 260 });
    expect(result.series).toEqual([
      { date: "2025-01-01", buyValue: 100, sellValue: 60, pnlValue: -40 },
      { date: "2025-01-02", buyValue: 200, sellValue: 500, pnlValue: 300 },
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
