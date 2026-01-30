"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            "border border-neutral-800 bg-neutral-950 text-sm text-white",
        }}
      />
      {children}
    </ThemeProvider>
  );
}
