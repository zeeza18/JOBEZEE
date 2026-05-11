"""
extraction_service.py — Structured JD/resume extraction via Groq API + Pydantic.

Architecture
------------
- Groq API (llama-3.1-8b-instant): free tier, ~0.3s/call, zero GPU/RAM on server
- Pydantic validates + cleans the LLM JSON output
- Falls back to regex extraction (scorer.py) if Groq is unavailable

Usage from any service:
    from backend.services.extraction_service import extract_jd, extract_resume
    result = await extract_jd(jd_text)   # -> JobExtracted | None
"""
from __future__ import annotations

import json
import logging
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, field_validator

log = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Pydantic extraction schemas
# ─────────────────────────────────────────────────────────────────────────────

class JobExtracted(BaseModel):
    title: str = ""
    skills: list[str] = []
    years_min: int = 0
    education: str = "none"

    @field_validator("skills", mode="before")
    @classmethod
    def _clean_skills(cls, v):
        if not isinstance(v, list):
            return []
        return [s.strip() for s in v if isinstance(s, str) and s.strip()]

    @field_validator("years_min", mode="before")
    @classmethod
    def _coerce_years(cls, v):
        try:
            return max(0, int(v)) if v is not None else 0
        except (TypeError, ValueError):
            return 0

    @field_validator("education", mode="before")
    @classmethod
    def _normalize_edu(cls, v):
        if isinstance(v, str) and v.lower() in {"phd", "masters", "bachelors", "associate", "none"}:
            return v.lower()
        return "none"

    @field_validator("title", mode="before")
    @classmethod
    def _clean_title(cls, v):
        return str(v).strip() if v else ""


class ResumeExtracted(BaseModel):
    title: str = ""
    skills: list[str] = []
    years_exp: int = 0
    education: str = "none"
    work_authorized: bool = True      # False = needs visa sponsorship
    salary_expectation: int = 0       # 0 = not stated; annual USD
    location: str = ""                # candidate's current location
    has_references: bool = False      # True = resume mentions references/recommendations

    @field_validator("skills", mode="before")
    @classmethod
    def _clean_skills(cls, v):
        if not isinstance(v, list):
            return []
        return [s.strip() for s in v if isinstance(s, str) and s.strip()]

    @field_validator("years_exp", mode="before")
    @classmethod
    def _coerce_years(cls, v):
        try:
            return max(0, int(v)) if v is not None else 0
        except (TypeError, ValueError):
            return 0

    @field_validator("education", mode="before")
    @classmethod
    def _normalize_edu(cls, v):
        if isinstance(v, str) and v.lower() in {"phd", "masters", "bachelors", "associate", "none"}:
            return v.lower()
        return "none"

    @field_validator("salary_expectation", mode="before")
    @classmethod
    def _coerce_salary(cls, v):
        try:
            val = int(v) if v is not None else 0
            return val if 20_000 <= val <= 2_000_000 else 0
        except (TypeError, ValueError):
            return 0

    @field_validator("work_authorized", mode="before")
    @classmethod
    def _coerce_authorized(cls, v):
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() not in ("false", "no", "0")
        return bool(v) if v is not None else True


# ─────────────────────────────────────────────────────────────────────────────
# Prompts
# ─────────────────────────────────────────────────────────────────────────────

_SYS = (
    "You are a precise data extractor. "
    "Return ONLY valid JSON — no explanation, no markdown, no code fences."
)

_JD_PROMPT = """\
Extract structured data from this job description.

Job Description:
{text}

Return exactly this JSON (no extra keys):
{{"title": "job title", "skills": ["Python", "AWS", "Docker"], "years_min": 3, "education": "bachelors"}}

Rules:
- skills: ONLY hard technical skills — programming languages, frameworks, libraries, platforms, \
databases, cloud services, DevOps tools, ML/AI frameworks. NO soft skills, NO company names, \
NO adjectives.
- years_min: integer (0 if not stated)
- education: one of: phd / masters / bachelors / associate / none"""

