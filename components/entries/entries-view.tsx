"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { EntryView } from "@/lib/entries/types";
import { formatNumber } from "@/lib/format/numbers";
import { AddEntryDialog } from "@/components/entries/add-entry-dialog";
import { EntriesTable } from "@/components/entries/entries-table";

const PAGE_SIZE = 10;

type EntriesViewProps = {
  entries: EntryView[];
  enableActions?: boolean;
};

export function EntriesView({ entries, enableActions = true }: EntriesViewProps) {
  const [entriesState, setEntriesState] = useState(entries);
  const [operationFilter, setOperationFilter] = useState("all");
  const [assetFilter, setAssetFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setEntriesState(entries);
  }, [entries]);

  const assets = useMemo(() => {
    const uniqueAssets = Array.from(
      new Set(entriesState.map((entry) => entry.baseAsset)),
    );

    return uniqueAssets.sort();
  }, [entriesState]);

  const filteredEntries = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00Z`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59Z`) : null;

    return entriesState.filter((entry) => {
      if (operationFilter !== "all" && entry.operation !== operationFilter) {
        return false;
      }

      if (assetFilter !== "all" && entry.baseAsset !== assetFilter) {
        return false;
      }

      if (start || end) {
        const entryDate = new Date(`${entry.date}T00:00:00Z`);
        if (start && entryDate < start) {
          return false;
        }
        if (end && entryDate > end) {
          return false;
        }
      }

      return true;
    });
  }, [assetFilter, endDate, entriesState, operationFilter, startDate]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const paginatedEntries = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return filteredEntries.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredEntries, page]);

  useEffect(() => {
    setPage(1);
  }, [operationFilter, assetFilter, startDate, endDate]);

  const handleCreated = useCallback((entry: EntryView) => {
    setEntriesState((current) => {
      const existingIndex = current.findIndex((item) => item.id === entry.id);
      if (existingIndex >= 0) {
        return current.map((item) => (item.id === entry.id ? entry : item));
      }
      return [entry, ...current];
    });
    setNotice("Entry added successfully.");
    window.setTimeout(() => setNotice(null), 4000);
  }, []);

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Entries</h1>
          <p className="text-sm text-neutral-400">
            Track every transaction with deterministic PLN valuation.
          </p>
        </div>
        {enableActions ? <AddEntryDialog onCreated={handleCreated} /> : null}
      </div>

      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200"
        >
          {notice}
        </div>
      ) : null}

      <div className="grid gap-3 rounded-sm border border-neutral-900 bg-neutral-950/40 p-4 text-xs text-neutral-300 md:grid-cols-4">
        <div className="space-y-2">
          <label
            htmlFor="start-date"
            className="text-[11px] uppercase tracking-wide text-neutral-500"
          >
            Start date
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="h-8 w-full rounded-none border border-neutral-800 bg-neutral-950 px-2 text-xs text-white"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="end-date"
            className="text-[11px] uppercase tracking-wide text-neutral-500"
          >
            End date
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="h-8 w-full rounded-none border border-neutral-800 bg-neutral-950 px-2 text-xs text-white"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="asset-filter"
            className="text-[11px] uppercase tracking-wide text-neutral-500"
          >
            Asset
          </label>
          <select
            id="asset-filter"
            value={assetFilter}
            onChange={(event) => setAssetFilter(event.target.value)}
            className="h-8 w-full rounded-none border border-neutral-800 bg-neutral-950 px-2 text-xs text-white"
          >
            <option value="all">All assets</option>
            {assets.map((asset) => (
              <option key={asset} value={asset}>
                {asset}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="operation-filter"
            className="text-[11px] uppercase tracking-wide text-neutral-500"
          >
            Operation
          </label>
          <select
            id="operation-filter"
            value={operationFilter}
            onChange={(event) => setOperationFilter(event.target.value)}
            className="h-8 w-full rounded-none border border-neutral-800 bg-neutral-950 px-2 text-xs text-white"
          >
            <option value="all">All operations</option>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span>
          Showing {paginatedEntries.length} of {filteredEntries.length} entries
        </span>
        <span>Page {page} of {totalPages}</span>
      </div>

      <EntriesTable entries={paginatedEntries} />

      <div className="flex items-center justify-between gap-3 text-xs text-neutral-400">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page === 1}
          className="rounded-none border border-neutral-800 px-3 py-2 text-xs text-white disabled:opacity-40"
        >
          Previous
        </button>
        <div className="flex items-center gap-2">
          <span className="text-neutral-500">Rows per page:</span>
          <span>{formatNumber(PAGE_SIZE)}</span>
        </div>
        <button
          type="button"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={page >= totalPages}
          className="rounded-none border border-neutral-800 px-3 py-2 text-xs text-white disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
