"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  Copy,
  ExternalLink,
  Github,
  MessageSquare,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { API_BASE_URL, ApiError, api } from "@/lib/api";
import type { Comment, Report, ReportSeverity, ReportStatus } from "@/lib/types";

export default function ReportDetailPage() {
  const { workspaceId, reportId } = useParams<{
    workspaceId: string;
    reportId: string;
  }>();

  const [report, setReport] = useState<Report | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [repos, setRepos] = useState<{ id: number; full_name: string }[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Editable report fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [observed, setObserved] = useState("");
  const [expected, setExpected] = useState("");
  const [steps, setSteps] = useState("");
  const [severity, setSeverity] = useState<ReportSeverity>("unknown");
  const [commentText, setCommentText] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  function syncForm(r: Report) {
    setTitle(r.title);
    setDescription(r.description || "");
    setObserved(r.observed_behavior || "");
    setExpected(r.expected_behavior || "");
    setSteps(r.reproduction_steps || "");
    setSeverity(r.severity);
  }

  useEffect(() => {
    Promise.all([
      api.getReport(workspaceId, reportId),
      api.getComments(workspaceId, reportId),
      api.getGitHubRepos(workspaceId).catch(() => []),
    ])
      .then(([r, c, repoList]) => {
        setReport(r);
        syncForm(r);
        setComments(c);
        setRepos(repoList);
        if (repoList[0]) setSelectedRepo(repoList[0].full_name);
      })
      .finally(() => setLoading(false));
  }, [workspaceId, reportId]);

  async function handleStatusChange(newStatus: ReportStatus) {
    if (!report) return;
    setError(null);
    try {
      const updated = await api.updateReportStatus(
        workspaceId,
        report.id,
        newStatus
      );
      setReport(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status");
    }
  }

  async function handleSaveReport(e: React.FormEvent) {
    e.preventDefault();
    if (!report) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.updateReport(workspaceId, report.id, {
        title,
        description,
        observed_behavior: observed,
        expected_behavior: expected,
        reproduction_steps: steps,
        severity,
      });
      setReport(updated);
      setNotice("Report changes saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save report");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateAI() {
    if (!report) return;
    setAiLoading(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.generateAIReport(workspaceId, report.id);
      setReport(updated);
      syncForm(updated);
      setNotice("AI draft generated. Please review and approve before exporting.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "AI generation failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleApproveReview() {
    if (!report) return;
    setError(null);
    try {
      const updated = await api.markAIReviewed(workspaceId, report.id, true);
      setReport(updated);
      setNotice("AI report approved for export.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Approval failed");
    }
  }

  async function handleShare() {
    if (!report) return;
    setError(null);
    try {
      const updated = await api.generateShareLink(workspaceId, report.id);
      setReport(updated);
      if (updated.share_token) {
        const shareUrl = `${window.location.origin}/share/${updated.share_token}`;
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create share link");
    }
  }

  async function handleExportGitHub() {
    if (!report || !selectedRepo) return;
    setExporting(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.exportToGitHub(
        workspaceId,
        report.id,
        selectedRepo
      );
      setReport(updated);
      setNotice("GitHub issue created.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "GitHub export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!report || !commentText.trim()) return;
    try {
      const created = await api.addComment(
        workspaceId,
        report.id,
        commentText.trim()
      );
      setComments((prev) => [...prev, created]);
      setCommentText("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to post comment");
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!report) return;
    try {
      await api.deleteComment(workspaceId, report.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete comment");
    }
  }

  if (loading) return <LoadingSkeleton rows={5} />;
  if (!report) return <div className="text-sm text-zinc-400">Report not found.</div>;

  const missingInfo =
    (report.ai_generated_content?.missing_information as string[] | undefined) ||
    [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={report.title}
        description={report.page_url || "Captured bug report"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={report.status}
              onValueChange={(v) => handleStatusChange(v as ReportStatus)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="triaged">Triaged</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleShare}>
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              {copied ? "Copied link" : "Share link"}
            </Button>
            <Button size="sm" onClick={handleGenerateAI} disabled={aiLoading}>
              <Sparkles className="h-4 w-4" />
              {aiLoading
                ? "Generating..."
                : report.ai_generated_content
                  ? "Regenerate AI"
                  : "Generate AI Report"}
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {report.attachments.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Screenshot Evidence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.attachments.map((att) => {
                  const src = att.file_path.startsWith("http")
                    ? att.file_path
                    : `${API_BASE_URL}${att.file_path}`;
                  return (
                    <a
                      key={att.id}
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-md border border-zinc-800"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={att.file_name}
                        className="max-h-[420px] w-full bg-zinc-950 object-contain"
                      />
                    </a>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Report Details</CardTitle>
                  <CardDescription>
                    All fields are editable. AI drafts require human review.
                  </CardDescription>
                </div>
                {report.ai_generated_content ? (
                  <Badge variant={report.ai_reviewed ? "success" : "warning"}>
                    {report.ai_reviewed ? "AI Reviewed" : "Needs Review"}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveReport} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Observed Behavior</Label>
                    <Textarea
                      rows={3}
                      value={observed}
                      onChange={(e) => setObserved(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Expected Behavior</Label>
                    <Textarea
                      rows={3}
                      value={expected}
                      onChange={(e) => setExpected(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Reproduction Steps</Label>
                  <Textarea
                    rows={4}
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Select
                    value={severity}
                    onValueChange={(v) => setSeverity(v as ReportSeverity)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    {report.ai_generated_content && !report.ai_reviewed ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleApproveReview}
                      >
                        Approve AI Draft
                      </Button>
                    ) : null}
                    <Button type="submit" size="sm" disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </form>

              {missingInfo.length > 0 ? (
                <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                  <div className="font-semibold">Missing Information</div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {missingInfo.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddComment} className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <Button type="submit" size="sm">
                  Post
                </Button>
              </form>
              <div className="space-y-2">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start justify-between rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm"
                  >
                    <div>
                      <div className="text-xs font-medium text-zinc-300">
                        {c.author_name || c.author_email} ·{" "}
                        <span className="text-zinc-500">
                          {new Date(c.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-200">{c.content}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-500 hover:text-red-400"
                      onClick={() => handleDeleteComment(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Github className="h-4 w-4" />
                GitHub Export
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {report.github_issue_url ? (
                <a
                  href={report.github_issue_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-white underline-offset-4 hover:underline"
                >
                  Issue #{report.github_issue_number}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : repos.length === 0 ? (
                <p className="text-zinc-400">
                  Connect GitHub in Workspace Settings to export issues.
                </p>
              ) : (
                <>
                  <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select repository" />
                    </SelectTrigger>
                    <SelectContent>
                      {repos.map((r) => (
                        <SelectItem key={r.id} value={r.full_name}>
                          {r.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={
                      exporting ||
                      (Boolean(report.ai_generated_content) && !report.ai_reviewed)
                    }
                    onClick={handleExportGitHub}
                  >
                    {exporting ? "Exporting..." : "Create GitHub Issue"}
                  </Button>
                  {report.ai_generated_content && !report.ai_reviewed ? (
                    <p className="text-[11px] text-amber-400">
                      Approve the AI draft before exporting.
                    </p>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Technical Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-zinc-400">
              <div>
                <span className="text-zinc-500">URL: </span>
                <span className="break-all text-zinc-200">
                  {report.page_url || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Viewport: </span>
                <span className="text-zinc-200">
                  {JSON.stringify(report.viewport_info)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Browser: </span>
                <span className="break-all text-zinc-200">
                  {String(report.browser_info?.userAgent || "N/A")}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Console Errors: </span>
                <span className="text-zinc-200">
                  {report.console_errors?.length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
