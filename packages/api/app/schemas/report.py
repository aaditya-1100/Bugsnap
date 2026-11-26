from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

ReportStatus = Literal["new", "triaged", "in_progress", "resolved", "closed"]
ReportSeverity = Literal["critical", "high", "medium", "low", "unknown"]


class ReportCreate(BaseModel):
    project_id: UUID
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    observed_behavior: str | None = None
    expected_behavior: str | None = None
    reproduction_steps: str | None = None
    severity: ReportSeverity = "unknown"
    page_url: str | None = Field(default=None, max_length=2048)
    browser_info: dict = Field(default_factory=dict)
    viewport_info: dict = Field(default_factory=dict)
    console_errors: list = Field(default_factory=list)


class ReportUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    observed_behavior: str | None = None
    expected_behavior: str | None = None
    reproduction_steps: str | None = None
    severity: ReportSeverity | None = None
    status: ReportStatus | None = None


class ReportStatusUpdate(BaseModel):
    status: ReportStatus


class AttachmentResponse(BaseModel):
    id: UUID
    report_id: UUID
    file_name: str
    file_path: str
    file_type: str
    file_size: int
    content_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportResponse(BaseModel):
    id: UUID
    project_id: UUID
    workspace_id: UUID
    reporter_id: UUID | None
    title: str
    description: str | None
    observed_behavior: str | None
    expected_behavior: str | None
    reproduction_steps: str | None
    status: str
    severity: str
    page_url: str | None
    browser_info: dict
    viewport_info: dict
    console_errors: list
    ai_generated_content: dict | None
    ai_reviewed: bool
    share_token: str | None
    github_issue_url: str | None
    github_issue_number: int | None
    created_at: datetime
    updated_at: datetime
    attachments: list[AttachmentResponse] = []

    model_config = {"from_attributes": True}


class ReportListResponse(BaseModel):
    items: list[ReportResponse]
    total: int
    page: int
    page_size: int
