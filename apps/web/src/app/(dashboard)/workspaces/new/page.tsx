"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useDashboard } from "@/components/layout/dashboard-context";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";

export default function NewWorkspacePage() {
  const router = useRouter();
  const { refreshWorkspaces } = useDashboard();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const ws = await api.createWorkspace({ name: name.trim() });
      await refreshWorkspaces();
      router.push(`/workspaces/${ws.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create workspace."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Create workspace"
        description="A workspace holds your projects, members, and bug reports."
      />
      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-5">
            {error ? (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="name">Workspace name</Label>
              <Input
                id="name"
                placeholder="Acme Studio"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create workspace"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
