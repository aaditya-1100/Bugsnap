from unittest.mock import patch
from uuid import UUID

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.database import AsyncSessionLocal, Base, engine
from app.main import app
from app.middleware.rate_limit import ai_limiter, auth_limiter
from app.models.github_connection import GitHubConnection
from app.models.user import User


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    auth_limiter._hits.clear()
    ai_limiter._hits.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_security_rbac_isolation_traversal_and_encryption():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Register Owner & Member & Outsider
        owner_res = await client.post(
            "/api/auth/register",
            json={"email": "owner@bugsnap.dev", "password": "password123", "full_name": "Owner"},
        )
        member_res = await client.post(
            "/api/auth/register",
            json={"email": "member@bugsnap.dev", "password": "password123", "full_name": "Member"},
        )
        outsider_res = await client.post(
            "/api/auth/register",
            json={"email": "outsider@bugsnap.dev", "password": "password123", "full_name": "Outsider"},
        )
        assert owner_res.status_code == 201
        assert member_res.status_code == 201
        assert outsider_res.status_code == 201

        h_owner = {"Authorization": f"Bearer {owner_res.json()['access_token']}"}
        h_member = {"Authorization": f"Bearer {member_res.json()['access_token']}"}
        h_outsider = {"Authorization": f"Bearer {outsider_res.json()['access_token']}"}

        # Verify password is bcrypt-hashed in DB (never plaintext)
        async with AsyncSessionLocal() as db:
            u = (await db.execute(select(User).where(User.email == "owner@bugsnap.dev"))).scalar_one()
            assert u.hashed_password.startswith("$2")
            assert "password123" not in u.hashed_password

        # 2. Owner creates workspace + project + report
        ws = (await client.post("/api/workspaces", json={"name": "Sec WS"}, headers=h_owner)).json()
        ws_id = ws["id"]
        proj = (
            await client.post(
                f"/api/workspaces/{ws_id}/projects",
                json={"name": "Sec App"},
                headers=h_owner,
            )
        ).json()
        rep = (
            await client.post(
                f"/api/workspaces/{ws_id}/reports",
                json={"project_id": proj["id"], "title": "Secret bug"},
                headers=h_owner,
            )
        ).json()
        rep_id = rep["id"]

        # 3. Invite member as non-admin role
        inv = await client.post(
            f"/api/workspaces/{ws_id}/members",
            json={"email": "member@bugsnap.dev", "role": "member"},
            headers=h_owner,
        )
        assert inv.status_code == 201

        # Member CANNOT update workspace name or invite others (403)
        assert (
            await client.patch(
                f"/api/workspaces/{ws_id}",
                json={"name": "Hacked"},
                headers=h_member,
            )
        ).status_code == 403
        assert (
            await client.post(
                f"/api/workspaces/{ws_id}/members",
                json={"email": "outsider@bugsnap.dev", "role": "admin"},
                headers=h_member,
            )
        ).status_code == 403

        # 4. Outsider CANNOT access workspace, reports, comments, or AI
        assert (await client.get(f"/api/workspaces/{ws_id}/reports", headers=h_outsider)).status_code == 403
        assert (await client.get(f"/api/workspaces/{ws_id}/reports/{rep_id}", headers=h_outsider)).status_code == 403
        assert (
            await client.post(
                f"/api/workspaces/{ws_id}/reports/{rep_id}/comments",
                json={"content": "spy"},
                headers=h_outsider,
            )
        ).status_code == 403
        assert (
            await client.post(
                f"/api/workspaces/{ws_id}/reports/{rep_id}/ai/generate",
                headers=h_outsider,
            )
        ).status_code == 403

        # 5. Path traversal & dangerous file upload rejection (SVG/HTML XSS blocked)
        assert (await client.get("/api/attachments/files/../../.env")).status_code == 404
        svg_upload = await client.post(
            f"/api/workspaces/{ws_id}/reports/{rep_id}/attachments",
            files={"file": ("xss.svg", b"<svg onload=alert(1)>", "image/svg+xml")},
            headers=h_owner,
        )
        assert svg_upload.status_code == 400

        oversized = await client.post(
            f"/api/workspaces/{ws_id}/reports/{rep_id}/attachments",
            files={"file": ("huge.png", b"0" * (5 * 1024 * 1024 + 10), "image/png")},
            headers=h_owner,
        )
        assert oversized.status_code == 413

        # 6. GitHub OAuth token is encrypted at rest in DB
        with patch("app.routers.github.exchange_code_for_token", return_value={"access_token": "gho_super_secret_token", "token_type": "bearer", "scope": "repo"}), \
             patch("app.routers.github.fetch_github_user", return_value={"id": 99, "login": "sec-user"}):
            cb = await client.post(
                "/api/github/callback",
                json={"workspace_id": ws_id, "code": "code123"},
                headers=h_owner,
            )
            assert cb.status_code == 200

        async with AsyncSessionLocal() as db:
            conn_row = (
                await db.execute(
                    select(GitHubConnection).where(GitHubConnection.workspace_id == UUID(ws["id"]))
                )
            ).scalar_one_or_none()
            assert conn_row is not None
            assert conn_row.access_token != "gho_super_secret_token"
            assert conn_row.access_token.startswith("gAAAAA")

        # 7. Rate limiting triggers 429 on auth brute-force
        statuses = []
        for _ in range(25):
            r = await client.post(
                "/api/auth/login",
                json={"email": "owner@bugsnap.dev", "password": "wrong"},
            )
            statuses.append(r.status_code)
        assert 429 in statuses
