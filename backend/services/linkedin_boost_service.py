"""
LinkedIn Profile Boost Service — 7-bucket section scoring via Claude Sonnet.
Images (photo/cover) are scored separately via their own endpoints.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any

from .resume_analysis_service import _make_anthropic_client, _resolve_claude_key
from ..config import get_settings


def _resolve_fallback_key() -> str:
    """Return a distinct Anthropic key for quota fallback, if one is configured."""
    cfg = get_settings()
    primary = _resolve_claude_key()
    for key in [cfg.CLAUDE_API_KEY, cfg.ANTHROPIC_API_KEY]:
        k = (key or "").strip()
        if k and k != primary:
            return k
    return ""

LINKEDIN_MODEL = os.getenv("LINKEDIN_MODEL", "claude-sonnet-4-6")

# ─── Bucket definitions ───────────────────────────────────────────────────────

BUCKET_MAX: dict[str, int] = {
    "searchability": 20,
    "headline":      10,
    "about":         15,
    "experience":    30,
    "skills":        10,
    "education":      5,
    "proof":          8,
    "completeness":   2,
}

GRADE_THRESHOLDS = [
    (90, "Elite"),
    (80, "Excellent"),
    (65, "Strong"),
    (50, "Average"),
    (35, "Needs Work"),
    (0,  "Weak"),
]

BUCKET_LABELS: dict[str, str] = {
    "searchability": "Searchability",
    "headline":      "Headline",
    "about":         "About / Summary",
    "experience":    "Experience",
    "skills":        "Skills",
    "education":     "Education",
    "proof":         "Proof",
    "completeness":  "Completeness",
}


def _grade(score: int) -> str:
    for threshold, label in GRADE_THRESHOLDS:
        if score >= threshold:
            return label
    return "Weak"


# ─── Deterministic scoring from observations ──────────────────────────────────

def _score_searchability(obs: dict) -> int:
    kc = int(obs.get("primary_keyword_count", 0))
    if kc == 0:      pts = 0
    elif kc <= 2:    pts = 4
    elif kc <= 5:    pts = 9
    elif kc <= 9:    pts = 14
    else:            pts = 17
    dc = int(obs.get("secondary_keyword_count", 0))
    if dc >= 6:      pts += 3
    elif dc >= 3:    pts += 1
    if int(obs.get("skills_section_count", 0)) < 5:
        pts -= 4
    return max(0, min(20, pts))


def _score_headline(obs: dict) -> int:
    pts = 0
    if obs.get("has_role_title"):       pts += 3
    tc = int(obs.get("tech_skill_count", 0))
    if tc >= 2:                          pts += 2
    elif tc == 1:                        pts += 1
    if obs.get("has_employer"):          pts += 2
    if obs.get("has_specialization"):    pts += 2
    if obs.get("has_seniority"):         pts += 1
    if obs.get("has_separators"):        pts += 1
    if int(obs.get("char_count", 0)) > 220:
        pts -= 1
    return max(0, min(10, pts))


def _score_about(obs: dict) -> int:
    pts = 0
    if obs.get("opens_with_hook"):       pts += 2
    if obs.get("has_professional_id"):   pts += 2
    qc = int(obs.get("quantified_count", 0))
    if qc >= 2:                          pts += 3
    elif qc == 1:                        pts += 1
    if obs.get("has_industry_context"):  pts += 2
    tc = int(obs.get("tool_count", 0))
    if tc >= 3:                          pts += 2
    elif tc >= 1:                        pts += 1
    if obs.get("has_career_direction"):  pts += 1
    if obs.get("has_cta"):               pts += 2
    cc = int(obs.get("char_count", 0))
    if 200 <= cc <= 2600:               pts += 1
    return max(0, min(15, pts))


def _score_experience(obs: dict) -> int:
    pts = 0
    avp = int(obs.get("action_verb_pct", 0))
    if avp >= 90:    pts += 5
    elif avp >= 70:  pts += 3
    elif avp >= 50:  pts += 1
    qc = int(obs.get("quantified_count", 0))
    if qc >= 8:      pts += 8
    elif qc >= 5:    pts += 7
    elif qc >= 3:    pts += 5
    elif qc >= 1:    pts += 2
    if obs.get("has_tools_per_role"):         pts += 5
    if obs.get("has_business_impact"):        pts += 5
    if obs.get("most_recent_relevant"):       pts += 4
    if not obs.get("current_role_has_metrics", True):
        pts -= 3
    return max(0, min(30, pts))


def _score_skills(obs: dict) -> int:
    pts = 0
    sc = int(obs.get("skills_section_count", 0))
    if sc >= 15:     pts += 4
    elif sc >= 10:   pts += 3
    elif sc >= 5:    pts += 1
    if obs.get("has_core_hard_skills"):   pts += 3
    if obs.get("has_tools_platforms"):    pts += 2
    if obs.get("in_experience_too"):      pts += 1
    return max(0, min(10, pts))


def _score_education(obs: dict) -> int:
    pts = 0
    if obs.get("has_institution"):        pts += 1
    if obs.get("has_degree_type"):        pts += 1
    if obs.get("has_field_of_study"):     pts += 1
    if obs.get("has_dates"):              pts += 1
    if obs.get("has_honors_or_gpa"):      pts += 1
    return max(0, min(5, pts))


def _score_proof(obs: dict) -> int:
    pts = 0
    rc = int(obs.get("recommendations_count", 0))
    if rc >= 3:      pts += 3
    elif rc >= 1:    pts += 2
    if obs.get("has_certifications") and obs.get("cert_has_institution"):
        pts += 2
    elif obs.get("has_certifications"):
        pts += 1
    if obs.get("has_projects_or_portfolio"):  pts += 2
    if obs.get("has_github_link"):            pts += 1
    return max(0, min(8, pts))


def _score_completeness(obs: dict) -> int:
    pts = 0
    if obs.get("has_headline") and obs.get("has_about") and obs.get("has_experience"):
        pts += 1
    if obs.get("has_skills"):  pts += 1
    return max(0, min(2, pts))


_SCORERS = {
    "searchability": _score_searchability,
    "headline":      _score_headline,
    "about":         _score_about,
    "experience":    _score_experience,
    "skills":        _score_skills,
    "education":     _score_education,
    "proof":         _score_proof,
    "completeness":  _score_completeness,
}

# ─── Prompts ──────────────────────────────────────────────────────────────────

_SYSTEM = (
    "You are a senior LinkedIn profile analyst. "
    "Your ONLY job is to OBSERVE facts about the profile text — you do NOT assign scores. "
    "Return ONLY valid JSON. No markdown, no commentary. "
    "STRICT OBSERVATION RULES — no hallucination allowed: "
    "• Only mark something True/present if it is EXPLICITLY written in the profile text. "
    "• Count ONLY what you can directly read. Never infer or assume. "
    "• skills_section_count: count ONLY items in an explicit Skills section. Items mentioned in bullets do NOT count. "
    "• recommendations_count: count ONLY if a Recommendations section with real names or quotes is visible. "
    "• about_quantified_count: count numbers/percentages written INSIDE the About/Summary section only — not experience. "
    "• edu_has_degree_type: True ONLY if BS/MS/PhD/MBA/BEng/BCS or similar degree abbreviation is explicitly written. "
    "• edu_has_field_of_study: True ONLY if a field (Computer Science, Data Science, etc.) is explicitly written. "
    "• proof_has_github_link: True ONLY if a github.com URL is visible in the text. "
    "FEEDBACK RULES: "
    "Quote actual text from the profile. Be specific and brief (under 20 words per string). "
    "Every priority_fix must have an 'example' with before→after or exact text to add/change."
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


def _build_prompt(pdf_text: str, job_description: str, target_role: str, inferred_skills: list[str] | None = None) -> str:
    role_line = f"\nTARGET ROLE: {target_role}" if target_role else ""
    jd_block  = f"\n\nJOB DESCRIPTION:\n{job_description}" if job_description else ""
    inferred_note = (
        f"\nNOTE: LinkedIn PDF only exports a 'Top Skills' sidebar — actual skills must be inferred from experience/about. Detected from text: {', '.join(inferred_skills[:30])}"
        if inferred_skills else ""
    )

    return f"""Analyze this LinkedIn profile and return structured observations. Do NOT assign scores.{role_line}{inferred_note}

