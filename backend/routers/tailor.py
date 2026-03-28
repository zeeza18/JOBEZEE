"""
Tailor router — POST /api/tailor/run, GET /api/tailor/status/{id},
GET /api/tailor/stream/{id}, GET /api/tailor/download/{id},
POST /api/tailor/run-for-job, GET /api/tailor/resume/{id}
"""
from __future__ import annotations

import asyncio
import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..crypto import decrypt
from ..database import get_db
from ..models import PulledJob, UserProfile
from ..services.tailor_service import (
    _extract_resume_text,
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
async def start_tailor(
    req: TailorRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start the tailoring pipeline with pasted text. Returns immediately with job_id."""
    if not req.job_description.strip():
        raise HTTPException(400, "job_description is required")
    if not req.resume.strip():
        raise HTTPException(400, "resume is required")

    # Fetch user's OpenAI key (encrypted in DB); fall back to server env var
    import os as _os, uuid as _uuid
    _pid = _uuid.UUID(current_user.id)
    _prof_res = await db.execute(select(UserProfile).where(UserProfile.id == _pid))
    _profile = _prof_res.scalar_one_or_none()
    openai_key = decrypt((getattr(_profile, "openai_api_key", "") or "")).strip()
    if not openai_key:
        openai_key = (_os.getenv("OPENAI_API_KEY") or "").strip()
    if not openai_key:
        raise HTTPException(400, "OpenAI API key not configured. Add it in Settings → Credentials.")

    # Prepend profile contact header so Tool 4 renders correct links in LaTeX
    resume_with_header = _inject_contact_header(req.resume, _profile, current_user)

    _name_raw = (current_user.full_name or "").strip()
    _username = (_name_raw if _name_raw and "@" not in _name_raw else current_user.email.split("@")[0]).replace(" ", "_")
    job_id = create_job()
    start_tailor_job(job_id, req.job_description, resume_with_header, openai_api_key=openai_key, username=_username)
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

    import os as _os
    openai_key = decrypt((getattr(profile, "openai_api_key", "") or "")).strip()
    if not openai_key:
        openai_key = (_os.getenv("OPENAI_API_KEY") or "").strip()
    if not openai_key:
        raise HTTPException(400, "OpenAI API key not configured. Add it in Settings → Credentials.")

    contact_header = _build_contact_header(profile, current_user)

    tailor_job_id = create_job()
    start_tailor_job_for_job(
        tailor_job_id,
        pulled_job.description,
        resume_url,
        username,
        company,
        openai_api_key=openai_key,
        contact_header=contact_header,
    )
    return {"job_id": tailor_job_id, "status": "running"}


# ── Poll status ───────────────────────────────────────────────────────────────

@router.get("/status/{job_id}")
async def get_status(job_id: str, _user=Depends(get_current_user)):
    import shutil
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
        "pdflatex_available": shutil.which("pdflatex") is not None,
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
        heartbeat = 0
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

            # Send a comment every 15 s to keep proxy/firewall from closing idle stream
            heartbeat += 1
            if heartbeat % 15 == 0:
                yield ": keepalive\n\n"

            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # tells nginx not to buffer SSE
            "Connection": "keep-alive",
        },
    )


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


# ── Extract text from uploaded resume file ────────────────────────────────────

@router.post("/extract-resume-text")
async def extract_resume_text(
    file: UploadFile = File(...),
    _user=Depends(get_current_user),
) -> dict:
    """Accept a .pdf / .docx / .txt file and return extracted plain text."""
    import tempfile, shutil
    suffix = Path(file.filename or "").suffix.lower() or ".tmp"
    allowed = {".pdf", ".docx", ".doc", ".txt"}
    if suffix not in allowed:
        raise HTTPException(400, f"Unsupported file type '{suffix}'. Use PDF, DOCX, or TXT.")
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = Path(tmp.name)
    try:
        if suffix == ".txt":
            text = tmp_path.read_text(errors="replace")
        else:
            text = _extract_resume_text(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)
    if not text.strip():
        raise HTTPException(422, "Could not extract text from the file.")
    return {"text": text}


# ── Load resume text from user profile ───────────────────────────────────────

@router.get("/profile-resume-text")
async def profile_resume_text(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return extracted text from the resume stored in the user's profile."""
    from ..config import get_settings
    cfg = get_settings()
    pid = uuid.UUID(current_user.id)
    result = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile = result.scalar_one_or_none()
    resume_url = (profile.resume_url if profile else "") or ""
    if not resume_url:
        raise HTTPException(404, "No resume on file. Upload one via Profile → Resume.")
    # resume_url is like /uploads/resumes/<filename>
    # Resolve UPLOAD_DIR relative to JOBEZEE root (parent of backend package)
    jobezee_root = Path(__file__).resolve().parent.parent.parent
    upload_root = jobezee_root / cfg.UPLOAD_DIR
    # Strip the leading /uploads/ URL prefix to get path within UPLOAD_DIR
    rel = resume_url.lstrip("/")          # "uploads/resumes/<filename>"
    rel = rel[len("uploads/"):]           # "resumes/<filename>"
    file_path = upload_root / rel
    if not file_path.exists():
        # File wiped from ephemeral disk — recover from DB-stored base64 bytes
        _bytes_b64 = getattr(profile, "resume_bytes", "") or ""
        if _bytes_b64:
            import base64 as _b64, tempfile as _tmp
            _tmp_dir = Path(_tmp.mkdtemp())
            _tmp_path = _tmp_dir / file_path.name
            _tmp_path.write_bytes(_b64.b64decode(_bytes_b64))
            file_path = _tmp_path
        else:
            raise HTTPException(404, f"Resume file not found on server ({file_path.name}). Please re-upload via Profile → Resume.")
    suffix = file_path.suffix.lower()
    if suffix == ".txt":
        text = file_path.read_text(errors="replace")
    else:
        text = _extract_resume_text(file_path)
    if not text.strip():
        raise HTTPException(422, "Could not extract text from the stored resume.")
    return {"text": text, "filename": profile.resume_filename or file_path.name}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_contact_header(profile, user) -> str:
    """Build a plain-text contact header from profile fields."""
    parts = []
    name = (getattr(profile, "full_name", "") or getattr(user, "full_name", "") or "").strip()
    if name:
        parts.append(name)
    phone    = (getattr(profile, "phone",    "") or "").strip()
    email    = (getattr(profile, "email",    "") or getattr(user, "email", "") or "").strip()
    city     = (getattr(profile, "city",     "") or "").strip()
    linkedin  = (getattr(profile, "linkedin",  "") or "").strip()
    github    = (getattr(profile, "github",    "") or "").strip()
    portfolio = (getattr(profile, "portfolio", "") or "").strip()
    contact_line = " | ".join(x for x in [phone, email, linkedin, portfolio, github, city] if x)
    if contact_line:
        parts.append(contact_line)
    return "\n".join(parts)


def _inject_contact_header(resume_text: str, profile, user) -> str:
    """
    Prepend the profile contact header to the resume text if the header
    fields are not already present (avoids duplicating info already there).
    """
    header = _build_contact_header(profile, user)
    if not header:
        return resume_text
    # If the user's name already appears on the first line, skip injection
    name = (getattr(profile, "full_name", "") or getattr(user, "full_name", "") or "").strip()
    first_line = resume_text.strip().split("\n")[0].strip() if resume_text.strip() else ""
    if name and name.lower() in first_line.lower():
        return resume_text
    return header + "\n\n" + resume_text
