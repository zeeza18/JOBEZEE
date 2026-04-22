from fastapi import APIRouter, Depends, HTTPException
from fastapi import Depends as FastAPIDepends
from sqlalchemy import select, desc
from ..auth import get_current_user
from ..database import AsyncSessionLocal
from ..models import TailorJobRecord, UserCredits

router = APIRouter(prefix="/api/billing", tags=["billing"])


async def get_db():
    async with AsyncSessionLocal() as db:
        yield db


@router.get("/balance")
async def get_balance(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get current credit balance for user."""
    uid = str(current_user.id)
    res = await db.execute(select(UserCredits).where(UserCredits.user_id == uid))
    row = res.scalar_one_or_none()
    return {"balance": row.balance if row else 0.0}


@router.post("/add")
async def add_credits(
    amount: float,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Add credits (simulated — just increment balance)."""
    if amount < 5.0:
        raise HTTPException(400, "Minimum $5.00 to add credits")
    uid = str(current_user.id)
    res = await db.execute(select(UserCredits).where(UserCredits.user_id == uid))
    row = res.scalar_one_or_none()
    if row:
        row.balance += amount
    else:
        db.add(UserCredits(user_id=uid, balance=amount))
    await db.commit()
    res = await db.execute(select(UserCredits).where(UserCredits.user_id == uid))
    row = res.scalar_one()
    return {"balance": row.balance, "added": amount}


@router.get("/history")
async def billing_history(
    limit: int = 20,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get tailoring job history with costs."""
    uid = str(current_user.id)
    res = await db.execute(
        select(TailorJobRecord)
        .where(TailorJobRecord.user_id == uid)
        .order_by(desc(TailorJobRecord.created_at))
        .limit(limit)
    )
    jobs = res.scalars().all()
    return {
        "history": [
            {
                "job_id": j.id,
                "status": j.status,
                "score": j.score,
                "input_tokens": j.input_tokens,
                "output_tokens": j.output_tokens,
                "cost_usd": j.cost_usd,
                "created_at": j.created_at.isoformat() if j.created_at else None,
                "company_name": j.company_name,
            }
            for j in jobs if j.status in ("complete", "error")
        ]
    }
