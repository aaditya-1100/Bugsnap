from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_workspace_member
from app.models.comment import Comment
from app.models.report import Report
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.schemas.comment import CommentCreate, CommentResponse

router = APIRouter(
    prefix="/api/workspaces/{workspace_id}/reports/{report_id}/comments",
    tags=["comments"],
)


@router.post("", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    workspace_id: UUID,
    report_id: UUID,
    body: CommentCreate,
    current_user: User = Depends(get_current_user),
    _: WorkspaceMember = Depends(require_workspace_member),
    db: AsyncSession = Depends(get_db),
) -> CommentResponse:
    res = await db.execute(
        select(Report).where(Report.id == report_id, Report.workspace_id == workspace_id)
    )
    if res.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    comment = Comment(
        report_id=report_id,
        user_id=current_user.id,
        content=body.content.strip(),
    )
    db.add(comment)
    await db.flush()
    await db.refresh(comment)
    return CommentResponse(
        id=comment.id,
        report_id=comment.report_id,
        user_id=comment.user_id,
        content=comment.content,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        author_name=current_user.full_name,
        author_email=current_user.email,
    )


@router.get("", response_model=list[CommentResponse])
async def list_comments(
    workspace_id: UUID,
    report_id: UUID,
    _: WorkspaceMember = Depends(require_workspace_member),
    db: AsyncSession = Depends(get_db),
) -> list[CommentResponse]:
    res = await db.execute(
        select(Report).where(Report.id == report_id, Report.workspace_id == workspace_id)
    )
    if res.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    rows = (
        await db.execute(
            select(Comment, User)
            .join(User, User.id == Comment.user_id)
            .where(Comment.report_id == report_id)
            .order_by(Comment.created_at.asc())
        )
    ).all()
    return [
        CommentResponse(
            id=comment.id,
            report_id=comment.report_id,
            user_id=comment.user_id,
            content=comment.content,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            author_name=user.full_name,
            author_email=user.email,
        )
        for comment, user in rows
    ]


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    workspace_id: UUID,
    report_id: UUID,
    comment_id: UUID,
    current_user: User = Depends(get_current_user),
    membership: WorkspaceMember = Depends(require_workspace_member),
    db: AsyncSession = Depends(get_db),
) -> None:
    res = await db.execute(
        select(Comment)
        .join(Report, Report.id == Comment.report_id)
        .where(
            Comment.id == comment_id,
            Comment.report_id == report_id,
            Report.workspace_id == workspace_id,
        )
    )
    comment = res.scalar_one_or_none()
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    if comment.user_id != current_user.id and membership.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the author or a workspace admin can delete this comment",
        )

    await db.delete(comment)
