import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Send, ShieldCheck, X } from "lucide-react";

import {
  ExtensionApiError,
  fetchProjects,
  fetchWorkspaces,
  submitBugReport,
} from "../lib/api";
import {
  clearPendingCapture,
  getAuthSession,
  getPendingCapture,
  getSelectionPrefs,
  setSelectionPrefs,
} from "../lib/storage";
import {
  AnnotationEditor,
  type AnnotationEditorHandle,
} from "../sidepanel/components/AnnotationEditor";
import type { CaptureContext, Project, Workspace } from "../types";

export default function EditorApp() {
  const editorRef = useRef<AnnotationEditorHandle | null>(null);

  const [loading, setLoading] = useState(true);
  const [capture, setCapture] = useState<CaptureContext | null>(null);
  const [apiUrl, setApiUrl] = useState("");
  const [token, setToken] = useState<string | null>(null);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [projectId, setProjectId] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdReportId, setCreatedReportId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const [pending, session, prefs] = await Promise.all([
        getPendingCapture(),
        getAuthSession(),
        getSelectionPrefs(),
      ]);

      setCapture(pending);
      setApiUrl(session.apiUrl);
      setToken(session.token);

      if (pending) {
        setTitle(
          pending.pageTitle
            ? `Bug on ${pending.pageTitle.slice(0, 80)}`
            : "Visual bug report"
        );
      }

      if (session.token) {
        try {
          const wsList = await fetchWorkspaces(session.apiUrl, session.token);
          setWorkspaces(wsList);
          const chosenWs =
            wsList.find((w) => w.id === prefs.workspaceId)?.id ||
            wsList[0]?.id ||
            "";
          setWorkspaceId(chosenWs);
          if (chosenWs) {
            const projList = await fetchProjects(
              session.apiUrl,
              session.token,
              chosenWs
            );
            setProjects(projList);
            const chosenProj =
              projList.find((p) => p.id === prefs.projectId)?.id ||
              projList[0]?.id ||
              "";
            setProjectId(chosenProj);
          }
        } catch {
          setError("Session expired. Please sign in from the BugSnap side panel.");
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  async function handleWorkspaceChange(newWsId: string) {
    setWorkspaceId(newWsId);
    await setSelectionPrefs({ workspaceId: newWsId });
    if (!token || !newWsId) return;
    const projList = await fetchProjects(apiUrl, token, newWsId);
    setProjects(projList);
    const firstProj = projList[0]?.id || "";
    setProjectId(firstProj);
    await setSelectionPrefs({ projectId: firstProj });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!capture || !token || !workspaceId || !projectId || !editorRef.current) {
      setError("Missing workspace/project or capture data.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const blob = await editorRef.current.exportWebPBlob();
      const created = await submitBugReport({
        baseUrl: apiUrl,
        token,
        workspaceId,
        projectId,
        title: title.trim() || "Visual bug report",
        description: description.trim(),
        severity,
        pageUrl: capture.pageUrl,
        browserInfo: capture.browserInfo,
        viewportInfo: capture.viewportInfo,
        consoleErrors: capture.consoleErrors,
        screenshotBlob: blob,
      });
      await clearPendingCapture();
      setCreatedReportId(created.id);
    } catch (err) {
      setError(
        err instanceof ExtensionApiError
          ? err.message
          : "Failed to submit report. Please retry."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-sm text-[#71767b]">
        Loading BugSnap Editor...
      </div>
    );
  }

  if (!capture && !createdReportId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6 text-center">
        <p className="text-sm text-[#e7e9ea]">No pending screenshot capture found.</p>
        <p className="mt-1 text-xs text-[#71767b]">
          Open the BugSnap side panel and capture or snip a page first.
        </p>
      </div>
    );
  }

  if (createdReportId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#2f3336] bg-[#16181c] p-6 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-emerald-400" />
          <h1 className="text-lg font-semibold text-white">Report submitted</h1>
          <p className="mt-1 text-sm text-[#71767b]">
            Your annotated &amp; redacted screenshot is saved in BugSnap.
          </p>
          <p className="mt-3 rounded-lg border border-[#2f3336] bg-black px-3 py-2 font-mono text-xs text-[#e7e9ea]">
            ID: {createdReportId}
          </p>
          <button
            type="button"
            onClick={() => window.close()}
            className="mt-5 w-full rounded-full bg-white py-2.5 text-sm font-semibold text-black hover:bg-zinc-200"
          >
            Close Editor Tab
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-[#e7e9ea] lg:h-screen lg:overflow-hidden">
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-[#2f3336] bg-black px-5 py-2.5">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo-icon.png"
            alt="BugSnap"
            className="h-7 w-7 rounded-md bg-white object-contain p-0.5"
          />
          <span className="text-sm font-semibold tracking-tight text-white">
            BugSnap
          </span>
        </div>
        <button
          type="button"
          onClick={() => window.close()}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#2f3336] px-3 py-1.5 text-xs text-[#e7e9ea] hover:bg-[#16181c]"
        >
          <X className="h-3.5 w-3.5" />
          Discard
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="flex min-h-0 flex-1 flex-col p-4">
          {capture ? (
            <AnnotationEditor
              ref={editorRef}
              imageDataUrl={capture.dataUrl}
            />
          ) : null}
        </main>

        <aside className="w-full shrink-0 overflow-y-auto border-t border-[#2f3336] bg-[#16181c] p-5 lg:w-[350px] lg:border-l lg:border-t-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Bug Details</h2>
              <p className="mt-0.5 text-xs text-[#71767b]">
                Add context before sending to your BugSnap workspace.
              </p>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs text-[#71767b]">Workspace</label>
                <div className="relative">
                  <select
                    value={workspaceId}
                    onChange={(e) => handleWorkspaceChange(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-[#2f3336] bg-black px-3 py-2 pr-7 text-xs text-white transition-colors hover:border-zinc-500 focus:border-white focus:outline-none"
                    required
                  >
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id} className="bg-[#16181c] text-white">
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71767b]" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#71767b]">Project</label>
                <div className="relative">
                  <select
                    value={projectId}
                    onChange={(e) => {
                      setProjectId(e.target.value);
                      setSelectionPrefs({ projectId: e.target.value });
                    }}
                    className="w-full appearance-none rounded-lg border border-[#2f3336] bg-black px-3 py-2 pr-7 text-xs text-white transition-colors hover:border-zinc-500 focus:border-white focus:outline-none"
                    required
                  >
                    {projects.length === 0 ? (
                      <option value="" className="bg-[#16181c] text-white">No projects</option>
                    ) : (
                      projects.map((p) => (
                        <option key={p.id} value={p.id} className="bg-[#16181c] text-white">
                          {p.name}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71767b]" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-[#71767b]">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-[#2f3336] bg-black px-3 py-2 text-xs text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-[#71767b]">
                What happened? (optional)
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you expected vs what actually happened..."
                className="w-full rounded-lg border border-[#2f3336] bg-black px-3 py-2 text-xs text-white placeholder:text-[#71767b]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-[#71767b]">Severity</label>
              <div className="relative">
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-[#2f3336] bg-black px-3 py-2 pr-8 text-xs text-white transition-colors hover:border-zinc-500 focus:border-white focus:outline-none"
                >
                  <option value="critical" className="bg-[#16181c] text-white">Critical</option>
                  <option value="high" className="bg-[#16181c] text-white">High</option>
                  <option value="medium" className="bg-[#16181c] text-white">Medium</option>
                  <option value="low" className="bg-[#16181c] text-white">Low</option>
                  <option value="unknown" className="bg-[#16181c] text-white">Unknown</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71767b]" />
              </div>
            </div>

            {capture ? (
              <div className="space-y-1 rounded-xl border border-[#2f3336] bg-black p-3 text-[11px] text-[#71767b]">
                <div className="truncate text-[#e7e9ea]">
                  URL: {capture.pageUrl || "N/A"}
                </div>
                <div>
                  Viewport: {capture.viewportInfo.width}×
                  {capture.viewportInfo.height} · Console errors:{" "}
                  {capture.consoleErrors.length}
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !projectId}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Submitting..." : "Send Report"}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#71767b]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Redactions are permanently baked in before upload.
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
