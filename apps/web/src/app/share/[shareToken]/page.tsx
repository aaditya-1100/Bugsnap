"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Bug } from "lucide-react";

import { LoadingSkeleton } from "@/components/shared/loading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_BASE_URL, api } from "@/lib/api";
import type { Report } from "@/lib/types";

export default function SharedReportPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSharedReport(shareToken)
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [shareToken]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <LoadingSkeleton rows={4} />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-md p-16 text-center text-sm text-zinc-400">
        This shared report link is invalid or expired.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bug className="h-4 w-4 text-violet-400" />
          BugSnap Shared Report
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {report.severity}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {report.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-zinc-50">{report.title}</h1>
      {report.page_url ? (
        <p className="text-xs text-zinc-400">{report.page_url}</p>
      ) : null}

      {report.attachments.map((att) => {
        const src = att.file_path.startsWith("http")
          ? att.file_path
          : `${API_BASE_URL}${att.file_path}`;
        return (
          <Card key={att.id}>
            <CardContent className="p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={att.file_name}
                className="max-h-[480px] w-full rounded bg-zinc-950 object-contain"
              />
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-300">
          {report.description ? (
            <div>
              <div className="text-xs font-medium text-zinc-500">Description</div>
              <p className="mt-1 whitespace-pre-wrap">{report.description}</p>
            </div>
          ) : null}
          {report.observed_behavior ? (
            <div>
              <div className="text-xs font-medium text-zinc-500">Observed</div>
              <p className="mt-1 whitespace-pre-wrap">{report.observed_behavior}</p>
            </div>
          ) : null}
          {report.reproduction_steps ? (
            <div>
              <div className="text-xs font-medium text-zinc-500">
                Reproduction Steps
              </div>
              <p className="mt-1 whitespace-pre-wrap">
                {report.reproduction_steps}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
