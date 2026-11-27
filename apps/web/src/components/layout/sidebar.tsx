"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bug,
  Check,
  ChevronsUpDown,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Settings,
  UserCog,
  X,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { User, Workspace } from "@/lib/types";
import { UserNav } from "./user-nav";

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId?: string;
  user: User | null;
  onNavigate?: () => void;
}

export function Sidebar({
  workspaces,
  activeWorkspaceId,
  user,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    ...(currentWorkspace
      ? [
          {
            label: "Reports",
            href: `/workspaces/${currentWorkspace.id}/reports`,
            icon: Bug,
            active: pathname.includes("/reports"),
          },
          {
            label: "Projects",
            href: `/workspaces/${currentWorkspace.id}/projects`,
            icon: FolderKanban,
            active: pathname.includes("/projects"),
          },
          {
            label: "Workspace Settings",
            href: `/workspaces/${currentWorkspace.id}/settings`,
            icon: Settings,
            active: pathname.includes(`/workspaces/${currentWorkspace.id}/settings`),
          },
        ]
      : []),
    {
      label: "Account Settings",
      href: "/account",
      icon: UserCog,
      active: pathname === "/account",
    },
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-[#2f3336] bg-black">
      <div className="flex h-14 items-center justify-between border-b border-[#2f3336] px-4">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5"
        >
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
        {onNavigate ? (
          <button
            type="button"
            onClick={onNavigate}
            className="rounded-lg p-1 text-[#71767b] hover:bg-[#16181c] hover:text-white md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center justify-between rounded-xl border border-[#2f3336] bg-[#16181c] px-3 py-2 text-left text-xs font-medium text-white transition-colors hover:border-zinc-600 focus:outline-none">
              <span className="truncate">
                {currentWorkspace ? currentWorkspace.name : "Select workspace"}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[#71767b]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-52 border-[#2f3336] bg-[#16181c]"
            align="start"
          >
            <DropdownMenuLabel className="text-[#71767b]">
              Workspaces ({workspaces.length})
            </DropdownMenuLabel>
            {workspaces.map((ws) => {
              const selected = currentWorkspace?.id === ws.id;
              return (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => {
                    router.push(`/workspaces/${ws.id}`);
                    onNavigate?.();
                  }}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{ws.name}</span>
                  {selected ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-white" />
                  ) : null}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator className="bg-[#2f3336]" />
            <DropdownMenuItem
              onClick={() => {
                router.push("/workspaces/new");
                onNavigate?.();
              }}
            >
              <Plus className="h-3.5 w-3.5 text-[#71767b]" />
              New workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
                item.active
                  ? "bg-[#16181c] text-white"
                  : "text-[#71767b] hover:bg-[#16181c]/60 hover:text-[#e7e9ea]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[#2f3336] p-3">
        <UserNav user={user} />
      </div>
    </aside>
  );
}
