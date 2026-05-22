"""
Interview API — AI-powered mock interview system.

Endpoints
─────────
POST /api/interview/generate              — generate questions via GPT-4o-mini
POST /api/interview/sessions              — save a completed session
GET  /api/interview/sessions              — list user's sessions (paginated)
GET  /api/interview/sessions/{id}         — get one session
DELETE /api/interview/sessions/{id}       — delete a session

POST /api/interview/scheduled             — create a scheduled interview
GET  /api/interview/scheduled             — list upcoming scheduled interviews
DELETE /api/interview/scheduled/{id}      — cancel a scheduled interview
PATCH /api/interview/scheduled/{id}/start — mark as started (returns the interview to run)
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..database import get_db
from ..models import User, InterviewSessionRecord, ScheduledInterviewRecord, UserProfile
from ..config import get_settings
from ..services.email_service import send_interview_scheduled_email

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interview", tags=["interview"])

# ── Round metadata ─────────────────────────────────────────────────────────────

ROUND_DESCRIPTIONS = {
    "phone": (
        "Phone Screen (15–20 min typical): Easy, conversational questions. Cover: "
        "work authorization / visa status, salary expectations, availability / start date, "
        "why they're interested in this specific role and company, general background fit. "
        "Keep questions simple and open-ended. No coding."
    ),
    "mid": (
        "Round 1 — Mid-Level Interview: Mix of behavioral and moderate technical questions. "
        "Include STAR-format behavioral prompts ('Tell me about a time…'), "
        "situational scenarios relevant to the JD, moderate technical conceptual questions "
        "(no live coding, but can ask how they would approach a problem). "
        "Can include sales scenarios if the role is sales-related."
    ),
    "technical": (
        "Technical Deep-Dive: Expert-level questions. Include: algorithm and data structure "
        "problems where candidate should write/describe code, system design questions, "
        "architecture tradeoffs, debugging scenarios, performance optimization. "
        "Questions should be hard — assume senior-level candidate."
    ),
    "hr": (
        "HR Round: Scenario-based behavioral questions focused on soft skills. Cover: "
        "conflict resolution, teamwork, leadership style, career goals and trajectory, "
        "values alignment, handling difficult situations, culture fit. "
        "Use open-ended prompts and follow-ups."
    ),
}

ROUND_LABELS = {
    "phone":     "Phone Screen",
    "mid":       "Round 1 (Mid-Level)",
    "technical": "Technical Round",
    "hr":        "HR Round",
}

AVG_MINS_PER_Q = {"phone": 3, "hr": 4, "mid": 4, "technical": 5}


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    job_description: str
    resume_text:     str
    round_type:      str   # phone | mid | technical | hr
    duration_minutes: int  # 5–60


class SaveSessionRequest(BaseModel):
    job_title:        str
    company:          str
    round_type:       str
    round_label:      str
    duration_minutes: int
    questions:        list[dict]
    answers:          list[str]
    elapsed_seconds:  int
    jd_snippet:       str = ""
    completed_at:     str = ""   # ISO string


class CreateScheduledRequest(BaseModel):
    job_title:        str
    company:          str
    round_type:       str
    round_label:      str
    duration_minutes: int
    questions:        list[dict]
    scheduled_at:     str   # ISO datetime string


# ── Helpers ────────────────────────────────────────────────────────────────────

def _session_to_dict(s: InterviewSessionRecord) -> dict:
    return {
        "id":                 str(s.id),
        "job_title":          s.job_title,
        "company":            s.company,
        "round_type":         s.round_type,
        "round_label":        s.round_label,
        "duration_minutes":   s.duration_minutes,
        "questions":          s.questions or [],
        "answers":            s.answers or [],
        "elapsed_seconds":    s.elapsed_seconds,
        "questions_answered": s.questions_answered,
        "status":             s.status,
        "jd_snippet":         s.jd_snippet,
        "completed_at":       s.completed_at.isoformat() if s.completed_at else None,
        "created_at":         s.created_at.isoformat() if s.created_at else None,
    }


def _scheduled_to_dict(s: ScheduledInterviewRecord) -> dict:
    return {
        "id":               str(s.id),
        "job_title":        s.job_title,
        "company":          s.company,
        "round_type":       s.round_type,
        "round_label":      s.round_label,
        "duration_minutes": s.duration_minutes,
        "questions":        s.questions or [],
        "scheduled_at":     s.scheduled_at.isoformat() if s.scheduled_at else None,
        "status":           s.status,
        "created_at":       s.created_at.isoformat() if s.created_at else None,
    }


# ── Question generation ────────────────────────────────────────────────────────

@router.post("/generate")
async def generate_questions(
    req: GenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    cfg = get_settings()
    api_key = (cfg.OPENAI_API_KEY or "").strip()
    if not api_key:
        raise HTTPException(503, "OPENAI_API_KEY not configured on server")

    if req.round_type not in ROUND_DESCRIPTIONS:
        raise HTTPException(400, f"round_type must be one of: {list(ROUND_DESCRIPTIONS)}")

    if not (5 <= req.duration_minutes <= 60):
        raise HTTPException(400, "duration_minutes must be between 5 and 60")

    round_desc  = ROUND_DESCRIPTIONS[req.round_type]
    round_label = ROUND_LABELS[req.round_type]
    avg_q       = AVG_MINS_PER_Q.get(req.round_type, 4)
    q_count     = max(3, min(20, req.duration_minutes // avg_q))

    # ── Resolve resume ─────────────────────────────────────────────────────────
    if (req.resume_text or "").strip() == "(use profile resume)":
        prof_res = await db.execute(
            select(UserProfile).where(UserProfile.id == current_user.id)
        )
        prof = prof_res.scalar_one_or_none()
        rex  = (prof.resume_extraction or {}) if prof else {}
        if not rex:
            raise HTTPException(
                422,
                "No resume found in your profile. Please upload a resume on the Profile page first.",
            )
    else:
        # Build rex dict from pasted text (used as fallback context)
        rex = {"raw": (req.resume_text or "")[:2000]}

    def _fmt_resume(r: dict) -> str:
        if r.get("raw"):
            return r["raw"]
        lines = []
        if r.get("title"):     lines.append(f"Title: {r['title']}")
        if r.get("years_exp"): lines.append(f"Years of experience: {r['years_exp']}")
        if r.get("skills"):    lines.append(f"Skills: {', '.join(r['skills'])}")
        if r.get("education"): lines.append(f"Education: {r['education']}")
        if r.get("location"):  lines.append(f"Location: {r['location']}")
        return "\n".join(lines)

    resume_context = _fmt_resume(rex)

    # ── Step 1: Extract JD using tool1_prompt ──────────────────────────────────
    tool1_path = Path(__file__).parent.parent.parent / "tailor" / "prompt" / "tool1_prompt.txt"
    jd_extraction: dict[str, Any] = {}
    try:
        tool1_system = tool1_path.read_text(encoding="utf-8")
        async with httpx.AsyncClient(timeout=30.0) as client:
            r1 = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model":       "gpt-4o-mini",
                    "messages":    [
                        {"role": "system", "content": tool1_system},
                        {"role": "user",   "content": (req.job_description or "")[:4000]},
                    ],
                    "temperature": 0.0,
                    "max_tokens":  800,
                },
            )
        r1.raise_for_status()
        raw1 = r1.json()["choices"][0]["message"]["content"].strip()
        if raw1.startswith("```"):
            raw1 = raw1.split("```")[1]
            if raw1.startswith("json"):
                raw1 = raw1[4:]
            raw1 = raw1.strip()
        jd_extraction = json.loads(raw1)
        log.info("[Interview] JD extracted: title=%s company=%s keywords=%d",
                 jd_extraction.get("job_title"), jd_extraction.get("company_name"),
                 len(jd_extraction.get("keywords", [])))
    except Exception as exc:
        log.warning("[Interview] JD extraction failed (using raw JD): %s", exc)
        # Fall back to raw JD text
        jd_extraction = {}

    # ── Build question-generation context ─────────────────────────────────────
    if jd_extraction:
        keywords = jd_extraction.get("keywords", [])[:40]
        needs    = jd_extraction.get("needs", [])
        results  = jd_extraction.get("results", [])
        job_ctx  = (
            f"Title: {jd_extraction.get('job_title', 'Unknown')}\n"
            f"Company: {jd_extraction.get('company_name', 'Unknown')}\n"
            f"Required skills: {', '.join(keywords)}\n"
            f"Requirements: {'; '.join(needs)}\n"
            f"Expected outcomes: {'; '.join(results)}"
        )
    else:
        job_ctx = (req.job_description or "")[:3000]

    # ── Step 2: Generate interview questions ──────────────────────────────────
    system_prompt = (
        "You are an expert technical recruiter generating realistic mock interview questions. "
        "Respond with valid JSON only — no markdown, no extra text."
    )
    extracted_title   = jd_extraction.get("job_title", "")
    extracted_company = jd_extraction.get("company_name", "Unknown")

    user_prompt = f"""Generate exactly {q_count} interview questions for a {round_label} interview.

