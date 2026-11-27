import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-black/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-icon.png"
              alt="BugSnap"
              className="h-7 w-7 rounded-md bg-white object-contain p-0.5"
            />
            <span className="text-sm font-semibold tracking-tight">
              BugSnap
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-sm text-zinc-400">
            <Link
              href="#workflow"
              className="hidden transition-colors hover:text-zinc-100 sm:inline-block"
            >
              Workflow
            </Link>
            <Link
              href="https://github.com/aaditya-1100/Bugsnap"
              target="_blank"
              rel="noreferrer"
              className="hidden transition-colors hover:text-zinc-100 sm:inline-block"
            >
              GitHub
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-500">
        BugSnap — From bug spotted to bug understood.
      </footer>
    </div>
  );
}
