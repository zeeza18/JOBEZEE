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
    Extracts candidate skill tokens without a hardcoded dictionary.
    Returns original-cased tokens (not normalized) so display names are clean.
    Works for tech, finance, healthcare, marketing, design, admin, etc.
    """
    tokens: list[str] = []

    # CamelCase terms: LangChain, FastAPI, PostgreSQL
    tokens += re.findall(r"\b[A-Z][a-z]+(?:[A-Z][a-z]*)+\b", text)

    # ALL-CAPS acronyms 2–8 chars: SQL, CPA, PMP, NLP, AWS, MBA, CFA, GKE
    tokens += re.findall(r"\b[A-Z]{2,8}\b", text)

    # Hyphenated / slash terms preserved: CI/CD, end-to-end, full-stack
    tokens += re.findall(r"\b[A-Z][A-Za-z0-9]*/[A-Z][A-Za-z0-9]*\b", text)   # CI/CD
    tokens += re.findall(r"\b[a-zA-Z][a-zA-Z0-9]*(?:-[a-zA-Z0-9]+)+\b", text)  # scikit-learn

    # Dot-notation: Node.js, Vue.js
    tokens += re.findall(r"\b[A-Za-z][A-Za-z0-9]*\.[jJ][sS]\b", text)

    # Special: C++, C#, F#
    tokens += re.findall(r"\b[A-Za-z]\+\+|\b[A-Za-z]#", text)

    _NOISE = {
        "summary", "experience", "education", "skills", "projects",
        "technical", "professional", "key", "certifications", "awards",
        "responsibilities", "achievements", "languages", "interests",
        "requirements", "qualifications", "about", "overview", "note",
        "important", "salary", "benefits", "location", "equal", "opportunity",
    }

    seen: set[str] = set()
    result: list[str] = []
    for t in tokens:
        n = t.lower().strip()
        if n and len(n) > 1 and n not in seen and n not in _NOISE:
            seen.add(n)
            result.append(t)   # keep original casing
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Component scorers
# ─────────────────────────────────────────────────────────────────────────────

def _semantic_score(resume_text: str, job_description: str) -> float:
    """TF-IDF cosine similarity. Falls back to Dice coefficient."""
    if not resume_text or not job_description:
        return 0.40

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        corpus = [_clean(job_description)[:4000], _clean(resume_text)[:4000]]
        vec = TfidfVectorizer(
            stop_words="english", ngram_range=(1, 2),
            max_features=6000, sublinear_tf=True,
        )
        tfidf = vec.fit_transform(corpus)
        return round(float(cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]), 4)
    except Exception:
        pass

    try:
        def _tok(t: str) -> set[str]:
            return set(re.findall(r"\b[a-z]{3,}\b", t.lower()))
        jd_t  = _tok(job_description)
        res_t = _tok(resume_text)
        if not jd_t or not res_t:
            return 0.40
        overlap = len(jd_t & res_t)
        return round(min(2 * overlap / (len(jd_t) + len(res_t)) * 4, 1.0), 4)
    except Exception:
        return 0.40


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

        # 2. Substring match (3+ chars) — "postgres" ⊂ "postgresql"
        for res_norm in res_set:
            if len(jd_norm) >= 3 and jd_norm in res_norm:
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

    # Job skills: prefer LLM-extracted originals, fall back to domain-agnostic regex
    j_skills_raw: list[str] = list(job_llm_skills) if job_llm_skills else _extract_skills_fallback(job_description)

    j_years = int(job_llm_years_min or 0) or _extract_years_from_text(job_description)

    # Construct resume text for semantic scoring
    if resume_raw_text:
        sem_resume = resume_raw_text
    else:
        location = resume_extraction.get("location") or ""
        sem_resume = f"{r_title}. Skills: {', '.join(r_skills_raw)}. {r_years} years experience. {location}"

    # Component scores
    semantic              = _semantic_score(sem_resume, job_description)
    skill_pct, matched, missing = _skills_score(r_skills_raw, j_skills_raw)
    exp                   = _exp_score(r_years, j_years)
    title                 = _title_score(r_title, job_title)

    score = round(
        semantic  * 0.40 +
        skill_pct * 0.25 +
        exp       * 0.20 +
        title     * 0.15,
        4,
    )

    return score, matched, missing
