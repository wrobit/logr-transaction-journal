import type { Metadata } from "next";

import { GoodbyeView } from "@/components/profile/goodbye-view";
import { getServerTranslator } from "@/lib/i18n/translate";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslator();
  return buildPageMetadata({
    title: t("metadata.goodbye.title"),
    description: t("metadata.goodbye.description"),
    path: "/goodbye",
  });
}

export default function GoodbyePage() {
  return (
    <div className="min-h-screen bg-black px-3 py-10 md:px-4">
      <div className="mx-auto w-full max-w-3xl">
        <GoodbyeView />
      </div>
    </div>
  );
}
