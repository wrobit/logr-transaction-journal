"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AddEntryDialog } from "@/components/entries/add-entry-dialog";
import { EntriesTable } from "@/components/entries/entries-table";
import { buildEntryQueryParams, type EntryQuery } from "@/lib/entries/query";
import type { EntryView } from "@/lib/entries/types";
import { formatNumber } from "@/lib/format/numbers";

export type EntriesViewProps = {
  entries: EntryView[];
  assets: string[];
  totalCount: number;
  pageSize: number;
  query: EntryQuery;
  enableActions?: boolean;
};

export function EntriesView({
  entries,
  assets,
  totalCount,
  pageSize,
  query,
  enableActions = true,
}: EntriesViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(query.page, totalPages);
  const rowOffset = (currentPage - 1) * pageSize;

  const navigateWithQuery = useCallback(
    (nextQuery: EntryQuery) => {
      const params = buildEntryQueryParams(nextQuery);
      const queryString = params.toString();
      const href = queryString ? `/?${queryString}` : "/";
      startTransition(() => router.push(href));
    },
    [router, startTransition],
  );

  const updateQuery = useCallback(
    (updates: { page?: number; filters?: Partial<EntryQuery["filters"]> }) => {
      const nextQuery: EntryQuery = {
        page: updates.page ?? query.page,
        filters: { ...query.filters, ...updates.filters },
      };

      navigateWithQuery(nextQuery);
    },
    [navigateWithQuery, query],
  );

  const handleCreated = useCallback(
    (_entry: EntryView) => {
      toast.success("Entry added successfully.");
      startTransition(() => router.refresh());
    },
    [router, startTransition],
  );

  const handlePreview = useCallback((_entry: EntryView) => {
    toast.message("Preview is coming soon.");
  }, []);

  const handleEdit = useCallback((_entry: EntryView) => {
    toast.message("Edit is coming soon.");
  }, []);

  const handleDelete = useCallback((_entry: EntryView) => {
    toast.message("Delete is coming soon.");
  }, []);

  const startDate = query.filters.startDate ?? "";
  const endDate = query.filters.endDate ?? "";
  const assetFilter = query.filters.asset ?? "all";
  const operationFilter = query.filters.operation ?? "all";

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Entries</h1>
          <p className="text-sm text-muted-foreground">
            Track every transaction with deterministic PLN valuation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isPending ? (
            <span className="text-xs text-muted-foreground">Refreshing…</span>
          ) : null}
          {enableActions ? <AddEntryDialog onCreated={handleCreated} /> : null}
        </div>
      </div>

      <div className="grid gap-3 rounded-sm border border-border bg-muted/40 p-4 text-xs text-muted-foreground md:grid-cols-4">
        <div className="space-y-2">
          <label
            htmlFor="start-date"
            className="text-[11px] uppercase tracking-wide text-muted-foreground"
          >
            Start date
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(event) =>
              updateQuery({
                page: 1,
                filters: { startDate: event.target.value || undefined },
              })
            }
            className="h-8 w-full rounded-none border border-border bg-background px-2 text-xs text-foreground"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="end-date"
            className="text-[11px] uppercase tracking-wide text-muted-foreground"
          >
            End date
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(event) =>
              updateQuery({
                page: 1,
                filters: { endDate: event.target.value || undefined },
              })
            }
            className="h-8 w-full rounded-none border border-border bg-background px-2 text-xs text-foreground"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="asset-filter"
            className="text-[11px] uppercase tracking-wide text-muted-foreground"
          >
            Asset
          </label>
          <select
            id="asset-filter"
            value={assetFilter}
            onChange={(event) =>
              updateQuery({
                page: 1,
                filters: {
                  asset: event.target.value === "all" ? undefined : event.target.value,
                },
              })
            }
            className="h-8 w-full rounded-none border border-border bg-background px-2 text-xs text-foreground"
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
            className="text-[11px] uppercase tracking-wide text-muted-foreground"
          >
            Operation
          </label>
          <select
            id="operation-filter"
            value={operationFilter}
            onChange={(event) =>
              updateQuery({
                page: 1,
                filters: {
                  operation:
                    event.target.value === "all"
                      ? undefined
                      : (event.target.value as EntryQuery["filters"]["operation"]),
                },
              })
            }
            className="h-8 w-full rounded-none border border-border bg-background px-2 text-xs text-foreground"
          >
            <option value="all">All operations</option>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {entries.length} of {totalCount} entries
        </span>
        <span>
          Page {currentPage} of {totalPages}
        </span>
      </div>

      <div aria-busy={isPending} aria-live="polite">
        <EntriesTable
          entries={entries}
          rowOffset={rowOffset}
          showActions={enableActions}
          onPreview={handlePreview}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => updateQuery({ page: Math.max(1, currentPage - 1) })}
          disabled={isPending || currentPage === 1}
          className="rounded-none border border-border px-3 py-2 text-xs text-foreground disabled:opacity-40"
        >
          Previous
        </button>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Rows per page:</span>
          <span>{formatNumber(pageSize)}</span>
        </div>
        <button
          type="button"
          onClick={() => updateQuery({ page: Math.min(totalPages, currentPage + 1) })}
          disabled={isPending || currentPage >= totalPages}
          className="rounded-none border border-border px-3 py-2 text-xs text-foreground disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