Round description: {round_desc}

Job Details:
{job_ctx}

Candidate Profile:
{resume_context}

Return this exact JSON shape:
{{
  "job_title": "{extracted_title or '<job title>'}",
  "company": "{extracted_company}",
  "round": "{req.round_type}",
  "round_label": "{round_label}",
  "duration_minutes": {req.duration_minutes},
  "questions": [
    {{
      "id": 1,
      "question": "<the interview question>",
      "category": "<one of: background|fit|coding|system_design|behavioral|scenario|technical|hr>",
      "estimated_time_seconds": <60–600>
    }}
  ]
}}

Rules:
- Questions must be directly relevant to the extracted skills, requirements, and candidate profile
- Ask only real interview questions — no coaching, no hints, no answers
- For technical rounds: include at least 2 concrete coding/algorithm problems using skills from the JD
- Spread question types across the duration appropriately
"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model":       "gpt-4o-mini",
                    "messages":    [
                        {"role": "system", "content": system_prompt},
                        {"role": "user",   "content": user_prompt},
                    ],
                    "temperature": 0.7,
                    "max_tokens":  2500,
                },
            )
        resp.raise_for_status()
        raw     = resp.json()
        content = raw["choices"][0]["message"]["content"].strip()

        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()

        data: dict[str, Any] = json.loads(content)
        if "questions" not in data or not isinstance(data["questions"], list):
            raise ValueError("Response missing 'questions' array")
        return data

    except httpx.HTTPStatusError as exc:
        log.error("[Interview] OpenAI error %s: %s", exc.response.status_code, exc.response.text[:300])
        raise HTTPException(502, f"OpenAI API error: {exc.response.status_code}")
    except (json.JSONDecodeError, ValueError) as exc:
        log.error("[Interview] JSON parse error: %s", exc)
        raise HTTPException(502, "Failed to parse AI response — please try again")
    except Exception as exc:
        log.exception("[Interview] Unexpected error: %s", exc)
        raise HTTPException(500, "Interview generation failed")


