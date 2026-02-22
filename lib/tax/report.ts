import { and, eq, gte, isNull, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { dayjs } from "@/lib/dayjs";
import { getUserDek, resolveEntryPayload } from "@/lib/entries/encryption";
import type { EntryRateAttribution } from "@/lib/entries/types";
import { hashSnapshot } from "@/lib/integrations/utils";

export type TaxReportRow = {
  entryId: string;
  date: string;
  operation: "BUY" | "SELL";
  baseAsset: string;
  quoteCurrency: string;
  quantity: string;
  pricePerUnit: string;
  fullPrice: string;
  commission: string | null;
  source: string | null;
  note: string | null;
  valuePln: string;
  rate: {
    value: string;
    effectiveDate: string;
    provider: string;
    method: string;
    source: EntryRateAttribution["source"];
    publishedAt: string | null;
    retrievedAt: string;
    snapshotHash: string | null;
    warnings: string[];
  };
};

export type TaxReport = {
  generatedAt: string;
  year: number | null;
  rowCount: number;
  reportHash: string;
  reproducibility: {
    source: "persisted_entry_snapshots";
    deterministicOrder: "date_asc_id_asc";
  };
  rows: TaxReportRow[];
};

export async function generateTaxReport(input: { userId: string; year?: number }): Promise<TaxReport> {
  const conditions = [eq(entries.userId, input.userId), isNull(entries.deletedAt)];

  if (typeof input.year === "number") {
    const start = dayjs.utc(`${input.year}-01-01`, "YYYY-MM-DD", true).toDate();
    const endExclusive = dayjs.utc(`${input.year + 1}-01-01`, "YYYY-MM-DD", true).toDate();
    conditions.push(gte(entries.date, start));
    conditions.push(lt(entries.date, endExclusive));
  }

  const rows = await db
    .select()
    .from(entries)
    .where(and(...conditions));

  const dek = await getUserDek(input.userId);
  const resolvedRows = await Promise.all(
    rows.map(async (row) => ({
      row,
      payload: await resolveEntryPayload(row, dek),
    })),
  );

  const reportRows = resolvedRows
    .map(({ row, payload }) => {
      const rateAttribution: EntryRateAttribution = payload.rateAttribution ?? {
        source: "legacy_nbp",
        provider: "nbp",
        method: "official_publication",
        effectiveDate: payload.nbpRateDate,
        publishedAt: null,
        retrievedAt: row.updatedAt.toISOString(),
        snapshotHash: null,
        warnings: [],
      };

      return {
        entryId: row.id,
        date: dayjs.utc(row.date).format("YYYY-MM-DD"),
        operation: payload.operation,
        baseAsset: payload.baseAsset,
        quoteCurrency: payload.quoteCurrency,
        quantity: payload.quantity,
        pricePerUnit: payload.pricePerUnit,
        fullPrice: payload.fullPrice,
        commission: payload.commission,
        source: payload.source,
        note: payload.note,
        valuePln: payload.valuePln,
        rate: {
          value: payload.nbpRate,
          effectiveDate: rateAttribution.effectiveDate,
          provider: rateAttribution.provider,
          method: rateAttribution.method,
          source: rateAttribution.source,
          publishedAt: rateAttribution.publishedAt,
          retrievedAt: rateAttribution.retrievedAt,
          snapshotHash: rateAttribution.snapshotHash,
          warnings: rateAttribution.warnings,
        },
      } satisfies TaxReportRow;
    })
    .sort((left, right) => {
      if (left.date === right.date) {
        return left.entryId.localeCompare(right.entryId);
      }
      return left.date.localeCompare(right.date);
    });

  const reportHash = hashSnapshot(
    reportRows.map((row) => ({
      entryId: row.entryId,
      date: row.date,
      operation: row.operation,
      baseAsset: row.baseAsset,
      quoteCurrency: row.quoteCurrency,
      quantity: row.quantity,
      pricePerUnit: row.pricePerUnit,
      fullPrice: row.fullPrice,
      commission: row.commission,
      source: row.source,
      note: row.note,
      valuePln: row.valuePln,
      rate: row.rate,
    })),
  );

  return {
    generatedAt: dayjs.utc().toISOString(),
    year: input.year ?? null,
    rowCount: reportRows.length,
    reportHash,
    reproducibility: {
      source: "persisted_entry_snapshots",
      deterministicOrder: "date_asc_id_asc",
    },
    rows: reportRows,
  };
}
