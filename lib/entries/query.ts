import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { z } from "zod";

import { dayjs } from "@/lib/dayjs";
import { entries } from "@/lib/db/schema";
import type { EntryOperation } from "@/lib/entries/types";

export const ENTRY_PAGE_SIZE = 10;

export type EntryFilters = {
  startDate?: string;
  endDate?: string;
  asset?: string;
  operation?: EntryOperation;
};

export type EntrySortKey =
  | "createdAt"
  | "updatedAt"
  | "operation"
  | "baseAsset"
  | "quantity"
  | "pricePerUnit"
  | "fullPrice"
  | "commission"
  | "source"
  | "nbpRate"
  | "valuePln";

export type EntrySortDirection = "asc" | "desc";

export type EntryQuery = {
  page: number;
  filters: EntryFilters;
  sortBy: EntrySortKey;
  sortDir: EntrySortDirection;
};

const pageSchema = z.coerce.number().int().min(1);
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();
const assetSchema = z.string().trim().min(1);
const operationSchema = z.enum(["BUY", "SELL"]);
const sortBySchema = z.enum([
  "createdAt",
  "updatedAt",
  "operation",
  "baseAsset",
  "quantity",
  "pricePerUnit",
  "fullPrice",
  "commission",
  "source",
  "nbpRate",
  "valuePln",
]);
const sortDirSchema = z.enum(["asc", "desc"]);

const DEFAULT_SORT_BY: EntrySortKey = "updatedAt";
const DEFAULT_SORT_DIR: EntrySortDirection = "desc";

const getFirstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseEntryQuery(params: Record<string, string | string[] | undefined>): EntryQuery {
  const pageResult = pageSchema.safeParse(getFirstValue(params.page));
  const startDateResult = dateSchema.safeParse(getFirstValue(params.startDate));
  const endDateResult = dateSchema.safeParse(getFirstValue(params.endDate));
  const assetResult = assetSchema.safeParse(getFirstValue(params.asset));
  const operationResult = operationSchema.safeParse(getFirstValue(params.operation));
  const sortByResult = sortBySchema.safeParse(getFirstValue(params.sortBy));
  const sortDirResult = sortDirSchema.safeParse(getFirstValue(params.sortDir));

  return {
    page: pageResult.success ? pageResult.data : 1,
    filters: {
      startDate: startDateResult.success ? startDateResult.data : undefined,
      endDate: endDateResult.success ? endDateResult.data : undefined,
      asset: assetResult.success ? assetResult.data.toUpperCase() : undefined,
      operation: operationResult.success ? operationResult.data : undefined,
    },
    sortBy: sortByResult.success ? sortByResult.data : DEFAULT_SORT_BY,
    sortDir: sortDirResult.success ? sortDirResult.data : DEFAULT_SORT_DIR,
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

  if (query.sortBy !== DEFAULT_SORT_BY || query.sortDir !== DEFAULT_SORT_DIR) {
    params.set("sortBy", query.sortBy);
    params.set("sortDir", query.sortDir);
  }

  return params;
}

const toUtcDate = (date: string, endOfDay = false) => {
  const parsed = dayjs.utc(date, "YYYY-MM-DD", true);
  return (endOfDay ? parsed.endOf("day") : parsed.startOf("day")).toDate();
};

export function buildEntryConditions(userId: string, filters: EntryFilters) {
  const conditions = [eq(entries.userId, userId), isNull(entries.deletedAt)];

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
