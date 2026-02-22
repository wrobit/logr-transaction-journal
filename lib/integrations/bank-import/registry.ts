import { isBankImportEnabled, getEnabledBankImportProviders } from "@/lib/integrations/feature-flags";
import { resolveProviderPolicy } from "@/lib/integrations/policy";
import { GoCardlessBankImportProvider } from "@/lib/integrations/providers/gocardless-bank-import-provider";
import type { BankImportProvider } from "@/lib/integrations/providers/interfaces";
import type { BankImportProviderName } from "@/lib/integrations/types";

const bankImportProviders: Record<BankImportProviderName, BankImportProvider> = {
  gocardless_bad: new GoCardlessBankImportProvider(),
};

export async function resolveBankImportProvidersForCountry(countryCode: string) {
  if (!isBankImportEnabled()) {
    return [];
  }

  const policy = await resolveProviderPolicy(countryCode, "bank_import");
  const allowedByEnv = new Set(getEnabledBankImportProviders());

  return policy
    .filter((providerName): providerName is BankImportProviderName => providerName in bankImportProviders)
    .filter((providerName) => allowedByEnv.size === 0 || allowedByEnv.has(providerName))
    .map((providerName) => bankImportProviders[providerName]);
}