OBSERVATION INSTRUCTIONS — answer ONLY from what is explicitly written in the profile text below.

SECTION 1 — SEARCHABILITY
- primary_keyword: the main role keyword you identify (e.g. "AI Engineer")
- primary_keyword_count: exact count of that keyword (and close variants) across ALL sections
- secondary_keyword_count: count of domain/tech keywords (LLM, RAG, GenAI, MLOps, NLP, ML, AI, etc.) — count unique ones only
- skills_section_count: count of items in the explicit Skills section ONLY. "Top Skills" sidebar items count. Experience bullets do NOT count.

SECTION 2 — HEADLINE
- has_role_title: true if a primary role/title is clearly stated
- tech_skill_count: count of specific tech tool/skill names IN the headline text itself only
- has_employer: true ONLY if a company or employer name appears in the headline
- has_specialization: true if a domain specialty or value prop is stated
- has_seniority: true ONLY if seniority level (Senior, Lead, Principal, years of experience) is IN the headline
- has_separators: true if pipe | or dash — separators are used
- char_count: approximate character count of headline

SECTION 3 — ABOUT / SUMMARY
- opens_with_hook: true if About does NOT start with "I am a", "I have", "I'm a" — starting with role title/noun IS acceptable
- has_professional_id: true if role identity and specialization are clear within first 2 sentences
- quantified_count: count of specific numbers or percentages written INSIDE the About/Summary text ONLY (NOT experience bullets)
- has_industry_context: true if industry/domain (financial services, healthcare, etc.) is mentioned
- tool_count: count of specific named tools/technologies IN the About section text
- has_career_direction: true if a future goal or career direction is stated
- has_cta: true ONLY if an email address or explicit "reach out"/"connect" invitation is written
- char_count: approximate character count of About section

