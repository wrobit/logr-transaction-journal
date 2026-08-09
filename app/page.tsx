import type { Metadata } from "next";

import { listExchangeImportHistoryAction } from "@/actions/exchange-import";
import { listEntries } from "@/actions/entries";
import { EntriesView } from "@/components/entries/entries-view";
import { requireActiveUser } from "@/lib/auth/session";
import { ENTRY_PAGE_SIZE, parseEntryQuery } from "@/lib/entries/query";
import { getServerTranslator } from "@/lib/i18n/translate";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslator();
  return buildPageMetadata({
    title: t("metadata.entries.title"),
    description: t("metadata.entries.description"),
    path: "/",
  });
}

type PageProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const { session } = await requireActiveUser();

  const resolvedSearchParams = await searchParams;
  const query = parseEntryQuery(resolvedSearchParams ?? {});
  const [entriesResult, importHistory] = await Promise.all([
    listEntries(session.user, query),
    listExchangeImportHistoryAction(),
  ]);

  return (
    <div className="min-h-screen bg-black px-3 py-10 md:px-4">
      <div className="mx-auto w-full max-w-7xl">
        <EntriesView
          entries={entriesResult.entries}
          assets={entriesResult.assets}
          totalCount={entriesResult.totalCount}
          pageSize={ENTRY_PAGE_SIZE}
          query={query}
          displayCurrency={entriesResult.displayCurrency}
          displayRatesByEntryId={entriesResult.displayRatesByEntryId}
          importHistory={importHistory}
        />
      </div>
    </div>
  );
}
