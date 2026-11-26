# BugSnap — Progress & Acceptance Test Log

## Phase Status

| Phase | Status | Notes |
|---|---|---|
| Phase 0 — Scaffold & Planning | ✅ Complete | Monorepo (`apps/web`, `apps/extension`, `packages/api`, `docs/`) |
| Phase 1 — Foundation | ✅ Complete | FastAPI, SQLAlchemy async + Alembic, Next.js 15 dark UI, JWT auth |
| Phase 2 — Chrome Extension | ✅ Complete | MV3 Side Panel, Fabric.js annotations, redaction, metadata, WebP upload |
| Phase 3 — Workspace & Reports | ✅ Complete | Report list/filters, detail & screenshot viewer, 5 statuses, comments, share links |
| Phase 4 — AI Reporting | ✅ Complete | Provider-independent `AIProvider` + Gemini 2.0 Flash, human review gate |
| Phase 5 — GitHub Integration | ✅ Complete | OAuth flow, repo list, one-click GitHub Issue export |
| Phase 6 — Reliability & Launch | ✅ Complete | Automated tests passing, production builds verified, deploy configs added |

## Automated Test Results

- `packages/api`: `pytest tests/ -v` → **3 passed**
  - `test_health`: `/api/health` returns `200 OK`
  - `test_auth_workspace_project_and_isolation`: Registration, `/me`, workspace creation, project creation, cross-workspace `403 Forbidden` isolation
  - `test_full_report_lifecycle_ai_and_github_export`: Report creation, WebP upload & invalid-type rejection, search/filter, status update (`triaged`), comments, public share token access, AI structured report generation + review gate enforcement, GitHub OAuth callback + issue export
- `apps/extension`: `pnpm build:ext` (`tsc && vite build`) → **Built cleanly** (`dist/sidepanel.html`, `dist/service-worker.js`)

## Remaining External Setup (User Credentials Needed)

1. **Supabase**: Set `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
2. **Gemini AI**: Set `GEMINI_API_KEY`
3. **GitHub OAuth**: Set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`
4. **Deploy**: Connect `apps/web` to Vercel (Hobby) and `packages/api` to Render (Free)
