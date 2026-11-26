from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_workspace_member
from app.models.report import Report, ReportAttachment
from app.models.workspace import WorkspaceMember
from app.schemas.report import AttachmentResponse
from app.services.storage_service import LOCAL_UPLOAD_DIR, save_attachment

router = APIRouter(tags=["attachments"])


@router.post(
    "/api/workspaces/{workspace_id}/reports/{report_id}/attachments",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_attachment(
    workspace_id: UUID,
    report_id: UUID,
    file: UploadFile = File(...),
    content_type_label: str = Form(default="screenshot"),
    _: WorkspaceMember = Depends(require_workspace_member),
    db: AsyncSession = Depends(get_db),
) -> AttachmentResponse:
    res = await db.execute(
        select(Report).where(Report.id == report_id, Report.workspace_id == workspace_id)
    )
    if res.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    file_path, mime_type, file_size = await save_attachment(str(workspace_id), str(report_id), file)

    attachment = ReportAttachment(
        report_id=report_id,
        file_name=file.filename or "screenshot.webp",
        file_path=file_path,
        file_type=mime_type,
        file_size=file_size,
        content_type=content_type_label,
        metadata_json={},
    )
    db.add(attachment)
    await db.flush()
    await db.refresh(attachment)
    return AttachmentResponse.model_validate(attachment)


@router.get(
    "/api/workspaces/{workspace_id}/reports/{report_id}/attachments",
    response_model=list[AttachmentResponse],
)
async def list_attachments(
    workspace_id: UUID,
    report_id: UUID,
    _: WorkspaceMember = Depends(require_workspace_member),
    db: AsyncSession = Depends(get_db),
) -> list[AttachmentResponse]:
    res = await db.execute(
        select(Report).where(Report.id == report_id, Report.workspace_id == workspace_id)
    )
    if res.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    att_res = await db.execute(
        select(ReportAttachment)
        .where(ReportAttachment.report_id == report_id)
        .order_by(ReportAttachment.created_at.asc())
    )
    return [AttachmentResponse.model_validate(a) for a in att_res.scalars().all()]


@router.get("/api/attachments/files/{file_path:path}")
async def serve_local_attachment(file_path: str) -> FileResponse:
    """Serve locally stored screenshots in dev mode (when Supabase Storage is not configured)."""
    target = (LOCAL_UPLOAD_DIR / file_path).resolve()
    if not str(target).startswith(str(LOCAL_UPLOAD_DIR)) or not target.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")
    return FileResponse(Path(target))
