"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { countryIntegrationPolicies, fxProviderRates, taxValidationLogs } from "@/lib/db/schema";
import { dayjs } from "@/lib/dayjs";
import { getAdminSession } from "@/lib/auth/admin";
import { getInternationalRate } from "@/lib/integrations/rates-service";
import { validateTaxIdentifier } from "@/lib/integrations/tax-validation-service";
import { POLICY_LOCK_PROVIDER } from "@/lib/integrations/policy";
import {
  BANK_IMPORT_PROVIDERS,
  RATE_PROVIDERS,
  TAX_VALIDATION_PROVIDERS,
  type ProviderType,
} from "@/lib/integrations/types";

const DEFAULT_LIMIT = 50;

export type AdminIntegrationOverview = {
  fxRates: Array<{
    id: string;
    baseCurrency: string;
    quoteCurrency: string;
    rateValue: string;
    sourceProvider: string;
    effectiveDate: Date;
    publishedAt: Date | null;
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
  policyLocks: Array<{
    countryCode: string;
    providerType: ProviderType;
    providerName: string;
    isLocked: boolean;
  }>;
};

export type IntegrationSmokeResult = {
  key: string;
  status: "ok" | "warning" | "error";
  details: string;
};

export async function getAdminIntegrationOverview(
  limit = DEFAULT_LIMIT,
): Promise<AdminIntegrationOverview> {
  const session = await getAdminSession();

  if (!session) {
    return { fxRates: [], taxValidations: [], policyLocks: [] };
  }

  const [fxRates, taxValidations, policyRows] = await Promise.all([
    db
      .select({
        id: fxProviderRates.id,
        baseCurrency: fxProviderRates.baseCurrency,
        quoteCurrency: fxProviderRates.quoteCurrency,
        rateValue: fxProviderRates.rateValue,
        sourceProvider: fxProviderRates.sourceProvider,
        effectiveDate: fxProviderRates.effectiveDate,
        publishedAt: fxProviderRates.publishedAt,
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
    db
      .select({
        countryCode: countryIntegrationPolicies.countryCode,
        providerType: countryIntegrationPolicies.providerType,
        providerName: countryIntegrationPolicies.providerName,
        isActive: countryIntegrationPolicies.isActive,
      })
      .from(countryIntegrationPolicies)
      .where(eq(countryIntegrationPolicies.countryCode, "PL"))
      .orderBy(desc(countryIntegrationPolicies.updatedAt)),
  ]);

  const lockLookup = new Set(
    policyRows
      .filter((row) => row.providerName === POLICY_LOCK_PROVIDER && row.isActive)
      .map((row) => `${row.countryCode}:${row.providerType}`),
  );

  const policyLocks = policyRows
    .filter((row) => row.providerName !== POLICY_LOCK_PROVIDER && row.isActive)
    .map((row) => ({
      countryCode: row.countryCode,
      providerType: row.providerType,
      providerName: row.providerName,
      isLocked: lockLookup.has(`${row.countryCode}:${row.providerType}`),
    }));

  return { fxRates, taxValidations, policyLocks };
}

export async function setAdminIntegrationPolicyLock(input: {
  countryCode: string;
  providerType: ProviderType;
  providerName: string;
  locked: boolean;
}) {
  const session = await getAdminSession();

  if (!session) {
    return { status: "error" as const, message: "Unauthorized." };
  }

  const countryCode = input.countryCode.toUpperCase();
  const providerType = input.providerType;
  const providerName = input.providerName;

  if (countryCode !== "PL") {
    return { status: "error" as const, message: "Only PL policy controls are supported." };
  }

  const providerAllowed =
    (providerType === "rate" && RATE_PROVIDERS.includes(providerName as (typeof RATE_PROVIDERS)[number])) ||
    (providerType === "tax_validation" &&
      TAX_VALIDATION_PROVIDERS.includes(providerName as (typeof TAX_VALIDATION_PROVIDERS)[number])) ||
    (providerType === "bank_import" &&
      BANK_IMPORT_PROVIDERS.includes(providerName as (typeof BANK_IMPORT_PROVIDERS)[number]));

  if (!providerAllowed) {
    return { status: "error" as const, message: "Provider is not allowed for the selected type." };
  }

  await db
    .update(countryIntegrationPolicies)
    .set({ isActive: false })
    .where(
      and(
        eq(countryIntegrationPolicies.countryCode, countryCode),
        eq(countryIntegrationPolicies.providerType, providerType),
      ),
    );

  await db
    .insert(countryIntegrationPolicies)
    .values({
      countryCode,
      providerType,
      providerName,
      priority: 1,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: [
        countryIntegrationPolicies.countryCode,
        countryIntegrationPolicies.providerType,
        countryIntegrationPolicies.providerName,
      ],
      set: {
        isActive: true,
        priority: 1,
      },
    });

  await db
    .insert(countryIntegrationPolicies)
    .values({
      countryCode,
      providerType,
      providerName: POLICY_LOCK_PROVIDER,
      priority: 0,
      isActive: input.locked,
    })
    .onConflictDoUpdate({
      target: [
        countryIntegrationPolicies.countryCode,
        countryIntegrationPolicies.providerType,
        countryIntegrationPolicies.providerName,
      ],
      set: {
        isActive: input.locked,
        priority: 0,
      },
    });

  revalidatePath("/admin/integrations");

  return { status: "success" as const };
}

export async function unlockAdminIntegrationPolicy(input: {
  countryCode: string;
  providerType: ProviderType;
}) {
  const session = await getAdminSession();

  if (!session) {
    return { status: "error" as const, message: "Unauthorized." };
  }

  const countryCode = input.countryCode.toUpperCase();
  if (countryCode !== "PL") {
    return { status: "error" as const, message: "Only PL policy controls are supported." };
  }

  await db
    .update(countryIntegrationPolicies)
    .set({ isActive: false })
    .where(
      and(
        eq(countryIntegrationPolicies.countryCode, countryCode),
        eq(countryIntegrationPolicies.providerType, input.providerType),
        eq(countryIntegrationPolicies.providerName, POLICY_LOCK_PROVIDER),
      ),
    );

  revalidatePath("/admin/integrations");

  return { status: "success" as const };
}

export async function resetAdminIntegrationPolicyToDefaults(input: {
  countryCode: string;
  providerType: ProviderType;
}) {
  const session = await getAdminSession();

  if (!session) {
    return { status: "error" as const, message: "Unauthorized." };
  }

  const countryCode = input.countryCode.toUpperCase();
  if (countryCode !== "PL") {
    return { status: "error" as const, message: "Only PL policy controls are supported." };
  }

  await db
    .update(countryIntegrationPolicies)
    .set({ isActive: false })
    .where(
      and(
        eq(countryIntegrationPolicies.countryCode, countryCode),
        eq(countryIntegrationPolicies.providerType, input.providerType),
      ),
    );

  revalidatePath("/admin/integrations");

  return { status: "success" as const };
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
      key: "nbp-eur-pln",
      run: async () => {
        const rate = await getInternationalRate({
          countryCode: "PL",
          baseCurrency: "EUR",
          quoteCurrency: "PLN",
          effectiveDate: stableDate,
          rateType: "historical",
        });

        const warningSuffix = rate.warnings?.length ? ` [${rate.warnings.join(" | ")}]` : "";
        return `${rate.provider} ${rate.baseCurrency}/${rate.quoteCurrency}=${rate.rateValue.toFixed(6)}${warningSuffix}`;
      },
    },
    {
      key: "nbp-usd-pln",
      run: async () => {
        const rate = await getInternationalRate({
          countryCode: "PL",
          baseCurrency: "USD",
          quoteCurrency: "PLN",
          effectiveDate: stableDate,
          rateType: "historical",
        });

        const warningSuffix = rate.warnings?.length ? ` [${rate.warnings.join(" | ")}]` : "";
        return `${rate.provider} ${rate.baseCurrency}/${rate.quoteCurrency}=${rate.rateValue.toFixed(6)}${warningSuffix}`;
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
      const hasWarning = details.includes("[");
      return { key: test.key, status: hasWarning ? ("warning" as const) : ("ok" as const), details };
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
