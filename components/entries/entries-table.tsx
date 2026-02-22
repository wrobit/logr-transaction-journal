import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DisplayCurrency } from "@/lib/currency/display";
import type { EntrySortDirection, EntrySortKey } from "@/lib/entries/query";
import type { EntryView } from "@/lib/entries/types";
import { dayjs } from "@/lib/dayjs";
import { formatCurrency, formatNumber } from "@/lib/format/numbers";

const sortableColumns: Array<{ key: EntrySortKey; keyLabel: string }> = [
  { keyLabel: "created", key: "createdAt" },
  { keyLabel: "updated", key: "updatedAt" },
  { keyLabel: "operation", key: "operation" },
  { keyLabel: "asset", key: "baseAsset" },
  { keyLabel: "quantity", key: "quantity" },
  { keyLabel: "price", key: "pricePerUnit" },
  { keyLabel: "full", key: "fullPrice" },
  { keyLabel: "commission", key: "commission" },
  { keyLabel: "source", key: "source" },
  { keyLabel: "nbp", key: "nbpRate" },
  { keyLabel: "valuePln", key: "valuePln" },
];

type EntriesTableProps = {
  entries: EntryView[];
  displayCurrency: DisplayCurrency;
  displayRatesByEntryId: Record<string, number>;
  rowOffset?: number;
  showActions?: boolean;
  sortBy: EntrySortKey;
  sortDir: EntrySortDirection;
  onSort: (column: EntrySortKey) => void;
  onEdit?: (entry: EntryView) => void;
  onDelete?: (entry: EntryView) => void;
};

export function EntriesTable({
  entries,
  displayCurrency,
  displayRatesByEntryId,
  rowOffset = 0,
  showActions = false,
  sortBy,
  sortDir,
  onSort,
  onEdit,
  onDelete,
}: EntriesTableProps) {
  const locale = useLocale();
  const t = useTranslations("entries");

  if (entries.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  const formatDate = (value: string) => dayjs(value).format("YYYY-MM-DD");

  return (
    <div className="overflow-x-auto overflow-y-hidden rounded-sm border border-border">
      <table className="min-w-[1180px] w-full border-collapse text-left text-xs text-foreground">
        <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-3 font-medium">{t("table.index")}</th>
            {sortableColumns.map((column) => {
              const isActive = sortBy === column.key;
              const label =
                column.keyLabel === "valuePln"
                  ? t("table.valuePln", { currency: displayCurrency })
                  : t(`table.${column.keyLabel}`);
              return (
                <th key={column.key} className="px-3 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => onSort(column.key)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground transition hover:text-foreground"
                  >
                    {label}
                    {isActive ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    ) : null}
                  </button>
                </th>
              );
            })}
            <th className="px-3 py-3 font-medium">{t("table.attribution")}</th>
            <th className="px-3 py-3 font-medium">{t("table.note")}</th>
            {showActions ? <th className="px-3 py-3 font-medium">{t("table.actions")}</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((entry, index) => (
            <tr key={entry.id} className="bg-background">
              <td className="px-3 py-3 text-muted-foreground">
                {rowOffset + index + 1}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {formatDate(entry.createdAt)}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {formatDate(entry.updatedAt)}
              </td>
              <td className="px-3 py-3">
                <Badge
                  variant="secondary"
                  className={
                    entry.operation === "BUY"
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-red-500/10 text-red-300"
                  }
                >
                  {entry.operation === "BUY" ? t("buy") : t("sell")}
                </Badge>
              </td>
              <td className="px-3 py-3">
                {entry.baseAsset} / {displayCurrency}
              </td>
              <td className="px-3 py-3">
                {formatNumber(Number(entry.quantity), undefined, locale)}
              </td>
              <td className="px-3 py-3">
                {formatNumber(
                  (Number(entry.pricePerUnit) * Number(entry.nbpRate)) /
                    (displayRatesByEntryId[entry.id] ?? 1),
                  undefined,
                  locale,
                )}
              </td>
              <td className="px-3 py-3">
                {formatNumber(
                  (Number(entry.fullPrice) * Number(entry.nbpRate)) /
                    (displayRatesByEntryId[entry.id] ?? 1),
                  undefined,
                  locale,
                )}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {entry.commission
                    ? formatNumber(
                        (Number(entry.commission) * Number(entry.nbpRate)) /
                          (displayRatesByEntryId[entry.id] ?? 1),
                        undefined,
                        locale,
                      )
                    : "-"}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {entry.source ?? "-"}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {formatNumber(displayRatesByEntryId[entry.id] ?? 1, undefined, locale)}
              </td>
              <td className="px-3 py-3">
                {formatCurrency(
                  Number(entry.valuePln) / (displayRatesByEntryId[entry.id] ?? 1),
                  displayCurrency,
                  locale,
                )}
              </td>
              <td className="px-3 py-3">
                <div className="space-y-1">
                  <div className="text-muted-foreground">
                    {(entry.rateAttribution?.provider ?? "nbp").toUpperCase()} · {entry.rateAttribution?.method ?? "official_publication"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {entry.rateAttribution?.effectiveDate ?? entry.nbpRateDate}
                  </div>
                  {entry.rateAttribution?.warnings?.length ? (
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-300">
                      {t("table.fallbackWarning")}
                    </Badge>
                  ) : null}
                </div>
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {entry.note ?? "-"}
              </td>
              {showActions ? (
                <td className="px-3 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                          aria-label={t("table.openActions")}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onEdit?.(entry)}>
                        <Pencil />
                        {t("table.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => onDelete?.(entry)}
                      >
                        <Trash2 />
                        {t("table.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
