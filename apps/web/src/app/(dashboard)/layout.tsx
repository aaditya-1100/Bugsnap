"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { LoadingSkeleton } from "@/components/shared/loading";
import { api, clearStoredToken } from "@/lib/api";
import type { User, Workspace } from "@/lib/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams<{ workspaceId?: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [me, ws] = await Promise.all([api.getMe(), api.getWorkspaces()]);
        if (!active) return;
        setUser(me);
        setWorkspaces(ws);
      } catch {
        clearStoredToken();
        if (active) router.replace("/login");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
        <div className="w-full max-w-md">
          <LoadingSkeleton rows={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-zinc-50">
      <div className="hidden md:block">
        <Sidebar
          workspaces={workspaces}
          activeWorkspaceId={params?.workspaceId}
          user={user}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
