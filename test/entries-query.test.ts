import { describe, expect, it } from "vitest";

import {
  buildEntryConditions,
  buildEntryQueryParams,
  parseEntryQuery,
} from "@/lib/entries/query";

describe("entry query parsing", () => {
  it("parses query params into filters", () => {
    const query = parseEntryQuery({
      page: "2",
      asset: "btc",
      operation: "SELL",
      startDate: "2025-01-10",
      endDate: "2025-02-01",
    });

    expect(query).toEqual({
      page: 2,
      filters: {
        asset: "BTC",
        operation: "SELL",
        startDate: "2025-01-10",
        endDate: "2025-02-01",
      },
      sortBy: "updatedAt",
      sortDir: "desc",
    });
  });

  it("ignores invalid query params", () => {
    const query = parseEntryQuery({
      page: "0",
      asset: "",
      operation: "HOLD",
      startDate: "bad",
    });

    expect(query).toEqual({
      page: 1,
      filters: {},
      sortBy: "updatedAt",
      sortDir: "desc",
    });
  });

  it("builds query params from filters", () => {
    const params = buildEntryQueryParams({
      page: 3,
      filters: { asset: "ETH", operation: "BUY" },
      sortBy: "quantity",
      sortDir: "desc",
    });

    expect(params.get("page")).toBe("3");
    expect(params.get("asset")).toBe("ETH");
    expect(params.get("operation")).toBe("BUY");
    expect(params.get("sortBy")).toBe("quantity");
    expect(params.get("sortDir")).toBe("desc");
  });
});

describe("entry filter conditions", () => {
  it("includes filters in the condition list", () => {
    const conditions = buildEntryConditions("user-1", {
      asset: "SOL",
      operation: "BUY",
      startDate: "2025-01-01",
      endDate: "2025-01-31",
    });

    expect(conditions).toHaveLength(6);
  });
});
