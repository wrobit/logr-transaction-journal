import { z } from "zod";

import { feedbackReasons } from "@/lib/profile/feedback";
import { DISPLAY_CURRENCIES } from "@/lib/currency/display";

const optionalTextField = (label: string) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(1, `${label} is required.`).optional(),
  );

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  login: z.string().trim().min(3, "Login must be at least 3 characters."),
  email: z.string().trim().email("Email must be valid."),
  displayCurrency: z.enum(DISPLAY_CURRENCIES),
});

const feedbackReasonSchema = z.enum(feedbackReasons);

export const deleteAccountSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .refine((value) => value === "DELETE", "Type DELETE to confirm."),
  reason: z.preprocess(
    (value) => (value ? String(value) : undefined),
    feedbackReasonSchema.optional(),
  ),
  notes: optionalTextField("Notes"),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
