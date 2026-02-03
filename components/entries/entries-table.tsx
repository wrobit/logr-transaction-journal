import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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

const sortableColumns: Array<{ label: string; key: EntrySortKey }> = [
  { label: "Created", key: "createdAt" },
  { label: "Updated", key: "updatedAt" },
  { label: "Operation", key: "operation" },
  { label: "Asset", key: "baseAsset" },
  { label: "Quantity", key: "quantity" },
  { label: "Price", key: "pricePerUnit" },
  { label: "Full", key: "fullPrice" },
  { label: "Commission", key: "commission" },
  { label: "Source", key: "source" },
  { label: "NBP", key: "nbpRate" },
  { label: "Value PLN", key: "valuePln" },
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
  if (entries.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        No entries yet. Add your first transaction to get started.
      </div>
    );
  }

  const formatDate = (value: string) => dayjs(value).format("YYYY-MM-DD");

  return (
    <div className="overflow-hidden rounded-sm border border-border">
      <table className="w-full border-collapse text-left text-xs text-foreground">
        <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-3 font-medium">#</th>
            {sortableColumns.map((column) => {
              const isActive = sortBy === column.key;
              return (
                <th key={column.key} className="px-3 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => onSort(column.key)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground transition hover:text-foreground"
                  >
                    {column.label}
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
            <th className="px-3 py-3 font-medium">Note</th>
            {showActions ? <th className="px-3 py-3 font-medium">Actions</th> : null}
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
                {formatNumber(Number(entry.quantity))}
              </td>
              <td className="px-3 py-3">
                {formatNumber(Number(entry.pricePerUnit))}
              </td>
              <td className="px-3 py-3">
                {formatNumber(Number(entry.fullPrice))}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {entry.commission
                  ? formatNumber(Number(entry.commission))
                  : "—"}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {entry.source ?? "—"}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {formatNumber(Number(entry.nbpRate))}
              </td>
              <td className="px-3 py-3">
                {formatPln(Number(entry.valuePln))}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {entry.note ?? "—"}
              </td>
              {showActions ? (
                <td className="px-3 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Open entry actions"
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onEdit?.(entry)}>
                        <Pencil />
                        Edit entry
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => onDelete?.(entry)}
                      >
                        <Trash2 />
                        Delete entry
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
