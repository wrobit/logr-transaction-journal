import type { Metadata } from "next";

import { getAdminAnalyticsData } from "@/actions/admin-analytics";
import { AdminAnalyticsView } from "@/components/admin/admin-analytics-view";
import { parseAdminAnalyticsQuery } from "@/lib/admin/analytics-query";
import { getServerTranslator } from "@/lib/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslator();
  return {
    title: t("metadata.admin.title"),
    description: t("metadata.admin.description"),
  };
}

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
