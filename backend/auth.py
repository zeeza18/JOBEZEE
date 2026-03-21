"""
JWT authentication utilities.

Flow
────
1. POST /api/auth/register  → creates user, returns access + refresh tokens in httpOnly cookies
2. POST /api/auth/login     → validates credentials, sets cookies
3. POST /api/auth/refresh   → uses refresh cookie to issue new access token
4. POST /api/auth/logout    → clears cookies
5. GET  /api/auth/me        → returns current user from access token

Token storage: httpOnly + Secure + SameSite=lax cookies (never localStorage).
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt as _bcrypt
from fastapi import Cookie, Depends, HTTPException, Request, Response, status
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .config import get_settings
from .database import get_db
from .models import User

_cfg = get_settings()

# ── Hashing (bcrypt directly — passlib 1.7.x is incompatible with bcrypt 4+) ─
def hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ── Token helpers ─────────────────────────────────────────────────────────────
ACCESS_EXPIRE_MINUTES  = 60          # 1 hour
REFRESH_EXPIRE_DAYS    = 30

_ACCESS_COOKIE  = "jobezee_access"
_REFRESH_COOKIE = "jobezee_refresh"


def _create_token(data: dict, expires_delta: timedelta) -> str:
    payload = {**data, "exp": datetime.now(timezone.utc) + expires_delta}
    return jwt.encode(payload, _cfg.JWT_SECRET, algorithm=_cfg.JWT_ALGORITHM)


def create_access_token(user_id: str) -> str:
    return _create_token(
        {"sub": user_id, "type": "access"},
        timedelta(minutes=ACCESS_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: str) -> str:
    return _create_token(
        {"sub": user_id, "type": "refresh"},
        timedelta(days=REFRESH_EXPIRE_DAYS),
    )


def _decode_token(token: str, expected_type: str = "access") -> str:
    """Decode & validate a JWT; returns the user_id (sub)."""
    try:
        payload = jwt.decode(token, _cfg.JWT_SECRET, algorithms=[_cfg.JWT_ALGORITHM])
        if payload.get("type") != expected_type:
            raise JWTError("wrong token type")
        sub: Optional[str] = payload.get("sub")
        if sub is None:
            raise JWTError("missing sub")
        return sub
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        )


# ── Cookie helpers ────────────────────────────────────────────────────────────
_IS_SECURE = not _cfg.DEBUG  # set Secure flag in production
_SAMESITE  = "none" if _IS_SECURE else "lax"  # cross-domain requires none+secure


def set_auth_cookies(response: Response, user_id: str) -> None:
    """Write both access and refresh tokens as httpOnly cookies."""
    response.set_cookie(
        key=_ACCESS_COOKIE,
        value=create_access_token(user_id),
        httponly=True,
        secure=_IS_SECURE,
        samesite=_SAMESITE,
        max_age=ACCESS_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key=_REFRESH_COOKIE,
        value=create_refresh_token(user_id),
        httponly=True,
        secure=_IS_SECURE,
        samesite=_SAMESITE,
        max_age=REFRESH_EXPIRE_DAYS * 86_400,
        path="/api/auth/refresh",  # restrict refresh cookie to refresh endpoint
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(_ACCESS_COOKIE,  path="/")
    response.delete_cookie(_REFRESH_COOKIE, path="/api/auth/refresh")


# ── FastAPI dependency ────────────────────────────────────────────────────────

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> "User":
    """
    Dependency: extracts the current authenticated user from the access cookie.
    Raise 401 if the cookie is missing or invalid.
    """
    token: Optional[str] = request.cookies.get(_ACCESS_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    user_id = _decode_token(token, "access")
    result  = await db.execute(select(User).where(User.id == user_id))
    user    = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Optional["User"]:
    """Like get_current_user but returns None instead of raising."""
    try:
        return await get_current_user(request, db)
    except HTTPException:
        return None
