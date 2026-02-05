import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { getServerTranslator } from "@/lib/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslator();
  return {
    title: t("metadata.login.title"),
    description: t("metadata.login.description"),
  };
}

export default function LoginPage() {
  return <LoginForm />;
}
