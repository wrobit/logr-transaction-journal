import type { ProfileView } from "@/lib/profile/types";

export type ProfileActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string>;
  profile?: ProfileView;
};

export type UpdateProfileState = ProfileActionState;

export type DeleteAccountState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const defaultUpdateProfileState: UpdateProfileState = { status: "idle" };
export const defaultDeleteAccountState: DeleteAccountState = { status: "idle" };
