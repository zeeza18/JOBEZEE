"""
Logs, errors, and feedback router.

POST /api/logs/error          — frontend reports a JS error
POST /api/logs/feedback       — user submits feedback / bug report
GET  /api/logs/errors         — admin: list error logs
GET  /api/logs/app            — admin: list app logs
GET  /api/logs/feedback       — admin: list feedback
POST /api/logs/app            — internal: write an app log entry
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..database import get_db, AsyncSessionLocal
from ..models import AppLog, ErrorLog, Feedback

router = APIRouter()


# ── Request models ────────────────────────────────────────────────────────────

class ErrorIn(BaseModel):
    source   : str = "frontend"
    message  : str
    traceback: str = ""
    page     : str = ""
    metadata : dict = {}


class FeedbackIn(BaseModel):
    type    : str = "general"   # bug / feature / general
    rating  : Optional[int] = None
    message : str
    page    : str = ""


class AppLogIn(BaseModel):
    level   : str = "info"
    source  : str
    message : str
    metadata: dict = {}


# ── Public helpers (called from other routers / exception handler) ────────────

async def write_error_log(
    source: str,
    message: str,
    traceback_str: str = "",
    request_path: str = "",
    request_method: str = "",
    user_id: str | None = None,
    metadata: dict | None = None,
) -> None:
    """Write an error log row. Uses its own session — safe to call from exception handlers."""
    try:
        async with AsyncSessionLocal() as db:
            db.add(ErrorLog(
                id=uuid.uuid4(),
                user_id=user_id,
                level="error",
                source=source,
                message=message,
                traceback=traceback_str,
                request_path=request_path,
                request_method=request_method,
                extra=metadata or {},
            ))
            await db.commit()
    except Exception:
        pass  # never raise from error logger


async def write_app_log(
    source: str,
    message: str,
    level: str = "info",
    user_id: str | None = None,
    metadata: dict | None = None,
) -> None:
    """Write an app log row. Uses its own session."""
    try:
        async with AsyncSessionLocal() as db:
            db.add(AppLog(
                id=uuid.uuid4(),
                user_id=user_id,
                level=level,
                source=source,
                message=message,
                extra=metadata or {},
            ))
            await db.commit()
    except Exception:
        pass


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/error", status_code=204)
async def report_error(
    body: ErrorIn,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Frontend JS errors reported here."""
    db.add(ErrorLog(
        id=uuid.uuid4(),
        user_id=current_user.id,
        level="error",
        source=body.source,
        message=body.message,
        traceback=body.traceback,
        request_path=body.page,
        extra=body.metadata,
    ))
    await db.commit()


@router.post("/feedback", status_code=204)
async def submit_feedback(
    body: FeedbackIn,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db.add(Feedback(
        id=uuid.uuid4(),
        user_id=current_user.id,
        type=body.type,
        rating=body.rating,
        message=body.message,
        page=body.page,
    ))
    await db.commit()


@router.post("/app", status_code=204)
async def write_log(
    body: AppLogIn,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db.add(AppLog(
        id=uuid.uuid4(),
        user_id=current_user.id,
        level=body.level,
        source=body.source,
        message=body.message,
        extra=body.metadata,
    ))
    await db.commit()


@router.get("/errors")
async def list_errors(
    limit: int = 100,
    offset: int = 0,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(ErrorLog)
        .where(ErrorLog.user_id == current_user.id)
        .order_by(desc(ErrorLog.created_at))
        .limit(limit).offset(offset)
    )
    rows = res.scalars().all()
    return {"errors": [
        {
            "id": str(r.id), "level": r.level, "source": r.source,
            "message": r.message, "traceback": r.traceback,
            "request_path": r.request_path, "request_method": r.request_method,
            "metadata": r.extra,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in rows
    ]}


@router.get("/feedback")
async def list_feedback(
    limit: int = 100,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Feedback)
        .where(Feedback.user_id == current_user.id)
        .order_by(desc(Feedback.created_at))
        .limit(limit)
    )
    rows = res.scalars().all()
    return {"feedback": [
        {
            "id": str(r.id), "type": r.type, "rating": r.rating,
            "message": r.message, "page": r.page,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in rows
    ]}


@router.get("/app")
async def list_app_logs(
    limit: int = 100,
    level: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(AppLog).where(AppLog.user_id == current_user.id)
    if level:
        q = q.where(AppLog.level == level)
    q = q.order_by(desc(AppLog.created_at)).limit(limit)
    res = await db.execute(q)
    rows = res.scalars().all()
    return {"logs": [
        {
            "id": str(r.id), "level": r.level, "source": r.source,
            "message": r.message, "metadata": r.extra,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in rows
    ]}
