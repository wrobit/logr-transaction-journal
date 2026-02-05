import { BANK_IMPORT_PROVIDERS, RATE_PROVIDERS, TAX_VALIDATION_PROVIDERS } from "@/lib/integrations/types";

function parseCsvValues(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function isInternationalIntegrationsEnabled() {
  return process.env.INTL_INTEGRATIONS_ENABLED === "true";
}

export function getEnabledCountries() {
  return parseCsvValues(process.env.INTL_COUNTRIES_ENABLED).map((country) => country.toUpperCase());
}

export function isBankImportEnabled() {
  return process.env.INTL_BANK_IMPORT_ENABLED === "true";
}

export function isRateProviderEnabled(provider: (typeof RATE_PROVIDERS)[number]) {
  const envKey = `INTL_${provider.toUpperCase()}_ENABLED`;
  return process.env[envKey] !== "false";
}

export function isTaxValidationProviderEnabled(provider: (typeof TAX_VALIDATION_PROVIDERS)[number]) {
  const envKey = `INTL_${provider.toUpperCase()}_ENABLED`;
  return process.env[envKey] !== "false";
}

export function getEnabledBankImportProviders() {
  const configured = new Set(parseCsvValues(process.env.INTL_BANK_PROVIDERS));

  if (configured.size === 0) {
    return [];
  }

  return BANK_IMPORT_PROVIDERS.filter((provider) => configured.has(provider));
}
