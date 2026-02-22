import type {
  CanonicalImportTransaction,
  ExchangeCsvProvider,
  ImportIssue,
} from "@/lib/exchange-import/types";

export type ExchangeImportPreviewRow = {
  rowNumber: number;
  status: "valid" | "invalid" | "unsupported";
  issues: ImportIssue[];
  rawRow: Record<string, string>;
  transaction?: CanonicalImportTransaction;
};

export type ExchangeImportPreviewState = {
  status: "idle" | "error" | "success";
  message?: string;
  provider?: ExchangeCsvProvider;
  filename?: string | null;
  delimiter?: "," | ";" | "\t";
  encoding?: "utf-8" | "utf-8-bom" | "utf-16le" | "utf-16be";
  totalRows?: number;
  validRows?: number;
  invalidRows?: number;
  unsupportedRows?: number;
  rows?: ExchangeImportPreviewRow[];
};

export type ExchangeImportConfirmState = {
  status: "idle" | "error" | "success";
  message?: string;
  batchId?: string;
  importedCount?: number;
  failedCount?: number;
  duplicateCount?: number;
  failedRows?: Array<{ rowNumber: number; reason: string }>;
  failedReportCsv?: string;
};

export const defaultExchangeImportPreviewState: ExchangeImportPreviewState = {
  status: "idle",
};

export const defaultExchangeImportConfirmState: ExchangeImportConfirmState = {
  status: "idle",
};
