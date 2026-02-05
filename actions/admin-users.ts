"use server";

import {
  and,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth/admin";
import { logAdminAction, getEntriesCountForUser } from "@/actions/admin-audit";
import { db } from "@/lib/db";
import { entries, users } from "@/lib/db/schema";
import { dayjs } from "@/lib/dayjs";
import { getUserDek, resolveEntryPayload } from "@/lib/entries/encryption";
import { serializeEntry } from "@/lib/entries/serialize";
import type { EntryView } from "@/lib/entries/types";

const ADMIN_USERS_PAGE_SIZE = 50;

export type AdminUserStatus = "all" | "active" | "deleted";

export type AdminUsersQuery = {
  search?: string;
  status?: AdminUserStatus;
  page?: number;
};

export type AdminUserRow = {
  id: string;
  email: string;
  login: string;
  firstName: string;
  lastName: string;
  role: "user" | "admin";
  createdAt: Date;
  lastLoginAt: Date | null;
  deletedAt: Date | null;
  entriesCount: number;
};

export type AdminUsersResult = {
  users: AdminUserRow[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type AdminActionResult = {
  status: "success" | "error";
  message?: string;
};


const DEFAULT_QUERY: Required<Pick<AdminUsersQuery, "page" | "status">> = {
  page: 1,
  status: "all",
};

const normalizeQuery = (query?: AdminUsersQuery) => ({
  search: query?.search?.trim() || "",
  status: query?.status ?? DEFAULT_QUERY.status,
  page: Math.max(1, Math.floor(query?.page ?? DEFAULT_QUERY.page)),
});

const buildWhereClause = (query: ReturnType<typeof normalizeQuery>) => {
  const conditions: SQL[] = [];

  if (query.search) {
    const pattern = `%${query.search}%`;
    const searchClause = or(
      ilike(users.email, pattern),
      ilike(users.login, pattern),
      ilike(users.firstName, pattern),
      ilike(users.lastName, pattern),
    );

    if (searchClause) {
      conditions.push(searchClause);
    }
  }

  if (query.status === "active") {
    conditions.push(isNull(users.deletedAt));
  }

  if (query.status === "deleted") {
    conditions.push(isNotNull(users.deletedAt));
  }

  if (conditions.length === 0) {
    return undefined;
  }

  return and(...conditions);
};

export async function getAdminUsers(query?: AdminUsersQuery): Promise<AdminUsersResult> {
  const session = await getAdminSession();

  if (!session) {
    return { users: [], totalCount: 0, page: 1, pageSize: ADMIN_USERS_PAGE_SIZE };
  }

  const normalized = normalizeQuery(query);
  const whereClause = buildWhereClause(normalized);
  const offset = (normalized.page - 1) * ADMIN_USERS_PAGE_SIZE;

  const countQuery = db.select({ count: sql<number>`count(*)` }).from(users);
  const listQuery = db
    .select({
      id: users.id,
      email: users.email,
      login: users.login,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      deletedAt: users.deletedAt,
      entriesCount: sql<number>`count(${entries.id})`,
    })
    .from(users)
    .leftJoin(entries, and(eq(entries.userId, users.id), isNull(entries.deletedAt)))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))
    .limit(ADMIN_USERS_PAGE_SIZE)
    .offset(offset);

  if (whereClause) {
    countQuery.where(whereClause);
    listQuery.where(whereClause);
  }

  const [countResult] = await countQuery;
  const rows = await listQuery;

  return {
    users: rows.map((row) => ({
      ...row,
      entriesCount: Number(row.entriesCount ?? 0),
    })),
    totalCount: Number(countResult?.count ?? 0),
    page: normalized.page,
    pageSize: ADMIN_USERS_PAGE_SIZE,
  };
}

export async function getAdminUser(userId: string) {
  const session = await getAdminSession();

  if (!session) {
    return null;
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      login: users.login,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      deletedAt: users.deletedAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function getAdminUserEntries(userId: string): Promise<EntryView[]> {
  const session = await getAdminSession();

  if (!session) {
    return [];
  }

  const rows = await db
    .select()
    .from(entries)
    .where(and(eq(entries.userId, userId), isNull(entries.deletedAt)))
    .orderBy(desc(entries.createdAt))
    .limit(50);

  const dek = await getUserDek(userId);

  return Promise.all(
    rows.map(async (row) => {
      const payload = await resolveEntryPayload(row, dek);
      return serializeEntry(row, payload);
    }),
  );
}

export async function softDeleteUser(userId: string): Promise<AdminActionResult> {
  const session = await getAdminSession();

  if (!session) {
    return { status: "error", message: "Admin access required." };
  }

  if (!userId) {
    return { status: "error", message: "User ID is required." };
  }

  if (userId === session.user.id) {
    return { status: "error", message: "You cannot deactivate your own account." };
  }

  await db
    .update(users)
    .set({
      deletedAt: dayjs.utc().toDate(),
    })
    .where(eq(users.id, userId));

  await logAdminAction({
    actorUserId: session.user.id,
    action: "user.deactivated",
    targetUserId: userId,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);

  return { status: "success" };
}

export async function restoreUser(userId: string): Promise<AdminActionResult> {
  const session = await getAdminSession();

  if (!session) {
    return { status: "error", message: "Admin access required." };
  }

  if (!userId) {
    return { status: "error", message: "User ID is required." };
  }

  await db
    .update(users)
    .set({
      deletedAt: null,
    })
    .where(eq(users.id, userId));

  await logAdminAction({
    actorUserId: session.user.id,
    action: "user.restored",
    targetUserId: userId,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);

  return { status: "success" };
}

export async function purgeUserEntries(userId: string): Promise<AdminActionResult> {
  const session = await getAdminSession();

  if (!session) {
    return { status: "error", message: "Admin access required." };
  }

  if (!userId) {
    return { status: "error", message: "User ID is required." };
  }

  const entriesCount = await getEntriesCountForUser(userId);

  await db.delete(entries).where(eq(entries.userId, userId));

  await logAdminAction({
    actorUserId: session.user.id,
    action: "entries.purged",
    targetUserId: userId,
    metadata: { entriesPurged: entriesCount },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);

  return { status: "success" };
}
