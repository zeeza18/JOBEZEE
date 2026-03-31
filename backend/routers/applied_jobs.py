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

    # Show only jobs that were explicitly acted on by the user/bot
    _TRACKER_STATUSES = {
        "applying", "applied",
        "interview_r1", "interview_r2", "interview_r3",
        "offer", "rejected", "ghosted", "failed",
    }

    res = await db.execute(
        select(PulledJob)
        .where(
            PulledJob.user_profile_id == pid,
            PulledJob.status.in_(list(_TRACKER_STATUSES)),
        )
        .order_by(PulledJob.pulled_at.desc())
        .limit(200)
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
            "job_id":          str(j.id),
            "title":           j.title or "",
            "company":         j.company or "",
            "url":             j.url or "",
            "salary":          _salary(j),
            "date_posted":     j.posted_at or "",
            "date_applied":    j.pulled_at.strftime("%b %d, %Y") if j.pulled_at else "",
            "platform":        j.site or j.source or "",
            "work_style":      j.job_type or "",
            "status":          j.status if j.status in VALID_STATUSES else "applied",
            "resume_used_url": getattr(j, "resume_used_url", "") or "",
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

_JOB_EMAIL_DOMAINS = (
    "linkedin.com", "greenhouse.io", "lever.co", "workday.com",
    "myworkdayjobs.com", "taleo.net", "icims.com", "jobvite.com",
    "bamboohr.com", "smartrecruiters.com", "ashbyhq.com", "rippling.com",
    "indeed.com", "glassdoor.com", "ziprecruiter.com", "angellist.com",
    "wellfound.com", "ycombinator.com", "hiringthing.com", "breezyhr.com",
    "recruitee.com", "applytojob.com", "workable.com", "pinpointhq.com",
)

_JOB_SUBJECT_KEYWORDS = (
    "application", "applied", "thank you for applying", "your application",
    "we received", "application received", "application submitted",
    "application confirmation", "interview", "position", "role", "opportunity",
    "recruiter", "hiring", "offer", "rejected", "not moving forward",
)


def _is_job_email(msg) -> bool:
    """Return True only if this email looks like a job-related message."""
    sender = (msg.get("from") or "").lower()
    subject = (msg.get("subject") or "").lower()
    # Accept if sender is from a known job platform
    if any(d in sender for d in _JOB_EMAIL_DOMAINS):
        return True
    # Accept if subject contains job-related keywords
    if any(kw in subject for kw in _JOB_SUBJECT_KEYWORDS):
        return True
    return False


def _imap_search(query: str, max_results: int = 5) -> str:
    """Search Gmail via IMAP using App Password. Returns combined email text (job emails only)."""
    cfg = get_settings()
    if not cfg.GMAIL_USER or not cfg.GMAIL_APP_PASSWORD:
        return ""
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(cfg.GMAIL_USER, cfg.GMAIL_APP_PASSWORD)
        mail.select("inbox")

        # Search by company name in subject only (more precise than body search)
        company_word = query.split()[0] if query.strip() else query
        _, data = mail.search(None, f'SUBJECT "{company_word}"')
        ids = data[0].split()[-max_results * 3:]  # fetch extra to filter

        combined = ""
        kept = 0
        for uid in reversed(ids):  # newest first
            if kept >= max_results:
                break
            _, msg_data = mail.fetch(uid, "(RFC822)")
            msg = _email_lib.message_from_bytes(msg_data[0][1])
            if not _is_job_email(msg):
                continue
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
            kept += 1

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


# ── LinkedIn application confirmation email sync ──────────────────────────────
# Pattern (from jobs-noreply@linkedin.com):
#   Subject : "MOHAMMED, your application was sent to {Company}"
#   Body    : "Your application was sent to {Company}\n{Title}\n{Company}\n{Location}\nView job: https://www.linkedin.com/comm/jobs/view/{JOB_ID}/..."

_LI_CONFIRM_RE = re.compile(r"your application was sent to", re.IGNORECASE)
_LI_JOB_URL_RE = re.compile(r"linkedin\.com/(?:comm/)?jobs/view/(\d+)")


def _parse_linkedin_confirmation(msg) -> dict | None:
    """Parse a LinkedIn 'application sent' email and return extracted job fields."""
    subject = msg.get("subject", "")
    if not _LI_CONFIRM_RE.search(subject):
        return None
    sender = (msg.get("from") or "").lower()
    if "linkedin.com" not in sender:
        return None

    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                body = part.get_payload(decode=True).decode(errors="ignore")
                break
    else:
        body = msg.get_payload(decode=True).decode(errors="ignore")

    # Extract LinkedIn job ID from URL in body
    url_match = _LI_JOB_URL_RE.search(body)
    if not url_match:
        return None
    job_id = url_match.group(1)
    li_url = f"https://www.linkedin.com/jobs/view/{job_id}"

    # Parse body lines: "Your application was sent to {Company}\n{Title}\n{Company}\n{Location}"
    lines = [ln.strip() for ln in body.splitlines() if ln.strip()]
    title = ""
    company = ""
    location = ""
    for i, ln in enumerate(lines):
        if _LI_CONFIRM_RE.search(ln):
            # Next non-empty line = title, then company, then location
            remaining = lines[i + 1:]
            if len(remaining) >= 1:
                title = remaining[0]
            if len(remaining) >= 2:
                company = remaining[1]
            if len(remaining) >= 3 and not remaining[2].startswith("View job"):
                location = remaining[2]
            break

    return {"title": title, "company": company, "location": location, "url": li_url, "job_id": job_id}


def _fetch_linkedin_confirmation_emails(since_days: int = 7) -> list[dict]:
    """Fetch LinkedIn 'application was sent' emails from the last N days."""
    cfg = get_settings()
    if not cfg.GMAIL_USER or not cfg.GMAIL_APP_PASSWORD:
        return []
    try:
        import datetime as _dt
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(cfg.GMAIL_USER, cfg.GMAIL_APP_PASSWORD)
        mail.select("inbox")

        since = (_dt.datetime.now() - _dt.timedelta(days=since_days)).strftime("%d-%b-%Y")
        _, data = mail.search(None, f'FROM "jobs-noreply@linkedin.com" SUBJECT "your application was sent" SINCE {since}')
        ids = data[0].split()

        results = []
        for uid in reversed(ids):  # newest first
            _, msg_data = mail.fetch(uid, "(RFC822)")
            msg = _email_lib.message_from_bytes(msg_data[0][1])
            parsed = _parse_linkedin_confirmation(msg)
            if parsed:
                results.append(parsed)

        mail.logout()
        return results
    except Exception:
        return []


@router.post("/sync-linkedin-emails")
async def sync_linkedin_emails(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Sync LinkedIn application confirmation emails → create PulledJob rows.
    Scans Gmail for 'your application was sent' emails from LinkedIn (last 7 days).
    """
    pid = uuid.UUID(current_user.id)
    loop = asyncio.get_event_loop()
    emails = await loop.run_in_executor(None, _fetch_linkedin_confirmation_emails, 7)

    added = 0
    for e in emails:
        # Skip if already tracked
        existing = await db.execute(
            select(PulledJob).where(
                PulledJob.user_profile_id == pid,
                PulledJob.url == e["url"],
            )
        )
        if existing.scalar_one_or_none():
            continue
        db.add(PulledJob(
            user_profile_id   = pid,
            search_session_id = "email-sync",
            title             = e["title"],
            company           = e["company"],
            location          = e["location"],
            url               = e["url"],
            status            = "applied",
            source            = "linkedin",
            site              = "linkedin",
        ))
        added += 1

    if added:
        await db.commit()

    return {"scanned": len(emails), "added": added}


async def sync_linkedin_emails_for_user(user_profile_id: str) -> int:
    """Background helper: sync LinkedIn confirmation emails for a specific user. Returns count added."""
    try:
        pid = uuid.UUID(user_profile_id)
    except (ValueError, AttributeError):
        return 0

    loop = asyncio.get_event_loop()
    emails = await loop.run_in_executor(None, _fetch_linkedin_confirmation_emails, 7)

    added = 0
    async with AsyncSessionLocal() as db:
        for e in emails:
            existing = await db.execute(
                select(PulledJob).where(
                    PulledJob.user_profile_id == pid,
                    PulledJob.url == e["url"],
                )
            )
            if existing.scalar_one_or_none():
                continue
            db.add(PulledJob(
                user_profile_id   = pid,
                search_session_id = "email-sync",
                title             = e["title"],
                company           = e["company"],
                location          = e["location"],
                url               = e["url"],
                status            = "applied",
                source            = "linkedin",
                site              = "linkedin",
            ))
            added += 1
        if added:
            await db.commit()
    return added
