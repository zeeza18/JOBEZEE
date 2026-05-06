"""
LinkedIn Profile Boost router
POST /api/linkedin-boost/analyze        → start job, return job_id immediately
GET  /api/linkedin-boost/status/{id}    → poll progress + result
POST /api/linkedin-boost/optimize       → rewrite sections
"""
from __future__ import annotations

import tempfile
import threading
import time
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.params import File as FFile

from ..services.linkedin_boost_service import (
    analyze_linkedin_profile,
    optimize_linkedin_profile,
)
from ..services.resume_analysis_service import _extract_pdf_text

router = APIRouter(prefix="/api/linkedin-boost", tags=["linkedin-boost"])

# ── In-memory job store (single-instance safe) ────────────────────────────────
_jobs: dict[str, dict[str, Any]] = {}
_JOB_TTL = 1800  # 30 min


def _purge_old_jobs() -> None:
    cutoff = time.time() - _JOB_TTL
    stale = [k for k, v in _jobs.items() if v.get("created_at", 0) < cutoff]
    for k in stale:
        _jobs.pop(k, None)


def _run_job(
    job_id: str,
    pdf_text: str,
    job_description: str,
    target_role: str,
    profile_image_bytes: bytes | None,
    profile_image_type: str | None,
    cover_image_bytes: bytes | None,
    cover_image_type: str | None,
) -> None:
    def on_step(step: str) -> None:
        if job_id in _jobs:
            _jobs[job_id]["step"] = step

    try:
        on_step("photos" if (profile_image_bytes or cover_image_bytes) else "scoring")

        result = analyze_linkedin_profile(
            pdf_text            = pdf_text,
            job_description     = job_description,
            target_role         = target_role,
            profile_image_bytes = profile_image_bytes,
            profile_image_type  = profile_image_type,
            cover_image_bytes   = cover_image_bytes,
            cover_image_type    = cover_image_type,
            on_step             = on_step,
        )
        _jobs[job_id]["status"] = "done"
        _jobs[job_id]["result"] = result

    except Exception as exc:
        _jobs[job_id]["status"] = "error"
        _jobs[job_id]["error"]  = str(exc)


# ── POST /analyze — returns job_id immediately ────────────────────────────────

@router.post("/analyze")
async def analyze(
    profile_pdf    : UploadFile,
    profile_image  : UploadFile | None = FFile(default=None),
    cover_image    : UploadFile | None = FFile(default=None),
    job_description: str = Form(default=""),
    target_role    : str = Form(default=""),
) -> dict:
    if not profile_pdf.filename:
        raise HTTPException(400, "profile_pdf is required")

    suffix = Path(profile_pdf.filename).suffix.lower()
    if suffix not in (".pdf", ".txt"):
        raise HTTPException(400, "Upload a LinkedIn profile PDF.")

    # Extract PDF synchronously (fast, <1s)
    pdf_bytes = await profile_pdf.read()
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = Path(tmp.name)
    try:
        pdf_text = _extract_pdf_text(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)

    if not pdf_text.strip():
        raise HTTPException(422, "Could not extract text from the PDF.")

    profile_image_bytes: bytes | None = None
    profile_image_type:  str   | None = None
    if profile_image and profile_image.filename:
        profile_image_bytes = await profile_image.read()
        profile_image_type  = profile_image.content_type or "image/jpeg"

    cover_image_bytes: bytes | None = None
    cover_image_type:  str   | None = None
    if cover_image and cover_image.filename:
        cover_image_bytes = await cover_image.read()
        cover_image_type  = cover_image.content_type or "image/jpeg"

    _purge_old_jobs()
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "status":     "processing",
        "step":       "extract",
        "created_at": time.time(),
    }

    threading.Thread(
        target  = _run_job,
        kwargs  = dict(
            job_id              = job_id,
            pdf_text            = pdf_text,
            job_description     = job_description.strip(),
            target_role         = target_role.strip(),
            profile_image_bytes = profile_image_bytes,
            profile_image_type  = profile_image_type,
            cover_image_bytes   = cover_image_bytes,
            cover_image_type    = cover_image_type,
        ),
        daemon=True,
    ).start()

    return {"job_id": job_id}


# ── GET /status/{job_id} — poll for progress ──────────────────────────────────

@router.get("/status/{job_id}")
async def status(job_id: str) -> dict:
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found or expired")

    if job["status"] == "error":
        raise HTTPException(500, job.get("error", "Analysis failed"))

    if job["status"] == "done":
        return {"status": "done", "result": job["result"]}

    return {"status": "processing", "step": job.get("step", "extract")}


# ── POST /optimize ────────────────────────────────────────────────────────────

@router.post("/optimize")
async def optimize(body: dict) -> dict:
    pdf_text     = (body.get("pdf_text")    or "").strip()
    score_result =  body.get("score_result") or {}
    target_role  = (body.get("target_role") or "").strip()

    if not pdf_text:
        raise HTTPException(400, "pdf_text is required")
    if not score_result:
        raise HTTPException(400, "score_result is required")

    try:
        return optimize_linkedin_profile(pdf_text, score_result, target_role)
    except Exception as exc:
        raise HTTPException(500, str(exc))