SECTION 4 — EXPERIENCE
- action_verb_pct: estimated % of experience bullets starting with strong past-tense verbs (NOT "Responsible for", "Helped", "Worked on")
- quantified_count: total count of quantified results (%, $, numbers, time saved, scale metrics) across ALL experience entries
- has_tools_per_role: true if specific tools/frameworks are named within individual role entries
- has_business_impact: true if business outcomes (what changed, who benefited) are articulated
- most_recent_relevant: true if most recent role is relevant to target role
- current_role_has_metrics: true if the most recent/current role has at least one quantified metric

SECTION 5 — SKILLS
- skills_section_count: count of items visible in explicit Skills section. "Generative AI & Large Language Models" = 1 item. Do NOT count experience bullets.
- has_core_hard_skills: true if core technical skills for the role are in the Skills section
- has_tools_platforms: true if specific tools/platforms appear in Skills section
- in_experience_too: true if skills mentioned in Skills also appear in experience bullets

SECTION 6 — EDUCATION
- has_institution: true ONLY if a school/university name is explicitly written
- has_degree_type: true ONLY if degree abbreviation (BS, MS, PhD, MBA, BEng, etc.) is explicitly written
- has_field_of_study: true ONLY if a field of study is explicitly named
- has_dates: true if graduation year or date range is written
- has_honors_or_gpa: true ONLY if GPA, honors, dean's list, or academic award is explicitly mentioned

SECTION 7 — PROOF
- recommendations_count: count of visible recommendations with actual names/text. 0 if no Recommendations section visible.
- has_certifications: true if any certification is listed
- cert_has_institution: true if certification includes the issuing institution name
- has_projects_or_portfolio: true if Projects, Publications, or Featured section with content is visible
- has_github_link: true ONLY if a github.com URL is explicitly written in the text

