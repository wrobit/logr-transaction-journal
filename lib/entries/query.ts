import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";

import { entries } from "@/lib/db/schema";
import type { EntryOperation } from "@/lib/entries/types";

export const ENTRY_PAGE_SIZE = 10;

export type EntryFilters = {
  startDate?: string;
  endDate?: string;
  asset?: string;
  operation?: EntryOperation;
};

export type EntryQuery = {
  page: number;
  filters: EntryFilters;
};

const pageSchema = z.coerce.number().int().min(1);
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();
const assetSchema = z.string().trim().min(1);
const operationSchema = z.enum(["BUY", "SELL"]);

const getFirstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseEntryQuery(
  params: Record<string, string | string[] | undefined>,
): EntryQuery {
  const pageResult = pageSchema.safeParse(getFirstValue(params.page));
  const startDateResult = dateSchema.safeParse(getFirstValue(params.startDate));
  const endDateResult = dateSchema.safeParse(getFirstValue(params.endDate));
  const assetResult = assetSchema.safeParse(getFirstValue(params.asset));
  const operationResult = operationSchema.safeParse(getFirstValue(params.operation));

  return {
    page: pageResult.success ? pageResult.data : 1,
    filters: {
      startDate: startDateResult.success ? startDateResult.data : undefined,
      endDate: endDateResult.success ? endDateResult.data : undefined,
      asset: assetResult.success ? assetResult.data.toUpperCase() : undefined,
      operation: operationResult.success ? operationResult.data : undefined,
    },
  };
}

export function buildEntryQueryParams(query: EntryQuery) {
  const params = new URLSearchParams();

  if (query.page > 1) {
    params.set("page", String(query.page));
  }

  if (query.filters.startDate) {
    params.set("startDate", query.filters.startDate);
  }

  if (query.filters.endDate) {
    params.set("endDate", query.filters.endDate);
  }

  if (query.filters.asset) {
    params.set("asset", query.filters.asset);
  }

  if (query.filters.operation) {
    params.set("operation", query.filters.operation);
  }

  return params;
}

const toUtcDate = (date: string, endOfDay = false) =>
  new Date(`${date}T${endOfDay ? "23:59:59" : "00:00:00"}Z`);

export function buildEntryConditions(userId: string, filters: EntryFilters) {
  const conditions = [eq(entries.userId, userId)];

  if (filters.startDate) {
    conditions.push(gte(entries.date, toUtcDate(filters.startDate)));
  }

  if (filters.endDate) {
    conditions.push(lte(entries.date, toUtcDate(filters.endDate, true)));
  }

  if (filters.asset) {
    conditions.push(eq(entries.baseAsset, filters.asset));
  }

  if (filters.operation) {
    conditions.push(eq(entries.operation, filters.operation));
  }

  return conditions;
}

export function buildEntryWhere(userId: string, filters: EntryFilters) {
  const conditions = buildEntryConditions(userId, filters);
  return and(...conditions);
}
