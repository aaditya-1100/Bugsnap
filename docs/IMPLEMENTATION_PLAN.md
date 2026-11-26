# BugSnap — Implementation Plan

## Phase 0 — Project Scaffold ✅

Set up monorepo, tooling, planning documents.

**Acceptance Criteria:**
- [x] pnpm workspace with `apps/web`, `apps/extension`, `packages/api`
- [x] Planning docs created
- [x] Root config files (.gitignore, .env.example, README)

---

## Phase 1 — Foundation ✅

Backend API, frontend shell, extension scaffold.

**Acceptance Criteria:**
- [x] FastAPI app with auth, workspace, project, health routers
- [x] SQLAlchemy models for all entities with Alembic migrations
- [x] Next.js app with marketing page, auth pages, dashboard layout
- [x] Dark-first design system with shadcn/ui
- [x] Chrome extension scaffold with manifest, build config, side panel UI
- [x] Dev servers start without errors

---

## Phase 2 — Bug Capture & Annotation

Chrome extension captures screenshots and allows annotation.

**Acceptance Criteria:**
- [ ] Screenshot capture via `chrome.tabs.captureVisibleTab`
- [ ] Fabric.js annotation canvas (draw, arrow, rectangle, text, blur)
- [ ] Page metadata collection (URL, viewport, console errors, browser info)
- [ ] Screenshot saved as WebP to Supabase Storage
- [ ] Extension ↔ Backend communication for creating reports

---

## Phase 3 — AI Report Generation

Gemini AI generates structured bug reports.

**Acceptance Criteria:**
- [ ] Gemini API integration in backend
- [ ] AI generates title, reproduction steps, expected/observed behavior, severity
- [ ] User can review and edit AI-generated fields
- [ ] AI usage tracked per workspace
- [ ] Graceful fallback when AI is unavailable

---

## Phase 4 — GitHub Integration

Export bug reports to GitHub Issues.

**Acceptance Criteria:**
- [ ] GitHub OAuth connection per workspace
- [ ] Create GitHub issue from bug report (formatted markdown)
- [ ] Link back to GitHub issue (URL + number stored on report)
- [ ] List connected repositories

---

## Phase 5 — Sharing & Polish

Share reports, comments, and final polish.

**Acceptance Criteria:**
- [ ] Share report via unique token link (no auth required)
- [ ] Comments on reports
- [ ] Report filtering and search
- [ ] Pagination on all list endpoints
- [ ] Error handling and loading states throughout
- [ ] Responsive design for dashboard
