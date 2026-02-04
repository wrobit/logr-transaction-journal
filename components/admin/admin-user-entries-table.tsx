import type { Entry } from "@/lib/db/schema";
import { dayjs } from "@/lib/dayjs";
import { formatNumber, formatPln } from "@/lib/format/numbers";
import { Badge } from "@/components/ui/badge";

const formatDate = (value: Date) => dayjs.utc(value).format("YYYY-MM-DD");

type AdminUserEntriesTableProps = {
  entries: Entry[];
};

export function AdminUserEntriesTable({ entries }: AdminUserEntriesTableProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        No entries recorded for this user.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-border">
      <table className="w-full border-collapse text-left text-xs text-foreground">
        <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-3 font-medium">Date</th>
            <th className="px-3 py-3 font-medium">Operation</th>
            <th className="px-3 py-3 font-medium">Asset</th>
            <th className="px-3 py-3 font-medium">Quantity</th>
            <th className="px-3 py-3 font-medium">Value PLN</th>
            <th className="px-3 py-3 font-medium">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((entry) => (
            <tr key={entry.id} className="bg-background">
              <td className="px-3 py-3 text-muted-foreground">
                {formatDate(entry.date)}
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
                {formatPln(Number(entry.valuePln))}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {entry.source ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