SECTION 8 — COMPLETENESS
- has_headline: true if headline is present
- has_about: true if About/Summary section is present with content
- has_experience: true if Experience section is present with at least one role
- has_skills: true if any Skills section or Top Skills sidebar is present
- has_education: true if Education section is present

MISSING SECTION RULE: If a section is not present in the profile text, set ALL its observation fields to false/0, and in the feedback for that bucket set strengths=[] and gaps=["Section not present in profile"]. Do not fabricate content for missing sections.

FEEDBACK (be specific, quote actual profile text, max 20 words per string):
- overall_verdict: 1 sentence — what's strong + the #1 thing to fix
- jd_fit_score: 0-100, or 0 if no JD provided
- per-bucket strengths: 2 specific strengths quoting actual text (or 1 if nothing to say). Empty array [] if section is absent.
- per-bucket gaps: up to 2 specific gaps with exact reference to missing text
- top_strengths: 2 overall profile strengths
- top_gaps: 2 overall critical gaps
- priority_fixes: up to 4 fixes, each with section/issue/fix/example/impact
- headline_rewrite: current (exact text) + improved + reason
- about_tips: 2 specific tips

Return ONLY this minified JSON:
{{"observations":{{"searchability":{{"primary_keyword":"<str>","primary_keyword_count":<int>,"secondary_keyword_count":<int>,"skills_section_count":<int>}},"headline":{{"has_role_title":<bool>,"tech_skill_count":<int>,"has_employer":<bool>,"has_specialization":<bool>,"has_seniority":<bool>,"has_separators":<bool>,"char_count":<int>}},"about":{{"opens_with_hook":<bool>,"has_professional_id":<bool>,"quantified_count":<int>,"has_industry_context":<bool>,"tool_count":<int>,"has_career_direction":<bool>,"has_cta":<bool>,"char_count":<int>}},"experience":{{"action_verb_pct":<int>,"quantified_count":<int>,"has_tools_per_role":<bool>,"has_business_impact":<bool>,"most_recent_relevant":<bool>,"current_role_has_metrics":<bool>}},"skills":{{"skills_section_count":<int>,"has_core_hard_skills":<bool>,"has_tools_platforms":<bool>,"in_experience_too":<bool>}},"education":{{"has_institution":<bool>,"has_degree_type":<bool>,"has_field_of_study":<bool>,"has_dates":<bool>,"has_honors_or_gpa":<bool>}},"proof":{{"recommendations_count":<int>,"has_certifications":<bool>,"cert_has_institution":<bool>,"has_projects_or_portfolio":<bool>,"has_github_link":<bool>}},"completeness":{{"has_headline":<bool>,"has_about":<bool>,"has_experience":<bool>,"has_skills":<bool>,"has_education":<bool>}}}},"feedback":{{"overall_verdict":"<str>","jd_fit_score":<int>,"buckets":[{{"id":"<searchability|headline|about|experience|skills|education|proof|completeness>","strengths":["<str>"],"gaps":["<str>"]}}],"top_strengths":["<str>","<str>"],"top_gaps":["<str>","<str>"],"priority_fixes":[{{"section":"<id>","issue":"<str>","fix":"<str>","example":"<str>","impact":"<High|Medium|Low>"}}],"headline_rewrite":{{"current":"<str>","improved":"<str>","reason":"<str>"}},"about_tips":["<str>","<str>"]}}}}{jd_block}

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


