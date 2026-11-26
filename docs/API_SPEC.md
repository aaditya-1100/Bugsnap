# BugSnap — API Specification

Base URL: `http://localhost:8000/api`

All authenticated endpoints require `Authorization: Bearer <token>` header.

---

## Authentication

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/register` | Create a new account | No |
| POST | `/api/auth/login` | Sign in, receive JWT | No |
| POST | `/api/auth/logout` | Invalidate session | Yes |
| GET | `/api/auth/me` | Get current user profile | Yes |

---

## Workspaces

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/workspaces` | List user's workspaces | Yes |
| POST | `/api/workspaces` | Create workspace | Yes |
| GET | `/api/workspaces/{id}` | Get workspace details | Yes |
| PATCH | `/api/workspaces/{id}` | Update workspace | Yes (admin) |
| DELETE | `/api/workspaces/{id}` | Delete workspace | Yes (owner) |
| GET | `/api/workspaces/{id}/members` | List members | Yes |
| POST | `/api/workspaces/{id}/members` | Add member | Yes (admin) |
| DELETE | `/api/workspaces/{id}/members/{userId}` | Remove member | Yes (admin) |

---

## Projects

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/workspaces/{wId}/projects` | List projects | Yes |
| POST | `/api/workspaces/{wId}/projects` | Create project | Yes |
| GET | `/api/workspaces/{wId}/projects/{id}` | Get project | Yes |
| PATCH | `/api/workspaces/{wId}/projects/{id}` | Update project | Yes |
| DELETE | `/api/workspaces/{wId}/projects/{id}` | Delete project | Yes (admin) |

---

## Reports

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/workspaces/{wId}/reports` | List reports (filterable, paginated) | Yes |
| POST | `/api/workspaces/{wId}/reports` | Create report | Yes |
| GET | `/api/workspaces/{wId}/reports/{id}` | Get report details | Yes |
| PATCH | `/api/workspaces/{wId}/reports/{id}` | Update report | Yes |
| DELETE | `/api/workspaces/{wId}/reports/{id}` | Delete report | Yes |
| GET | `/api/reports/shared/{shareToken}` | Get report by share token | No |

---

## Comments

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/reports/{rId}/comments` | List comments on report | Yes |
| POST | `/api/reports/{rId}/comments` | Add comment | Yes |
| PATCH | `/api/comments/{id}` | Edit comment | Yes (author) |
| DELETE | `/api/comments/{id}` | Delete comment | Yes (author/admin) |

---

## Attachments

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/reports/{rId}/attachments` | Upload file | Yes |
| GET | `/api/attachments/{id}` | Download/view file | Yes |
| DELETE | `/api/attachments/{id}` | Delete attachment | Yes |

---

## AI

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/ai/generate-report` | Generate structured report from description + screenshot | Yes |
| GET | `/api/ai/usage` | Get AI usage stats for workspace | Yes |

---

## GitHub Integration

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/github/connect` | Initiate GitHub OAuth flow | Yes |
| GET | `/api/github/callback` | Handle OAuth callback | Yes |
| DELETE | `/api/github/disconnect` | Remove GitHub connection | Yes |
| GET | `/api/github/repos` | List connected repos | Yes |
| POST | `/api/github/issues` | Create GitHub issue from report | Yes |

---

## Health

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/health` | Service health check | No |
