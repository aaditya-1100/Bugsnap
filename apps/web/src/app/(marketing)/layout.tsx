import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-black text-[#e7e9ea]">
      <header className="sticky top-0 z-40 border-b border-[#2f3336] bg-black/85 backdrop-blur-md">
        <div className="flex h-14 w-full items-center justify-between px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-icon.png"
              alt="BugSnap"
              className="h-7 w-7 rounded-md bg-white object-contain p-0.5"
            />
            <span className="text-sm font-semibold tracking-tight text-white">
              BugSnap
            </span>
          </Link>

          <nav className="flex items-center gap-5 text-sm text-[#71767b]">
            <Link
              href="#workflow"
              className="hidden transition-colors hover:text-white sm:inline-block"
            >
              Workflow
            </Link>
            <Link
              href="#security"
              className="hidden transition-colors hover:text-white sm:inline-block"
            >
              Privacy
            </Link>
            <Link
              href="https://github.com/aaditya-1100/Bugsnap"
              target="_blank"
              rel="noreferrer"
              className="hidden transition-colors hover:text-white sm:inline-block"
            >
              GitHub
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" className="rounded-full px-4" asChild>
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#2f3336] bg-black">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-icon.png"
                  alt="BugSnap"
                  className="h-6 w-6 rounded bg-white object-contain p-0.5"
                />
                <span className="text-sm font-semibold text-white">BugSnap</span>
              </div>
              <p className="text-xs leading-relaxed text-[#71767b]">
                From bug spotted to bug understood. Lightweight visual bug
                reporting for indie developers, teams, and agencies.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-white">Product</div>
              <ul className="space-y-1.5 text-[#71767b]">
                <li>
                  <Link href="#workflow" className="hover:text-white">
                    Workflow
                  </Link>
                </li>
                <li>
                  <Link href="#security" className="hover:text-white">
                    Privacy &amp; Redaction
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-white">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-white">Developers</div>
              <ul className="space-y-1.5 text-[#71767b]">
                <li>
                  <Link
                    href="https://github.com/aaditya-1100/Bugsnap"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white"
                  >
                    GitHub Repository
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-white">
                    Create Account
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white">
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-white">Security</div>
              <ul className="space-y-1.5 text-[#71767b]">
                <li>Client-side pixelation before upload</li>
                <li>Least-privilege Chrome permissions</li>
                <li>Encrypted GitHub OAuth tokens</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[#2f3336] pt-6 text-xs text-[#71767b] sm:flex-row">
            <p>&copy; {new Date().getFullYear()} BugSnap. All rights reserved.</p>
            <p>Built for developers who ship.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
