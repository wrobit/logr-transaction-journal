import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EntriesView } from "@/components/entries/entries-view";
import type { EntryQuery } from "@/lib/entries/query";
import type { EntryView } from "@/lib/entries/types";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const entries: EntryView[] = [
  {
    id: "1",
    userId: "u1",
    date: "2025-10-22",
    operation: "BUY",
    baseAsset: "SOL",
    quoteCurrency: "PLN",
    quantity: "2",
    pricePerUnit: "100",
    fullPrice: "200",
    commission: null,
    source: "BINANCE",
    note: null,
    nbpRateDate: "2025-10-21",
    nbpRate: "1",
    valuePln: "200",
    createdAt: "2025-10-22T00:00:00Z",
    updatedAt: "2025-10-22T00:00:00Z",
  },
  {
    id: "2",
    userId: "u1",
    date: "2025-10-20",
    operation: "SELL",
    baseAsset: "BTC",
    quoteCurrency: "EUR",
    quantity: "1",
    pricePerUnit: "1000",
    fullPrice: "1000",
    commission: "5",
    source: null,
    note: "Test",
    nbpRateDate: "2025-10-19",
    nbpRate: "4",
    valuePln: "4000",
    createdAt: "2025-10-20T00:00:00Z",
    updatedAt: "2025-10-20T00:00:00Z",
  },
];

const baseQuery: EntryQuery = {
  page: 1,
  filters: {},
  sortBy: "updatedAt",
  sortDir: "desc",
};

describe("EntriesView", () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
  });

  it("updates query params on asset filter", () => {
    render(
      <EntriesView
        entries={entries}
        assets={["SOL", "BTC"]}
        totalCount={entries.length}
        pageSize={10}
        query={baseQuery}
        enableActions={false}
      />,
    );

    fireEvent.change(screen.getByLabelText(/asset/i), {
      target: { value: "SOL" },
    });

    expect(push).toHaveBeenCalledWith("/?asset=SOL");
  });

  it("updates query params on page change", () => {
    const manyEntries = Array.from({ length: 10 }, (_, index) => ({
      ...entries[0],
      id: String(index + 1),
      baseAsset: `ASSET-${index + 1}`,
    }));

    render(
      <EntriesView
        entries={manyEntries}
        assets={["SOL", "BTC"]}
        totalCount={12}
        pageSize={10}
        query={baseQuery}
        enableActions={false}
      />,
    );

    fireEvent.click(screen.getByText(/Next/i));

    expect(push).toHaveBeenCalledWith("/?page=2");
  });
});
