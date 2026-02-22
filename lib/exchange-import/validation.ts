import { z } from "zod";

import type {
  CanonicalImportTransaction,
  ImportErrorCategory,
  ImportErrorCode,
  ImportIssue,
  ImportOperationType,
} from "@/lib/exchange-import/types";

const positiveDecimalPattern = /^\d+(?:\.\d+)?$/;

const canonicalTransactionSchema = z.object({
  provider: z.enum(["kraken", "zondacrypto", "binance"]),
  externalId: z.string().trim().min(1),
  executedAt: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid execution date"),
  operation: z.enum(["BUY", "SELL"]),
  baseAsset: z.string().trim().min(1),
  quoteCurrency: z.string().trim().min(1),
  quantity: z.string().regex(positiveDecimalPattern),
  pricePerUnit: z.string().regex(positiveDecimalPattern),
  fullPrice: z.string().regex(positiveDecimalPattern),
  commission: z.string().regex(positiveDecimalPattern).nullable(),
  commissionCurrency: z.string().trim().min(1).nullable(),
  sourceName: z.string().trim().min(1),
  rowNumber: z.number().int().positive(),
  rawRow: z.record(z.string(), z.string()),
});

export function buildIssue(input: {
  category: ImportErrorCategory;
  code: ImportErrorCode;
  message: string;
  field?: string;
}): ImportIssue {
  return {
    category: input.category,
    code: input.code,
    message: input.message,
    field: input.field,
  };
}

export function normalizeOperation(value: string | undefined | null): ImportOperationType | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "buy" || normalized === "b") {
    return "BUY";
  }

  if (normalized === "sell" || normalized === "s") {
    return "SELL";
  }

  return null;
}

export function normalizeDateToIso(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{13}$/.test(trimmed)) {
    return new Date(Number(trimmed)).toISOString();
  }

  if (/^\d{10}$/.test(trimmed)) {
    return new Date(Number(trimmed) * 1000).toISOString();
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString();
}

export function normalizeDecimal(value: string | undefined | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.replaceAll(" ", "").replace(",", ".").trim();
  if (!normalized || !positiveDecimalPattern.test(normalized)) {
    return null;
  }

  return normalized;
}

export function validateCanonicalTransaction(
  value: CanonicalImportTransaction,
): { ok: true } | { ok: false; issues: ImportIssue[] } {
  const result = canonicalTransactionSchema.safeParse(value);
  if (result.success) {
    return { ok: true };
  }

  return {
    ok: false,
    issues: result.error.issues.map((issue) =>
      buildIssue({
        category: "schema",
        code: "missing_required_value",
        field: issue.path.join("."),
        message: issue.message,
      }),
    ),
  };
}
