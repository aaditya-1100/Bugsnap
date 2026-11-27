import os
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings

_db_url = settings.async_database_url
_is_postgres = _db_url.startswith("postgresql")
_is_serverless = bool(os.environ.get("VERCEL"))

_engine_kwargs: dict = {"echo": False, "future": True}
if _is_postgres:
    _engine_kwargs["connect_args"] = {"statement_cache_size": 0}
if _is_serverless or _is_postgres:
    _engine_kwargs["poolclass"] = NullPool

engine = create_async_engine(_db_url, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


_tables_initialized = False


async def ensure_tables_initialized() -> None:
    """Create missing tables once per process/cold-start (safe for serverless Postgres)."""
    global _tables_initialized
    if _tables_initialized:
        return
    import app.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    _tables_initialized = True


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session per request."""
    await ensure_tables_initialized()
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
