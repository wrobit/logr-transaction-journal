import { z } from "zod";

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  login: z.string().trim().min(3, "Login must be at least 3 characters."),
  email: z.string().trim().email("Email must be valid."),
});

export const deleteAccountSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .refine((value) => value === "DELETE", "Type DELETE to confirm."),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
