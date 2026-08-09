"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  confirmExchangeImportAction,
  previewExchangeImportAction,
} from "@/actions/exchange-import";
import { Button } from "@/components/ui/button";
import {
  defaultExchangeImportPreviewState,
  type ExchangeImportPreviewState,
} from "@/lib/exchange-import/actions";
import type { CanonicalImportTransaction, ExchangeCsvProvider } from "@/lib/exchange-import/types";
import { buildEntryQueryParams, type EntryQuery } from "@/lib/entries/query";

type ImportHistoryItem = {
  id: string;
  provider: string;
  filename: string | null;
  importedRows: number;
  failedRows: number;
  createdAt: Date;
};

type ImportExportPanelProps = {
  history: ImportHistoryItem[];
  query: EntryQuery;
  previewAction?: typeof previewExchangeImportAction;
  confirmAction?: typeof confirmExchangeImportAction;
};

export function ImportExportPanel({
  history,
  query,
  previewAction = previewExchangeImportAction,
  confirmAction = confirmExchangeImportAction,
}: ImportExportPanelProps) {
  const t = useTranslations("entries");
  const [expanded, setExpanded] = useState(false);
  const [provider, setProvider] = useState<ExchangeCsvProvider>("kraken");
  const [failedReportCsv, setFailedReportCsv] = useState<string | null>(null);
  const [failedReportFilename, setFailedReportFilename] = useState<string>("import-failed-rows.csv");
  const [isConfirmPending, startConfirmTransition] = useTransition();

  const [previewState, formAction, isPreviewPending] = useActionState<ExchangeImportPreviewState, FormData>(
    previewAction,
    defaultExchangeImportPreviewState,
  );

  const validTransactions = useMemo(
    () =>
      (previewState.rows ?? [])
        .filter((row) => row.status === "valid" && row.transaction)
        .map((row) => row.transaction as CanonicalImportTransaction),
    [previewState.rows],
  );

  const canConfirm =
    previewState.status === "success" && validTransactions.length > 0 && !isPreviewPending && !isConfirmPending;

  const exportHref = useMemo(() => {
    const params = buildEntryQueryParams({ ...query, page: 1 });
    const queryString = params.toString();
    return queryString ? `/api/entries/export?${queryString}` : "/api/entries/export";
  }, [query]);

  const handleConfirmImport = () => {
    if (!canConfirm) {
      return;
    }

    startConfirmTransition(async () => {
      const result = await confirmAction({
        provider,
        filename: previewState.filename ?? null,
        rows: validTransactions,
      });

      if (result.status === "error") {
        toast.error(result.message ?? t("importExport.confirmError"));
        return;
      }

      if (result.failedReportCsv) {
        setFailedReportCsv(result.failedReportCsv);
        setFailedReportFilename(
          `import-failed-rows-${provider}-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.csv`,
        );
      } else {
        setFailedReportCsv(null);
      }

      toast.success(
        t("importExport.confirmSuccess", {
          imported: result.importedCount ?? 0,
          failed: result.failedCount ?? 0,
          duplicates: result.duplicateCount ?? 0,
        }),
      );
    });
  };

  const handleDownloadFailedRows = () => {
    if (!failedReportCsv) {
      return;
    }

    const blob = new Blob([failedReportCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = failedReportFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-sm border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("importExport.title")}</h2>
          <p>{t("importExport.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls="import-export-content"
          >
            {expanded ? t("importExport.collapseButton") : t("importExport.expandButton")}
          </Button>
          <a
            href={exportHref}
            className="inline-flex h-9 items-center rounded-none border border-border px-3 text-xs text-foreground transition hover:bg-muted"
          >
            {t("importExport.exportButton")}
          </a>
        </div>
      </div>

      {expanded ? (
        <>
          <form id="import-export-content" action={formAction} className="mt-4 grid gap-3 md:grid-cols-[180px,1fr,auto]">
        <label className="space-y-2">
          <span className="text-[11px] uppercase tracking-wide">{t("importExport.provider")}</span>
          <select
            name="provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value as ExchangeCsvProvider)}
            className="h-9 w-full rounded-none border border-border bg-background px-3 text-xs text-foreground"
          >
            <option value="kraken">Kraken</option>
            <option value="binance">Binance</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-[11px] uppercase tracking-wide">{t("importExport.csvFile")}</span>
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="h-9 w-full rounded-none border border-border bg-background px-3 py-1 text-xs text-foreground"
          />
        </label>

        <div className="flex items-end gap-2">
          <Button type="submit" disabled={isPreviewPending || isConfirmPending}>
            {isPreviewPending ? t("importExport.previewing") : t("importExport.previewButton")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canConfirm}
            onClick={handleConfirmImport}
          >
            {isConfirmPending ? t("importExport.importing") : t("importExport.confirmButton")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!failedReportCsv}
            onClick={handleDownloadFailedRows}
          >
            {t("importExport.downloadFailedRows")}
          </Button>
        </div>
      </form>

          {previewState.status === "error" ? (
            <p className="mt-3 text-xs text-red-400">{previewState.message}</p>
          ) : null}

          {previewState.status === "success" ? (
            <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-[11px] md:grid-cols-4">
            <div>{t("importExport.totalRows", { count: previewState.totalRows ?? 0 })}</div>
            <div>{t("importExport.validRows", { count: previewState.validRows ?? 0 })}</div>
            <div>{t("importExport.invalidRows", { count: previewState.invalidRows ?? 0 })}</div>
            <div>{t("importExport.unsupportedRows", { count: previewState.unsupportedRows ?? 0 })}</div>
          </div>

          <div className="max-h-56 overflow-auto rounded-sm border border-border">
            <table className="w-full min-w-[640px] border-collapse text-left text-[11px]">
              <thead className="bg-muted/50 uppercase tracking-wide">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">{t("importExport.status")}</th>
                  <th className="px-2 py-2">{t("importExport.market")}</th>
                  <th className="px-2 py-2">{t("importExport.operation")}</th>
                  <th className="px-2 py-2">{t("importExport.amount")}</th>
                  <th className="px-2 py-2">{t("importExport.issues")}</th>
                </tr>
              </thead>
              <tbody>
                {(previewState.rows ?? []).map((row) => {
                  const transaction = row.transaction;
                  return (
                    <tr key={`${row.rowNumber}-${row.status}`} className="border-t border-border">
                      <td className="px-2 py-2">{row.rowNumber}</td>
                      <td className="px-2 py-2">{row.status}</td>
                      <td className="px-2 py-2">
                        {transaction
                          ? `${transaction.baseAsset}/${transaction.quoteCurrency}`
                          : (row.rawRow.pair ?? row.rawRow.market ?? "-")}
                      </td>
                      <td className="px-2 py-2">{transaction?.operation ?? "-"}</td>
                      <td className="px-2 py-2">{transaction?.quantity ?? "-"}</td>
                      <td className="px-2 py-2">
                        {row.issues.length
                          ? row.issues.map((issue) => issue.code).join(", ")
                          : t("importExport.noIssues")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
            </div>
          ) : null}

          <div className="mt-4 rounded-sm border border-border bg-background p-3">
            <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("importExport.historyTitle")}
            </p>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("importExport.historyEmpty")}</p>
            ) : (
              <ul className="space-y-1 text-xs text-foreground">
                {history.map((item) => (
                  <li key={item.id}>
                    {item.provider.toUpperCase()} - {item.filename ?? "csv"} - {item.importedRows}/
                    {item.failedRows}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
