import type { EntryView } from "@/lib/entries/types";

export type EntryActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string>;
  entry?: EntryView;
};

export type CreateEntryState = EntryActionState;
export type UpdateEntryState = EntryActionState;

export type DeleteEntryState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const defaultCreateEntryState: CreateEntryState = { status: "idle" };
export const defaultUpdateEntryState: UpdateEntryState = { status: "idle" };
export const defaultDeleteEntryState: DeleteEntryState = { status: "idle" };
