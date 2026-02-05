import type { Entry } from "@/lib/db/schema";
import type { EntryPayload, EntryView } from "@/lib/entries/types";
import { dayjs } from "@/lib/dayjs";

const toDateString = (value: Date) => dayjs.utc(value).format("YYYY-MM-DD");
const toDateTimeString = (value: Date) => dayjs.utc(value).toISOString();

export function serializeEntry(entry: Entry, payload: EntryPayload): EntryView {
  return {
    id: entry.id,
    userId: entry.userId,
    date: toDateString(entry.date),
    ...payload,
    createdAt: toDateTimeString(entry.createdAt),
    updatedAt: toDateTimeString(entry.updatedAt),
  };
}
