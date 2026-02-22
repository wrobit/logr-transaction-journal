import { createHash } from "node:crypto";

import { and, desc, eq, inArray } from "drizzle-orm";

import { parseExchangeCsv } from "@/lib/exchange-import/adapters";
import type {
  ExchangeImportConfirmState,
  ExchangeImportPreviewState,
  ExchangeImportPreviewRow,
} from "@/lib/exchange-import/actions";
import { db } from "@/lib/db";
import { entries, exchangeImportBatches, exchangeImportRows } from "@/lib/db/schema";
import { dayjs } from "@/lib/dayjs";
import {
  calculateValuePln,
  NUMERIC_SCALES,
  toFixedNumber,
  toFixedString,
} from "@/lib/entries/calculations";
import {
  encryptEntryPayload,
  ENTRY_ENCRYPTION_VERSION,
  getUserDek,
} from "@/lib/entries/encryption";
import type { EntryRateAttribution } from "@/lib/entries/types";
import { getInternationalRate } from "@/lib/integrations/rates-service";
import { hashSnapshot } from "@/lib/integrations/utils";
import { getNbpRate } from "@/lib/nbp";

import type { CanonicalImportTransaction, ExchangeCsvProvider } from "@/lib/exchange-import/types";
import { validateCanonicalTransaction } from "@/lib/exchange-import/validation";

const DEFAULT_ENTRY_COUNTRY_CODE = "PL";
const RATE_CURRENCY_ALIASES: Record<string, string> = {
  USDT: "USD",
  USDC: "USD",
  BUSD: "USD",
  DAI: "USD",
};

export function buildRowFingerprint(transaction: CanonicalImportTransaction): string {
  const payload = [
    transaction.provider,
    transaction.externalId,
    transaction.executedAt,
    transaction.operation,
    transaction.baseAsset,
    transaction.quoteCurrency,
    transaction.quantity,
    transaction.pricePerUnit,
    transaction.fullPrice,
    transaction.commission ?? "",
    transaction.commissionCurrency ?? "",
  ].join("|");

  return createHash("sha256").update(payload).digest("hex");
}

export function previewExchangeImport(input: {
  provider: ExchangeCsvProvider;
  filename?: string | null;
  content: string | Uint8Array;
}): ExchangeImportPreviewState {
  const parsed = parseExchangeCsv({
    provider: input.provider,
    filename: input.filename ?? undefined,
    content: input.content,
  });

  const rows: ExchangeImportPreviewRow[] = parsed.rows.map((row) => {
    if (row.status === "valid") {
      return {
        rowNumber: row.rowNumber,
        status: "valid",
        issues: [],
        rawRow: row.transaction.rawRow,
        transaction: row.transaction,
      };
    }

    return {
      rowNumber: row.rowNumber,
      status: row.status,
      issues: row.issues,
      rawRow: row.rawRow,
    };
  });

  const validRows = rows.filter((row) => row.status === "valid").length;
  const invalidRows = rows.filter((row) => row.status === "invalid").length;
  const unsupportedRows = rows.filter((row) => row.status === "unsupported").length;

  return {
    status: "success",
    provider: parsed.provider,
    filename: parsed.filename,
    delimiter: parsed.delimiter,
    encoding: parsed.encoding,
    totalRows: rows.length,
    validRows,
    invalidRows,
    unsupportedRows,
    rows,
  };
}

