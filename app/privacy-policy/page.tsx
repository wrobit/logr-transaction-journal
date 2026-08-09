import type { Metadata } from "next";

import { PrivacyPolicyView } from "@/components/legal/privacy-policy-view";
import { getServerTranslator } from "@/lib/i18n/translate";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslator();

  return buildPageMetadata({
    title: t("metadata.privacyPolicy.title"),
    description: t("metadata.privacyPolicy.description"),
    path: "/privacy-policy",
    index: true,
  });
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-black px-3 py-10 md:px-4">
      <div className="mx-auto w-full max-w-4xl">
        <PrivacyPolicyView />
      </div>
    </div>
  );
}