def _build_result(data: dict) -> dict[str, Any]:
    """
    Compute scores deterministically from observations, then merge feedback.
    Model never touches scores — it only provides observations + text feedback.
    """
    obs_root = data.get("observations", {})
    fb       = data.get("feedback", {})

    # Build feedback lookup by bucket id
    fb_buckets: dict[str, dict] = {}
    for b in (fb.get("buckets") or []):
        bid = b.get("id", "")
        if bid:
            fb_buckets[bid] = b

    # Which sections are actually present (from completeness observations)
    comp_obs = obs_root.get("completeness", {})
    _PRESENT: dict[str, bool] = {
        "searchability": True,  # always evaluated
        "headline":      bool(comp_obs.get("has_headline",  False)),
        "about":         bool(comp_obs.get("has_about",     False)),
        "experience":    bool(comp_obs.get("has_experience",False)),
        "skills":        bool(comp_obs.get("has_skills",    False)),
        "education":     bool(comp_obs.get("has_education", False)),
        "proof":         True,  # always evaluated (just may score 0)
        "completeness":  True,
    }

    buckets = []
    for bid in BUCKET_MAX:
        obs     = obs_root.get(bid, {})
        present = _PRESENT.get(bid, True)
        scorer  = _SCORERS[bid]
        earned  = scorer(obs) if present else 0
        mx      = BUCKET_MAX[bid]
        bfb     = fb_buckets.get(bid, {})
        if present:
            strengths = [str(s) for s in (bfb.get("strengths") or [])][:3]
            gaps      = [str(g) for g in (bfb.get("gaps")      or [])][:3]
        else:
            strengths = []
            gaps      = ["Section not present in profile"]
        buckets.append({
            "id":        bid,
            "label":     BUCKET_LABELS[bid],
            "score":     earned,
            "max":       mx,
            "pct":       round(earned / mx * 100) if mx else 0,
            "strengths": strengths,
            "gaps":      gaps,
            "evaluated": present,
        })

    computed_pts = sum(b["score"] for b in buckets)
    max_pts      = sum(BUCKET_MAX.values())
    overall      = round(computed_pts / max_pts * 100) if max_pts else 0

    hr = fb.get("headline_rewrite")
    headline_rewrite = None
    if isinstance(hr, dict):
        headline_rewrite = {
            "current":  str(hr.get("current",  "")),
            "improved": str(hr.get("improved", "")),
            "reason":   str(hr.get("reason",   "")),
        }

    fixes = []
    for f in (fb.get("priority_fixes") or []):
        if len(fixes) >= 5:
            break
        fix_section = str(f.get("section", ""))
        if fix_section == "visual":
            continue
        fixes.append({
            "section": fix_section,
            "issue":   str(f.get("issue",  "")),
            "fix":     str(f.get("fix",    "")),
            "example": str(f.get("example", "")),
            "impact":  str(f.get("impact", "Medium")),
        })

    return {
        "overall_score":    overall,
        "grade":            _grade(overall),
        "overall_verdict":  str(fb.get("overall_verdict", "")),
        "jd_fit_score":     max(0, min(100, int(fb.get("jd_fit_score", 0) or 0))),
        "buckets":          buckets,
        "top_strengths":    [str(s) for s in (fb.get("top_strengths") or [])][:3],
        "top_gaps":         [str(g) for g in (fb.get("top_gaps")      or [])][:3],
        "priority_fixes":   fixes,
        "headline_rewrite": headline_rewrite,
        "about_tips":       [str(t) for t in (fb.get("about_tips")    or [])][:4],
        "observations":     obs_root,
    }


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
    _EMAIL_PREFIX_RE = re.compile(r'^[\w.+\-]+@[\w.\-]+\s+', re.IGNORECASE)
    headline = lines[1] if len(lines) > 1 else ""
    for _i in range(1, min(5, len(lines))):
        if not _ADDRESS_RE.search(lines[_i].strip()):
            headline = _EMAIL_PREFIX_RE.sub('', lines[_i]).strip()
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

    # Infer skills from full PDF text (experience + about) since LinkedIn PDF only exports Top Skills sidebar
    _TECH_KEYWORDS = [
        "Python","SQL","Java","JavaScript","TypeScript","Go","Rust","C++","C#","R","Scala","Bash","Shell",
        "Spark","Kafka","Airflow","Flink","dbt","Hive","Presto","Trino",
        "AWS","GCP","Azure","S3","EC2","Lambda","SageMaker","Redshift","BigQuery","Snowflake",
        "Docker","Kubernetes","Terraform","Ansible","Helm","CI/CD","GitHub Actions","Jenkins",
        "MLflow","MLOps","Kubeflow","BentoML","Ray","Triton",
        "PyTorch","TensorFlow","Scikit-Learn","XGBoost","LightGBM","CatBoost","Keras","JAX",
        "LangChain","LangGraph","LlamaIndex","CrewAI","AutoGen","Haystack",
        "OpenAI","Claude","Gemini","Anthropic","Hugging Face","Mistral","Llama",
        "RAG","LLM","LLMs","GenAI","NLP","RLHF","SHAP","Explainable AI",
        "Vector","Pinecone","Weaviate","Chroma","FAISS","Qdrant","pgvector",
        "PostgreSQL","MySQL","MongoDB","Redis","Elasticsearch","DynamoDB","Cassandra",
        "Tableau","Power BI","Looker","Grafana","Prometheus","Datadog",
        "Playwright","Pytest","Selenium","FastAPI","Flask","Django","React","Next.js","Node.js",
        "Pandas","NumPy","Polars","SciPy","Matplotlib","Plotly",
        "Autoencoder","Transformer","BERT","GPT","Embedding","Fine-tuning",
        "AML","KYC","OCR","SHAP","MLflow","Celery",
    ]
    found: list[str] = []
    seen: set[str] = set()
    for kw in _TECH_KEYWORDS:
        pattern = rf"\b{re.escape(kw)}\b"
        if re.search(pattern, pdf_text, re.IGNORECASE) and kw.lower() not in seen:
            found.append(kw)
            seen.add(kw.lower())
    result["inferred_skills"] = found

    return result


