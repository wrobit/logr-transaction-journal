export type EntryOperation = "BUY" | "SELL";

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
};

export type EntryView = EntryPayload & {
  id: string;
  userId: string;
  date: string;
  createdAt: string;
  updatedAt: string;
};
