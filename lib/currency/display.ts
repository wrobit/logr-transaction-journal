export const DISPLAY_CURRENCIES = ["PLN", "EUR", "USD"] as const;

export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export const DEFAULT_DISPLAY_CURRENCY: DisplayCurrency = "PLN";

export function isDisplayCurrency(value: string | undefined | null): value is DisplayCurrency {
  if (!value) {
    return false;
  }

  return DISPLAY_CURRENCIES.includes(value as DisplayCurrency);
}
