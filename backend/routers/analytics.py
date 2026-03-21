"""
Analytics router — track events, tool usage, billing, and provide dashboard stats.

POST /api/analytics/event           — record a user event (page view, click, etc.)
POST /api/analytics/tool-usage      — record AI tool cost
POST /api/analytics/billing/credit  — add credits
GET  /api/analytics/billing/history — billing transaction history
GET  /api/analytics/summary         — aggregated stats for a user
GET  /api/analytics/events          — paginated event log
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..database import get_db
from ..models import (
    Application, BillingTransaction, ToolUsage, UserEvent,
    AppLog,
)

router = APIRouter()


# ── Request models ────────────────────────────────────────────────────────────

class EventIn(BaseModel):
    event_type  : str
    page        : str = ""
    element     : str = ""
    metadata    : dict = {}
    duration_ms : Optional[int] = None


class ToolUsageIn(BaseModel):
    tool       : str
    model      : str = ""
    tokens_in  : int = 0
    tokens_out : int = 0
    cost_usd   : float = 0.0
    job_id     : Optional[str] = None
    metadata   : dict = {}


class CreditIn(BaseModel):
    amount_usd  : float
    description : str = "Manual credit"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _log_event(db: AsyncSession, user_id: str | None, event_type: str,
                     page: str = "", element: str = "", metadata: dict | None = None,
                     duration_ms: int | None = None) -> None:
    """Fire-and-forget event recorder — called from other routers too."""
    db.add(UserEvent(
        id=uuid.uuid4(), user_id=user_id, event_type=event_type,
        page=page, element=element,
        extra=metadata or {}, duration_ms=duration_ms,
    ))


async def _log_app(db: AsyncSession, user_id: str | None, level: str,
                   source: str, message: str, metadata: dict | None = None) -> None:
    """Write an AppLog row."""
    db.add(AppLog(
        id=uuid.uuid4(), user_id=user_id, level=level,
        source=source, message=message, extra=metadata or {},
    ))


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/event", status_code=204)
async def record_event(
    body: EventIn,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _log_event(db, current_user.id, body.event_type,
                     body.page, body.element, body.metadata, body.duration_ms)
    await db.commit()


@router.post("/tool-usage", status_code=204)
async def record_tool_usage(
    body: ToolUsageIn,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_uuid = None
    if body.job_id:
        try:
            job_uuid = uuid.UUID(body.job_id)
        except ValueError:
            pass
    db.add(ToolUsage(
        id=uuid.uuid4(), user_id=current_user.id,
        tool=body.tool, model=body.model,
        tokens_in=body.tokens_in, tokens_out=body.tokens_out,
        cost_usd=body.cost_usd, job_id=job_uuid,
        extra=body.metadata,
    ))
    await db.commit()


@router.post("/billing/credit", status_code=200)
async def add_credit(
    body: CreditIn,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Compute running balance
    res = await db.execute(
        select(func.coalesce(func.sum(
            func.case((BillingTransaction.type == "credit",  BillingTransaction.amount_usd),
                      else_=-BillingTransaction.amount_usd)
        ), 0.0)).where(BillingTransaction.user_id == current_user.id)
    )
    balance = float(res.scalar() or 0.0)
    new_balance = balance + body.amount_usd

    db.add(BillingTransaction(
        id=uuid.uuid4(), user_id=current_user.id,
        type="credit", amount_usd=body.amount_usd,
        description=body.description, balance_after=new_balance,
    ))
    await db.commit()
    return {"balance": new_balance, "added": body.amount_usd}


@router.get("/billing/history")
async def billing_history(
    limit: int = 50,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(BillingTransaction)
        .where(BillingTransaction.user_id == current_user.id)
        .order_by(desc(BillingTransaction.created_at))
        .limit(limit)
    )
    rows = res.scalars().all()
    return {"transactions": [
        {
            "id": str(r.id), "type": r.type, "amount_usd": r.amount_usd,
            "description": r.description, "balance_after": r.balance_after,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in rows
    ]}


@router.get("/summary")
async def analytics_summary(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = current_user.id
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    # Total applies
    total_applies = await db.scalar(
        select(func.count()).select_from(Application).where(Application.user_id == uid)
    )

    # Applies this week
    applies_this_week = await db.scalar(
        select(func.count()).select_from(Application)
        .where(Application.user_id == uid, Application.created_at >= week_ago)
    )

    # Total AI cost
    total_cost = await db.scalar(
        select(func.coalesce(func.sum(ToolUsage.cost_usd), 0.0))
        .where(ToolUsage.user_id == uid)
    )

    # Total events
    total_events = await db.scalar(
        select(func.count()).select_from(UserEvent).where(UserEvent.user_id == uid)
    )

    # Tool breakdown
    tool_res = await db.execute(
        select(ToolUsage.tool, func.count().label("n"), func.sum(ToolUsage.cost_usd).label("cost"))
        .where(ToolUsage.user_id == uid)
        .group_by(ToolUsage.tool)
    )
    tools = [{"tool": r.tool, "count": r.n, "cost_usd": float(r.cost or 0)} for r in tool_res]

    # Balance
    bal_res = await db.scalar(
        select(func.coalesce(func.sum(
            func.case((BillingTransaction.type == "credit",  BillingTransaction.amount_usd),
                      else_=-BillingTransaction.amount_usd)
        ), 0.0)).where(BillingTransaction.user_id == uid)
    )

    return {
        "total_applies":     total_applies or 0,
        "applies_this_week": applies_this_week or 0,
        "total_ai_cost_usd": float(total_cost or 0),
        "balance_usd":       float(bal_res or 0),
        "total_events":      total_events or 0,
        "tool_breakdown":    tools,
    }


@router.get("/events")
async def get_events(
    limit: int = 100,
    offset: int = 0,
    event_type: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(UserEvent).where(UserEvent.user_id == current_user.id)
    if event_type:
        q = q.where(UserEvent.event_type == event_type)
    q = q.order_by(desc(UserEvent.created_at)).limit(limit).offset(offset)
    res = await db.execute(q)
    rows = res.scalars().all()
    return {"events": [
        {
            "id": str(r.id), "event_type": r.event_type, "page": r.page,
            "element": r.element, "metadata": r.extra,
            "duration_ms": r.duration_ms,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in rows
    ]}
