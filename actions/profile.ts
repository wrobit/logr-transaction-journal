"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth/options";
import {
  ensureUserId,
  getUserByEmail,
  getUserById,
  getUserByLogin,
} from "@/lib/auth/users";
import { db } from "@/lib/db";
import { feedbacks, users } from "@/lib/db/schema";
import { dayjs } from "@/lib/dayjs";
import type { DeleteAccountState, UpdateProfileState } from "@/lib/profile/actions";
import { serializeProfile } from "@/lib/profile/serialize";
import type { ProfileView } from "@/lib/profile/types";
import {
  deleteAccountSchema,
  profileUpdateSchema,
} from "@/lib/profile/validation";

export type SessionUser = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
};

export async function getProfile(user: SessionUser): Promise<ProfileView | null> {
  const userId = await ensureUserId(user);

  if (!userId) {
    return null;
  }

  const record = await getUserById(userId);
  return record ? serializeProfile(record) : null;
}

const buildProfileInput = (formData: FormData) => ({
  firstName: String(formData.get("firstName") ?? ""),
  lastName: String(formData.get("lastName") ?? ""),
  login: String(formData.get("login") ?? ""),
  email: String(formData.get("email") ?? ""),
});

const getValidationErrors = (error: z.ZodError) => {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
};

export async function updateProfile(
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      status: "error",
      message: "You must be signed in to update your profile.",
    };
  }

  const userId = await ensureUserId(session.user);

  if (!userId) {
    return {
      status: "error",
      message: "User record missing. Please sign in again.",
    };
  }

  const rawInput = buildProfileInput(formData);
  const parsed = profileUpdateSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { status: "error", errors: getValidationErrors(parsed.error) };
  }

  const existingUser = await getUserById(userId);

  if (!existingUser) {
    return {
      status: "error",
      message: "User record missing. Please sign in again.",
    };
  }

  const [emailOwner, loginOwner] = await Promise.all([
    parsed.data.email !== existingUser.email
      ? getUserByEmail(parsed.data.email)
      : null,
    parsed.data.login !== existingUser.login
      ? getUserByLogin(parsed.data.login)
      : null,
  ]);

  const uniqueErrors: Record<string, string> = {};

  if (emailOwner && emailOwner.id !== userId) {
    uniqueErrors.email = "Email is already in use.";
  }

  if (loginOwner && loginOwner.id !== userId) {
    uniqueErrors.login = "Login is already in use.";
  }

  if (Object.keys(uniqueErrors).length > 0) {
    return { status: "error", errors: uniqueErrors };
  }

  const [updated] = await db
    .update(users)
    .set({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      login: parsed.data.login,
      email: parsed.data.email,
      updatedAt: dayjs.utc().toDate(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    return { status: "error", message: "Profile not found." };
  }

  revalidatePath("/profile");

  return {
    status: "success",
    profile: serializeProfile(updated),
  };
}

export async function deleteAccount(
  _prevState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      status: "error",
      message: "You must be signed in to delete your account.",
    };
  }

  const userId = await ensureUserId(session.user);

  if (!userId) {
    return {
      status: "error",
      message: "User record missing. Please sign in again.",
    };
  }

  const parsed = deleteAccountSchema.safeParse({
    confirmation: formData.get("confirmation"),
    reason: formData.get("reason"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Type DELETE to confirm account deletion.",
    };
  }

  const shouldStoreFeedback = Boolean(parsed.data.reason || parsed.data.notes);

  if (shouldStoreFeedback) {
    await db.insert(feedbacks).values({
      userId,
      reason: parsed.data.reason ?? null,
      notes: parsed.data.notes ?? null,
    });
  }

  const [deleted] = await db
    .update(users)
    .set({
      deletedAt: dayjs.utc().toDate(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (!deleted) {
    return { status: "error", message: "Account not found." };
  }

  revalidatePath("/");
  revalidatePath("/profile");

  return { status: "success" };
}
