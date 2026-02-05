"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth/options";
import { ensureUserId } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import type { EntryPayload, EntryView } from "@/lib/entries/types";
import {
  buildEntryWhere,
  ENTRY_PAGE_SIZE,
  type EntryQuery,
  type EntrySortDirection,
  type EntrySortKey,
} from "@/lib/entries/query";
import {
  calculateFullPrice,
  calculateValuePln,
  NUMERIC_SCALES,
  toFixedNumber,
  toFixedString,
} from "@/lib/entries/calculations";
import {
  ENTRY_ENCRYPTION_VERSION,
  encryptEntryPayload,
  getUserDek,
  resolveEntryPayload,
} from "@/lib/entries/encryption";
import { serializeEntry } from "@/lib/entries/serialize";
import type {
  CreateEntryState,
  DeleteEntryState,
  UpdateEntryState,
} from "@/lib/entries/actions";
import { entryInputSchema } from "@/lib/entries/validation";
import { dayjs } from "@/lib/dayjs";
import { getNbpRate } from "@/lib/nbp";

export type EntryListResult = {
  entries: EntryView[];
  totalCount: number;
  assets: string[];
  page: number;
  pageSize: number;
};

const getSortValue = (entry: EntryView, sortBy: EntrySortKey) => {
  switch (sortBy) {
    case "createdAt":
      return new Date(entry.createdAt).getTime();
    case "updatedAt":
      return new Date(entry.updatedAt).getTime();
    case "operation":
      return entry.operation;
    case "baseAsset":
      return entry.baseAsset;
    case "quantity":
      return Number(entry.quantity);
    case "pricePerUnit":
      return Number(entry.pricePerUnit);
    case "fullPrice":
      return Number(entry.fullPrice);
    case "commission":
      return Number(entry.commission ?? 0);
    case "source":
      return entry.source ?? "";
    case "nbpRate":
      return Number(entry.nbpRate);
    case "valuePln":
      return Number(entry.valuePln);
    default:
      return 0;
  }
};

const sortEntries = (
  entriesList: EntryView[],
  sortBy: EntrySortKey,
  sortDir: EntrySortDirection,
) => {
  const direction = sortDir === "desc" ? -1 : 1;

  return [...entriesList].sort((left, right) => {
    const leftValue = getSortValue(left, sortBy);
    const rightValue = getSortValue(right, sortBy);

    if (typeof leftValue === "string" && typeof rightValue === "string") {
      return direction * leftValue.localeCompare(rightValue);
    }

    if (leftValue < rightValue) {
      return -1 * direction;
    }

    if (leftValue > rightValue) {
      return 1 * direction;
    }

    return 0;
  });
};

export async function listEntries(
  user: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
  },
  query: EntryQuery,
): Promise<EntryListResult> {
  const userId = await ensureUserId(user);

  if (!userId) {
    return {
      entries: [],
      totalCount: 0,
      assets: [],
      page: query.page,
      pageSize: ENTRY_PAGE_SIZE,
    };
  }

  const whereClause = buildEntryWhere(userId, query.filters);
  const rows = await db
    .select()
    .from(entries)
    .where(whereClause)
    .orderBy(desc(entries.date));

  const dek = await getUserDek(userId);
  const resolvedEntries = await Promise.all(
    rows.map(async (row) => {
      const payload = await resolveEntryPayload(row, dek);
      return serializeEntry(row, payload);
    }),
  );

  const assets = Array.from(
    new Set(resolvedEntries.map((entry) => entry.baseAsset)),
  ).sort((left, right) => left.localeCompare(right));

  const filteredEntries = resolvedEntries.filter((entry) => {
    if (query.filters.asset && entry.baseAsset !== query.filters.asset) {
      return false;
    }

    if (query.filters.operation && entry.operation !== query.filters.operation) {
      return false;
    }

    return true;
  });

  const sortedEntries = sortEntries(filteredEntries, query.sortBy, query.sortDir);
  const offset = (query.page - 1) * ENTRY_PAGE_SIZE;

  return {
    entries: sortedEntries.slice(offset, offset + ENTRY_PAGE_SIZE),
    totalCount: filteredEntries.length,
    assets,
    page: query.page,
    pageSize: ENTRY_PAGE_SIZE,
  };
}

const buildEntryInput = (formData: FormData) => ({
  date: formData.get("date"),
  operation: formData.get("operation"),
  baseAsset: formData.get("baseAsset"),
  quoteCurrency: formData.get("quoteCurrency"),
  quantity: formData.get("quantity"),
  pricePerUnit: formData.get("pricePerUnit"),
  commission: formData.get("commission"),
  source: formData.get("source"),
  note: formData.get("note"),
});

const getValidationErrors = (error: z.ZodError) => {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
};

const resolveEntryFields = async (parsed: {
  data: {
    date: string;
    operation: "BUY" | "SELL";
    baseAsset: string;
    quoteCurrency: string;
    quantity: number;
    pricePerUnit: number;
    commission?: number | null | undefined;
    source?: string | undefined;
    note?: string | undefined;
  };
}) => {
  const entryDate = dayjs.utc(parsed.data.date, "YYYY-MM-DD", true).toDate();
  const quantity = parsed.data.quantity;
  const pricePerUnit = parsed.data.pricePerUnit;
  const commission = parsed.data.commission ?? null;

  const fullPrice = calculateFullPrice({
    quantity,
    pricePerUnit,
    commission,
    operation: parsed.data.operation,
  });

  const nbp = await getNbpRate(parsed.data.quoteCurrency, entryDate);
  const valuePln = calculateValuePln(fullPrice, nbp.rate);

  return {
    entryDate,
    fullPrice,
    valuePln,
    commission,
    nbp,
  };
};

