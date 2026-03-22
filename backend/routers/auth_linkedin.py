"""
LinkedIn OAuth 2.0 (OpenID Connect) — Sign in with LinkedIn.

Flow:
  GET  /api/auth/linkedin           → redirect user to LinkedIn consent screen
  GET  /api/auth/linkedin/callback  → exchange code → tokens → user info → JWT cookies → redirect /app
"""
from __future__ import annotations

import secrets
import time
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import hash_password, set_auth_cookies
from ..config import get_settings
from ..database import get_db
from ..models import User, UserProfile

router = APIRouter()

# ── Config from settings ──────────────────────────────────────────────────────
def _cfg():
    s = get_settings()
    return {
        "client_id":     s.LINKEDIN_CLIENT_ID,
        "client_secret": s.LINKEDIN_CLIENT_SECRET,
        "redirect_uri":  s.LINKEDIN_REDIRECT_URI,
        "frontend_url":  s.FRONTEND_URL,
    }

_SCOPES       = "openid profile email"
_AUTH_URL     = "https://www.linkedin.com/oauth/v2/authorization"
_TOKEN_URL    = "https://www.linkedin.com/oauth/v2/accessToken"
_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"
_STATE_TTL    = 10 * 60  # 10 minutes — states expire after this

# { state: issued_at_timestamp }
_pending_states: dict[str, float] = {}


def _prune_states() -> None:
    """Remove expired CSRF states."""
    now = time.monotonic()
    expired = [s for s, ts in _pending_states.items() if now - ts > _STATE_TTL]
    for s in expired:
        del _pending_states[s]


# ── Step 1 — redirect to LinkedIn ────────────────────────────────────────────

@router.get("/linkedin")
async def linkedin_login():
    cfg = _cfg()
    if not cfg["client_id"]:
        raise HTTPException(500, "LINKEDIN_CLIENT_ID not configured in .env")

    _prune_states()
    state = secrets.token_urlsafe(24)
    _pending_states[state] = time.monotonic()

    params = (
        f"response_type=code"
        f"&client_id={cfg['client_id']}"
        f"&redirect_uri={cfg['redirect_uri']}"
        f"&scope={_SCOPES.replace(' ', '%20')}"
        f"&state={state}"
    )
    return RedirectResponse(f"{_AUTH_URL}?{params}")


# ── Step 2 — callback from LinkedIn ──────────────────────────────────────────

@router.get("/linkedin/callback")
async def linkedin_callback(
    request:  Request,
    response: Response,
    db:       AsyncSession = Depends(get_db),
):
    code  = request.query_params.get("code")
    state = request.query_params.get("state")
    error = request.query_params.get("error")
    cfg   = _cfg()

    if error:
        return RedirectResponse(f"{cfg['frontend_url']}/auth?error={error}")
    if not code:
        return RedirectResponse(f"{cfg['frontend_url']}/auth?error=no_code")

    # Validate + consume CSRF state (also check it hasn't expired)
    _prune_states()
    if state not in _pending_states:
        return RedirectResponse(f"{cfg['frontend_url']}/auth?error=invalid_state")
    del _pending_states[state]

    # Exchange code for access token
    async with httpx.AsyncClient(timeout=10) as client:
        token_res = await client.post(
            _TOKEN_URL,
            data={
                "grant_type":    "authorization_code",
                "code":          code,
                "redirect_uri":  cfg["redirect_uri"],
                "client_id":     cfg["client_id"],
                "client_secret": cfg["client_secret"],
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            return RedirectResponse(f"{cfg['frontend_url']}/auth?error=token_exchange_failed")

        access_token = token_res.json().get("access_token", "")
        if not access_token:
            return RedirectResponse(f"{cfg['frontend_url']}/auth?error=no_access_token")

        # Fetch user info via OpenID Connect userinfo endpoint
        info_res = await client.get(
            _USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if info_res.status_code != 200:
            return RedirectResponse(f"{cfg['frontend_url']}/auth?error=userinfo_failed")

        info      = info_res.json()
        email     = info.get("email", "")
        full_name = info.get("name", "")
        picture   = info.get("picture", "")   # LinkedIn profile photo URL

    if not email:
        return RedirectResponse(f"{cfg['frontend_url']}/auth?error=no_email")

    # ── Find or create User ───────────────────────────────────────────────────
    res    = await db.execute(select(User).where(User.email == email))
    user   = res.scalar_one_or_none()
    is_new = user is None

    if not user:
        user = User(
            id              = str(uuid.uuid4()),
            email           = email,
            full_name       = full_name,
            hashed_password = hash_password(secrets.token_urlsafe(32)),  # random, unusable
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # ── Upsert UserProfile — save name, email, and LinkedIn avatar ────────────
    pid        = uuid.UUID(user.id)
    prof_res   = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile    = prof_res.scalar_one_or_none()

    if not profile:
        profile = UserProfile(
            id             = pid,
            full_name      = full_name,
            email          = email,
            avatar_url     = picture or "",
            linkedin_email = email,
        )
        db.add(profile)
    else:
        # Always keep full_name + email fresh from LinkedIn
        profile.full_name = profile.full_name or full_name
        profile.email     = profile.email     or email
        # Auto-fill linkedin_email if not already set manually
        if not profile.linkedin_email:
            profile.linkedin_email = email
        # Only update avatar if user hasn't set their own
        if picture and not profile.avatar_url:
            profile.avatar_url = picture

    await db.commit()

    # ── Set JWT cookies and redirect ─────────────────────────────────────────
    redirect = RedirectResponse(
        cfg["frontend_url"] + ("/onboarding" if is_new else "/app"),
        status_code=302,
    )
    set_auth_cookies(redirect, user.id)
    return redirect