export async function confirmExchangeImport(input: {
  userId: string;
  provider: ExchangeCsvProvider;
  filename?: string | null;
  rows: CanonicalImportTransaction[];
}): Promise<ExchangeImportConfirmState> {
  if (!input.rows.length) {
    return {
      status: "error",
      message: "No valid rows selected for import.",
    };
  }

  const validatedRows = input.rows.flatMap((row) => {
    const validation = validateCanonicalTransaction(row);
    if (validation.ok) {
      return [row];
    }

    return [];
  });

  if (!validatedRows.length) {
    return {
      status: "error",
      message: "All selected rows are invalid.",
    };
  }

  const rowFingerprints = validatedRows.map((row) => buildRowFingerprint(row));
  const uniqueInPayload = new Set<string>();
  const duplicateInPayload = new Set<string>();
  for (const hash of rowFingerprints) {
    if (uniqueInPayload.has(hash)) {
      duplicateInPayload.add(hash);
      continue;
    }
    uniqueInPayload.add(hash);
  }

  const existingRows = await db
    .select({ rowHash: exchangeImportRows.rowHash })
    .from(exchangeImportRows)
    .innerJoin(
      exchangeImportBatches,
      eq(exchangeImportRows.batchId, exchangeImportBatches.id),
    )
    .where(
      and(
        eq(exchangeImportBatches.userId, input.userId),
        inArray(exchangeImportRows.rowHash, Array.from(uniqueInPayload)),
        eq(exchangeImportRows.status, "imported"),
      ),
    );

  const existingHashes = new Set(existingRows.map((row) => row.rowHash));

  const [batch] = await db
    .insert(exchangeImportBatches)
    .values({
      userId: input.userId,
      provider: input.provider,
      filename: input.filename ?? null,
      status: "completed",
      totalRows: validatedRows.length,
      validRows: validatedRows.length,
      metadata: {
        source: "entries_workspace",
      },
    })
    .returning({ id: exchangeImportBatches.id });

  if (!batch) {
    return {
      status: "error",
      message: "Failed to create import batch.",
    };
  }

  const dek = await getUserDek(input.userId);
  const failedRows: Array<{ rowNumber: number; reason: string }> = [];
  const failedReportRows: Array<{
    rowNumber: number;
    status: "failed" | "duplicate";
    reason: string;
    externalId: string;
    market: string;
    operation: string;
    quantity: string;
    rawRow: Record<string, string>;
  }> = [];

  let importedCount = 0;
  let duplicateCount = 0;

  for (const transaction of validatedRows) {
    const rowHash = buildRowFingerprint(transaction);

    if (duplicateInPayload.has(rowHash) || existingHashes.has(rowHash)) {
      duplicateCount += 1;
      failedReportRows.push({
        rowNumber: transaction.rowNumber,
        status: "duplicate",
        reason: "Duplicate row fingerprint.",
        externalId: transaction.externalId,
        market: `${transaction.baseAsset}/${transaction.quoteCurrency}`,
        operation: transaction.operation,
        quantity: transaction.quantity,
        rawRow: transaction.rawRow,
      });
      await db.insert(exchangeImportRows).values({
        batchId: batch.id,
        rowNumber: transaction.rowNumber,
        rowHash,
        status: "duplicate",
        issues: [{ code: "duplicate", message: "Duplicate row fingerprint." }],
        rawRow: transaction.rawRow,
        transaction,
      });
      continue;
    }

    try {
      const entryDate = dayjs.utc(transaction.executedAt).toDate();
      const fullPrice = Number(transaction.fullPrice);

      const rateResolution = await resolvePlnRateWithAttribution({
        quoteCurrency: transaction.quoteCurrency,
        entryDate,
      });

      const valuePln = calculateValuePln(fullPrice, rateResolution.rate);

      const payload = {
        operation: transaction.operation,
        baseAsset: transaction.baseAsset,
        quoteCurrency: transaction.quoteCurrency,
        quantity: toFixedString(Number(transaction.quantity), NUMERIC_SCALES.quantity),
        pricePerUnit: toFixedString(Number(transaction.pricePerUnit), NUMERIC_SCALES.pricePerUnit),
        fullPrice: toFixedString(toFixedNumber(fullPrice, NUMERIC_SCALES.fullPrice), NUMERIC_SCALES.fullPrice),
        commission:
          transaction.commission === null
            ? null
            : toFixedString(
                toFixedNumber(Number(transaction.commission), NUMERIC_SCALES.commission),
                NUMERIC_SCALES.commission,
              ),
        source: `${transaction.sourceName} CSV`,
        note: `Imported from ${transaction.sourceName} (${transaction.externalId})`,
        nbpRateDate: dayjs.utc(rateResolution.rateDate).format("YYYY-MM-DD"),
        nbpRate: toFixedString(
          toFixedNumber(rateResolution.rate, NUMERIC_SCALES.nbpRate),
          NUMERIC_SCALES.nbpRate,
        ),
        valuePln: toFixedString(
          toFixedNumber(valuePln, NUMERIC_SCALES.valuePln),
          NUMERIC_SCALES.valuePln,
        ),
        rateAttribution: rateResolution.attribution,
      };

      const encryptedPayload = encryptEntryPayload(payload, dek);

      const [created] = await db
        .insert(entries)
        .values({
          userId: input.userId,
          date: entryDate,
          encryptedPayload,
          encryptionVersion: ENTRY_ENCRYPTION_VERSION,
          importBatchId: batch.id,
        })
        .returning({ id: entries.id });

      if (!created) {
        failedRows.push({ rowNumber: transaction.rowNumber, reason: "Entry insert failed." });
        failedReportRows.push({
          rowNumber: transaction.rowNumber,
          status: "failed",
          reason: "Entry insert failed.",
          externalId: transaction.externalId,
          market: `${transaction.baseAsset}/${transaction.quoteCurrency}`,
          operation: transaction.operation,
          quantity: transaction.quantity,
          rawRow: transaction.rawRow,
        });
        await db.insert(exchangeImportRows).values({
          batchId: batch.id,
          rowNumber: transaction.rowNumber,
          rowHash,
          status: "failed",
          issues: [{ code: "insert_failed", message: "Failed to insert entry." }],
          rawRow: transaction.rawRow,
          transaction,
        });
        continue;
      }

      importedCount += 1;

      await db.insert(exchangeImportRows).values({
        batchId: batch.id,
        rowNumber: transaction.rowNumber,
        rowHash,
        status: "imported",
        issues: [],
        rawRow: transaction.rawRow,
        transaction,
        entryId: created.id,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unexpected import error.";
      failedRows.push({
        rowNumber: transaction.rowNumber,
        reason,
      });
      failedReportRows.push({
        rowNumber: transaction.rowNumber,
        status: "failed",
        reason,
        externalId: transaction.externalId,
        market: `${transaction.baseAsset}/${transaction.quoteCurrency}`,
        operation: transaction.operation,
        quantity: transaction.quantity,
        rawRow: transaction.rawRow,
      });

      await db.insert(exchangeImportRows).values({
        batchId: batch.id,
        rowNumber: transaction.rowNumber,
        rowHash,
        status: "failed",
        issues: [{ code: "unexpected_error", message: "Unexpected import error." }],
        rawRow: transaction.rawRow,
        transaction,
      });
    }
  }

  const failedCount = failedRows.length;

  await db
    .update(exchangeImportBatches)
    .set({
      importedRows: importedCount,
      failedRows: failedCount,
      updatedAt: dayjs.utc().toDate(),
      metadata: {
        source: "entries_workspace",
        duplicates: duplicateCount,
      },
    })
    .where(eq(exchangeImportBatches.id, batch.id));

  const failedReportCsv = buildFailedRowsCsv(failedReportRows);

  return {
    status: "success",
    batchId: batch.id,
    importedCount,
    failedCount,
    duplicateCount,
    failedRows,
    failedReportCsv,
  };
}

export async function listRecentImportBatches(userId: string) {
  return db
    .select({
      id: exchangeImportBatches.id,
      provider: exchangeImportBatches.provider,
      filename: exchangeImportBatches.filename,
      importedRows: exchangeImportBatches.importedRows,
      failedRows: exchangeImportBatches.failedRows,
      createdAt: exchangeImportBatches.createdAt,
    })
    .from(exchangeImportBatches)
    .where(eq(exchangeImportBatches.userId, userId))
    .orderBy(desc(exchangeImportBatches.createdAt))
    .limit(10);
}

function buildFailedRowsCsv(
  rows: Array<{
    rowNumber: number;
    status: "failed" | "duplicate";
    reason: string;
    externalId: string;
    market: string;
    operation: string;
    quantity: string;
    rawRow: Record<string, string>;
  }>,
) {
  if (!rows.length) {
    return undefined;
  }

  const header = [
    "RowNumber",
    "Status",
    "Reason",
    "ExternalId",
    "Market",
    "Operation",
    "Quantity",
    "RawRow",
  ].join(",");

  const body = rows.map((row) => {
    const values = [
      String(row.rowNumber),
      row.status,
      row.reason,
      row.externalId,
      row.market,
      row.operation,
      row.quantity,
      JSON.stringify(row.rawRow),
    ];

    return values.map(csvEscape).join(",");
  });

  return [header, ...body].join("\n");
}

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

async function resolvePlnRateWithAttribution(input: {
  quoteCurrency: string;
  entryDate: Date;
}): Promise<{ rate: number; rateDate: Date; attribution: EntryRateAttribution }> {
  const quoteCurrency = input.quoteCurrency.trim().toUpperCase();
  const rateCurrency = RATE_CURRENCY_ALIASES[quoteCurrency] ?? quoteCurrency;
  const aliasWarnings =
    rateCurrency !== quoteCurrency
      ? [`FX valuation alias applied: ${quoteCurrency} treated as ${rateCurrency} for PLN conversion.`]
      : [];
  const effectiveDate = dayjs.utc(input.entryDate).format("YYYY-MM-DD");

  if (quoteCurrency === "PLN") {
    return {
      rate: 1,
      rateDate: input.entryDate,
      attribution: {
        source: "direct",
        provider: "nbp",
        method: "official_publication",
        effectiveDate,
        retrievedAt: dayjs.utc().toISOString(),
        publishedAt: `${effectiveDate}T00:00:00.000Z`,
        snapshotHash: null,
        warnings: aliasWarnings,
      },
    };
  }

  try {
    const result = await getInternationalRate({
      countryCode: DEFAULT_ENTRY_COUNTRY_CODE,
      baseCurrency: rateCurrency,
      quoteCurrency: "PLN",
      effectiveDate,
      rateType: "historical",
    });

    return {
      rate: result.rateValue,
      rateDate: dayjs.utc(result.effectiveDate, "YYYY-MM-DD", true).toDate(),
      attribution: {
        source: "integration_service",
        provider: result.provider,
        method: result.method,
        effectiveDate: result.effectiveDate,
        retrievedAt: result.retrievedAt,
        publishedAt: result.publishedAt,
        snapshotHash: result.rawSnapshot ? hashSnapshot(result.rawSnapshot) : null,
        warnings: [...aliasWarnings, ...(result.warnings ?? [])],
      },
    };
  } catch {
    const legacyRate = await getNbpRate(rateCurrency, input.entryDate);

    return {
      rate: legacyRate.rate,
      rateDate: legacyRate.rateDate,
      attribution: {
        source: "legacy_nbp",
        provider: "nbp",
        method: "official_publication",
        effectiveDate: dayjs.utc(legacyRate.rateDate).format("YYYY-MM-DD"),
        retrievedAt: dayjs.utc().toISOString(),
        publishedAt: dayjs.utc(legacyRate.rateDate).toISOString(),
        snapshotHash: null,
        warnings: [
          ...aliasWarnings,
          "Fallback to legacy NBP resolver used for this entry.",
        ],
      },
    };
  }
}
