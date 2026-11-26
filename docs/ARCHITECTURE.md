# BugSnap — Architecture

## High-Level Overview

```
┌──────────────┐     REST      ┌──────────────┐     SQL      ┌──────────────┐
│   Next.js    │◄─────────────►│   FastAPI     │◄────────────►│  Supabase    │
│   Frontend   │               │   Backend     │              │  PostgreSQL  │
└──────────────┘               └──────────────┘              └──────────────┘
       ▲                              │  │                         │
       │                              │  │                         │
       │        ┌─────────────────────┘  └──────────┐              │
       │        ▼                                   ▼              │
       │  ┌──────────┐                       ┌──────────┐          │
       │  │ Gemini   │                       │ GitHub   │          │
       │  │ AI API   │                       │ API      │          │
       │  └──────────┘                       └──────────┘          │
       │                                                           │
┌──────────────┐                                            ┌──────────┐
│   Chrome     │────────────── REST ──────────────────────► │ Supabase │
│   Extension  │                                            │ Storage  │
└──────────────┘                                            └──────────┘
```

## Component Responsibilities

### Next.js Frontend (`apps/web/`)
- Server-rendered marketing pages
- SPA dashboard for authenticated users
- Client-side routing via App Router (route groups)
- Communicates with FastAPI backend over REST

### FastAPI Backend (`packages/api/`)
- Single Python service handling all API routes
- Async SQLAlchemy ORM with PostgreSQL via asyncpg
- JWT-based authentication
- Orchestrates Gemini AI for report generation
- Manages GitHub OAuth and issue creation

### Supabase
- **PostgreSQL** — primary data store (managed by Alembic migrations)
- **Auth** — email/password authentication (future: OAuth providers)
- **Storage** — screenshot and attachment file hosting

### Chrome Extension (`apps/extension/`)
- Manifest V3 with Side Panel UI
- Captures visible tab screenshot via `chrome.tabs.captureVisibleTab`
- Fabric.js annotation canvas
- Collects page metadata (URL, viewport, console errors, browser info)
- Sends data to FastAPI backend via REST

### Gemini AI
- Receives bug description + screenshot context
- Generates structured report fields
- Usage tracked per workspace for quota management

## Monorepo Layout

```
BugSnap/
├── apps/
│   ├── web/          # Next.js 14 + TypeScript + Tailwind + shadcn/ui
│   └── extension/    # Chrome MV3 + React + Vite + Fabric.js
├── packages/
│   └── api/          # FastAPI + SQLAlchemy + Alembic
├── docs/             # Design & planning documents
├── pnpm-workspace.yaml
└── package.json
```

## Key Technical Decisions

- **Monorepo** — single repo for frontend, backend, and extension for atomic changes.
- **pnpm workspaces** — fast, disk-efficient package management.
- **Async everything** — FastAPI + asyncpg for non-blocking I/O.
- **Dark-first UI** — zinc-950 background, violet accents, Inter font.
