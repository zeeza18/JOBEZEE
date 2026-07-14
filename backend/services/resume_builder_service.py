"""
Resume Maker service — structured resume documents, AI-assisted import/scoring,
and PDF/DOCX export.

Distinct from tailor_service.py: Tailor rewrites an existing flat-text resume
against a job description. Maker builds a structured, template-driven resume
from scratch (or from an imported one) and exports it.
"""
from __future__ import annotations

import base64
import json
import re
import tempfile
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models import ResumeDocument, UserProfile
from ..schemas import (
    ResumeDocumentContent,
    ResumeDocumentSettings,
    ResumeDocumentUpdate,
    ResumeScoreResponse,
)
from .tailor_service import _extract_resume_text

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
OPENAI_MODEL    = "gpt-4o-mini"


# ---------------------------------------------------------------------------
# Document CRUD
# ---------------------------------------------------------------------------

async def get_or_create_document(db: AsyncSession, user_id: str) -> ResumeDocument:
    """One active Maker document per user — created on first visit."""
    result = await db.execute(select(ResumeDocument).where(ResumeDocument.user_id == user_id))
    doc = result.scalar_one_or_none()
    if doc is None:
        doc = ResumeDocument(
            user_id=user_id,
            content=ResumeDocumentContent().model_dump(mode="json"),
            settings=ResumeDocumentSettings().model_dump(mode="json"),
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
    return doc


async def upsert_document(db: AsyncSession, user_id: str, update: ResumeDocumentUpdate) -> ResumeDocument:
    doc = await get_or_create_document(db, user_id)
    if update.title is not None:
        doc.title = update.title
    if update.content is not None:
        doc.content = update.content.model_dump(mode="json")
    if update.settings is not None:
        doc.settings = update.settings.model_dump(mode="json")
    await db.commit()
    await db.refresh(doc)
    return doc


# ---------------------------------------------------------------------------
# OpenAI helper (house pattern — see routers/avatar_interview.py)
# ---------------------------------------------------------------------------

async def _openai_chat_json(system: str, user: str, max_tokens: int = 2000) -> dict[str, Any]:
    cfg = get_settings()
    api_key = (cfg.OPENAI_API_KEY or "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not configured on server")

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            OPENAI_CHAT_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": OPENAI_MODEL,
                "max_tokens": max_tokens,
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            },
        )
    resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"]
    cleaned = re.sub(r"```json\s*|```\s*", "", raw).strip()
    return json.loads(cleaned)


# ---------------------------------------------------------------------------
# Import from profile (auto-structuring — the "do better than Resume-Matcher" bit)
# ---------------------------------------------------------------------------

async def _get_profile_resume_text(db: AsyncSession, user_id: str) -> str:
    """Same file-resolution logic as GET /api/tailor/profile-resume-text
    (resume_url on disk, falling back to DB-stored base64 bytes)."""
    import uuid as _uuid

    cfg = get_settings()
    pid = _uuid.UUID(user_id)
    result = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile = result.scalar_one_or_none()
    resume_url = (profile.resume_url if profile else "") or ""
    if not resume_url:
        raise RuntimeError("No resume on file. Upload one via Profile → Resume first.")

    jobezee_root = Path(__file__).resolve().parent.parent.parent
    upload_root = jobezee_root / cfg.UPLOAD_DIR
    rel = resume_url.lstrip("/")
    if rel.startswith("uploads/"):
        rel = rel[len("uploads/"):]
    file_path = upload_root / rel

    if not file_path.exists():
        b64 = getattr(profile, "resume_bytes", "") or ""
        if not b64:
            raise RuntimeError(f"Resume file not found on server ({file_path.name}). Please re-upload.")
        tmp_dir = Path(tempfile.mkdtemp())
        tmp_path = tmp_dir / file_path.name
        tmp_path.write_bytes(base64.b64decode(b64))
        file_path = tmp_path

    suffix = file_path.suffix.lower()
    text = file_path.read_text(errors="replace") if suffix == ".txt" else _extract_resume_text(file_path)
    if not text.strip():
        raise RuntimeError("Could not extract text from the stored resume.")
    return text


