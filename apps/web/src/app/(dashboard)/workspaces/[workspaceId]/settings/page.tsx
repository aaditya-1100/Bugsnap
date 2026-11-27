"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Github, Trash2, UserPlus } from "lucide-react";

import { LoadingSkeleton } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, api } from "@/lib/api";
import type { Workspace, WorkspaceMember } from "@/lib/types";

export default function WorkspaceSettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [ghConnections, setGhConnections] = useState<
    { id: string; github_username: string; connected_at: string }[]
  >([]);
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getWorkspace(workspaceId),
      api.getMembers(workspaceId),
      api.getGitHubConnections(workspaceId).catch(() => []),
    ])
      .then(([ws, mems, conns]) => {
        setWorkspace(ws);
        setName(ws.name);
        setMembers(mems);
        setGhConnections(conns);
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const updated = await api.updateWorkspace(workspaceId, { name });
      setWorkspace(updated);
      setMessage("Workspace name updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed.");
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const member = await api.inviteMember(workspaceId, {
        email: inviteEmail,
        role: inviteRole,
      });
      setMembers((prev) => [...prev, member]);
      setInviteEmail("");
      setMessage("Member added to workspace.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invite failed.");
    }
  }

  async function handleRemove(userId: string) {
    setError(null);
    try {
      await api.removeMember(workspaceId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Remove failed.");
    }
  }

  async function handleConnectGitHub() {
    setError(null);
    try {
      const { url } = await api.getGitHubAuthUrl(workspaceId);
      window.location.href = url;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "GitHub OAuth is not configured on the server."
      );
    }
  }

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Workspace settings"
        description={workspace ? `Slug: /${workspace.slug}` : undefined}
      />

      {message ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>Update your workspace display name.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="wsName">Workspace name</Label>
              <Input
                id="wsName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" size="sm">
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>
            Invite registered users to collaborate in this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleInvite} className="flex flex-wrap gap-2">
            <Input
              type="email"
              placeholder="teammate@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 min-w-[200px]"
              required
            />
            <Select
              value={inviteRole}
              onValueChange={(v) => setInviteRole(v as "admin" | "member")}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" size="sm">
              <UserPlus className="h-4 w-4" />
              Add
            </Button>
          </form>

          <div className="divide-y divide-zinc-800 rounded-md border border-zinc-800">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between px-3 py-2.5 text-sm"
              >
                <div>
                  <div className="font-medium text-zinc-100">
                    {m.full_name || m.email}
                  </div>
                  <div className="text-xs text-zinc-500">{m.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {m.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-red-400"
                    onClick={() => handleRemove(m.user_id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Github className="h-4 w-4" />
            GitHub Integration
          </CardTitle>
          <CardDescription>
            Connect GitHub to export reviewed bug reports directly as issues.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          {ghConnections.length > 0 ? (
            <div className="text-sm text-zinc-200">
              Connected as{" "}
              <span className="font-semibold text-white">
                @{ghConnections[0].github_username}
              </span>
            </div>
          ) : (
            <div className="text-xs text-zinc-400">
              No GitHub account connected yet.
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleConnectGitHub}>
            <Github className="h-4 w-4" />
            {ghConnections.length > 0 ? "Reconnect GitHub" : "Connect GitHub"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
