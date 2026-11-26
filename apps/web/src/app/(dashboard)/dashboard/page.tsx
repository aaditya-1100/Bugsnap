"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bug, FolderKanban, Layers, Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Workspace } from "@/lib/types";

export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getWorkspaces()
      .then(setWorkspaces)
      .catch(() => setWorkspaces([]))
      .finally(() => setLoading(false));
  }, []);

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
            <CardTitle className="text-xs font-medium text-zinc-400">
              Workspaces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-zinc-50">
              {workspaces.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400">
              Open Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-zinc-50">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400">
              Resolved This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-zinc-50">0</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <LoadingSkeleton rows={3} />
      ) : workspaces.length === 0 ? (
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
          <h2 className="text-sm font-medium text-zinc-300">Your workspaces</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {workspaces.map((ws) => (
              <Link key={ws.id} href={`/workspaces/${ws.id}`}>
                <Card className="transition-colors hover:border-zinc-700 hover:bg-zinc-900">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-100">
                        {ws.name}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">
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

      <Card className="border-zinc-800/70 bg-zinc-900/40">
        <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-violet-400">
              <Bug className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-100">
                BugSnap Capture Chrome Extension
              </div>
              <p className="mt-0.5 text-xs text-zinc-400">
                Load <code className="text-zinc-300">apps/extension/dist</code>{" "}
                in Chrome to capture, annotate, and redact screenshots.
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
