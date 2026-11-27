import base64
import hashlib
import hmac
import json
import re
import secrets
import time
from urllib.parse import urlencode
from uuid import UUID

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException, status

from app.config import settings

REPO_FULL_NAME_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
OAUTH_STATE_MAX_AGE_SECONDS = 600  # 10 minutes


def sign_oauth_state(workspace_id: UUID, user_id: UUID) -> str:
    payload = {
        "w": str(workspace_id),
        "u": str(user_id),
        "t": int(time.time()),
        "n": secrets.token_hex(8),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("ascii").rstrip("=")
    sig = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        payload_b64.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload_b64}.{sig}"


def verify_oauth_state(
    state: str,
    expected_user_id: UUID,
    max_age_seconds: int = OAUTH_STATE_MAX_AGE_SECONDS,
) -> UUID:
    try:
        payload_b64, sig = state.split(".", 1)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth state.",
        ) from exc

    expected_sig = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        payload_b64.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth state signature.",
        )

    try:
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8"))
        workspace_id = UUID(data["w"])
        user_id = UUID(data["u"])
        issued_at = int(data["t"])
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed OAuth state.",
        ) from exc

    if user_id != expected_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="OAuth state does not match authenticated user.",
        )

    now = int(time.time())
    if now - issued_at > max_age_seconds or issued_at > now + 60:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expired OAuth state.",
        )

    return workspace_id


def validate_repo_full_name(repo_full_name: str) -> str:
    if not REPO_FULL_NAME_RE.match(repo_full_name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid GitHub repository name.",
        )
    owner, repo = repo_full_name.split("/", 1)
    if owner in {".", ".."} or repo in {".", ".."}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid GitHub repository name.",
        )
    return repo_full_name


def _get_fernet() -> Fernet:
    digest = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_token(token: str) -> str:
    return _get_fernet().encrypt(token.encode("utf-8")).decode("utf-8")


def decrypt_token(stored_token: str) -> str:
    try:
        return _get_fernet().decrypt(stored_token.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        # Backward compatibility if an unencrypted dev token was stored
        return stored_token


def get_github_oauth_url(state: str) -> str:
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GITHUB_CLIENT_ID is not configured on the server.",
        )
    params = urlencode(
        {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
            "scope": "repo read:user",
            "state": state,
        }
    )
    return f"https://github.com/login/oauth/authorize?{params}"


async def exchange_code_for_token(code: str) -> dict:
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth credentials are not configured on the server.",
        )

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            json={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": settings.GITHUB_REDIRECT_URI,
            },
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to exchange GitHub OAuth code.",
        )
    data = resp.json()
    if "access_token" not in data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=data.get("error_description", "GitHub OAuth failed."),
        )
    return data


async def fetch_github_user(access_token: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
            },
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch GitHub user profile.",
        )
    return resp.json()


async def list_github_repos(access_token: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://api.github.com/user/repos?sort=updated&per_page=100",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
            },
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to list GitHub repositories.",
        )
    return [
        {
            "id": r["id"],
            "full_name": r["full_name"],
            "private": r["private"],
            "html_url": r["html_url"],
        }
        for r in resp.json()
    ]


async def create_github_issue(
    access_token: str,
    repo_full_name: str,
    title: str,
    body: str,
    labels: list[str] | None = None,
) -> dict:
    validate_repo_full_name(repo_full_name)
    payload: dict = {"title": title, "body": body}
    if labels:
        payload["labels"] = labels

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            f"https://api.github.com/repos/{repo_full_name}/issues",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
            },
            json=payload,
        )
    if resp.status_code not in (200, 201):
        detail = "Failed to create GitHub issue."
        try:
            err = resp.json()
            if err.get("message"):
                detail = f"GitHub error: {err['message']}"
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)
    return resp.json()
