import type { Metadata } from "next";

import { getAdminAnalyticsData } from "@/actions/admin-analytics";
import { AdminAnalyticsView } from "@/components/admin/admin-analytics-view";
import { parseAdminAnalyticsQuery } from "@/lib/admin/analytics-query";

export const metadata: Metadata = {
  title: "Admin",
  description: "Admin overview and system monitoring for Entry.",
};

type PageProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const query = parseAdminAnalyticsQuery(resolvedSearchParams ?? {});
  const data = await getAdminAnalyticsData(query);

  return <AdminAnalyticsView data={data} query={query} />;
}
