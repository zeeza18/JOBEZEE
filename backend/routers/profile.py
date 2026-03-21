"""
/api/profile — CRUD for user job-search preferences.

Endpoints
---------
GET  /api/profile/          — fetch current user's profile (auto-creates if missing)
PUT  /api/profile/          — full replace / create profile
POST /api/profile/resume    — upload resume file
"""
from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path

import re

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..auth import get_current_user
from ..database import get_db
from ..models import User, UserProfile
from ..schemas import UserProfileCreate, UserProfileResponse

router = APIRouter()

# Sensitive fields — never returned in GET, skipped in PUT if empty
_SENSITIVE = frozenset({
    "apply_password",
    "linkedin_password",
    "indeed_password",
    "greenhouse_password",
    "workday_password",
    "gmail_api_key",
    "openai_api_key",
    "anthropic_api_key",
})


def _profile_id_for(user: User) -> uuid.UUID:
    """Each user gets a profile whose PK == their user UUID."""
    return uuid.UUID(user.id)


def _masked_response(profile: UserProfile) -> dict:
    """Return profile dict with sensitive fields included + credentials_set map."""
    d = UserProfileResponse.model_validate(profile).model_dump(mode="json")
    credentials_set: dict[str, bool] = {}
    for field in _SENSITIVE:
        raw = getattr(profile, field, "") or ""
        credentials_set[field] = bool(raw.strip())
        # Return actual value so user can view/edit what they saved
        d[field] = raw
    d["credentials_set"] = credentials_set
    return d


# ── GET ───────────────────────────────────────────────────────────────────────

@router.get("/")
async def get_profile(
    current_user : User          = Depends(get_current_user),
    db           : AsyncSession  = Depends(get_db),
):
    pid    = _profile_id_for(current_user)
    result = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile = result.scalar_one_or_none()

    if not profile:
        profile = UserProfile(id=pid, full_name=current_user.full_name, email=current_user.email)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return _masked_response(profile)


# ── PUT ───────────────────────────────────────────────────────────────────────

@router.put("/")
async def update_profile(
    data         : UserProfileCreate,
    current_user : User          = Depends(get_current_user),
    db           : AsyncSession  = Depends(get_db),
):
    pid    = _profile_id_for(current_user)
    result = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile = result.scalar_one_or_none()

    update_dict = data.model_dump()
    # Never overwrite an existing sensitive value with an empty string
    for field in _SENSITIVE:
        if field in update_dict and not (update_dict[field] or "").strip():
            update_dict.pop(field)

    if not profile:
        profile = UserProfile(id=pid, **update_dict)
        db.add(profile)
    else:
        for key, val in update_dict.items():
            setattr(profile, key, val)

    await db.commit()
    await db.refresh(profile)
    return _masked_response(profile)


# ── Resume upload ─────────────────────────────────────────────────────────────

@router.post("/resume")
async def upload_resume(
    file         : UploadFile     = File(...),
    current_user : User           = Depends(get_current_user),
    db           : AsyncSession   = Depends(get_db),
) -> dict:
    from ..config import get_settings
    cfg = get_settings()

    upload_dir = os.path.join(cfg.UPLOAD_DIR, "resumes")
    os.makedirs(upload_dir, exist_ok=True)

    safe_name = f"{uuid.uuid4()}_{file.filename}"
    dest_path = os.path.join(upload_dir, safe_name)

    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    pid    = _profile_id_for(current_user)
    result = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile = result.scalar_one_or_none()

    if not profile:
        profile = UserProfile(id=pid, full_name=current_user.full_name, email=current_user.email)
        db.add(profile)

    profile.resume_filename = file.filename or ""
    profile.resume_url      = f"/uploads/resumes/{safe_name}"
    await db.commit()

    return {"filename": file.filename, "url": f"/uploads/resumes/{safe_name}"}


# ── Avatar upload ──────────────────────────────────────────────────────────────

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a profile avatar image (jpg/png/webp, max 5 MB)."""
    from ..config import get_settings
    cfg = get_settings()

    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(400, "Only JPG, PNG, WebP or GIF images are allowed.")

    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "Avatar must be under 5 MB.")

    ext      = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    dest_dir = Path(cfg.UPLOAD_DIR) / "avatars"
    dest_dir.mkdir(parents=True, exist_ok=True)
    (dest_dir / filename).write_bytes(data)

    url = f"/uploads/avatars/{filename}"
    pid = uuid.UUID(current_user.id)
    res = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Profile not found")
    profile.avatar_url = url
    await db.commit()
    return {"avatar_url": url, "filename": filename}


# ── Remove avatar ─────────────────────────────────────────────────────────────

@router.post("/avatar/remove")
async def remove_avatar(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear the user's avatar URL (does not delete the file from disk)."""
    pid = _profile_id_for(current_user)
    res = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Profile not found")
    profile.avatar_url = ""
    await db.commit()
    return {"avatar_url": ""}


# ── LinkedIn avatar scrape ────────────────────────────────────────────────────

@router.get("/linkedin-avatar")
async def get_linkedin_avatar(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Try to extract the user's profile photo from their public LinkedIn page."""
    pid    = _profile_id_for(current_user)
    res    = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile = res.scalar_one_or_none()

    if not profile or not profile.linkedin:
        return {"avatar_url": None, "reason": "no_linkedin_url"}

    url = profile.linkedin.strip()
    if not url.startswith("http"):
        url = f"https://www.linkedin.com/in/{url.lstrip('/')}"

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=8) as client:
            r = await client.get(url, headers=headers)
        match = re.search(r'<meta property="og:image"\s+content="([^"]+)"', r.text)
        if not match:
            match = re.search(r'<meta content="([^"]+)"\s+property="og:image"', r.text)
        if match:
            img = match.group(1)
            # reject generic LinkedIn ghost/logo images
            if "ghost" not in img and "logo" not in img and "static" not in img:
                return {"avatar_url": img}
        return {"avatar_url": None, "reason": "private_or_no_photo"}
    except Exception:
        return {"avatar_url": None, "reason": "fetch_failed"}


# ── Save avatar from remote URL ───────────────────────────────────────────────

@router.post("/avatar-from-url")
async def avatar_from_url(
    payload: dict,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download an image from a URL and save it as the user's avatar."""
    from ..config import get_settings
    cfg = get_settings()

    img_url: str = payload.get("url", "").strip()
    if not img_url:
        raise HTTPException(400, "url is required")

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
            r = await client.get(img_url, headers={"User-Agent": "Mozilla/5.0"})
        if r.status_code != 200:
            raise HTTPException(502, "Could not download image")
        data = r.content
    except httpx.HTTPError as e:
        raise HTTPException(502, str(e))

    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "Image too large (max 5 MB)")

    ct = r.headers.get("content-type", "image/jpeg")
    ext = "jpg" if "jpeg" in ct else ct.split("/")[-1].split(";")[0].strip() or "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    dest_dir  = Path(cfg.UPLOAD_DIR) / "avatars"
    dest_dir.mkdir(parents=True, exist_ok=True)
    (dest_dir / filename).write_bytes(data)

    saved_url = f"/uploads/avatars/{filename}"
    pid = _profile_id_for(current_user)
    res = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Profile not found")
    profile.avatar_url = saved_url
    await db.commit()
    return {"avatar_url": saved_url}

