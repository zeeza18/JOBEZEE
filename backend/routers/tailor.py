"""
Tailor router — POST /api/tailor/run, GET /api/tailor/status/{id},
GET /api/tailor/stream/{id}, GET /api/tailor/download/{id},
POST /api/tailor/run-for-job, GET /api/tailor/resume/{id}
"""
from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

import base64
import os

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..crypto import decrypt
from ..database import get_db
from ..models import JobListing, PulledJob, TailorJobRecord, UserCredits, UserProfile
from ..services.tailor_service import (
    _extract_resume_text,
    _jobs,
    _lock,
    create_job,
    get_active_count,
    get_job,
    get_max_workers,
    get_user_jobs,
    start_tailor_job,
    start_tailor_job_for_job,
)

router = APIRouter()


class TailorRequest(BaseModel):
    job_description: str
    resume: str
    job_url: str = ""


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

    # Check credit balance
    cred_res = await db.execute(select(UserCredits).where(UserCredits.user_id == str(current_user.id)))
    cred_row = cred_res.scalar_one_or_none()
    if cred_row and cred_row.balance <= 0:
        raise HTTPException(402, "No credits. Please add credits before tailoring.")

    # Fetch user's API keys — system Anthropic key takes priority, user DB key as fallback
    import uuid as _uuid, os as _os
    _pid = _uuid.UUID(current_user.id)
    _prof_res = await db.execute(select(UserProfile).where(UserProfile.id == _pid))
    _profile = _prof_res.scalar_one_or_none()
    openai_key = decrypt((getattr(_profile, "openai_api_key", "") or "")).strip()
    _user_anthropic = decrypt((getattr(_profile, "anthropic_api_key", "") or "")).strip()
    _sys_anthropic = _os.getenv("ANTHROPIC_API_KEY", "").strip()
    anthropic_key = _sys_anthropic or _user_anthropic
    anthropic_fallback = _user_anthropic if _sys_anthropic else ""
    if not anthropic_key:
        raise HTTPException(400, "Anthropic API key not configured.")

    # Prepend profile contact header so Tool 4 renders correct links in LaTeX
    resume_with_header = _inject_contact_header(req.resume, _profile, current_user)

    _name_raw = (current_user.full_name or "").strip()
    _username = (_name_raw if _name_raw and "@" not in _name_raw else current_user.email.split("@")[0]).replace(" ", "_")
    job_id = create_job(user_id=str(current_user.id))
    _expires = datetime.now(timezone.utc) + timedelta(days=2)
    db.add(TailorJobRecord(
        id=job_id,
        user_id=str(current_user.id),
        status="queued",
        job_url=(req.job_url or "").strip(),
        expires_at=_expires,
    ))
    await db.commit()
    start_tailor_job(job_id, req.job_description, resume_with_header, openai_api_key=openai_key, username=_username, anthropic_api_key=anthropic_key, anthropic_fallback_key=anthropic_fallback)
    return {"job_id": job_id, "status": "queued"}


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

    # Look up in new job_listings pool first, fall back to legacy pulled_jobs
    jl_res = await db.execute(select(JobListing).where(JobListing.id == jid))
    pulled_job = jl_res.scalar_one_or_none()
    if not pulled_job:
        pj_res = await db.execute(select(PulledJob).where(PulledJob.id == jid))
        pulled_job = pj_res.scalar_one_or_none()
    if not pulled_job:
        raise HTTPException(404, "Job not found")
    if not (pulled_job.description or "").strip():
        raise HTTPException(400, "Job has no description — cannot tailor")

    # Check credit balance
    cred_res = await db.execute(select(UserCredits).where(UserCredits.user_id == str(current_user.id)))
    cred_row = cred_res.scalar_one_or_none()
    if cred_row and cred_row.balance <= 0:
        raise HTTPException(402, "No credits. Please add credits before tailoring.")

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

    # Resolve resume text — fall back to DB-stored bytes when the ephemeral
    # Render disk has been wiped (deploy/restart) so the file is no longer on disk.
    from pathlib import Path as _Path
    from ..config import get_settings as _cfg_fn
    _cfg_s = _cfg_fn()
    _jobezee_root = _Path(__file__).resolve().parent.parent.parent
    _upload_root  = _jobezee_root / _cfg_s.UPLOAD_DIR
    _rel = resume_url.lstrip("/")
    if _rel.startswith("uploads/"):
        _rel = _rel[len("uploads/"):]
    _file_path = _upload_root / _rel
    if not _file_path.exists():
        _bytes_b64 = getattr(profile, "resume_bytes", "") or ""
        if _bytes_b64:
            import base64 as _b64, tempfile as _tmp, pathlib as _pl
            _tmp_dir  = _pl.Path(_tmp.mkdtemp())
            _tmp_path = _tmp_dir / _file_path.name
            _tmp_path.write_bytes(_b64.b64decode(_bytes_b64))
            _file_path = _tmp_path
        else:
            raise HTTPException(
                404,
                f"Resume file missing from server ({_file_path.name}). "
                "Please re-upload your resume via Profile → Resume."
            )
    resume_text = _extract_resume_text(_file_path)
    if not resume_text.strip():
        raise HTTPException(422, "Could not extract text from your resume. Please re-upload.")

    # Build a clean output filename: username_company
    name_raw = current_user.full_name or current_user.email.split("@")[0]
    username = name_raw.replace(" ", "_")
    company = pulled_job.company or "company"

    openai_key = decrypt((getattr(profile, "openai_api_key", "") or "")).strip()
    _user_anthropic2 = decrypt((getattr(profile, "anthropic_api_key", "") or "")).strip()
    import os as _os2
    _sys_anthropic2 = _os2.getenv("ANTHROPIC_API_KEY", "").strip()
    anthropic_key = _sys_anthropic2 or _user_anthropic2
    anthropic_fallback2 = _user_anthropic2 if _sys_anthropic2 else ""
    if not anthropic_key:
        raise HTTPException(400, "Anthropic API key not configured.")

    contact_header = _build_contact_header(profile, current_user)

    tailor_job_id = create_job(user_id=str(current_user.id))
    _expires = datetime.now(timezone.utc) + timedelta(days=2)
    db.add(TailorJobRecord(
        id=tailor_job_id,
        user_id=str(current_user.id),
        status="queued",
        company_name=company,
        pulled_job_id=req.job_id,
        expires_at=_expires,
    ))
    await db.commit()
    start_tailor_job_for_job(
        tailor_job_id,
        pulled_job.description,
        resume_text,
        username,
        company,
        openai_api_key=openai_key,
        contact_header=contact_header,
        anthropic_api_key=anthropic_key,
        anthropic_fallback_key=anthropic_fallback2,
    )
    return {"job_id": tailor_job_id, "status": "queued", "company_name": company}


