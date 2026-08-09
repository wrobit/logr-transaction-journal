import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";
import { getServerTranslator } from "@/lib/i18n/translate";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslator();
  return buildPageMetadata({
    title: t("metadata.register.title"),
    description: t("metadata.register.description"),
    path: "/register",
    index: true,
  });
}

export default function RegisterPage() {
  return <RegisterForm />;
}
