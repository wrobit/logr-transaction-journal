import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-neutral-950 text-white">
      <div className="absolute left-6 top-6">
        <Image
          src="/logo.svg"
          alt="Logr"
          width={120}
          height={32}
          className="h-6 w-auto opacity-90 invert"
          priority
        />
      </div>
      <div className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
