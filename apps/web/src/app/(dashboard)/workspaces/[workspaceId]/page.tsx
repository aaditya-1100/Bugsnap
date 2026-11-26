"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FolderKanban, Plus, Settings } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Project, Workspace } from "@/lib/types";

export default function WorkspaceDetailPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getWorkspace(workspaceId),
      api.getProjects(workspaceId),
    ])
      .then(([ws, projs]) => {
        setWorkspace(ws);
        setProjects(projs);
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={workspace?.name || "Workspace"}
        description={workspace ? `Plan: ${workspace.plan}` : undefined}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/workspaces/${workspaceId}/settings`}>
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/workspaces/${workspaceId}/projects/new`}>
                <Plus className="h-4 w-4" />
                New project
              </Link>
            </Button>
          </>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project for the website or web app you want to collect bug reports for."
          action={
            <Button size="sm" asChild>
              <Link href={`/workspaces/${workspaceId}/projects/new`}>
                <Plus className="h-4 w-4" />
                Create project
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="flex items-start justify-between p-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-100">
                    {project.name}
                  </div>
                  {project.url ? (
                    <div className="mt-0.5 truncate text-xs text-zinc-500">
                      {project.url}
                    </div>
                  ) : null}
                  {project.description ? (
                    <p className="mt-2 line-clamp-2 text-xs text-zinc-400">
                      {project.description}
                    </p>
                  ) : null}
                </div>
                <Badge variant={project.is_active ? "success" : "secondary"}>
                  {project.is_active ? "Active" : "Archived"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
