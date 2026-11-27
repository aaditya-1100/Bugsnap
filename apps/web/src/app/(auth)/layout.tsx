import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-icon.png"
          alt="BugSnap"
          className="h-8 w-8 rounded-md bg-white object-contain p-0.5"
        />
        <span className="text-base font-semibold tracking-tight text-zinc-50">
          BugSnap
        </span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
