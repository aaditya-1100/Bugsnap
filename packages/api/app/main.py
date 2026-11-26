from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.models import *  # noqa: F401, F403
from app.routers import (
    ai,
    attachments,
    auth,
    comments,
    github,
    health,
    projects,
    reports,
    workspaces,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Ensure tables exist in local SQLite dev mode; production uses Alembic migrations.
    if settings.DATABASE_URL.startswith("sqlite"):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="BugSnap API",
    description="Backend REST API for BugSnap visual bug reporting SaaS",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(workspaces.router)
app.include_router(projects.router)
app.include_router(reports.router)
app.include_router(attachments.router)
app.include_router(comments.router)
app.include_router(ai.router)
app.include_router(github.router)
