"use server";

import { desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { fxProviderRates, taxValidationLogs } from "@/lib/db/schema";
import { dayjs } from "@/lib/dayjs";
import { getAdminSession } from "@/lib/auth/admin";
import { getInternationalRate } from "@/lib/integrations/rates-service";
import { validateTaxIdentifier } from "@/lib/integrations/tax-validation-service";

const DEFAULT_LIMIT = 50;

export type AdminIntegrationOverview = {
  fxRates: Array<{
    id: string;
    baseCurrency: string;
    quoteCurrency: string;
    rateValue: string;
    sourceProvider: string;
    effectiveDate: Date;
    rateType: string;
    method: string;
    retrievedAt: Date;
  }>;
  taxValidations: Array<{
    id: string;
    countryCode: string;
    idType: string;
    maskedValue: string;
    result: string;
    providerName: string;
    checkedAt: Date;
  }>;
};

export type IntegrationSmokeResult = {
  key: string;
  status: "ok" | "error";
  details: string;
};

export async function getAdminIntegrationOverview(
  limit = DEFAULT_LIMIT,
): Promise<AdminIntegrationOverview> {
  const session = await getAdminSession();

  if (!session) {
    return { fxRates: [], taxValidations: [] };
  }

  const [fxRates, taxValidations] = await Promise.all([
    db
      .select({
        id: fxProviderRates.id,
        baseCurrency: fxProviderRates.baseCurrency,
        quoteCurrency: fxProviderRates.quoteCurrency,
        rateValue: fxProviderRates.rateValue,
        sourceProvider: fxProviderRates.sourceProvider,
        effectiveDate: fxProviderRates.effectiveDate,
        rateType: fxProviderRates.rateType,
        method: fxProviderRates.method,
        retrievedAt: fxProviderRates.retrievedAt,
      })
      .from(fxProviderRates)
      .orderBy(desc(fxProviderRates.retrievedAt))
      .limit(limit),
    db
      .select({
        id: taxValidationLogs.id,
        countryCode: taxValidationLogs.countryCode,
        idType: taxValidationLogs.idType,
        maskedValue: taxValidationLogs.maskedValue,
        result: taxValidationLogs.result,
        providerName: taxValidationLogs.providerName,
        checkedAt: taxValidationLogs.checkedAt,
      })
      .from(taxValidationLogs)
      .orderBy(desc(taxValidationLogs.checkedAt))
      .limit(limit),
  ]);

  return { fxRates, taxValidations };
}

export async function runAdminIntegrationSmokeTests(): Promise<{
  status: "success" | "error";
  results: IntegrationSmokeResult[];
}> {
  const session = await getAdminSession();

  if (!session) {
    return {
      status: "error",
      results: [{ key: "auth", status: "error", details: "Unauthorized." }],
    };
  }

  const stableDate = dayjs.utc().subtract(3, "day").format("YYYY-MM-DD");

  const tests: Array<{ key: string; run: () => Promise<string> }> = [
    {
      key: "ecb-eur-pln",
      run: async () => {
        const rate = await getInternationalRate({
          countryCode: "DE",
          baseCurrency: "EUR",
          quoteCurrency: "PLN",
          effectiveDate: stableDate,
          rateType: "historical",
        });

        return `${rate.provider} ${rate.baseCurrency}/${rate.quoteCurrency}=${rate.rateValue.toFixed(6)}`;
      },
    },
    {
      key: "hmrc-usd-gbp",
      run: async () => {
        const rate = await getInternationalRate({
          countryCode: "GB",
          baseCurrency: "USD",
          quoteCurrency: "GBP",
          effectiveDate: stableDate,
          rateType: "monthly",
        });

        return `${rate.provider} ${rate.baseCurrency}/${rate.quoteCurrency}=${rate.rateValue.toFixed(6)}`;
      },
    },
    {
      key: "vies-vat-check",
      run: async () => {
        const validation = await validateTaxIdentifier({
          countryCode: "DE",
          idType: "vat",
          value: "DE123456789",
        });

        return `${validation.provider} ${validation.status}`;
      },
    },
  ];

  const settled = await Promise.allSettled(
    tests.map(async (test) => {
      const details = await test.run();
      return { key: test.key, status: "ok" as const, details };
    }),
  );

  const results: IntegrationSmokeResult[] = settled.map((item, index) => {
    if (item.status === "fulfilled") {
      return item.value;
    }

    const message = item.reason instanceof Error ? item.reason.message : "Unknown failure";
    return {
      key: tests[index]?.key ?? `test-${index + 1}`,
      status: "error",
      details: message,
    };
  });

  return {
    status: results.some((result) => result.status === "error") ? "error" : "success",
    results,
  };
}
