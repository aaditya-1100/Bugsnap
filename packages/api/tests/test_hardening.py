import base64
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch
from urllib.parse import parse_qs, urlparse
from uuid import UUID

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.database import AsyncSessionLocal, Base, engine
from app.main import app
from app.middleware.rate_limit import ai_limiter, auth_limiter
from app.models.report import ReportAttachment
from app.services.ai_service import StructuredReport


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
async def test_unauthenticated_me_returns_401_without_db(monkeypatch):
    def fail_if_called():
        raise AssertionError("ensure_tables_initialized should not be called on 401")

    monkeypatch.setattr("app.dependencies.ensure_tables_initialized", fail_if_called)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_missing = await client.get("/api/auth/me")
        assert res_missing.status_code == 401

        res_invalid = await client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer not-a-valid-jwt"},
        )
        assert res_invalid.status_code == 401


@pytest.mark.asyncio
async def test_security_headers_present():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/health")
    assert res.status_code == 200
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("x-frame-options") == "DENY"
    assert res.headers.get("referrer-policy") == "strict-origin-when-cross-origin"


@pytest.mark.asyncio
async def test_attachment_serve_requires_auth_and_membership(monkeypatch):
    monkeypatch.setattr("app.services.storage_service.settings.SUPABASE_URL", "")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        owner = await client.post(
            "/api/auth/register",
            json={"email": "att-owner@bugsnap.dev", "password": "password123"},
        )
        outsider = await client.post(
            "/api/auth/register",
            json={"email": "att-outsider@bugsnap.dev", "password": "password123"},
        )
        h_owner = {"Authorization": f"Bearer {owner.json()['access_token']}"}
        h_outsider = {"Authorization": f"Bearer {outsider.json()['access_token']}"}

        ws = (await client.post("/api/workspaces", json={"name": "Att WS"}, headers=h_owner)).json()
        ws_id = ws["id"]
        proj = (
            await client.post(
                f"/api/workspaces/{ws_id}/projects",
                json={"name": "Att App"},
                headers=h_owner,
            )
        ).json()
        rep = (
            await client.post(
                f"/api/workspaces/{ws_id}/reports",
                json={"project_id": proj["id"], "title": "Att Bug"},
                headers=h_owner,
            )
        ).json()
        rep_id = rep["id"]

        up = await client.post(
            f"/api/workspaces/{ws_id}/reports/{rep_id}/attachments",
            files={"file": ("shot.webp", b"RIFFxxxxWEBP", "image/webp")},
            headers=h_owner,
        )
        assert up.status_code == 201
        file_url = up.json()["file_path"]

        assert (await client.get(file_url)).status_code == 401
        assert (await client.get(file_url, headers=h_outsider)).status_code == 403
        ok = await client.get(file_url, headers=h_owner)
        assert ok.status_code == 200
        assert ok.content == b"RIFFxxxxWEBP"

        # URL-encoded traversal blocked
        trav = await client.get("/api/attachments/files/%2e%2e/%2e%2e/.env", headers=h_owner)
        assert trav.status_code == 404


@pytest.mark.asyncio
async def test_github_oauth_state_signing_and_repo_validation(monkeypatch):
    monkeypatch.setattr("app.services.github_service.settings.GITHUB_CLIENT_ID", "test-client-id")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        owner = await client.post(
            "/api/auth/register",
            json={"email": "gh-owner@bugsnap.dev", "password": "password123"},
        )
        outsider = await client.post(
            "/api/auth/register",
            json={"email": "gh-outsider@bugsnap.dev", "password": "password123"},
        )
        h_owner = {"Authorization": f"Bearer {owner.json()['access_token']}"}
        h_outsider = {"Authorization": f"Bearer {outsider.json()['access_token']}"}

        ws = (await client.post("/api/workspaces", json={"name": "GH WS"}, headers=h_owner)).json()
        ws_id = ws["id"]
        proj = (
            await client.post(
                f"/api/workspaces/{ws_id}/projects",
                json={"name": "GH App"},
                headers=h_owner,
            )
        ).json()
        rep = (
            await client.post(
                f"/api/workspaces/{ws_id}/reports",
                json={"project_id": proj["id"], "title": "GH Bug"},
                headers=h_owner,
            )
        ).json()
        rep_id = rep["id"]

        # Outsider cannot get auth URL
        assert (
            await client.get(f"/api/github/auth-url?workspace_id={ws_id}", headers=h_outsider)
        ).status_code == 403

        # Owner gets signed state
        auth_url_res = await client.get(f"/api/github/auth-url?workspace_id={ws_id}", headers=h_owner)
        assert auth_url_res.status_code == 200
        oauth_url = auth_url_res.json()["url"]
        state = parse_qs(urlparse(oauth_url).query)["state"][0]
        assert state != ws_id

        # Tampered state rejected
        assert (
            await client.post(
                "/api/github/callback",
                json={"code": "abc", "state": state + "tamper"},
                headers=h_owner,
            )
        ).status_code == 400

        # Outsider using owner's state rejected
        assert (
            await client.post(
                "/api/github/callback",
                json={"code": "abc", "state": state},
                headers=h_outsider,
            )
        ).status_code == 403

        # Owner with valid signed state succeeds
        with patch(
            "app.routers.github.exchange_code_for_token",
            return_value={"access_token": "gho_signed_ok", "token_type": "bearer", "scope": "repo"},
        ), patch(
            "app.routers.github.fetch_github_user",
            return_value={"id": 42, "login": "gh-owner"},
        ):
            cb_ok = await client.post(
                "/api/github/callback",
                json={"code": "abc", "state": state},
                headers=h_owner,
            )
            assert cb_ok.status_code == 200
            assert cb_ok.json()["workspace_id"] == ws_id

        # Invalid repo_full_name rejected before GitHub API URL interpolation
        for bad_repo in ["owner/repo/../../evil", "../bad", "noslash", "owner/.."]:
            bad_res = await client.post(
                f"/api/workspaces/{ws_id}/reports/{rep_id}/github/export",
                json={"repo_full_name": bad_repo},
                headers=h_owner,
            )
            assert bad_res.status_code == 400


