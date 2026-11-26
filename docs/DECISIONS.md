# BugSnap — Key Decisions

This document records architectural and product decisions and their rationale.

---

### 1. Workspace, not Organization

**Decision:** The top-level grouping is called "workspace" (not "organization" or "team").

**Rationale:** Simpler mental model. A solo developer has a workspace. A team has a workspace. No corporate connotations.

---

### 2. Five Bug Statuses

**Decision:** `New` → `Triaged` → `In Progress` → `Resolved` → `Closed`

**Rationale:** Covers the full lifecycle without being overwhelming. "Triaged" distinguishes acknowledged bugs from new ones.

---

### 3. Dark Theme First

**Decision:** Default and primary theme is dark. Light theme deferred.

**Rationale:** Developer tools are predominantly used in dark mode. Matches target audience expectations (Linear, Raycast, Vercel aesthetic).

---

### 4. Fabric.js for Annotations

**Decision:** Use Fabric.js (v6) for the screenshot annotation canvas.

**Rationale:** Mature canvas library with built-in support for drawing shapes, text, free-draw, and object manipulation. Well-suited for annotation use cases.

---

### 5. Chrome Side Panel

**Decision:** Extension uses Chrome Side Panel API (not popup or DevTools panel).

**Rationale:** Side panel stays open while the user interacts with the page. Popups close on blur. DevTools panel requires DevTools to be open.

---

### 6. Gemini AI (Free Tier)

**Decision:** Use Google Gemini for AI-powered report generation, starting with free tier.

**Rationale:** Generous free tier for MVP. Good multimodal capabilities (can process screenshots). Easy to swap models later.

---

### 7. WebP for Screenshots

**Decision:** Store screenshots as WebP format.

**Rationale:** Smaller file sizes than PNG with acceptable quality. Modern browsers all support it.

---

### 8. SQLAlchemy + Alembic

**Decision:** Use SQLAlchemy (async) as ORM and Alembic for migrations, even with Supabase.

**Rationale:** Full control over schema and migrations. Portable — not locked to Supabase. Type-safe models in Python.

---

### 9. Email/Password Auth First

**Decision:** V1 uses email + password authentication. OAuth (Google, GitHub login) deferred.

**Rationale:** Simplest to implement. Supabase Auth supports it out of the box. Social login can be added later without schema changes.

---

### 10. Admin + Member Roles

**Decision:** Two workspace roles: `admin` (full control) and `member` (can create/view, limited settings).

**Rationale:** Minimal viable RBAC. Owner is the creator and always admin. More granular permissions can come later.

---

### 11. No Duplicate Detection in V1

**Decision:** No automatic duplicate bug detection.

**Rationale:** Hard to get right. False positives are worse than false negatives. Manual triage is acceptable for small teams.
