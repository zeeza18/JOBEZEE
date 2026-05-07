"""
Resume Analysis Service — scores sections and extracts structured data using Claude via OpusMax.
Uses the same OpusMax /tools/understand_image API pattern as linkedin_scorer_step1.
"""
from __future__ import annotations

import base64
import json
import os
import re
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import instructor
import threading
from pydantic import BaseModel, Field

from ..config import get_settings

OPUSMAX_BASE_URL                  = "https://api.opusmax.pro"
OPUSMAX_UNDERSTAND_IMAGE_URL      = f"{OPUSMAX_BASE_URL}/tools/understand_image"
DEFAULT_MODEL                    = os.getenv("CLAUDE_MODEL", "claude-opus-4-7")
CLAUDE_TIMEOUT_SECONDS            = float(os.getenv("CLAUDE_TIMEOUT_SECONDS", "45"))
_OPUSMAX_PREFIX                  = "sk-ant-opm"


# ─── Token bucket — OpusMax hard limit is 1 req/sec ──────────────────────────
_vision_lock     = threading.Lock()
_vision_last_t   = 0.0
_VISION_MIN_GAP  = 1.05   # seconds between vision API calls (slight buffer over 1.0)
_VISION_MAX_WAIT = 120    # give up after 2 min of queuing

def _vision_acquire() -> None:
    """Block until we can safely make a vision API call within rate limit."""
    global _vision_last_t
    deadline = time.time() + _VISION_MAX_WAIT
    while True:
        with _vision_lock:
            now = time.time()
            gap = now - _vision_last_t
            if gap >= _VISION_MIN_GAP:
                _vision_last_t = now
                return
            wait = _VISION_MIN_GAP - gap
        if time.time() + wait > deadline:
            raise RuntimeError("Vision API queue full — too many concurrent requests. Please retry in a moment.")
        time.sleep(wait)


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


# ─── Pydantic models for structured vision output ─────────────────────────────

class ProfileObservations(BaseModel):
    face_visible: bool = Field(description="True if a human face is present and facing the camera. False ONLY if no face is detectable at all.")
    professional_attire: bool = Field(description="True if person wears blazer, dress shirt, suit, or business-casual top. False ONLY if clearly casual (plain t-shirt, hoodie, shirtless). Default true if unsure.")
    watermark_or_ai_icon_visible: bool = Field(description="True if any overlay badge, sparkle, star, logo, or watermark is placed ON the image. False if image is clean.")
    lighting_adequate: bool = Field(description="True if face is clearly lit and features are distinguishable. False ONLY if face is silhouetted, severely underlit, or blown out. Default true.")
    background_clean: bool = Field(description="True if background is plain, blurred, solid color, or minimal. False ONLY if visibly cluttered with competing elements. Default true for any uniform or blurred background.")
    framing_professional: bool = Field(description="True if subject fills the frame as a head/shoulder or chest-up portrait. False ONLY if person is tiny in frame or severely cropped. Default true for standard portrait composition.")
    image_quality_issue_visible: bool = Field(description="True if image is visibly pixelated, blurry, or heavily compressed. False if clear and sharp. Default false.")
    evidence: list[str] = Field(default_factory=list, description="1-3 short factual observations about what you see. Empty list if nothing notable.")


class CoverObservations(BaseModel):
    role_aligned_visual: bool = Field(description="True if banner has imagery suggesting a professional context (tech, design, finance, abstract). False if completely generic stock photo of nature/city with zero professional connection, OR LinkedIn default.")
    professional_branding_present: bool = Field(description="True if banner has ANY deliberate personalization: name, title, logo, custom color scheme, or branded layout. False ONLY if plain stock photo with zero custom elements.")
    text_readability_issue: bool = Field(description="True if text has poor contrast, is too small to read, or overlaps badly. False if text is readable OR no text present. Default false.")
    banner_has_small_text: bool = Field(description="True if text is so small it would be unreadable on mobile. False if text is large enough or no text present. Default false.")
    broken_url_or_typo_visible: bool = Field(description="True if you can read a malformed email (e.g. @com instead of @gmail.com, missing TLD), broken URL, or obvious spelling mistake. Default false — only true if clearly visible.")
    email_on_banner_visible: bool = Field(description="True if any email address (even broken format) is visibly printed on the banner. Default false.")
    clutter_or_distraction_visible: bool = Field(description="True if banner is visually overwhelming with too many competing elements or clashing colors. False if organized. Default false.")
    evidence: list[str] = Field(default_factory=list, description="1-3 factual observations. If email visible, quote the exact text. If URL broken, quote it.")


