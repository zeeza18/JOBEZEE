"""
Applied Jobs router — job tracker with email-based status automation.

GET   /api/applied-jobs                — full tracker list
PATCH /api/applied-jobs/{id}/status    — manual status update
POST  /api/applied-jobs/scan-emails    — scan Gmail + keyword/GPT-4o-mini status detection
"""
from __future__ import annotations

import asyncio
import email as _email_lib
import imaplib
import os
import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..config import get_settings
from ..database import AsyncSessionLocal, get_db
from ..models import PulledJob

router = APIRouter()

_JOBEZEE_ROOT = Path(__file__).resolve().parent.parent.parent

# ── Status catalogue ──────────────────────────────────────────────────────────
VALID_STATUSES = {
    "applying", "applied", "interview_r1", "interview_r2", "interview_r3",
    "offer", "rejected", "ghosted", "failed",
}

# ── Keyword rules (priority order) ───────────────────────────────────────────
_STATUS_KEYWORDS: list[tuple[str, list[str]]] = [
    ("offer",        ["pleased to offer", "offer letter", "congratulations on your offer",
                      "job offer", "we are delighted to offer"]),
    ("rejected",     ["unfortunately", "not moving forward", "other candidates",
                      "we regret", "not selected", "not a fit", "decided not to proceed",
                      "position has been filled"]),
    ("interview_r3", ["final round", "final interview", "last round", "onsite"]),
    ("interview_r2", ["second interview", "second round", "2nd round", "technical interview",
                      "coding interview", "take-home"]),
    ("interview_r1", ["interview", "phone screen", "schedule", "recruiter call",
                      "hiring manager", "video call", "zoom", "google meet"]),
    ("applied",      ["application received", "we received your application",
                      "thank you for applying", "application submitted",
                      "application confirmation", "your application has been"]),
]


def _detect_status_from_text(text: str) -> str | None:
    t = text.lower()
    for status, keywords in _STATUS_KEYWORDS:
        if any(kw in t for kw in keywords):
            return status
    return None


async def _gpt_detect_status(text: str) -> str | None:
    """Use GPT-4o-mini as a fallback for ambiguous emails."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        import httpx
        prompt = (
            "You are a job application email classifier. "
            "Given the email below, reply with exactly ONE of these words: "
            "applied, interview_r1, interview_r2, interview_r3, offer, rejected, ghosted. "
            "Reply with only the word, nothing else.\n\nEMAIL:\n" + text[:2000]
        )
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 10,
                    "temperature": 0,
                },
            )
        word = r.json()["choices"][0]["message"]["content"].strip().lower()
        if word in VALID_STATUSES:
            return word
    except Exception:
        pass
    return None


# ── GET /api/applied-jobs ─────────────────────────────────────────────────────

@router.get("")
async def list_applied_jobs(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pid = uuid.UUID(current_user.id)
    res = await db.execute(
        select(PulledJob)
        .where(
            PulledJob.user_profile_id == pid,
            PulledJob.status.not_in(["new", "saved", "hidden"]),
        )
        .order_by(PulledJob.pulled_at.desc())
    )
    jobs = res.scalars().all()

    def _salary(j: PulledJob) -> str:
        if j.salary_text:
            return j.salary_text
        if j.salary_min and j.salary_max:
            return f"${int(j.salary_min):,} – ${int(j.salary_max):,}"
        if j.salary_min:
            return f"${int(j.salary_min):,}+"
        return ""

    result = [
        {
            "job_id":       str(j.id),
            "title":        j.title or "",
            "company":      j.company or "",
            "url":          j.url or "",
            "salary":       _salary(j),
            "date_posted":  j.posted_at or "",
            "date_applied": j.pulled_at.strftime("%b %d, %Y") if j.pulled_at else "",
            "platform":     j.site or j.source or "",
            "work_style":   j.job_type or "",
            "status":       j.status if j.status in VALID_STATUSES else "applied",
        }
        for j in jobs
    ]
    return {"total": len(result), "jobs": result}


# ── PATCH /{id}/status ────────────────────────────────────────────────────────

class StatusUpdate(BaseModel):
    status: str

@router.patch("/{job_id}/status")
async def update_status(
    job_id: str,
    body: StatusUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.status not in VALID_STATUSES:
        raise HTTPException(400, f"Invalid status. Choose from: {VALID_STATUSES}")
    pid = uuid.UUID(current_user.id)
    jid = uuid.UUID(job_id)
    res = await db.execute(
        select(PulledJob).where(PulledJob.id == jid, PulledJob.user_profile_id == pid)
    )
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")
    job.status = body.status
    await db.commit()
    return {"job_id": job_id, "status": body.status}


# ── IMAP Gmail helper ─────────────────────────────────────────────────────────

def _imap_search(query: str, max_results: int = 5) -> str:
    """Search Gmail via IMAP using App Password. Returns combined email text."""
    cfg = get_settings()
    if not cfg.GMAIL_USER or not cfg.GMAIL_APP_PASSWORD:
        return ""
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(cfg.GMAIL_USER, cfg.GMAIL_APP_PASSWORD)
        mail.select("inbox")

        # Search subject + body for the query terms
        search_str = " ".join(f'"{w}"' for w in query.split() if w)
        _, data = mail.search(None, f'(OR SUBJECT {search_str} BODY {search_str})')
        ids = data[0].split()[-max_results:]  # newest N

        combined = ""
        for uid in ids:
            _, msg_data = mail.fetch(uid, "(RFC822)")
            msg = _email_lib.message_from_bytes(msg_data[0][1])
            subject = msg.get("subject", "")
            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        body += part.get_payload(decode=True).decode(errors="ignore")
                        break
            else:
                body = msg.get_payload(decode=True).decode(errors="ignore")
            combined += f" {subject} {body}"

        mail.logout()
        return combined
    except Exception:
        return ""


# ── POST /scan-emails ─────────────────────────────────────────────────────────

@router.post("/scan-emails")
async def scan_emails(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Scan Gmail via IMAP and auto-update job status using keywords + GPT-4o-mini."""
    cfg = get_settings()
    if not cfg.GMAIL_USER or not cfg.GMAIL_APP_PASSWORD:
        raise HTTPException(503, "Gmail not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to .env")

    pid = uuid.UUID(current_user.id)
    res = await db.execute(
        select(PulledJob).where(
            PulledJob.user_profile_id == pid,
            PulledJob.status.in_(["applied", "applying"]),
        ).order_by(PulledJob.pulled_at.desc()).limit(50)
    )
    jobs = res.scalars().all()

    loop = asyncio.get_event_loop()
    updates: list[dict] = []
    for job in jobs:
        query = f"{job.company} {job.title}" if job.company else (job.title or "")
        if not query.strip():
            continue
        combined_text = await loop.run_in_executor(None, lambda q=query: _imap_search(q, 3))
        if not combined_text.strip():
            continue

        new_status = _detect_status_from_text(combined_text)
        if not new_status:
            new_status = await _gpt_detect_status(combined_text)
        if new_status and new_status != job.status:
            job.status = new_status
            updates.append({"job_id": str(job.id), "company": job.company, "new_status": new_status})

    if updates:
        await db.commit()

    return {"scanned": len(jobs), "updated": len(updates), "changes": updates}


