from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check() -> dict:
    return {
        "status": "ok",
        "service": "bugsnap-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
