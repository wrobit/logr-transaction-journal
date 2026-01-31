import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { fxRatesCache } from "@/lib/db/schema";

export type NbpRateResult = {
  rate: number;
  rateDate: Date;
};

export type NbpRateOptions = {
  fetchRate?: (currency: string, rateDate: Date) => Promise<number | null>;
  getCachedRate?: (currency: string, rateDate: Date) => Promise<number | null>;
  setCachedRate?: (
    currency: string,
    rateDate: Date,
    rate: number,
  ) => Promise<void>;
  maxLookbackDays?: number;
};

const DEFAULT_LOOKBACK_DAYS = 10;

export function resolveRateDate(entryDate: Date) {
  const baseDate = new Date(
    Date.UTC(
      entryDate.getUTCFullYear(),
      entryDate.getUTCMonth(),
      entryDate.getUTCDate(),
    ),
  );
  const dayOfWeek = baseDate.getUTCDay();

  if (dayOfWeek === 0) {
    return addDays(baseDate, -2);
  }

  if (dayOfWeek === 6) {
    return addDays(baseDate, -1);
  }

  return addDays(baseDate, -1);
}

export async function getNbpRate(
  currency: string,
  entryDate: Date,
  options: NbpRateOptions = {},
): Promise<NbpRateResult> {
  const normalizedCurrency = currency.toUpperCase();

  if (normalizedCurrency === "PLN") {
    return { rate: 1, rateDate: entryDate };
  }

  const fetchRate = options.fetchRate ?? fetchNbpRate;
  const getCachedRate = options.getCachedRate ?? getCachedNbpRate;
  const setCachedRate = options.setCachedRate ?? cacheNbpRate;
  const maxLookbackDays = options.maxLookbackDays ?? DEFAULT_LOOKBACK_DAYS;

  let rateDate = resolveRateDate(entryDate);

  for (let offset = 0; offset < maxLookbackDays; offset += 1) {
    const cachedRate = await getCachedRate(normalizedCurrency, rateDate);
    if (cachedRate !== null) {
      return { rate: cachedRate, rateDate };
    }

    const fetchedRate = await fetchRate(normalizedCurrency, rateDate);
    if (fetchedRate !== null) {
      await setCachedRate(normalizedCurrency, rateDate, fetchedRate);
      return { rate: fetchedRate, rateDate };
    }

    rateDate = addDays(rateDate, -1);
  }

  throw new Error("NBP rate not found for recent dates.");
}

export async function fetchNbpRate(currency: string, rateDate: Date) {
  const dateString = formatDate(rateDate);
  const response = await fetch(
    `https://api.nbp.pl/api/exchangerates/rates/A/${currency}/${dateString}/?format=json`,
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("NBP request failed.");
  }

  const data = (await response.json()) as {
    rates?: Array<{ mid?: number }>;
  };
  const rate = data.rates?.[0]?.mid;

  if (typeof rate !== "number") {
    throw new Error("NBP response missing rate.");
  }

  return rate;
}

export async function getCachedNbpRate(currency: string, rateDate: Date) {
  const [cached] = await db
    .select({ rate: fxRatesCache.rate })
    .from(fxRatesCache)
    .where(and(eq(fxRatesCache.currency, currency), eq(fxRatesCache.rateDate, rateDate)))
    .orderBy(desc(fxRatesCache.rateDate))
    .limit(1);

  if (!cached) {
    return null;
  }

  return Number(cached.rate);
}

export async function cacheNbpRate(
  currency: string,
  rateDate: Date,
  rate: number,
) {
  await db
    .insert(fxRatesCache)
    .values({ currency, rateDate, rate: String(rate) })
    .onConflictDoNothing();
}

export function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, amount: number) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + amount);
  return copy;
}
