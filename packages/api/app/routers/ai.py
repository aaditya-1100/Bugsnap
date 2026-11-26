import base64
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_workspace_member
from app.middleware.rate_limit import rate_limit_ai
from app.models.ai_usage import AIUsage
from app.models.report import Report
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.schemas.report import ReportResponse
from app.services.ai_service import ReportContext, get_ai_provider
from app.services.storage_service import LOCAL_UPLOAD_DIR

router = APIRouter(
    prefix="/api/workspaces/{workspace_id}/reports/{report_id}/ai",
    tags=["ai"],
)

FREE_MONTHLY_AI_LIMIT = 50


class AIReviewRequest(BaseModel):
    reviewed: bool = True


async def _generate_and_save(
    workspace_id: UUID,
    report_id: UUID,
    operation: str,
    current_user: User,
    db: AsyncSession,
) -> ReportResponse:
    res = await db.execute(
        select(Report)
        .options(selectinload(Report.attachments))
        .where(Report.id == report_id, Report.workspace_id == workspace_id)
    )
    report = res.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    usage_count_res = await db.execute(
        select(func.count(AIUsage.id)).where(
            AIUsage.workspace_id == workspace_id,
            AIUsage.created_at >= month_start,
        )
    )
    if usage_count_res.scalar_one() >= FREE_MONTHLY_AI_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Workspace monthly AI limit ({FREE_MONTHLY_AI_LIMIT} generations) reached.",
        )

    screenshot_b64 = None
    screenshot_mime = "image/webp"
    if report.attachments:
        first = report.attachments[0]
        if first.file_path.startswith("/api/attachments/files/"):
            rel = first.file_path.removeprefix("/api/attachments/files/")
            local_file = (LOCAL_UPLOAD_DIR / rel).resolve()
            if str(local_file).startswith(str(LOCAL_UPLOAD_DIR)) and local_file.is_file():
                screenshot_b64 = base64.b64encode(Path(local_file).read_bytes()).decode("ascii")
                screenshot_mime = first.file_type

    provider = get_ai_provider()
    structured, in_tokens, out_tokens = await provider.generate_report(
        ReportContext(
            user_description=report.description,
            page_url=report.page_url,
            browser_info=report.browser_info,
            viewport_info=report.viewport_info,
            console_errors=report.console_errors,
            screenshot_base64=screenshot_b64,
            screenshot_mime=screenshot_mime,
        )
    )

    report.ai_generated_content = structured.model_dump()
    report.title = structured.title
    report.description = structured.description
    report.observed_behavior = structured.observed_behavior
    report.expected_behavior = structured.expected_behavior
    report.reproduction_steps = "\n".join(
        f"{idx + 1}. {step}" for idx, step in enumerate(structured.reproduction_steps)
    )
    if structured.suggested_severity in {"critical", "high", "medium", "low", "unknown"}:
        report.severity = structured.suggested_severity
    report.ai_reviewed = False

    db.add(
        AIUsage(
            workspace_id=workspace_id,
            user_id=current_user.id,
            report_id=report_id,
            operation=operation,
            input_tokens=in_tokens,
            output_tokens=out_tokens,
            model_used=provider.model_name,
        )
    )
    await db.flush()
    await db.refresh(report)
    return ReportResponse.model_validate(report)


@router.post("/generate", response_model=ReportResponse, dependencies=[Depends(rate_limit_ai)])
async def generate_ai_report(
    workspace_id: UUID,
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    _: WorkspaceMember = Depends(require_workspace_member),
    db: AsyncSession = Depends(get_db),
) -> ReportResponse:
    return await _generate_and_save(workspace_id, report_id, "generate_report", current_user, db)


@router.post("/regenerate", response_model=ReportResponse, dependencies=[Depends(rate_limit_ai)])
async def regenerate_ai_report(
    workspace_id: UUID,
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    _: WorkspaceMember = Depends(require_workspace_member),
    db: AsyncSession = Depends(get_db),
) -> ReportResponse:
    return await _generate_and_save(workspace_id, report_id, "regenerate", current_user, db)


@router.patch("/review", response_model=ReportResponse)
async def mark_ai_reviewed(
    workspace_id: UUID,
    report_id: UUID,
    body: AIReviewRequest,
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

    report.ai_reviewed = body.reviewed
    await db.flush()
    await db.refresh(report)
    return ReportResponse.model_validate(report)
