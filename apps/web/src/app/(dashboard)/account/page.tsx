"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";

import { useDashboard } from "@/components/layout/dashboard-context";
import { PageHeader } from "@/components/shared/page-header";
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
import { ApiError, api } from "@/lib/api";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, workspaces, refreshUser } = useDashboard();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
  }, [user]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await api.updateMe({ full_name: fullName.trim() });
      await refreshUser();
      setMessage("Account profile updated.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await api.logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Account Settings"
        description="Manage your personal profile, security, and general preferences."
      />

      {message ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-400">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-400">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>
            Your name and email associated with BugSnap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" value={user?.email || ""} disabled />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General &amp; Security</CardTitle>
          <CardDescription>
            Session status and workspace overview.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-[#2f3336] bg-black px-4 py-3">
            <div>
              <div className="font-medium text-white">Workspaces joined</div>
              <div className="text-xs text-[#71767b]">
                {workspaces.length} active workspace
                {workspaces.length === 1 ? "" : "s"}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              JWT Authenticated
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-sm font-medium text-white">Sign out</div>
              <div className="text-xs text-[#71767b]">
                End your current browser session on this device.
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
