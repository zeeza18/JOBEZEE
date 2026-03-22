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
from ..services.linkedin_bot_service import (
    create_linkedin_job,
    stop_linkedin_bot,
    get_linkedin_job,
    start_linkedin_bot,
)
from .applied_jobs import watch_email_for_confirmation

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

    account_email = (user.email if user else "") or ""
    db_apply_email = (profile.apply_email if profile else "") or ""
    db_password    = (profile.apply_password if profile else "") or ""

    email    = db_apply_email or os.environ.get("JOB_APP_EMAIL", "") or account_email
    password = db_password    or os.environ.get("JOB_APP_PASSWORD", "")

    return path, email, password


def _resolve_platform_creds(url: str, profile, fallback_email: str, fallback_password: str) -> tuple[str, str]:
    """Pick per-platform email/password if set, otherwise fall back to defaults."""
    u = (url or "").lower()
    pairs = [
        ("linkedin.com",   getattr(profile, "linkedin_email",      ""), getattr(profile, "linkedin_password",      "")),
        ("indeed.com",     getattr(profile, "indeed_email",        ""), getattr(profile, "indeed_password",        "")),
        ("greenhouse.io",  getattr(profile, "greenhouse_email",    ""), getattr(profile, "greenhouse_password",    "")),
        ("myworkday.com",  getattr(profile, "workday_email",       ""), getattr(profile, "workday_password",       "")),
        ("workday.com",    getattr(profile, "workday_email",       ""), getattr(profile, "workday_password",       "")),
    ]
    for domain, em, pw in pairs:
        if domain in u:
            return (em or fallback_email), (pw or fallback_password)
    return fallback_email, fallback_password


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
    pid = uuid.UUID(current_user.id)
    prof_res = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    prof = prof_res.scalar_one_or_none()
    email, password = _resolve_platform_creds(req.url, prof, email, password)

    # Extract rough company name from URL domain for the tracker
    try:
        from urllib.parse import urlparse
        _domain = urlparse(req.url.strip()).netloc.lower().replace("www.", "")
        company_guess = _domain.split(".")[0].capitalize()
    except Exception:
        company_guess = ""

    # Create a PulledJob record so this apply appears in the Job Tracker
    pulled_job = PulledJob(
        user_profile_id=pid,
        search_session_id="manual",
        title="Manual Apply",
        company=company_guess,
        url=req.url.strip(),
        status="applying",
        source="manual",
        site=company_guess.lower(),
    )
    db.add(pulled_job)
    await db.commit()
    await db.refresh(pulled_job)

    apply_job_id = create_apply_job()
    start_apply_for_url(
        apply_job_id, req.url.strip(), str(resume_pdf), req.dry_run,
        pulled_job_id=str(pulled_job.id),
        company=company_guess,
        job_title="Manual Apply",
        user_email=email,
        user_password=password,
    )

    # Watch Gmail for a confirmation email in background
    asyncio.create_task(
        watch_email_for_confirmation(str(pulled_job.id), company_guess, "Manual Apply")
    )

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
    pid2 = uuid.UUID(current_user.id)
    prof2_res = await db.execute(select(UserProfile).where(UserProfile.id == pid2))
    prof2 = prof2_res.scalar_one_or_none()
    email, password = _resolve_platform_creds(pulled_job.url or "", prof2, email, password)

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

        name_raw   = current_user.full_name or current_user.email.split("@")[0]
        company    = pulled_job.company or "company"
        openai_key = (getattr(_profile, "openai_api_key", "") or "").strip()
        tailor_id  = create_tailor_job()
        start_tailor_job_for_job(
            tailor_id, pulled_job.description, resume_url,
            name_raw.replace(" ", "_"), company,
            openai_api_key=openai_key,
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

    # Mark as "applying" immediately so frontend shows pending state
    pulled_job.status = "applying"
    await db.commit()

    apply_job_id = create_apply_job()
    start_apply_for_url(
        apply_job_id, pulled_job.url.strip(), str(resume_pdf), req.dry_run,
        pulled_job_id=str(pulled_job.id),
        company=pulled_job.company or '',
        job_title=pulled_job.title or '',
        user_email=email,
        user_password=password,
    )

    # Launch email confirmation watcher in background
    asyncio.create_task(
        watch_email_for_confirmation(str(jid), pulled_job.company or '', pulled_job.title or '')
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
        last_data = asyncio.get_event_loop().time()
        while True:
            job = get_apply_job(apply_job_id)
            if not job:
                yield f"data: {json.dumps({'error': 'apply job not found'})}\n\n"
                return

            events = job.get("progress", [])
            while seen < len(events):
                yield f"data: {json.dumps({'line': events[seen]})}\n\n"
                last_data = asyncio.get_event_loop().time()
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

            # Keepalive comment every 20 s — prevents Render/proxy from cutting idle SSE
            if asyncio.get_event_loop().time() - last_data > 20:
                yield ": keepalive\n\n"
                last_data = asyncio.get_event_loop().time()

            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── Browser Status ────────────────────────────────────────────────────────────

@router.get("/browser/status")
async def browser_status(_user=Depends(get_current_user)):
    """Check if the persistent Chrome browser is running."""
    try:
        import sys
        from pathlib import Path as _P
        _root = _P(__file__).resolve().parent.parent.parent
        if str(_root) not in sys.path:
            sys.path.insert(0, str(_root))
        from applypilot.apply.chrome import is_global_chrome_alive, GLOBAL_CDP_PORT
        alive = is_global_chrome_alive()
        return {"alive": alive, "port": GLOBAL_CDP_PORT}
    except Exception as exc:
        return {"alive": False, "port": 9222, "error": str(exc)}


@router.post("/browser/start")
async def browser_start(_user=Depends(get_current_user)):
    """Manually launch the persistent Chrome window if it's not running."""
    def _launch():
        import sys
        from pathlib import Path as _P
        _root = _P(__file__).resolve().parent.parent.parent
        if str(_root) not in sys.path:
            sys.path.insert(0, str(_root))
        from applypilot.config import load_env, ensure_dirs
        from applypilot.apply.chrome import ensure_global_chrome
        load_env()
        ensure_dirs()
        ensure_global_chrome(headless=True)

    import threading
    threading.Thread(target=_launch, daemon=True).start()
    return {"status": "starting"}


# ── Browser Navigate ──────────────────────────────────────────────────────────

class NavigateRequest(BaseModel):
    url: str


@router.post("/browser/navigate")
async def browser_navigate(req: NavigateRequest, _user=Depends(get_current_user)):
    """Open a URL in the persistent Chrome window (so user can log in to LinkedIn etc.)."""
    import subprocess as _sp
    import sys
    from pathlib import Path as _P
    _root = _P(__file__).resolve().parent.parent.parent
    if str(_root) not in sys.path:
        sys.path.insert(0, str(_root))
    try:
        from applypilot.apply.chrome import GLOBAL_CDP_PORT
        import urllib.request as _ur, json as _json
        # Use CDP Target.createTarget or Page.navigate on the existing page
        data = _ur.urlopen(f"http://127.0.0.1:{GLOBAL_CDP_PORT}/json").read()
        targets = _json.loads(data)
        tab = next((t for t in targets if t.get("type") == "page"), None)
        if not tab:
            raise HTTPException(400, "No Chrome tab found — start the browser first")
        ws_url = tab["webSocketDebuggerUrl"]
        # Use websocket to send Page.navigate command
        import asyncio as _asyncio
        import websockets as _ws
        async def _nav():
            async with _ws.connect(ws_url) as sock:
                await sock.send(_json.dumps({"id": 1, "method": "Page.navigate", "params": {"url": req.url}}))
                await sock.recv()
        _asyncio.create_task(_nav())
        return {"status": "navigating", "url": req.url}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Navigate failed: {exc}")


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


# ── LinkedIn Auto-Apply ────────────────────────────────────────────────────────

class LinkedInLaunchRequest(BaseModel):
    dry_run: bool = False
    tailor_before_apply: bool = False


@router.post("/linkedin-launch")
async def linkedin_launch(
    req: LinkedInLaunchRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Launch the LinkedIn Easy Apply bot using the user's JOBEZEE profile settings.
    Maps desired_roles -> search_terms, experience_level, remote_preference, etc.
    """
    pid = uuid.UUID(current_user.id)
    profile_res = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile = profile_res.scalar_one_or_none()

    if not profile:
        raise HTTPException(400, "No profile found. Complete onboarding first.")
    if not (getattr(profile, "desired_roles", None) or []):
        raise HTTPException(400, "No desired roles set in your profile. Add roles in Profile settings.")

    resume_pdf_path = ""
    resume_url = (profile.resume_url if profile else "") or ""
    if resume_url:
        _path = _resolve_resume_pdf(resume_url)
        if _path.exists():
            resume_pdf_path = str(_path)
        else:
            import logging as _log
            _log.warning("LinkedIn bot: resume file not on disk at %s (url=%s)", _path, resume_url)

    job_id = create_linkedin_job(user_profile_id=str(pid))
    start_linkedin_bot(job_id, profile, resume_pdf_path, resume_url, tailor_before_apply=req.tailor_before_apply)
    return {"linkedin_job_id": job_id, "status": "running"}


@router.get("/linkedin-status/{job_id}")
async def linkedin_status(job_id: str, _user=Depends(get_current_user)):
    job = get_linkedin_job(job_id)
    if not job:
        raise HTTPException(404, "LinkedIn job not found")
    return {
        "status":         job["status"],
        "result":         job.get("result"),
        "error":          job.get("error"),
        "progress_count": len(job.get("progress", [])),
    }


@router.get("/linkedin-stream/{job_id}")
async def linkedin_stream(job_id: str):
    """SSE stream for LinkedIn bot progress — no auth needed for EventSource."""
    import re as _re
    from datetime import datetime, timedelta, timezone
    from ..database import AsyncSessionLocal
    from sqlalchemy import select as _select

    _SAVED_RE = _re.compile(
        r'Successfully saved "(.+?)" job\. Job ID: (\d+)',
        _re.IGNORECASE,
    )
    _SALARY_RE = _re.compile(
        r'\$[\d,]+(?:\.?\d+)?[kK]?\s*(?:[-–]\s*\$[\d,]+(?:\.?\d+)?[kK]?)?\s*(?:/\s*(?:yr|year|hour|hr))?',
    )
    _TIME_RE = _re.compile(
        r'(\d+)\s*(minute|hour|day|week|month)s?\s*ago',
        _re.IGNORECASE,
    )

    def _parse_time_posted(text: str) -> datetime | None:
        """Parse 'X hours/days/weeks ago' into an absolute UTC datetime."""
        now = datetime.now(timezone.utc)
        m = _TIME_RE.search(text)
        if not m:
            return now
        n, unit = int(m.group(1)), m.group(2).lower()
        delta = {
            "minute": timedelta(minutes=n),
            "hour":   timedelta(hours=n),
            "day":    timedelta(days=n),
            "week":   timedelta(weeks=n),
            "month":  timedelta(days=n * 30),
        }.get(unit, timedelta(0))
        return now - delta

    def _extract_from_context(events: list, saved_idx: int) -> tuple[str, str, datetime | None]:
        """Scan back from saved_idx to find Time Posted + salary in the same job block."""
        location = ""
        salary_text = ""
        posted_at: datetime | None = None

        # Only scan within the current job's lines (back to the "Trying to Apply" marker)
        for i in range(saved_idx - 1, max(0, saved_idx - 200) - 1, -1):
            ln = events[i]

            if "Time Posted:" in ln and not posted_at:
                # Format: "Time Posted: Denver Metropolitan Area · 10 hours ago · 6 applicants"
                after = ln.split("Time Posted:", 1)[1].strip()
                segments = [s.strip() for s in after.split("·")]
                if segments:
                    location = segments[0]
                for seg in segments[1:]:
                    posted_at = _parse_time_posted(seg)
                    if posted_at:
                        break

            if not salary_text:
                sal = _SALARY_RE.search(ln)
                if sal:
                    salary_text = sal.group(0).strip()

            # Stop scanning when we hit the start of this job's block
            if "Trying to Apply to" in ln:
                break

        return location, salary_text, posted_at

    async def _record_applied(line: str, user_profile_id: str, events: list, idx: int) -> None:
        """Write a PulledJob row for a freshly applied LinkedIn job."""
        m = _SAVED_RE.search(line)
        if not m:
            return
        raw_title, li_job_id = m.group(1), m.group(2)
        parts   = [p.strip() for p in raw_title.split("|", 1)]
        title   = parts[0]
        company = parts[1] if len(parts) > 1 else ""
        li_url  = f"https://www.linkedin.com/jobs/view/{li_job_id}"

        try:
            pid = uuid.UUID(user_profile_id)
        except (ValueError, AttributeError):
            return

        location, salary_text, posted_at = _extract_from_context(events, idx)

        try:
            async with AsyncSessionLocal() as db:
                existing = await db.execute(
                    _select(PulledJob).where(
                        PulledJob.user_profile_id == pid,
                        PulledJob.url == li_url,
                    )
                )
                if existing.scalar_one_or_none():
                    return
                db.add(PulledJob(
                    user_profile_id   = pid,
                    search_session_id = "linkedin-bot",
                    title             = title,
                    company           = company,
                    location          = location,
                    salary_text       = salary_text,
                    posted_at         = posted_at.isoformat() if posted_at else None,
                    url               = li_url,
                    status            = "applied",
                    source            = "linkedin",
                    site              = "linkedin",
                ))
                await db.commit()
        except Exception:
            pass   # never crash the SSE stream over DB errors

    async def event_generator():
        seen = 0
        last_data = asyncio.get_event_loop().time()
        while True:
            job = get_linkedin_job(job_id)
            if not job:
                yield f"data: {json.dumps({'error': 'linkedin job not found'})}\n\n"
                return

            events = job.get("progress", [])
            uid = job.get("user_profile_id", "")
            while seen < len(events):
                line = events[seen]
                yield f"data: {json.dumps({'line': line})}\n\n"
                last_data = asyncio.get_event_loop().time()
                if uid and "successfully saved" in line.lower():
                    await _record_applied(line, uid, events, seen)
                seen += 1

            if job["status"] in ("complete", "error"):
                final = {
                    "event":  "done",
                    "status": job["status"],
                    "result": job.get("result"),
                    "error":  job.get("error"),
                }
                yield f"data: {json.dumps(final)}\n\n"
                return

            # Keepalive comment every 20 s — prevents Render/proxy from cutting idle SSE
            if asyncio.get_event_loop().time() - last_data > 20:
                yield ": keepalive\n\n"
                last_data = asyncio.get_event_loop().time()

            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/linkedin-stop/{job_id}")
async def linkedin_stop(job_id: str, current_user=Depends(get_current_user)):
    """Kill the running LinkedIn bot subprocess."""
    killed = stop_linkedin_bot(job_id)
    if not killed:
        raise HTTPException(404, "No running bot found for this job ID")
    return {"stopped": True}
