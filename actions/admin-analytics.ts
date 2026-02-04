"use server";

import {
  and,
  asc,
  gte,
  isNotNull,
  isNull,
  lte,
  sql,
  type AnyColumn,
  type SQL,
} from "drizzle-orm";

import { getAdminSession } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { entries, feedbacks, users } from "@/lib/db/schema";
import { resolveDashboardRange } from "@/lib/dashboard/query";
import { dayjs } from "@/lib/dayjs";
import type { AdminAnalyticsQuery } from "@/lib/admin/analytics-query";

export type AdminAnalyticsSeriesPoint = {
  date: string;
  registrations: number;
  activeUsers: number;
  entries: number;
  feedbacks: number;
};

export type AdminFeedbackReasonSummary = {
  reason: string;
  count: number;
};

export type AdminAnalyticsData = {
  totals: {
    registrations: number;
    activeUsers: number;
    entries: number;
    feedbacks: number;
  };
  series: AdminAnalyticsSeriesPoint[];
  feedbackReasons: AdminFeedbackReasonSummary[];
};

const toDateKey = (value: Date) => dayjs.utc(value).format("YYYY-MM-DD");

const buildDateConditions = (column: AnyColumn) =>
  (range: ReturnType<typeof resolveDashboardRange>) => {
    const conditions: SQL[] = [];

    if (range.startDate) {
      conditions.push(gte(column, range.startDate));
    }

    if (range.endDate) {
      conditions.push(lte(column, range.endDate));
    }

    return conditions;
  };

const addSeriesRows = (
  map: Map<string, AdminAnalyticsSeriesPoint>,
  rows: Array<{ date: Date; count: number }>,
  key: keyof Omit<AdminAnalyticsSeriesPoint, "date">,
) => {
  for (const row of rows) {
    const dateKey = toDateKey(row.date);
    const entry = map.get(dateKey) ?? {
      date: dateKey,
      registrations: 0,
      activeUsers: 0,
      entries: 0,
      feedbacks: 0,
    };

    entry[key] += Number(row.count ?? 0);
    map.set(dateKey, entry);
  }
};

const fillSeriesGaps = (
  map: Map<string, AdminAnalyticsSeriesPoint>,
  range: ReturnType<typeof resolveDashboardRange>,
) => {
  const keys = Array.from(map.keys()).sort();

  if (keys.length === 0) {
    return [];
  }

  const start = range.startDate
    ? dayjs.utc(range.startDate)
    : dayjs.utc(keys[0]);
  const end = range.endDate ? dayjs.utc(range.endDate) : dayjs.utc(keys[keys.length - 1]);

  for (let cursor = start; !cursor.isAfter(end); cursor = cursor.add(1, "day")) {
    const key = cursor.format("YYYY-MM-DD");
    if (!map.has(key)) {
      map.set(key, {
        date: key,
        registrations: 0,
        activeUsers: 0,
        entries: 0,
        feedbacks: 0,
      });
    }
  }

  return Array.from(map.values()).sort((left, right) => left.date.localeCompare(right.date));
};

