import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { getProfile } from "@/actions/profile";
import { ProfileView } from "@/components/profile/profile-view";
import { authOptions } from "@/lib/auth/options";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your Entry account details and settings.",
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await getProfile(session.user);

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-black px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <ProfileView profile={profile} />
      </div>
    </div>
  );
}
