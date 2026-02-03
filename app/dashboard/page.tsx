import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { getDashboardData } from "@/actions/dashboard";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { authOptions } from "@/lib/auth/options";
import { parseDashboardQuery } from "@/lib/dashboard/query";

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
    <div className="min-h-screen bg-black px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <DashboardView data={data} query={query} />
      </div>
    </div>
  );
}
