from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_workspace_member
from app.models.github_connection import GitHubConnection
from app.models.report import Report
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.schemas.report import ReportResponse
from app.services.github_service import (
    create_github_issue,
    decrypt_token,
    encrypt_token,
    exchange_code_for_token,
    fetch_github_user,
    get_github_oauth_url,
    list_github_repos,
    sign_oauth_state,
    validate_repo_full_name,
    verify_oauth_state,
)

router = APIRouter(tags=["github"])


class GitHubCallbackRequest(BaseModel):
    code: str
    workspace_id: UUID | None = None
    state: str | None = None


class GitHubExportRequest(BaseModel):
    repo_full_name: str
    include_screenshot_link: bool = True


@router.get("/api/github/auth-url")
async def github_auth_url(
    workspace_id: UUID = Query(...),
    current_user: User = Depends(get_current_user),
    _: WorkspaceMember = Depends(require_workspace_member),
) -> dict:
    state = sign_oauth_state(workspace_id, current_user.id)
    return {"url": get_github_oauth_url(state=state)}


@router.post("/api/github/callback")
async def github_callback(
    body: GitHubCallbackRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if body.state is not None:
        workspace_id = verify_oauth_state(body.state, current_user.id)
        if body.workspace_id is not None and body.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Workspace mismatch in OAuth state.",
            )
    elif body.workspace_id is not None:
        workspace_id = body.workspace_id
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing OAuth state or workspace_id.",
        )

    membership = (
        await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Workspace access denied")

    token_data = await exchange_code_for_token(body.code)
    access_token = token_data["access_token"]
    gh_user = await fetch_github_user(access_token)

    conn = GitHubConnection(
        workspace_id=workspace_id,
        user_id=current_user.id,
        github_user_id=str(gh_user["id"]),
        github_username=gh_user["login"],
        access_token=encrypt_token(access_token),
        token_type=token_data.get("token_type", "bearer"),
        scope=token_data.get("scope"),
    )
    db.add(conn)
    await db.flush()
    return {
        "connected": True,
        "github_username": conn.github_username,
        "workspace_id": str(conn.workspace_id),
    }


@router.get("/api/github/connections")
async def get_connections(
    workspace_id: UUID = Query(...),
    _: WorkspaceMember = Depends(require_workspace_member),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    rows = (
        await db.execute(
            select(GitHubConnection).where(GitHubConnection.workspace_id == workspace_id)
        )
    ).scalars().all()
    return [
        {
            "id": str(c.id),
            "github_username": c.github_username,
            "scope": c.scope,
            "connected_at": c.connected_at.isoformat(),
        }
        for c in rows
    ]


@router.get("/api/github/repos")
async def get_repos(
    workspace_id: UUID = Query(...),
    _: WorkspaceMember = Depends(require_workspace_member),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    conn = (
        await db.execute(
            select(GitHubConnection)
            .where(GitHubConnection.workspace_id == workspace_id)
            .order_by(GitHubConnection.connected_at.desc())
        )
    ).scalars().first()
    if conn is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No GitHub account connected to this workspace",
        )
    return await list_github_repos(decrypt_token(conn.access_token))


@router.post(
    "/api/workspaces/{workspace_id}/reports/{report_id}/github/export",
    response_model=ReportResponse,
)
async def export_report_to_github(
    workspace_id: UUID,
    report_id: UUID,
    body: GitHubExportRequest,
    _: WorkspaceMember = Depends(require_workspace_member),
    db: AsyncSession = Depends(get_db),
) -> ReportResponse:
    validate_repo_full_name(body.repo_full_name)

    res = await db.execute(
        select(Report)
        .options(selectinload(Report.attachments))
        .where(Report.id == report_id, Report.workspace_id == workspace_id)
    )
    report = res.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    if report.ai_generated_content and not report.ai_reviewed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please review and approve the AI-generated report before exporting to GitHub.",
        )

    conn = (
        await db.execute(
            select(GitHubConnection)
            .where(GitHubConnection.workspace_id == workspace_id)
            .order_by(GitHubConnection.connected_at.desc())
        )
    ).scalars().first()
    if conn is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No GitHub account connected to this workspace.",
        )

    sections = []
    if report.description:
        sections.append(f"### Description\n{report.description}")
    if report.observed_behavior:
        sections.append(f"### Observed Behavior\n{report.observed_behavior}")
    if report.expected_behavior:
        sections.append(f"### Expected Behavior\n{report.expected_behavior}")
    if report.reproduction_steps:
        sections.append(f"### Reproduction Steps\n{report.reproduction_steps}")

    meta_lines = [
        f"- **Severity**: `{report.severity}`",
        f"- **Page URL**: {report.page_url or 'N/A'}",
        f"- **Viewport**: {report.viewport_info}",
        f"- **Browser**: {report.browser_info}",
    ]
    sections.append("### Technical Context\n" + "\n".join(meta_lines))

    if body.include_screenshot_link and report.attachments:
        att_links = "\n".join(
            f"- [{att.file_name}]({att.file_path})" for att in report.attachments
        )
        sections.append(f"### Evidence\n{att_links}")

    sections.append("\n---\n*Exported from BugSnap*")
    issue_body = "\n\n".join(sections)

    issue = await create_github_issue(
        access_token=decrypt_token(conn.access_token),
        repo_full_name=body.repo_full_name,
        title=report.title,
        body=issue_body,
        labels=["bug"],
    )

    report.github_issue_url = issue["html_url"]
    report.github_issue_number = issue["number"]
    await db.flush()
    await db.refresh(report)
    return ReportResponse.model_validate(report)