export async function getAdminAnalyticsData(
  query: AdminAnalyticsQuery,
): Promise<AdminAnalyticsData> {
  const session = await getAdminSession();

  if (!session) {
    return {
      totals: { registrations: 0, activeUsers: 0, entries: 0, feedbacks: 0 },
      series: [],
      feedbackReasons: [],
    };
  }

  const range = resolveDashboardRange(query.range);
  const registrationBucket = sql<Date>`date_trunc('day', ${users.createdAt})`;
  const entryBucket = sql<Date>`date_trunc('day', ${entries.createdAt})`;
  const feedbackBucket = sql<Date>`date_trunc('day', ${feedbacks.createdAt})`;
  const loginBucket = sql<Date>`date_trunc('day', ${users.lastLoginAt})`;

  const registrationConditions = [
    ...buildDateConditions(users.createdAt)(range),
    isNull(users.deletedAt),
  ];
  const entryConditions = [
    ...buildDateConditions(entries.createdAt)(range),
    isNull(entries.deletedAt),
  ];
  const feedbackConditions = buildDateConditions(feedbacks.createdAt)(range);
  const loginConditions = [
    ...buildDateConditions(users.lastLoginAt)(range),
    isNotNull(users.lastLoginAt),
    isNull(users.deletedAt),
  ];
  const feedbackReasonConditions = [...feedbackConditions, isNotNull(feedbacks.reason)];

  const registrationWhere = registrationConditions.length
    ? and(...registrationConditions)
    : sql`true`;
  const entryWhere = entryConditions.length ? and(...entryConditions) : sql`true`;
  const feedbackWhere = feedbackConditions.length ? and(...feedbackConditions) : sql`true`;
  const loginWhere = loginConditions.length ? and(...loginConditions) : sql`true`;
  const feedbackReasonWhere = feedbackReasonConditions.length
    ? and(...feedbackReasonConditions)
    : sql`true`;

  const registrationsQuery = db
    .select({ date: registrationBucket, count: sql<number>`count(*)` })
    .from(users)
    .where(registrationWhere)
    .groupBy(registrationBucket)
    .orderBy(asc(registrationBucket));

  const entriesQuery = db
    .select({ date: entryBucket, count: sql<number>`count(*)` })
    .from(entries)
    .where(entryWhere)
    .groupBy(entryBucket)
    .orderBy(asc(entryBucket));

  const feedbackQuery = db
    .select({ date: feedbackBucket, count: sql<number>`count(*)` })
    .from(feedbacks)
    .where(feedbackWhere)
    .groupBy(feedbackBucket)
    .orderBy(asc(feedbackBucket));

  const activeUsersQuery = db
    .select({ date: loginBucket, count: sql<number>`count(*)` })
    .from(users)
    .where(loginWhere)
    .groupBy(loginBucket)
    .orderBy(asc(loginBucket));

  const feedbackReasonsQuery = db
    .select({ reason: feedbacks.reason, count: sql<number>`count(*)` })
    .from(feedbacks)
    .where(feedbackReasonWhere)
    .groupBy(feedbacks.reason)
    .orderBy(asc(feedbacks.reason));

  const totalsRegistrationsQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(registrationWhere);

  const totalsEntriesQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(entries)
    .where(entryWhere);

  const totalsFeedbackQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(feedbacks)
    .where(feedbackWhere);

  const totalsActiveUsersQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(loginWhere);

  const [
    registrationsRows,
    entriesRows,
    feedbackRows,
    activeRows,
    feedbackReasonsRows,
    registrationsTotals,
    entriesTotals,
    feedbackTotals,
    activeTotals,
  ] = await Promise.all([
    registrationsQuery,
    entriesQuery,
    feedbackQuery,
    activeUsersQuery,
    feedbackReasonsQuery,
    totalsRegistrationsQuery,
    totalsEntriesQuery,
    totalsFeedbackQuery,
    totalsActiveUsersQuery,
  ]);

  const seriesMap = new Map<string, AdminAnalyticsSeriesPoint>();
  addSeriesRows(seriesMap, registrationsRows, "registrations");
  addSeriesRows(seriesMap, entriesRows, "entries");
  addSeriesRows(seriesMap, feedbackRows, "feedbacks");
  addSeriesRows(seriesMap, activeRows, "activeUsers");

  const series = fillSeriesGaps(seriesMap, range);

  return {
    totals: {
      registrations: Number(registrationsTotals?.[0]?.count ?? 0),
      activeUsers: Number(activeTotals?.[0]?.count ?? 0),
      entries: Number(entriesTotals?.[0]?.count ?? 0),
      feedbacks: Number(feedbackTotals?.[0]?.count ?? 0),
    },
    series,
    feedbackReasons: feedbackReasonsRows.map((row) => ({
      reason: row.reason ?? "other",
      count: Number(row.count ?? 0),
    })),
  };
}