# ── Email confirmation watcher (called after apply is triggered) ──────────────

async def watch_email_for_confirmation(
    pulled_job_id: str,
    company: str,
    title: str,
    poll_interval: int = 5 * 60,
    max_polls: int = 288,
) -> None:
    """Poll Gmail every poll_interval seconds for a confirmation email for a specific job."""
    import logging
    log = logging.getLogger(__name__)

    cfg = get_settings()
    if not cfg.GMAIL_USER or not cfg.GMAIL_APP_PASSWORD:
        log.warning("[EmailWatch] Gmail not configured — watcher exiting")
        return

    jid = uuid.UUID(pulled_job_id)
    loop = asyncio.get_event_loop()
    log.info("[EmailWatch] watching job %s (%s @ %s)", pulled_job_id, title, company)

    for attempt in range(max_polls):
        await asyncio.sleep(poll_interval)

        async with AsyncSessionLocal() as db:
            res = await db.execute(select(PulledJob).where(PulledJob.id == jid))
            job = res.scalar_one_or_none()
            if not job or job.status != "applying":
                log.info("[EmailWatch] job %s no longer 'applying' — stopping", pulled_job_id)
                return

        # Search Gmail via IMAP
        query = f"{company} {title}" if company else (title or "")
        combined_text = await loop.run_in_executor(None, lambda q=query: _imap_search(q, 3))

        if not combined_text.strip():
            continue

        new_status = _detect_status_from_text(combined_text)
        if not new_status:
            new_status = await _gpt_detect_status(combined_text)

        if new_status:
            async with AsyncSessionLocal() as db:
                res = await db.execute(select(PulledJob).where(PulledJob.id == jid))
                job = res.scalar_one_or_none()
                if job and job.status == "applying":
                    job.status = new_status
                    await db.commit()
            log.info("[EmailWatch] job %s confirmed → %s (attempt %d)", pulled_job_id, new_status, attempt + 1)
            return

    log.info("[EmailWatch] job %s timed out after 24 hrs — no confirmation email found", pulled_job_id)
