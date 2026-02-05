import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { countryIntegrationPolicies } from "@/lib/db/schema";
import { isEurozoneCountry } from "@/lib/integrations/countries";
import { getEnabledCountries, isInternationalIntegrationsEnabled } from "@/lib/integrations/feature-flags";
import type { ProviderType, RateProviderName, TaxValidationProviderName } from "@/lib/integrations/types";

type PolicyProviderName = RateProviderName | TaxValidationProviderName;

const DEFAULT_RATE_POLICY: Record<string, RateProviderName[]> = {
  GB: ["hmrc", "ecb"],
  CA: ["boc", "ecb"],
  US: ["irs_compatible", "ecb"],
  AU: ["rba", "ecb"],
  default: ["ecb"],
};

const DEFAULT_TAX_POLICY: Record<string, TaxValidationProviderName[]> = {
  default: ["vies"],
};

export async function resolveProviderPolicy(
  countryCode: string,
  providerType: ProviderType,
): Promise<PolicyProviderName[]> {
  const normalizedCountry = countryCode.toUpperCase();

  if (!isInternationalIntegrationsEnabled()) {
    return [];
  }

  const enabledCountries = getEnabledCountries();
  if (enabledCountries.length > 0 && !enabledCountries.includes(normalizedCountry)) {
    return [];
  }

  const policies = await db
    .select({ providerName: countryIntegrationPolicies.providerName })
    .from(countryIntegrationPolicies)
    .where(
      and(
        eq(countryIntegrationPolicies.countryCode, normalizedCountry),
        eq(countryIntegrationPolicies.providerType, providerType),
        eq(countryIntegrationPolicies.isActive, true),
      ),
    )
    .orderBy(asc(countryIntegrationPolicies.priority));

  if (policies.length > 0) {
    return policies.map((policy) => policy.providerName as PolicyProviderName);
  }

  if (providerType === "rate") {
    if (isEurozoneCountry(normalizedCountry)) {
      return ["ecb"];
    }

    return DEFAULT_RATE_POLICY[normalizedCountry] ?? DEFAULT_RATE_POLICY.default;
  }

  if (providerType === "tax_validation") {
    return DEFAULT_TAX_POLICY[normalizedCountry] ?? DEFAULT_TAX_POLICY.default;
  }

  return [];
}