_IMPORT_SYSTEM_PROMPT = """You convert a plain-text resume into structured JSON for a resume builder.
Respond with JSON ONLY (no markdown fences), matching exactly this shape:
{
  "contact": {"full_name": "", "headline": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "portfolio": "", "website": ""},
  "summary": "",
  "experience": [{"id": "", "company": "", "title": "", "location": "", "start_date": "", "end_date": "", "current": false, "bullets": [""]}],
  "education": [{"id": "", "school": "", "degree": "", "field": "", "location": "", "start_date": "", "end_date": "", "gpa": ""}],
  "skills": [{"id": "", "label": "", "items": [""]}],
  "projects": [{"id": "", "name": "", "description": "", "bullets": [""], "link": "", "tech": [""]}],
  "certifications": [{"id": "", "name": "", "issuer": "", "date": "", "link": ""}]
}
Preserve every fact verbatim (company names, dates, metrics, titles) — never invent or embellish content.
Give each list item a short unique "id" slug (e.g. "exp-1", "edu-1"). Split the skills into 1-3 sensible
categories (e.g. "Languages", "Frameworks", "Tools"). Omit section_order (the client fills it in)."""


async def import_from_profile(db: AsyncSession, user_id: str) -> ResumeDocumentContent:
    resume_text = await _get_profile_resume_text(db, user_id)
    data = await _openai_chat_json(_IMPORT_SYSTEM_PROMPT, resume_text[:12000], max_tokens=3000)
    return ResumeDocumentContent.model_validate(data)


# ---------------------------------------------------------------------------
# ATS-style scoring (OpenAI — live panel in the Maker preview)
# ---------------------------------------------------------------------------

def _flatten_content(content: ResumeDocumentContent) -> str:
    lines: list[str] = []
    c = content.contact
    lines.append(f"{c.full_name} — {c.headline}")
    if content.summary:
        lines.append(content.summary)
    for exp in content.experience:
        lines.append(f"{exp.title} at {exp.company} ({exp.start_date}–{exp.end_date or 'Present'})")
        lines.extend(f"- {b}" for b in exp.bullets)
    for edu in content.education:
        lines.append(f"{edu.degree} {edu.field}, {edu.school}")
    for sk in content.skills:
        lines.append(f"{sk.label}: {', '.join(sk.items)}")
    for proj in content.projects:
        lines.append(f"Project: {proj.name} — {proj.description}")
        lines.extend(f"- {b}" for b in proj.bullets)
    for cert in content.certifications:
        lines.append(f"Certification: {cert.name} ({cert.issuer})")
    return "\n".join(lines)


_SCORE_SYSTEM_PROMPT = """You are a strict ATS (applicant tracking system) resume reviewer.
Respond with JSON ONLY (no markdown fences), matching exactly this shape:
{"score": 0, "matched": [""], "missing": [""], "suggestions": [""]}
"score" is 0-100 overall resume quality/ATS-parseability (and job-fit if a job description is given).
"matched" and "missing" are notable keywords/skills present vs absent (job description keywords if given,
otherwise general strong-resume signals). "suggestions" is up to 5 short, concrete improvement tips."""


async def score_document(content: ResumeDocumentContent, job_description: str = "") -> ResumeScoreResponse:
    resume_text = _flatten_content(content)
    user_prompt = f"RESUME:\n{resume_text[:6000]}"
    if job_description.strip():
        user_prompt += f"\n\nJOB DESCRIPTION:\n{job_description.strip()[:3000]}"
    data = await _openai_chat_json(_SCORE_SYSTEM_PROMPT, user_prompt, max_tokens=800)
    return ResumeScoreResponse(
        score=max(0, min(100, int(data.get("score", 0)))),
        matched=[str(x) for x in (data.get("matched") or [])][:20],
        missing=[str(x) for x in (data.get("missing") or [])][:20],
        suggestions=[str(x) for x in (data.get("suggestions") or [])][:5],
    )


# ---------------------------------------------------------------------------
# DOCX export (structure-aware — python-docx)
# ---------------------------------------------------------------------------

