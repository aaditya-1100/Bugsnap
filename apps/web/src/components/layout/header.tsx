"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Menu } from "lucide-react";

import type { User } from "@/lib/types";
import { UserNav } from "./user-nav";

interface HeaderProps {
  title?: string;
  user: User | null;
  onOpenMobileMenu?: () => void;
}

export function Header({
  title = "Workspace",
  user,
  onOpenMobileMenu,
}: HeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-[#2f3336] bg-black/85 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-2.5">
        {onOpenMobileMenu ? (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation"
            className="rounded-lg border border-[#2f3336] p-1.5 text-[#e7e9ea] hover:bg-[#16181c] md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
        ) : null}

        <div className="flex items-center gap-1 rounded-full border border-[#2f3336] bg-[#16181c] p-0.5">
          <button
            type="button"
            onClick={() => router.back()}
            title="Go back"
            className="rounded-full p-1 text-[#71767b] transition-colors hover:bg-black hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => router.forward()}
            title="Go forward"
            className="rounded-full p-1 text-[#71767b] transition-colors hover:bg-black hover:text-white"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <span className="text-sm font-medium text-[#e7e9ea]">{title}</span>
      </div>

      <div className="flex items-center gap-3 md:hidden">
        <UserNav user={user} />
      </div>
    </header>
  );
}
