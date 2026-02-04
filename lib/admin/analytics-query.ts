import { z } from "zod";

import {
  DASHBOARD_RANGE_OPTIONS,
  type DashboardRange,
} from "@/lib/dashboard/query";

export type AdminAnalyticsQuery = {
  range: DashboardRange;
};

export const ADMIN_ANALYTICS_RANGE_OPTIONS = DASHBOARD_RANGE_OPTIONS;

const DEFAULT_RANGE: DashboardRange = "30d";
const rangeSchema = z.enum(["7d", "30d", "90d", "ytd", "all"]);

const getFirstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseAdminAnalyticsQuery(
  params: Record<string, string | string[] | undefined>,
): AdminAnalyticsQuery {
  const rangeResult = rangeSchema.safeParse(getFirstValue(params.range));

  return {
    range: rangeResult.success ? rangeResult.data : DEFAULT_RANGE,
  };
}

export function buildAdminAnalyticsQueryParams(query: AdminAnalyticsQuery) {
  const params = new URLSearchParams();

  if (query.range !== DEFAULT_RANGE) {
    params.set("range", query.range);
  }

  return params;
}
