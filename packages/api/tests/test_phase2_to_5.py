from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.database import Base, engine
from app.main import app
from app.services.ai_service import StructuredReport


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_full_report_lifecycle_ai_and_github_export(monkeypatch):
    monkeypatch.setattr("app.services.storage_service.settings.SUPABASE_URL", "")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register & create workspace + project
        reg = await client.post(
            "/api/auth/register",
            json={"email": "dev@bugsnap.dev", "password": "password123", "full_name": "Dev"},
        )
        assert reg.status_code == 201
        headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

        ws = (await client.post("/api/workspaces", json={"name": "Dev WS"}, headers=headers)).json()
        ws_id = ws["id"]
        proj = (
            await client.post(
                f"/api/workspaces/{ws_id}/projects",
                json={"name": "App", "url": "https://app.bugsnap.dev"},
                headers=headers,
            )
        ).json()

        # 1. Create report
        rep_res = await client.post(
            f"/api/workspaces/{ws_id}/reports",
            json={
                "project_id": proj["id"],
                "title": "Checkout button broken",
                "description": "Clicking checkout does nothing",
                "severity": "high",
                "page_url": "https://app.bugsnap.dev/checkout",
                "browser_info": {"userAgent": "Chrome/130"},
                "viewport_info": {"width": 1280, "height": 720},
                "console_errors": [{"type": "error", "message": "TypeError: x is undefined"}],
            },
            headers=headers,
        )
        assert rep_res.status_code == 201
        report_id = rep_res.json()["id"]

        # 2. Upload screenshot attachment (WebP) & reject invalid file type
        bad_upload = await client.post(
            f"/api/workspaces/{ws_id}/reports/{report_id}/attachments",
            files={"file": ("payload.txt", b"not-an-image", "text/plain")},
            headers=headers,
        )
        assert bad_upload.status_code == 400

        good_upload = await client.post(
            f"/api/workspaces/{ws_id}/reports/{report_id}/attachments",
            files={"file": ("shot.webp", b"RIFFxxxxWEBP", "image/webp")},
            headers=headers,
        )
        assert good_upload.status_code == 201

        # 3. Filter & search reports
        list_res = await client.get(
            f"/api/workspaces/{ws_id}/reports?search=Checkout&status=new",
            headers=headers,
        )
        assert list_res.status_code == 200
        assert list_res.json()["total"] == 1

        # 4. Update status
        status_res = await client.patch(
            f"/api/workspaces/{ws_id}/reports/{report_id}/status",
            json={"status": "triaged"},
            headers=headers,
        )
        assert status_res.status_code == 200
        assert status_res.json()["status"] == "triaged"

        # 5. Comments
        comm_res = await client.post(
            f"/api/workspaces/{ws_id}/reports/{report_id}/comments",
            json={"content": "Reproduced on Chrome 130."},
            headers=headers,
        )
        assert comm_res.status_code == 201

        # 6. Shareable link (public without auth)
        share_res = await client.post(
            f"/api/workspaces/{ws_id}/reports/{report_id}/share",
            headers=headers,
        )
        assert share_res.status_code == 200
        share_token = share_res.json()["share_token"]
        assert share_token

        public_res = await client.get(f"/api/share/{share_token}")
        assert public_res.status_code == 200
        assert public_res.json()["id"] == report_id

        # 7. AI report generation (mocked provider) & human review gate
        mock_structured = StructuredReport(
            title="Checkout button unresponsive on /checkout",
            description="Clicking checkout throws a TypeError.",
            observed_behavior="TypeError: x is undefined logged on click.",
            expected_behavior="[Assumed] Checkout flow should begin.",
            reproduction_steps=["Open /checkout", "Click checkout button"],
            suggested_severity="high",
            severity_rationale="Blocks checkout flow",
            evidence_references=["Screenshot", "Console error"],
            missing_information=["User account state"],
        )
        with patch("app.routers.ai.get_ai_provider") as mock_get_provider:
            provider = AsyncMock()
            provider.model_name = "gemini-2.0-flash"
            provider.generate_report.return_value = (mock_structured, 120, 80)
            mock_get_provider.return_value = provider

            ai_res = await client.post(
                f"/api/workspaces/{ws_id}/reports/{report_id}/ai/generate",
                headers=headers,
            )
        assert ai_res.status_code == 200
        assert ai_res.json()["ai_reviewed"] is False
        assert ai_res.json()["title"] == "Checkout button unresponsive on /checkout"

        # 8. GitHub export blocked until reviewed
        with patch("app.routers.github.exchange_code_for_token", return_value={"access_token": "gho_test", "token_type": "bearer", "scope": "repo"}), \
             patch("app.routers.github.fetch_github_user", return_value={"id": 123, "login": "aaditya-1100"}):
            cb_res = await client.post(
                "/api/github/callback",
                json={"workspace_id": ws_id, "code": "oauth-code"},
                headers=headers,
            )
            assert cb_res.status_code == 200

        blocked_export = await client.post(
            f"/api/workspaces/{ws_id}/reports/{report_id}/github/export",
            json={"repo_full_name": "aaditya-1100/Bugsnap"},
            headers=headers,
        )
        assert blocked_export.status_code == 400

        # Approve AI draft, then export
        approve_res = await client.patch(
            f"/api/workspaces/{ws_id}/reports/{report_id}/ai/review",
            json={"reviewed": True},
            headers=headers,
        )
        assert approve_res.status_code == 200
        assert approve_res.json()["ai_reviewed"] is True

        with patch(
            "app.routers.github.create_github_issue",
            return_value={"html_url": "https://github.com/aaditya-1100/Bugsnap/issues/1", "number": 1},
        ):
            export_res = await client.post(
                f"/api/workspaces/{ws_id}/reports/{report_id}/github/export",
                json={"repo_full_name": "aaditya-1100/Bugsnap"},
                headers=headers,
            )
        assert export_res.status_code == 200
        assert export_res.json()["github_issue_number"] == 1
        assert export_res.json()["github_issue_url"] == "https://github.com/aaditya-1100/Bugsnap/issues/1"
