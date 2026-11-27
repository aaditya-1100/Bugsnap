import re
from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import text

from app.database import engine, ensure_tables_initialized

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check(db: bool = False) -> dict:
    payload: dict = {
        "status": "ok",
        "service": "bugsnap-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if db:
        try:
            await ensure_tables_initialized()
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            payload["database"] = "ok"
        except Exception as exc:
            sanitized = re.sub(r"://[^@\s]+@", "://***@", str(exc).split("\n")[0])
            payload["status"] = "degraded"
            payload["database"] = "error"
            payload["db_error_type"] = type(exc).__name__
            payload["db_error"] = sanitized[:300]
    return payload
