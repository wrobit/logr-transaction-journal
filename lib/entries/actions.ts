import type { EntryView } from "@/lib/entries/types";

export type CreateEntryState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string>;
  entry?: EntryView;
};

export const defaultCreateEntryState: CreateEntryState = { status: "idle" };