# ─── Optimize prompt ──────────────────────────────────────────────────────────

def _build_optimize_prompt(pdf_text: str, score_result: dict, target_role: str) -> str:
    role_line = f"\nTARGET ROLE: {target_role}" if target_role else ""
    buckets_summary = json.dumps(
        [{"id": b["id"], "score": b["score"], "max": b["max"], "gaps": b.get("gaps", []), "evaluated": b.get("evaluated", True)}
         for b in score_result.get("buckets", [])],
        indent=2,
    )
    priority_fixes = json.dumps(score_result.get("priority_fixes", [])[:5], indent=2)
    observations   = json.dumps(score_result.get("observations", {}), indent=2)
    # Which sections are present
    present = {b["id"]: b.get("evaluated", True) for b in score_result.get("buckets", [])}
    absent_sections = [bid for bid, p in present.items() if not p]
    absent_note = (
        f"\nABSENT SECTIONS (do NOT optimize, return null for these): {', '.join(absent_sections)}"
        if absent_sections else ""
    )

    return f"""Optimize this LinkedIn profile across all 8 scoring dimensions.{role_line}{absent_note}

CURRENT SCORE: {score_result.get("overall_score", 0)}/100 — {score_result.get("grade", "")}

BUCKET GAPS:
{buckets_summary}

SCORING OBSERVATIONS (what the scorer detected):
{observations}

PRIORITY FIXES:
{priority_fixes}

STRICT CONSTRAINTS (no hallucination):
- ONLY use companies, titles, dates, metrics, tools that ACTUALLY APPEAR in the profile text below.
- Never fabricate achievements, certifications, employers, or degrees not in the text.
- For certifications you recommend: only suggest real, publicly available certifications relevant to the role.
- For recommendations: only name roles/companies that appear in the profile text.
- You may rephrase, keyword-optimize, and restructure existing content.

OPTIMIZATION INSTRUCTIONS:

HEADLINE: Keep under 220 chars. Lead with role + employer (if present). Add top tech skills with pipes.
  Good structure: "[Role] at [Company] | [Skill1], [Skill2] | [Domain] | [Platform]"

ABOUT: First sentence = impact claim with a metric (not "I am a..."). Add 3+ quantified achievements from the profile. Weave in 6+ role keywords. End with email CTA. Target 300-500 words.

EXPERIENCE: Every bullet = strong past-tense verb + tool + metric. If no metric, add scale context.

SKILLS: Reorder for search impact: core tech skills first, then platforms, then frameworks. Pull skills visible in experience bullets that are missing from the Skills section.

EDUCATION: Suggest exactly what's missing from the current education entry (degree type, field of study, GPA if applicable). Do NOT invent a new institution. If education is complete, say so.

PROOF:
- Recommendations: name specific roles/companies from profile the candidate should ask. Suggest what to highlight.
- Certifications: list 2-3 real certifications most relevant to the target role (e.g. AWS ML Specialty, Google Professional ML Engineer, DeepLearning.AI). Explain briefly why each matters.
- Portfolio: if no GitHub/portfolio link is detected, give exact instruction on what to add and where.

Return ONLY this JSON:
{{
  "headline": {{
    "current": "<exact headline from profile>",
    "optimized": "<rewritten — max 220 chars>",
    "reason": "<what improved>"
  }},
  "about": {{
    "current": "<exact about text>",
    "optimized": "<full rewritten about section>",
    "key_changes": ["<change 1>", "<change 2>", "<change 3>"]
  }},
  "experience": [
    {{
      "company": "<company>",
      "title": "<title>",
      "current_text": "<original bullets>",
      "optimized_bullets": ["<bullet>", "<bullet>", "<bullet>"],
      "key_changes": ["<change>"]
    }}
  ],
  "skills": {{
    "current": ["<skill>"],
    "reordered": ["<skill in search-priority order>"],
    "add_if_true": [{{"skill": "<name>", "reason": "<evidence from text>"}}]
  }},
  "education": {{
    "current": "<exact education text from profile>",
    "suggestions": ["<specific suggestion based on what is missing>"],
    "missing_fields": ["<degree_type|field_of_study|gpa|honors — only list what is actually absent>"]
  }},
  "proof": {{
    "recommendations": {{
      "action": "<exact instruction: who to message and what to ask them to highlight>",
      "who_to_ask": ["<Role at Company from profile>", "<Role at Company from profile>"]
    }},
    "certifications": {{
      "current": ["<cert visible in profile>"],
      "recommended": [
        {{"name": "<cert name>", "issuer": "<issuer>", "reason": "<why valuable for target role>"}},
        {{"name": "<cert name>", "issuer": "<issuer>", "reason": "<why valuable for target role>"}}
      ]
    }},
    "portfolio": "<exact instruction: add GitHub profile link / portfolio URL in the Featured section or Contact section>"
  }}
}}

LINKEDIN PROFILE TEXT:
---
{pdf_text[:8000]}
---
"""