# ─── OpusMax understand_image ──────────────────────────────────────────────────

_PROFILE_TOOL = {
    "name": "score_profile_photo",
    "description": "Score a LinkedIn profile photo by directly observing the image.",
    "input_schema": {
        "type": "object",
        "properties": {
            "face_visible": {
                "type": "boolean",
                "description": "true if a human face is present and facing the camera (even partially). false ONLY if no face is detectable at all."
            },
            "professional_attire": {
                "type": "boolean",
                "description": "true if person wears a blazer, dress shirt, suit, or formal/business-casual top. false ONLY if clearly casual (plain t-shirt, hoodie, shirtless). Default true if clothing is visible but ambiguous."
            },
            "watermark_or_ai_icon_visible": {
                "type": "boolean",
                "description": "true if you see any overlay badge, sparkle, star, logo, or watermark placed ON the image. false if image is clean."
            },
            "lighting_adequate": {
                "type": "boolean",
                "description": "true if the face is clearly lit and features are distinguishable. false ONLY if the face is silhouetted, severely underlit, or blown out so features are lost. Default true."
            },
            "background_clean": {
                "type": "boolean",
                "description": "true if background is plain, blurred, solid color, or minimal. false ONLY if background is visibly cluttered with competing elements. Default true for any uniform or blurred background."
            },
            "framing_professional": {
                "type": "boolean",
                "description": "true if subject fills the frame as a head/shoulder or chest-up portrait. false ONLY if person is tiny in frame, severely cropped at the face, or awkwardly angled. Default true for standard portrait composition."
            },
            "image_quality_issue_visible": {
                "type": "boolean",
                "description": "true if image is visibly pixelated, heavily compressed, blurry, or distorted. false if image appears clear. Default false."
            },
            "evidence": {
                "type": "array",
                "items": {"type": "string"},
                "description": "1-3 short factual observations about what you see. Empty array if nothing notable."
            }
        },
        "required": ["face_visible", "professional_attire", "watermark_or_ai_icon_visible",
                     "lighting_adequate", "background_clean", "framing_professional",
                     "image_quality_issue_visible", "evidence"]
    }
}

_COVER_TOOL = {
    "name": "score_cover_banner",
    "description": "Score a LinkedIn cover/banner image by directly observing the image.",
    "input_schema": {
        "type": "object",
        "properties": {
            "role_aligned_visual": {
                "type": "boolean",
                "description": "true if banner has imagery, colors, or visuals suggesting a professional context (tech, design, finance, abstract professional). false if it is a completely generic stock photo of nature/city with zero professional context, OR the LinkedIn default blue gradient."
            },
            "professional_branding_present": {
                "type": "boolean",
                "description": "true if banner has ANY deliberate personalization: custom color scheme, name, title, logo, or branded layout. false ONLY if it is a plain stock photo or default with zero custom elements."
            },
            "text_readability_issue": {
                "type": "boolean",
                "description": "true if text on the banner has poor contrast, is too small to comfortably read, or overlaps badly with the background. false if text is readable OR no text present. Default false."
            },
            "banner_has_small_text": {
                "type": "boolean",
                "description": "true if banner contains text so small it would be unreadable on a mobile screen. false if text is large enough to read or no text present. Default false."
            },
            "broken_url_or_typo_visible": {
                "type": "boolean",
                "description": "true if you can read a broken/malformed URL (missing http, incomplete domain), a malformed email (e.g. @com instead of @gmail.com, missing TLD), or an obvious spelling mistake. false if URLs and email addresses look correctly formatted or no text present. Default false — only mark true if you can clearly read a problem."
            },
            "email_on_banner_visible": {
                "type": "boolean",
                "description": "true if an email address (any format, even broken) is visibly printed anywhere on the banner. false if no email is present. Default false."
            },
            "clutter_or_distraction_visible": {
                "type": "boolean",
                "description": "true if banner is visually overwhelming with too many competing elements, clashing colors, or chaotic layout. false if banner looks organized. Default false."
            },
            "evidence": {
                "type": "array",
                "items": {"type": "string"},
                "description": "1-3 short factual observations about what you see. If email is visible, write the exact email text. If URL is broken, quote it."
            }
        },
        "required": ["role_aligned_visual", "professional_branding_present", "text_readability_issue",
                     "banner_has_small_text", "broken_url_or_typo_visible", "email_on_banner_visible",
                     "clutter_or_distraction_visible", "evidence"]
    }
}