def generate_docx(content: ResumeDocumentContent, settings: ResumeDocumentSettings, out_path: Path) -> Path:
    from docx import Document
    from docx.shared import Pt
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    doc = Document()
    c = content.contact

    name_p = doc.add_paragraph()
    name_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = name_p.add_run(c.full_name or "Untitled Resume")
    run.bold = True
    run.font.size = Pt(18)

    contact_line = " | ".join(x for x in [c.email, c.phone, c.location, c.linkedin, c.github, c.portfolio, c.website] if x)
    if contact_line:
        p = doc.add_paragraph(contact_line)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    def heading(text: str) -> None:
        h = doc.add_paragraph()
        r = h.add_run(text.upper())
        r.bold = True
        r.font.size = Pt(12)

    if content.summary:
        heading("Summary")
        doc.add_paragraph(content.summary)

    section_map = {
        "experience": "Experience",
        "education": "Education",
        "skills": "Skills",
        "projects": "Projects",
        "certifications": "Certifications",
    }
    for key in content.section_order:
        label = section_map.get(key)
        if not label:
            continue
        if key == "experience" and content.experience:
            heading(label)
            for exp in content.experience:
                p = doc.add_paragraph()
                p.add_run(f"{exp.title} — {exp.company}").bold = True
                end = "Present" if exp.current else exp.end_date
                doc.add_paragraph(f"{exp.location}  |  {exp.start_date} – {end}")
                for b in exp.bullets:
                    doc.add_paragraph(b, style="List Bullet")
        elif key == "education" and content.education:
            heading(label)
            for edu in content.education:
                p = doc.add_paragraph()
                p.add_run(f"{edu.degree} {edu.field} — {edu.school}").bold = True
                doc.add_paragraph(f"{edu.location}  |  {edu.start_date} – {edu.end_date}" + (f"  |  GPA {edu.gpa}" if edu.gpa else ""))
        elif key == "skills" and content.skills:
            heading(label)
            for sk in content.skills:
                doc.add_paragraph(f"{sk.label}: {', '.join(sk.items)}")
        elif key == "projects" and content.projects:
            heading(label)
            for proj in content.projects:
                p = doc.add_paragraph()
                p.add_run(proj.name).bold = True
                if proj.description:
                    doc.add_paragraph(proj.description)
                for b in proj.bullets:
                    doc.add_paragraph(b, style="List Bullet")
        elif key == "certifications" and content.certifications:
            heading(label)
            for cert in content.certifications:
                doc.add_paragraph(f"{cert.name} — {cert.issuer} ({cert.date})")

    for custom in content.custom:
        heading(custom.title)
        for item in custom.items:
            doc.add_paragraph(item, style="List Bullet")

    doc.save(str(out_path))
    return out_path


# ---------------------------------------------------------------------------
# PDF export (WeasyPrint — server-rendered HTML/CSS, flexbox-only for fidelity)
# ---------------------------------------------------------------------------

_ACCENT_COLORS = {
    "blue":   "#2563eb",
    "green":  "#059669",
    "orange": "#ea580c",
    "red":    "#dc2626",
}
_FONT_STACKS = {
    "serif": "'Georgia', 'Times New Roman', serif",
    "sans":  "'Helvetica Neue', Arial, sans-serif",
    "mono":  "'Courier New', monospace",
}


