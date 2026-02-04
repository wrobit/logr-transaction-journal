"use server";

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import { getAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { feedbacks, users } from "@/lib/db/schema";
import { dayjs } from "@/lib/dayjs";
import { type FeedbackReason } from "@/lib/profile/feedback";
import type { AdminFeedbackQuery } from "@/lib/admin/feedback-query";

const ADMIN_FEEDBACK_PAGE_SIZE = 50;

export type AdminFeedbackRow = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userLogin: string | null;
  reason: FeedbackReason | null;
  notes: string | null;
  createdAt: Date;
};

export type AdminFeedbackResult = {
  rows: AdminFeedbackRow[];
  totalCount: number;
  page: number;
  pageSize: number;
};

const buildConditions = (query: AdminFeedbackQuery) => {
  const conditions = [];

  if (query.reason) {
    conditions.push(eq(feedbacks.reason, query.reason));
  }

  if (query.startDate) {
    conditions.push(gte(feedbacks.createdAt, dayjs.utc(query.startDate).startOf("day").toDate()));
  }

  if (query.endDate) {
    conditions.push(lte(feedbacks.createdAt, dayjs.utc(query.endDate).endOf("day").toDate()));
  }

  return conditions;
};

export async function getAdminFeedback(query: AdminFeedbackQuery): Promise<AdminFeedbackResult> {
  const session = await getAdminSession();

  if (!session) {
    return { rows: [], totalCount: 0, page: 1, pageSize: ADMIN_FEEDBACK_PAGE_SIZE };
  }

  const conditions = buildConditions(query);
  const whereClause = conditions.length ? and(...conditions) : undefined;
  const offset = (query.page - 1) * ADMIN_FEEDBACK_PAGE_SIZE;

  const countQuery = db.select({ count: sql<number>`count(*)` }).from(feedbacks);
  const rowsQuery = db
    .select({
      id: feedbacks.id,
      userId: feedbacks.userId,
      userEmail: users.email,
      userLogin: users.login,
      reason: feedbacks.reason,
      notes: feedbacks.notes,
      createdAt: feedbacks.createdAt,
    })
    .from(feedbacks)
    .leftJoin(users, eq(feedbacks.userId, users.id))
    .orderBy(desc(feedbacks.createdAt))
    .limit(ADMIN_FEEDBACK_PAGE_SIZE)
    .offset(offset);

  if (whereClause) {
    countQuery.where(whereClause);
    rowsQuery.where(whereClause);
  }

  const [countResult, rows] = await Promise.all([countQuery, rowsQuery]);

  return {
    rows,
    totalCount: Number(countResult?.[0]?.count ?? 0),
    page: query.page,
    pageSize: ADMIN_FEEDBACK_PAGE_SIZE,
  };
}

export async function getAdminFeedbackExportRows(
  query: AdminFeedbackQuery,
): Promise<AdminFeedbackRow[]> {
  const session = await getAdminSession();

  if (!session) {
    return [];
  }

  const conditions = buildConditions(query);
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const rowsQuery = db
    .select({
      id: feedbacks.id,
      userId: feedbacks.userId,
      userEmail: users.email,
      userLogin: users.login,
      reason: feedbacks.reason,
      notes: feedbacks.notes,
      createdAt: feedbacks.createdAt,
    })
    .from(feedbacks)
    .leftJoin(users, eq(feedbacks.userId, users.id))
    .orderBy(desc(feedbacks.createdAt));

  if (whereClause) {
    rowsQuery.where(whereClause);
  }

  return rowsQuery;
}

