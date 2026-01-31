export type EntryOperation = "BUY" | "SELL";

export type EntryView = {
  id: string;
  userId: string;
  date: string;
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
  createdAt: string;
  updatedAt: string;
};