def _call_vision_structured(media_bytes: bytes, media_type: str, prompt: str, response_model):
    """Use instructor to get structured output from a vision call.
    Token-bucket ensures ≤1 req/sec to OpusMax. Retries up to 3× on rate-limit errors.
    """
    key = _resolve_opusmax_key()
    if not key:
        raise RuntimeError("OPUSMAX_API_KEY / ANTHROPIC_API_KEY not configured")

    encoded = base64.b64encode(media_bytes).decode("utf-8")
    image_block = {
        "type": "image",
        "source": {"type": "base64", "media_type": media_type, "data": encoded},
    }

    last_exc: Exception | None = None
    for attempt in range(3):
        _vision_acquire()  # wait for rate-limit slot
        try:
            base_client = _make_anthropic_client(key)
            client = instructor.from_anthropic(base_client, mode=instructor.Mode.ANTHROPIC_JSON)
            result = client.messages.create(
                model=DEFAULT_MODEL,
                max_tokens=800,
                response_model=response_model,
                messages=[{"role": "user", "content": [image_block, {"type": "text", "text": prompt}]}],
            )
            return result.model_dump()
        except Exception as exc:
            last_exc = exc
            err = str(exc).lower()
            if "429" in err or "rate" in err or "limit" in err:
                backoff = 2 ** attempt
                time.sleep(backoff)
                continue
            raise  # non-rate-limit errors bubble up immediately
    raise RuntimeError(f"Vision API rate limited after 3 attempts: {last_exc}")


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
You are scoring a LinkedIn profile picture. Look carefully at the image and answer each field.

FIELD-BY-FIELD RULES — be precise, do not guess, do not default to false:

face_visible:
  true  = a human face is present and looking toward the camera (even partially)
  false = NO face visible at all (e.g. back of head, silhouette, object only)

professional_attire:
  true  = person wears business casual or formal clothing (blazer, dress shirt, suit, blouse)
  false = clearly casual only (plain t-shirt, hoodie, sportswear, shirtless)
  Default true if clothing is visible but you are unsure.

watermark_or_ai_icon_visible:
  true  = you can see a logo, badge, sparkle, star, or watermark overlaid ON the image
  false = no overlay marks visible
  Note: a small decorative icon in the corner counts as true.

lighting_adequate:
  true  = face is clearly lit; no harsh shadows across face; features distinguishable
  false = face is visibly underlit, silhouetted, or blown out so features are lost
  Default true unless you clearly see a lighting problem.

background_clean:
  true  = background is plain, blurred, or simple (solid color, soft bokeh, minimal)
  false = background is visibly cluttered, distracting, or has multiple competing elements
  Default true if background is any uniform or blurred style.

framing_professional:
  true  = subject fills most of the frame; head and upper body are the focus; not too far away
  false = person is tiny in frame, heavily cropped at face, or tilted awkwardly
  Default true for standard portrait shots.

image_quality_issue_visible:
  true  = image is visibly pixelated, heavily compressed, blurry, or distorted
  false = image is clear and sharp
  Default false unless you can clearly see quality degradation.

Return ONLY this JSON (no markdown fences):
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
You are scoring a LinkedIn cover/banner image. Look carefully and answer each field honestly.

FIELD-BY-FIELD RULES — only mark something true if you can clearly see it:

role_aligned_visual:
  true  = banner contains imagery, colors, or visual elements that suggest a professional context
           (technology, design, finance, code, abstract professional visuals, etc.)
  false = banner is a completely generic default, personal holiday photo, or totally unrelated image
  Default true for any non-default banner with professional appearance.

professional_branding_present:
  true  = banner has deliberate design: custom color scheme, logo, name, title, or branded layout
  false = banner is a stock photo or generic gradient with zero personalization
  Default true if there is any custom text or design element visible.

text_readability_issue:
  true  = text on the banner is visibly hard to read (low contrast, too small to read, overlaps badly)
  false = text (if any) is clearly readable, OR there is no text at all
  Default false.

banner_has_small_text:
  true  = banner contains text that is extremely small (would be unreadable on mobile)
  false = text is large enough to read, OR no text present
  Default false.

broken_url_or_typo_visible:
  true  = you can clearly read a broken URL or obvious spelling mistake in the banner text
  false = no visible typos or broken links (default — do NOT guess)
  Default false.

email_on_banner_visible:
  true  = an email address is visibly printed on the banner
  false = no email visible (default)
  Default false.

clutter_or_distraction_visible:
  true  = banner is visually overwhelming: too many elements, clashing colors, chaotic layout
  false = banner looks organized and clean
  Default false unless clearly cluttered.

