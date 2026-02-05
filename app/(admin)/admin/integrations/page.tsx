import type { Metadata } from "next";

import { getAdminIntegrationOverview } from "@/actions/admin-integrations";
import { AdminIntegrationsView } from "@/components/admin/admin-integrations-view";
import { getServerTranslator } from "@/lib/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslator();

  return {
    title: t("metadata.adminIntegrations.title"),
    description: t("metadata.adminIntegrations.description"),
  };
}

export default async function AdminIntegrationsPage() {
  const overview = await getAdminIntegrationOverview();

  return <AdminIntegrationsView overview={overview} />;
}
