export type EntryOperation = "BUY" | "SELL";

export type EntryRateAttribution = {
  source: "integration_service" | "legacy_nbp" | "direct";
  provider: string;
  method: string;
  effectiveDate: string;
  retrievedAt: string;
  publishedAt: string | null;
  snapshotHash: string | null;
  warnings: string[];
};

export type EntryPayload = {
  operation: EntryOperation;
  baseAsset: string;
  quoteCurrency: string;
  quantity: string;
  pricePerUnit: string;
  fullPrice: string;
  commission: string | null;
  source: string | null;
  note: string | null;
  nbpRateDate: string;
  nbpRate: string;
  valuePln: string;
  rateAttribution?: EntryRateAttribution;
};

export type EntryView = EntryPayload & {
  id: string;
  userId: string;
  date: string;
  createdAt: string;
  updatedAt: string;
};
