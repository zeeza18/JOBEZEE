"""
extraction_service.py — Structured JD/resume extraction via Groq API + Pydantic.

Architecture
------------
- Groq API (llama-3.3-70b-versatile): follows nuanced extraction rules reliably
- Pydantic validates + cleans the LLM JSON output
- Falls back to regex extraction (scorer_service.py) if Groq is unavailable

Usage:
    from backend.services.extraction_service import extract_jd, extract_resume
    result = extract_jd(jd_text)    # -> JobExtracted | None
    result = extract_resume(text)   # -> ResumeExtracted | None
"""
from __future__ import annotations

import json
import logging
import os
import re
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, field_validator

log = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Pydantic output schemas (unchanged — callers depend on these shapes)
# ─────────────────────────────────────────────────────────────────────────────

class JobExtracted(BaseModel):
    title      : str       = ""
    skills     : list[str] = []
    years_min  : int       = 0
    education  : str       = "none"
    location   : str       = ""
    salary_text: str       = ""

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
        v = str(v).lower().strip() if v else ""
        if "phd" in v or "doctorate" in v:        return "phd"
        if "master" in v or "msc" in v:           return "masters"
        if "bachelor" in v or "bsc" in v:         return "bachelors"
        if "associate" in v:                       return "associate"
        return "none"

    @field_validator("title", "location", "salary_text", mode="before")
    @classmethod
    def _clean_str(cls, v):
        return str(v).strip() if v else ""


class ResumeExtracted(BaseModel):
    title              : str       = ""
    skills             : list[str] = []
    years_exp          : int       = 0
    education          : str       = "none"
    work_authorized    : bool      = True
    salary_expectation : int       = 0
    location           : str       = ""
    has_references     : bool      = False

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
        v = str(v).lower().strip() if v else ""
        if "phd" in v or "doctorate" in v:        return "phd"
        if "master" in v or "msc" in v:           return "masters"
        if "bachelor" in v or "bsc" in v:         return "bachelors"
        if "associate" in v:                       return "associate"
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

    @field_validator("title", "location", mode="before")
    @classmethod
    def _clean_str(cls, v):
        return str(v).strip() if v else ""


# ─────────────────────────────────────────────────────────────────────────────
# Prompts  (tool1_prompt.txt style — keywords/needs/results structure)
# ─────────────────────────────────────────────────────────────────────────────

_SYS = (
    "You are a precise ATS keyword extractor. "
    "Return ONLY valid JSON — no markdown, no code fences, no extra text."
)

_JD_PROMPT = """\
You are an ATS keyword extraction expert. Extract EVERY keyword from the job description.

EXTRACT ALL OF THESE:

1. TECHNICAL SKILLS
   - Programming languages (Python, SQL, Java, R, C++, etc.)
   - Libraries/Frameworks (Pandas, NumPy, TensorFlow, PyTorch, FastAPI, React, etc.)
   - Platforms (AWS, GCP, Azure, Databricks, Snowflake, etc.)
   - Tools (Docker, Kubernetes, Git, Jira, Terraform, etc.)
   - Databases (PostgreSQL, MongoDB, Redis, MySQL, etc.)
   - AI/ML terms (LLM, RAG, NLP, transformers, vector databases, fine-tuning, etc.)
   - Specific products/APIs (OpenAI, Anthropic, LangChain, LangGraph, Salesforce, SAP, etc.)

2. SOFT SKILLS (only if explicitly mentioned)
   - Communication, collaboration, leadership, problem-solving
   - Stakeholder management, cross-functional teamwork

3. DOMAIN TERMS
   - Industry-specific terms (FinTech, healthcare, compliance, HIPAA, SOC2, etc.)
   - Role-specific terms (agent development, orchestration, financial modeling, etc.)
   - Methodologies (Agile, Scrum, CI/CD, DevOps, Six Sigma, etc.)
   - Certifications (CPA, PMP, AWS Certified, Series 7, RN, etc.)

Job Description:
{jd_text}

Return ONLY this JSON (no markdown, no code fences, no extra text):
{{
  "job_title": "2-3 word job title",
  "keywords": ["Python", "TensorFlow", "AWS", "..."],
  "needs": ["5+ years Python experience", "Bachelor's degree Computer Science", "..."],
  "results": ["build and deploy AI agents", "optimize ML pipelines", "..."],
  "location": "Remote or City, State/Country",
  "salary_text": "$80k-$120k or empty string"
}}

CRITICAL RULES:
- keywords[]: EVERY specific tool, library, platform, methodology, certification, domain term — each as a separate string
- needs[]: years of experience requirements, degree requirements, clearance requirements — as readable phrases
- results[]: what the job wants built/done/achieved
- DO NOT add the company name to keywords[] — it is the employer, not a skill
- DO NOT add geographic terms (USA, Texas, Remote) to keywords[]
- DO NOT add contract/legal types (LLC, C2C, W2) to keywords[]
- DO NOT add boilerplate words (WILL, MUST, HAVE, EXP, PEOPLE, TEAM) to keywords[]
- location: city/region from the JD (empty string if fully remote or not stated)
- salary_text: exact salary range text if present, else empty string

VALIDATION: valid JSON only, no trailing commas, no text outside the JSON object."""


