import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { oauthAccounts, users } from "@/lib/db/schema";

const DEFAULT_LAST_NAME = "User";
const adminAllowlist = new Set(
  (process.env.ADMIN_EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean),
);

export class OAuthAccountCollisionError extends Error {
  constructor() {
    super("An account already exists for this email with another sign-in provider.");
    this.name = "OAuthAccountCollisionError";
  }
}

export function normalizeEmail(email: string) {
  return email.trim().normalize("NFKC").toLowerCase();
}

function isEmailAllowlisted(email: string) {
  return adminAllowlist.has(normalizeEmail(email));
}

function resolveUserRole(email: string) {
  return isEmailAllowlisted(email) ? "admin" : "user";
}

export async function getUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, normalizedEmail), isNull(users.deletedAt)))
    .limit(1);

  return user ?? null;
}

export async function getUserById(id: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1);

  return user ?? null;
}

export async function ensureUserId({
  id,
  email,
}: {
  id?: string | null;
  email?: string | null;
  name?: string | null;
}) {
  if (id) {
    const existing = await getUserById(id);
    if (existing) {
      return existing.id;
    }
  }

  if (!email) {
    return null;
  }

  const existingByEmail = await getUserByEmail(email);
  return existingByEmail?.id ?? null;
}

export async function getUserByLogin(login: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.login, login.trim()), isNull(users.deletedAt)))
    .limit(1);

  return user ?? null;
}

export async function getUserByOauthAccount(provider: string, providerAccountId: string) {
  const [result] = await db
    .select({ user: users, account: oauthAccounts })
    .from(oauthAccounts)
    .innerJoin(users, eq(oauthAccounts.userId, users.id))
    .where(
      and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerAccountId, providerAccountId),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  return result ?? null;
}

export async function createOauthUser({
  provider,
  providerAccountId,
  email,
  name,
}: {
  provider: string;
  providerAccountId: string;
  email: string;
  name?: string | null;
}) {
  const normalizedEmail = normalizeEmail(email);
  const { firstName, lastName } = splitName(name);

  return db.transaction(async (tx) => {
    const [existingAccount] = await tx
      .select({ user: users })
      .from(oauthAccounts)
      .innerJoin(users, eq(oauthAccounts.userId, users.id))
      .where(
        and(
          eq(oauthAccounts.provider, provider),
          eq(oauthAccounts.providerAccountId, providerAccountId),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (existingAccount) {
      return existingAccount.user;
    }

    const [emailOwner] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (emailOwner) {
      throw new OAuthAccountCollisionError();
    }

    const [createdUser] = await tx
      .insert(users)
      .values({
        email: normalizedEmail,
        login: normalizedEmail,
        firstName,
        lastName,
        role: resolveUserRole(normalizedEmail),
      })
      .returning();

    if (!createdUser) {
      throw new Error("Failed to create OAuth user.");
    }

    await tx.insert(oauthAccounts).values({
      userId: createdUser.id,
      provider,
      providerAccountId,
      providerEmail: normalizedEmail,
    });

    return createdUser;
  });
}

export async function updateUserLoginMetadata({
  userId,
  email,
  provider,
  providerAccountId,
}: {
  userId: string;
  email?: string | null;
  provider?: string;
  providerAccountId?: string;
}) {
  const updates: Partial<typeof users.$inferInsert> = {
    lastLoginAt: new Date(),
  };

  if (email && isEmailAllowlisted(email)) {
    updates.role = "admin";
  }

  const [user] = await db
    .update(users)
    .set(updates)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .returning();

  if (provider && providerAccountId) {
    await db
      .update(oauthAccounts)
      .set({ lastLoginAt: new Date() })
      .where(
        and(
          eq(oauthAccounts.provider, provider),
          eq(oauthAccounts.providerAccountId, providerAccountId),
        ),
      );
  }

  return user ?? null;
}

function splitName(name?: string | null) {
  if (!name) {
    return { firstName: "Logr", lastName: DEFAULT_LAST_NAME };
  }

  const [firstName, ...rest] = name.trim().split(/\s+/);
  return {
    firstName: firstName || "Logr",
    lastName: rest.join(" ") || DEFAULT_LAST_NAME,
  };
}
