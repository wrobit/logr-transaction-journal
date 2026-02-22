import { isRateProviderEnabled, isTaxValidationProviderEnabled } from "@/lib/integrations/feature-flags";
import { resolveProviderPolicy } from "@/lib/integrations/policy";
import { BocRateProvider } from "@/lib/integrations/providers/boc-rate-provider";
import { EcbRateProvider } from "@/lib/integrations/providers/ecb-rate-provider";
import { HmrcRateProvider } from "@/lib/integrations/providers/hmrc-rate-provider";
import { IrsCompatibleRateProvider } from "@/lib/integrations/providers/irs-compatible-rate-provider";
import { NbpRateProvider } from "@/lib/integrations/providers/nbp-rate-provider";
import type { RateProvider, TaxValidationProvider } from "@/lib/integrations/providers/interfaces";
import { RbaRateProvider } from "@/lib/integrations/providers/rba-rate-provider";
import { ViesTaxValidationProvider } from "@/lib/integrations/providers/vies-tax-validation-provider";
import type { RateProviderName, TaxValidationProviderName } from "@/lib/integrations/types";

const rateProviders: Record<RateProviderName, RateProvider> = {
  nbp: new NbpRateProvider(),
  ecb: new EcbRateProvider(),
  hmrc: new HmrcRateProvider(),
  boc: new BocRateProvider(),
  irs_compatible: new IrsCompatibleRateProvider(),
  rba: new RbaRateProvider(),
};

const taxValidationProviders: Record<TaxValidationProviderName, TaxValidationProvider> = {
  vies: new ViesTaxValidationProvider(),
};

export async function resolveRateProvidersForCountry(countryCode: string) {
  const policy = await resolveProviderPolicy(countryCode, "rate");

  return policy
    .filter((providerName): providerName is RateProviderName => providerName in rateProviders)
    .filter((providerName) => isRateProviderEnabled(providerName))
    .map((providerName) => rateProviders[providerName]);
}

export async function resolveTaxValidationProvidersForCountry(countryCode: string) {
  const policy = await resolveProviderPolicy(countryCode, "tax_validation");

  return policy
    .filter(
      (providerName): providerName is TaxValidationProviderName =>
        providerName in taxValidationProviders,
    )
    .filter((providerName) => isTaxValidationProviderEnabled(providerName))
    .map((providerName) => taxValidationProviders[providerName]);
}
