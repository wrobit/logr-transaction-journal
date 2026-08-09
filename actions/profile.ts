"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth/options";
import { hasRecentAuthentication } from "@/lib/auth/session";
import {
  ensureUserId,
  getUserByEmail,
  getUserById,
  getUserByLogin,
} from "@/lib/auth/users";
import { db } from "@/lib/db";
import { feedbacks, users } from "@/lib/db/schema";
import { dayjs } from "@/lib/dayjs";
import { translateValidationMessage } from "@/lib/i18n/errors";
import { getServerTranslator } from "@/lib/i18n/translate";
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
  displayCurrency: String(formData.get("displayCurrency") ?? "PLN"),
});

const getValidationErrors = (error: z.ZodError, t: (key: string) => string) => {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) {
      errors[field] = translateValidationMessage(issue.message, t);
    }
  }
  return errors;
};

export async function updateProfile(
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const t = await getServerTranslator();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      status: "error",
      message: t("errors.authRequiredProfileUpdate"),
    };
  }

  const userId = await ensureUserId(session.user);

  if (!userId) {
    return {
      status: "error",
      message: t("errors.userMissing"),
    };
  }

  const rawInput = buildProfileInput(formData);
  const parsed = profileUpdateSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { status: "error", errors: getValidationErrors(parsed.error, t) };
  }

  const existingUser = await getUserById(userId);

  if (!existingUser) {
    return {
      status: "error",
      message: t("errors.userMissing"),
    };
  }

  if (parsed.data.email !== existingUser.email) {
    return { status: "error", errors: { email: t("errors.emailManagedByProvider") } };
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
    uniqueErrors.email = t("errors.emailInUse");
  }

  if (loginOwner && loginOwner.id !== userId) {
    uniqueErrors.login = t("errors.loginInUse");
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
      displayCurrency: parsed.data.displayCurrency,
      updatedAt: dayjs.utc().toDate(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    return { status: "error", message: t("errors.profileNotFound") };
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
  const t = await getServerTranslator();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      status: "error",
      message: t("errors.authRequiredProfileUpdate"),
    };
  }

  const userId = await ensureUserId(session.user);

  if (!userId) {
    return {
      status: "error",
      message: t("errors.userMissing"),
    };
  }

  if (!hasRecentAuthentication(session.user.authenticatedAt)) {
    return {
      status: "error",
      message: t("errors.recentAuthenticationRequired"),
    };
  }

  const parsed = deleteAccountSchema.safeParse({
    confirmation: formData.get("confirmation"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: t("validation.typeDelete"),
    };
  }

  const deleted = await db.transaction(async (tx) => {
    await tx.delete(feedbacks).where(eq(feedbacks.userId, userId));

    const shouldStoreFeedback = Boolean(parsed.data.reason);
    if (shouldStoreFeedback) {
      await tx.insert(feedbacks).values({
        userId: null,
        reason: parsed.data.reason ?? null,
        notes: null,
      });
    }

    const [removed] = await tx
      .delete(users)
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    return removed;
  });

  if (!deleted) {
    return { status: "error", message: t("errors.profileNotFound") };
  }

  revalidatePath("/");
  revalidatePath("/profile");

  return { status: "success" };
}
