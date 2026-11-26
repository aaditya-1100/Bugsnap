export type ReportStatus = "new" | "triaged" | "in_progress" | "resolved" | "closed";
export type ReportSeverity = "critical" | "high" | "medium" | "low" | "unknown";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  email: string | null;
  full_name: string | null;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  report_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  content_type: string;
  created_at: string;
}

export interface Report {
  id: string;
  project_id: string;
  workspace_id: string;
  reporter_id: string | null;
  title: string;
  description: string | null;
  observed_behavior: string | null;
  expected_behavior: string | null;
  reproduction_steps: string | null;
  status: ReportStatus;
  severity: ReportSeverity;
  page_url: string | null;
  browser_info: Record<string, unknown>;
  viewport_info: Record<string, unknown>;
  console_errors: unknown[];
  ai_generated_content: Record<string, unknown> | null;
  ai_reviewed: boolean;
  share_token: string | null;
  github_issue_url: string | null;
  github_issue_number: number | null;
  created_at: string;
  updated_at: string;
  attachments: Attachment[];
}

export interface ReportListResponse {
  items: Report[];
  total: number;
  page: number;
  page_size: number;
}

export interface Comment {
  id: string;
  report_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_name: string | null;
  author_email: string | null;
}