# ─── Main analysis function ───────────────────────────────────────────────────

def analyze_linkedin_profile(
    pdf_text: str,
    job_description: str = "",
    target_role: str = "",
    on_step=None,
) -> dict[str, Any]:
    """Score a LinkedIn profile PDF across 7 buckets (images scored separately)."""
    def _step(name: str) -> None:
        if on_step:
            try: on_step(name)
            except Exception: pass

    key = _resolve_claude_key()
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")

    _step("scoring")
    parsed = _parse_sections(pdf_text)
    inferred = parsed.get("inferred_skills", [])
    prompt = _build_prompt(pdf_text, job_description, target_role, inferred)
    client = _make_anthropic_client(key)

    data: dict[str, Any] = {}
    last_error: str = ""
    clients_to_try = [client]
    fallback_key = _resolve_fallback_key()
    if fallback_key:
        clients_to_try.append(_make_anthropic_client(fallback_key))

    for cl in clients_to_try:
        for attempt in range(2):
            try:
                response = cl.messages.create(
                    model=LINKEDIN_MODEL,
                    max_tokens=5000,
                    temperature=0,
                    system=_SYSTEM,
                    messages=[{"role": "user", "content": prompt}],
                )
                raw = next((b.text for b in response.content if hasattr(b, "text")), "{}")
                if "Usage limit reached" in raw or "usage limit" in raw.lower():
                    last_error = f"Claude quota exceeded (model={LINKEDIN_MODEL})"
                    break  # try next client
                data = _parse(raw)
                if data:
                    break
                last_error = f"parse_failed: {raw[:300]}"
            except Exception as exc:
                last_error = f"{type(exc).__name__}: {exc}"
                break  # don't retry API errors — try next client immediately
        if data:
            break
    if not data:
        raise RuntimeError(f"AI API failed: {last_error or 'empty response from all clients'}")

    result = _build_result(data)
    _step("done")

    result["parsed_sections"] = parsed
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
    key = _resolve_claude_key()
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")

    client = _make_anthropic_client(key)
    prompt = _build_optimize_prompt(pdf_text, score_result, target_role)

    data: dict[str, Any] = {}
    clients_to_try = [client]
    fallback_key = _resolve_fallback_key()
    if fallback_key:
        clients_to_try.append(_make_anthropic_client(fallback_key))

    last_error: str = ""
    for cl in clients_to_try:
        try:
            for attempt in range(2):
                response = cl.messages.create(
                    model=LINKEDIN_MODEL,
                    max_tokens=5000,
                    temperature=0,
                    system=_OPTIMIZE_SYSTEM,
                    messages=[{"role": "user", "content": prompt}],
                )
                raw = next((b.text for b in response.content if hasattr(b, "text")), "{}")
                if "Usage limit reached" in raw or "usage limit" in raw.lower():
                    last_error = f"Claude quota exceeded (model={LINKEDIN_MODEL})"
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

    # Which sections were actually present in the profile (from score_result buckets)
    _present = {b["id"]: b.get("evaluated", True) for b in score_result.get("buckets", [])}

    # Normalise output — skip absent sections entirely
    result: dict[str, Any] = {}

    headline = data.get("headline")
    if isinstance(headline, dict) and _present.get("headline", True):
        result["headline"] = {
            "current":   str(headline.get("current",   "")),
            "optimized": str(headline.get("optimized", "")),
            "reason":    str(headline.get("reason",    "")),
        }

    about = data.get("about")
    if isinstance(about, dict) and _present.get("about", True):
        result["about"] = {
            "current":     str(about.get("current",   "")),
            "optimized":   str(about.get("optimized", "")),
            "key_changes": [str(c) for c in (about.get("key_changes") or [])][:6],
        }

    experience = data.get("experience")
    if isinstance(experience, list) and _present.get("experience", True):
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
    if isinstance(skills, dict) and _present.get("skills", True):
        result["skills"] = {
            "current":      [str(s) for s in (skills.get("current")   or [])][:30],
            "reordered":    [str(s) for s in (skills.get("reordered") or [])][:30],
            "add_if_true":  [
                {"skill": str(x.get("skill", "")), "reason": str(x.get("reason", ""))}
                for x in (skills.get("add_if_true") or [])
                if isinstance(x, dict)
            ][:10],
        }

    education = data.get("education")
    if isinstance(education, dict) and _present.get("education", True):
        result["education"] = {
            "current":        str(education.get("current", "")),
            "suggestions":    [str(s) for s in (education.get("suggestions")    or [])][:5],
            "missing_fields": [str(f) for f in (education.get("missing_fields") or [])][:5],
        }

    proof = data.get("proof")
    if isinstance(proof, dict):
        recs  = proof.get("recommendations") or {}
        certs = proof.get("certifications")  or {}
        result["proof"] = {
            "recommendations": {
                "action":    str(recs.get("action", "")),
                "who_to_ask": [str(w) for w in (recs.get("who_to_ask") or [])][:4],
            },
            "certifications": {
                "current": [str(c) for c in (certs.get("current") or [])][:6],
                "recommended": [
                    {"name": str(x.get("name", "")), "issuer": str(x.get("issuer", "")), "reason": str(x.get("reason", ""))}
                    for x in (certs.get("recommended") or [])
                    if isinstance(x, dict)
                ][:4],
            },
            "portfolio": str(proof.get("portfolio", "")),
        }

    return result
