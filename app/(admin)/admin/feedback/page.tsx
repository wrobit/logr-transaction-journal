import type { Metadata } from "next";
import Link from "next/link";

import { getAdminFeedback } from "@/actions/admin-feedback";
import { AdminFeedbackFilters } from "@/components/admin/admin-feedback-filters";
import { AdminFeedbackPagination } from "@/components/admin/admin-feedback-pagination";
import { AdminFeedbackTable } from "@/components/admin/admin-feedback-table";
import { buildAdminFeedbackQueryParams, parseAdminFeedbackQuery } from "@/lib/admin/feedback-query";

export const metadata: Metadata = {
  title: "Admin Feedback",
  description: "Review account deletion feedback.",
};

type PageProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminFeedbackPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const query = parseAdminFeedbackQuery(resolvedParams ?? {});
  const data = await getAdminFeedback(query);
  const totalPages = Math.max(1, Math.ceil(data.totalCount / data.pageSize));
  const exportParams = buildAdminFeedbackQueryParams({
    reason: query.reason,
    startDate: query.startDate,
    endDate: query.endDate,
  });
  const exportHref = exportParams.toString()
    ? `/admin/feedback/export?${exportParams.toString()}`
    : "/admin/feedback/export";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Feedback</h2>
          <p className="text-sm text-muted-foreground">
            Review account deletion feedback and export records.
          </p>
        </div>
        <Link
          href={exportHref}
          className="rounded-sm border border-border px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground"
        >
          Export CSV
        </Link>
      </div>
      <AdminFeedbackFilters />
      <div className="text-xs text-muted-foreground">
        {data.totalCount} feedback submissions · showing page {data.page}
      </div>
      <AdminFeedbackTable rows={data.rows} />
      <AdminFeedbackPagination page={data.page} totalPages={totalPages} />
    </div>
  );
}