def _esc(text: str) -> str:
    return (text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _render_html(content: ResumeDocumentContent, settings: ResumeDocumentSettings) -> str:
    c = content.contact
    accent = _ACCENT_COLORS.get(settings.accent_color, _ACCENT_COLORS["blue"])
    header_font = _FONT_STACKS.get(settings.header_font, _FONT_STACKS["sans"])
    body_font = _FONT_STACKS.get(settings.body_font, _FONT_STACKS["sans"])
    base_pt = 8 + settings.font_size_level          # 9-13pt body
    header_pt = base_pt + 4
    gap = 4 + settings.spacing_level * 2             # px between sections
    compact_mul = 0.75 if settings.compact else 1.0
    page_size = "A4" if settings.page_size == "a4" else "Letter"
    heading_color = accent if settings.template in ("modern",) else "#111827"
    heading_border = f"2px solid {accent}" if settings.template == "modern" else \
        ("1px solid #9ca3af" if settings.template == "clean" else "1px solid #111827")

    contact_bits = [x for x in [c.email, c.phone, c.location, c.linkedin, c.github, c.portfolio, c.website] if x]
    contact_line = " &nbsp;|&nbsp; ".join(_esc(x) for x in contact_bits)

    def section_heading(label: str) -> str:
        return (
            f'<div style="font-family:{header_font};font-size:{base_pt+1}pt;font-weight:700;'
            f'color:{heading_color};text-transform:uppercase;letter-spacing:0.05em;'
            f'border-bottom:{heading_border};padding-bottom:2px;margin-top:{gap}px;'
            f'margin-bottom:{gap*compact_mul}px;">{_esc(label)}</div>'
        )

    parts: list[str] = []
    parts.append(
        f'<div style="text-align:center;margin-bottom:{gap}px;">'
        f'<div style="font-family:{header_font};font-size:{header_pt}pt;font-weight:700;color:{heading_color};">{_esc(c.full_name)}</div>'
        f'<div style="font-family:{body_font};font-size:{base_pt-1}pt;color:#4b5563;">{_esc(c.headline)}</div>'
        f'<div style="font-family:{body_font};font-size:{base_pt-2}pt;color:#4b5563;margin-top:2px;">{contact_line}</div>'
        f'</div>'
    )

    if content.summary:
        parts.append(section_heading("Summary"))
        parts.append(f'<div style="font-family:{body_font};font-size:{base_pt}pt;">{_esc(content.summary)}</div>')

    section_map = {
        "experience": "Experience", "education": "Education", "skills": "Skills",
        "projects": "Projects", "certifications": "Certifications",
    }
    for key in content.section_order:
        label = section_map.get(key)
        if not label:
            continue
        if key == "experience" and content.experience:
            parts.append(section_heading(label))
            for exp in content.experience:
                end = "Present" if exp.current else exp.end_date
                bullets = "".join(f'<li style="font-size:{base_pt}pt;">{_esc(b)}</li>' for b in exp.bullets)
                parts.append(
                    f'<div style="margin-bottom:{gap*compact_mul}px;font-family:{body_font};">'
                    f'<div style="display:flex;justify-content:space-between;font-weight:700;font-size:{base_pt}pt;">'
                    f'<span>{_esc(exp.title)} — {_esc(exp.company)}</span><span>{_esc(exp.start_date)} – {_esc(end)}</span></div>'
                    f'<div style="font-size:{base_pt-1}pt;color:#6b7280;">{_esc(exp.location)}</div>'
                    f'<ul style="margin:2px 0 0 16px;padding:0;">{bullets}</ul></div>'
                )
        elif key == "education" and content.education:
            parts.append(section_heading(label))
            for edu in content.education:
                extra = f"  |  GPA {_esc(edu.gpa)}" if edu.gpa else ""
                parts.append(
                    f'<div style="margin-bottom:{gap*compact_mul}px;font-family:{body_font};font-size:{base_pt}pt;">'
                    f'<div style="display:flex;justify-content:space-between;font-weight:700;">'
                    f'<span>{_esc(edu.degree)} {_esc(edu.field)} — {_esc(edu.school)}</span>'
                    f'<span>{_esc(edu.start_date)} – {_esc(edu.end_date)}</span></div>'
                    f'<div style="font-size:{base_pt-1}pt;color:#6b7280;">{_esc(edu.location)}{extra}</div></div>'
                )
        elif key == "skills" and content.skills:
            parts.append(section_heading(label))
            for sk in content.skills:
                parts.append(
                    f'<div style="font-family:{body_font};font-size:{base_pt}pt;margin-bottom:2px;">'
                    f'<b>{_esc(sk.label)}:</b> {_esc(", ".join(sk.items))}</div>'
                )
        elif key == "projects" and content.projects:
            parts.append(section_heading(label))
            for proj in content.projects:
                bullets = "".join(f'<li style="font-size:{base_pt}pt;">{_esc(b)}</li>' for b in proj.bullets)
                parts.append(
                    f'<div style="margin-bottom:{gap*compact_mul}px;font-family:{body_font};font-size:{base_pt}pt;">'
                    f'<b>{_esc(proj.name)}</b> {_esc(proj.description)}'
                    f'<ul style="margin:2px 0 0 16px;padding:0;">{bullets}</ul></div>'
                )
        elif key == "certifications" and content.certifications:
            parts.append(section_heading(label))
            for cert in content.certifications:
                parts.append(
                    f'<div style="font-family:{body_font};font-size:{base_pt}pt;">'
                    f'{_esc(cert.name)} — {_esc(cert.issuer)} ({_esc(cert.date)})</div>'
                )

    for custom in content.custom:
        parts.append(section_heading(custom.title))
        items = "".join(f'<li style="font-size:{base_pt}pt;">{_esc(i)}</li>' for i in custom.items)
        parts.append(f'<ul style="margin:2px 0 0 16px;padding:0;font-family:{body_font};">{items}</ul>')

    body_html = "\n".join(parts)
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><style>
@page {{ size: {page_size}; margin: {settings.margin_top}mm {settings.margin_right}mm {settings.margin_bottom}mm {settings.margin_left}mm; }}
body {{ margin: 0; color: #111827; }}
ul {{ list-style: disc; }}
</style></head><body>{body_html}</body></html>"""


def generate_pdf(content: ResumeDocumentContent, settings: ResumeDocumentSettings, out_path: Path) -> Path:
    from weasyprint import HTML

    html = _render_html(content, settings)
    HTML(string=html).write_pdf(str(out_path))
    return out_path
