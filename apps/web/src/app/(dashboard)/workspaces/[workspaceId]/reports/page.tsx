"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Bug, ExternalLink, Search } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Report } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  triaged: "Triaged",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const SEVERITY_VARIANT: Record<string, "destructive" | "warning" | "secondary" | "default"> = {
  critical: "destructive",
  high: "warning",
  medium: "default",
  low: "secondary",
  unknown: "secondary",
};

export default function ReportsListPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getReports(workspaceId, {
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        severity: severityFilter !== "all" ? severityFilter : undefined,
      })
      .then((res) => {
        setReports(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [workspaceId, search, statusFilter, severityFilter]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Bug Reports"
        description={`${total} captured report${total === 1 ? "" : "s"} in this workspace.`}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by title, description, or URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="triaged">Triaged</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={Bug}
          title="No bug reports found"
          description="Capture a screenshot with the BugSnap Chrome extension or adjust your filters."
        />
      ) : (
        <div className="divide-y divide-zinc-800/80 rounded-lg border border-zinc-800 bg-zinc-900/40">
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/workspaces/${workspaceId}/reports/${report.id}`}
              className="flex flex-col justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-900 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-zinc-100">
                    {report.title}
                  </span>
                  {report.github_issue_url ? (
                    <span className="inline-flex items-center gap-1 rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300">
                      <ExternalLink className="h-2.5 w-2.5" />#
                      {report.github_issue_number}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span className="truncate max-w-md">
                    {report.page_url || "No URL"}
                  </span>
                  <span>·</span>
                  <span>
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge
                  variant={SEVERITY_VARIANT[report.severity] || "secondary"}
                  className="capitalize"
                >
                  {report.severity}
                </Badge>
                <Badge variant="outline">
                  {STATUS_LABELS[report.status] || report.status}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
