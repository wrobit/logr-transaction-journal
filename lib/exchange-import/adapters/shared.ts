import type {
  CanonicalImportRowResult,
  CanonicalImportTransaction,
  ExchangeCsvProvider,
  ImportIssue,
} from "@/lib/exchange-import/types";
import { buildIssue, validateCanonicalTransaction } from "@/lib/exchange-import/validation";

const QUOTE_ASSET_CANDIDATES = [
  "USDT",
  "USDC",
  "DAI",
  "EUR",
  "USD",
  "PLN",
  "GBP",
  "CHF",
  "JPY",
  "AUD",
  "CAD",
  "BTC",
  "ETH",
  "TRY",
  "BUSD",
];

export function buildMissingColumnsIssues(headers: string[], required: string[]): ImportIssue[] {
  const missing = required.filter((column) => !headers.includes(column));
  return missing.map((column) =>
    buildIssue({
      category: "schema",
      code: "missing_required_column",
      field: column,
      message: `Missing required column: ${column}`,
    }),
  );
}

export function splitMarketPair(value: string): { baseAsset: string; quoteCurrency: string } | null {
  const raw = value.trim().toUpperCase();
  if (!raw) {
    return null;
  }

  const pairSeparatorMatch = raw.match(/[/_\-]/);
  if (pairSeparatorMatch) {
    const [base, quote] = raw.split(pairSeparatorMatch[0]);
    if (!base || !quote) {
      return null;
    }

    return {
      baseAsset: normalizeAssetCode(base),
      quoteCurrency: normalizeAssetCode(quote),
    };
  }

  for (const quote of QUOTE_ASSET_CANDIDATES) {
    if (raw.endsWith(quote) && raw.length > quote.length) {
      const baseCandidate = raw.slice(0, -quote.length);
      const normalizedBaseCandidate =
        /^[XZ]/.test(raw) && baseCandidate.endsWith("Z") ? baseCandidate.slice(0, -1) : baseCandidate;

      return {
        baseAsset: normalizeAssetCode(normalizedBaseCandidate),
        quoteCurrency: normalizeAssetCode(quote),
      };
    }
  }

  return null;
}

export function normalizeAssetCode(asset: string): string {
  const upper = asset.trim().toUpperCase().replaceAll(/[^A-Z0-9]/g, "");
  const withoutLeadingXz = /^[XZ][A-Z0-9]{3}$/.test(upper) ? upper.slice(1) : upper;

  if (withoutLeadingXz === "XBT") {
    return "BTC";
  }

  if (withoutLeadingXz === "XDG") {
    return "DOGE";
  }

  return withoutLeadingXz;
}

export function buildInvalidRow(
  rowNumber: number,
  rawRow: Record<string, string>,
  issues: ImportIssue[],
): CanonicalImportRowResult {
  const status = issues.some((issue) => issue.category === "mapping") ? "unsupported" : "invalid";
  return {
    status,
    rowNumber,
    rawRow,
    issues,
  };
}

export function buildValidRow(
  provider: ExchangeCsvProvider,
  rowNumber: number,
  rawRow: Record<string, string>,
  transaction: Omit<CanonicalImportTransaction, "provider" | "rowNumber" | "rawRow">,
): CanonicalImportRowResult {
  const candidate: CanonicalImportTransaction = {
    ...transaction,
    provider,
    rowNumber,
    rawRow,
  };

  const validation = validateCanonicalTransaction(candidate);
  if (!validation.ok) {
    return {
      status: "invalid",
      rowNumber,
      rawRow,
      issues: validation.issues,
    };
  }

  return {
    status: "valid",
    rowNumber,
    transaction: candidate,
    issues: [],
  };
}
