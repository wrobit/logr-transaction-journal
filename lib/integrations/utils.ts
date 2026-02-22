import { createHash } from "node:crypto";

import { dayjs } from "@/lib/dayjs";

export function normalizeCurrency(currency: string) {
  return currency.trim().toUpperCase();
}

export function normalizeIsoDate(date: string | Date) {
  return dayjs.utc(date).format("YYYY-MM-DD");
}

export function nowIso() {
  return dayjs.utc().toISOString();
}

export function hashSnapshot(snapshot: unknown) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export function maskIdentifier(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 4) {
    return "*".repeat(trimmed.length);
  }

  const suffix = trimmed.slice(-4);
  return `${"*".repeat(Math.max(0, trimmed.length - 4))}${suffix}`;
}
