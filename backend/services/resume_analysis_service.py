"""
Resume Analysis Service — scores sections and extracts structured data using Claude via OpusMax.
Uses the same OpusMax /tools/understand_image API pattern as linkedin_scorer_step1.
"""
from __future__ import annotations

import base64
import json
import os
import re
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from ..config import get_settings

OPUSMAX_BASE_URL                  = "https://api.opusmax.pro"
OPUSMAX_UNDERSTAND_IMAGE_URL      = f"{OPUSMAX_BASE_URL}/tools/understand_image"
DEFAULT_MODEL                    = os.getenv("CLAUDE_MODEL", "claude-opus-4-7")
CLAUDE_TIMEOUT_SECONDS            = float(os.getenv("CLAUDE_TIMEOUT_SECONDS", "45"))
_OPUSMAX_PREFIX                  = "sk-ant-opm"


def _resolve_opusmax_key() -> str:
    cfg = get_settings()
    return (
        (cfg.OPUSMAX_API_KEY  or "").strip()
        or (cfg.ANTHROPIC_API_KEY or "").strip()
        or os.getenv("CLAUDE_API_KEY", "").strip()
        or (cfg.OPENAI_API_KEY or "").strip()
    )


def _make_anthropic_client(api_key: str):
    from anthropic import Anthropic
    if api_key.startswith(_OPUSMAX_PREFIX):
        return Anthropic(api_key=api_key, base_url=OPUSMAX_BASE_URL)
    return Anthropic(api_key=api_key)


# ─── OpusMax understand_image ──────────────────────────────────────────────────

def _call_opusmax_understand_image(media_bytes: bytes, media_type: str, prompt: str) -> str:
    api_key = _resolve_opusmax_key()
    if not api_key:
        raise RuntimeError("OPUSMAX_API_KEY not configured")

    data_url = f"data:{media_type};base64,{base64.b64encode(media_bytes).decode('utf-8')}"
    payload = json.dumps({"prompt": prompt, "image_url": data_url}).encode("utf-8")
    request = Request(
        OPUSMAX_UNDERSTAND_IMAGE_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "x-api-key": api_key,
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=CLAUDE_TIMEOUT_SECONDS) as resp:
            raw = resp.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpusMax understand_image HTTP {exc.code}: {detail[:500]}") from exc
    except URLError as exc:
        raise RuntimeError(f"OpusMax understand_image network error: {exc}") from exc

    return _extract_text_from_opusmax_response(raw)


def _extract_text_from_opusmax_response(raw_body: str) -> str:
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        return raw_body.strip()

    if isinstance(payload, str):
        return payload.strip()

    if isinstance(payload, dict):
        base_resp = payload.get("base_resp")
        if isinstance(base_resp, dict):
            code = base_resp.get("status_code")
            msg  = base_resp.get("status_msg")
            content = payload.get("content")
            if code not in (0, 200, "0", "200") and not content:
                raise RuntimeError(f"OpusMax understand_image status_code={code} status_msg={msg}")

    for candidate in [
        payload.get("output"),
        payload.get("result"),
        payload.get("text"),
        payload.get("response"),
        payload.get("content"),
        payload.get("data"),
    ]:
        extracted = _coerce_text_candidate(candidate)
        if extracted:
            return extracted
    return raw_body.strip()


def _coerce_text_candidate(candidate: Any) -> str:
    if isinstance(candidate, str):
        return candidate.strip()
    if isinstance(candidate, dict):
        for key in ("text", "output", "result", "response", "content"):
            value = candidate.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    if isinstance(candidate, list):
        chunks = []
        for item in candidate:
            text = _coerce_text_candidate(item)
            if text:
                chunks.append(text)
        if chunks:
            return "\n".join(chunks).strip()
    return ""


def _extract_json(raw: str) -> dict[str, Any]:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end   = cleaned.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        return json.loads(cleaned[start:end + 1])


