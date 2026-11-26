import type {
  Comment,
  Project,
  Report,
  ReportListResponse,
  ReportStatus,
  TokenResponse,
  User,
  Workspace,
  WorkspaceMember,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_KEY = "bugsnap_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class BugSnapAPI {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl = API_BASE_URL, token?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const authToken = this.token ?? getStoredToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
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
      throw new ApiError(res.status, detail);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return res.json() as Promise<T>;
  }

  async register(data: {
    email: string;
    password: string;
    full_name?: string;
  }): Promise<TokenResponse> {
    const res = await this.request<TokenResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setStoredToken(res.access_token);
    return res;
  }

  async login(data: {
    email: string;
    password: string;
  }): Promise<TokenResponse> {
    const res = await this.request<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setStoredToken(res.access_token);
    return res;
  }

  async logout(): Promise<void> {
    try {
      await this.request("/api/auth/logout", { method: "POST" });
    } finally {
      clearStoredToken();
    }
  }

  async getMe(): Promise<User> {
    return this.request<User>("/api/auth/me");
  }

  async getWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>("/api/workspaces");
  }

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    return this.request<Workspace>(`/api/workspaces/${workspaceId}`);
  }

  async createWorkspace(data: {
    name: string;
    slug?: string;
  }): Promise<Workspace> {
    return this.request<Workspace>("/api/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateWorkspace(
    workspaceId: string,
    data: { name?: string }
  ): Promise<Workspace> {
    return this.request<Workspace>(`/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return this.request<WorkspaceMember[]>(
      `/api/workspaces/${workspaceId}/members`
    );
  }

  async inviteMember(
    workspaceId: string,
    data: { email: string; role: "admin" | "member" }
  ): Promise<WorkspaceMember> {
    return this.request<WorkspaceMember>(
      `/api/workspaces/${workspaceId}/members`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    return this.request<void>(
      `/api/workspaces/${workspaceId}/members/${userId}`,
      { method: "DELETE" }
    );
  }

  async getProjects(workspaceId: string): Promise<Project[]> {
    return this.request<Project[]>(`/api/workspaces/${workspaceId}/projects`);
  }

  async createProject(
    workspaceId: string,
    data: { name: string; description?: string; url?: string }
  ): Promise<Project> {
    return this.request<Project>(`/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getReports(
    workspaceId: string,
    params?: {
      status?: string;
      severity?: string;
      project_id?: string;
      search?: string;
      page?: number;
    }
  ): Promise<ReportListResponse> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.severity) query.set("severity", params.severity);
    if (params?.project_id) query.set("project_id", params.project_id);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    const qs = query.toString();
    return this.request<ReportListResponse>(
      `/api/workspaces/${workspaceId}/reports${qs ? `?${qs}` : ""}`
    );
  }

  async getReport(workspaceId: string, reportId: string): Promise<Report> {
    return this.request<Report>(
      `/api/workspaces/${workspaceId}/reports/${reportId}`
    );
  }

  async updateReport(
    workspaceId: string,
    reportId: string,
    data: Partial<
      Pick<
        Report,
        | "title"
        | "description"
        | "observed_behavior"
        | "expected_behavior"
        | "reproduction_steps"
        | "severity"
        | "status"
      >
    >
  ): Promise<Report> {
    return this.request<Report>(
      `/api/workspaces/${workspaceId}/reports/${reportId}`,
      { method: "PATCH", body: JSON.stringify(data) }
    );
  }

  async updateReportStatus(
    workspaceId: string,
    reportId: string,
    status: ReportStatus
  ): Promise<Report> {
    return this.request<Report>(
      `/api/workspaces/${workspaceId}/reports/${reportId}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) }
    );
  }

  async generateShareLink(
    workspaceId: string,
    reportId: string
  ): Promise<Report> {
    return this.request<Report>(
      `/api/workspaces/${workspaceId}/reports/${reportId}/share`,
      { method: "POST" }
    );
  }

  async getSharedReport(shareToken: string): Promise<Report> {
    return this.request<Report>(`/api/share/${shareToken}`);
  }

  async getComments(workspaceId: string, reportId: string): Promise<Comment[]> {
    return this.request<Comment[]>(
      `/api/workspaces/${workspaceId}/reports/${reportId}/comments`
    );
  }

  async addComment(
    workspaceId: string,
    reportId: string,
    content: string
  ): Promise<Comment> {
    return this.request<Comment>(
      `/api/workspaces/${workspaceId}/reports/${reportId}/comments`,
      { method: "POST", body: JSON.stringify({ content }) }
    );
  }

  async deleteComment(
    workspaceId: string,
    reportId: string,
    commentId: string
  ): Promise<void> {
    return this.request<void>(
      `/api/workspaces/${workspaceId}/reports/${reportId}/comments/${commentId}`,
      { method: "DELETE" }
    );
  }

  async generateAIReport(
    workspaceId: string,
    reportId: string
  ): Promise<Report> {
    return this.request<Report>(
      `/api/workspaces/${workspaceId}/reports/${reportId}/ai/generate`,
      { method: "POST" }
    );
  }

  async markAIReviewed(
    workspaceId: string,
    reportId: string,
    reviewed = true
  ): Promise<Report> {
    return this.request<Report>(
      `/api/workspaces/${workspaceId}/reports/${reportId}/ai/review`,
      { method: "PATCH", body: JSON.stringify({ reviewed }) }
    );
  }

  async getGitHubAuthUrl(workspaceId: string): Promise<{ url: string }> {
    return this.request<{ url: string }>(
      `/api/github/auth-url?workspace_id=${workspaceId}`
    );
  }

  async completeGitHubCallback(
    workspaceId: string,
    code: string
  ): Promise<{ connected: boolean; github_username: string }> {
    return this.request("/api/github/callback", {
      method: "POST",
      body: JSON.stringify({ workspace_id: workspaceId, code }),
    });
  }

  async getGitHubConnections(
    workspaceId: string
  ): Promise<{ id: string; github_username: string; connected_at: string }[]> {
    return this.request(`/api/github/connections?workspace_id=${workspaceId}`);
  }

  async getGitHubRepos(
    workspaceId: string
  ): Promise<
    { id: number; full_name: string; private: boolean; html_url: string }[]
  > {
    return this.request(`/api/github/repos?workspace_id=${workspaceId}`);
  }

  async exportToGitHub(
    workspaceId: string,
    reportId: string,
    repoFullName: string
  ): Promise<Report> {
    return this.request<Report>(
      `/api/workspaces/${workspaceId}/reports/${reportId}/github/export`,
      {
        method: "POST",
        body: JSON.stringify({
          repo_full_name: repoFullName,
          include_screenshot_link: true,
        }),
      }
    );
  }
}

export const api = new BugSnapAPI();
