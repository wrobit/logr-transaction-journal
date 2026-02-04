import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { listEntries } from "@/actions/entries";
import { EntriesView } from "@/components/entries/entries-view";
import { authOptions } from "@/lib/auth/options";
import { ENTRY_PAGE_SIZE, parseEntryQuery } from "@/lib/entries/query";

export const metadata: Metadata = {
  title: {
    absolute: "Entry - The best minimalistic encrypted crypto journal",
  },
  description: "Review and add crypto transactions with PLN valuation.",
};

type PageProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const query = parseEntryQuery(resolvedSearchParams ?? {});
  const entriesResult = await listEntries(session.user, query);

  return (
    <div className="min-h-screen bg-black px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <EntriesView
          entries={entriesResult.entries}
          assets={entriesResult.assets}
          totalCount={entriesResult.totalCount}
          pageSize={ENTRY_PAGE_SIZE}
          query={query}
        />
      </div>
    </div>
  );
}
