"use server";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { adminAuditLogs, entries, users } from "@/lib/db/schema";
import type { AdminAuditAction, AdminAuditQuery } from "@/lib/admin/audit-query";

const ADMIN_AUDIT_PAGE_SIZE = 50;

export type AdminAuditRow = {
  id: string;
  action: AdminAuditAction;
  createdAt: Date;
  actorId: string | null;
  actorEmail: string | null;
  actorLogin: string | null;
  targetId: string | null;
  targetEmail: string | null;
  targetLogin: string | null;
  metadata: Record<string, unknown> | null;
};

export type AdminAuditResult = {
  rows: AdminAuditRow[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export async function logAdminAction({
  actorUserId,
  action,
  targetUserId,
  metadata,
}: {
  actorUserId: string;
  action: AdminAuditAction;
  targetUserId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  await db.insert(adminAuditLogs).values({
    actorUserId,
    targetUserId: targetUserId ?? null,
    action,
    metadata: metadata ?? null,
  });
}

export async function getAdminAuditLogs(query: AdminAuditQuery): Promise<AdminAuditResult> {
  const session = await getAdminSession();

  if (!session) {
    return { rows: [], totalCount: 0, page: 1, pageSize: ADMIN_AUDIT_PAGE_SIZE };
  }

  const actor = alias(users, "actor");
  const target = alias(users, "target");

  const conditions = [];

  if (query.action) {
    conditions.push(eq(adminAuditLogs.action, query.action));
  }

  if (query.search) {
    const pattern = `%${query.search}%`;
    const searchClause = or(
      ilike(actor.email, pattern),
      ilike(actor.login, pattern),
      ilike(target.email, pattern),
      ilike(target.login, pattern),
    );

    if (searchClause) {
      conditions.push(searchClause);
    }
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const offset = (query.page - 1) * ADMIN_AUDIT_PAGE_SIZE;

  const countQuery = db.select({ count: sql<number>`count(*)` }).from(adminAuditLogs);

  const rowsQuery = db
    .select({
      id: adminAuditLogs.id,
      action: adminAuditLogs.action,
      createdAt: adminAuditLogs.createdAt,
      actorId: adminAuditLogs.actorUserId,
      actorEmail: actor.email,
      actorLogin: actor.login,
      targetId: adminAuditLogs.targetUserId,
      targetEmail: target.email,
      targetLogin: target.login,
      metadata: adminAuditLogs.metadata,
    })
    .from(adminAuditLogs)
    .leftJoin(actor, eq(adminAuditLogs.actorUserId, actor.id))
    .leftJoin(target, eq(adminAuditLogs.targetUserId, target.id))
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(ADMIN_AUDIT_PAGE_SIZE)
    .offset(offset);

  if (whereClause) {
    countQuery.where(whereClause);
    rowsQuery.where(whereClause);
  }

  const [countResult, rows] = await Promise.all([countQuery, rowsQuery]);

  return {
    rows: rows.map((row) => ({
      ...row,
      action: row.action as AdminAuditAction,
      metadata: row.metadata as Record<string, unknown> | null,
    })),
    totalCount: Number(countResult?.[0]?.count ?? 0),
    page: query.page,
    pageSize: ADMIN_AUDIT_PAGE_SIZE,
  };
}

export async function getEntriesCountForUser(userId: string): Promise<number> {
  const session = await getAdminSession();

  if (!session) {
    return 0;
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(entries)
    .where(eq(entries.userId, userId));

  return Number(result?.count ?? 0);
}
