"""
Auth router — register, login, refresh, logout, me.
"""
from __future__ import annotations

import logging
import traceback
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, Request, status

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
from ..models import User

router = APIRouter()


# ── Request / Response schemas (local, lightweight) ───────────────────────────

class RegisterRequest(BaseModel):
    email       : EmailStr
    password    : str
    full_name   : str = ""


class LoginRequest(BaseModel):
    email    : EmailStr
    password : str


class AuthUserResponse(BaseModel):
    id        : str
    email     : str
    full_name : str

    model_config = {"from_attributes": True}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthUserResponse, status_code=status.HTTP_201_CREATED)
async def register(
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
        set_auth_cookies(response, user.id)
        log.debug("REGISTER cookies set OK — done")
        return user

    except HTTPException:
        raise
    except Exception as exc:
        log.error("REGISTER FAILED:\n%s", traceback.format_exc())
        raise


@router.post("/login", response_model=AuthUserResponse)
async def login(
    body     : LoginRequest,
    response : Response,
    db       : AsyncSession = Depends(get_db),
) -> User:
    result = await db.execute(select(User).where(User.email == body.email))
    user   = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    set_auth_cookies(response, user.id)
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
    from ..auth import _IS_SECURE, _SAMESITE
    response.set_cookie(
        key="jobezee_access",
        value=create_access_token(user.id),
        httponly=True,
        secure=_IS_SECURE,
        samesite=_SAMESITE,
        max_age=3600,
        path="/",
    )
    return {"ok": True}


@router.post("/logout")
async def logout(response: Response) -> dict:
    clear_auth_cookies(response)
    return {"ok": True}


@router.get("/me", response_model=AuthUserResponse)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
