import { Badge } from "@/components/ui/badge";
import { formatNumber, formatPln } from "@/lib/format/numbers";
import type { EntryView } from "@/lib/entries/types";

const columns = [
  "Date",
  "Operation",
  "Asset",
  "Quantity",
  "Price",
  "Full",
  "Commission",
  "Source",
  "NBP",
  "Value PLN",
  "Note",
];

type EntriesTableProps = {
  entries: EntryView[];
};

export function EntriesTable({ entries }: EntriesTableProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        No entries yet. Add your first transaction to get started.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-border">
      <table className="w-full border-collapse text-left text-xs text-foreground">
        <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((entry) => (
            <tr key={entry.id} className="bg-background">
              <td className="px-3 py-3 text-muted-foreground">{entry.date}</td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
