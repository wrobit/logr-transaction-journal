import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { fxProviderRates } from "@/lib/db/schema";
import { resolveRateProvidersForCountry } from "@/lib/integrations/providers/registry";
import type { NormalizedRateResult, RateType } from "@/lib/integrations/types";
import { hashSnapshot, normalizeCurrency, normalizeIsoDate } from "@/lib/integrations/utils";

export async function getInternationalRate(input: {
  countryCode: string;
  baseCurrency: string;
  quoteCurrency: string;
  effectiveDate: string;
  rateType?: RateType;
}) {
  const baseCurrency = normalizeCurrency(input.baseCurrency);
  const quoteCurrency = normalizeCurrency(input.quoteCurrency);
  const effectiveDate = normalizeIsoDate(input.effectiveDate);
  const rateType = input.rateType ?? "historical";

  const providers = await resolveRateProvidersForCountry(input.countryCode);

  for (const provider of providers) {
    const result = await provider.getRate({
      baseCurrency,
      quoteCurrency,
      effectiveDate,
      rateType,
    });

    if (!result) {
      continue;
    }

    await persistProviderRate(result);
    return result;
  }

  const fallback = await getMostRecentRate(baseCurrency, quoteCurrency, effectiveDate, rateType);
  if (fallback) {
    return fallback;
  }

  throw new Error("No rate provider returned data for the requested parameters.");
}

async function persistProviderRate(result: NormalizedRateResult) {
  await db
    .insert(fxProviderRates)
    .values({
      baseCurrency: result.baseCurrency,
      quoteCurrency: result.quoteCurrency,
      effectiveDate: new Date(result.effectiveDate),
      rateValue: String(result.rateValue),
      sourceProvider: result.provider,
      publishedAt: result.publishedAt ? new Date(result.publishedAt) : null,
      retrievedAt: new Date(result.retrievedAt),
      rateType: result.rateType,
      method: result.method,
      responseHash: hashSnapshot(result.rawSnapshot),
      rawSnapshot: result.rawSnapshot,
    })
    .onConflictDoNothing();
}

async function getMostRecentRate(
  baseCurrency: string,
  quoteCurrency: string,
  effectiveDate: string,
  rateType: RateType,
) {
  const [cached] = await db
    .select()
    .from(fxProviderRates)
    .where(
      and(
        eq(fxProviderRates.baseCurrency, baseCurrency),
        eq(fxProviderRates.quoteCurrency, quoteCurrency),
        eq(fxProviderRates.effectiveDate, new Date(effectiveDate)),
        eq(fxProviderRates.rateType, rateType),
      ),
    )
    .orderBy(desc(fxProviderRates.retrievedAt))
    .limit(1);

  if (!cached) {
    return null;
  }

  return {
    provider: cached.sourceProvider,
    baseCurrency: cached.baseCurrency,
    quoteCurrency: cached.quoteCurrency,
    rateValue: Number(cached.rateValue),
    effectiveDate: normalizeIsoDate(cached.effectiveDate),
    publishedAt: cached.publishedAt?.toISOString() ?? null,
    retrievedAt: cached.retrievedAt.toISOString(),
    rateType: cached.rateType,
    method: cached.method,
    rawSnapshot: cached.rawSnapshot,
  } as NormalizedRateResult;
}
