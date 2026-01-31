import type { EntryOperation } from "@/lib/entries/types";

export const NUMERIC_SCALES = {
  quantity: 12,
  pricePerUnit: 12,
  fullPrice: 12,
  commission: 12,
  nbpRate: 6,
  valuePln: 2,
};

export function calculateFullPrice({
  quantity,
  pricePerUnit,
  commission,
  operation,
}: {
  quantity: number;
  pricePerUnit: number;
  commission?: number | null;
  operation: EntryOperation;
}) {
  const base = quantity * pricePerUnit;
  if (!commission) {
    return base;
  }

  return operation === "BUY" ? base + commission : base - commission;
}

export function calculateValuePln(fullPrice: number, rate: number) {
  return fullPrice * rate;
}

export function toFixedNumber(value: number, decimals: number) {
  return Number(value.toFixed(decimals));
}

export function toFixedString(value: number, decimals: number) {
  return value.toFixed(decimals);
}
