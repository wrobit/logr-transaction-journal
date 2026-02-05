import { dayjs } from "@/lib/dayjs";
import type { AdminAuditRow } from "@/actions/admin-audit";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

const formatDateTime = (value: Date) => dayjs.utc(value).format("YYYY-MM-DD HH:mm");

type AdminAuditTableProps = {
  rows: AdminAuditRow[];
};

const formatMetadata = (metadata: Record<string, unknown> | null) => {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "—";
  }

  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
};

export function AdminAuditTable({ rows }: AdminAuditTableProps) {
  const t = useTranslations("admin.audit");

  const actionLabel = (action: string) => {
    if (action === "user.deactivated") {
      return t("actionLabels.userDeactivated");
    }
    if (action === "user.restored") {
      return t("actionLabels.userRestored");
    }
    if (action === "entries.purged") {
      return t("actionLabels.entriesPurged");
    }
    return action;
  };

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
            <th className="px-3 py-3 font-medium">{t("columns.timestamp")}</th>
            <th className="px-3 py-3 font-medium">{t("columns.action")}</th>
            <th className="px-3 py-3 font-medium">{t("columns.actor")}</th>
            <th className="px-3 py-3 font-medium">{t("columns.target")}</th>
            <th className="px-3 py-3 font-medium">{t("columns.details")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className="bg-background">
              <td className="px-3 py-3 text-muted-foreground">
                {formatDateTime(row.createdAt)}
              </td>
              <td className="px-3 py-3">
                <Badge variant="secondary">{actionLabel(row.action)}</Badge>
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                <div className="space-y-1">
                  <div>{row.actorEmail ?? row.actorLogin}</div>
                  {row.actorLogin && row.actorLogin !== row.actorEmail ? (
                    <div className="text-[11px]">{row.actorLogin}</div>
                  ) : null}
                </div>
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {row.targetEmail ? (
                  <div className="space-y-1">
                    <div>{row.targetEmail}</div>
                    {row.targetLogin && row.targetLogin !== row.targetEmail ? (
                      <div className="text-[11px]">{row.targetLogin}</div>
                    ) : null}
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {formatMetadata(row.metadata)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
