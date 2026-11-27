import os
import uuid
from pathlib import Path

import httpx
from fastapi import HTTPException, UploadFile, status

from app.config import settings

ALLOWED_IMAGE_TYPES = {
    "image/webp": ".webp",
    "image/png": ".png",
    "image/jpeg": ".jpg",
}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
LOCAL_UPLOAD_DIR = Path("uploads").resolve()


async def save_attachment(
    workspace_id: str,
    report_id: str,
    file: UploadFile,
) -> tuple[str, str, int]:
    """Validate and store an uploaded screenshot/attachment.

    Uses Supabase Storage when configured; falls back to local disk in dev.
    Returns (file_path, content_type, file_size).
    """
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{content_type}'. Allowed: WebP, PNG, JPEG.",
        )

    data = await file.read()
    file_size = len(data)
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="File exceeds maximum allowed size of 5 MB.",
        )

    ext = ALLOWED_IMAGE_TYPES[content_type]
    object_key = f"{workspace_id}/{report_id}/{uuid.uuid4().hex}{ext}"

    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        bucket = "bugsnap-attachments"
        upload_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{bucket}/{object_key}"
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": content_type,
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(upload_url, content=data, headers=headers)
            if resp.status_code not in (200, 201):
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to upload attachment to storage.",
                )
        public_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{bucket}/{object_key}"
        return public_url, content_type, file_size

    # Local dev storage fallback
    target_path = (LOCAL_UPLOAD_DIR / object_key).resolve()
    if not target_path.is_relative_to(LOCAL_UPLOAD_DIR):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file path.")
    os.makedirs(target_path.parent, exist_ok=True)
    target_path.write_bytes(data)
    return f"/api/attachments/files/{object_key}", content_type, file_size
