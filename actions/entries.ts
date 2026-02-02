"use server";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth/options";
import { ensureUserId } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import type { EntryView } from "@/lib/entries/types";
import {
  buildEntryWhere,
  ENTRY_PAGE_SIZE,
  type EntryQuery,
} from "@/lib/entries/query";
import {
  calculateFullPrice,
  calculateValuePln,
  NUMERIC_SCALES,
  toFixedNumber,
  toFixedString,
} from "@/lib/entries/calculations";
import { serializeEntry } from "@/lib/entries/serialize";
import type {
  CreateEntryState,
  DeleteEntryState,
  UpdateEntryState,
} from "@/lib/entries/actions";
import { entryInputSchema } from "@/lib/entries/validation";
import { getNbpRate } from "@/lib/nbp";

export type EntryListResult = {
  entries: EntryView[];
  totalCount: number;
  assets: string[];
  page: number;
  pageSize: number;
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
  const offset = (query.page - 1) * ENTRY_PAGE_SIZE;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(entries)
    .where(whereClause);

  const rows = await db
    .select()
    .from(entries)
    .where(whereClause)
    .orderBy(desc(entries.date))
    .limit(ENTRY_PAGE_SIZE)
    .offset(offset);

  const assetRows = await db
    .selectDistinct({ baseAsset: entries.baseAsset })
    .from(entries)
    .where(eq(entries.userId, userId))
    .orderBy(asc(entries.baseAsset));

  return {
    entries: rows.map(serializeEntry),
    totalCount: Number(countResult?.count ?? 0),
    assets: assetRows.map((row) => row.baseAsset),
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
  const entryDate = new Date(`${parsed.data.date}T00:00:00Z`);
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

  const { entryDate, fullPrice, valuePln, commission, nbp } =
    await resolveEntryFields(parsed);

  const [created] = await db
    .insert(entries)
    .values({
      userId,
      date: entryDate,
      operation: parsed.data.operation,
      baseAsset: parsed.data.baseAsset.trim().toUpperCase(),
      quoteCurrency: parsed.data.quoteCurrency.trim().toUpperCase(),
      quantity: toFixedString(parsed.data.quantity, NUMERIC_SCALES.quantity),
      pricePerUnit: toFixedString(parsed.data.pricePerUnit, NUMERIC_SCALES.pricePerUnit),
      fullPrice: toFixedString(
        toFixedNumber(fullPrice, NUMERIC_SCALES.fullPrice),
        NUMERIC_SCALES.fullPrice,
      ),
      commission:
        commission === null
          ? null
          : toFixedString(
              toFixedNumber(commission, NUMERIC_SCALES.commission),
              NUMERIC_SCALES.commission,
            ),
      source: parsed.data.source?.trim() || null,
      note: parsed.data.note?.trim() || null,
      nbpRateDate: nbp.rateDate,
      nbpRate: toFixedString(
        toFixedNumber(nbp.rate, NUMERIC_SCALES.nbpRate),
        NUMERIC_SCALES.nbpRate,
      ),
      valuePln: toFixedString(
        toFixedNumber(valuePln, NUMERIC_SCALES.valuePln),
        NUMERIC_SCALES.valuePln,
      ),
    })
    .returning();

  if (!created) {
    return { status: "error", message: "Failed to create entry." };
  }

  revalidatePath("/");

  return {
    status: "success",
    entry: serializeEntry(created),
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

  const { entryDate, fullPrice, valuePln, commission, nbp } =
    await resolveEntryFields(parsed);

  const [updated] = await db
    .update(entries)
    .set({
      date: entryDate,
      operation: parsed.data.operation,
      baseAsset: parsed.data.baseAsset.trim().toUpperCase(),
      quoteCurrency: parsed.data.quoteCurrency.trim().toUpperCase(),
      quantity: toFixedString(parsed.data.quantity, NUMERIC_SCALES.quantity),
      pricePerUnit: toFixedString(parsed.data.pricePerUnit, NUMERIC_SCALES.pricePerUnit),
      fullPrice: toFixedString(
        toFixedNumber(fullPrice, NUMERIC_SCALES.fullPrice),
        NUMERIC_SCALES.fullPrice,
      ),
      commission:
        commission === null
          ? null
          : toFixedString(
              toFixedNumber(commission, NUMERIC_SCALES.commission),
              NUMERIC_SCALES.commission,
            ),
      source: parsed.data.source?.trim() || null,
      note: parsed.data.note?.trim() || null,
      nbpRateDate: nbp.rateDate,
      nbpRate: toFixedString(
        toFixedNumber(nbp.rate, NUMERIC_SCALES.nbpRate),
        NUMERIC_SCALES.nbpRate,
      ),
      valuePln: toFixedString(
        toFixedNumber(valuePln, NUMERIC_SCALES.valuePln),
        NUMERIC_SCALES.valuePln,
      ),
      updatedAt: new Date(),
    })
    .where(and(eq(entries.id, entryId), eq(entries.userId, userId)))
    .returning();

  if (!updated) {
    return { status: "error", message: "Entry not found." };
  }

  revalidatePath("/");

  return {
    status: "success",
    entry: serializeEntry(updated),
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
    .delete(entries)
    .where(and(eq(entries.id, entryId), eq(entries.userId, userId)))
    .returning({ id: entries.id });

  if (!deleted) {
    return { status: "error", message: "Entry not found." };
  }

  revalidatePath("/");

  return { status: "success" };
}
