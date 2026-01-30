import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { listEntries } from "@/actions/entries";
import { EntriesView } from "@/components/entries/entries-view";
import { authOptions } from "@/lib/auth/options";

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const entries = await listEntries(session.user.id);

  return (
    <div className="min-h-screen bg-black px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <EntriesView entries={entries} />
      </div>
    </div>
  );
}
