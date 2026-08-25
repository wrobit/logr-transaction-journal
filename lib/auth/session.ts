import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/options";
import { getUserById } from "@/lib/auth/users";

export async function getActiveUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  const user = await getUserById(session.user.id);
  if (!user) {
    return null;
  }

  session.user.role = user.role;
  session.user.email = user.email;
  return { session, user };
}

export async function requireActiveUser() {
  const active = await getActiveUserSession();
  if (!active) {
    redirect("/login");
  }

  return active;
}

export function hasRecentAuthentication(authenticatedAt: number | undefined, maxAgeMs = 10 * 60_000) {
  return Boolean(authenticatedAt && Date.now() - authenticatedAt <= maxAgeMs);
}
