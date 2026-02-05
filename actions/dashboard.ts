"use server";

import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";

import { ensureUserId } from "@/lib/auth/users";
import {
  DEFAULT_DISPLAY_CURRENCY,
  isDisplayCurrency,
  type DisplayCurrency,
} from "@/lib/currency/display";
import { db } from "@/lib/db";
import { entries, users } from "@/lib/db/schema";
import { resolveDashboardRange, type DashboardQuery } from "@/lib/dashboard/query";
import { dayjs } from "@/lib/dayjs";
import { getUserDek, resolveEntryPayload } from "@/lib/entries/encryption";
import { getNbpRate } from "@/lib/nbp";

export type DashboardSeriesPoint = {
  date: string;
  buyValue: number;
  sellValue: number;
  pnlValue: number;
};

export type DashboardHolding = {
  asset: string;
  netQuantity: number;
  buyValue: number;
  sellValue: number;
  pnlValue: number;
  netValue: number;
};

export type DashboardData = {
  displayCurrency: DisplayCurrency;
  totals: {
    buyValue: number;
    sellValue: number;
    pnlValue: number;
  };
  series: DashboardSeriesPoint[];
  holdings: DashboardHolding[];
  holdingsMix: Array<{ asset: string; value: number }>;
  assets: string[];
};

const toNumber = (value: unknown) => Number(value ?? 0);

export async function getDashboardData(
  user: { id?: string | null; email?: string | null; name?: string | null },
  query: DashboardQuery,
): Promise<DashboardData> {
  const userId = await ensureUserId(user);

  if (!userId) {
    return {
      displayCurrency: DEFAULT_DISPLAY_CURRENCY,
      totals: { buyValue: 0, sellValue: 0, pnlValue: 0 },
      series: [],
      holdings: [],
      holdingsMix: [],
      assets: [],
    };
  }

  const [userRecord] = await db
    .select({ displayCurrency: users.displayCurrency })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const displayCurrency = isDisplayCurrency(userRecord?.displayCurrency)
    ? userRecord.displayCurrency
    : DEFAULT_DISPLAY_CURRENCY;

  const range = resolveDashboardRange(query.range);
  const conditions = [eq(entries.userId, userId), isNull(entries.deletedAt)];

  if (range.startDate) {
    conditions.push(gte(entries.date, range.startDate));
  }

  if (range.endDate) {
    conditions.push(lte(entries.date, range.endDate));
  }

  const whereClause = and(...conditions);

  const rows = await db
    .select()
    .from(entries)
    .where(whereClause)
    .orderBy(asc(entries.date));

  const dek = await getUserDek(userId);
  const resolvedEntries = await Promise.all(
    rows.map(async (row) => ({
      row,
      payload: await resolveEntryPayload(row, dek),
    })),
  );

  const filteredEntries = query.asset
    ? resolvedEntries.filter((entry) => entry.payload.baseAsset === query.asset)
    : resolvedEntries;

  const displayRatesByDate = new Map<string, number>();
  if (displayCurrency !== "PLN") {
    const uniqueDates = Array.from(new Set(filteredEntries.map((entry) => entry.payload.nbpRateDate)));
    await Promise.all(
      uniqueDates.map(async (dateString) => {
        const rateResult = await getNbpRate(
          displayCurrency,
          dayjs.utc(dateString, "YYYY-MM-DD", true).toDate(),
        );
        displayRatesByDate.set(dateString, rateResult.rate);
      }),
    );
  }

  const totals = { buyValue: 0, sellValue: 0, pnlValue: 0 };
  const seriesMap = new Map<string, { buyValue: number; sellValue: number }>();
  const holdingsMap = new Map<
    string,
    { buyValue: number; sellValue: number; netQuantity: number }
  >();

  for (const entry of filteredEntries) {
    const valuePln = toNumber(entry.payload.valuePln);
    const displayRate =
      displayCurrency === "PLN" ? 1 : (displayRatesByDate.get(entry.payload.nbpRateDate) ?? 1);
    const value = valuePln / displayRate;
    const quantity = toNumber(entry.payload.quantity);
    const dateKey = dayjs.utc(entry.row.date).format("YYYY-MM-DD");
    const seriesEntry =
      seriesMap.get(dateKey) ?? { buyValue: 0, sellValue: 0 };
    const holdingsEntry = holdingsMap.get(entry.payload.baseAsset) ?? {
      buyValue: 0,
      sellValue: 0,
      netQuantity: 0,
    };

    if (entry.payload.operation === "BUY") {
      totals.buyValue += value;
      seriesEntry.buyValue += value;
      holdingsEntry.buyValue += value;
      holdingsEntry.netQuantity += quantity;
    } else {
      totals.sellValue += value;
      seriesEntry.sellValue += value;
      holdingsEntry.sellValue += value;
      holdingsEntry.netQuantity -= quantity;
    }

    seriesMap.set(dateKey, seriesEntry);
    holdingsMap.set(entry.payload.baseAsset, holdingsEntry);
  }

  totals.pnlValue = totals.sellValue - totals.buyValue;

  let runningPnl = 0;
  const series = Array.from(seriesMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, values]) => {
      const pnlDelta = values.sellValue - values.buyValue;
      runningPnl += pnlDelta;
      return {
        date,
        buyValue: values.buyValue,
        sellValue: values.sellValue,
        pnlValue: runningPnl,
      };
    });

  const holdings = Array.from(holdingsMap.entries())
    .map(([asset, values]) => {
      const pnlValue = values.sellValue - values.buyValue;
      const netValue = values.buyValue - values.sellValue;
      return {
        asset,
        netQuantity: values.netQuantity,
        buyValue: values.buyValue,
        sellValue: values.sellValue,
        pnlValue,
        netValue,
      };
    })
    .sort((left, right) => left.asset.localeCompare(right.asset));

  const holdingsMix = holdings
    .map((holding) => ({
      asset: holding.asset,
      value: Math.max(holding.netValue, 0),
    }))
    .filter((holding) => holding.value > 0);

  const assets = Array.from(
    new Set(resolvedEntries.map((entry) => entry.payload.baseAsset)),
  ).sort((left, right) => left.localeCompare(right));

  return {
    displayCurrency,
    totals,
    series,
    holdings,
    holdingsMix,
    assets,
  };
}
