"""
LinkedIn Profile Boost router — thin proxy to Hetzner worker.
All Claude API calls and PDF processing run on Hetzner (2 GB RAM).
Render just forwards requests and returns responses.
"""
from __future__ import annotations

import os
from pathlib import Path

import httpx
from fastapi import APIRouter, Form, HTTPException, UploadFile

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
