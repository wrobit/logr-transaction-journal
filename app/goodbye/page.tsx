import type { Metadata } from "next";

import { GoodbyeView } from "@/components/profile/goodbye-view";

export const metadata: Metadata = {
  title: "Goodbye",
  description: "Account deletion confirmation and feedback for Entry.",
};

export default function GoodbyePage() {
  return (
    <div className="min-h-screen bg-black px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <GoodbyeView />
      </div>
    </div>
  );
}