def _extract_bool(raw: str, field: str) -> bool | None:
    m = re.search(rf'"{re.escape(field)}"\s*:\s*(true|false|null)', raw, flags=re.IGNORECASE)
    if not m:
        return None
    v = m.group(1).lower()
    if v == "true":  return True
    if v == "false": return False
    return None


def _extract_str_array(raw: str, field: str) -> list[str]:
    m = re.search(rf'"{re.escape(field)}"\s*:\s*\[(.*?)\]', raw, flags=re.DOTALL)
    if not m:
        return []
    body = m.group(1)
    return [item for item in re.findall(r'"([^"\n]+)"', body) if item.strip()]


# ─── Image prompts (from linkedin_scorer_step1) ───────────────────────────────

PROFILE_PROMPT = """
You are reviewing a LinkedIn profile picture. Return JSON only.
Use only visible evidence from the image. Do not infer unseen facts.
If uncertain, use null for the observation.
Do not wrap the response in markdown fences.
Return concise evidence only.
Return this exact shape:
{
  "uploaded": true,
  "observations": {
    "face_visible": true,
    "professional_attire": true,
    "watermark_or_ai_icon_visible": false,
    "lighting_adequate": true,
    "background_clean": true,
    "framing_professional": true,
    "image_quality_issue_visible": false
  },
  "evidence": []
}
""".strip()

COVER_PROMPT = """
You are reviewing a LinkedIn cover or banner image. Return JSON only.
Use only visible evidence from the image and the provided target role context if any.
Do not invent brand messaging, text, or alignment that is not visible.
Do not wrap the response in markdown fences.
If uncertain, use null for the observation.
Return this exact shape:
{
  "uploaded": true,
  "observations": {
    "role_aligned_visual": true,
    "professional_branding_present": true,
    "text_readability_issue": false,
    "banner_has_small_text": false,
    "broken_url_or_typo_visible": false,
    "email_on_banner_visible": false,
    "clutter_or_distraction_visible": false
  },
  "evidence": []
}
""".strip()


# ─── Image analysis ────────────────────────────────────────────────────────────

def analyze_profile_picture(media_bytes: bytes, media_type: str) -> dict[str, Any]:
    """Analyze profile picture via OpusMax /tools/understand_image."""
    raw = _call_opusmax_understand_image(media_bytes, media_type, PROFILE_PROMPT)
    data = _safe_json_parse_profile(raw)
    obs  = data.get("observations", {})
    return {
        "uploaded":    data.get("uploaded", True),
        "warnings":   data.get("warnings", []),
        "score":      _calc_profile_score(obs),
        "observations": {
            "face_visible":                _safe_bool(obs.get("face_visible")),
            "professional_attire":        _safe_bool(obs.get("professional_attire")),
            "watermark_or_ai_icon_visible": _safe_bool(obs.get("watermark_or_ai_icon_visible")),
            "lighting_adequate":          _safe_bool(obs.get("lighting_adequate")),
            "background_clean":            _safe_bool(obs.get("background_clean")),
            "framing_professional":        _safe_bool(obs.get("framing_professional")),
            "image_quality_issue_visible": _safe_bool(obs.get("image_quality_issue_visible")),
        },
        "evidence": _safe_str_array(data.get("evidence", [])),
        "suggestions": _build_profile_suggestions(obs),
    }


def analyze_cover_picture(media_bytes: bytes, media_type: str) -> dict[str, Any]:
    """Analyze cover/banner picture via OpusMax /tools/understand_image."""
    raw = _call_opusmax_understand_image(media_bytes, media_type, COVER_PROMPT)
    data = _safe_json_parse_cover(raw)
    obs  = data.get("observations", {})
    return {
        "uploaded":    data.get("uploaded", True),
        "warnings":   data.get("warnings", []),
        "score":      _calc_cover_score(obs),
        "observations": {
            "role_aligned_visual":           _safe_bool(obs.get("role_aligned_visual")),
            "professional_branding_present": _safe_bool(obs.get("professional_branding_present")),
            "text_readability_issue":        _safe_bool(obs.get("text_readability_issue")),
            "banner_has_small_text":          _safe_bool(obs.get("banner_has_small_text")),
            "broken_url_or_typo_visible":    _safe_bool(obs.get("broken_url_or_typo_visible")),
            "email_on_banner_visible":       _safe_bool(obs.get("email_on_banner_visible")),
            "clutter_or_distraction_visible": _safe_bool(obs.get("clutter_or_distraction_visible")),
        },
        "evidence": _safe_str_array(data.get("evidence", [])),
        "suggestions": _build_cover_suggestions(obs),
    }


