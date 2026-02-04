import { z } from "zod";

import { feedbackReasons, type FeedbackReason } from "@/lib/profile/feedback";
import { dayjs } from "@/lib/dayjs";

export type AdminFeedbackQuery = {
  reason?: FeedbackReason;
  startDate?: Date;
  endDate?: Date;
  page: number;
};

const reasonSchema = z.enum(feedbackReasons).optional();
const dateSchema = z.string().trim().min(1);

const getFirstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const parseDate = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const parsed = dayjs.utc(value, "YYYY-MM-DD", true);
  return parsed.isValid() ? parsed.toDate() : undefined;
};

export function parseAdminFeedbackQuery(
  params: Record<string, string | string[] | undefined>,
): AdminFeedbackQuery {
  const reasonResult = reasonSchema.safeParse(getFirstValue(params.reason));
  const startResult = dateSchema.safeParse(getFirstValue(params.start));
  const endResult = dateSchema.safeParse(getFirstValue(params.end));
  const pageValue = Number(getFirstValue(params.page));

  const startDate = parseDate(startResult.success ? startResult.data : undefined);
  const endDate = parseDate(endResult.success ? endResult.data : undefined);

  return {
    reason: reasonResult.success ? reasonResult.data : undefined,
    startDate,
    endDate,
    page: Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : 1,
  };
}

export function buildAdminFeedbackQueryParams(query: {
  reason?: FeedbackReason;
  startDate?: Date;
  endDate?: Date;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (query.reason) {
    params.set("reason", query.reason);
  }

  if (query.startDate) {
    params.set("start", dayjs.utc(query.startDate).format("YYYY-MM-DD"));
  }

  if (query.endDate) {
    params.set("end", dayjs.utc(query.endDate).format("YYYY-MM-DD"));
  }

  if (query.page && query.page > 1) {
    params.set("page", String(query.page));
  }

  return params;
}
