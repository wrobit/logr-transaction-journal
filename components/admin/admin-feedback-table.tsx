import { dayjs } from "@/lib/dayjs";
import { Badge } from "@/components/ui/badge";
import type { AdminFeedbackRow } from "@/actions/admin-feedback";
import { useTranslations } from "next-intl";

const formatDateTime = (value: Date) => dayjs.utc(value).format("YYYY-MM-DD HH:mm");

type AdminFeedbackTableProps = {
  rows: AdminFeedbackRow[];
};

export function AdminFeedbackTable({ rows }: AdminFeedbackTableProps) {
  const t = useTranslations("admin.feedback");
  const tr = useTranslations("profile.deleteDialog.reasons");

  if (rows.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-border">
      <table className="w-full border-collapse text-left text-xs text-foreground">
        <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-3 font-medium">{t("columns.submitted")}</th>
            <th className="px-3 py-3 font-medium">{t("columns.reason")}</th>
            <th className="px-3 py-3 font-medium">{t("columns.notes")}</th>
            <th className="px-3 py-3 font-medium">{t("columns.user")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className="bg-background">
              <td className="px-3 py-3 text-muted-foreground">
                {formatDateTime(row.createdAt)}
              </td>
              <td className="px-3 py-3">
                <Badge variant="secondary">{row.reason ? tr(row.reason) : "-"}</Badge>
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {row.notes || "—"}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {row.userEmail ? (
                  <div className="space-y-1">
                    <div>{row.userEmail}</div>
                    {row.userLogin && row.userLogin !== row.userEmail ? (
                      <div className="text-[11px]">{row.userLogin}</div>
                    ) : null}
                  </div>
                ) : (
                  t("deletedUser")
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