# ── Session CRUD ───────────────────────────────────────────────────────────────

@router.post("/sessions", status_code=201)
async def save_session(
    req: SaveSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    answered = sum(1 for a in req.answers if (a or "").strip())
    completed_dt: datetime | None = None
    if req.completed_at:
        try:
            completed_dt = datetime.fromisoformat(req.completed_at.replace("Z", "+00:00"))
        except ValueError:
            completed_dt = datetime.now(timezone.utc)

    session = InterviewSessionRecord(
        user_id            = current_user.id,
        job_title          = req.job_title[:300],
        company            = req.company[:200],
        round_type         = req.round_type[:20],
        round_label        = req.round_label[:100],
        duration_minutes   = req.duration_minutes,
        questions          = req.questions,
        answers            = req.answers,
        elapsed_seconds    = req.elapsed_seconds,
        questions_answered = answered,
        status             = "completed",
        jd_snippet         = req.jd_snippet[:500],
        completed_at       = completed_dt or datetime.now(timezone.utc),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    log.info("[Interview] Session saved: user=%s id=%s round=%s", current_user.id, session.id, req.round_type)
    return _session_to_dict(session)


@router.get("/sessions")
async def list_sessions(
    limit:  int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    total_res = await db.execute(
        select(func.count()).where(InterviewSessionRecord.user_id == current_user.id)
    )
    total = total_res.scalar() or 0

    res = await db.execute(
        select(InterviewSessionRecord)
        .where(InterviewSessionRecord.user_id == current_user.id)
        .order_by(InterviewSessionRecord.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    sessions = res.scalars().all()
    return {"total": total, "sessions": [_session_to_dict(s) for s in sessions]}


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    try:
        uid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(400, "Invalid session ID")

    res = await db.execute(
        select(InterviewSessionRecord).where(
            InterviewSessionRecord.id == uid,
            InterviewSessionRecord.user_id == current_user.id,
        )
    )
    s = res.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Session not found")
    return _session_to_dict(s)


@router.delete("/sessions/{session_id}", status_code=204, response_model=None)
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        uid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(400, "Invalid session ID")

    result = await db.execute(
        delete(InterviewSessionRecord).where(
            InterviewSessionRecord.id == uid,
            InterviewSessionRecord.user_id == current_user.id,
        )
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(404, "Session not found")


# ── Scheduled interviews CRUD ──────────────────────────────────────────────────

@router.post("/scheduled", status_code=201)
async def create_scheduled(
    req: CreateScheduledRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    try:
        sched_dt = datetime.fromisoformat(req.scheduled_at.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(400, "Invalid scheduled_at datetime format")

    item = ScheduledInterviewRecord(
        user_id          = current_user.id,
        job_title        = req.job_title[:300],
        company          = req.company[:200],
        round_type       = req.round_type[:20],
        round_label      = req.round_label[:100],
        duration_minutes = req.duration_minutes,
        questions        = req.questions,
        scheduled_at     = sched_dt,
        status           = "pending",
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    log.info("[Interview] Scheduled: user=%s id=%s at=%s", current_user.id, item.id, sched_dt)

    # Fire-and-forget confirmation email
    try:
        formatted_dt = sched_dt.strftime("%B %d, %Y at %I:%M %p UTC")
        cfg = get_settings()
        import asyncio as _asyncio
        _asyncio.create_task(send_interview_scheduled_email(
            to_email    = current_user.email,
            name        = getattr(current_user, "full_name", "") or current_user.email,
            job_title   = req.job_title,
            company     = req.company,
            round_label = req.round_label,
            duration    = req.duration_minutes,
            scheduled_at= formatted_dt,
            app_url     = f"{cfg.FRONTEND_URL}/app/interview",
        ))
    except Exception as _e:
        log.warning("[Interview] Email send failed (non-fatal): %s", _e)

    return _scheduled_to_dict(item)


@router.get("/scheduled")
async def list_scheduled(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    res = await db.execute(
        select(ScheduledInterviewRecord)
        .where(
            ScheduledInterviewRecord.user_id == current_user.id,
            ScheduledInterviewRecord.status == "pending",
        )
        .order_by(ScheduledInterviewRecord.scheduled_at.asc())
    )
    items = res.scalars().all()
    return {"scheduled": [_scheduled_to_dict(i) for i in items]}


@router.patch("/scheduled/{item_id}/start")
async def start_scheduled(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    try:
        uid = uuid.UUID(item_id)
    except ValueError:
        raise HTTPException(400, "Invalid ID")

    res = await db.execute(
        select(ScheduledInterviewRecord).where(
            ScheduledInterviewRecord.id == uid,
            ScheduledInterviewRecord.user_id == current_user.id,
        )
    )
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Scheduled interview not found")

    item.status = "started"
    await db.commit()
    return _scheduled_to_dict(item)


@router.delete("/scheduled/{item_id}", status_code=204, response_model=None)
async def cancel_scheduled(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        uid = uuid.UUID(item_id)
    except ValueError:
        raise HTTPException(400, "Invalid ID")

    result = await db.execute(
        delete(ScheduledInterviewRecord).where(
            ScheduledInterviewRecord.id == uid,
            ScheduledInterviewRecord.user_id == current_user.id,
        )
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(404, "Scheduled interview not found")
