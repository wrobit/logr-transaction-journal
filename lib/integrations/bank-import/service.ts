import { db } from "@/lib/db";
import { bankImportAuditBatches } from "@/lib/db/schema";
import { emitIntegrationAlert } from "@/lib/integrations/alerts";
import { parsePolishBankCsvFallback } from "@/lib/integrations/bank-import/csv-fallback";
import { resolveBankImportProvidersForCountry } from "@/lib/integrations/bank-import/registry";
import { getInternationalRate } from "@/lib/integrations/rates-service";
import { resolveProviderPolicy } from "@/lib/integrations/policy";
import type { NormalizedBankTransaction } from "@/lib/integrations/types";
import { hashSnapshot, normalizeCurrency, normalizeIsoDate } from "@/lib/integrations/utils";

type BankImportInput = {
  userId: string;
  countryCode: string;
  accountRef?: string;
  csvContent?: string;
  csvFilename?: string;
};

type BankImportResult = {
  source: "aggregator" | "csv_fallback";
  provider: string;
  accountRef: string;
  importedCount: number;
  failedCount: number;
  warnings: string[];
  transactions: NormalizedBankTransaction[];
};

type ImportNormalizationMetadata = {
  countryCode: string;
  policyProviders: string[];
  selectedRateProvider: string | null;
  rateAttribution: {
    provider: string;
    method: string;
    effectiveDate: string;
    warnings: string[];
  } | null;
  warnings: string[];
};

export async function importBankTransactions(input: BankImportInput): Promise<BankImportResult> {
  const countryCode = input.countryCode.toUpperCase();
  if (countryCode !== "PL") {
    throw new Error("Bank import is currently available only for Polish users (PL).");
  }

  const providers = await resolveBankImportProvidersForCountry(countryCode);
  const warnings: string[] = [];

  for (const provider of providers) {
    try {
      const accounts = await provider.listAccounts(input.userId);
      const accountRef = input.accountRef ?? accounts[0]?.accountRef;

      if (!accountRef) {
        warnings.push("No linked bank account found in aggregator.");
        continue;
      }

      const transactions = await provider.listTransactions(accountRef);
      const deduplicated = deduplicateTransactions(transactions);
      const enriched = await enrichImportedTransactions({
        countryCode,
        transactions: deduplicated,
        sourceProvider: provider.name,
      });
      const failedCount = Math.max(0, transactions.length - deduplicated.length);

      const result: BankImportResult = {
        source: "aggregator",
        provider: provider.name,
        accountRef,
        importedCount: enriched.transactions.length,
        failedCount,
        warnings: [...warnings, ...enriched.warnings],
        transactions: enriched.transactions,
      };

      await persistBankImportAudit(result, {
        countryCode,
      });

      return result;
    } catch (error) {
      warnings.push(`Aggregator ${provider.name} unavailable, trying CSV fallback.`);

      emitIntegrationAlert({
        code: "bank_provider_downtime",
        severity: "error",
        message: "Bank import provider failed; fallback to CSV is required.",
        context: {
          countryCode,
          provider: provider.name,
          userId: input.userId,
        },
      });

      if (process.env.NODE_ENV !== "production") {
        console.error(error);
      }
    }
  }

  if (!input.csvContent) {
    throw new Error("Bank aggregator is unavailable. Provide CSV content to continue import.");
  }

  const accountRef = input.accountRef ?? `csv:${hashSnapshot(input.csvFilename ?? "upload").slice(0, 10)}`;
  const parsed = parsePolishBankCsvFallback({
    accountRef,
    csvContent: input.csvContent,
  });
  const deduplicated = deduplicateTransactions(parsed);
  const enriched = await enrichImportedTransactions({
    countryCode,
    transactions: deduplicated,
    sourceProvider: "gocardless_bad",
  });
  const failedCount = Math.max(0, parsed.length - deduplicated.length);

  const result: BankImportResult = {
    source: "csv_fallback",
    provider: "gocardless_bad",
    accountRef,
    importedCount: enriched.transactions.length,
    failedCount,
    warnings: [...warnings, ...enriched.warnings],
    transactions: enriched.transactions,
  };

  await persistBankImportAudit(result, {
    countryCode,
    csvFilename: input.csvFilename ?? null,
  });

  return result;
}

async function persistBankImportAudit(
  result: BankImportResult,
  metadata: {
    countryCode: string;
    csvFilename?: string | null;
  },
) {
  await db.insert(bankImportAuditBatches).values({
    providerName: result.provider,
    accountRef: result.accountRef,
    batchId: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    importedCount: result.importedCount,
    failedCount: result.failedCount,
    metadata: {
      source: result.source,
      countryCode: metadata.countryCode,
      warnings: result.warnings,
      csvFilename: metadata.csvFilename ?? null,
      transactionSample: result.transactions.slice(0, 5),
    },
  });
}

function deduplicateTransactions(transactions: NormalizedBankTransaction[]) {
  const seen = new Set<string>();
  const unique: NormalizedBankTransaction[] = [];

  for (const transaction of transactions) {
    const key = `${transaction.accountRef}:${transaction.providerTransactionId}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(transaction);
  }

  return unique;
}

async function enrichImportedTransactions(input: {
  countryCode: string;
  transactions: NormalizedBankTransaction[];
  sourceProvider: string;
}) {
  const warnings: string[] = [];
  let policyProviders: string[] = [];

  try {
    policyProviders = await resolveProviderPolicy(input.countryCode, "rate");
  } catch {
    warnings.push("Rate provider policy unavailable during import normalization.");
  }

  const selectedRateProvider = policyProviders[0] ?? null;

  const transactions = await Promise.all(
    input.transactions.map(async (transaction) => {
      const normalizedCurrency = normalizeCurrency(transaction.currency);
      let rateAttribution: ImportNormalizationMetadata["rateAttribution"] = null;
      const localWarnings: string[] = [];

      if (normalizedCurrency !== "PLN") {
        try {
          const rate = await getInternationalRate({
            countryCode: input.countryCode,
            baseCurrency: normalizedCurrency,
            quoteCurrency: "PLN",
            effectiveDate: normalizeIsoDate(transaction.bookedAt),
            rateType: "historical",
          });

          rateAttribution = {
            provider: rate.provider,
            method: rate.method,
            effectiveDate: rate.effectiveDate,
            warnings: rate.warnings ?? [],
          };

          if (rate.warnings?.length) {
            localWarnings.push(...rate.warnings);
          }
        } catch {
          localWarnings.push(
            `Rate gap for ${normalizedCurrency}/PLN on ${normalizeIsoDate(transaction.bookedAt)} during import normalization.`,
          );
        }
      }

      const metadata: ImportNormalizationMetadata = {
        countryCode: input.countryCode,
        policyProviders,
        selectedRateProvider,
        rateAttribution,
        warnings: localWarnings,
      };

      if (localWarnings.length) {
        warnings.push(
          ...localWarnings.map((warning) => `${transaction.providerTransactionId}: ${warning}`),
        );
      }

      const snapshotBase =
        transaction.rawSnapshot && typeof transaction.rawSnapshot === "object"
          ? (transaction.rawSnapshot as Record<string, unknown>)
          : { raw: transaction.rawSnapshot };

      return {
        ...transaction,
        rawSnapshot: {
          ...snapshotBase,
          normalization: {
            ...metadata,
            sourceProvider: input.sourceProvider,
          },
        },
      } satisfies NormalizedBankTransaction;
    }),
  );

  return {
    transactions,
    warnings,
  };
}
