"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import {
  DashboardProvider,
  useDashboard,
} from "@/components/layout/dashboard-context";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { LoadingSkeleton } from "@/components/shared/loading";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const params = useParams<{ workspaceId?: string }>();
  const { user, workspaces, loading } = useDashboard();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6">
        <div className="w-full max-w-md">
          <LoadingSkeleton rows={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-[#e7e9ea]">
      {/* Desktop sticky full-height sidebar */}
      <div className="hidden md:block">
        <Sidebar
          workspaces={workspaces}
          activeWorkspaceId={params?.workspaceId}
          user={user}
        />
      </div>

      {/* Mobile slide-over drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10">
            <Sidebar
              workspaces={workspaces}
              activeWorkspaceId={params?.workspaceId}
              user={user}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 p-5 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
