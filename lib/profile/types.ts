import type { DisplayCurrency } from "@/lib/currency/display";

export type ProfileView = {
  id: string;
  firstName: string;
  lastName: string;
  login: string;
  email: string;
  displayCurrency: DisplayCurrency;
  createdAt: string;
  updatedAt: string;
};
