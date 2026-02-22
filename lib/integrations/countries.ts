export const SUPPORTED_COUNTRIES = ["PL"] as const;

export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number];

const EUROZONE_COUNTRIES = new Set<string>();

export function isSupportedCountry(countryCode: string): countryCode is SupportedCountry {
  return SUPPORTED_COUNTRIES.includes(countryCode as SupportedCountry);
}

export function isEurozoneCountry(countryCode: string) {
  return EUROZONE_COUNTRIES.has(countryCode);
}
