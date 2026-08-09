import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { getProfile } from "@/actions/profile";
import { ProfileView } from "@/components/profile/profile-view";
import { authOptions } from "@/lib/auth/options";
import { getServerTranslator } from "@/lib/i18n/translate";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslator();
  return buildPageMetadata({
    title: t("metadata.profile.title"),
    description: t("metadata.profile.description"),
    path: "/profile",
  });
}

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
    <div className="min-h-screen bg-black px-3 py-10 md:px-4">
      <div className="mx-auto w-full max-w-7xl">
        <ProfileView profile={profile} />
      </div>
    </div>
  );
}
