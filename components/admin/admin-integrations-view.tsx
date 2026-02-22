"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  resetAdminIntegrationPolicyToDefaults,
  runAdminIntegrationSmokeTests,
  setAdminIntegrationPolicyLock,
  unlockAdminIntegrationPolicy,
  type AdminIntegrationOverview,
  type IntegrationSmokeResult,
} from "@/actions/admin-integrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dayjs } from "@/lib/dayjs";
import { formatNumber } from "@/lib/format/numbers";
import type { ProviderType } from "@/lib/integrations/types";

type AdminIntegrationsViewProps = {
  overview: AdminIntegrationOverview;
};

export function AdminIntegrationsView({ overview }: AdminIntegrationsViewProps) {
  const t = useTranslations("admin.integrations");
  const tc = useTranslations("admin.common");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPolicyPending, startPolicyTransition] = useTransition();
  const [results, setResults] = useState<IntegrationSmokeResult[]>([]);
  const [policyType, setPolicyType] = useState<ProviderType>("rate");
  const [policyProvider, setPolicyProvider] = useState("nbp");
  const [policyLocked, setPolicyLocked] = useState(true);

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

  const applyPolicy = () => {
    startPolicyTransition(async () => {
      const response = await setAdminIntegrationPolicyLock({
        countryCode: "PL",
        providerType: policyType,
        providerName: policyProvider,
        locked: policyLocked,
      });

      if (response.status === "success") {
        toast.success(t("policy.updated"));
      } else {
        toast.error(response.message || t("policy.error"));
      }

      router.refresh();
    });
  };

  const unlockPolicy = () => {
    startPolicyTransition(async () => {
      const response = await unlockAdminIntegrationPolicy({
        countryCode: "PL",
        providerType: policyType,
      });

      if (response.status === "success") {
        toast.success(t("policy.unlockSuccess"));
      } else {
        toast.error(response.message || t("policy.error"));
      }

      router.refresh();
    });
  };

  const resetPolicy = () => {
    startPolicyTransition(async () => {
      const response = await resetAdminIntegrationPolicyToDefaults({
        countryCode: "PL",
        providerType: policyType,
      });

      if (response.status === "success") {
        toast.success(t("policy.resetSuccess"));
      } else {
        toast.error(response.message || t("policy.error"));
      }

      router.refresh();
    });
  };

  const providerOptions = policyType === "rate"
    ? [{ value: "nbp", label: "NBP" }]
    : policyType === "tax_validation"
      ? [{ value: "vies", label: "VIES" }]
      : [{ value: "gocardless_bad", label: "GoCardless BAD" }];

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

      <section className="space-y-2 rounded-sm border border-border bg-muted/20 p-4">
        <h3 className="text-sm font-semibold">{t("policy.title")}</h3>
        <p className="text-xs text-muted-foreground">{t("policy.subtitle")}</p>
        <div className="grid gap-2 md:grid-cols-4">
          <select
            value={policyType}
            onChange={(event) => {
              const nextType = event.target.value as ProviderType;
              setPolicyType(nextType);
              if (nextType === "rate") {
                setPolicyProvider("nbp");
              } else if (nextType === "tax_validation") {
                setPolicyProvider("vies");
              } else {
                setPolicyProvider("gocardless_bad");
              }
            }}
            className="h-9 rounded-none border border-border bg-background px-3 text-xs"
          >
            <option value="rate">rate</option>
            <option value="tax_validation">tax_validation</option>
            <option value="bank_import">bank_import</option>
          </select>
          <select
            value={policyProvider}
            onChange={(event) => setPolicyProvider(event.target.value)}
            className="h-9 rounded-none border border-border bg-background px-3 text-xs"
          >
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={policyLocked}
              onChange={(event) => setPolicyLocked(event.target.checked)}
            />
            {t("policy.locked")}
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPolicyPending}
            onClick={applyPolicy}
            className="border-border text-muted-foreground"
          >
            {isPolicyPending ? tc("refreshing") : t("policy.apply")}
          </Button>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPolicyPending}
            onClick={unlockPolicy}
            className="border-border text-muted-foreground"
          >
            {isPolicyPending ? tc("refreshing") : t("policy.unlock")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPolicyPending}
            onClick={resetPolicy}
            className="border-border text-muted-foreground"
          >
            {isPolicyPending ? tc("refreshing") : t("policy.reset")}
          </Button>
        </div>
        <div className="grid gap-2">
          {overview.policyLocks.map((policy) => (
            <div
              key={`${policy.countryCode}-${policy.providerType}-${policy.providerName}`}
              className="flex items-center justify-between rounded-sm border border-border bg-background px-3 py-2 text-xs"
            >
              <span className="text-muted-foreground">
                {policy.countryCode} / {policy.providerType} / {policy.providerName}
              </span>
              <Badge variant={policy.isLocked ? "secondary" : "outline"}>
                {policy.isLocked ? t("policy.lockOn") : t("policy.lockOff")}
              </Badge>
            </div>
          ))}
        </div>
      </section>

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
                <Badge
                  variant={
                    result.status === "ok"
                      ? "secondary"
                      : result.status === "warning"
                        ? "outline"
                        : "destructive"
                  }
                >
                  {result.status === "ok"
                    ? t("smoke.ok")
                    : result.status === "warning"
                      ? t("smoke.warning")
                      : t("smoke.failed")}
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
                  <th className="px-3 py-3 font-medium">{t("tables.rateColumns.attribution")}</th>
                  <th className="px-3 py-3 font-medium">{t("tables.rateColumns.effectiveDate")}</th>
                  <th className="px-3 py-3 font-medium">{t("tables.rateColumns.published")}</th>
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
                    <td className="px-3 py-3 text-muted-foreground">{row.sourceProvider} / {row.method}</td>
                    <td className="px-3 py-3 text-muted-foreground">{dayjs.utc(row.effectiveDate).format("YYYY-MM-DD")}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {row.publishedAt ? dayjs.utc(row.publishedAt).format("YYYY-MM-DD") : tc("dash")}
                    </td>
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