_RESUME_PROMPT = """\
You are an ATS keyword extraction expert. Extract ALL skills and experience from this resume.

EXTRACT ALL OF THESE:

1. TECHNICAL SKILLS
   - Programming languages, libraries, frameworks, platforms, databases, tools
   - AI/ML: specific models, frameworks, techniques used
   - Cloud platforms, DevOps tools, APIs, specific products used

2. SOFT SKILLS (only if explicitly listed or clearly demonstrated)
   - Leadership, communication, project management, stakeholder management

3. DOMAIN EXPERTISE
   - Industry knowledge, methodologies, certifications, compliance areas
   - Role-specific deliverables actually built or owned

Resume:
{resume_text}

Return ONLY this JSON (no markdown, no code fences, no extra text):
{{
  "title": "most recent job title",
  "skills": ["Python", "TensorFlow", "LangChain", "..."],
  "years_exp": 4,
  "education": "masters",
  "work_authorized": true,
  "salary_expectation": 0,
  "location": "Chicago, IL"
}}

CRITICAL RULES:
- skills[]: EVERY concrete skill — each as a separate string, original casing preserved
- DO NOT add the person's name, contact info, or employer names to skills[]
- DO NOT add degree abbreviations alone (MS, BS) — capture in education field
- DO NOT add geographic terms or timezone abbreviations to skills[]
- years_exp: total years of professional work experience as integer (0 if unclear)
- education: one of exactly: phd / masters / bachelors / associate / none
- work_authorized: true if US citizen/GC/EAD; false if needs H1B/sponsorship; true if unclear
- salary_expectation: stated annual USD salary as integer, 0 if not mentioned
- location: city + state/country from resume header, empty string if not found

VALIDATION: valid JSON only, no trailing commas, no text outside the JSON object."""


# ─────────────────────────────────────────────────────────────────────────────
# Groq client (lazy, cached)
# ─────────────────────────────────────────────────────────────────────────────

_GROQ_MODEL = "llama-3.3-70b-versatile"


def _load_env_key(name: str) -> str:
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
    key = _load_env_key("GROQ_API_KEY")
    if not key:
        log.warning("[extraction] GROQ_API_KEY not set — LLM extraction disabled")
        return None
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
    log.warning("[extraction] Neither groq nor openai package found")
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Core LLM call
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
            max_tokens=800,
        )
        raw = resp.choices[0].message.content.strip()
        raw = re.sub(r"^```[a-z]*\n?", "", raw).rstrip("` \n")
        return json.loads(raw)
    except Exception as exc:
        log.debug("[extraction] Groq call failed: %s", exc)
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _parse_years_from_needs(needs: list[str]) -> int:
    """Extract the highest years-of-experience figure from the needs list."""
    best = 0
    for item in (needs or []):
        m = re.search(r"(\d+)\+?\s*(?:year|yr)", item, re.IGNORECASE)
        if m:
            best = max(best, int(m.group(1)))
    return best


def _parse_education_from_needs(needs: list[str]) -> str:
    """Return normalized education level from needs phrases."""
    text = " ".join(needs or []).lower()
    if "phd" in text or "doctorate" in text:    return "phd"
    if "master" in text or "m.s" in text:       return "masters"
    if "bachelor" in text or "b.s" in text:     return "bachelors"
    if "associate" in text:                      return "associate"
    return "none"


def pdf_to_text(pdf_bytes: bytes) -> str:
    try:
        from pdfminer.high_level import extract_text as _pdfminer
        import io
        return _pdfminer(io.BytesIO(pdf_bytes)) or ""
    except Exception:
        pass
    try:
        import io, pypdf
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        return "\n".join(p.extract_text() or "" for p in reader.pages)
    except Exception:
        pass
    return ""


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def extract_jd(text: str) -> JobExtracted | None:
    """
    Extract structured data from a raw job description.
    Returns None on failure — caller should fall back to regex extraction.
    """
    if not text or len(text.split()) < 20:
        return None

    body = " ".join(text.split()[:2500])
    data = _call_groq(_JD_PROMPT.format(jd_text=body))
    if not data:
        return None

    try:
        # Map tool1_prompt.txt output → JobExtracted fields
        keywords : list[str] = data.get("keywords") or []
        needs    : list[str] = data.get("needs") or []
        results  : list[str] = data.get("results") or []

        # Combine keywords + results as the full skill list
        all_skills = keywords + [r for r in results if len(r.split()) <= 5]

        years_min  = _parse_years_from_needs(needs) or data.get("years_min") or 0
        education  = _parse_education_from_needs(needs)
        if education == "none" and data.get("education"):
            education = data["education"]

        result = JobExtracted(
            title       = data.get("job_title") or data.get("title") or "",
            skills      = all_skills,
            years_min   = years_min,
            education   = education,
            location    = data.get("location") or "",
            salary_text = data.get("salary_text") or "",
        )
        if not result.skills:
            log.debug("[extraction] JD extraction returned empty skills")
            return None
        return result
    except Exception as exc:
        log.debug("[extraction] Pydantic validation failed for JD: %s", exc)
        return None


def extract_resume(text: str) -> ResumeExtracted | None:
    """
    Extract structured data from a raw resume string.
    Returns None on failure — caller should fall back to regex extraction.
    """
    if not text or len(text.split()) < 20:
        return None

    body = " ".join(text.split()[:2500])
    data = _call_groq(_RESUME_PROMPT.format(resume_text=body))
    if not data:
        return None

    try:
        result = ResumeExtracted(**{k: v for k, v in data.items()
                                    if k in ResumeExtracted.model_fields})
        if not result.skills:
            log.debug("[extraction] Resume extraction returned empty skills")
            return None
        return result
    except Exception as exc:
        log.debug("[extraction] Pydantic validation failed for resume: %s", exc)
        return None
