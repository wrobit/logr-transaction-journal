"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { runAdminIntegrationSmokeTests, type AdminIntegrationOverview, type IntegrationSmokeResult } from "@/actions/admin-integrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dayjs } from "@/lib/dayjs";
import { formatNumber } from "@/lib/format/numbers";

type AdminIntegrationsViewProps = {
  overview: AdminIntegrationOverview;
};

export function AdminIntegrationsView({ overview }: AdminIntegrationsViewProps) {
  const t = useTranslations("admin.integrations");
  const tc = useTranslations("admin.common");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<IntegrationSmokeResult[]>([]);

  const hasResults = results.length > 0;

  const runSmokeTests = () => {
    startTransition(async () => {
      const response = await runAdminIntegrationSmokeTests();
      setResults(response.results);

      if (response.status === "success") {
        toast.success(t("smoke.success"));
      } else {
        toast.error(t("smoke.error"));
      }

      router.refresh();
    });
  };

  const summary = useMemo(
    () => ({
      fxRates: overview.fxRates.length,
      taxChecks: overview.taxValidations.length,
    }),
    [overview.fxRates.length, overview.taxValidations.length],
  );

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-border text-muted-foreground"
          disabled={isPending}
          onClick={runSmokeTests}
        >
          {isPending ? tc("refreshing") : t("smoke.run")}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SummaryCard label={t("summary.fxRates")} value={formatNumber(summary.fxRates, undefined, locale)} />
        <SummaryCard label={t("summary.taxChecks")} value={formatNumber(summary.taxChecks, undefined, locale)} />
      </div>

      {hasResults ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("smoke.resultsTitle")}</h3>
          <div className="grid gap-2">
            {results.map((result) => (
              <div
                key={result.key}
                className="flex items-center justify-between gap-3 rounded-sm border border-border bg-muted/20 px-3 py-2 text-xs"
              >
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{result.key}</p>
                  <p className="text-muted-foreground">{result.details}</p>
                </div>
                <Badge variant={result.status === "ok" ? "secondary" : "destructive"}>
                  {result.status === "ok" ? t("smoke.ok") : t("smoke.failed")}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t("tables.ratesTitle")}</h3>
        {overview.fxRates.length === 0 ? (
          <EmptyState message={t("tables.emptyRates")} />
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="min-w-[860px] w-full border-collapse text-left text-xs text-foreground">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 font-medium">{t("tables.rateColumns.pair")}</th>
                  <th className="px-3 py-3 font-medium">{t("tables.rateColumns.value")}</th>
                  <th className="px-3 py-3 font-medium">{t("tables.rateColumns.provider")}</th>
                  <th className="px-3 py-3 font-medium">{t("tables.rateColumns.effectiveDate")}</th>
                  <th className="px-3 py-3 font-medium">{t("tables.rateColumns.type")}</th>
                  <th className="px-3 py-3 font-medium">{t("tables.rateColumns.method")}</th>
                  <th className="px-3 py-3 font-medium">{t("tables.rateColumns.retrieved")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {overview.fxRates.map((row) => (
                  <tr key={row.id} className="bg-background">
                    <td className="px-3 py-3">{row.baseCurrency}/{row.quoteCurrency}</td>
                    <td className="px-3 py-3 text-muted-foreground">{formatNumber(Number(row.rateValue), { maximumFractionDigits: 8 }, locale)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{row.sourceProvider}</td>
                    <td className="px-3 py-3 text-muted-foreground">{dayjs.utc(row.effectiveDate).format("YYYY-MM-DD")}</td>
                    <td className="px-3 py-3 text-muted-foreground">{row.rateType}</td>
                    <td className="px-3 py-3 text-muted-foreground">{row.method}</td>
                    <td className="px-3 py-3 text-muted-foreground">{dayjs.utc(row.retrievedAt).format("YYYY-MM-DD HH:mm")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t("tables.taxTitle")}</h3>
        {overview.taxValidations.length === 0 ? (
          <EmptyState message={t("tables.emptyTax")} />
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="min-w-[760px] w-full border-collapse text-left text-xs text-foreground">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 font-medium">{t("tables.taxColumns.country")}</th>
                  <th className="px-3 py-3 font-medium">{t("tables.taxColumns.idType")}</th>
                  <th className="px-3 py-3 font-medium">{t("tables.taxColumns.masked")}</th>
                  <th className="px-3 py-3 font-medium">{t("tables.taxColumns.result")}</th>
                  <th className="px-3 py-3 font-medium">{t("tables.taxColumns.provider")}</th>
                  <th className="px-3 py-3 font-medium">{t("tables.taxColumns.checked")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {overview.taxValidations.map((row) => (
                  <tr key={row.id} className="bg-background">
                    <td className="px-3 py-3">{row.countryCode}</td>
                    <td className="px-3 py-3 text-muted-foreground">{row.idType}</td>
                    <td className="px-3 py-3 text-muted-foreground">{row.maskedValue}</td>
                    <td className="px-3 py-3">
                      <Badge variant={row.result === "valid" ? "secondary" : "outline"}>{row.result}</Badge>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{row.providerName}</td>
                    <td className="px-3 py-3 text-muted-foreground">{dayjs.utc(row.checkedAt).format("YYYY-MM-DD HH:mm")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-muted/20 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-sm border border-border bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}
