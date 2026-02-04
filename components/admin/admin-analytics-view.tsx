"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";

import type { AdminAnalyticsData } from "@/actions/admin-analytics";
import {
  buildAdminAnalyticsQueryParams,
  type AdminAnalyticsQuery,
  ADMIN_ANALYTICS_RANGE_OPTIONS,
} from "@/lib/admin/analytics-query";
import { dayjs } from "@/lib/dayjs";
import { formatNumber } from "@/lib/format/numbers";
import { cn } from "@/lib/utils";
import { feedbackOptions } from "@/lib/profile/feedback";
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

const FEEDBACK_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

const registrationChartConfig = {
  registrations: { label: "Registrations", color: "var(--chart-1)" },
} satisfies ChartConfig;

const activeChartConfig = {
  activeUsers: { label: "Active logins", color: "var(--chart-2)" },
} satisfies ChartConfig;

const entriesChartConfig = {
  entries: { label: "Entries", color: "var(--chart-4)" },
} satisfies ChartConfig;

const feedbackChartConfig = {
  feedbacks: { label: "Feedback", color: "var(--chart-5)" },
} satisfies ChartConfig;

type AdminAnalyticsViewProps = {
  data: AdminAnalyticsData;
  query: AdminAnalyticsQuery;
};

export function AdminAnalyticsView({ data, query }: AdminAnalyticsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigateWithQuery = useCallback(
    (nextQuery: AdminAnalyticsQuery) => {
      const params = buildAdminAnalyticsQueryParams(nextQuery);
      const queryString = params.toString();
      const href = queryString ? `/admin?${queryString}` : "/admin";
      startTransition(() => router.push(href));
    },
    [router, startTransition],
  );

  const handleRangeChange = useCallback(
    (range: AdminAnalyticsQuery["range"]) => {
      navigateWithQuery({ ...query, range });
    },
    [navigateWithQuery, query],
  );

  const feedbackReasonConfig = useMemo(() => {
    return data.feedbackReasons.reduce<ChartConfig>((config, item, index) => {
      const label = feedbackOptions.find((option) => option.value === item.reason)?.label ?? item.reason;
      config[item.reason] = {
        label,
        color: FEEDBACK_COLORS[index % FEEDBACK_COLORS.length],
      };
      return config;
    }, {});
  }, [data.feedbackReasons]);

  const feedbackReasonData = useMemo(
    () =>
      data.feedbackReasons.map((item) => ({
        ...item,
        fill: `var(--color-${item.reason})`,
      })),
    [data.feedbackReasons],
  );

  const axisFormatter = (value: number) => formatNumber(value, { maximumFractionDigits: 0 });
  const dateTickFormatter = (value: string | number) => dayjs(value).format("MM-DD");
  const hasSeries = data.series.length > 0;

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Overview</h2>
          <p className="text-sm text-muted-foreground">
            User activity and operational signals by selected range.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPending ? <span className="text-xs text-muted-foreground">Refreshing…</span> : null}
          <Select value={query.range} onValueChange={handleRangeChange}>
            <SelectTrigger size="sm" className="min-w-[120px]">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent align="end">
              {ADMIN_ANALYTICS_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="New users" value={formatNumber(data.totals.registrations)} />
        <KpiCard label="Active logins" value={formatNumber(data.totals.activeUsers)} />
        <KpiCard label="Entries" value={formatNumber(data.totals.entries)} />
        <KpiCard label="Feedback" value={formatNumber(data.totals.feedbacks)} />
      </div>

      <div className="grid gap-3 md:grid-cols-12">
        <Card className={cn("md:col-span-8", isPending && "opacity-60")}>
          <CardHeader className="border-b border-border/60">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Registrations over time
            </div>
          </CardHeader>
          <CardContent className="h-[240px]">
            {hasSeries ? (
              <ChartContainer config={registrationChartConfig} className="h-full w-full min-h-[180px]">
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
                  <ChartTooltip content={<ChartTooltipContent valueFormatter={formatNumber} />} />
                  <Line
                    type="monotone"
                    dataKey="registrations"
                    name="Registrations"
                    stroke="var(--color-registrations)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <EmptyPanel message="No registration data for this range." />
            )}
          </CardContent>
        </Card>

        <Card className={cn("md:col-span-4", isPending && "opacity-60")}>
          <CardHeader className="border-b border-border/60">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Feedback by reason
            </div>
          </CardHeader>
          <CardContent className="h-[240px]">
            {data.feedbackReasons.length > 0 ? (
              <ChartContainer config={feedbackReasonConfig} className="h-full w-full min-h-[180px]">
                <PieChart>
                  <Pie
                    data={feedbackReasonData}
                    dataKey="count"
                    nameKey="reason"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="reason" valueFormatter={formatNumber} />}
                  />
                  <ChartLegend content={<ChartLegendContent nameKey="reason" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <EmptyPanel message="No feedback captured yet." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-12">
        <Card className={cn("md:col-span-6", isPending && "opacity-60")}>
          <CardHeader className="border-b border-border/60">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Active logins
            </div>
          </CardHeader>
          <CardContent className="h-[220px]">
            {hasSeries ? (
              <ChartContainer config={activeChartConfig} className="h-full w-full min-h-[160px]">
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
                  <ChartTooltip content={<ChartTooltipContent valueFormatter={formatNumber} />} />
                  <Line
                    type="monotone"
                    dataKey="activeUsers"
                    name="Active logins"
                    stroke="var(--color-activeUsers)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <EmptyPanel message="No login activity for this range." />
            )}
          </CardContent>
        </Card>

        <Card className={cn("md:col-span-6", isPending && "opacity-60")}>
          <CardHeader className="border-b border-border/60">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Entry creation
            </div>
          </CardHeader>
          <CardContent className="h-[220px]">
            {hasSeries ? (
              <ChartContainer config={entriesChartConfig} className="h-full w-full min-h-[160px]">
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
                  <ChartTooltip content={<ChartTooltipContent valueFormatter={formatNumber} />} />
                  <Bar
                    dataKey="entries"
                    name="Entries"
                    fill="var(--color-entries)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyPanel message="No entries created in this range." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={cn(isPending && "opacity-60")}>
        <CardHeader className="border-b border-border/60">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Feedback volume
          </div>
        </CardHeader>
        <CardContent className="h-[240px]">
          {hasSeries ? (
            <ChartContainer config={feedbackChartConfig} className="h-full w-full min-h-[180px]">
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
                <ChartTooltip content={<ChartTooltipContent valueFormatter={formatNumber} />} />
                <Line
                  type="monotone"
                  dataKey="feedbacks"
                  name="Feedback"
                  stroke="var(--color-feedbacks)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <EmptyPanel message="No feedback submitted in this range." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-muted/20">
      <CardHeader className="border-b border-border/60">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      </CardHeader>
      <CardContent className="text-lg font-semibold">{value}</CardContent>
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
