import Image from "next/image";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-950 text-white">
      <Image
        src="/images/auth-background-bw.png"
        alt=""
        fill
        sizes="100vw"
        className="pointer-events-none object-cover opacity-80"
        priority
      />
      <div className="pointer-events-none absolute inset-0 bg-black/35" />
      <div className="absolute inset-x-3 top-6 z-10 flex items-center justify-between gap-4 md:inset-x-4">
        <Image
          src="/logo.svg"
          alt="Logr"
          width={120}
          height={32}
          className="h-6 w-auto opacity-90 invert"
          priority
        />
        <LocaleSwitcher />
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-3 py-16 md:px-4">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
