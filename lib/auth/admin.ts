import { redirect } from "next/navigation";

import { getActiveUserSession } from "@/lib/auth/session";

export async function requireAdminSession() {
  const active = await getActiveUserSession();

  if (!active) {
    redirect("/login");
  }

  if (active.user.role !== "admin") {
    redirect("/");
  }

  return active.session;
}

export async function getAdminSession() {
  const active = await getActiveUserSession();

  if (!active || active.user.role !== "admin") {
    return null;
  }

  return active.session;
}
