"""
scorer_service.py — Domain-agnostic JD-resume scorer.

Works for ALL professions: tech, finance, healthcare, marketing, design,
admin, sales, law, art, education, and more.

Scoring model (weighted):
  40% TF-IDF cosine semantic similarity   (catches domain language, synonyms)
  25% skills precision on JD requirements (fuzzy — catches LangChain ≈ langchain)
  20% experience fit                      (years asked vs years found)
  15% title alignment                     (sequence similarity + word overlap)

Called from phase1_service after fan-out so every user_job_states row
gets match_score / matched_skills / missing_skills immediately.
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
    text = re.sub(r"<[^>]+>", " ", text)          # strip HTML
    text = re.sub(r"\*{1,3}(.*?)\*{1,3}", r"\1", text)  # markdown bold/italic
    text = re.sub(r"#{1,6}\s*", "", text)           # markdown headers
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)  # markdown links
    return re.sub(r"\s+", " ", text).strip()


def _normalize_skill(s: str) -> str:
    """Strip spaces, dashes, dots so 'LangChain' == 'lang-chain' == 'langchain'."""
    return re.sub(r"[\s\-\._]+", "", s.lower().strip())


def _skill_set(skills: list[str]) -> set[str]:
    return {_normalize_skill(s) for s in (skills or []) if s and len(s.strip()) > 1}


# ─────────────────────────────────────────────────────────────────────────────
# Domain-agnostic fallback skill extractor (no hardcoded tech list)
# ─────────────────────────────────────────────────────────────────────────────

def _extract_skills_fallback(text: str) -> set[str]:
    """
    Extracts candidate skill tokens without a hardcoded dictionary.
    Works for tech, finance, healthcare, marketing, design, admin, etc.
    Uses structural/linguistic signals: CamelCase, acronyms, hyphenated terms.
    """
    tokens: list[str] = []

    # CamelCase terms: LangChain, FastAPI, PostgreSQL, HumanResources
    tokens += re.findall(r"\b[A-Z][a-z]+(?:[A-Z][a-z]*)+\b", text)

    # ALL-CAPS acronyms 2–8 chars: SQL, CPA, PMP, NLP, AWS, MBA, CFA, GDPR
    tokens += re.findall(r"\b[A-Z]{2,8}\b", text)

    # Hyphenated technical terms: scikit-learn, end-to-end, full-stack, real-time
    tokens += re.findall(r"\b[a-zA-Z][a-zA-Z0-9]*(?:-[a-zA-Z0-9]+)+\b", text)

    # Dot-notation: Node.js, Vue.js, Next.js
    tokens += re.findall(r"\b[A-Za-z][A-Za-z0-9]*\.[jJ][sS]\b", text)

    # Special chars: C++, C#, F#
    tokens += re.findall(r"\b[A-Za-z]\+\+|\b[A-Za-z]#", text)

    # Slash combos: CI/CD, A/B, ML/DL
    tokens += re.findall(r"\b[A-Z][A-Z0-9]*/[A-Z][A-Z0-9]*\b", text)

    _NOISE = {
        "summary", "experience", "education", "skills", "projects",
        "technical", "professional", "key", "certifications", "awards",
        "responsibilities", "achievements", "languages", "interests",
        "requirements", "qualifications", "about", "overview", "note",
        "important", "salary", "benefits", "location", "equal", "opportunity",
    }

    seen: set[str] = set()
    result: set[str] = set()
    for t in tokens:
        n = t.lower().strip()
        if n and len(n) > 1 and n not in seen and n not in _NOISE:
            seen.add(n)
            result.add(n)
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Component scorers
# ─────────────────────────────────────────────────────────────────────────────

def _semantic_score(resume_text: str, job_description: str) -> float:
    """
    TF-IDF cosine similarity between JD and resume text (0.0–1.0).
    Uses sklearn only — no heavy ML models needed.
    Falls back to Dice coefficient if sklearn unavailable.
    """
    if not resume_text or not job_description:
        return 0.40

    # ── TF-IDF cosine (primary) ──────────────────────────────────────────────
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        corpus = [_clean(job_description)[:4000], _clean(resume_text)[:4000]]
        vec = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            max_features=6000,
            sublinear_tf=True,
        )
        tfidf = vec.fit_transform(corpus)
        score = float(cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0])
        return round(min(max(score, 0.0), 1.0), 4)
    except Exception:
        pass

    # ── Dice coefficient fallback ────────────────────────────────────────────
    try:
        def _tokens(t: str) -> set[str]:
            return set(re.findall(r"\b[a-z]{3,}\b", t.lower()))

        jd_t  = _tokens(job_description)
        res_t = _tokens(resume_text)
        if not jd_t or not res_t:
            return 0.40
        overlap = len(jd_t & res_t)
        # Scale up Dice (raw Dice is small on long docs) and cap at 1.0
        return round(min(2 * overlap / (len(jd_t) + len(res_t)) * 4, 1.0), 4)
    except Exception:
        return 0.40


def _skills_score(
    resume_skills: set[str],
    jd_skills: set[str],
) -> tuple[float, list[str], list[str]]:
    """
    Precision on JD requirements: what fraction of the JD's required skills
    does the candidate have?  Uses fuzzy matching so minor variants match.

    Much fairer than Jaccard — having MORE skills never hurts your score.
    """
    if not jd_skills:
        return 0.50, [], []

    matched: set[str] = set()
    missing: set[str] = set()

    for jd_key in jd_skills:
        found = False

        # 1. Exact normalized match
        if jd_key in resume_skills:
            matched.add(jd_key)
            continue

        # 2. Substring match (3+ chars) — "postgres" ⊂ "postgresql", "sql" ⊂ "mysql"
        for res_key in resume_skills:
            if len(jd_key) >= 3 and jd_key in res_key:
                matched.add(jd_key)
                found = True
                break
            if len(res_key) >= 3 and res_key in jd_key:
                # Only anchor-matched substrings: "sql" in "mysql" ✓, "ai" in "training" ✗
                if jd_key.startswith(res_key) or jd_key.endswith(res_key):
                    matched.add(jd_key)
                    found = True
                    break

        if found:
            continue

        # 3. Sequence similarity fallback (catches typos, plurals, abbreviations)
        for res_key in resume_skills:
            if difflib.SequenceMatcher(None, jd_key, res_key).ratio() >= 0.82:
                matched.add(jd_key)
                found = True
                break

        if not found:
            missing.add(jd_key)

    n = len(jd_skills)
    score = len(matched) / n if n > 0 else 0.50
    return score, sorted(matched), sorted(missing)


def _exp_score(resume_years: int, job_years_min: int) -> float:
    """Experience fit with a fair penalty curve."""
    if job_years_min <= 0:
        return 1.0
    if resume_years <= 0:
        return 0.50   # unknown → neutral

    gap = resume_years - job_years_min  # positive = over-qualified

    if gap >= 0:
        # Slight penalty only if massively over-qualified (2.5×+ with a real bar)
        if resume_years > job_years_min * 2.5 and job_years_min >= 2:
            return 0.80
        return 1.0

    # Under-qualified — gentle curve
    shortage = abs(gap)
    if shortage <= 1:
        return 0.85   # 1 yr short — often still hirable
    elif shortage <= 2:
        return 0.65   # 2 yrs short — borderline
    elif shortage <= 4:
        return 0.40   # significant gap
    else:
        return 0.15   # very large gap


def _title_score(resume_title: str, job_title: str) -> float:
    """Fuzzy title alignment: sequence similarity + word overlap bonus."""
    if not resume_title or not job_title:
        return 0.40

    jt = job_title.lower()
    rt = resume_title.lower()

    # Sequence similarity
    sim = difflib.SequenceMatcher(None, jt, rt).ratio()

    # Shared content words bonus
    stopwords = {"a", "an", "the", "and", "or", "of", "for", "in", "at", "to", "with"}
    jt_words = set(jt.split()) - stopwords
    rt_words = set(rt.split()) - stopwords
    if jt_words and rt_words:
        shared = jt_words & rt_words
        word_bonus = min(len(shared) * 0.10, 0.30)
    else:
        word_bonus = 0.0

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

    Returns:
        (score_0_to_1, matched_skills, missing_skills)
    """
    r_skills_raw = resume_extraction.get("skills") or []
    r_years      = int(resume_extraction.get("years_exp") or 0)
    r_title      = str(resume_extraction.get("title") or "")

    r_skills = _skill_set(r_skills_raw)

    # Job skills: prefer LLM-extracted, fall back to domain-agnostic regex
    if job_llm_skills:
        j_skills = _skill_set(job_llm_skills)
    else:
        j_skills = {_normalize_skill(s) for s in _extract_skills_fallback(job_description)}

    # Job years minimum
    j_years = int(job_llm_years_min or 0) or _extract_years_from_text(job_description)

    # Construct resume text for semantic scoring
    # Use raw text if provided, otherwise synthesize from extraction
    if resume_raw_text:
        sem_resume = resume_raw_text
    else:
        location = resume_extraction.get("location") or ""
        sem_resume = (
            f"{r_title}. "
            f"Skills: {', '.join(r_skills_raw)}. "
            f"{r_years} years experience. "
            f"{location}"
        )

    # ── Component scores ─────────────────────────────────────────────────────
    semantic               = _semantic_score(sem_resume, job_description)
    skill_pct, matched, missing = _skills_score(r_skills, j_skills)
    exp                    = _exp_score(r_years, j_years)
    title                  = _title_score(r_title, job_title)

    # ── Weighted composite: 40% semantic, 25% skills, 20% exp, 15% title ─────
    score = round(
        semantic   * 0.40 +
        skill_pct  * 0.25 +
        exp        * 0.20 +
        title      * 0.15,
        4,
    )

    return score, matched, missing
