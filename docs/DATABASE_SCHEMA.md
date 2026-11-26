# BugSnap — Database Schema

All tables use UUID primary keys and UTC timestamps.

## Entity Relationship

```
users ─┬─< workspace_members >─── workspaces ──< projects ──< reports ──< report_attachments
       │                              │                           │
       │                              ├──< github_connections     ├──< comments
       │                              │                           │
       └──────────────────────────────┴──< ai_usage ──────────────┘
```

---

## `users`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default gen_random_uuid() |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| full_name | VARCHAR(255) | NOT NULL |
| avatar_url | TEXT | NULLABLE |
| hashed_password | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, default now() |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() |

---

## `workspaces`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(255) | NOT NULL |
| slug | VARCHAR(255) | UNIQUE, NOT NULL |
| owner_id | UUID | FK → users.id, NOT NULL |
| plan | VARCHAR(50) | NOT NULL, default 'free' |
| settings | JSONB | default '{}' |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

---

## `workspace_members`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| workspace_id | UUID | FK → workspaces.id, NOT NULL |
| user_id | UUID | FK → users.id, NOT NULL |
| role | VARCHAR(20) | NOT NULL ('admin' or 'member') |
| joined_at | TIMESTAMPTZ | NOT NULL |

UNIQUE(workspace_id, user_id)

---

## `projects`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| workspace_id | UUID | FK → workspaces.id, NOT NULL |
| name | VARCHAR(255) | NOT NULL |
| description | TEXT | NULLABLE |
| url | TEXT | NULLABLE |
| is_active | BOOLEAN | NOT NULL, default true |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

---

## `reports`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK → projects.id, NOT NULL |
| workspace_id | UUID | FK → workspaces.id, NOT NULL |
| reporter_id | UUID | FK → users.id, NOT NULL |
| title | VARCHAR(500) | NOT NULL |
| description | TEXT | NULLABLE |
| observed_behavior | TEXT | NULLABLE |
| expected_behavior | TEXT | NULLABLE |
| reproduction_steps | TEXT | NULLABLE |
| status | VARCHAR(20) | NOT NULL, default 'new' |
| severity | VARCHAR(20) | NOT NULL, default 'unknown' |
| page_url | TEXT | NULLABLE |
| browser_info | JSONB | default '{}' |
| viewport_info | JSONB | default '{}' |
| console_errors | JSONB | default '[]' |
| ai_generated_content | JSONB | NULLABLE |
| ai_reviewed | BOOLEAN | NOT NULL, default false |
| share_token | VARCHAR(64) | UNIQUE, NULLABLE |
| github_issue_url | TEXT | NULLABLE |
| github_issue_number | INTEGER | NULLABLE |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

**status enum:** `new`, `triaged`, `in_progress`, `resolved`, `closed`
**severity enum:** `critical`, `high`, `medium`, `low`, `unknown`

---

## `report_attachments`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| report_id | UUID | FK → reports.id, NOT NULL |
| file_name | VARCHAR(255) | NOT NULL |
| file_path | TEXT | NOT NULL |
| file_type | VARCHAR(50) | NOT NULL |
| file_size | BIGINT | NOT NULL |
| content_type | VARCHAR(100) | NOT NULL |
| metadata | JSONB | default '{}' |
| created_at | TIMESTAMPTZ | NOT NULL |

---

## `comments`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| report_id | UUID | FK → reports.id, NOT NULL |
| user_id | UUID | FK → users.id, NOT NULL |
| content | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

---

## `github_connections`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| workspace_id | UUID | FK → workspaces.id, NOT NULL |
| user_id | UUID | FK → users.id, NOT NULL |
| github_user_id | BIGINT | NOT NULL |
| github_username | VARCHAR(255) | NOT NULL |
| access_token | TEXT | NOT NULL |
| token_type | VARCHAR(50) | default 'bearer' |
| scope | TEXT | NULLABLE |
| connected_at | TIMESTAMPTZ | NOT NULL |
| token_expires_at | TIMESTAMPTZ | NULLABLE |

---

## `ai_usage`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| workspace_id | UUID | FK → workspaces.id, NOT NULL |
| user_id | UUID | FK → users.id, NOT NULL |
| report_id | UUID | FK → reports.id, NULLABLE |
| operation | VARCHAR(100) | NOT NULL |
| input_tokens | INTEGER | default 0 |
| output_tokens | INTEGER | default 0 |
| model_used | VARCHAR(100) | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