@pytest.mark.asyncio
async def test_rate_limiter_uses_x_forwarded_for():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for _ in range(20):
            r = await client.post(
                "/api/auth/login",
                json={"email": "nobody@bugsnap.dev", "password": "wrong"},
                headers={"X-Forwarded-For": "1.2.3.4, 10.0.0.1"},
            )
            assert r.status_code == 401

        blocked = await client.post(
            "/api/auth/login",
            json={"email": "nobody@bugsnap.dev", "password": "wrong"},
            headers={"X-Forwarded-For": "1.2.3.4, 10.0.0.2"},
        )
        assert blocked.status_code == 429

        other_ip = await client.post(
            "/api/auth/login",
            json={"email": "nobody@bugsnap.dev", "password": "wrong"},
            headers={"X-Forwarded-For": "5.6.7.8"},
        )
        assert other_ip.status_code == 401


@pytest.mark.asyncio
async def test_ai_fetches_supabase_https_attachment(monkeypatch):
    monkeypatch.setattr("app.routers.ai.settings.SUPABASE_URL", "https://proj.supabase.co")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        owner = await client.post(
            "/api/auth/register",
            json={"email": "ai-owner@bugsnap.dev", "password": "password123"},
        )
        h_owner = {"Authorization": f"Bearer {owner.json()['access_token']}"}
        ws = (await client.post("/api/workspaces", json={"name": "AI WS"}, headers=h_owner)).json()
        ws_id = ws["id"]
        proj = (
            await client.post(
                f"/api/workspaces/{ws_id}/projects",
                json={"name": "AI App"},
                headers=h_owner,
            )
        ).json()
        rep = (
            await client.post(
                f"/api/workspaces/{ws_id}/reports",
                json={"project_id": proj["id"], "title": "AI Bug"},
                headers=h_owner,
            )
        ).json()
        rep_id = rep["id"]

        async with AsyncSessionLocal() as db:
            db.add(
                ReportAttachment(
                    report_id=UUID(rep_id),
                    file_name="shot.webp",
                    file_path="https://proj.supabase.co/storage/v1/object/public/bugsnap-attachments/shot.webp",
                    file_type="image/webp",
                    file_size=12,
                    content_type="screenshot",
                    metadata_json={},
                )
            )
            await db.commit()

        captured_contexts = []
        mock_structured = StructuredReport(
            title="AI Title",
            description="Desc",
            observed_behavior="Obs",
            expected_behavior="Exp",
            reproduction_steps=["Step 1"],
            suggested_severity="medium",
            severity_rationale="Reason",
            evidence_references=["Screenshot"],
            missing_information=[],
        )

        async def fake_generate(ctx):
            captured_contexts.append(ctx)
            return mock_structured, 10, 10

        provider = MagicMock()
        provider.model_name = "gemini-2.5-flash"
        provider.generate_report = AsyncMock(side_effect=fake_generate)

        @asynccontextmanager
        async def fake_stream(method, url):
            resp = MagicMock()
            resp.status_code = 200
            resp.headers = {"content-length": "12"}

            async def aiter_bytes():
                yield b"RIFFxxxxWEBP"

            resp.aiter_bytes = aiter_bytes
            yield resp

        with patch("app.routers.ai.get_ai_provider", return_value=provider), patch(
            "app.routers.ai.httpx.AsyncClient.stream", side_effect=fake_stream
        ):
            res = await client.post(
                f"/api/workspaces/{ws_id}/reports/{rep_id}/ai/generate",
                headers=h_owner,
            )

        assert res.status_code == 200
        assert len(captured_contexts) == 1
        assert captured_contexts[0].screenshot_base64 == base64.b64encode(b"RIFFxxxxWEBP").decode("ascii")
