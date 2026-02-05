"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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
  const locale = useLocale();
  const t = useTranslations("admin.analytics");
  const tr = useTranslations("profile.deleteDialog.reasons");
  const tc = useTranslations("admin.common");
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
      const label = tr(item.reason) ?? item.reason;
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

  const axisFormatter = (value: number) =>
    formatNumber(value, { maximumFractionDigits: 0 }, locale);
  const dateTickFormatter = (value: string | number) => dayjs(value).format("MM-DD");
  const hasSeries = data.series.length > 0;

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPending ? <span className="text-xs text-muted-foreground">{tc("refreshing")}</span> : null}
          <Select value={query.range} onValueChange={handleRangeChange}>
            <SelectTrigger size="sm" className="min-w-[120px]">
              <SelectValue placeholder={t("range")} />
            </SelectTrigger>
            <SelectContent align="end">
              {ADMIN_ANALYTICS_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(`ranges.${option.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label={t("kpi.newUsers")} value={formatNumber(data.totals.registrations, undefined, locale)} />
        <KpiCard label={t("kpi.activeLogins")} value={formatNumber(data.totals.activeUsers, undefined, locale)} />
        <KpiCard label={t("kpi.entries")} value={formatNumber(data.totals.entries, undefined, locale)} />
        <KpiCard label={t("kpi.feedback")} value={formatNumber(data.totals.feedbacks, undefined, locale)} />
      </div>

      <div className="grid gap-3 md:grid-cols-12">
        <Card className={cn("md:col-span-8", isPending && "opacity-60")}>
          <CardHeader className="border-b border-border/60">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("panels.registrationsOverTime")}
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
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(value) =>
                          formatNumber(Number(value), undefined, locale)
                        }
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="registrations"
                    name={t("panels.registrationsOverTime")}
                    stroke="var(--color-registrations)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <EmptyPanel message={t("empty.registrations")} />
            )}
          </CardContent>
        </Card>

        <Card className={cn("md:col-span-4", isPending && "opacity-60")}>
          <CardHeader className="border-b border-border/60">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("panels.feedbackByReason")}
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
                    content={
                      <ChartTooltipContent
                        nameKey="reason"
                        valueFormatter={(value) => formatNumber(Number(value), undefined, locale)}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent nameKey="reason" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <EmptyPanel message={t("empty.feedbackReasons")} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-12">
        <Card className={cn("md:col-span-6", isPending && "opacity-60")}>
          <CardHeader className="border-b border-border/60">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("panels.activeLogins")}
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
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(value) => formatNumber(Number(value), undefined, locale)}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="activeUsers"
                    name={t("panels.activeLogins")}
                    stroke="var(--color-activeUsers)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <EmptyPanel message={t("empty.activeLogins")} />
            )}
          </CardContent>
        </Card>

        <Card className={cn("md:col-span-6", isPending && "opacity-60")}>
          <CardHeader className="border-b border-border/60">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("panels.entryCreation")}
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
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(value) => formatNumber(Number(value), undefined, locale)}
                      />
                    }
                  />
                  <Bar
                    dataKey="entries"
                    name={t("kpi.entries")}
                    fill="var(--color-entries)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyPanel message={t("empty.entries")} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={cn(isPending && "opacity-60")}>
        <CardHeader className="border-b border-border/60">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t("panels.feedbackVolume")}
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
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      valueFormatter={(value) => formatNumber(Number(value), undefined, locale)}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="feedbacks"
                  name={t("kpi.feedback")}
                  stroke="var(--color-feedbacks)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <EmptyPanel message={t("empty.feedbackVolume")} />
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
