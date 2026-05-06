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
    "For each bucket, strengths and gaps must reference specific phrases or facts from the profile text. "
    "Do not invent information."
)

_OPTIMIZE_SYSTEM = (
    "You are a LinkedIn profile optimizer. "
    "Rewrite sections for maximum recruiter impact. "
    "CRITICAL: Only use facts, companies, titles, and metrics that exist in the original profile text. "
    "Never invent new claims. You may rephrase, restructure, and strengthen language. "
    "Return ONLY valid JSON. No markdown fences, no commentary."
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

For each bucket, strengths and gaps MUST reference specific phrases or facts from the profile text. Do not invent evidence.

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
            try:
                return json.loads(cleaned[s : e + 1])
            except json.JSONDecodeError:
                pass
        return {}


def _normalize(data: dict, profile_img: dict | None, cover_img: dict | None, visual_evaluated: bool = True) -> dict[str, Any]:
    buckets = []
    seen: set[str] = set()
    for b in data.get("buckets", []):
        bid = b.get("id", "")
        if bid not in BUCKET_MAX or bid in seen:
            continue
        seen.add(bid)
        mx     = BUCKET_MAX[bid]
        earned = max(0, min(mx, int(b.get("score", 0))))

        bucket_entry: dict[str, Any] = {
            "id":        bid,
            "label":     b.get("label", bid.title()),
            "score":     earned,
            "max":       mx,
            "pct":       round(earned / mx * 100) if mx else 0,
            "strengths": [str(s) for s in (b.get("strengths") or [])][:3],
            "gaps":      [str(g) for g in (b.get("gaps")      or [])][:3],
            "evaluated": True,
        }

        # Handle visual bucket when no images provided
        if bid == "visual" and not visual_evaluated:
            bucket_entry["score"]     = 0
            bucket_entry["pct"]       = 0
            bucket_entry["evaluated"] = False
            bucket_entry["note"]      = "Upload photos to evaluate"

        buckets.append(bucket_entry)

    # Compute overall score server-side from evaluated buckets (ignore Claude's self-reported value)
    evaluated_buckets = [b for b in buckets if b.get("evaluated", True)]
    computed_pts = sum(b["score"] for b in evaluated_buckets)
    max_pts      = sum(b["max"]   for b in evaluated_buckets)
    overall      = round(computed_pts / max_pts * 100) if max_pts else 0

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
        "grade":            _grade(overall),
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


# ─── Section parser ────────────────────────────────────────────────────────────

def _parse_sections(pdf_text: str) -> dict[str, Any]:
    """
    Parse raw LinkedIn PDF text into named sections using keyword/regex matching.
    Returns a dict with keys: headline, about, experience, skills, education.
    """
    lines = [l.strip() for l in pdf_text.splitlines() if l.strip()]
    if not lines:
        return {}

    # Section header keywords (case-insensitive)
    SECTION_HEADERS = {
        "about":      re.compile(r"^(about|summary|professional summary|profile)$", re.IGNORECASE),
        "experience": re.compile(r"^(experience|work experience|professional experience|employment|employment history)$", re.IGNORECASE),
        "education":  re.compile(r"^(education|academic background|qualifications)$", re.IGNORECASE),
        "skills":     re.compile(r"^(skills|top skills|technical skills|core competencies|competencies)$", re.IGNORECASE),
        "projects":   re.compile(r"^(projects|featured|portfolio)$", re.IGNORECASE),
        "certifications": re.compile(r"^(certifications?|licenses?|credentials?)$", re.IGNORECASE),
    }

    # Headline heuristic: first non-empty line after the name (line 0) is usually the headline
    # LinkedIn PDFs typically: line 0 = full name, line 1 = headline, line 2 = location
    headline = lines[1] if len(lines) > 1 else ""

    # Bucket sections
    sections: dict[str, list[str]] = {
        "about":      [],
        "experience": [],
        "education":  [],
        "skills":     [],
    }
    current_section: str | None = None

    for line in lines[2:]:  # skip name + headline
        matched = False
        for sec_key, pattern in SECTION_HEADERS.items():
            if pattern.match(line):
                # Map projects / certifications into experience for display
                current_section = sec_key if sec_key in sections else None
                matched = True
                break
        if not matched and current_section:
            sections[current_section].append(line)

    result: dict[str, Any] = {"headline": headline}

    if sections["about"]:
        result["about"] = " ".join(sections["about"])

    if sections["experience"]:
        # Split experience into entries by blank/date patterns
        entries: list[str] = []
        entry_lines: list[str] = []
        date_re = re.compile(r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\b.*\d{4}", re.IGNORECASE)
        year_range_re = re.compile(r"\d{4}\s*[-–]\s*(\d{4}|Present|present|Current|current)")

        for line in sections["experience"]:
            if (date_re.search(line) or year_range_re.search(line)) and entry_lines:
                entries.append(" | ".join(entry_lines))
                entry_lines = [line]
            else:
                entry_lines.append(line)
        if entry_lines:
            entries.append(" | ".join(entry_lines))
        result["experience"] = entries[:10]  # cap at 10 entries

    if sections["skills"]:
        result["skills"] = sections["skills"][:20]

    if sections["education"]:
        result["education"] = sections["education"][:6]

    return result


# ─── Optimize prompt ──────────────────────────────────────────────────────────

def _build_optimize_prompt(pdf_text: str, score_result: dict, target_role: str) -> str:
    role_line = f"\nTARGET ROLE: {target_role}" if target_role else ""
    buckets_summary = json.dumps(
        [{"id": b["id"], "score": b["score"], "max": b["max"], "gaps": b.get("gaps", [])}
         for b in score_result.get("buckets", [])],
        indent=2,
    )
    priority_fixes = json.dumps(score_result.get("priority_fixes", [])[:5], indent=2)

    return f"""Optimize the LinkedIn profile below for maximum recruiter impact.{role_line}

CURRENT SCORE SUMMARY:
Overall: {score_result.get("overall_score", 0)}/100 — {score_result.get("grade", "")}

BUCKET GAPS:
{buckets_summary}

PRIORITY FIXES:
{priority_fixes}

INSTRUCTIONS:
1. Rewrite the headline to be specific, keyword-rich, and role-aligned.
2. Rewrite the about/summary section to be compelling and outcome-focused.
3. For each experience entry found, rewrite bullet points using strong action verbs and quantified impact.
4. Reorder and recommend skills for better searchability.

CRITICAL CONSTRAINTS:
- Only use companies, titles, dates, and metrics that actually appear in the profile text.
- Never fabricate new job titles, companies, skills, or achievements.
- You may rephrase, restructure, and strengthen language.

Return ONLY this JSON shape:
{{
  "headline": {{
    "current": "<exact current headline from profile>",
    "optimized": "<rewritten headline>",
    "reason": "<why this is better>"
  }},
  "about": {{
    "current": "<exact current about section text>",
    "optimized": "<rewritten about section>",
    "key_changes": ["<change 1>", "<change 2>"]
  }},
  "experience": [
    {{
      "company": "<company name>",
      "title": "<job title>",
      "current_text": "<original bullet points or text>",
      "optimized_bullets": ["<bullet 1>", "<bullet 2>", "<bullet 3>"],
      "key_changes": ["<change description>"]
    }}
  ],
  "skills": {{
    "current": ["<skill>"],
    "reordered": ["<skill in priority order>"],
    "add_if_true": [
      {{"skill": "<skill name>", "reason": "<why relevant, only if you saw evidence in the text>"}}
    ]
  }}
}}

LINKEDIN PROFILE TEXT:
---
{pdf_text[:10000]}
---
"""


# ─── Main analysis function ───────────────────────────────────────────────────

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

    visual_evaluated = bool(profile_img or cover_img)

    prompt = _build_prompt(pdf_text, job_description, target_role, profile_img, cover_img)
    client = _make_anthropic_client(key)

    # Retry up to 3 times on all-zero or bad JSON response
    data: dict[str, Any] = {}
    result: dict[str, Any] = {}
    for attempt in range(3):
        response = client.messages.create(
            model=LINKEDIN_MODEL,
            max_tokens=3000,
            system=_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        raw  = next((b.text for b in response.content if hasattr(b, "text")), "{}")
        data = _parse(raw)
        result = _normalize(data, profile_img, cover_img, visual_evaluated)
        total_bucket_pts = sum(
            b["score"] for b in result.get("buckets", [])
            if b.get("evaluated", True)
        )
        if total_bucket_pts > 0 or attempt == 2:
            break

    # Attach parsed sections and raw pdf_text for the optimize phase
    result["parsed_sections"] = _parse_sections(pdf_text)
    result["pdf_text"] = pdf_text

    return result


# ─── Optimize function ────────────────────────────────────────────────────────

def optimize_linkedin_profile(
    pdf_text: str,
    score_result: dict,
    target_role: str = "",
) -> dict[str, Any]:
    """
    Generate optimized rewrites for all LinkedIn profile sections.
    Returns: headline, about, experience[], skills.
    """
    key = _resolve_opusmax_key()
    if not key:
        raise RuntimeError("OPUSMAX_API_KEY / ANTHROPIC_API_KEY not configured")

    client = _make_anthropic_client(key)
    prompt = _build_optimize_prompt(pdf_text, score_result, target_role)

    data: dict[str, Any] = {}
    for attempt in range(3):
        response = client.messages.create(
            model=LINKEDIN_MODEL,
            max_tokens=4000,
            system=_OPTIMIZE_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        raw  = next((b.text for b in response.content if hasattr(b, "text")), "{}")
        data = _parse(raw)
        # Retry if we got an empty or malformed response
        has_content = bool(
            data.get("headline") or data.get("about") or data.get("experience") or data.get("skills")
        )
        if has_content or attempt == 2:
            break

    # Normalise output
    result: dict[str, Any] = {}

    headline = data.get("headline")
    if isinstance(headline, dict):
        result["headline"] = {
            "current":   str(headline.get("current",   "")),
            "optimized": str(headline.get("optimized", "")),
            "reason":    str(headline.get("reason",    "")),
        }

    about = data.get("about")
    if isinstance(about, dict):
        result["about"] = {
            "current":     str(about.get("current",   "")),
            "optimized":   str(about.get("optimized", "")),
            "key_changes": [str(c) for c in (about.get("key_changes") or [])][:6],
        }

    experience = data.get("experience")
    if isinstance(experience, list):
        exp_list = []
        for e in experience[:10]:
            if not isinstance(e, dict):
                continue
            exp_list.append({
                "company":           str(e.get("company",    "")),
                "title":             str(e.get("title",      "")),
                "current_text":      str(e.get("current_text", "")),
                "optimized_bullets": [str(b) for b in (e.get("optimized_bullets") or [])][:8],
                "key_changes":       [str(c) for c in (e.get("key_changes")       or [])][:4],
            })
        result["experience"] = exp_list

    skills = data.get("skills")
    if isinstance(skills, dict):
        result["skills"] = {
            "current":      [str(s) for s in (skills.get("current")   or [])][:30],
            "reordered":    [str(s) for s in (skills.get("reordered") or [])][:30],
            "add_if_true":  [
                {"skill": str(x.get("skill", "")), "reason": str(x.get("reason", ""))}
                for x in (skills.get("add_if_true") or [])
                if isinstance(x, dict)
            ][:10],
        }

    return result
