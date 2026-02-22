"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { AddEntryDialog } from "@/components/entries/add-entry-dialog";
import { DeleteEntryDialog } from "@/components/entries/delete-entry-dialog";
import { EditEntryDialog } from "@/components/entries/edit-entry-dialog";
import { ImportExportPanel } from "@/components/entries/import-export-panel";
import { EntriesTable } from "@/components/entries/entries-table";
import type { DisplayCurrency } from "@/lib/currency/display";
import { buildEntryQueryParams, type EntryQuery } from "@/lib/entries/query";
import type { EntryView } from "@/lib/entries/types";
import { formatNumber } from "@/lib/format/numbers";

export type EntriesViewProps = {
  entries: EntryView[];
  assets: string[];
  totalCount: number;
  pageSize: number;
  query: EntryQuery;
  displayCurrency: DisplayCurrency;
  displayRatesByEntryId: Record<string, number>;
  importHistory: Array<{
    id: string;
    provider: string;
    filename: string | null;
    importedRows: number;
    failedRows: number;
    createdAt: Date;
  }>;
  enableActions?: boolean;
};

export function EntriesView({
  entries,
  assets,
  totalCount,
  pageSize,
  query,
  displayCurrency,
  displayRatesByEntryId,
  importHistory,
  enableActions = true,
}: EntriesViewProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("entries");
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
    (updates: {
      page?: number;
      filters?: Partial<EntryQuery["filters"]>;
      sortBy?: EntryQuery["sortBy"];
      sortDir?: EntryQuery["sortDir"];
    }) => {
      const nextQuery: EntryQuery = {
        page: updates.page ?? query.page,
        filters: { ...query.filters, ...updates.filters },
        sortBy: updates.sortBy ?? query.sortBy,
        sortDir: updates.sortDir ?? query.sortDir,
      };

      navigateWithQuery(nextQuery);
    },
    [navigateWithQuery, query],
  );

  const [editingEntry, setEditingEntry] = useState<EntryView | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<EntryView | null>(null);
  const [taxReportYear, setTaxReportYear] = useState<string>(String(new Date().getUTCFullYear()));
  const taxReportYearOptions = useMemo(() => {
    const currentYear = new Date().getUTCFullYear();
    return Array.from({ length: 6 }, (_, index) => String(currentYear - index));
  }, []);
  const taxReportHref =
    taxReportYear === "all"
      ? "/api/tax-report/export/pdf"
      : `/api/tax-report/export/pdf?year=${encodeURIComponent(taxReportYear)}`;

  const handleCreated = useCallback(
    () => {
      toast.success(t("createdSuccess"));
      startTransition(() => router.refresh());
    },
    [router, startTransition, t],
  );

  const handleUpdated = useCallback(
    () => {
      toast.success(t("updatedSuccess"));
      startTransition(() => router.refresh());
    },
    [router, startTransition, t],
  );

  const handleDeleted = useCallback(() => {
    toast.success(t("deletedSuccess"));
    startTransition(() => router.refresh());
  }, [router, startTransition, t]);

  const handleEdit = useCallback((entry: EntryView) => {
    setEditingEntry(entry);
  }, []);

  const handleDelete = useCallback((entry: EntryView) => {
    setDeletingEntry(entry);
  }, []);

  const handleSort = useCallback(
    (column: EntryQuery["sortBy"]) => {
      if (column === query.sortBy) {
        updateQuery({
          page: 1,
          sortDir: query.sortDir === "asc" ? "desc" : "asc",
        });
        return;
      }

      updateQuery({ page: 1, sortBy: column, sortDir: "asc" });
    },
    [query.sortBy, query.sortDir, updateQuery],
  );

  const startDate = query.filters.startDate ?? "";
  const endDate = query.filters.endDate ?? "";
  const assetFilter = query.filters.asset ?? "all";
  const operationFilter = query.filters.operation ?? "all";

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {isPending ? (
            <span className="text-xs text-muted-foreground">{t("refreshing")}</span>
          ) : null}
          <div className="flex items-center gap-2">
            <label htmlFor="tax-report-year" className="sr-only">
              {t("taxReport.year")}
            </label>
            <select
              id="tax-report-year"
              value={taxReportYear}
              onChange={(event) => setTaxReportYear(event.target.value)}
              className="h-9 rounded-none border border-border bg-background px-2 text-xs text-foreground"
            >
              <option value="all">{t("taxReport.allYears")}</option>
              {taxReportYearOptions.map((yearOption) => (
                <option key={yearOption} value={yearOption}>
                  {yearOption}
                </option>
              ))}
            </select>
            <a
              href={taxReportHref}
              className="inline-flex h-9 items-center rounded-none border border-border px-3 text-xs text-foreground transition hover:bg-muted"
            >
              {t("taxReport.button")}
            </a>
          </div>
          {enableActions ? <AddEntryDialog onCreated={handleCreated} /> : null}
        </div>
      </div>

      {enableActions ? <ImportExportPanel history={importHistory} query={query} /> : null}

      <div className="grid gap-3 rounded-sm border border-border bg-muted/40 p-4 text-xs text-muted-foreground md:grid-cols-4">
        <div className="space-y-2">
          <label
            htmlFor="start-date"
            className="text-[11px] uppercase tracking-wide text-muted-foreground"
          >
            {t("startDate")}
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
            {t("endDate")}
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
            {t("asset")}
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
            <option value="all">{t("allAssets")}</option>
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
            {t("operation")}
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
            <option value="all">{t("allOperations")}</option>
            <option value="BUY">{t("buy")}</option>
            <option value="SELL">{t("sell")}</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {t("showing", { shown: entries.length, total: totalCount })}
        </span>
        <span>{t("page", { current: currentPage, total: totalPages })}</span>
      </div>

      <div aria-busy={isPending} aria-live="polite">
        <EntriesTable
          entries={entries}
          displayCurrency={displayCurrency}
          displayRatesByEntryId={displayRatesByEntryId}
          rowOffset={rowOffset}
          showActions={enableActions}
          sortBy={query.sortBy}
          sortDir={query.sortDir}
          onSort={handleSort}
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
          {t("previous")}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t("rowsPerPage")}</span>
          <span>{formatNumber(pageSize, undefined, locale)}</span>
        </div>
        <button
          type="button"
          onClick={() => updateQuery({ page: Math.min(totalPages, currentPage + 1) })}
          disabled={isPending || currentPage >= totalPages}
          className="rounded-none border border-border px-3 py-2 text-xs text-foreground disabled:opacity-40"
        >
          {t("next")}
        </button>
      </div>

      <EditEntryDialog
        entry={editingEntry}
        open={Boolean(editingEntry)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingEntry(null);
          }
        }}
        onUpdated={handleUpdated}
      />

      <DeleteEntryDialog
        entry={deletingEntry}
        open={Boolean(deletingEntry)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeletingEntry(null);
          }
        }}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
