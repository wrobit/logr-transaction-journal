"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DashboardData } from "@/actions/dashboard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { formatNumber, formatPln } from "@/lib/format/numbers";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "#38BDF8",
  "#A78BFA",
  "#F472B6",
  "#34D399",
  "#FACC15",
  "#FB7185",
];

type DashboardViewProps = {
  data: DashboardData;
  query: DashboardQuery;
};

type TooltipPayload = {
  name?: string;
  value?: number;
  payload?: Record<string, unknown>;
};

export function DashboardView({ data, query }: DashboardViewProps) {
  const router = useRouter();
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
    [router, startTransition],
  );

  const handleRangeChange = useCallback(
    (range: DashboardQuery["range"]) => {
      navigateWithQuery({ ...query, range });
    },
    [navigateWithQuery, query],
  );

  const handleAssetChange = useCallback(
    (asset: string) => {
      navigateWithQuery({
        ...query,
        asset: asset === "all" ? undefined : asset,
      });
    },
    [navigateWithQuery, query],
  );

  const totals = data.totals;
  const hasSeries = data.series.length > 0;
  const hasHoldings = data.holdings.length > 0;
  const hasHoldingsMix = data.holdingsMix.length > 0;
  const axisFormatter = (value: number) =>
    formatNumber(value, { maximumFractionDigits: 0 });
  const dateTickFormatter = (value: string | number) => String(value).slice(5);

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Realized PnL overview with asset-level breakdowns.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPending ? (
            <span className="text-xs text-muted-foreground">Refreshing…</span>
          ) : null}
          <Select value={query.range} onValueChange={handleRangeChange}>
            <SelectTrigger size="sm" className="min-w-[120px]">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent align="end">
              {DASHBOARD_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assetValue} onValueChange={handleAssetChange}>
            <SelectTrigger size="sm" className="min-w-[140px]">
              <SelectValue placeholder="All assets" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All assets</SelectItem>
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
          label="Total buys"
          value={formatPln(totals.buyValue)}
          subtitle="Realized cost"
        />
        <KpiCard
          label="Total sells"
          value={formatPln(totals.sellValue)}
          subtitle="Realized proceeds"
        />
        <KpiCard
          label="Realized PnL"
          value={formatPln(totals.pnlValue)}
          subtitle="Buy vs sell difference"
          highlight={totals.pnlValue >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-12">
        <Card className={cn("md:col-span-8", isPending && "opacity-60")}> 
          <CardHeader className="border-b border-border/60">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              PnL over time
            </div>
          </CardHeader>
          <CardContent className="h-[260px]">
            {hasSeries ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.series} margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis
                    dataKey="date"
                    tickMargin={8}
                    tickFormatter={dateTickFormatter}
                  />
                  <YAxis width={60} tickFormatter={axisFormatter} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="pnlValue"
                    name="PnL"
                    stroke="#38BDF8"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyPanel message="No PnL data for this range." />
            )}
          </CardContent>
        </Card>

        <Card className={cn("md:col-span-4", isPending && "opacity-60")}> 
          <CardHeader className="border-b border-border/60">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Holdings mix
            </div>
          </CardHeader>
          <CardContent className="h-[260px]">
            {hasHoldingsMix ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.holdingsMix}
                    dataKey="value"
                    nameKey="asset"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {data.holdingsMix.map((entry, index) => (
                      <Cell
                        key={entry.asset}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyPanel message="No holdings mix available." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-12">
        <Card className={cn("md:col-span-7", isPending && "opacity-60")}> 
          <CardHeader className="border-b border-border/60">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Buy vs sell volume
            </div>
          </CardHeader>
          <CardContent className="h-[240px]">
            {hasSeries ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.series} margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis
                    dataKey="date"
                    tickMargin={8}
                    tickFormatter={dateTickFormatter}
                  />
                  <YAxis width={60} tickFormatter={axisFormatter} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="buyValue"
                    name="Buy"
                    stackId="a"
                    fill="#34D399"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="sellValue"
                    name="Sell"
                    stackId="a"
                    fill="#F472B6"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyPanel message="No volume data for this range." />
            )}
          </CardContent>
        </Card>

        <Card className={cn("md:col-span-5", isPending && "opacity-60")}> 
          <CardHeader className="border-b border-border/60">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Holdings by asset
            </div>
          </CardHeader>
          <CardContent>
            {hasHoldings ? (
              <div className="max-h-[240px] overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-2">Asset</th>
                      <th className="py-2 pr-2">Net qty</th>
                      <th className="py-2 pr-2">Buy PLN</th>
                      <th className="py-2">PnL PLN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.holdings.map((holding) => (
                      <tr key={holding.asset}>
                        <td className="py-2 pr-2 text-muted-foreground">
                          {holding.asset}
                        </td>
                        <td className="py-2 pr-2">
                          {formatNumber(holding.netQuantity, {
                            maximumFractionDigits: 6,
                          })}
                        </td>
                        <td className="py-2 pr-2">
                          {formatPln(holding.buyValue)}
                        </td>
                        <td
                          className={cn(
                            "py-2",
                            holding.pnlValue >= 0
                              ? "text-emerald-300"
                              : "text-red-300",
                          )}
                        >
                          {formatPln(holding.pnlValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyPanel message="No holdings yet." />
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
  subtitle,
  highlight,
}: {
  label: string;
  value: string;
  subtitle: string;
  highlight?: "positive" | "negative";
}) {
  return (
    <Card className="bg-muted/20">
      <CardHeader className="border-b border-border/60">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div
          className={cn(
            "text-lg font-semibold",
            highlight === "positive" && "text-emerald-300",
            highlight === "negative" && "text-red-300",
          )}
        >
          {value}
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

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const payloadLabel = payload[0]?.payload?.asset;
  const title =
    typeof payloadLabel === "string"
      ? payloadLabel
      : label
        ? String(label)
        : "";

  return (
    <div className="rounded-sm border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      {title ? (
        <div className="text-[11px] uppercase text-muted-foreground">
          {title}
        </div>
      ) : null}
      <div className="mt-1 space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{item.name}</span>
            <span className="font-medium">
              {formatPln(Number(item.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
