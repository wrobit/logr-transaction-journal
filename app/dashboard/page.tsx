import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { getDashboardData } from "@/actions/dashboard";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { authOptions } from "@/lib/auth/options";
import { parseDashboardQuery } from "@/lib/dashboard/query";
import { getServerTranslator } from "@/lib/i18n/translate";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslator();
  return buildPageMetadata({
    title: t("metadata.dashboard.title"),
    description: t("metadata.dashboard.description"),
    path: "/dashboard",
  });
}

type PageProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const query = parseDashboardQuery(resolvedSearchParams ?? {});
  const data = await getDashboardData(session.user, query);

  return (
    <div className="min-h-screen bg-black px-3 py-10 md:px-4">
      <div className="mx-auto w-full max-w-7xl">
        <DashboardView data={data} query={query} />
      </div>
    </div>
  );
}
