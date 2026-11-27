"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bug,
  ChevronsUpDown,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Settings,
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
}

export function Sidebar({
  workspaces,
  activeWorkspaceId,
  user,
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
            label: "Settings",
            href: `/workspaces/${currentWorkspace.id}/settings`,
            icon: Settings,
            active: pathname.includes("/settings"),
          },
        ]
      : []),
  ];

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-zinc-800/80 bg-black">
      <div className="flex h-14 items-center gap-2 border-b border-zinc-800/80 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-icon.png"
            alt="BugSnap"
            className="h-7 w-7 rounded-md bg-white object-contain p-0.5"
          />
          <span className="text-sm font-semibold tracking-tight text-zinc-50">
            BugSnap
          </span>
        </Link>
      </div>

      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center justify-between rounded-md border border-zinc-800/80 bg-zinc-900/60 px-2.5 py-2 text-left text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-900 focus:outline-none">
              <span className="truncate">
                {currentWorkspace ? currentWorkspace.name : "Select workspace"}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-54" align="start">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => router.push(`/workspaces/${ws.id}`)}
              >
                <span className="truncate">{ws.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/workspaces/new")}>
              <Plus className="h-3.5 w-3.5 text-zinc-400" />
              New workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                item.active
                  ? "bg-zinc-900 text-zinc-50"
                  : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800/80 p-3">
        <UserNav user={user} />
      </div>
    </aside>
  );
}
