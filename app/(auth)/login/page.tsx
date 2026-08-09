import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { getServerTranslator } from "@/lib/i18n/translate";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslator();
  return buildPageMetadata({
    title: t("metadata.login.title"),
    description: t("metadata.login.description"),
    path: "/login",
    index: true,
  });
}

export default function LoginPage() {
  return <LoginForm />;
}
