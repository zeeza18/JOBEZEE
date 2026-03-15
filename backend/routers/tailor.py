"""
Tailor router — POST /api/tailor/run, GET /api/tailor/status/{id},
GET /api/tailor/stream/{id}, GET /api/tailor/download/{id},
POST /api/tailor/run-for-job, GET /api/tailor/resume/{id}
"""
from __future__ import annotations

import asyncio
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..database import get_db
from ..models import PulledJob, UserProfile
from ..services.tailor_service import (
    create_job,
    get_job,
    start_tailor_job,
    start_tailor_job_for_job,
)

router = APIRouter()


class TailorRequest(BaseModel):
    job_description: str
    resume: str


class TailorForJobRequest(BaseModel):
    job_id: str   # pulled_job UUID


# ── Start job (plain text — TailorPage) ───────────────────────────────────────

@router.post("/run")
async def start_tailor(req: TailorRequest, _user=Depends(get_current_user)):
    """Start the tailoring pipeline with pasted text. Returns immediately with job_id."""
    if not req.job_description.strip():
        raise HTTPException(400, "job_description is required")
    if not req.resume.strip():
        raise HTTPException(400, "resume is required")

    job_id = create_job()
    start_tailor_job(job_id, req.job_description, req.resume)
    return {"job_id": job_id, "status": "running"}


# ── Start job for a pulled job (job-card Tailor button) ───────────────────────

@router.post("/run-for-job")
async def start_tailor_for_job(
    req: TailorForJobRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Start tailoring for a specific pulled job.
    Loads the job description from the DB and the user's uploaded resume from their profile.
    """
    try:
        jid = uuid.UUID(req.job_id)
    except ValueError:
        raise HTTPException(400, "Invalid job_id")

    # Load the pulled job
    job_res = await db.execute(select(PulledJob).where(PulledJob.id == jid))
    pulled_job = job_res.scalar_one_or_none()
    if not pulled_job:
        raise HTTPException(404, "Job not found")
    if not (pulled_job.description or "").strip():
        raise HTTPException(400, "Job has no description — cannot tailor")

    # Load user profile to get resume path
    profile_id = uuid.UUID(current_user.id)
    prof_res = await db.execute(select(UserProfile).where(UserProfile.id == profile_id))
    profile = prof_res.scalar_one_or_none()

    resume_url = (profile.resume_url if profile else "") or ""
    if not resume_url:
        raise HTTPException(
            400,
            "No resume on file. Please upload your resume (Profile → Resume Upload) before tailoring."
        )

    # Build a clean output filename: username_company
    name_raw = current_user.full_name or current_user.email.split("@")[0]
    username = name_raw.replace(" ", "_")
    company = pulled_job.company or "company"

    tailor_job_id = create_job()
    start_tailor_job_for_job(
        tailor_job_id,
        pulled_job.description,
        resume_url,
        username,
        company,
    )
    return {"job_id": tailor_job_id, "status": "running"}


# ── Poll status ───────────────────────────────────────────────────────────────

@router.get("/status/{job_id}")
async def get_status(job_id: str, _user=Depends(get_current_user)):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return {
        "status": job["status"],
        "score": job.get("score"),
        "has_pdf": job.get("pdf_path") is not None,
        "has_tex": job.get("tex_path") is not None,
        "filename": job.get("filename"),
        "error": job.get("error"),
        "progress_count": len(job.get("progress", [])),
    }


# ── Get tailored resume text ──────────────────────────────────────────────────

@router.get("/resume/{job_id}")
async def get_resume_text(job_id: str, _user=Depends(get_current_user)):
    """Return the final tailored resume text and score for a completed job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job["status"] not in ("complete", "error"):
        raise HTTPException(400, f"Job not complete yet (status: {job['status']})")
    return {
        "resume": job.get("final_resume", ""),
        "score": job.get("score"),
        "filename": job.get("filename"),
    }


# ── SSE stream ────────────────────────────────────────────────────────────────

@router.get("/stream/{job_id}")
async def stream_job(job_id: str):
    """Server-Sent Events stream — no auth required for EventSource compatibility."""

    async def event_generator():
        seen = 0
        while True:
            job = get_job(job_id)
            if not job:
                yield f"data: {json.dumps({'error': 'job not found'})}\n\n"
                return

            events = job.get("progress", [])
            while seen < len(events):
                yield f"data: {json.dumps(events[seen])}\n\n"
                seen += 1

            if job["status"] in ("complete", "error"):
                final = {
                    "event": "done",
                    "status": job["status"],
                    "score": job.get("score"),
                    "has_pdf": job.get("pdf_path") is not None,
                    "filename": job.get("filename"),
                    "error": job.get("error"),
                }
                yield f"data: {json.dumps(final)}\n\n"
                return

            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── Download PDF ──────────────────────────────────────────────────────────────

@router.get("/download/{job_id}")
async def download_pdf(job_id: str, _user=Depends(get_current_user)):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job["status"] != "complete":
        raise HTTPException(400, f"Job is not complete yet (status: {job['status']})")
    if not job.get("pdf_path"):
        raise HTTPException(404, "PDF not available — pdflatex may not be installed")
    filename = f"{job.get('filename', 'tailored_resume')}.pdf"
    return FileResponse(
        job["pdf_path"],
        media_type="application/pdf",
        filename=filename,
    )


# ── Download .tex ─────────────────────────────────────────────────────────────

@router.get("/download-tex/{job_id}")
async def download_tex(job_id: str, _user=Depends(get_current_user)):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if not job.get("tex_path"):
        raise HTTPException(404, "LaTeX file not available")
    filename = f"{job.get('filename', 'tailored_resume')}.tex"
    return FileResponse(
        job["tex_path"],
        media_type="application/x-tex",
        filename=filename,
    )
