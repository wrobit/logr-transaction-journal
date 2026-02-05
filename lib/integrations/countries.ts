export const SUPPORTED_COUNTRIES = ["PL", "DE", "FR", "GB", "US", "CA", "AU"] as const;

export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number];

const EUROZONE_COUNTRIES = new Set(["DE", "FR"]);

export function isSupportedCountry(countryCode: string): countryCode is SupportedCountry {
  return SUPPORTED_COUNTRIES.includes(countryCode as SupportedCountry);
}

export function isEurozoneCountry(countryCode: string) {
  return EUROZONE_COUNTRIES.has(countryCode);
}
