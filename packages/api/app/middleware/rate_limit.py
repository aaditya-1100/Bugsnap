import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status


class SlidingWindowRateLimiter:
    """Simple in-memory sliding-window rate limiter per client IP + route group."""

    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        bucket = self._hits[key]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please slow down and try again shortly.",
            )
        bucket.append(now)


auth_limiter = SlidingWindowRateLimiter(max_requests=20, window_seconds=60)
ai_limiter = SlidingWindowRateLimiter(max_requests=15, window_seconds=60)


def _get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        first_ip = forwarded_for.split(",")[0].strip()
        if first_ip:
            return first_ip
    return request.client.host if request.client else "unknown"


async def rate_limit_auth(request: Request) -> None:
    client_ip = _get_client_ip(request)
    auth_limiter.check(f"auth:{client_ip}")


async def rate_limit_ai(request: Request) -> None:
    client_ip = _get_client_ip(request)
    ai_limiter.check(f"ai:{client_ip}")
