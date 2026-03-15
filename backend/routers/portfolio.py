"""
/api/portfolio — Portfolio configuration and public viewer.

Endpoints
---------
GET  /api/portfolio/my            — get current user's portfolio config (auto-creates)
PUT  /api/portfolio/my            — update portfolio config
GET  /api/portfolio/public/{username}  — public: fetch profile + config by username slug
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..auth import get_current_user
from ..database import get_db
from ..models import PortfolioConfig, User, UserProfile
from ..schemas import PortfolioConfigResponse, PortfolioConfigUpdate, UserProfileResponse

router = APIRouter()


async def _get_or_create_config(user_id: str, db: AsyncSession) -> PortfolioConfig:
    res = await db.execute(
        select(PortfolioConfig).where(PortfolioConfig.user_id == user_id)
    )
    cfg = res.scalar_one_or_none()
    if cfg is None:
        cfg = PortfolioConfig(user_id=user_id)
        db.add(cfg)
        await db.commit()
        await db.refresh(cfg)
    return cfg


@router.get("/my", response_model=PortfolioConfigResponse)
async def get_my_portfolio(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cfg = await _get_or_create_config(current_user.id, db)
    return cfg


@router.put("/my", response_model=PortfolioConfigResponse)
async def update_my_portfolio(
    data: PortfolioConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cfg = await _get_or_create_config(current_user.id, db)
    for field, value in data.model_dump().items():
        setattr(cfg, field, value)
    await db.commit()
    await db.refresh(cfg)
    return cfg


@router.get("/public/{username}")
async def get_public_portfolio(username: str, db: AsyncSession = Depends(get_db)):
    """Public endpoint — no auth required. Returns profile + portfolio config."""
    # Match by email prefix or preferred_name (case-insensitive)
    res = await db.execute(select(UserProfile))
    profiles = res.scalars().all()

    profile = None
    for p in profiles:
        slug = (p.preferred_name or p.full_name or "").lower().replace(" ", "")
        email_prefix = (p.email or "").split("@")[0].lower()
        if slug == username.lower() or email_prefix == username.lower():
            profile = p
            break

    if profile is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Get the user_id from users table (profile.email → user.email)
    user_res = await db.execute(
        select(User).where(User.email == profile.email)
    )
    user = user_res.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    cfg_res = await db.execute(
        select(PortfolioConfig).where(PortfolioConfig.user_id == user.id)
    )
    cfg = cfg_res.scalar_one_or_none()

    return {
        "profile": UserProfileResponse.model_validate(profile),
        "config": PortfolioConfigResponse.model_validate(cfg) if cfg else None,
        "username": username,
    }