def _safe_bool(v: Any) -> bool | None:
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        return v.lower() == "true"
    return None


def _safe_str_array(v: Any) -> list[str]:
    if isinstance(v, list):
        return [str(x) for x in v]
    return []


def _safe_json_parse_profile(raw: str) -> dict[str, Any]:
    try:
        return _extract_json(raw)
    except Exception:
        obs = {
            "face_visible":                _extract_bool(raw, "face_visible"),
            "professional_attire":         _extract_bool(raw, "professional_attire"),
            "watermark_or_ai_icon_visible": _extract_bool(raw, "watermark_or_ai_icon_visible"),
            "lighting_adequate":          _extract_bool(raw, "lighting_adequate"),
            "background_clean":            _extract_bool(raw, "background_clean"),
            "framing_professional":        _extract_bool(raw, "framing_professional"),
            "image_quality_issue_visible": _extract_bool(raw, "image_quality_issue_visible"),
        }
        evidence = _extract_str_array(raw, "evidence")
        return {"uploaded": True, "observations": obs, "evidence": evidence, "warnings": []}


def _safe_json_parse_cover(raw: str) -> dict[str, Any]:
    try:
        return _extract_json(raw)
    except Exception:
        obs = {
            "role_aligned_visual":            _extract_bool(raw, "role_aligned_visual"),
            "professional_branding_present":  _extract_bool(raw, "professional_branding_present"),
            "text_readability_issue":         _extract_bool(raw, "text_readability_issue"),
            "banner_has_small_text":           _extract_bool(raw, "banner_has_small_text"),
            "broken_url_or_typo_visible":     _extract_bool(raw, "broken_url_or_typo_visible"),
            "email_on_banner_visible":        _extract_bool(raw, "email_on_banner_visible"),
            "clutter_or_distraction_visible": _extract_bool(raw, "clutter_or_distraction_visible"),
        }
        evidence = _extract_str_array(raw, "evidence")
        return {"uploaded": True, "observations": obs, "evidence": evidence, "warnings": []}


def _calc_profile_score(obs: dict) -> float:
    """Score out of 100 for profile picture observations."""
    pts = 0.0
    caps = {"ai_watermark_cap": 2.0}
    for field, weight in [
        ("face_visible",                0.5),
        ("professional_attire",          0.5),
        ("lighting_adequate",           0.5),
        ("background_clean",            0.5),
        ("framing_professional",        0.5),
    ]:
        v = _safe_bool(obs.get(field))
        if v is True:
            pts += weight
    watermark = _safe_bool(obs.get("watermark_or_ai_icon_visible"))
    if watermark is True:
        pts = min(pts, caps["ai_watermark_cap"])
    quality = _safe_bool(obs.get("image_quality_issue_visible"))
    if quality is True:
        pts = min(pts, 2.0)
    # Scale 0-2.5 to 0-100
    return round(min(pts / 2.5 * 100, 100), 1)


def _calc_cover_score(obs: dict) -> float:
    """Score out of 100 for cover/banner observations."""
    pts = 0.0
    caps = {"typo_cap": 1.5}
    for field, weight in [
        ("role_aligned_visual",           0.75),
        ("professional_branding_present", 0.50),
        ("text_readability_issue",       0.50),   # False = good
        ("banner_has_small_text",         0.25),  # False = good
        ("broken_url_or_typo_visible",    0.25),  # False = good
        ("email_on_banner_visible",       0.25),  # False = good
        ("clutter_or_distraction_visible",0.25), # False = good
    ]:
        v = _safe_bool(obs.get(field))
        if v is True:
            pts += weight
        elif v is False and field in ("text_readability_issue", "banner_has_small_text",
                                      "broken_url_or_typo_visible", "email_on_banner_visible",
                                      "clutter_or_distraction_visible"):
            pts += weight
    # Cap if issues present
    for field in ("broken_url_or_typo_visible", "text_readability_issue", "banner_has_small_text"):
        if _safe_bool(obs.get(field)) is True:
            pts = min(pts, caps["typo_cap"])
    return round(min(pts / 2.5 * 100, 100), 1)


