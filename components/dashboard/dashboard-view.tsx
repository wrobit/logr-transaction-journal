"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import type { DashboardData } from "@/actions/dashboard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildDashboardQueryParams,
  DASHBOARD_RANGE_OPTIONS,
  type DashboardQuery,
} from "@/lib/dashboard/query";
import { dayjs } from "@/lib/dayjs";
import { formatCurrency, formatNumber } from "@/lib/format/numbers";
import { cn } from "@/lib/utils";

const HOLDINGS_MIX_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const pnlChartConfig = {
  pnlValue: { label: "PnL", color: "var(--chart-1)" },
} satisfies ChartConfig;

const volumeChartConfig = {
  buyValue: { label: "Buy", color: "var(--chart-2)" },
  sellValue: { label: "Sell", color: "var(--chart-4)" },
} satisfies ChartConfig;

type DashboardViewProps = {
  data: DashboardData;
  query: DashboardQuery;
};

export function DashboardView({ data, query }: DashboardViewProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const [isPending, startTransition] = useTransition();

  const assets = useMemo(() => data.assets, [data.assets]);
  const assetValue = query.asset ?? "all";

  const navigateWithQuery = useCallback(
    (nextQuery: DashboardQuery) => {
      const params = buildDashboardQueryParams(nextQuery);
      const queryString = params.toString();
      const href = queryString ? `/dashboard?${queryString}` : "/dashboard";
      startTransition(() => router.push(href));
    },
    [router, startTransition]
  );

  const handleRangeChange = useCallback(
    (range: DashboardQuery["range"]) => {
      navigateWithQuery({ ...query, range });
    },
    [navigateWithQuery, query]
  );

  const handleAssetChange = useCallback(
    (asset: string) => {
      navigateWithQuery({
        ...query,
        asset: asset === "all" ? undefined : asset,
      });
    },
    [navigateWithQuery, query]
  );

  const totals = data.totals;
  const hasSeries = data.series.length > 0;
  const hasHoldings = data.holdings.length > 0;
  const hasHoldingsMix = data.holdingsMix.length > 0;
  const axisFormatter = (value: number) =>
    formatNumber(value, { maximumFractionDigits: 0 }, locale);
  const dateTickFormatter = (value: string | number) =>
    dayjs(value).format("MM-DD");
  const pnlPercent = totals.buyValue ? (totals.pnlValue / totals.buyValue) * 100 : null;
  const pnlPercentLabel = pnlPercent === null
    ? "—"
    : `${pnlPercent > 0 ? "+" : ""}${formatNumber(pnlPercent, {
        maximumFractionDigits: 1,
      }, locale)}%`;
  const holdingsMixConfig = useMemo(
    () =>
      data.holdingsMix.reduce<ChartConfig>((config, entry, index) => {
        config[entry.asset] = {
          label: entry.asset,
          color: HOLDINGS_MIX_COLORS[index % HOLDINGS_MIX_COLORS.length],
        };
        return config;
      }, {}),
    [data.holdingsMix]
  );
  const holdingsMixChartData = useMemo(
    () =>
      data.holdingsMix.map((entry) => ({
        ...entry,
        fill: `var(--color-${entry.asset})`,
      })),
    [data.holdingsMix]
  );

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPending ? <span className="text-xs text-muted-foreground">{t("refreshing")}</span> : null}
          <Select value={query.range} onValueChange={handleRangeChange}>
            <SelectTrigger size="sm" className="min-w-[120px]">
              <SelectValue placeholder={t("range")} />
            </SelectTrigger>
            <SelectContent align="end">
              {DASHBOARD_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(`ranges.${option.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assetValue} onValueChange={handleAssetChange}>
            <SelectTrigger size="sm" className="min-w-[140px]">
              <SelectValue placeholder={t("allAssets")} />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">{t("allAssets")}</SelectItem>
              {assets.map((asset) => (
                <SelectItem key={asset} value={asset}>
                  {asset}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard
          label={t("kpi.totalBuys")}
          value={formatCurrency(totals.buyValue, data.displayCurrency, locale)}
          subtitle={t("kpi.realizedCost")}
        />
        <KpiCard
          label={t("kpi.totalSells")}
          value={formatCurrency(totals.sellValue, data.displayCurrency, locale)}
          subtitle={t("kpi.realizedProceeds")}
        />
        <KpiCard
          label={t("kpi.realizedPnl")}
          value={formatCurrency(totals.pnlValue, data.displayCurrency, locale)}
          secondaryValue={pnlPercentLabel}
          subtitle={t("kpi.difference")}
          highlight={totals.pnlValue >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-12">
        <Card className={cn("md:col-span-8", isPending && "opacity-60")}>
          <CardHeader className="border-b border-border/60">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("panels.pnlOverTime")}
            </div>
          </CardHeader>
          <CardContent className="h-[260px]">
            {hasSeries ? (
              <ChartContainer config={pnlChartConfig} className="h-full w-full min-h-[200px]">
                <LineChart data={data.series} margin={{ left: 8, right: 12 }} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickMargin={8}
                    tickFormatter={dateTickFormatter}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    width={60}
                    tickFormatter={axisFormatter}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(value) =>
                          formatCurrency(Number(value), data.displayCurrency, locale)
                        }
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="pnlValue"
                    name="PnL"
                    stroke="var(--color-pnlValue)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
                <EmptyPanel message={t("empty.pnl")} />
            )}
          </CardContent>
        </Card>

        <Card className={cn("md:col-span-4", isPending && "opacity-60")}>
          <CardHeader className="border-b border-border/60">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("panels.holdingsMix")}
            </div>
          </CardHeader>
          <CardContent className="h-[260px]">
            {hasHoldingsMix ? (
              <ChartContainer config={holdingsMixConfig} className="h-full w-full min-h-[200px]">
                <PieChart>
                  <Pie
                    data={holdingsMixChartData}
                    dataKey="value"
                    nameKey="asset"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="asset"
                        hideLabel
                        valueFormatter={(value) =>
                          formatCurrency(Number(value), data.displayCurrency, locale)
                        }
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent nameKey="asset" />} />
                </PieChart>
              </ChartContainer>
            ) : (
                <EmptyPanel message={t("empty.holdingsMix")} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-12">
        <Card className={cn("md:col-span-7", isPending && "opacity-60")}>
          <CardHeader className="border-b border-border/60">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("panels.buyVsSellVolume")}
            </div>
          </CardHeader>
          <CardContent className="h-[240px]">
            {hasSeries ? (
              <ChartContainer config={volumeChartConfig} className="h-full w-full min-h-[180px]">
                <BarChart data={data.series} margin={{ left: 8, right: 12 }} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickMargin={8}
                    tickFormatter={dateTickFormatter}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    width={60}
                    tickFormatter={axisFormatter}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(value) =>
                          formatCurrency(Number(value), data.displayCurrency, locale)
                        }
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="buyValue"
                    name="Buy"
                    stackId="a"
                    fill="var(--color-buyValue)"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="sellValue"
                    name="Sell"
                    stackId="a"
                    fill="var(--color-sellValue)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
                <EmptyPanel message={t("empty.volume")} />
            )}
          </CardContent>
        </Card>

        <Card className={cn("md:col-span-5", isPending && "opacity-60")}>
          <CardHeader className="border-b border-border/60">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("panels.holdingsByAsset")}
            </div>
          </CardHeader>
          <CardContent>
            {hasHoldings ? (
              <div className="max-h-[240px] overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-2">{t("holdingsTable.asset")}</th>
                      <th className="py-2 pr-2">{t("holdingsTable.netQty")}</th>
                      <th className="py-2 pr-2">
                        {t("holdingsTable.buyPln", { currency: data.displayCurrency })}
                      </th>
                      <th className="py-2">
                        {t("holdingsTable.pnlPln", { currency: data.displayCurrency })}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.holdings.map((holding) => (
                      <tr key={holding.asset}>
                        <td className="py-2 pr-2 text-muted-foreground">{holding.asset}</td>
                        <td className="py-2 pr-2">
                          {formatNumber(holding.netQuantity, {
                            maximumFractionDigits: 6,
                          }, locale)}
                        </td>
                        <td className="py-2 pr-2">
                          {formatCurrency(holding.buyValue, data.displayCurrency, locale)}
                        </td>
                        <td
                          className={cn(
                            "py-2",
                            holding.pnlValue >= 0 ? "text-emerald-300" : "text-red-300"
                          )}
                        >
                          {formatCurrency(holding.pnlValue, data.displayCurrency, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
                <EmptyPanel message={t("empty.holdings")} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-12">
        <Card className={cn("md:col-span-12", isPending && "opacity-60")}>
          <CardHeader className="border-b border-border/60">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("panels.buyVsSellByAsset")}
            </div>
          </CardHeader>
          <CardContent className="h-[260px]">
            {hasHoldings ? (
              <ChartContainer config={volumeChartConfig} className="h-full w-full min-h-[200px]">
                <BarChart
                  data={data.holdings}
                  margin={{ left: 8, right: 12 }}
                  accessibilityLayer
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="asset" tickMargin={8} axisLine={false} tickLine={false} />
                  <YAxis
                    width={60}
                    tickFormatter={axisFormatter}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(value) =>
                          formatCurrency(Number(value), data.displayCurrency, locale)
                        }
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="buyValue"
                    name="Buy"
                    fill="var(--color-buyValue)"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="sellValue"
                    name="Sell"
                    fill="var(--color-sellValue)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
                <EmptyPanel message={t("empty.assetVolume")} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  secondaryValue,
  subtitle,
  highlight,
}: {
  label: string;
  value: string;
  secondaryValue?: string;
  subtitle: string;
  highlight?: "positive" | "negative";
}) {
  const highlightClassName =
    highlight === "positive"
      ? "text-emerald-300"
      : highlight === "negative"
        ? "text-red-300"
        : undefined;

  return (
    <Card className="bg-muted/20">
      <CardHeader className="border-b border-border/60">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div
          className={cn(
            "text-lg font-semibold flex items-baseline gap-2",
            highlightClassName
          )}
        >
          <span>{value}</span>
          {secondaryValue ? (
            <span className="text-xs font-medium opacity-80">{secondaryValue}</span>
          ) : null}
        </div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}
