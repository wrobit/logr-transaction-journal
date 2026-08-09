export const EXCHANGE_CSV_PROVIDERS = ["kraken", "binance"] as const;
export type ExchangeCsvProvider = (typeof EXCHANGE_CSV_PROVIDERS)[number];

export const IMPORT_OPERATION_TYPES = ["BUY", "SELL"] as const;
export type ImportOperationType = (typeof IMPORT_OPERATION_TYPES)[number];

export const IMPORT_ERROR_CATEGORIES = ["schema", "mapping", "business_rule"] as const;
export type ImportErrorCategory = (typeof IMPORT_ERROR_CATEGORIES)[number];

export type ImportErrorCode =
  | "missing_required_column"
  | "missing_required_value"
  | "invalid_date"
  | "invalid_number"
  | "unsupported_operation"
  | "unsupported_market"
  | "invalid_quantity"
  | "invalid_price"
  | "invalid_fee";

export type ImportIssue = {
  category: ImportErrorCategory;
  code: ImportErrorCode;
  message: string;
  field?: string;
};

export type CanonicalImportTransaction = {
  provider: ExchangeCsvProvider;
  externalId: string;
  executedAt: string;
  operation: ImportOperationType;
  baseAsset: string;
  quoteCurrency: string;
  quantity: string;
  pricePerUnit: string;
  fullPrice: string;
  commission: string | null;
  commissionCurrency: string | null;
  sourceName: string;
  rowNumber: number;
  rawRow: Record<string, string>;
};

export type CanonicalImportRowResult =
  | {
      status: "valid";
      rowNumber: number;
      transaction: CanonicalImportTransaction;
      issues: [];
    }
  | {
      status: "invalid" | "unsupported";
      rowNumber: number;
      issues: ImportIssue[];
      rawRow: Record<string, string>;
    };

export type ExchangeCsvParseResult = {
  provider: ExchangeCsvProvider;
  filename: string | null;
  delimiter: "," | ";" | "\t";
  encoding: "utf-8" | "utf-8-bom" | "utf-16le" | "utf-16be";
  headers: string[];
  rows: CanonicalImportRowResult[];
};
