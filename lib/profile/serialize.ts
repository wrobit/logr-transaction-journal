import type { User } from "@/lib/db/schema";
import type { ProfileView } from "@/lib/profile/types";
import { dayjs } from "@/lib/dayjs";
import { DEFAULT_DISPLAY_CURRENCY, isDisplayCurrency } from "@/lib/currency/display";

const toDateTimeString = (value: Date) => dayjs.utc(value).toISOString();

export function serializeProfile(user: User): ProfileView {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    login: user.login,
    email: user.email,
    displayCurrency: isDisplayCurrency(user.displayCurrency)
      ? user.displayCurrency
      : DEFAULT_DISPLAY_CURRENCY,
    createdAt: toDateTimeString(user.createdAt),
    updatedAt: toDateTimeString(user.updatedAt),
  };
}
