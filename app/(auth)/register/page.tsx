import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Register",
  description: "Create an Entry account to track crypto transactions.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
