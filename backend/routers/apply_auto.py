"""
Auto-apply router — Phase 3 integration.

POST /api/apply/run-for-url    — apply to a pasted job URL
POST /api/apply/run-for-job    — apply to a pulled job (by pulled_job UUID)
GET  /api/apply/status/{id}    — poll apply job status
GET  /api/apply/stream/{id}    — SSE live progress stream
POST /api/apply/warm-sessions  — pre-login to LinkedIn/Indeed in background
"""
from __future__ import annotations

import asyncio
import json
import threading
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..config import get_settings
from ..database import get_db
from ..models import PulledJob, UserProfile
from ..services.apply_service import (
    create_apply_job,
    get_apply_job,
    start_apply_for_url,
)

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _resolve_resume_pdf(resume_url: str) -> Path:
    """Convert a DB resume_url (/uploads/resumes/...) to an absolute Path."""
    cfg = get_settings()
    jobezee_root = Path(__file__).resolve().parent.parent.parent
    upload_root  = jobezee_root / cfg.UPLOAD_DIR
    rel = resume_url.lstrip("/")
    if rel.startswith("uploads/"):
        rel = rel[len("uploads/"):]
    return upload_root / rel


async def _get_resume_and_creds(user_id: str, db: AsyncSession) -> tuple[Path, str, str]:
    """Fetch resume PDF path + apply credentials.

    Credential priority:
      1. profile.apply_email / profile.apply_password (DB, user-specific)
      2. JOB_APP_EMAIL / JOB_APP_PASSWORD env vars (global fallback from .env)
      3. user.email (JOBEZEE account email, last resort)
    """
    import os
    from ..models import User
    pid = uuid.UUID(user_id)

    profile_res = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile = profile_res.scalar_one_or_none()

    # User.id is stored as String(36), not UUID
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()

    resume_url = (profile.resume_url if profile else "") or ""
    if not resume_url:
        raise HTTPException(
            400,
            "No resume on file. Upload one via Profile → Resume before applying.",
        )

    path = _resolve_resume_pdf(resume_url)
    if not path.exists():
        raise HTTPException(404, f"Resume file not found on server ({path.name}).")

    # Email: profile apply_password field (if set), else JOB_APP_EMAIL env, else account email
    db_password = (profile.apply_password if profile else "") or ""
    password = db_password or os.environ.get("JOB_APP_PASSWORD", "")

    account_email = (user.email if user else "") or ""
    email = os.environ.get("JOB_APP_EMAIL", "") or account_email

    return path, email, password


# ── Request models ────────────────────────────────────────────────────────────

class ApplyForUrlRequest(BaseModel):
    url:               str
    dry_run:           bool = False
    tailor_before_apply: bool = False   # ignored for URL applies (no JD available)


