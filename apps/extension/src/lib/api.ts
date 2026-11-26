import type {
  BrowserMetadata,
  ConsoleErrorEntry,
  Project,
  ViewportMetadata,
  Workspace,
} from "../types";

export class ExtensionApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ExtensionApiError";
  }
}

async function apiFetch<T>(
  baseUrl: string,
  path: string,
  token: string | null,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) detail = String(data.detail);
    } catch {
      // ignore
    }
    throw new ExtensionApiError(res.status, detail);
  }

  return res.json() as Promise<T>;
}

export async function loginExtension(
  baseUrl: string,
  email: string,
  password: string
): Promise<{ access_token: string; user: { email: string; full_name: string | null } }> {
  return apiFetch(baseUrl, "/api/auth/login", null, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchWorkspaces(
  baseUrl: string,
  token: string
): Promise<Workspace[]> {
  return apiFetch(baseUrl, "/api/workspaces", token);
}

export async function fetchProjects(
  baseUrl: string,
  token: string,
  workspaceId: string
): Promise<Project[]> {
  return apiFetch(baseUrl, `/api/workspaces/${workspaceId}/projects`, token);
}

export async function submitBugReport(params: {
  baseUrl: string;
  token: string;
  workspaceId: string;
  projectId: string;
  title: string;
  description: string;
  severity: string;
  pageUrl: string;
  browserInfo: BrowserMetadata;
  viewportInfo: ViewportMetadata;
  consoleErrors: ConsoleErrorEntry[];
  screenshotBlob: Blob;
}): Promise<{ id: string }> {
  const report = await apiFetch<{ id: string }>(
    params.baseUrl,
    `/api/workspaces/${params.workspaceId}/reports`,
    params.token,
    {
      method: "POST",
      body: JSON.stringify({
        project_id: params.projectId,
        title: params.title,
        description: params.description,
        severity: params.severity,
        page_url: params.pageUrl,
        browser_info: params.browserInfo,
        viewport_info: params.viewportInfo,
        console_errors: params.consoleErrors,
      }),
    }
  );

  const form = new FormData();
  form.append("file", params.screenshotBlob, "screenshot.webp");
  form.append("content_type_label", "screenshot");

  await apiFetch(
    params.baseUrl,
    `/api/workspaces/${params.workspaceId}/reports/${report.id}/attachments`,
    params.token,
    {
      method: "POST",
      body: form,
    }
  );

  return report;
}
