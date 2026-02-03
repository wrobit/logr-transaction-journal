import crypto from "crypto";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import type { RegisterInput } from "@/lib/auth/validation";

const DEFAULT_LAST_NAME = "User";

export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
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
  name,
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
  if (existingByEmail) {
    return existingByEmail.id;
  }

  const created = await createOauthUser({ email, name });
  return created.id;
}

export async function getUserByLogin(login: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.login, login), isNull(users.deletedAt)))
    .limit(1);

  return user ?? null;
}

export async function createCredentialsUser(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      login: input.login,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    })
    .returning();

  return user;
}

export async function createOauthUser({
  email,
  name,
}: {
  email: string;
  name?: string | null;
}) {
  const { firstName, lastName } = splitName(name);
  const passwordHash = await hashPassword(crypto.randomUUID());

  const [user] = await db
    .insert(users)
    .values({
      email,
      login: email,
      passwordHash,
      firstName,
      lastName,
    })
    .returning();

  return user;
}

function splitName(name?: string | null) {
  if (!name) {
    return { firstName: "Entry", lastName: DEFAULT_LAST_NAME };
  }

  const [firstName, ...rest] = name.trim().split(" ");
  return {
    firstName: firstName || "Entry",
    lastName: rest.join(" ") || DEFAULT_LAST_NAME,
  };
}
