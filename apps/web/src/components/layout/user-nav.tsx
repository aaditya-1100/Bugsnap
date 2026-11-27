"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings, User as UserIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export function UserNav({ user }: { user: User | null }) {
  const router = useRouter();
  const initials =
    user?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    user?.email?.slice(0, 2).toUpperCase() ||
    "BS";

  async function handleLogout() {
    await api.logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-[#16181c] focus:outline-none">
          <Avatar className="h-8 w-8 border-[#2f3336]">
            <AvatarFallback className="bg-[#16181c] text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 flex-1 flex-col md:flex">
            <span className="truncate text-xs font-medium text-white">
              {user?.full_name || "Account"}
            </span>
            <span className="truncate text-[11px] text-[#71767b]">
              {user?.email || ""}
            </span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 border-[#2f3336] bg-[#16181c]"
      >
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-0.5">
            <span className="text-xs font-medium text-white">
              {user?.full_name || "Signed in"}
            </span>
            <span className="truncate text-[11px] font-normal text-[#71767b]">
              {user?.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#2f3336]" />
        <DropdownMenuItem onClick={() => router.push("/dashboard")}>
          <UserIcon className="h-3.5 w-3.5 text-[#71767b]" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/account")}>
          <Settings className="h-3.5 w-3.5 text-[#71767b]" />
          Account Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#2f3336]" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-400 focus:text-red-300"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
