import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EntriesView } from "@/components/entries/entries-view";
import type { EntryView } from "@/lib/entries/types";

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

describe("EntriesView", () => {
  it("filters by asset", () => {
    render(<EntriesView entries={entries} enableActions={false} />);

    fireEvent.change(screen.getByLabelText(/asset/i), {
      target: { value: "SOL" },
    });

    expect(screen.getByRole("cell", { name: /sol/i })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: /btc/i })).not.toBeInTheDocument();
  });

  it("moves between pages", () => {
    const manyEntries = Array.from({ length: 12 }, (_, index) => ({
      ...entries[0],
      id: String(index + 1),
      baseAsset: `ASSET-${index + 1}`,
    }));

    render(<EntriesView entries={manyEntries} enableActions={false} />);

    expect(screen.getByText(/Page 1 of 2/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Next/i));

    expect(screen.getByText(/Page 2 of 2/i)).toBeInTheDocument();
  });
});
