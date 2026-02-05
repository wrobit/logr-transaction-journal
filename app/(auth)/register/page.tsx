import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";
import { getServerTranslator } from "@/lib/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslator();
  return {
    title: t("metadata.register.title"),
    description: t("metadata.register.description"),
  };
}

export default function RegisterPage() {
  return <RegisterForm />;
}
