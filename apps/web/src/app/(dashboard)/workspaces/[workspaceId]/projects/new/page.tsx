"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api } from "@/lib/api";

export default function NewProjectPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await api.createProject(workspaceId, {
        name: name.trim(),
        url: url.trim() || undefined,
        description: description.trim() || undefined,
      });
      router.push(`/workspaces/${workspaceId}/projects`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create project."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="New project"
        description="Add a website or application to track bug reports."
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
              <Label htmlFor="name">Project name</Label>
              <Input
                id="name"
                placeholder="Web App"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="url">Target URL (optional)</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://app.example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Primary SaaS dashboard..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
              {loading ? "Creating..." : "Create project"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
