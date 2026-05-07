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
from ..config import get_settings


def _resolve_fallback_key() -> str:
    """Return a standard Anthropic key (not OpusMax) for quota fallback."""
    cfg = get_settings()
    for key in [cfg.CLAUDE_API_KEY, cfg.ANTHROPIC_API_KEY]:
        k = (key or "").strip()
        if k and not k.startswith("sk-ant-opm"):
            return k
    return ""

LINKEDIN_MODEL = os.getenv("CLAUDE_OPUS_MODEL", os.getenv("CLAUDE_MODEL", "claude-opus-4-7"))

BUCKET_MAX: dict[str, int] = {
    "searchability": 25,
    "headline":      12,
    "about":         15,
    "experience":    22,
    "skills":        10,
    "proof":          8,
    "completeness":   3,
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
    "You are a senior LinkedIn profile coach and recruiter with 10+ years of experience. "
    "Return ONLY valid JSON. No markdown fences, no commentary. "
    "SCORING RULE: Base every score ONLY on evidence visible in the profile text. Never assume, infer, or invent. "
    "EDUCATION RULE: If the About/Summary section explicitly says 'completed in YYYY', 'graduated in YYYY', or 'degree from X, completed YYYY' — "
    "treat that education entry as COMPLETE. Do NOT flag as in-progress just because the PDF end year is in the future. "
    "RECOMMENDATIONS RULE: Only award recommendation points if a Recommendations section with actual text/names is visible. "
    "Never assume recommendations exist from vague text. "
    "SKILLS RULE: If the PDF shows only a 'Top Skills' sidebar with 3 items, that is NOT the full skills section — "
    "flag this explicitly as a critical gap in the skills bucket. "
    "FEEDBACK QUALITY: Write like a senior recruiter coaching a strong candidate. "
    "Every gap must quote or reference actual text from the profile. "
    "Every fix must give an exact actionable instruction — not 'add more skills' but "
    "'Add Python, PyTorch, LangGraph, SageMaker to your Skills section — they appear in your bullets but not your Skills section.' "
    "Every priority_fix must include an 'example' field with a before→after or specific text to add."
)

