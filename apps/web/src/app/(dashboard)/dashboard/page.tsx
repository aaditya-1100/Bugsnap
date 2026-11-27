"use client";

import Link from "next/link";
import { Bug, FolderKanban, Layers, Plus } from "lucide-react";

import { useDashboard } from "@/components/layout/dashboard-context";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { workspaces } = useDashboard();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Dashboard"
        description="Manage your workspaces, projects, and captured bug reports."
        actions={
          <Button asChild size="sm">
            <Link href="/workspaces/new">
              <Plus className="h-4 w-4" />
              New workspace
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-[#71767b]">
              Workspaces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-white">
              {workspaces.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-[#71767b]">
              Active Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold capitalize text-white">
              {workspaces[0]?.plan || "Free"}
            </div>
          </CardContent>
        </Card>
        {workspaces[0] ? (
          <Link
            href={`/workspaces/${workspaces[0].id}/reports`}
            prefetch={true}
            className="block"
          >
            <Card className="h-full cursor-pointer transition-all duration-150 hover:border-zinc-500 hover:bg-[#1d2025]">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-[#71767b]">
                  Quick Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium text-white">
                  Open latest reports →
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-[#71767b]">
                Quick Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-[#71767b]">No workspace yet</span>
            </CardContent>
          </Card>
        )}
      </div>

      {workspaces.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Create your first workspace"
          description="Workspaces organize your projects, team members, and bug reports in one isolated space."
          action={
            <Button asChild size="sm">
              <Link href="/workspaces/new">
                <Plus className="h-4 w-4" />
                Create workspace
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[#e7e9ea]">
            Your workspaces
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {workspaces.map((ws) => (
              <Link key={ws.id} href={`/workspaces/${ws.id}`} prefetch={true}>
                <Card className="transition-all duration-150 hover:border-zinc-600 hover:bg-[#1d2025]">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">
                        {ws.name}
                      </div>
                      <div className="mt-0.5 text-xs text-[#71767b]">
                        /{ws.slug}
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {ws.plan}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#2f3336] bg-black text-white">
              <Bug className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">
                BugSnap Capture Chrome Extension
              </div>
              <p className="mt-0.5 text-xs text-[#71767b]">
                Capture or snip any webpage, pixelate sensitive info, and open
                directly in the full-screen editor.
              </p>
            </div>
          </div>
          {workspaces[0] ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/workspaces/${workspaces[0].id}/projects`}>
                <FolderKanban className="h-4 w-4" />
                View projects
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