_RESUME_PROMPT = """\
Extract structured data from this resume.

Resume:
{text}

Return exactly this JSON (no extra keys):
{{"title": "most recent job title", "skills": ["Python", "React", "PostgreSQL"], \
"years_exp": 5, "education": "bachelors", "work_authorized": true, \
"salary_expectation": 120000, "location": "New York, NY", "has_references": false}}

Rules:
- skills: ONLY hard technical skills — programming languages, frameworks, tools, platforms, databases, cloud services. NO soft skills.
- years_exp: integer, total years of professional experience (0 if unknown)
- education: one of: phd / masters / bachelors / associate / none
- work_authorized: true if resume mentions US work authorization / citizen / permanent resident; false if mentions visa/sponsorship needed; true if unclear
- salary_expectation: annual salary in USD as integer (0 if not stated)
- location: city and state/country from resume header (empty string if not found)
- has_references: true if resume mentions references, recommendations, or LinkedIn endorsements"""


# ─────────────────────────────────────────────────────────────────────────────
# Groq client (lazy, cached)
# ─────────────────────────────────────────────────────────────────────────────

_GROQ_MODEL = "llama-3.1-8b-instant"   # free tier, fast; swap to llama-3.3-70b for higher accuracy


def _load_env_key(name: str) -> str:
    """Read key from os.environ, falling back to .env file."""
    val = os.environ.get(name, "")
    if val:
        return val
    for p in [Path(__file__).parents[2] / ".env", Path(__file__).parents[3] / ".env"]:
        if p.exists():
            for line in p.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith(f"{name}="):
                    return line.partition("=")[2].strip().strip('"').strip("'")
    return ""


@lru_cache(maxsize=1)
def _get_groq_client():
    """Return a cached Groq-compatible chat client, or None if unavailable."""
    key = _load_env_key("GROQ_API_KEY")
    if not key:
        log.warning("[extraction] GROQ_API_KEY not set — LLM extraction disabled")
        return None

    # Try native groq package first, fall back to openai-compat
    try:
        from groq import Groq
        return Groq(api_key=key)
    except ImportError:
        pass

    try:
        from openai import OpenAI
        return OpenAI(api_key=key, base_url="https://api.groq.com/openai/v1")
    except ImportError:
        pass

    log.warning("[extraction] Neither groq nor openai package found — install one")
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Core extraction helpers
# ─────────────────────────────────────────────────────────────────────────────

def _call_groq(prompt: str) -> dict | None:
    client = _get_groq_client()
    if client is None:
        return None

    try:
        resp = client.chat.completions.create(
            model=_GROQ_MODEL,
            messages=[
                {"role": "system", "content": _SYS},
                {"role": "user",   "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0,
            max_tokens=500,
        )
        raw = resp.choices[0].message.content.strip()
        # Strip accidental code fences
        raw = re.sub(r"^```[a-z]*\n?", "", raw).rstrip("` \n")
        return json.loads(raw)
    except Exception as exc:
        log.debug("[extraction] Groq call failed: %s", exc)
        return None


def pdf_to_text(pdf_bytes: bytes) -> str:
    """
    Extract plain text from PDF bytes.
    Tries pdfminer first (best quality), falls back to pypdf, then empty string.
    """
    try:
        from pdfminer.high_level import extract_text as _pdfminer
        import io
        return _pdfminer(io.BytesIO(pdf_bytes)) or ""
    except Exception:
        pass
    try:
        import io
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        return "\n".join(p.extract_text() or "" for p in reader.pages)
    except Exception:
        pass
    return ""


def extract_jd(text: str) -> JobExtracted | None:
    """
    Extract {title, skills, years_min, education} from a raw JD string.
    Returns None on failure — caller should fall back to regex extraction.
    """
    if not text or len(text.split()) < 20:
        return None
    body = " ".join(text.split()[:2000])
    data = _call_groq(_JD_PROMPT.format(text=body))
    if not data:
        return None
    try:
        result = JobExtracted(**data)
        if not result.skills:
            log.debug("[extraction] JD extraction returned empty skills")
            return None
        return result
    except Exception as exc:
        log.debug("[extraction] Pydantic validation failed for JD: %s", exc)
        return None


def extract_resume(text: str) -> ResumeExtracted | None:
    """
    Extract {title, skills, years_exp, education} from a raw resume string.
    Returns None on failure — caller should fall back to regex extraction.
    """
    if not text or len(text.split()) < 20:
        return None
    body = " ".join(text.split()[:2000])
    data = _call_groq(_RESUME_PROMPT.format(text=body))
    if not data:
        return None
    try:
        result = ResumeExtracted(**data)
        if not result.skills:
            log.debug("[extraction] Resume extraction returned empty skills")
            return None
        return result
    except Exception as exc:
        log.debug("[extraction] Pydantic validation failed for resume: %s", exc)
        return None
