# BugSnap

**From bug spotted to bug understood.**

BugSnap is a lightweight visual bug reporting SaaS. A Chrome extension captures screenshots, users annotate and describe bugs, AI generates structured reports, and everything exports to GitHub Issues seamlessly.

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui |
| Backend | FastAPI · Python 3.11 · SQLAlchemy (async) · Alembic |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + JWT |
| Storage | Supabase Storage |
| AI | Google Gemini |
| Extension | Chrome MV3 · React · Vite · Fabric.js |

## Monorepo Structure

```
apps/web/          → Next.js frontend
apps/extension/    → Chrome extension
packages/api/      → FastAPI backend
docs/              → Planning & design documents
```

## Getting Started

### Prerequisites

- Node.js ≥ 18 & pnpm ≥ 9
- Python 3.11+
- Supabase project (or local via Docker)

### Install Dependencies

```bash
# Node packages
pnpm install

# Python virtual-env
cd packages/api
python -m venv venv
venv/Scripts/pip install -r requirements.txt   # Windows
# source venv/bin/activate && pip install -r requirements.txt  # macOS/Linux
```

### Run Development Servers

```bash
# Frontend
pnpm dev:web          # http://localhost:3000

# Backend
cd packages/api
venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

### Environment Variables

Copy `.env.example` → `.env` and fill in your Supabase, Gemini, and GitHub OAuth credentials.

## License

MIT
