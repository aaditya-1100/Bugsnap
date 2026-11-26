import Link from "next/link";
import { Bug } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-600 text-white">
          <Bug className="h-4 w-4" />
        </div>
        <span className="text-base font-semibold tracking-tight text-zinc-50">
          BugSnap
        </span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
