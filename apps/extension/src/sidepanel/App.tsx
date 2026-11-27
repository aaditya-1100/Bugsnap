import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Crop,
  LogOut,
  Send,
  ShieldCheck,
} from "lucide-react";

import {
  ExtensionApiError,
  createProjectExtension,
  createWorkspaceExtension,
  fetchProjects,
  fetchWorkspaces,
  loginExtension,
  registerExtension,
  submitBugReport,
} from "../lib/api";
import {
  collectBrowserMetadata,
  getActiveTabPageContext,
} from "../lib/metadata";
import {
  cropDataUrlToRegion,
  injectedRegionSelector,
  type SelectedRegion,
} from "../lib/region-selector";
import {
  clearAuthSession,
  DEFAULT_API_URL,
  getAuthSession,
  getSelectionPrefs,
  setAuthSession,
  setSelectionPrefs,
} from "../lib/storage";
import type { CaptureContext, Project, Workspace } from "../types";
import {
  AnnotationEditor,
  type AnnotationEditorHandle,
} from "./components/AnnotationEditor";

type ViewState = "loading" | "login" | "capture" | "edit" | "success";

export default function App() {
  const editorRef = useRef<AnnotationEditorHandle | null>(null);

  const [view, setView] = useState<ViewState>("loading");
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Login / Signup form
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Workspace / project selection
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [consoleConsent, setConsoleConsent] = useState(false);

  // Capture & report form
  const [capture, setCapture] = useState<CaptureContext | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdReportId, setCreatedReportId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const [session, prefs] = await Promise.all([
        getAuthSession(),
        getSelectionPrefs(),
      ]);
      setApiUrl(session.apiUrl);
      setConsoleConsent(prefs.consoleConsent);

      if (!session.token) {
        setView("login");
        return;
      }

      setToken(session.token);
      setUserEmail(session.email);
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
        setView("capture");
      } catch {
        await clearAuthSession();
        setToken(null);
        setView("login");
      }
    }
    init();
  }, []);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);

    if (authMode === "signup") {
      if (password.length < 8) {
        setAuthError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setAuthError("Passwords do not match.");
        return;
      }
    }

    setAuthLoading(true);
    try {
      const res =
        authMode === "signup"
          ? await registerExtension(apiUrl, email, password, fullName.trim())
          : await loginExtension(apiUrl, email, password);

      await setAuthSession(res.access_token, res.user.email, apiUrl);
      setToken(res.access_token);
      setUserEmail(res.user.email);

      let wsList = await fetchWorkspaces(apiUrl, res.access_token);
      if (wsList.length === 0) {
        const defaultWs = await createWorkspaceExtension(
          apiUrl,
          res.access_token,
          "My Workspace"
        );
        wsList = [defaultWs];
      }
      setWorkspaces(wsList);
      const firstWs = wsList[0].id;
      setWorkspaceId(firstWs);

      let projList = await fetchProjects(apiUrl, res.access_token, firstWs);
      if (projList.length === 0) {
        const defaultProj = await createProjectExtension(
          apiUrl,
          res.access_token,
          firstWs,
          "Default Project"
        );
        projList = [defaultProj];
      }
      setProjects(projList);
      setProjectId(projList[0].id);
      setView("capture");
    } catch (err) {
      setAuthError(
        err instanceof ExtensionApiError
          ? err.message
          : `Cannot reach BugSnap API at ${apiUrl}. Make sure the backend server is running.`
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await clearAuthSession();
    setToken(null);
    setUserEmail(null);
    setCapture(null);
    setView("login");
  }

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

  async function handleCapture(mode: "full" | "region" = "full") {
    setSubmitError(null);
    try {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (
        !activeTab?.id ||
        (activeTab.url &&
          (activeTab.url.startsWith("chrome://") ||
            activeTab.url.startsWith("edge://") ||
            activeTab.url.startsWith("chrome-extension://")))
      ) {
        setSubmitError(
          "Browser system pages (chrome://) cannot be captured. Switch to a regular website tab and try again."
        );
        return;
      }

      let region: SelectedRegion | null = null;
      if (mode === "region") {
        const [selectionResult] = await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: injectedRegionSelector,
        });
        region = (selectionResult?.result as SelectedRegion | null) ?? null;
        if (!region) {
          // User pressed Esc or cancelled selection
          return;
        }
      }

      let dataUrl = await chrome.tabs.captureVisibleTab(
        chrome.windows.WINDOW_ID_CURRENT,
        { format: "png" }
      );
      if (region) {
        dataUrl = await cropDataUrlToRegion(dataUrl, region);
      }

      const ctx = await getActiveTabPageContext(consoleConsent);
      setCapture({
        dataUrl,
        pageUrl: ctx.pageUrl,
        pageTitle: ctx.pageTitle,
        capturedAt: new Date().toISOString(),
        browserInfo: collectBrowserMetadata(),
        viewportInfo: ctx.viewportInfo,
        consoleErrors: ctx.consoleErrors,
      });
      setTitle(ctx.pageTitle ? `Bug on ${ctx.pageTitle.slice(0, 80)}` : "Visual bug report");
      setDescription("");
      setView("edit");
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Unable to capture this tab (restricted browser page)."
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!capture || !token || !workspaceId || !projectId || !editorRef.current) {
      setSubmitError("Please select a workspace and project first.");
      return;
    }

    setSubmitError(null);
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
      setCreatedReportId(created.id);
      setView("success");
    } catch (err) {
      setSubmitError(
        err instanceof ExtensionApiError
          ? err.message
          : "Failed to submit report. Please retry."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-black p-4 text-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <img
            src="/logo-icon.png"
            alt="BugSnap"
            className="h-7 w-7 rounded-md bg-white object-contain p-0.5"
          />
          <span className="text-sm font-semibold tracking-tight">BugSnap</span>
        </div>
        {userEmail ? (
          <button
            type="button"
            onClick={handleLogout}
            title={`Signed in as ${userEmail} (Sign out)`}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        ) : null}
      </header>

      {view === "loading" ? (
        <div className="flex flex-1 items-center justify-center text-xs text-zinc-400">
          Loading BugSnap...
        </div>
      ) : null}

      {view === "login" ? (
        <form onSubmit={handleAuthSubmit} className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-semibold">
                {authMode === "login" ? "Sign in to BugSnap" : "Create BugSnap account"}
              </h1>
              <p className="mt-0.5 text-xs text-zinc-400">
                {authMode === "login"
                  ? "Connect the extension to your BugSnap account."
                  : "Sign up and start capturing bugs in seconds."}
              </p>
            </div>
          </div>
          {authError ? (
            <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-400">
              {authError}
            </div>
          ) : null}
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">API URL</label>
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100"
              required
            />
          </div>
          {authMode === "signup" ? (
            <div className="space-y-1">
              <label className="text-xs text-zinc-300">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aaditya"
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100"
              />
            </div>
          ) : null}
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={authMode === "signup" ? "Min. 8 characters" : "••••••••"}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100"
              required
            />
          </div>
          {authMode === "signup" ? (
            <div className="space-y-1">
              <label className="text-xs text-zinc-300">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100"
                required
              />
            </div>
          ) : null}
          <button
            type="submit"
            disabled={authLoading}
            className="w-full rounded-md bg-white py-2 text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
          >
            {authLoading
              ? authMode === "login"
                ? "Signing in..."
                : "Creating account..."
              : authMode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
          <p className="text-center text-xs text-zinc-400">
            {authMode === "login" ? (
              <>
                New to BugSnap?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signup");
                    setAuthError(null);
                  }}
                  className="text-white underline-offset-4 hover:underline"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError(null);
                  }}
                  className="text-white underline-offset-4 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      ) : null}

      {view === "capture" ? (
        <div className="mt-5 flex flex-1 flex-col gap-4">
          {submitError ? (
            <div className="flex items-start gap-2 rounded border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-400">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          ) : null}

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-center">
            <Camera className="mx-auto mb-2 h-6 w-6 text-white" />
            <h1 className="text-sm font-semibold">Capture screenshot</h1>
            <p className="mt-1 text-xs text-zinc-400">
              Capture the full visible screen or drag a box to snip a specific
              area.
            </p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => handleCapture("region")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-zinc-200"
              >
                <Crop className="h-3.5 w-3.5" />
                Select Area (Snip)
              </button>
              <button
                type="button"
                onClick={() => handleCapture("full")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 bg-black px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-900"
              >
                <Camera className="h-3.5 w-3.5" />
                Capture Visible Screen
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs">
            <input
              type="checkbox"
              checked={consoleConsent}
              onChange={(e) => {
                const checked = e.target.checked;
                setConsoleConsent(checked);
                setSelectionPrefs({ consoleConsent: checked });
              }}
              className="mt-0.5 rounded border-zinc-700 bg-zinc-900 accent-white"
            />
            <div>
              <div className="font-medium text-zinc-200">
                Include JavaScript console errors
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                Opt-in only. Captures uncaught errors/rejections—never cookies,
                storage, or network bodies.
              </p>
            </div>
          </label>

          <div className="mt-auto flex items-center gap-1.5 text-[11px] text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Privacy-first capture · Signed in as {userEmail}
          </div>
        </div>
      ) : null}

      {view === "edit" && capture ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {submitError ? (
            <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-400">
              {submitError}
            </div>
          ) : null}

          <AnnotationEditor ref={editorRef} imageDataUrl={capture.dataUrl} />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400">Workspace</label>
              <select
                value={workspaceId}
                onChange={(e) => handleWorkspaceChange(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
                required
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400">Project</label>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setSelectionPrefs({ projectId: e.target.value });
                }}
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
                required
              >
                {projects.length === 0 ? (
                  <option value="">No projects</option>
                ) : (
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400">
              What happened? (optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you expected vs what happened..."
              className="w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          <div className="rounded border border-zinc-800/80 bg-zinc-900/40 p-2 text-[11px] text-zinc-400">
            <div className="truncate">URL: {capture.pageUrl || "N/A"}</div>
            <div>
              Viewport: {capture.viewportInfo.width}×{capture.viewportInfo.height} ·{" "}
              Console errors: {capture.consoleErrors.length}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setView("capture")}
              className="flex-1 rounded-md border border-zinc-800 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
            >
              Retake
            </button>
            <button
              type="submit"
              disabled={submitting || !projectId}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-white py-2 text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      ) : null}

      {view === "success" ? (
        <div className="mt-8 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-emerald-400" />
          <h2 className="text-sm font-semibold text-zinc-100">
            Report submitted
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Your screenshot and context are saved to BugSnap.
          </p>
          {createdReportId ? (
            <p className="mt-2 font-mono text-[11px] text-zinc-500">
              ID: {createdReportId}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setCapture(null);
              setView("capture");
            }}
            className="mt-4 w-full rounded-md bg-white py-2 text-xs font-semibold text-black hover:bg-zinc-200"
          >
            Capture another bug
          </button>
        </div>
      ) : null}
    </div>
  );
}
