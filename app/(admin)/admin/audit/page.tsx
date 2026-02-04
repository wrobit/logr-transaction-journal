import type { Metadata } from "next";

import { getAdminAuditLogs } from "@/actions/admin-audit";
import { AdminAuditFilters } from "@/components/admin/admin-audit-filters";
import { AdminAuditPagination } from "@/components/admin/admin-audit-pagination";
import { AdminAuditTable } from "@/components/admin/admin-audit-table";
import { parseAdminAuditQuery } from "@/lib/admin/audit-query";

export const metadata: Metadata = {
  title: "Admin Audit",
  description: "Audit log for admin actions.",
};

type PageProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const query = parseAdminAuditQuery(resolvedParams ?? {});
  const data = await getAdminAuditLogs(query);
  const totalPages = Math.max(1, Math.ceil(data.totalCount / data.pageSize));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Audit log</h2>
        <p className="text-sm text-muted-foreground">
          Track admin actions across user management workflows.
        </p>
      </div>
      <AdminAuditFilters />
      <div className="text-xs text-muted-foreground">
        {data.totalCount} actions · showing page {data.page}
      </div>
      <AdminAuditTable rows={data.rows} />
      <AdminAuditPagination page={data.page} totalPages={totalPages} />
    </div>
  );
}
