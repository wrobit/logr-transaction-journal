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
import type { EntrySortDirection, EntrySortKey } from "@/lib/entries/query";
import type { EntryView } from "@/lib/entries/types";
import { dayjs } from "@/lib/dayjs";
import { formatNumber, formatPln } from "@/lib/format/numbers";

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
    <div className="overflow-hidden rounded-sm border border-border">
      <table className="w-full border-collapse text-left text-xs text-foreground">
        <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-3 font-medium">{t("table.index")}</th>
            {sortableColumns.map((column) => {
              const isActive = sortBy === column.key;
              return (
                <th key={column.key} className="px-3 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => onSort(column.key)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground transition hover:text-foreground"
                  >
                    {t(`table.${column.keyLabel}`)}
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
                  {entry.operation}
                </Badge>
              </td>
              <td className="px-3 py-3">
                {entry.baseAsset} / {entry.quoteCurrency}
              </td>
              <td className="px-3 py-3">
                  {formatNumber(Number(entry.quantity), undefined, locale)}
              </td>
              <td className="px-3 py-3">
                  {formatNumber(Number(entry.pricePerUnit), undefined, locale)}
              </td>
              <td className="px-3 py-3">
                  {formatNumber(Number(entry.fullPrice), undefined, locale)}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {entry.commission
                    ? formatNumber(Number(entry.commission), undefined, locale)
                    : "-"}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {entry.source ?? "-"}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {formatNumber(Number(entry.nbpRate), undefined, locale)}
              </td>
              <td className="px-3 py-3">
                {formatPln(Number(entry.valuePln), locale)}
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
