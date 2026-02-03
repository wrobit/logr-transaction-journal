import { z } from "zod";

const numericField = (label: string) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().positive(`${label} must be greater than zero.`),
  );

const optionalNumericField = (label: string) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce
      .number()
      .nonnegative(`${label} must be zero or greater.`)
      .optional(),
  );

const optionalTextField = (label: string, min = 0) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(min, `${label} is required.`).optional(),
  );

const isNotFutureDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return parsed <= today;
};

export const entryInputSchema = z.object({
  date: z
    .string()
    .min(1, "Date is required.")
    .refine(isNotFutureDate, "Date cannot be in the future."),
  operation: z.enum(["BUY", "SELL"]),
  baseAsset: z.string().min(1, "Asset is required."),
  quoteCurrency: z.string().min(1, "Quote currency is required."),
  quantity: numericField("Quantity"),
  pricePerUnit: numericField("Price per unit"),
  commission: optionalNumericField("Commission"),
  source: optionalTextField("Source"),
  note: optionalTextField("Note"),
});

export type EntryInput = z.infer<typeof entryInputSchema>;
