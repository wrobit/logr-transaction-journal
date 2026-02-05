import type { EntryView } from "@/lib/entries/types";
import { dayjs } from "@/lib/dayjs";
import { formatCurrency, formatNumber } from "@/lib/format/numbers";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

const formatDate = (value: string) =>
  dayjs.utc(value, "YYYY-MM-DD", true).format("YYYY-MM-DD");

type AdminUserEntriesTableProps = {
  entries: EntryView[];
};

export function AdminUserEntriesTable({ entries }: AdminUserEntriesTableProps) {
  const t = useTranslations("admin.userDetail");

  if (entries.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        {t("entriesEmpty")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-border">
      <table className="w-full border-collapse text-left text-xs text-foreground">
        <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-3 font-medium">{t("columns.date")}</th>
            <th className="px-3 py-3 font-medium">{t("columns.operation")}</th>
            <th className="px-3 py-3 font-medium">{t("columns.asset")}</th>
            <th className="px-3 py-3 font-medium">{t("columns.quantity")}</th>
            <th className="px-3 py-3 font-medium">{t("columns.value", { currency: "PLN" })}</th>
            <th className="px-3 py-3 font-medium">{t("columns.source")}</th>
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
                  {entry.operation === "BUY" ? t("buy") : t("sell")}
                </Badge>
              </td>
              <td className="px-3 py-3">
                {entry.baseAsset} / {entry.quoteCurrency}
              </td>
              <td className="px-3 py-3">
                {formatNumber(Number(entry.quantity))}
              </td>
              <td className="px-3 py-3">
                {formatCurrency(Number(entry.valuePln), "PLN")}
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