_OPTIMIZE_SYSTEM = (
    "You are a senior LinkedIn profile optimizer who understands how LinkedIn's search algorithm works. "
    "Rewrite sections for maximum recruiter impact and search visibility. "
    "CRITICAL RULES: "
    "1. Only use companies, job titles, dates, and metrics that ACTUALLY APPEAR in the original profile text. Never invent. "
    "2. Keyword-optimize every rewrite: the headline and About section must contain the role's top search keywords. "
    "3. LinkedIn headline: no first-person pronouns, pipe-separated structure, lead with role title + company + top 2-3 skills. "
    "4. About section: open with a bold impact statement (not 'I am a...'), weave in 5+ technical keywords naturally, end with CTA. "
    "5. Experience bullets: every bullet should start with a strong past-tense action verb and contain at least one metric or outcome. "
    "6. Skills: reorder with highest-search-value skills first (core technical skills before soft skills). "
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

    visual_note = " No images provided — score visual bucket at 0. Do NOT generate visual priority fixes."
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
        visual_note = (
            f" Use pre-computed image data above. Combined avg: {avg:.0f}/100. "
            "IMPORTANT: Both images ARE uploaded — do NOT say 'no photo uploaded' in priority fixes. "
            "Frame visual fixes as quality improvements based on the actual scores and observations."
        )

    return f"""Score this LinkedIn profile.{role_line}

SCORING BUCKETS — award points ONLY for evidence you can see in the profile text. Never assume or invent.

SEARCHABILITY (25 pts) — LinkedIn algorithm search ranking:
  Step 1: Identify the primary role keyword from headline or target role (e.g. "AI Engineer", "ML Engineer").
  Step 2: Count total appearances of that keyword (and close variants) across ALL sections combined.
  Step 3: Keyword density score:
    0 appearances → 0 pts | 1-2 → 5 pts | 3-5 → 11 pts | 6-9 → 17 pts | 10+ → 21 pts
  Step 4: Domain/tech keyword bonus — count secondary keywords (LLM, RAG, GenAI, MLOps, AI, ML, NLP, etc.):
    0-2 keywords → +0 | 3-5 → +2 pts | 6+ → +4 pts
  PENALTY: If skills section has fewer than 5 skills → subtract 4 pts (skills is LinkedIn's
    highest-weight search field; thin skills severely hurt discoverability).
  Cap at 25.

HEADLINE (12 pts):
  +3: Primary role/title clearly stated (e.g. "AI Engineer", "Machine Learning Engineer")
  +2: 2+ specific technical skills or tool names in the headline itself
  +2: Employer name, company, or clear industry context
  +2: Value proposition, specialization, or scale indicator beyond just the role title
  +2: Seniority signal ("Senior", "Lead", "Enterprise", "Production-scale") or years/scope
  +1: Well-structured with clear separators (pipe | or dash —, not run-on text)
  Max: 12. Do not deduct — only award for what is present.

ABOUT (15 pts):
  +2: Opens with a strong hook that does NOT start with "I am a…" or "I have…" — leads with impact or bold claim
  +2: Professional identity and specialisation clearly stated within first 2 sentences
  +3: At least 2 specific quantified achievements with numbers (%, ratios, time saved, scale metrics)
  +2: Industry or domain context present (enterprise, fintech, healthcare, FAANG, etc.)
  +2: 3+ specific tools or technologies named in the About section itself
  +1: Career direction, mission, or what they are building toward
  +1: Clear CTA — email, "reach out", or invitation to connect
  +2: Appropriate length (200–2600 characters) — award 1 if present at all, +1 if 400+ chars

EXPERIENCE (22 pts):
  +4: 90%+ of bullets begin with strong past-tense action verbs — NOT "Responsible for", "Helped", "Worked on", "Assisted with"
  +6: At least 3 quantified results across all roles combined (numbers, %, $, time, user count, scale)
  +4: Specific tools, methods, and frameworks named per role entry (not just once globally)
  +4: Business impact articulated — what changed, who benefited, what was enabled or prevented
  +4: Most recent role experience is relevant to the stated target direction
  PENALTY: −3 pts if the most recent (current) role has zero quantified metrics.

SKILLS (10 pts) — LinkedIn's #1 search-weighted section:
  IMPORTANT: If the PDF shows only a "Top Skills" sidebar with 2-3 items, that is NOT the full
  skills section. This is a critical gap — flag it explicitly and score accordingly.
  +3: 10+ skills listed (0 pts for this criterion if fewer than 5 visible)
  +3: Core role-specific hard skills present (Python, PyTorch, TensorFlow, etc. for AI; SQL, dbt for data)
  +2: Tools and platforms listed (AWS, GCP, Docker, Kubernetes, MLflow, etc.)
  +2: Skills appear in experience bullets too (cross-profile keyword reinforcement)

PROOF (8 pts) — Social credibility signals:
  +3: Recommendations section EXPLICITLY present with actual content/names — score 0 if not visible
  +2: Certifications or credentials listed with institution names
  +2: Projects, GitHub links, portfolio, or featured section present
  +1: Publications, articles, patents, or awards listed
  CRITICAL RULE: Never award recommendation points if no recommendations section is visible.

COMPLETENESS (3 pts):
  +1: Has headline + about + experience sections
  +1: Has education section with institution name
  +1: Has skills section (even if thin)

VISUAL (5 pts) — First impression quality:{visual_note}
  Profile photo (2.5 pts max): face visible & centered (+0.5), professional attire (+0.75),
    clean/neutral background (+0.5), good lighting & sharp resolution (+0.75).
  Cover banner (2.5 pts max): professional design not generic stock photo (+0.75),
    shows name/role/brand or value prop (+0.75), readable text if present (+0.5), visual coherence (+0.5).

GRADES: Elite(90-100), Excellent(80-89), Strong(65-79), Average(50-64), Needs Work(35-49), Weak(<35)

FEEDBACK RULES (apply to all gaps, fixes, tips):
- Gaps MUST quote or paraphrase specific text from the profile. Never write "add more X" without citing what's missing.
- Fixes must give exact instructions — not "improve your skills section" but the actual text/skills to add.
- Every priority_fix must have an "example" field showing before→after or exact text to add/change.
- Education: if About says "completed in [year]", do NOT flag education as in-progress.
- Never state that recommendations, GitHub, or projects exist unless you see them explicitly in the text.

Return ONLY this JSON shape:
{{
  "overall_score": <int 0-100>,
  "grade": "<Elite|Excellent|Strong|Average|Needs Work|Weak>",
  "overall_verdict": "<2 sentences: what they've done well + the #1 thing to fix>",
  "jd_fit_score": <int 0-100, or 0 if no JD>,
  "buckets": [
    {{
      "id": "<searchability|headline|about|experience|skills|proof|completeness|visual>",
      "label": "<human readable>",
      "score": <int earned>,
      "max": <int max>,
      "pct": <int 0-100>,
      "strengths": ["<specific strength quoting actual profile text>"],
      "gaps": ["<specific gap referencing actual profile text>"]
    }}
  ],
  "top_strengths": ["<specific strength>", "<specific strength>", "<specific strength>"],
  "top_gaps": ["<specific gap>", "<specific gap>", "<specific gap>"],
  "priority_fixes": [
    {{
      "section": "<bucket id>",
      "issue": "<specific problem — reference actual profile text>",
      "fix": "<exact action: what to add, remove, or rewrite>",
      "example": "<REQUIRED non-empty: e.g. 'Add to Skills: Python, PyTorch, LangGraph, SageMaker, MLflow, FastAPI' or 'Before: Responsible for AI systems → After: Architected 3 production RAG pipelines serving 500+ daily users'>",
      "impact": "<High|Medium|Low>"
    }}
  ],
  "headline_rewrite": {{
    "current": "<their actual headline from the profile>",
    "improved": "<your rewritten version>",
    "reason": "<why this is better — what changed and why it works>"
  }},
  "about_tips": [
    "<specific actionable tip referencing actual text — e.g. 'Your opening line starts with I build — strong hook. Consider moving your 28% retrieval metric into the first sentence to lead with proof.'>",
    "<tip 2>",
    "<tip 3>"
  ],
  "visual_notes": ["<specific visual recommendation based on image analysis>"]
}}{jd_block}{visual_block}

LINKEDIN PROFILE TEXT:
---
{pdf_text[:5000]}
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

        # Visual bucket: always compute server-side from actual image scores, never trust Claude's self-report
        if bid == "visual":
            if not visual_evaluated:
                bucket_entry["score"]     = 0
                bucket_entry["pct"]       = 0
                bucket_entry["evaluated"] = False
                bucket_entry["note"]      = "Upload photos to evaluate"
            else:
                p_score = (profile_img or {}).get("score", 0) / 100 * 2.5 if profile_img else 0
                c_score = (cover_img   or {}).get("score", 0) / 100 * 2.5 if cover_img   else 0
                # If only one image provided, scale accordingly
                if profile_img and not cover_img:
                    p_score = (profile_img.get("score", 0) / 100) * mx
                    c_score = 0
                elif cover_img and not profile_img:
                    p_score = 0
                    c_score = (cover_img.get("score", 0) / 100) * mx
                computed_visual = min(mx, p_score + c_score)
                bucket_entry["score"] = round(computed_visual)
                bucket_entry["pct"]   = round(computed_visual / mx * 100) if mx else 0

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
    for f in (data.get("priority_fixes") or []):
        if len(fixes) >= 5:
            break
        fix_section = str(f.get("section", ""))
        # When visual was not evaluated (no images), skip AI-generated visual fixes entirely
        if fix_section == "visual" and not visual_evaluated:
            continue
        example = str(f.get("example", "")).strip()
        # Auto-generate a fallback example from the fix text when Claude omits it
        if not example:
            fix_text = str(f.get("fix", ""))
            if fix_section == "skills":
                example = "Add to your Skills section: Python · PyTorch · LangChain · LangGraph · SageMaker · MLflow · FastAPI · Docker · Kubernetes · Terraform"
            elif fix_section == "proof":
                example = "Ask a JPMorgan colleague: 'Mohammed led our RAG pipeline redesign that cut retrieval errors by 28% — one of the strongest AI engineers I've worked with.'"
            elif fix_section == "visual":
                example = "Banner: Add your name, title 'AI/ML Engineer @ JPMorgan', and 2-3 skill icons on a clean branded background. Remove personal email — link to GitHub instead."
            elif fix_section == "headline":
                example = f"Before: {fix_text[:50]}… → After: AI Engineer | RAG · LLM Orchestration · MLOps | JPMorgan | Production GenAI on AWS · GCP"
            elif fix_section == "about":
                example = "Lead sentence: 'In 4 years of production AI, I've shipped RAG pipelines that cut retrieval errors 28%, multi-agent workflows at JPMorgan Chase, and real-time inference endpoints serving enterprise scale.'"
            else:
                example = fix_text[:120] if fix_text else ""
        fixes.append({
            "section": fix_section,
            "issue":   str(f.get("issue",   "")),
            "fix":     str(f.get("fix",     "")),
            "example": example,
            "impact":  str(f.get("impact",  "Medium")),
        })

    # When images not uploaded, append a single authoritative visual fix instead of AI guesses
    if not visual_evaluated:
        fixes.append({
            "section": "visual",
            "issue":   "Profile photo and cover banner not analyzed — images not uploaded to this tool",
            "fix":     "Upload your profile photo and cover banner using the fields above to receive visual quality scores and specific improvement suggestions.",
            "example": "Upload a headshot with neutral background and professional attire for the profile photo; use a branded banner with your name, role, and top 2 skills or a value statement.",
            "impact":  "High",
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
        "about":           re.compile(r"^(about|summary|professional summary|profile)$", re.IGNORECASE),
        "experience":      re.compile(r"^(experience|work experience|professional experience|employment|employment history)$", re.IGNORECASE),
        "education":       re.compile(r"^(education|academic background|qualifications)$", re.IGNORECASE),
        "skills":          re.compile(r"^(skills|top skills|technical skills|core competencies|competencies)$", re.IGNORECASE),
        "projects":        re.compile(r"^(projects|featured|portfolio)$", re.IGNORECASE),
        "certifications":  re.compile(r"^(certifications?|licenses?|credentials?)$", re.IGNORECASE),
        "recommendations": re.compile(r"^(recommendations?|endorsements?)$", re.IGNORECASE),
    }

    # Headline heuristic: scan lines 1-4, skip address/location lines
    # LinkedIn PDFs vary: sometimes line 1 is city/address, sometimes it's the headline
    _ADDRESS_RE = re.compile(
        # Street address: starts with number, any words, then street type anywhere after
        r'^\d+\s+.*\b(St\.?|Ave\.?|Blvd\.?|Dr\.?|Ln\.?|Rd\.?|Ct\.?|Pl\.?|Way|Pkwy|Cir|Court|Street|Avenue|Drive|Lane|Road|Boulevard)\b'
        r'|^[A-Za-z\s]+,\s+(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b'
        r'|^[A-Za-z\s,]+,\s+United States'
        r'|^[A-Za-z\s,]+,\s+India$'
        r'|^[A-Za-z ,]+,\s+[A-Z]{2}\s+\d{5}',
        re.IGNORECASE,
    )
    headline = lines[1] if len(lines) > 1 else ""
    for _i in range(1, min(5, len(lines))):
        if not _ADDRESS_RE.search(lines[_i].strip()):
            headline = lines[_i]
            break

    # Bucket sections
    sections: dict[str, list[str]] = {
        "about":           [],
        "experience":      [],
        "education":       [],
        "skills":          [],
        "recommendations": [],
    }
    current_section: str | None = None

    for line in lines[2:]:  # skip name + headline
        matched = False
        for sec_key, pattern in SECTION_HEADERS.items():
            if pattern.match(line):
                current_section = sec_key if sec_key in sections else None
                matched = True
                break
        if not matched and current_section:
            sections[current_section].append(line)

    result: dict[str, Any] = {"headline": headline}

    if sections["about"]:
        result["about"] = " ".join(sections["about"])

    if sections["experience"]:
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
        result["experience"] = entries[:10]

    if sections["skills"]:
        result["skills"] = sections["skills"][:20]

    if sections["education"]:
        result["education"] = sections["education"][:6]

    if sections["recommendations"]:
        result["recommendations"] = sections["recommendations"][:6]

    # Detect recommendations anywhere in text (PDF export often has them inline)
    rec_count_re = re.compile(
        r"(\d+)\s+(?:people?\s+)?(?:have?\s+)?recommended|recommended\s+by\s+(\d+)|recommendations?\s*\((\d+)\)",
        re.IGNORECASE,
    )
    rec_section_re = re.compile(r"\bRecommendations?\b", re.IGNORECASE)
    result["has_recommendations"] = bool(
        sections["recommendations"]
        or rec_count_re.search(pdf_text)
        or (rec_section_re.search(pdf_text) and len(sections["recommendations"]) > 0)
    )

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

    return f"""Optimize this LinkedIn profile for maximum recruiter impact and LinkedIn search ranking.{role_line}

CURRENT SCORE SUMMARY:
Overall: {score_result.get("overall_score", 0)}/100 — {score_result.get("grade", "")}

BUCKET GAPS (what to fix):
{buckets_summary}

PRIORITY FIXES (address these):
{priority_fixes}

LINKEDIN OPTIMIZATION INSTRUCTIONS:
1. HEADLINE: Lead with role title + company if applicable. Add top 2-3 technical specializations using
   pipe separators. Include a seniority/scale signal. Keep under 220 characters. No "I" pronoun.
   Example structure: "AI Engineer @ [Company] | RAG · LLM Orchestration · MLOps | Production GenAI on AWS"

2. ABOUT SECTION:
   - First sentence: bold impact claim (not "I am a..." — instead lead with a metric or result)
   - Weave in 6+ target role keywords naturally (LLM, RAG, GenAI, MLOps, Python, etc.)
   - Include at least 3 quantified achievements (use exact numbers from the profile — never fabricate)
   - End with a clear CTA (email or invitation to connect)
   - Target 400-600 words for optimal LinkedIn algorithm weighting

3. EXPERIENCE BULLETS:
   - Every bullet: strong past-tense action verb + specific outcome or metric
   - Name the tools/tech in each bullet (not just in general)
   - Add business impact context ("reducing operational cost", "enabling real-time inference at scale")
   - If a bullet has no metric, add context like scale (users served, system load, data volume)

4. SKILLS:
   - Reorder: core technical skills first, then tools/platforms, then frameworks, then soft skills
   - Identify skills clearly evidenced in the experience bullets but missing from skills section

CRITICAL CONSTRAINTS:
- ONLY use companies, job titles, dates, and metrics that ACTUALLY appear in the profile text.
- Never fabricate new achievements, certifications, or tools not in the text.
- You may rephrase, restructure, strengthen, and keyword-optimize existing content.

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
    on_step=None,          # optional callback(step_name: str)
) -> dict[str, Any]:
    """Score a LinkedIn profile across 8 buckets."""
    def _step(name: str) -> None:
        if on_step:
            try:
                on_step(name)
            except Exception:
                pass

    key = _resolve_opusmax_key()
    if not key:
        raise RuntimeError("OPUSMAX_API_KEY / ANTHROPIC_API_KEY not configured")

    profile_img: dict | None = None
    cover_img:   dict | None = None

    if profile_image_bytes and profile_image_type:
        _step("photo_profile")
        profile_img = analyze_profile_picture(profile_image_bytes, profile_image_type)
    if cover_image_bytes and cover_image_type:
        _step("photo_cover")
        cover_img = analyze_cover_picture(cover_image_bytes, cover_image_type)

    visual_evaluated = bool(profile_img or cover_img)

    _step("scoring")
    prompt = _build_prompt(pdf_text, job_description, target_role, profile_img, cover_img)
    client = _make_anthropic_client(key)

    data: dict[str, Any] = {}
    last_error: str = ""
    clients_to_try = [client]
    fallback_key = _resolve_fallback_key()
    if fallback_key and not fallback_key.startswith("sk-ant-opm"):
        clients_to_try.append(_make_anthropic_client(fallback_key))

    for cl in clients_to_try:
        for attempt in range(2):
            try:
                response = cl.messages.create(
                    model=LINKEDIN_MODEL,
                    max_tokens=4000,
                    system=_SYSTEM,
                    messages=[{"role": "user", "content": prompt}],
                )
                raw = next((b.text for b in response.content if hasattr(b, "text")), "{}")
                if "Usage limit reached" in raw or "usage limit" in raw.lower():
                    last_error = f"OpusMax quota exceeded (model={LINKEDIN_MODEL})"
                    break  # try next client
                data = _parse(raw)
                if data:
                    break
            except Exception as exc:
                last_error = f"{type(exc).__name__}: {exc}"
                break  # don't retry API errors — try next client immediately
        if data:
            break
    if not data:
        raise RuntimeError(f"AI API failed: {last_error or 'empty response from all clients'}")

    result = _normalize(data, profile_img, cover_img, visual_evaluated)
    _step("done")

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
    clients_to_try = [client]
    fallback_key = _resolve_fallback_key()
    if fallback_key and not fallback_key.startswith("sk-ant-opm"):
        clients_to_try.append(_make_anthropic_client(fallback_key))

    last_error: str = ""
    for cl in clients_to_try:
        try:
            for attempt in range(2):
                response = cl.messages.create(
                    model=LINKEDIN_MODEL,
                    max_tokens=4000,
                    system=_OPTIMIZE_SYSTEM,
                    messages=[{"role": "user", "content": prompt}],
                )
                raw = next((b.text for b in response.content if hasattr(b, "text")), "{}")
                if "Usage limit reached" in raw or "usage limit" in raw.lower():
                    last_error = f"OpusMax quota exceeded (model={LINKEDIN_MODEL})"
                    break
                data = _parse(raw)
                has_content = bool(
                    data.get("headline") or data.get("about") or data.get("experience") or data.get("skills")
                )
                if has_content or attempt == 1:
                    break
        except Exception as exc:
            last_error = f"{type(exc).__name__}: {exc}"
        if data:
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
