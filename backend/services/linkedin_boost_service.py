"""
LinkedIn Profile Boost Service — 8-bucket scoring via Claude Opus Max.
Input: LinkedIn PDF text + optional images + optional JD.
Output: bucket scores, grade, priority fixes, headline rewrite, visual feedback.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any

from .resume_analysis_service import (
    _make_anthropic_client,
    _resolve_opusmax_key,
    analyze_cover_picture,
    analyze_profile_picture,
)

LINKEDIN_MODEL = os.getenv("CLAUDE_OPUS_MODEL", os.getenv("CLAUDE_MODEL", "claude-opus-4-7"))

BUCKET_MAX: dict[str, int] = {
    "searchability": 25,
    "headline":      12,
    "about":         15,
    "experience":    22,
    "skills":        10,
    "proof":          6,
    "completeness":   5,
    "visual":         5,
}

GRADE_THRESHOLDS = [
    (90, "Elite"),
    (80, "Excellent"),
    (65, "Strong"),
    (50, "Average"),
    (35, "Needs Work"),
    (0,  "Weak"),
]


def _grade(score: int) -> str:
    for threshold, label in GRADE_THRESHOLDS:
        if score >= threshold:
            return label
    return "Weak"


_SYSTEM = (
    "You are a LinkedIn profile scoring expert. "
    "Return ONLY valid JSON. No markdown fences, no commentary. "
    "Base every score strictly on evidence in the profile text. "
    "Do not invent information."
)


def _build_prompt(
    pdf_text: str,
    job_description: str,
    target_role: str,
    profile_img: dict | None,
    cover_img: dict | None,
) -> str:
    role_line = f"\nTARGET ROLE: {target_role}" if target_role else ""
    jd_block  = f"\n\nJOB DESCRIPTION:\n{job_description}" if job_description else ""

    visual_note = " No images provided — score visual bucket at 0."
    visual_block = ""
    if profile_img or cover_img:
        lines = ["\n\nPRE-COMPUTED IMAGE ANALYSIS:"]
        if profile_img:
            lines.append(
                f"  Profile Photo → score={profile_img.get('score', 0)}/100  "
                f"obs={json.dumps(profile_img.get('observations', {}))}"
            )
        if cover_img:
            lines.append(
                f"  Cover Banner  → score={cover_img.get('score', 0)}/100  "
                f"obs={json.dumps(cover_img.get('observations', {}))}"
            )
        visual_block = "\n".join(lines)
        scores = [x.get("score", 0) for x in [profile_img, cover_img] if x]
        avg    = sum(scores) / len(scores) if scores else 0
        visual_note = f" Use pre-computed image data above. Combined avg: {avg:.0f}/100."

    return f"""Score this LinkedIn profile.{role_line}

SCORING BUCKETS (max points):
- searchability (25): role keywords in headline/about/skills/experience, keyword repetition across sections.
- headline (12): clear role, skills/tools, domain, value proposition, not generic.
- about (15): professional identity, relevant skills, domain context, measurable impact, career direction, story flow.
- experience (22): strong action verbs, quantified results, tools/methods, business impact, role relevance, not task-only.
- skills (10): 5+ relevant skills, role core skills, tools/platforms, not only soft skills, skills across profile.
- proof (6): projects/featured work, certifications/courses, publications/portfolio, proof matches direction.
- completeness (5): headline(1), about(1), experience(1), education(1), skills(1).
- visual (5): profile photo quality (2.5pt), cover/banner quality (2.5pt).{visual_note}

GRADES: Elite(90-100), Excellent(80-89), Strong(65-79), Average(50-64), Needs Work(35-49), Weak(<35)

Return ONLY this JSON shape:
{{
  "overall_score": <int 0-100>,
  "grade": "<Elite|Excellent|Strong|Average|Needs Work|Weak>",
  "overall_verdict": "<one sentence>",
  "jd_fit_score": <int 0-100, or 0 if no JD>,
  "buckets": [
    {{
      "id": "<searchability|headline|about|experience|skills|proof|completeness|visual>",
      "label": "<human readable>",
      "score": <int earned>,
      "max": <int max>,
      "pct": <int 0-100>,
      "strengths": ["<what is done well>"],
      "gaps": ["<what is missing or weak>"]
    }}
  ],
  "top_strengths": ["<strength>", "<strength>", "<strength>"],
  "top_gaps": ["<gap>", "<gap>", "<gap>"],
  "priority_fixes": [
    {{
      "section": "<bucket id>",
      "issue": "<specific problem>",
      "fix": "<exact recommended action>",
      "impact": "<High|Medium|Low>"
    }}
  ],
  "headline_rewrite": {{
    "current": "<their actual headline from the profile>",
    "improved": "<your rewritten version>",
    "reason": "<why this is better>"
  }},
  "about_tips": ["<tip>", "<tip>", "<tip>"],
  "visual_notes": ["<visual recommendation>"]
}}{jd_block}{visual_block}