class ApplyForJobRequest(BaseModel):
    job_id:              str
    dry_run:             bool = False
    tailor_before_apply: bool = False   # if True: tailor resume first, then apply


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/run-for-url")
async def run_for_url(
    req: ApplyForUrlRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start auto-apply for a pasted job URL."""
    if not req.url.strip():
        raise HTTPException(400, "url is required")

    resume_pdf, email, password = await _get_resume_and_creds(current_user.id, db)
    apply_job_id = create_apply_job()
    start_apply_for_url(apply_job_id, req.url.strip(), str(resume_pdf), req.dry_run,
                        user_email=email, user_password=password)
    return {"apply_job_id": apply_job_id, "status": "running"}



@router.post("/run-for-job")
async def run_for_job(
    req: ApplyForJobRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start auto-apply for a pulled job by its UUID.

    If tailor_before_apply=True, runs the tailoring pipeline first and
    applies with the tailored PDF instead of the raw uploaded resume.
    """
    try:
        jid = uuid.UUID(req.job_id)
    except ValueError:
        raise HTTPException(400, "Invalid job_id")

    job_res = await db.execute(select(PulledJob).where(PulledJob.id == jid))
    pulled_job = job_res.scalar_one_or_none()
    if not pulled_job:
        raise HTTPException(404, "Job not found")
    if not (pulled_job.url or "").strip():
        raise HTTPException(400, "Job has no URL")

    resume_pdf, email, password = await _get_resume_and_creds(current_user.id, db)

    # ── Tailor first if requested ─────────────────────────────────────────────
    if req.tailor_before_apply and (pulled_job.description or "").strip():
        from ..services.tailor_service import (
            create_job as create_tailor_job,
            get_job   as get_tailor_job,
            start_tailor_job_for_job,
        )
        from ..models import UserProfile as _UP
        _pid = uuid.UUID(current_user.id)
        _prof_res = await db.execute(select(_UP).where(_UP.id == _pid))
        _profile  = _prof_res.scalar_one_or_none()
        resume_url = (_profile.resume_url if _profile else "") or ""

        name_raw = current_user.full_name or current_user.email.split("@")[0]
        company  = pulled_job.company or "company"
        tailor_id = create_tailor_job()
        start_tailor_job_for_job(
            tailor_id, pulled_job.description, resume_url,
            name_raw.replace(" ", "_"), company,
        )

        # Poll until tailor completes (max 3 min)
        for _ in range(180):
            await asyncio.sleep(1)
            tj = get_tailor_job(tailor_id)
            if not tj:
                break
            if tj["status"] == "complete":
                if tj.get("pdf_path"):
                    resume_pdf = Path(tj["pdf_path"])
                break
            if tj["status"] == "error":
                break  # fall through to apply with original resume

    apply_job_id = create_apply_job()
    start_apply_for_url(
        apply_job_id, pulled_job.url.strip(), str(resume_pdf), req.dry_run,
        pulled_job_id=str(pulled_job.id),
        company=pulled_job.company or '',
        job_title=pulled_job.title or '',
        user_email=email,
        user_password=password,
    )
    return {
        "apply_job_id": apply_job_id,
        "status":       "running",
        "job_title":    pulled_job.title,
        "company":      pulled_job.company,
        "tailored":     req.tailor_before_apply,
    }


@router.get("/status/{apply_job_id}")
async def get_status(apply_job_id: str, _user=Depends(get_current_user)):
    job = get_apply_job(apply_job_id)
    if not job:
        raise HTTPException(404, "Apply job not found")
    return {
        "status":         job["status"],
        "result":         job.get("result"),
        "error":          job.get("error"),
        "progress_count": len(job.get("progress", [])),
        "cost":           job.get("cost", 0.0),
    }


@router.get("/stream/{apply_job_id}")
async def stream_apply(apply_job_id: str):
    """SSE stream — no auth required for EventSource compatibility."""

    async def event_generator():
        seen = 0
        while True:
            job = get_apply_job(apply_job_id)
            if not job:
                yield f"data: {json.dumps({'error': 'apply job not found'})}\n\n"
                return

            events = job.get("progress", [])
            while seen < len(events):
                yield f"data: {json.dumps({'line': events[seen]})}\n\n"
                seen += 1

            if job["status"] in ("complete", "error"):
                final = {
                    "event":  "done",
                    "status": job["status"],
                    "result": job.get("result"),
                    "error":  job.get("error"),
                    "cost":   job.get("cost", 0.0),
                }
                yield f"data: {json.dumps(final)}\n\n"
                return

            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── Warm Sessions ──────────────────────────────────────────────────────────────

# In-memory warm job store: warm_job_id -> { status, results, error }
_warm_jobs: dict[str, dict] = {}
_warm_lock = threading.Lock()


def _run_warm(warm_job_id: str, worker_id: int, headless: bool) -> None:
    """Run warm_sessions in a background thread and store result."""
    try:
        import sys
        from pathlib import Path as _Path
        _root = _Path(__file__).resolve().parent.parent.parent
        if str(_root) not in sys.path:
            sys.path.insert(0, str(_root))

        from applypilot.apply.warm_sessions import warm_sessions
        results = warm_sessions(worker_id=worker_id, headless=headless)
    except Exception as exc:
        results = {"error": str(exc)}

    with _warm_lock:
        _warm_jobs[warm_job_id] = {
            "status":  "error" if "error" in results else "complete",
            "results": results,
            "error":   results.get("error"),
        }


@router.post("/warm-sessions")
async def warm_sessions_endpoint(
    worker_id: int = 0,
    headless:  bool = False,
    _user=Depends(get_current_user),
):
    """
    Pre-login to LinkedIn/Indeed in a persistent Chrome session.
    Returns immediately with a warm_job_id; poll /warm-sessions/status/{id}.
    """
    warm_job_id = str(uuid.uuid4())
    with _warm_lock:
        _warm_jobs[warm_job_id] = {"status": "running", "results": {}, "error": None}

    t = threading.Thread(
        target=_run_warm,
        args=(warm_job_id, worker_id, headless),
        daemon=True,
    )
    t.start()
    return {"warm_job_id": warm_job_id, "status": "running"}


@router.get("/warm-sessions/status/{warm_job_id}")
async def warm_sessions_status(warm_job_id: str, _user=Depends(get_current_user)):
    """Poll warm-sessions job status."""
    with _warm_lock:
        job = _warm_jobs.get(warm_job_id)
    if not job:
        raise HTTPException(404, "Warm job not found")
    return job
