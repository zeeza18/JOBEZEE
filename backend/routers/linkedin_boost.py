"""
LinkedIn Profile Boost router — thin proxy to Hetzner worker.
All Claude API calls and PDF processing run on Hetzner (2 GB RAM).
Render just forwards requests and returns responses.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..database import get_db
from ..models import LinkedInBoostResult

router = APIRouter(prefix="/api/linkedin-boost", tags=["linkedin-boost"])

_HETZNER_URL   = os.environ.get("BOT_WORKER_URL", "http://5.161.60.37:8001")
_WORKER_SECRET = os.environ.get("WORKER_SECRET", "")
_HEADERS       = {"Authorization": f"Bearer {_WORKER_SECRET}"}
_TIMEOUT       = httpx.Timeout(30.0)  # proxy hop only — Hetzner does the heavy work


def _hetzner_url(path: str) -> str:
    return f"{_HETZNER_URL}{path}"


async def _proxy_get(path: str) -> dict:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.get(_hetzner_url(path), headers=_HEADERS)
    if not r.is_success:
        try:
            detail = r.json().get("detail", r.text[:200])
        except Exception:
            detail = r.text[:200]
        raise HTTPException(r.status_code, detail)
    return r.json()


# ── Image analysis ────────────────────────────────────────────────────────────

@router.post("/analyze-photo")
async def analyze_photo(profile_image: UploadFile) -> dict:
    files = [("profile_image", (profile_image.filename, await profile_image.read(), profile_image.content_type or "image/jpeg"))]
    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
        r = await client.post(_hetzner_url("/api/linkedin-boost/analyze-photo"), headers=_HEADERS, files=files)
    if not r.is_success:
        try: detail = r.json().get("detail", r.text[:200])
        except Exception: detail = r.text[:200]
        raise HTTPException(r.status_code, detail)
    return r.json()


@router.get("/photo-status/{job_id}")
async def photo_status(job_id: str) -> dict:
    return await _proxy_get(f"/api/linkedin-boost/photo-status/{job_id}")


@router.post("/analyze-cover")
async def analyze_cover(cover_image: UploadFile) -> dict:
    files = [("cover_image", (cover_image.filename, await cover_image.read(), cover_image.content_type or "image/jpeg"))]
    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
        r = await client.post(_hetzner_url("/api/linkedin-boost/analyze-cover"), headers=_HEADERS, files=files)
    if not r.is_success:
        try: detail = r.json().get("detail", r.text[:200])
        except Exception: detail = r.text[:200]
        raise HTTPException(r.status_code, detail)
    return r.json()


@router.get("/cover-status/{job_id}")
async def cover_status(job_id: str) -> dict:
    return await _proxy_get(f"/api/linkedin-boost/cover-status/{job_id}")


# ── Analyze ───────────────────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze(
    profile_pdf    : UploadFile,
    job_description: str = Form(default=""),
    target_role    : str = Form(default=""),
) -> dict:
    if not profile_pdf.filename:
        raise HTTPException(400, "profile_pdf is required")
    if Path(profile_pdf.filename).suffix.lower() not in (".pdf", ".txt"):
        raise HTTPException(400, "Upload a LinkedIn profile PDF.")

    files: list = [("profile_pdf", (profile_pdf.filename, await profile_pdf.read(), profile_pdf.content_type or "application/pdf"))]

    data = {}
    if job_description.strip(): data["job_description"] = job_description.strip()
    if target_role.strip():     data["target_role"]     = target_role.strip()

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.post(_hetzner_url("/api/linkedin-boost/analyze"),
                              headers=_HEADERS, files=files, data=data)
    if not r.is_success:
        try:
            detail = r.json().get("detail", r.text[:200])
        except Exception:
            detail = r.text[:200]
        raise HTTPException(r.status_code, detail)
    return r.json()


@router.get("/status/{job_id}")
async def analyze_status(job_id: str) -> dict:
    return await _proxy_get(f"/api/linkedin-boost/status/{job_id}")


# ── Optimize ──────────────────────────────────────────────────────────────────

@router.post("/optimize")
async def optimize(body: dict) -> dict:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.post(_hetzner_url("/api/linkedin-boost/optimize"),
                              headers=_HEADERS, json=body)
    if not r.is_success:
        try:
            detail = r.json().get("detail", r.text[:200])
        except Exception:
            detail = r.text[:200]
        raise HTTPException(r.status_code, detail)
    return r.json()


@router.get("/optimize-status/{job_id}")
async def optimize_status(job_id: str) -> dict:
    return await _proxy_get(f"/api/linkedin-boost/optimize-status/{job_id}")


# ── Persist / load boost results ─────────────────────────────────────────────

@router.post("/save")
async def save_boost_result(
    body: dict,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Upsert the user's latest boost result, optimize result, and image results."""
    # Use sentinel to distinguish "not provided" from explicit null (clear)
    _MISSING = object()
    result          = body.get("result",          _MISSING)
    optimize_result = body.get("optimize_result", _MISSING)
    target_role     = body.get("target_role",     "")
    photo_result    = body.get("photo_result",    _MISSING)
    cover_result    = body.get("cover_result",    _MISSING)
    photo_data_url  = body.get("photo_data_url",  _MISSING)
    cover_data_url  = body.get("cover_data_url",  _MISSING)

    has_anything = any(v is not _MISSING for v in [result, optimize_result, photo_result, cover_result, photo_data_url, cover_data_url])
    if not has_anything:
        raise HTTPException(400, "nothing to save")

    existing = (await db.execute(
        select(LinkedInBoostResult).where(LinkedInBoostResult.user_id == str(current_user.id))
    )).scalar_one_or_none()

    def _set(obj: Any, field: str, val: Any) -> None:
        if val is not _MISSING:
            setattr(obj, field, val)  # val=None means explicit clear

    if existing:
        _set(existing, "result",          result)
        _set(existing, "optimize_result", optimize_result)
        if target_role: existing.target_role = target_role
        _set(existing, "photo_result",    photo_result)
        _set(existing, "cover_result",    cover_result)
        _set(existing, "photo_data_url",  photo_data_url)
        _set(existing, "cover_data_url",  cover_data_url)
        await db.commit()
    else:
        stmt = pg_insert(LinkedInBoostResult).values(
            user_id        = str(current_user.id),
            result         = None if result is _MISSING else result,
            optimize_result= None if optimize_result is _MISSING else optimize_result,
            target_role    = target_role,
            photo_result   = None if photo_result is _MISSING else photo_result,
            cover_result   = None if cover_result is _MISSING else cover_result,
            photo_data_url = None if photo_data_url is _MISSING else photo_data_url,
            cover_data_url = None if cover_data_url is _MISSING else cover_data_url,
        ).on_conflict_do_update(
            index_elements=["user_id"],
            set_={
                "result":          None if result is _MISSING else result,
                "optimize_result": None if optimize_result is _MISSING else optimize_result,
                "target_role":     target_role,
                "photo_result":    None if photo_result is _MISSING else photo_result,
                "cover_result":    None if cover_result is _MISSING else cover_result,
                "photo_data_url":  None if photo_data_url is _MISSING else photo_data_url,
                "cover_data_url":  None if cover_data_url is _MISSING else cover_data_url,
                "updated_at":      __import__("sqlalchemy").func.now(),
            },
        )
        await db.execute(stmt)
        await db.commit()
    return {"ok": True}


@router.get("/saved")
async def get_saved_boost_result(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return the user's most recent saved boost result, or null if none."""
    row = (await db.execute(
        select(LinkedInBoostResult).where(LinkedInBoostResult.user_id == str(current_user.id))
    )).scalar_one_or_none()

    if not row:
        return {"found": False}

    return {
        "found":           True,
        "result":          row.result,
        "optimize_result": row.optimize_result,
        "target_role":     row.target_role,
        "photo_result":    row.photo_result,
        "cover_result":    row.cover_result,
        "photo_data_url":  row.photo_data_url,
        "cover_data_url":  row.cover_data_url,
        "updated_at":      row.updated_at.isoformat() if row.updated_at is not None else None,
    }
