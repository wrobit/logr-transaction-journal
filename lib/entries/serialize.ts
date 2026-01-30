import type { Entry } from "@/lib/db/schema";
import type { EntryView } from "@/lib/entries/types";

const toDateString = (value: Date) => value.toISOString().slice(0, 10);
const toDateTimeString = (value: Date) => value.toISOString();

export function serializeEntry(entry: Entry): EntryView {
  return {
    id: entry.id,
    userId: entry.userId,
    date: toDateString(entry.date),
    operation: entry.operation,
    baseAsset: entry.baseAsset,
    quoteCurrency: entry.quoteCurrency,
    quantity: String(entry.quantity),
    pricePerUnit: String(entry.pricePerUnit),
    fullPrice: String(entry.fullPrice),
    commission: entry.commission ? String(entry.commission) : null,
    source: entry.source,
    note: entry.note,
    nbpRateDate: toDateString(entry.nbpRateDate),
    nbpRate: String(entry.nbpRate),
    valuePln: String(entry.valuePln),
    createdAt: toDateTimeString(entry.createdAt),
    updatedAt: toDateTimeString(entry.updatedAt),
  };
}
