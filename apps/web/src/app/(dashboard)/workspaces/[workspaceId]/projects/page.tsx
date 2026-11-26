"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FolderKanban, Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";

export default function ProjectsListPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getProjects(workspaceId)
      .then(setProjects)
      .finally(() => setLoading(false));
  }, [workspaceId]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Projects"
        description="Websites and applications tracked in this workspace."
        actions={
          <Button size="sm" asChild>
            <Link href={`/workspaces/${workspaceId}/projects/new`}>
              <Plus className="h-4 w-4" />
              New project
            </Link>
          </Button>
        }
      />

      {loading ? (
        <LoadingSkeleton rows={3} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects in this workspace"
          description="Add your first website or app to start organizing bug reports."
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
          {projects.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-start justify-between p-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-100">
                    {p.name}
                  </div>
                  {p.url ? (
                    <div className="mt-0.5 truncate text-xs text-zinc-500">
                      {p.url}
                    </div>
                  ) : null}
                  {p.description ? (
                    <p className="mt-2 text-xs text-zinc-400">{p.description}</p>
                  ) : null}
                </div>
                <Badge variant={p.is_active ? "success" : "secondary"}>
                  {p.is_active ? "Active" : "Archived"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
