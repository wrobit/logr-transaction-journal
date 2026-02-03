import { z } from "zod";

import { dayjs } from "@/lib/dayjs";

export type DashboardRange = "7d" | "30d" | "90d" | "ytd" | "all";

export type DashboardQuery = {
  range: DashboardRange;
  asset?: string;
};

export type DashboardRangeOption = {
  value: DashboardRange;
  label: string;
};

export const DASHBOARD_RANGE_OPTIONS: DashboardRangeOption[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "ytd", label: "YTD" },
  { value: "all", label: "All time" },
];

const DEFAULT_RANGE: DashboardRange = "all";

const rangeSchema = z.enum(["7d", "30d", "90d", "ytd", "all"]);
const assetSchema = z.string().trim().min(1);

const getFirstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function parseDashboardQuery(
  params: Record<string, string | string[] | undefined>,
): DashboardQuery {
  const rangeResult = rangeSchema.safeParse(getFirstValue(params.range));
  const assetResult = assetSchema.safeParse(getFirstValue(params.asset));

  return {
    range: rangeResult.success ? rangeResult.data : DEFAULT_RANGE,
    asset: assetResult.success ? assetResult.data.toUpperCase() : undefined,
  };
}

export function buildDashboardQueryParams(query: DashboardQuery) {
  const params = new URLSearchParams();

  if (query.range !== DEFAULT_RANGE) {
    params.set("range", query.range);
  }

  if (query.asset) {
    params.set("asset", query.asset);
  }

  return params;
}

const startOfUtcDay = (date: Date) => dayjs.utc(date).startOf("day").toDate();

const endOfUtcDay = (date: Date) => dayjs.utc(date).endOf("day").toDate();

export function resolveDashboardRange(range: DashboardRange, now = dayjs().toDate()) {
  if (range === "all") {
    return {
      label: "All time",
      startDate: undefined,
      endDate: undefined,
    };
  }

  if (range === "ytd") {
    const start = dayjs.utc(now).startOf("year").toDate();
    return {
      label: "Year to date",
      startDate: startOfUtcDay(start),
      endDate: endOfUtcDay(now),
    };
  }

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const start = dayjs.utc(now).subtract(days - 1, "day").toDate();

  return {
    label: `${days} days`,
    startDate: startOfUtcDay(start),
    endDate: endOfUtcDay(now),
  };
}
