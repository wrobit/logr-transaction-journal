"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import {
  calculateFullPrice,
  calculateValuePln,
  NUMERIC_SCALES,
  toFixedNumber,
  toFixedString,
} from "@/lib/entries/calculations";
import { serializeEntry } from "@/lib/entries/serialize";
import type { CreateEntryState } from "@/lib/entries/actions";
import { entryInputSchema } from "@/lib/entries/validation";
import { getNbpRate } from "@/lib/nbp";

export async function listEntries(userId: string) {
  const rows = await db
    .select()
    .from(entries)
    .where(eq(entries.userId, userId))
    .orderBy(desc(entries.date));

  return rows.map(serializeEntry);
}

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

  const rawInput = {
    date: formData.get("date"),
    operation: formData.get("operation"),
    baseAsset: formData.get("baseAsset"),
    quoteCurrency: formData.get("quoteCurrency"),
    quantity: formData.get("quantity"),
    pricePerUnit: formData.get("pricePerUnit"),
    commission: formData.get("commission"),
    source: formData.get("source"),
    note: formData.get("note"),
  };

  const parsed = entryInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !errors[field]) {
        errors[field] = issue.message;
      }
    }

    return { status: "error", errors };
  }

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

  const [created] = await db
    .insert(entries)
    .values({
      userId: session.user.id,
      date: entryDate,
      operation: parsed.data.operation,
      baseAsset: parsed.data.baseAsset.trim().toUpperCase(),
      quoteCurrency: parsed.data.quoteCurrency.trim().toUpperCase(),
      quantity: toFixedString(quantity, NUMERIC_SCALES.quantity),
      pricePerUnit: toFixedString(pricePerUnit, NUMERIC_SCALES.pricePerUnit),
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
