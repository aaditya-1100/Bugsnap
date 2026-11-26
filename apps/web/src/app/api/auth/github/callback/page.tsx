"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { api, ApiError } from "@/lib/api";

function GitHubCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const workspaceId = searchParams.get("state");
    if (!code || !workspaceId) {
      setError("Missing GitHub OAuth parameters.");
      return;
    }

    api
      .completeGitHubCallback(workspaceId, code)
      .then(() => {
        router.replace(`/workspaces/${workspaceId}/settings`);
      })
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : "GitHub connection failed."
        );
      });
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-sm text-zinc-300">
      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">
          {error}
        </div>
      ) : (
        "Connecting GitHub to your BugSnap workspace..."
      )}
    </div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-sm text-zinc-400">
          Loading...
        </div>
      }
    >
      <GitHubCallbackInner />
    </Suspense>
  );
}
