"""
Auth router — register, login, refresh, logout, me, forgot/reset password.
"""
from __future__ import annotations

import logging
import secrets
import traceback
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, Request, status

log = logging.getLogger(__name__)
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..auth import (
    clear_auth_cookies,
    hash_password,
    set_auth_cookies,
    verify_password,
    get_current_user,
    _REFRESH_COOKIE,
    _decode_token,
    create_access_token,
)
from ..database import get_db
from ..models import PasswordResetToken, User

router = APIRouter()


# ── Request / Response schemas (local, lightweight) ───────────────────────────

class RegisterRequest(BaseModel):
    email       : EmailStr
    password    : str
    full_name   : str = ""


class LoginRequest(BaseModel):
    email    : EmailStr
    password : str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token        : str
    new_password : str


class AuthUserResponse(BaseModel):
    id             : str
    email          : str
    full_name      : str
    preferred_name : str = ""

    model_config = {"from_attributes": True}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthUserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request  : Request,
    body     : RegisterRequest,
    response : Response,
    db       : AsyncSession = Depends(get_db),
) -> User:
    try:
        log.debug("REGISTER start — email=%s", body.email)

        existing = await db.execute(select(User).where(User.email == body.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")
        log.debug("REGISTER duplicate-check OK")

        hashed = hash_password(body.password)
        log.debug("REGISTER hash_password OK")

        user = User(
            id              = str(uuid.uuid4()),
            email           = body.email,
            hashed_password = hashed,
            full_name       = body.full_name,
        )
        db.add(user)
        await db.commit()
        log.debug("REGISTER commit OK — id=%s", user.id)

        await db.refresh(user)
        set_auth_cookies(response, user.id, request.url.hostname)
        log.debug("REGISTER cookies set OK — done")
        return user

    except HTTPException:
        raise
    except Exception as exc:
        log.error("REGISTER FAILED:\n%s", traceback.format_exc())
        raise


@router.post("/login", response_model=AuthUserResponse)
async def login(
    request  : Request,
    body     : LoginRequest,
    response : Response,
    db       : AsyncSession = Depends(get_db),
) -> User:
    result = await db.execute(select(User).where(User.email == body.email))
    user   = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    set_auth_cookies(response, user.id, request.url.hostname)
    return user


@router.post("/refresh", response_model=dict)
async def refresh_token(
    request  : Request,
    response : Response,
    db       : AsyncSession = Depends(get_db),
) -> dict:
    token = request.cookies.get(_REFRESH_COOKIE)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No refresh token")

    user_id = _decode_token(token, "refresh")
    result  = await db.execute(select(User).where(User.id == user_id))
    user    = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")

    # Issue a fresh access token only (keep existing refresh token)
    from ..auth import _cookie_kwargs, ACCESS_EXPIRE_MINUTES
    response.set_cookie(
        key     = "jobezee_access",
        value   = create_access_token(user.id),
        max_age = ACCESS_EXPIRE_MINUTES * 60,
        path    = "/",
        **_cookie_kwargs(request.url.hostname),
    )
    return {"ok": True}


@router.post("/logout")
async def logout(request: Request, response: Response) -> dict:
    clear_auth_cookies(response, request.url.hostname)
    return {"ok": True}


@router.get("/me", response_model=AuthUserResponse)
async def me(
    current_user : User = Depends(get_current_user),
    db           : AsyncSession = Depends(get_db),
) -> dict:
    from ..models import UserProfile
    result = await db.execute(
        select(UserProfile).where(UserProfile.id == uuid.UUID(str(current_user.id)))
    )
    profile = result.scalar_one_or_none()
    return {
        "id":             str(current_user.id),
        "email":          current_user.email,
        "full_name":      current_user.full_name or "",
        "preferred_name": (profile.preferred_name or "") if profile else "",
    }


@router.post("/forgot-password")
async def forgot_password(
    body       : ForgotPasswordRequest,
    background : BackgroundTasks,
    db         : AsyncSession = Depends(get_db),
) -> dict:
    """
    Always returns 200 regardless of whether the email exists — prevents
    user enumeration. The reset email is sent in the background.
    """
    from ..config import get_settings
    from ..services.email_service import send_password_reset_email

    result = await db.execute(select(User).where(User.email == body.email))
    user   = result.scalar_one_or_none()

    if user:
        token = secrets.token_urlsafe(48)
        expires = datetime.now(timezone.utc) + timedelta(hours=1)

        db.add(PasswordResetToken(
            user_id    = user.id,
            token      = token,
            expires_at = expires,
        ))
        await db.commit()

        cfg       = get_settings()
        reset_url = f"{cfg.FRONTEND_URL}/reset-password?token={token}"

        background.add_task(
            send_password_reset_email,
            user.email,
            user.full_name or user.email,
            reset_url,
        )
        log.info("Password reset email queued for user=%s", user.id)

    return {"ok": True}


@router.post("/reset-password")
async def reset_password(
    body : ResetPasswordRequest,
    db   : AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token == body.token)
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired reset link")

    if record.used:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This reset link has already been used")

    if datetime.now(timezone.utc) > record.expires_at:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Reset link has expired — please request a new one")

    if len(body.new_password) < 8:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Password must be at least 8 characters")

    user_result = await db.execute(select(User).where(User.id == record.user_id))
    user        = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User not found")

    user.hashed_password = hash_password(body.new_password)
    record.used          = True
    await db.commit()

    log.info("Password reset successfully for user=%s", user.id)
    return {"ok": True}
