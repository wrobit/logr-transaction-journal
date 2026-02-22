export const RATE_PROVIDERS = ["nbp", "ecb", "hmrc", "boc", "irs_compatible", "rba"] as const;
export type RateProviderName = (typeof RATE_PROVIDERS)[number];

export const TAX_VALIDATION_PROVIDERS = ["vies"] as const;
export type TaxValidationProviderName = (typeof TAX_VALIDATION_PROVIDERS)[number];

export const BANK_IMPORT_PROVIDERS = ["gocardless_bad"] as const;
export type BankImportProviderName = (typeof BANK_IMPORT_PROVIDERS)[number];

export type ProviderType = "rate" | "tax_validation" | "bank_import";

export type RateType = "historical" | "latest" | "monthly";

export type RateMethod = "spot" | "reference" | "official_publication" | "irs_compatible";

export type NormalizedRateResult = {
  provider: RateProviderName;
  baseCurrency: string;
  quoteCurrency: string;
  rateValue: number;
  effectiveDate: string;
  publishedAt: string | null;
  retrievedAt: string;
  rateType: RateType;
  method: RateMethod;
  rawSnapshot: unknown;
  warnings?: string[];
};

export type TaxValidationStatus = "valid" | "invalid" | "unavailable" | "timeout";

export type NormalizedTaxValidationResult = {
  provider: TaxValidationProviderName;
  countryCode: string;
  idType: string;
  value: string;
  maskedValue: string;
  status: TaxValidationStatus;
  checkedAt: string;
  rawSnapshot: unknown;
};

export type NormalizedBankTransaction = {
  provider: BankImportProviderName;
  accountRef: string;
  providerTransactionId: string;
  bookedAt: string;
  amount: number;
  currency: string;
  counterparty: string | null;
  description: string | null;
  category: string | null;
  rawSnapshot: unknown;
};