const buildEntryPayload = (
  parsed: {
    data: {
      operation: "BUY" | "SELL";
      baseAsset: string;
      quoteCurrency: string;
      quantity: number;
      pricePerUnit: number;
      commission?: number | null | undefined;
      source?: string | undefined;
      note?: string | undefined;
    };
  },
  resolved: {
    fullPrice: number;
    valuePln: number;
    commission: number | null;
    nbp: { rate: number; rateDate: Date };
  },
): EntryPayload => ({
  operation: parsed.data.operation,
  baseAsset: parsed.data.baseAsset.trim().toUpperCase(),
  quoteCurrency: parsed.data.quoteCurrency.trim().toUpperCase(),
  quantity: toFixedString(parsed.data.quantity, NUMERIC_SCALES.quantity),
  pricePerUnit: toFixedString(parsed.data.pricePerUnit, NUMERIC_SCALES.pricePerUnit),
  fullPrice: toFixedString(
    toFixedNumber(resolved.fullPrice, NUMERIC_SCALES.fullPrice),
    NUMERIC_SCALES.fullPrice,
  ),
  commission:
    resolved.commission === null
      ? null
      : toFixedString(
          toFixedNumber(resolved.commission, NUMERIC_SCALES.commission),
          NUMERIC_SCALES.commission,
        ),
  source: parsed.data.source?.trim() || null,
  note: parsed.data.note?.trim() || null,
  nbpRateDate: dayjs.utc(resolved.nbp.rateDate).format("YYYY-MM-DD"),
  nbpRate: toFixedString(
    toFixedNumber(resolved.nbp.rate, NUMERIC_SCALES.nbpRate),
    NUMERIC_SCALES.nbpRate,
  ),
  valuePln: toFixedString(
    toFixedNumber(resolved.valuePln, NUMERIC_SCALES.valuePln),
    NUMERIC_SCALES.valuePln,
  ),
});

export async function createEntry(
  _prevState: CreateEntryState,
  formData: FormData,
): Promise<CreateEntryState> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      status: "error",
      message: "You must be signed in to add entries.",
    };
  }

  const userId = await ensureUserId(session.user);

  if (!userId) {
    return {
      status: "error",
      message: "User record missing. Please sign in again.",
    };
  }

  const rawInput = buildEntryInput(formData);

  const parsed = entryInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "error", errors: getValidationErrors(parsed.error) };
  }

  const resolved = await resolveEntryFields(parsed);
  const payload = buildEntryPayload(parsed, resolved);
  const dek = await getUserDek(userId);
  const encryptedPayload = encryptEntryPayload(payload, dek);

  const [created] = await db
    .insert(entries)
    .values({
      userId,
      date: resolved.entryDate,
      encryptedPayload,
      encryptionVersion: ENTRY_ENCRYPTION_VERSION,
    })
    .returning();

  if (!created) {
    return { status: "error", message: "Failed to create entry." };
  }

  revalidatePath("/");
  revalidatePath("/summary");
  revalidatePath("/dashboard");

  return {
    status: "success",
    entry: serializeEntry(created, payload),
  };
}

export async function updateEntry(
  _prevState: UpdateEntryState,
  formData: FormData,
): Promise<UpdateEntryState> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      status: "error",
      message: "You must be signed in to edit entries.",
    };
  }

  const userId = await ensureUserId(session.user);

  if (!userId) {
    return {
      status: "error",
      message: "User record missing. Please sign in again.",
    };
  }

  const entryId = formData.get("id");
  if (!entryId || typeof entryId !== "string") {
    return { status: "error", message: "Entry id is missing." };
  }

  const rawInput = buildEntryInput(formData);
  const parsed = entryInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "error", errors: getValidationErrors(parsed.error) };
  }

  const resolved = await resolveEntryFields(parsed);
  const payload = buildEntryPayload(parsed, resolved);
  const dek = await getUserDek(userId);
  const encryptedPayload = encryptEntryPayload(payload, dek);

  const [updated] = await db
    .update(entries)
    .set({
      date: resolved.entryDate,
      encryptedPayload,
      encryptionVersion: ENTRY_ENCRYPTION_VERSION,
      updatedAt: dayjs.utc().toDate(),
    })
    .where(
      and(
        eq(entries.id, entryId),
        eq(entries.userId, userId),
        isNull(entries.deletedAt),
      ),
    )
    .returning();

  if (!updated) {
    return { status: "error", message: "Entry not found." };
  }

  revalidatePath("/");
  revalidatePath("/summary");
  revalidatePath("/dashboard");

  return {
    status: "success",
    entry: serializeEntry(updated, payload),
  };
}

export async function deleteEntry(
  _prevState: DeleteEntryState,
  formData: FormData,
): Promise<DeleteEntryState> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      status: "error",
      message: "You must be signed in to delete entries.",
    };
  }

  const userId = await ensureUserId(session.user);

  if (!userId) {
    return {
      status: "error",
      message: "User record missing. Please sign in again.",
    };
  }

  const entryId = formData.get("id");
  if (!entryId || typeof entryId !== "string") {
    return { status: "error", message: "Entry id is missing." };
  }

  const [deleted] = await db
    .update(entries)
    .set({ deletedAt: dayjs.utc().toDate(), updatedAt: dayjs.utc().toDate() })
    .where(
      and(
        eq(entries.id, entryId),
        eq(entries.userId, userId),
        isNull(entries.deletedAt),
      ),
    )
    .returning({ id: entries.id });

  if (!deleted) {
    return { status: "error", message: "Entry not found." };
  }

  revalidatePath("/");
  revalidatePath("/summary");
  revalidatePath("/dashboard");

  return { status: "success" };
}
