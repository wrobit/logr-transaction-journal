import { dayjs } from "@/lib/dayjs";
import type { AdminAuditRow } from "@/actions/admin-audit";
import { getAdminAuditActionLabel } from "@/lib/admin/audit-query";
import { Badge } from "@/components/ui/badge";

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
  if (rows.length === 0) {
    return (
      <div className="rounded-sm border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        No audit activity for this filter.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-border">
      <table className="w-full border-collapse text-left text-xs text-foreground">
        <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-3 font-medium">Timestamp</th>
            <th className="px-3 py-3 font-medium">Action</th>
            <th className="px-3 py-3 font-medium">Actor</th>
            <th className="px-3 py-3 font-medium">Target</th>
            <th className="px-3 py-3 font-medium">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className="bg-background">
              <td className="px-3 py-3 text-muted-foreground">
                {formatDateTime(row.createdAt)}
              </td>
              <td className="px-3 py-3">
                <Badge variant="secondary">{getAdminAuditActionLabel(row.action)}</Badge>
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                <div className="space-y-1">
                  <div>{row.actorEmail ?? row.actorLogin}</div>
                  <div className="text-[11px]">{row.actorLogin}</div>
                </div>
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {row.targetEmail ? (
                  <div className="space-y-1">
                    <div>{row.targetEmail}</div>
                    <div className="text-[11px]">{row.targetLogin}</div>
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
