import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_workspace_member
from app.models.project import Project
from app.models.report import Report
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.schemas.report import (
    ReportCreate,
    ReportListResponse,
    ReportResponse,
    ReportStatusUpdate,
    ReportUpdate,
)

router = APIRouter(tags=["reports"])


@router.post(
    "/api/workspaces/{workspace_id}/reports",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_report(
    workspace_id: UUID,
    body: ReportCreate,
    current_user: User = Depends(get_current_user),
    _: WorkspaceMember = Depends(require_workspace_member),
    db: AsyncSession = Depends(get_db),
) -> ReportResponse:
    project_res = await db.execute(
        select(Project).where(Project.id == body.project_id, Project.workspace_id == workspace_id)
    )
    if project_res.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this workspace",
        )

    report = Report(
        project_id=body.project_id,
        workspace_id=workspace_id,
        reporter_id=current_user.id,
        title=body.title.strip(),
        description=body.description,
        observed_behavior=body.observed_behavior,
        expected_behavior=body.expected_behavior,
        reproduction_steps=body.reproduction_steps,
        severity=body.severity,
        page_url=body.page_url,
        browser_info=body.browser_info,
        viewport_info=body.viewport_info,
        console_errors=body.console_errors,
        status="new",
    )
    db.add(report)
    await db.flush()

    res = await db.execute(
        select(Report).options(selectinload(Report.attachments)).where(Report.id == report.id)
    )
    loaded = res.scalar_one()
    return ReportResponse.model_validate(loaded)


@router.get("/api/workspaces/{workspace_id}/reports", response_model=ReportListResponse)
async def list_reports(
    workspace_id: UUID,
    status_filter: str | None = Query(default=None, alias="status"),
    severity: str | None = Query(default=None),
    project_id: UUID | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _: WorkspaceMember = Depends(require_workspace_member),
    db: AsyncSession = Depends(get_db),
) -> ReportListResponse:
    filters = [Report.workspace_id == workspace_id]
    if status_filter:
        filters.append(Report.status == status_filter)
    if severity:
        filters.append(Report.severity == severity)
    if project_id:
        filters.append(Report.project_id == project_id)
    if search and search.strip():
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                Report.title.ilike(term),
                Report.description.ilike(term),
                Report.page_url.ilike(term),
            )
        )

    count_res = await db.execute(select(func.count(Report.id)).where(*filters))
    total = count_res.scalar_one()

    stmt = (
        select(Report)
        .options(selectinload(Report.attachments))
        .where(*filters)
        .order_by(Report.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return ReportListResponse(
        items=[ReportResponse.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/api/workspaces/{workspace_id}/reports/{report_id}", response_model=ReportResponse)
async def get_report(
    workspace_id: UUID,
    report_id: UUID,
    _: WorkspaceMember = Depends(require_workspace_member),
    db: AsyncSession = Depends(get_db),
) -> ReportResponse:
    res = await db.execute(
        select(Report)
        .options(selectinload(Report.attachments))
        .where(Report.id == report_id, Report.workspace_id == workspace_id)
    )
    report = res.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return ReportResponse.model_validate(report)


@router.patch("/api/workspaces/{workspace_id}/reports/{report_id}", response_model=ReportResponse)
async def update_report(
    workspace_id: UUID,
    report_id: UUID,
    body: ReportUpdate,
    _: WorkspaceMember = Depends(require_workspace_member),
    db: AsyncSession = Depends(get_db),
) -> ReportResponse:
    res = await db.execute(
        select(Report)
        .options(selectinload(Report.attachments))
        .where(Report.id == report_id, Report.workspace_id == workspace_id)
    )
    report = res.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    for field in (
        "title",
        "description",
        "observed_behavior",
        "expected_behavior",
        "reproduction_steps",
        "severity",
        "status",
    ):
        value = getattr(body, field)
        if value is not None:
            setattr(report, field, value.strip() if field == "title" else value)

    await db.flush()
    await db.refresh(report)
    return ReportResponse.model_validate(report)


@router.patch(
    "/api/workspaces/{workspace_id}/reports/{report_id}/status",
    response_model=ReportResponse,
)
async def update_report_status(
    workspace_id: UUID,
    report_id: UUID,
    body: ReportStatusUpdate,
    _: WorkspaceMember = Depends(require_workspace_member),
    db: AsyncSession = Depends(get_db),
) -> ReportResponse:
    res = await db.execute(
        select(Report)
        .options(selectinload(Report.attachments))
        .where(Report.id == report_id, Report.workspace_id == workspace_id)
    )
    report = res.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    report.status = body.status
    await db.flush()
    await db.refresh(report)
    return ReportResponse.model_validate(report)


@router.post("/api/workspaces/{workspace_id}/reports/{report_id}/share", response_model=ReportResponse)
async def generate_share_link(
    workspace_id: UUID,
    report_id: UUID,
    _: WorkspaceMember = Depends(require_workspace_member),
    db: AsyncSession = Depends(get_db),
) -> ReportResponse:
    res = await db.execute(
        select(Report)
        .options(selectinload(Report.attachments))
        .where(Report.id == report_id, Report.workspace_id == workspace_id)
    )
    report = res.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    if not report.share_token:
        report.share_token = secrets.token_urlsafe(24)
        await db.flush()
        await db.refresh(report)
    return ReportResponse.model_validate(report)


@router.get("/api/share/{share_token}", response_model=ReportResponse)
async def get_shared_report(
    share_token: str,
    db: AsyncSession = Depends(get_db),
) -> ReportResponse:
    res = await db.execute(
        select(Report)
        .options(selectinload(Report.attachments))
        .where(Report.share_token == share_token)
    )
    report = res.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared report not found")
    return ReportResponse.model_validate(report)
