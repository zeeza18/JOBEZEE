"""
Resume Analysis Service — scores sections and extracts structured data using Claude via OpusMax.
"""
from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

from ..config import get_settings

OPUSMAX_BASE_URL = "https://api.opusmax.pro"
_OPUSMAX_PREFIX  = "sk-ant-opm"


def _resolve_opusmax_key() -> str:
    cfg = get_settings()
    return (
        (cfg.OPENAI_API_KEY or "").strip()   # alias OPUSMAX → OPENAI_API_KEY in .env
        or os.getenv("OPENAI_API_KEY", "").strip()
        or os.getenv("OPUSMAX_API_KEY", "").strip()
        or os.getenv("ANTHROPIC_API_KEY", "").strip()
        or os.getenv("CLAUDE_API_KEY", "").strip()
    )


def _make_anthropic_client(api_key: str):
    from anthropic import Anthropic
    if api_key.startswith(_OPUSMAX_PREFIX):
        return Anthropic(api_key=api_key, base_url=OPUSMAX_BASE_URL)
    return Anthropic(api_key=api_key)


def _extract_pdf_text(file_path: Path) -> str:
    """Extract plain text from a PDF or DOCX resume."""
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                pages = [p.extract_text() or "" for p in pdf.pages]
            return "\n\n".join(p for p in pages if p.strip())
        except ImportError:
            pass
        try:
            import PyPDF2
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                return "\n\n".join(
                    page.extract_text() or "" for page in reader.pages
                )
        except Exception as exc:
            raise RuntimeError(f"PDF extraction failed: {exc}")
    elif suffix in (".docx", ".doc"):
        try:
            from docx import Document
            doc = Document(file_path)
            return "\n".join(para.text for para in doc.paragraphs if para.text.strip())
        except ImportError:
            raise RuntimeError("python-docx not installed: pip install python-docx")
    elif suffix == ".txt":
        return file_path.read_text(encoding="utf-8", errors="ignore")
    raise RuntimeError(f"Unsupported resume format: {suffix}")


def _section_prompt(resume_text: str, job_description: str) -> str:
    jd_block = f"\n\nOPTIONAL JOB DESCRIPTION:\n{job_description}\n" if job_description else ""
    return f"""You are an expert resume analyst. Given the resume below, extract and score each resume section.

For each section below, return:
- id: a slug (e.g. "header", "experience")
- label: human-readable name (e.g. "Header / Contact", "Work Experience")
- content: the raw extracted text of that section (keep it concise, max 800 chars)
- score: an integer 0-100 reflecting quality/completeness of that section
- suggestions: array of 1-4 concrete improvement tips

Sections to evaluate:
1. header       — name, email, phone, LinkedIn, GitHub, headline
2. summary      — professional summary / about section
3. experience   — work history / job experience
4. projects    — personal or work projects
5. skills       — technical skills, languages, tools
6. education    — degrees, certifications, bootcamps
7. certifications — badges, licenses, formal certifications

Also return:
- overall_score: integer 0-100
- overall_verdict: one-liner like "Good match" or "Needs significant work"
- jd_fit_score: integer 0-100 (how well this resume fits the JD, 0 if no JD provided)

Resume:{jd_block}

---
RESUME TEXT:
{resume_text}
---
"""


def _image_prompt() -> str:
    return """You are an expert LinkedIn profile photo analyst. Evaluate this profile photo for professional LinkedIn/Resume use.

Return a JSON object with:
- score: integer 0-100 overall LinkedIn readiness score
- verdict: one-liner (e.g. "LinkedIn-ready" or "Consider retaking")
- lighting: "good" | "poor" | "mixed"
- background: "clean" | "busy" | "blurry" | "professional"
- framing: "good" | "too_close" | "too_far" | "awkward"
- face_visibility: "clear" | "partial" | "obscured"
- improvements: array of 1-4 specific suggestions
"""


def analyze_resume(resume_text: str, job_description: str = "") -> dict[str, Any]:
    """
    Main analysis entry point — uses Claude via OpusMax.
    Returns { overall_score, overall_verdict, jd_fit_score, sections: [...] }
    """
    key = _resolve_opusmax_key()
    if not key:
        raise RuntimeError("OPUSMAX_API_KEY / ANTHROPIC_API_KEY not configured")

    client = _make_anthropic_client(key)

    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=4096,
        temperature=0.3,
        system=(
            "You are a strict resume expert. Always respond with valid JSON only — "
            "no markdown fences, no commentary. Include all fields specified: "
            "overall_score (int 0-100), overall_verdict (string), "
            "jd_fit_score (int 0-100, or 0 if no JD), "
            "sections (array of {id, label, content, score, suggestions})."
        ),
        messages=[
            {"role": "user", "content": _section_prompt(resume_text, job_description)},
        ],
    )

    raw = response.content[0].text if response.content else "{}"
    data = _safe_json_parse(raw)

    sections = []
    for s in data.get("sections", []):
        sections.append({
            "id":          s.get("id", "unknown"),
            "label":       s.get("label", "Unknown"),
            "content":     (s.get("content") or "")[:1200],
            "score":       max(0, min(100, int(s.get("score", 0)))),
            "suggestions": [str(x) for x in (s.get("suggestions") or [])][:4],
        })

    sections.sort(key=lambda s: s["score"])

    return {
        "overall_score":    max(0, min(100, int(data.get("overall_score", 0)))),
        "overall_verdict": data.get("overall_verdict", "Analyzed"),
        "jd_fit_score":    max(0, min(100, int(data.get("jd_fit_score", 0) or 0))),
        "sections":         sections,
    }


def analyze_image(image_b64: str) -> dict[str, Any]:
    """Analyze a profile photo for LinkedIn/resume readiness using Claude via OpusMax."""
    key = _resolve_opusmax_key()
    if not key:
        raise RuntimeError("OPUSMAX_API_KEY / ANTHROPIC_API_KEY not configured")

    client = _make_anthropic_client(key)

    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1500,
        temperature=0.3,
        system=(
            "You are a LinkedIn profile photo expert. Always respond with valid JSON only. "
            "Include all fields: score (int 0-100), verdict (string), "
            "lighting, background, framing, face_visibility (strings), "
            "improvements (array of strings)."
        ),
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": _image_prompt(),
                    },
                ],
            },
        ],
    )

    raw = response.content[0].text if response.content else "{}"
    data = _safe_json_parse(raw)
    return {
        "score":           max(0, min(100, int(data.get("score", 0)))),
        "verdict":         data.get("verdict", "Analyzed"),
        "lighting":        data.get("lighting", "unknown"),
        "background":      data.get("background", "unknown"),
        "framing":         data.get("framing", "unknown"),
        "face_visibility": data.get("face_visibility", "unknown"),
        "improvements":    [str(x) for x in (data.get("improvements") or [])][:4],
    }


def _safe_json_parse(raw: str) -> dict[str, Any]:
    """Parse JSON, stripping markdown fences if present."""
    cleaned = re.sub(r"```json\s*", "", raw, flags=re.IGNORECASE)
    cleaned = re.sub(r"```\s*", "", cleaned)
    import json as _json
    try:
        return _json.loads(cleaned.strip())
    except Exception:
        import json
        try:
            return json.loads(raw.strip())
        except Exception:
            return {}