Return ONLY this JSON (no markdown fences):
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
    obs = _call_vision_structured(media_bytes, media_type, PROFILE_PROMPT, ProfileObservations)
    return {
        "uploaded": True,
        "warnings": [],
        "score": _calc_profile_score(obs),
        "observations": {k: v for k, v in obs.items() if k != "evidence"},
        "evidence": _safe_str_array(obs.get("evidence", [])),
        "suggestions": _build_profile_suggestions(obs),
    }


def analyze_cover_picture(media_bytes: bytes, media_type: str) -> dict[str, Any]:
    obs = _call_vision_structured(media_bytes, media_type, COVER_PROMPT, CoverObservations)
    return {
        "uploaded": True,
        "warnings": [],
        "score": _calc_cover_score(obs),
        "observations": {k: v for k, v in obs.items() if k != "evidence"},
        "evidence": _safe_str_array(obs.get("evidence", [])),
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
    """Score out of 100 for profile picture observations.
    null = benefit of the doubt (0.8× weight) for quality attributes, 0 for required attributes.
    """
    pts = 0.0
    # face_visible and professional_attire are required — null = 0
    # lighting/background/framing are quality checks — null = soft positive (0.8×)
    for field, weight, null_weight in [
        ("face_visible",        0.5, 0.0),
        ("professional_attire", 0.5, 0.0),
        ("lighting_adequate",   0.5, 0.4),
        ("background_clean",    0.5, 0.4),
        ("framing_professional",0.5, 0.4),
    ]:
        v = _safe_bool(obs.get(field))
        if v is True:
            pts += weight
        elif v is None:
            pts += null_weight
    watermark = _safe_bool(obs.get("watermark_or_ai_icon_visible"))
    if watermark is True:
        pts = min(pts, 2.0)
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
        if obs.get(field) is True:
            pts = min(pts, caps["typo_cap"])
    if obs.get("email_on_banner_visible") is True:
        pts = min(pts, 1.5)  # email exposure = hard cap at 60
    if obs.get("broken_url_or_typo_visible") is True and obs.get("email_on_banner_visible") is True:
        pts = min(pts, 0.75)  # broken email on banner = hard cap at 30
    return round(min(pts / 2.5 * 100, 100), 1)


def _build_profile_suggestions(obs: dict) -> list[str]:
    tips = []
    if _safe_bool(obs.get("face_visible")) is not True:
        tips.append("Ensure your face is clearly visible. A visible face increases profile engagement significantly.")
    if _safe_bool(obs.get("professional_attire")) is not True:
        tips.append("Wear professional attire (business casual or formal) in your profile photo.")
    if _safe_bool(obs.get("lighting_adequate")) is not True:
        tips.append("Improve lighting. Natural light or soft studio lighting works best.")
    if _safe_bool(obs.get("background_clean")) is not True:
        tips.append("Use a clean, simple background to keep focus on you.")
    if _safe_bool(obs.get("framing_professional")) is not True:
        tips.append("Frame the shot from chest or shoulders up. Avoid too-wide or too-tight crops.")
    if _safe_bool(obs.get("watermark_or_ai_icon_visible")) is True:
        tips.append("Remove any AI-generated badge or watermark from your profile photo.")
    if _safe_bool(obs.get("image_quality_issue_visible")) is True:
        tips.append("Improve image quality. Avoid pixelated or blurry photos.")
    return tips[:4]


def _build_cover_suggestions(obs: dict) -> list[str]:
    tips = []
    if _safe_bool(obs.get("role_aligned_visual")) is not True:
        tips.append("Align your banner image with your target industry or role for stronger branding.")
    if _safe_bool(obs.get("professional_branding_present")) is not True:
        tips.append("Add professional branding elements (logo, color scheme) to your cover image.")
    if _safe_bool(obs.get("text_readability_issue")) is True:
        tips.append("Fix text readability issues in your banner. Avoid small or hard-to-read text.")
    if _safe_bool(obs.get("banner_has_small_text")) is True:
        tips.append("Remove small text from your banner image.")
    if _safe_bool(obs.get("broken_url_or_typo_visible")) is True:
        tips.append("Check your banner for typos or broken links and fix them.")
    if _safe_bool(obs.get("email_on_banner_visible")) is True:
        tips.append("Remove personal email from the banner to avoid spam.")
    if _safe_bool(obs.get("clutter_or_distraction_visible")) is True:
        tips.append("Reduce clutter in your cover image. Keep it clean and focused.")
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