def _build_profile_suggestions(obs: dict) -> list[str]:
    tips = []
    if _safe_bool(obs.get("face_visible")) is not True:
        tips.append("Ensure your face is clearly visible — a visible face increases profile engagement significantly.")
    if _safe_bool(obs.get("professional_attire")) is not True:
        tips.append("Wear professional attire (business casual or formal) in your profile photo.")
    if _safe_bool(obs.get("lighting_adequate")) is not True:
        tips.append("Improve lighting — natural light or soft studio lighting works best.")
    if _safe_bool(obs.get("background_clean")) is not True:
        tips.append("Use a clean, simple background to keep focus on you.")
    if _safe_bool(obs.get("framing_professional")) is not True:
        tips.append("Frame the shot from chest or shoulders up — avoid too-wide or too-tight crops.")
    if _safe_bool(obs.get("watermark_or_ai_icon_visible")) is True:
        tips.append("Remove any AI-generated badge or watermark from your profile photo.")
    if _safe_bool(obs.get("image_quality_issue_visible")) is True:
        tips.append("Improve image quality — avoid pixelated or blurry photos.")
    return tips[:4]


def _build_cover_suggestions(obs: dict) -> list[str]:
    tips = []
    if _safe_bool(obs.get("role_aligned_visual")) is not True:
        tips.append("Align your banner image with your target industry or role for stronger branding.")
    if _safe_bool(obs.get("professional_branding_present")) is not True:
        tips.append("Add professional branding elements (logo, color scheme) to your cover image.")
    if _safe_bool(obs.get("text_readability_issue")) is True:
        tips.append("Fix text readability issues in your banner — avoid small or hard-to-read text.")
    if _safe_bool(obs.get("banner_has_small_text")) is True:
        tips.append("Remove small text from your banner image.")
    if _safe_bool(obs.get("broken_url_or_typo_visible")) is True:
        tips.append("Check your banner for typos or broken links and fix them.")
    if _safe_bool(obs.get("email_on_banner_visible")) is True:
        tips.append("Remove personal email from the banner to avoid spam.")
    if _safe_bool(obs.get("clutter_or_distraction_visible")) is True:
        tips.append("Reduce clutter in your cover image — keep it clean and focused.")
    return tips[:4]


# ─── Resume PDF extraction ─────────────────────────────────────────────────────

def _extract_pdf_text(file_path: Path) -> str:
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


# ─── Resume text analysis ──────────────────────────────────────────────────────

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


def analyze_resume(resume_text: str, job_description: str = "") -> dict[str, Any]:
    """Analyze resume text — uses Claude via OpusMax messages API."""
    key = _resolve_opusmax_key()
    if not key:
        raise RuntimeError("OPUSMAX_API_KEY / ANTHROPIC_API_KEY not configured")

    client = _make_anthropic_client(key)

    response = client.messages.create(
        model="claude-sonnet-4-7-20261107",
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

    raw = next((b.text for b in response.content if hasattr(b, "text")), "{}")
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


# ─── JSON helpers ─────────────────────────────────────────────────────────────

def _safe_json_parse(raw: str) -> dict[str, Any]:
    cleaned = re.sub(r"```json\s*", "", raw, flags=re.IGNORECASE)
    cleaned = re.sub(r"```\s*", "", cleaned)
    try:
        return json.loads(cleaned.strip())
    except Exception:
        try:
            return json.loads(raw.strip())
        except Exception:
            return {}
