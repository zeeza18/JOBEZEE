"""
scorer_service.py — Domain-agnostic JD-resume scorer.

Works for ALL professions: tech, finance, healthcare, marketing, design,
admin, sales, law, art, education, and more.

Scoring model (weighted):
  40% TF-IDF cosine semantic similarity   (catches domain language, synonyms)
  25% skills precision on JD requirements (fuzzy — preserves original display names)
  20% experience fit                      (years asked vs years found)
  15% title alignment                     (sequence similarity + word overlap)
"""
from __future__ import annotations

import difflib
import re


# ─────────────────────────────────────────────────────────────────────────────
# Text helpers
# ─────────────────────────────────────────────────────────────────────────────

def _clean(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\*{1,3}(.*?)\*{1,3}", r"\1", text)
    text = re.sub(r"#{1,6}\s*", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    return re.sub(r"\s+", " ", text).strip()


def _normalize_skill(s: str) -> str:
    """Normalize for comparison only — never stored or displayed."""
    return re.sub(r"[\s\-\._/]+", "", s.lower().strip())


def _build_skill_map(skills: list[str]) -> dict[str, str]:
    """
    Returns {normalized_key: original_display_name}.
    Preserves the original name (e.g. 'CI/CD', 'Next.js', 'GKE') so
    matched_skills / missing_skills stored in the DB are human-readable.
    """
    result: dict[str, str] = {}
    for s in (skills or []):
        s = s.strip()
        if s and len(s) > 1:
            n = _normalize_skill(s)
            if n and n not in result:
                result[n] = s
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Domain-agnostic fallback skill extractor (no hardcoded tech list)
# ─────────────────────────────────────────────────────────────────────────────

def _extract_skills_fallback(text: str) -> list[str]:
    """
    Regex fallback used ONLY when the LLM (Groq) is unavailable.
    The LLM handles all filtering; this is a best-effort safety net.
    Works for all professions — no domain-specific hardcoding.
    """
    tokens: list[str] = []

    # CamelCase named tools: LangChain, FastAPI, PostgreSQL, TensorFlow
    tokens += re.findall(r"\b[A-Z][a-z]+(?:[A-Z][a-z]*)+\b", text)

    # 3–6 char ALL-CAPS acronyms: SQL, AWS, GCP, PMP, CPA, SAP, RAG, HIPAA
    # (3-char min avoids grabbing 2-char English words: IT, OR, AI, ML, US)
    tokens += re.findall(r"\b[A-Z]{3,6}\b", text)

    # Named slash-compounds: CI/CD, REST/JSON, TS/SCI
    tokens += re.findall(r"\b[A-Z][A-Za-z0-9]{1,5}/[A-Z][A-Za-z0-9]{1,5}\b", text)

    # Hyphenated: scikit-learn, end-to-end, full-stack, LLM-based
    tokens += re.findall(r"\b[a-zA-Z][a-zA-Z0-9]*(?:-[a-zA-Z0-9]+)+\b", text)

    # JS dot-notation: Node.js, Vue.js, Next.js
    tokens += re.findall(r"\b[A-Za-z][A-Za-z0-9]*\.[jJ][sS]\b", text)

    # Special: C++, C#, F#
    tokens += re.findall(r"\b[A-Za-z]\+\+|\b[A-Za-z]#", text)

    seen: set[str] = set()
    result: list[str] = []
    for t in tokens:
        n = t.lower().strip()
        if n and len(n) > 1 and n not in seen:
            seen.add(n)
            result.append(t)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Component scorers
# ─────────────────────────────────────────────────────────────────────────────

def _semantic_score(resume_text: str, job_description: str) -> float:
    """
    Domain-vocabulary coverage: what fraction of meaningful JD words
    appear anywhere in the resume.

    TF-IDF cosine was 5-12% for all JD/resume pairs (expected — different
    document styles and lengths make cosine inherently low). Replaced with
    JD-coverage: count unique content words from JD that exist in resume,
    divided by unique JD content words. This gives 30-80% range which is
    meaningful for weighting.
    """
    if not resume_text or not job_description:
        return 0.50

    # Meaningful words: 4+ chars, not pure stopwords
    _STOP = {
        "that", "this", "with", "have", "from", "they", "will", "your",
        "what", "their", "been", "more", "when", "about", "into", "than",
        "then", "them", "were", "also", "each", "such", "very", "over",
        "both", "after", "well", "even", "most", "work", "team", "role",
        "good", "able", "must", "should", "would", "could",
    }

    def _words(text: str) -> set[str]:
        return {w for w in re.findall(r"\b[a-z]{4,}\b", text.lower()) if w not in _STOP}

    jd_words  = _words(job_description)
    res_words = _words(resume_text)

    if not jd_words:
        return 0.50

    overlap = len(jd_words & res_words)
    coverage = overlap / len(jd_words)
    return round(min(coverage * 1.4, 1.0), 4)   # scale up slightly; cap at 1.0


def _skills_score(
    resume_skills_raw: list[str],
    jd_skills_raw: list[str],
) -> tuple[float, list[str], list[str]]:
    """
    Precision on JD requirements with fuzzy matching.
    Returns ORIGINAL display names (CI/CD, Next.js, GKE) — never the normalized keys.
    Having more resume skills than the JD requires never lowers your score.
    """
    if not jd_skills_raw:
        return 0.50, [], []

    jd_map  = _build_skill_map(jd_skills_raw)    # {norm: original}
    res_set = set(_build_skill_map(resume_skills_raw).keys())  # norm keys only

    matched_display: list[str] = []
    missing_display: list[str] = []

    for jd_norm, jd_orig in jd_map.items():
        found = False

        # 1. Exact normalized match
        if jd_norm in res_set:
            matched_display.append(jd_orig)
            continue

        # 2. Substring match — "postgres" ⊂ "postgresql", "ai" ⊂ "aiengineer"
        for res_norm in res_set:
            if len(jd_norm) >= 2 and jd_norm in res_norm:
                matched_display.append(jd_orig)
                found = True
                break
            if len(res_norm) >= 3 and res_norm in jd_norm:
                if jd_norm.startswith(res_norm) or jd_norm.endswith(res_norm):
                    matched_display.append(jd_orig)
                    found = True
                    break

        if found:
            continue

        # 3. Sequence similarity (0.82 threshold)
        for res_norm in res_set:
            if difflib.SequenceMatcher(None, jd_norm, res_norm).ratio() >= 0.82:
                matched_display.append(jd_orig)
                found = True
                break

        if not found:
            missing_display.append(jd_orig)

    n = len(jd_map)
    score = len(matched_display) / n if n > 0 else 0.50
    return score, sorted(matched_display), sorted(missing_display)


def _exp_score(resume_years: int, job_years_min: int) -> float:
    if job_years_min <= 0:
        return 1.0
    if resume_years <= 0:
        return 0.50
    gap = resume_years - job_years_min
    if gap >= 0:
        if resume_years > job_years_min * 2.5 and job_years_min >= 2:
            return 0.80
        return 1.0
    shortage = abs(gap)
    if shortage <= 1:   return 0.85
    elif shortage <= 2: return 0.65
    elif shortage <= 4: return 0.40
    else:               return 0.15


def _title_score(resume_title: str, job_title: str) -> float:
    if not resume_title or not job_title:
        return 0.40
    jt = job_title.lower()
    rt = resume_title.lower()
    sim = difflib.SequenceMatcher(None, jt, rt).ratio()
    stopwords = {"a", "an", "the", "and", "or", "of", "for", "in", "at", "to", "with"}
    jt_words = set(jt.split()) - stopwords
    rt_words = set(rt.split()) - stopwords
    word_bonus = min(len(jt_words & rt_words) * 0.10, 0.30) if jt_words and rt_words else 0.0
    return round(min(sim + word_bonus, 1.0), 4)


def _extract_years_from_text(text: str) -> int:
    m = re.search(r"(\d+)\+?\s*(?:year|yr)", text, re.IGNORECASE)
    return int(m.group(1)) if m else 0


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def score_job_for_user(
    job_title: str,
    job_description: str,
    job_llm_skills: list[str] | None,
    job_llm_years_min: int | None,
    resume_extraction: dict,
    resume_raw_text: str = "",
) -> tuple[float, list[str], list[str]]:
    """
    Score a single job against a user's resume_extraction dict.
    Returns: (score_0_to_1, matched_skills, missing_skills)
    Both matched_skills and missing_skills use original display names.
    """
    r_skills_raw = resume_extraction.get("skills") or []
    r_years      = int(resume_extraction.get("years_exp") or 0)
    r_title      = str(resume_extraction.get("title") or "")

    # Job skills: prefer LLM-extracted originals, fall back to regex
    j_skills_raw: list[str] = list(job_llm_skills) if job_llm_skills else _extract_skills_fallback(job_description)

    j_years = int(job_llm_years_min or 0) or _extract_years_from_text(job_description)

    # Construct resume text for semantic scoring
    if resume_raw_text:
        sem_resume = resume_raw_text
    else:
        location = resume_extraction.get("location") or ""
        sem_resume = f"{r_title}. Skills: {', '.join(r_skills_raw)}. {r_years} years experience. {location}"

    # Component scores
    skill_pct, matched, missing = _skills_score(r_skills_raw, j_skills_raw)
    exp                         = _exp_score(r_years, j_years)
    title                       = _title_score(r_title, job_title)

    jd_words = len((job_description or "").split())
    if jd_words < 30:
        # No/minimal JD text (e.g. Workday listings) — drop semantic component,
        # redistribute its 40% weight across the remaining three.
        score = round(
            skill_pct * 0.50 +
            exp       * 0.30 +
            title     * 0.20,
            4,
        )
    else:
        semantic = _semantic_score(sem_resume, job_description)
        score = round(
            semantic  * 0.40 +
            skill_pct * 0.25 +
            exp       * 0.20 +
            title     * 0.15,
            4,
        )

    return score, matched, missing
