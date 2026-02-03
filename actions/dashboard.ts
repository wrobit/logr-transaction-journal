"use server";

import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";

import { ensureUserId } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import {
  resolveDashboardRange,
  type DashboardQuery,
} from "@/lib/dashboard/query";

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
      totals: { buyValue: 0, sellValue: 0, pnlValue: 0 },
      series: [],
      holdings: [],
      holdingsMix: [],
      assets: [],
    };
  }

  const range = resolveDashboardRange(query.range);
  const conditions = [eq(entries.userId, userId), isNull(entries.deletedAt)];

  if (range.startDate) {
    conditions.push(gte(entries.date, range.startDate));
  }

  if (range.endDate) {
    conditions.push(lte(entries.date, range.endDate));
  }

  if (query.asset) {
    conditions.push(eq(entries.baseAsset, query.asset));
  }

  const whereClause = and(...conditions);

  const rows = await db
    .select({
      date: entries.date,
      operation: entries.operation,
      baseAsset: entries.baseAsset,
      quantity: entries.quantity,
      valuePln: entries.valuePln,
    })
    .from(entries)
    .where(whereClause)
    .orderBy(asc(entries.date));

  const totals = { buyValue: 0, sellValue: 0, pnlValue: 0 };
  const seriesMap = new Map<string, { buyValue: number; sellValue: number }>();
  const holdingsMap = new Map<
    string,
    { buyValue: number; sellValue: number; netQuantity: number }
  >();

  for (const row of rows) {
    const value = toNumber(row.valuePln);
    const quantity = toNumber(row.quantity);
    const dateKey = row.date.toISOString().slice(0, 10);
    const seriesEntry =
      seriesMap.get(dateKey) ?? { buyValue: 0, sellValue: 0 };
    const holdingsEntry = holdingsMap.get(row.baseAsset) ?? {
      buyValue: 0,
      sellValue: 0,
      netQuantity: 0,
    };

    if (row.operation === "BUY") {
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
    holdingsMap.set(row.baseAsset, holdingsEntry);
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

  const assetRows = await db
    .selectDistinct({ baseAsset: entries.baseAsset })
    .from(entries)
    .where(and(eq(entries.userId, userId), isNull(entries.deletedAt)))
    .orderBy(asc(entries.baseAsset));

  return {
    totals,
    series,
    holdings,
    holdingsMix,
    assets: assetRows.map((row) => row.baseAsset),
  };
}
