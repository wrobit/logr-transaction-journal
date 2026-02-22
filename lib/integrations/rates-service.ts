import { and, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { fxProviderRates } from "@/lib/db/schema";
import { dayjs } from "@/lib/dayjs";
import { emitIntegrationAlert } from "@/lib/integrations/alerts";
import { resolveRateProvidersForCountry } from "@/lib/integrations/providers/registry";
import type { NormalizedRateResult, RateType } from "@/lib/integrations/types";
import { hashSnapshot, normalizeCurrency, normalizeIsoDate } from "@/lib/integrations/utils";

const LATEST_CACHE_TTL_MINUTES = Number(process.env.INTL_LATEST_RATE_TTL_MINUTES ?? 30);
const STALE_RATE_ALERT_HOURS = Number(process.env.INTL_STALE_RATE_ALERT_HOURS ?? 48);

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

  if (rateType === "historical") {
    const exactCached = await getExactRate(baseCurrency, quoteCurrency, effectiveDate, rateType);
    if (exactCached) {
      return exactCached;
    }
  } else {
    const freshLatest = await getFreshLatestRate(baseCurrency, quoteCurrency);
    if (freshLatest) {
      return freshLatest;
    }
  }

  const providers = await resolveRateProvidersForCountry(input.countryCode);

  for (const provider of providers) {
    try {
      const result =
        rateType === "latest"
          ? await provider.getLatest({
              baseCurrency,
              quoteCurrency,
            })
          : await provider.getRate({
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
    } catch (error) {
      emitIntegrationAlert({
        code: "rate_provider_downtime",
        severity: "error",
        message: "Rate provider call failed and fallback is being attempted.",
        context: {
          provider: provider.name,
          countryCode: input.countryCode.toUpperCase(),
          baseCurrency,
          quoteCurrency,
          rateType,
        },
      });

      if (process.env.NODE_ENV !== "production") {
        console.error(error);
      }
    }
  }

  const fallback = await getMostRecentRate(baseCurrency, quoteCurrency, effectiveDate, rateType);
  if (fallback) {
    const warnings = [
      `Using cached fallback rate retrieved at ${fallback.retrievedAt} (effective ${fallback.effectiveDate}).`,
    ];

    emitIntegrationAlert({
      code: "rate_fallback_used",
      severity: "warning",
      message: "Cached fallback rate was used after provider miss.",
      context: {
        countryCode: input.countryCode.toUpperCase(),
        provider: fallback.provider,
        baseCurrency,
        quoteCurrency,
        requestedEffectiveDate: effectiveDate,
        fallbackEffectiveDate: fallback.effectiveDate,
        rateType,
      },
    });

    const staleHours = dayjs.utc().diff(dayjs.utc(fallback.retrievedAt), "hour");
    if (staleHours >= STALE_RATE_ALERT_HOURS) {
      warnings.push(
        `Fallback rate is stale (${staleHours}h old; threshold ${STALE_RATE_ALERT_HOURS}h).`,
      );

      emitIntegrationAlert({
        code: "stale_rate_used",
        severity: "warning",
        message: "A stale fallback FX rate was used.",
        context: {
          countryCode: input.countryCode.toUpperCase(),
          provider: fallback.provider,
          baseCurrency,
          quoteCurrency,
          staleHours,
          thresholdHours: STALE_RATE_ALERT_HOURS,
        },
      });
    }

    return {
      ...fallback,
      warnings,
    };
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

async function getExactRate(
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

  return toNormalizedRate(cached);
}

async function getFreshLatestRate(baseCurrency: string, quoteCurrency: string) {
  const freshnessThreshold = dayjs.utc().subtract(LATEST_CACHE_TTL_MINUTES, "minute").toDate();

  const [cached] = await db
    .select()
    .from(fxProviderRates)
    .where(
      and(
        eq(fxProviderRates.baseCurrency, baseCurrency),
        eq(fxProviderRates.quoteCurrency, quoteCurrency),
        eq(fxProviderRates.rateType, "latest"),
        gte(fxProviderRates.retrievedAt, freshnessThreshold),
      ),
    )
    .orderBy(desc(fxProviderRates.retrievedAt))
    .limit(1);

  if (!cached) {
    return null;
  }

  return toNormalizedRate(cached);
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
        eq(fxProviderRates.rateType, rateType),
        lte(fxProviderRates.effectiveDate, new Date(effectiveDate)),
      ),
    )
    .orderBy(desc(fxProviderRates.effectiveDate), desc(fxProviderRates.retrievedAt))
    .limit(1);

  if (!cached) {
    return null;
  }

  return toNormalizedRate(cached);
}

function toNormalizedRate(cached: typeof fxProviderRates.$inferSelect): NormalizedRateResult {
  return {
    provider: cached.sourceProvider as NormalizedRateResult["provider"],
    baseCurrency: cached.baseCurrency,
    quoteCurrency: cached.quoteCurrency,
    rateValue: Number(cached.rateValue),
    effectiveDate: normalizeIsoDate(cached.effectiveDate),
    publishedAt: cached.publishedAt?.toISOString() ?? null,
    retrievedAt: cached.retrievedAt.toISOString(),
    rateType: cached.rateType as RateType,
    method: cached.method as NormalizedRateResult["method"],
    rawSnapshot: cached.rawSnapshot,
  };
}