LINKEDIN PROFILE TEXT:
---
{pdf_text[:8000]}
---
"""


def _parse(raw: str) -> dict[str, Any]:
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned.strip())
    except json.JSONDecodeError:
        s, e = cleaned.find("{"), cleaned.rfind("}")
        if s != -1 and e > s:
            return json.loads(cleaned[s : e + 1])
        return {}


def _normalize(data: dict, profile_img: dict | None, cover_img: dict | None) -> dict[str, Any]:
    overall = max(0, min(100, int(data.get("overall_score", 0))))

    buckets = []
    seen: set[str] = set()
    for b in data.get("buckets", []):
        bid = b.get("id", "")
        if bid not in BUCKET_MAX or bid in seen:
            continue
        seen.add(bid)
        mx     = BUCKET_MAX[bid]
        earned = max(0, min(mx, int(b.get("score", 0))))
        buckets.append({
            "id":        bid,
            "label":     b.get("label", bid.title()),
            "score":     earned,
            "max":       mx,
            "pct":       round(earned / mx * 100) if mx else 0,
            "strengths": [str(s) for s in (b.get("strengths") or [])][:3],
            "gaps":      [str(g) for g in (b.get("gaps")      or [])][:3],
        })

    hr = data.get("headline_rewrite")
    headline_rewrite = None
    if isinstance(hr, dict):
        headline_rewrite = {
            "current":  str(hr.get("current",  "")),
            "improved": str(hr.get("improved", "")),
            "reason":   str(hr.get("reason",   "")),
        }

    fixes = []
    for f in (data.get("priority_fixes") or [])[:5]:
        fixes.append({
            "section": str(f.get("section", "")),
            "issue":   str(f.get("issue",   "")),
            "fix":     str(f.get("fix",     "")),
            "impact":  str(f.get("impact",  "Medium")),
        })

    result: dict[str, Any] = {
        "overall_score":    overall,
        "grade":            data.get("grade") or _grade(overall),
        "overall_verdict":  str(data.get("overall_verdict", "")),
        "jd_fit_score":     max(0, min(100, int(data.get("jd_fit_score", 0) or 0))),
        "buckets":          buckets,
        "top_strengths":    [str(s) for s in (data.get("top_strengths") or [])][:3],
        "top_gaps":         [str(g) for g in (data.get("top_gaps")      or [])][:3],
        "priority_fixes":   fixes,
        "headline_rewrite": headline_rewrite,
        "about_tips":       [str(t) for t in (data.get("about_tips")    or [])][:4],
        "visual_notes":     [str(n) for n in (data.get("visual_notes")  or [])][:4],
    }

    if profile_img:
        result["profile_image"] = {
            "score":        profile_img.get("score", 0),
            "suggestions":  profile_img.get("suggestions", []),
            "observations": profile_img.get("observations", {}),
        }
    if cover_img:
        result["cover_image"] = {
            "score":        cover_img.get("score", 0),
            "suggestions":  cover_img.get("suggestions", []),
            "observations": cover_img.get("observations", {}),
        }

    return result


def analyze_linkedin_profile(
    pdf_text: str,
    job_description: str = "",
    target_role: str = "",
    profile_image_bytes: bytes | None = None,
    profile_image_type: str | None = None,
    cover_image_bytes: bytes | None = None,
    cover_image_type: str | None = None,
) -> dict[str, Any]:
    """Score a LinkedIn profile across 8 buckets via Claude Opus Max."""
    key = _resolve_opusmax_key()
    if not key:
        raise RuntimeError("OPUSMAX_API_KEY / ANTHROPIC_API_KEY not configured")

    profile_img: dict | None = None
    cover_img:   dict | None = None

    if profile_image_bytes and profile_image_type:
        profile_img = analyze_profile_picture(profile_image_bytes, profile_image_type)
    if cover_image_bytes and cover_image_type:
        cover_img = analyze_cover_picture(cover_image_bytes, cover_image_type)

    prompt = _build_prompt(pdf_text, job_description, target_role, profile_img, cover_img)

    client   = _make_anthropic_client(key)
    response = client.messages.create(
        model=LINKEDIN_MODEL,
        max_tokens=3000,
        system=_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    raw  = next((b.text for b in response.content if hasattr(b, "text")), "{}")
    data = _parse(raw)
    return _normalize(data, profile_img, cover_img)
