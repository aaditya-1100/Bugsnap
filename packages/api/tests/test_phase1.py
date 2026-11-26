import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.database import Base, engine
from app.main import app


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "bugsnap-api"


@pytest.mark.asyncio
async def test_auth_workspace_project_and_isolation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Register User A
        reg_a = await client.post(
            "/api/auth/register",
            json={"email": "alice@example.com", "password": "password123", "full_name": "Alice"},
        )
        assert reg_a.status_code == 201
        token_a = reg_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 2. Me endpoint
        me_a = await client.get("/api/auth/me", headers=headers_a)
        assert me_a.status_code == 200
        assert me_a.json()["email"] == "alice@example.com"

        # 3. Create workspace
        ws_res = await client.post(
            "/api/workspaces",
            json={"name": "Alice Studio"},
            headers=headers_a,
        )
        assert ws_res.status_code == 201
        workspace_id = ws_res.json()["id"]

        # 4. Create project
        proj_res = await client.post(
            f"/api/workspaces/{workspace_id}/projects",
            json={"name": "Marketing Site", "url": "https://example.com"},
            headers=headers_a,
        )
        assert proj_res.status_code == 201
        assert proj_res.json()["name"] == "Marketing Site"

        # 5. Register User B and verify workspace isolation
        reg_b = await client.post(
            "/api/auth/register",
            json={"email": "bob@example.com", "password": "password123", "full_name": "Bob"},
        )
        assert reg_b.status_code == 201
        token_b = reg_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        forbidden_ws = await client.get(f"/api/workspaces/{workspace_id}", headers=headers_b)
        assert forbidden_ws.status_code == 403

        forbidden_proj = await client.get(
            f"/api/workspaces/{workspace_id}/projects", headers=headers_b
        )
        assert forbidden_proj.status_code == 403
