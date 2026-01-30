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
      <div className="rounded-sm border border-neutral-900 bg-neutral-950/40 p-6 text-center text-sm text-neutral-400">
        No entries yet. Add your first transaction to get started.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-neutral-900">
      <table className="w-full border-collapse text-left text-xs text-neutral-200">
        <thead className="bg-neutral-950 text-[11px] uppercase tracking-wide text-neutral-500">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-900">
          {entries.map((entry) => (
            <tr key={entry.id} className="bg-neutral-950/30">
              <td className="px-3 py-3 text-neutral-400">{entry.date}</td>
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
              <td className="px-3 py-3 text-neutral-400">
                {entry.commission
                  ? formatNumber(Number(entry.commission))
                  : "—"}
              </td>
              <td className="px-3 py-3 text-neutral-400">
                {entry.source ?? "—"}
              </td>
              <td className="px-3 py-3 text-neutral-400">
                {formatNumber(Number(entry.nbpRate))}
              </td>
              <td className="px-3 py-3">
                {formatPln(Number(entry.valuePln))}
              </td>
              <td className="px-3 py-3 text-neutral-400">
                {entry.note ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