# ── List all tailor records for current user (for refresh restore) ────────────

@router.get("/my-jobs")
async def my_tailor_jobs(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Return all non-expired tailor records that have a pulled_job_id link.
    Frontend uses this on mount to rebuild the tailorJobs map from the DB."""
    from sqlalchemy import and_
    now = datetime.now(timezone.utc)
    res = await db.execute(
        select(TailorJobRecord).where(
            and_(
                TailorJobRecord.user_id == str(current_user.id),
                TailorJobRecord.pulled_job_id.isnot(None),
                TailorJobRecord.expires_at > now,
            )
        ).order_by(TailorJobRecord.created_at.desc())
    )
    records = res.scalars().all()

    # De-duplicate: keep only the most recent tailor record per pulled_job_id
    seen: dict[str, TailorJobRecord] = {}
    for r in records:
        pid = str(r.pulled_job_id)
        if pid not in seen:
            seen[pid] = r

    out = []
    for r in seen.values():
        # Use in-memory progress for actively running jobs (most up-to-date)
        mem = _jobs.get(r.id)
        if mem:
            progress_events = mem.get("progress", [])
            status = mem.get("status", r.status)
        else:
            progress_events = list(r.progress_events or [])
            status = r.status

        rounds_done    = sum(1 for e in progress_events if e.get("event") == "round_complete")
        progress_count = len(progress_events)

        out.append({
            "pulled_job_id":  str(r.pulled_job_id),
            "tailor_job_id":  r.id,
            "status":         status,
            "score":          r.score,
            "filename":       r.filename,
            "has_pdf":        r.has_pdf,
            "has_docx":       r.has_docx,
            "company_name":   r.company_name,
            "rounds_done":    rounds_done,
            "progress_count": progress_count,
        })
    return out


# ── Rerun tailor for a pulled job (retry/stuck jobs) ──────────────────────────

@router.post("/rerun/{pulled_job_id}")
async def rerun_tailor(
    pulled_job_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete the existing record for a pulled job and re-run tailoring fresh."""
    from sqlalchemy import delete as sa_delete
    # Delete existing tailor record (if any)
    await db.execute(
        sa_delete(TailorJobRecord).where(
            TailorJobRecord.user_id == str(current_user.id),
            TailorJobRecord.pulled_job_id == pulled_job_id,
        )
    )
    await db.commit()

    # Re-call run-for-job logic inline
    try:
        jid = uuid.UUID(pulled_job_id)
    except ValueError:
        raise HTTPException(400, "Invalid pulled_job_id")

    jl_res = await db.execute(select(JobListing).where(JobListing.id == jid))
    pulled_job = jl_res.scalar_one_or_none()
    if not pulled_job:
        pj_res = await db.execute(select(PulledJob).where(PulledJob.id == jid))
        pulled_job = pj_res.scalar_one_or_none()
    if not pulled_job:
        raise HTTPException(404, "Job not found")
    if not (pulled_job.description or "").strip():
        raise HTTPException(400, "Job has no description — cannot tailor")

    # Check credit balance
    cred_res = await db.execute(select(UserCredits).where(UserCredits.user_id == str(current_user.id)))
    cred_row = cred_res.scalar_one_or_none()
    if cred_row and cred_row.balance <= 0:
        raise HTTPException(402, "No credits. Please add credits before tailoring.")

    profile_id = uuid.UUID(current_user.id)
    prof_res = await db.execute(select(UserProfile).where(UserProfile.id == profile_id))
    profile = prof_res.scalar_one_or_none()
    resume_url = (profile.resume_url if profile else "") or ""
    if not resume_url:
        raise HTTPException(400, "No resume on file. Please upload your resume first.")

    from pathlib import Path as _Path
    from ..config import get_settings as _cfg_fn
    _cfg_s = _cfg_fn()
    _jobezee_root = _Path(__file__).resolve().parent.parent.parent
    _upload_root = _jobezee_root / _cfg_s.UPLOAD_DIR
    _rel = resume_url.lstrip("/")
    if _rel.startswith("uploads/"):
        _rel = _rel[len("uploads/"):]
    _file_path = _upload_root / _rel
    if not _file_path.exists():
        _bytes_b64 = getattr(profile, "resume_bytes", "") or ""
        if _bytes_b64:
            import base64 as _b64, tempfile as _tmp, pathlib as _pl
            _tmp_dir = _pl.Path(_tmp.mkdtemp())
            _tmp_path = _tmp_dir / _file_path.name
            _tmp_path.write_bytes(_b64.b64decode(_bytes_b64))
            _file_path = _tmp_path
        else:
            raise HTTPException(404, f"Resume file missing from server. Please re-upload.")

    resume_text = _extract_resume_text(_file_path)
    if not resume_text.strip():
        raise HTTPException(422, "Could not extract text from resume. Please re-upload.")

    name_raw = current_user.full_name or current_user.email.split("@")[0]
    username = name_raw.replace(" ", "_")
    company = pulled_job.company or "company"

    openai_key = decrypt((getattr(profile, "openai_api_key", "") or "")).strip()
    _user_anthropic2 = decrypt((getattr(profile, "anthropic_api_key", "") or "")).strip()
    import os as _os2
    _sys_anthropic2 = _os2.getenv("ANTHROPIC_API_KEY", "").strip()
    anthropic_key = _sys_anthropic2 or _user_anthropic2
    anthropic_fallback2 = _user_anthropic2 if _sys_anthropic2 else ""
    if not anthropic_key:
        raise HTTPException(400, "Anthropic API key not configured.")

    contact_header = _build_contact_header(profile, current_user)

    tailor_job_id = create_job(user_id=str(current_user.id))
    _expires = datetime.now(timezone.utc) + timedelta(days=2)
    db.add(TailorJobRecord(
        id=tailor_job_id,
        user_id=str(current_user.id),
        status="queued",
        company_name=company,
        pulled_job_id=pulled_job_id,
        expires_at=_expires,
    ))
    await db.commit()
    start_tailor_job_for_job(
        tailor_job_id,
        pulled_job.description,
        resume_text,
        username,
        company,
        openai_api_key=openai_key,
        contact_header=contact_header,
        anthropic_api_key=anthropic_key,
        anthropic_fallback_key=anthropic_fallback2,
    )
    return {"job_id": tailor_job_id, "status": "queued", "company_name": company}


# ── Poll status ───────────────────────────────────────────────────────────────

@router.get("/status/{job_id}")
async def get_status(job_id: str, _user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    import shutil
    job = get_job(job_id)
    if not job:
        # Server restarted — try to reconstruct from DB
        db_rec_res = await db.execute(select(TailorJobRecord).where(TailorJobRecord.id == job_id))
        db_rec = db_rec_res.scalar_one_or_none()
        if not db_rec:
            raise HTTPException(404, "Job not found")
        if db_rec.status in ("running", "queued"):
            import os as _os
            _hetzner_active = bool(_os.getenv("BOT_WORKER_URL", ""))
            if _hetzner_active:
                # Job is still running on Hetzner — keep as running, callback will arrive
                return {
                    "status": db_rec.status,
                    "error": None,
                    "company_name": db_rec.company_name,
                    "score": db_rec.score,
                    "has_pdf": db_rec.has_pdf,
                    "has_docx": db_rec.has_docx,
                    "filename": db_rec.filename,
                    "pdflatex_available": True,
                    "progress_count": len(db_rec.progress_events or []),
                }
            # Local mode — was in-progress when server restarted, truly lost
            return {
                "status": "error",
                "error": "Server restarted mid-job — please re-tailor",
                "company_name": db_rec.company_name,
                "score": None,
                "has_pdf": False,
                "has_docx": False,
                "filename": db_rec.filename,
                "pdflatex_available": False,
                "progress_count": 0,
            }
        # Job completed in a previous server run — return DB data
        return {
            "status": db_rec.status,
            "error": db_rec.error_msg,
            "company_name": db_rec.company_name,
            "score": db_rec.score,
            "has_pdf": db_rec.has_pdf,
            "has_docx": db_rec.has_docx,
            "filename": db_rec.filename,
            "pdflatex_available": False,
            "progress_count": 0,
        }
    import os as _os
    _worker_url = _os.getenv("BOT_WORKER_URL", "")
    _pdflatex_ok = bool(shutil.which("pdflatex")) or bool(_worker_url)

    # Persist status to DB when job reaches a terminal state
    if job["status"] in ("complete", "error"):
        from sqlalchemy import update as sa_update
        try:
            await db.execute(
                sa_update(TailorJobRecord)
                .where(TailorJobRecord.id == job_id)
                .values(
                    status=job["status"],
                    company_name=job.get("company_name"),
                    score=job.get("score"),
                    has_pdf=job.get("pdf_path") is not None,
                    has_docx=job.get("docx_path") is not None,
                    filename=job.get("filename"),
                    error_msg=job.get("error"),
                )
            )
            await db.commit()
        except Exception:
            pass  # non-fatal

    return {
        "status": job["status"],
        "score": job.get("score"),
        "company_name": job.get("company_name"),
        "has_pdf": job.get("pdf_path") is not None,
        "has_docx": job.get("docx_path") is not None,
        "filename": job.get("filename"),
        "error": job.get("error"),
        "progress_count": len(job.get("progress", [])),
        "pdflatex_available": _pdflatex_ok,
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
async def stream_job(job_id: str, since: int = 0):
    """Server-Sent Events stream — no auth required for EventSource compatibility.
    `since` = number of progress events the client already has (avoids replaying on refresh).
    """

    async def event_generator():
        seen = since  # skip events the client already processed
        heartbeat = 0
        # If job not in memory (Render restarted), reconstruct from DB so we can
        # replay already-received progress events immediately on refresh.
        if not get_job(job_id):
            try:
                from ..database import AsyncSessionLocal
                async with AsyncSessionLocal() as _s:
                    _res = await _s.execute(select(TailorJobRecord).where(TailorJobRecord.id == job_id))
                    _rec = _res.scalar_one_or_none()
                    if _rec:
                        with _lock:
                            _jobs[job_id] = {
                                "user_id":      _rec.user_id,
                                "status":       _rec.status,
                                "progress":     list(_rec.progress_events or []),
                                "score":        _rec.score,
                                "company_name": _rec.company_name,
                                "tex_path":     None,
                                "pdf_path":     None,
                                "docx_path":    None,
                                "final_resume": _rec.final_resume,
                                "filename":     _rec.filename,
                                "error":        _rec.error_msg,
                            }
            except Exception:
                pass

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
async def download_pdf(job_id: str, _user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from ..services.tailor_service import _JOB_OUTPUTS
    job = get_job(job_id)
    if job:
        if job["status"] != "complete":
            raise HTTPException(400, f"Job is not complete yet (status: {job['status']})")
        if not job.get("pdf_path"):
            raise HTTPException(404, "PDF not available — pdflatex may not be installed")
        pdf_path = job["pdf_path"]
        filename = f"{job.get('filename', 'tailored_resume')}.pdf"
    else:
        # Try to recover from DB record + on-disk files (or stored base64)
        db_rec = await db.execute(select(TailorJobRecord).where(TailorJobRecord.id == job_id))
        rec = db_rec.scalar_one_or_none()
        if not rec or not rec.has_pdf:
            raise HTTPException(404, "Job not found")
        fname = rec.filename or "tailored_resume"
        filename = f"{fname}.pdf"
        job_dir = _JOB_OUTPUTS / job_id
        pdf_files = list(job_dir.glob("*.pdf")) if job_dir.exists() else []
        if pdf_files:
            pdf_path = str(pdf_files[0])
        elif getattr(rec, "pdf_b64", None):
            # Serve directly from DB base64 (Render restarted, disk wiped)
            import io as _io
            pdf_bytes = base64.b64decode(rec.pdf_b64)
            return Response(content=pdf_bytes, media_type="application/pdf",
                            headers={"Content-Disposition": f'attachment; filename="{filename}"'})
        else:
            raise HTTPException(404, "PDF file not found — please re-tailor this job")
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=filename,
    )


# ── Download .docx ────────────────────────────────────────────────────────────

@router.get("/download-docx/{job_id}")
async def download_docx(job_id: str, _user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from ..services.tailor_service import _JOB_OUTPUTS
    job = get_job(job_id)
    if job:
        if not job.get("docx_path"):
            raise HTTPException(404, "Word document not available")
        docx_path = job["docx_path"]
        filename = f"{job.get('filename', 'tailored_resume')}.docx"
    else:
        db_rec = await db.execute(select(TailorJobRecord).where(TailorJobRecord.id == job_id))
        rec = db_rec.scalar_one_or_none()
        if not rec or not rec.has_docx:
            raise HTTPException(404, "Job not found")
        fname = rec.filename or "tailored_resume"
        filename = f"{fname}.docx"
        job_dir = _JOB_OUTPUTS / job_id
        docx_files = list(job_dir.glob("*.docx")) if job_dir.exists() else []
        if docx_files:
            docx_path = str(docx_files[0])
        elif getattr(rec, "docx_b64", None):
            docx_bytes = base64.b64decode(rec.docx_b64)
            return Response(content=docx_bytes,
                            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            headers={"Content-Disposition": f'attachment; filename="{filename}"'})
        else:
            raise HTTPException(404, "DOCX file not found — please re-tailor this job")
    return FileResponse(
        docx_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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


# ── My tailor jobs (card history) ────────────────────────────────────────────

@router.get("/my-jobs")
async def get_my_jobs(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all tailor jobs for the current user (from DB, non-expired)."""
    now = datetime.now(timezone.utc)
    import os as _os
    _hetzner_active = bool(_os.getenv("BOT_WORKER_URL", ""))

    res = await db.execute(
        select(TailorJobRecord)
        .where(TailorJobRecord.user_id == str(current_user.id))
        .where(TailorJobRecord.expires_at > now)
        .where(TailorJobRecord.status != "stale")
        .order_by(TailorJobRecord.created_at.desc())
    )
    db_jobs = res.scalars().all()

    result = []
    for dj in db_jobs:
        mem = get_job(dj.id)
        if mem:
            status = mem["status"]
            company_name = mem.get("company_name") or dj.company_name
            score = mem.get("score") or dj.score
            has_pdf = mem.get("pdf_path") is not None
            has_docx = mem.get("docx_path") is not None
            filename = mem.get("filename") or dj.filename
            error_msg = mem.get("error") or dj.error_msg
            progress_events = mem.get("progress", [])
        else:
            status = dj.status
            # If Hetzner is active, running/queued jobs are still alive on Hetzner —
            # don't mark them as interrupted; they'll get callbacks.
            if status in ("running", "queued") and not _hetzner_active:
                status = "error"
                error_msg = "Server restarted mid-job — please re-tailor"
            else:
                error_msg = dj.error_msg
            company_name = dj.company_name
            score = dj.score
            has_pdf = dj.has_pdf
            has_docx = dj.has_docx
            filename = dj.filename
            progress_events = list(dj.progress_events or [])

        result.append({
            "job_id":          dj.id,
            "status":          status,
            "company_name":    company_name,
            "job_url":         dj.job_url or "",
            "score":           score,
            "has_pdf":         has_pdf,
            "has_docx":        has_docx,
            "filename":        filename,
            "error_msg":       error_msg,
            "progress_events": progress_events,
            "created_at":      dj.created_at.isoformat() if dj.created_at else None,
            "expires_at":      dj.expires_at.isoformat() if dj.expires_at else None,
        })

    return result


# ── Dismiss / delete a tailor job card ───────────────────────────────────────

@router.delete("/job/{job_id}")
async def dismiss_job(
    job_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark job as stale so it no longer appears in my-jobs after refresh."""
    await db.execute(
        sa_update(TailorJobRecord)
        .where(TailorJobRecord.id == job_id)
        .where(TailorJobRecord.user_id == str(current_user.id))
        .values(status="stale")
    )
    await db.commit()
    # Also remove from in-memory store
    with _lock:
        _jobs.pop(job_id, None)
    return {"ok": True}


# ── Clear ALL tailor cards for current user ───────────────────────────────────

@router.delete("/my-jobs")
async def clear_all_jobs(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark every non-stale tailor job for the user as stale (bulk dismiss)."""
    res = await db.execute(
        select(TailorJobRecord.id)
        .where(TailorJobRecord.user_id == str(current_user.id))
        .where(TailorJobRecord.status != "stale")
    )
    ids = [r[0] for r in res.fetchall()]
    if ids:
        await db.execute(
            sa_update(TailorJobRecord)
            .where(TailorJobRecord.user_id == str(current_user.id))
            .where(TailorJobRecord.status != "stale")
            .values(status="stale")
        )
        await db.commit()
        with _lock:
            for jid in ids:
                _jobs.pop(jid, None)
    return {"cleared": len(ids)}


# ── Hetzner → Render callback (progress events + done) ───────────────────────

class TailorCallbackPayload(BaseModel):
    job_id:       str
    type:         str          # "progress" | "done"
    event:        dict | None = None   # when type=="progress"
    status:       str | None = None    # when type=="done": "complete" | "error"
    score:        int | None = None
    final_resume: str | None = None
    company_name: str | None = None
    filename:     str | None = None
    pdf_b64:      str | None = None
    docx_b64:     str | None = None
    tex_b64:      str | None = None
    error:        str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    cost_usd:     float | None = None


@router.post("/internal/callback")
async def tailor_callback(
    payload: TailorCallbackPayload,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Called by Hetzner worker to push progress events and final results back to Render."""
    _secret = os.getenv("WORKER_SECRET", "")
    if _secret:
        token = authorization.removeprefix("Bearer ").strip()
        # Accept any comma-separated secret
        valid = {s.strip() for s in _secret.split(",") if s.strip()}
        if token not in valid:
            raise HTTPException(401, "Unauthorized")

    job_id = payload.job_id

    # Ensure job entry exists in memory (Render may have restarted mid-job)
    if job_id not in _jobs:
        # Reconstruct from DB
        db_res = await db.execute(select(TailorJobRecord).where(TailorJobRecord.id == job_id))
        rec = db_res.scalar_one_or_none()
        with _lock:
            _jobs[job_id] = {
                "user_id":      rec.user_id if rec else "",
                "status":       "running",
                "progress":     list(rec.progress_events or []) if rec else [],
                "score":        None,
                "company_name": rec.company_name if rec else None,
                "tex_path":     None,
                "pdf_path":     None,
                "docx_path":    None,
                "final_resume": rec.final_resume if rec else None,
                "filename":     rec.filename if rec else None,
                "error":        None,
            }

    from ..services.tailor_service import _JOB_OUTPUTS

    if payload.type == "progress" and payload.event:
        event = payload.event
        with _lock:
            _jobs[job_id]["progress"].append(event)
            if event.get("event") == "round_complete":
                score = event.get("evaluation", {}).get("score")
                if score is not None:
                    _jobs[job_id]["score"] = score
            if event.get("event") == "company_detected":
                _jobs[job_id]["company_name"] = event.get("company_name")
            if event.get("event") == "keywords_extracted":
                cn = (event.get("keyword_analysis", {}).get("company_name", "") or "").strip()
                if cn and cn.upper() not in ("UNKNOWN_COMPANY", "UNKNOWN", "N/A", "NA", ""):
                    _jobs[job_id]["company_name"] = cn

        # Persist progress to DB so a Render restart can reconstruct
        try:
            await db.execute(
                sa_update(TailorJobRecord)
                .where(TailorJobRecord.id == job_id)
                .values(
                    status="running",
                    progress_events=_jobs[job_id]["progress"],
                    company_name=_jobs[job_id].get("company_name"),
                )
            )
            await db.commit()
        except Exception:
            pass

    elif payload.type == "done":
        job_dir = _JOB_OUTPUTS / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        pdf_path = docx_path = tex_path = None

        # Fetch or create UserCredits row and deduct cost
        _uid = _jobs[job_id].get("user_id", "")
        if _uid and payload.cost_usd is not None and payload.cost_usd > 0:
            try:
                cred_res = await db.execute(select(UserCredits).where(UserCredits.user_id == _uid))
                cred_row = cred_res.scalar_one_or_none()
                if cred_row:
                    cred_row.balance = max(0.0, cred_row.balance - payload.cost_usd)
                else:
                    db.add(UserCredits(user_id=_uid, balance=-payload.cost_usd))
            except Exception:
                pass

        if payload.status == "complete":
            safe_name = payload.filename or "tailored_resume"

            # Save files from base64
            if payload.tex_b64:
                tex_path = job_dir / f"{safe_name}.tex"
                tex_path.write_bytes(base64.b64decode(payload.tex_b64))

            if payload.pdf_b64:
                pdf_path = job_dir / f"{safe_name}.pdf"
                pdf_path.write_bytes(base64.b64decode(payload.pdf_b64))

            if payload.docx_b64:
                docx_path = job_dir / f"{safe_name}.docx"
                docx_path.write_bytes(base64.b64decode(payload.docx_b64))

            _cn = (payload.company_name or "").strip()
            if _cn.upper() in ("UNKNOWN_COMPANY", "UNKNOWN", "N/A", "NA", ""):
                _cn = _jobs[job_id].get("company_name") or None
            with _lock:
                _jobs[job_id].update({
                    "status":       "complete",
                    "score":        payload.score,
                    "final_resume": payload.final_resume,
                    "company_name": _cn,
                    "filename":     safe_name,
                    "tex_path":     str(tex_path) if tex_path else None,
                    "pdf_path":     str(pdf_path) if pdf_path else None,
                    "docx_path":    str(docx_path) if docx_path else None,
                })
        else:
            with _lock:
                _jobs[job_id].update({"status": "error", "error": payload.error or "Unknown error"})

        # Persist to DB
        try:
            await db.execute(
                sa_update(TailorJobRecord)
                .where(TailorJobRecord.id == job_id)
                .values(
                    status=payload.status or "error",
                    company_name=_cn if payload.status == "complete" else payload.company_name,
                    score=payload.score,
                    has_pdf=pdf_path is not None,
                    has_docx=docx_path is not None,
                    filename=payload.filename,
                    error_msg=payload.error,
                    final_resume=payload.final_resume,
                    pdf_b64=payload.pdf_b64 if payload.status == "complete" else None,
                    docx_b64=payload.docx_b64 if payload.status == "complete" else None,
                    input_tokens=payload.input_tokens or 0,
                    output_tokens=payload.output_tokens or 0,
                    cost_usd=payload.cost_usd or 0.0,
                )
            )
            await db.commit()
        except Exception:
            pass

    return {"ok": True}


# ── Worker pool info ─────────────────────────────────────────────────────────

@router.get("/worker-info")
async def worker_info(_user=Depends(get_current_user)):
    """Return max parallel slots and how many are currently active."""
    _worker_url = os.getenv("BOT_WORKER_URL", "").rstrip("/")
    _secret     = os.getenv("WORKER_SECRET", "").split(",")[0].strip()
    if _worker_url and _secret:
        # Hetzner runs the tailor jobs — query its pool size
        try:
            import httpx as _httpx
            r = _httpx.get(
                f"{_worker_url}/tailor-info",
                headers={"Authorization": f"Bearer {_secret}"},
                timeout=5,
            )
            if r.status_code == 200:
                d = r.json()
                return {"max_workers": d.get("max_workers", 4), "active": d.get("active", 0)}
        except Exception:
            pass
    return {
        "max_workers": get_max_workers(),
        "active": get_active_count(),
    }


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
    Inject profile contact info (with real URLs) into the resume text.
    - Name not present: prepend full header.
    - Name already present: replace the pipe-separated contact line so real
      LinkedIn/GitHub/Portfolio URLs overwrite plain display words from the PDF.
    """
    header = _build_contact_header(profile, user)
    if not header:
        return resume_text
    header_lines = [l for l in header.strip().split("\n") if l.strip()]
    name = (getattr(profile, "full_name", "") or getattr(user, "full_name", "") or "").strip()
    first_line = resume_text.strip().split("\n")[0].strip() if resume_text.strip() else ""
    if name and name.lower() not in first_line.lower():
        return header + "\n\n" + resume_text
    # Name present — replace the contact line with the profile's (has real URLs)
    profile_contact_line = next((l.strip() for l in header_lines if "|" in l), "")
    if not profile_contact_line:
        return resume_text
    r_lines = resume_text.split("\n")
    for i, line in enumerate(r_lines):
        if "|" in line and ("@" in line or any(
            x in line.lower() for x in ["linkedin", "github", "portfolio", "http", "+1"]
        )):
            r_lines[i] = profile_contact_line
            break
    return "\n".join(r_lines)
