import type {
  NormalizedBankTransaction,
  NormalizedRateResult,
  NormalizedTaxValidationResult,
  RateProviderName,
  RateType,
  TaxValidationProviderName,
} from "@/lib/integrations/types";

export type RateProviderInput = {
  baseCurrency: string;
  quoteCurrency: string;
  effectiveDate: string;
  rateType: RateType;
};

export type TaxValidationInput = {
  countryCode: string;
  idType: string;
  value: string;
};

export interface RateProvider {
  readonly name: RateProviderName;
  getRate(input: RateProviderInput): Promise<NormalizedRateResult | null>;
  getLatest(input: Omit<RateProviderInput, "effectiveDate" | "rateType">): Promise<NormalizedRateResult | null>;
  getMetadata(): { provider: RateProviderName; supportsHistorical: boolean; supportsLatest: boolean };
}

export interface TaxValidationProvider {
  readonly name: TaxValidationProviderName;
  validate(input: TaxValidationInput): Promise<NormalizedTaxValidationResult>;
}

export interface BankImportProvider {
  listAccounts(userId: string): Promise<Array<{ accountRef: string; displayName: string }>>;
  listTransactions(accountRef: string): Promise<NormalizedBankTransaction[]>;
  refreshConsent(userId: string): Promise<{ status: "ok" | "reconsent_required" }>;
}
