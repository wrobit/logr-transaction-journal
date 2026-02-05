import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DeleteAccountDialog } from "@/components/profile/delete-account-dialog";
import { ProfileView } from "@/components/profile/profile-view";
import type { UpdateProfileState } from "@/lib/profile/actions";
import type { ProfileView as ProfileData } from "@/lib/profile/types";
import { renderWithIntl } from "@/test/utils/render-with-intl";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

const profile: ProfileData = {
  id: "user-1",
  firstName: "Ada",
  lastName: "Lovelace",
  login: "ada",
  email: "ada@example.com",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-02-01T00:00:00Z",
};

describe("ProfileView", () => {
  it("renders profile summary", () => {
    renderWithIntl(<ProfileView profile={profile} />);

    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("01/01/2025")).toBeInTheDocument();
  });

  it("shows validation errors from update action", async () => {
    const updateAction = vi.fn(async (): Promise<UpdateProfileState> => ({
      status: "error",
      errors: { firstName: "First name is required." },
    }));

    renderWithIntl(<ProfileView profile={profile} updateAction={updateAction} />);

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(updateAction).toHaveBeenCalled();
    expect(await screen.findByText("First name is required.")).toBeInTheDocument();
  });
});

describe("DeleteAccountDialog", () => {
  it("shows exit step before enabling delete", () => {
    const action = vi.fn(async () => ({ status: "idle" as const }));

    renderWithIntl(<DeleteAccountDialog open onOpenChange={vi.fn()} action={action} />);

    expect(screen.getByText("Delete account")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText(/why are you leaving/i)).toBeInTheDocument();

    const deleteButton = screen.getByRole("button", { name: /delete account/i });
    expect(deleteButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/type delete/i), {
      target: { value: "DELETE" },
    });

    expect(deleteButton).not.toBeDisabled();
  });
});
