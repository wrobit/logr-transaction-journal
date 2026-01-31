"use client";

import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          className: "border border-neutral-800 bg-neutral-950 text-sm text-white",
        }}
      />
      {children}
    </>
  );
}
