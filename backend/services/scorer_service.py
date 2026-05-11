"""
scorer_service.py — Lightweight JD-resume scorer for real-time DB use.

No sentence-transformers or heavy ML. Uses:
  35% keyword density  (resume skills found in JD text)
  30% skills overlap   (Jaccard over skill sets)
  20% experience fit
  15% title alignment

Called from phase1_service after fan-out so every user_job_states row
gets match_score / matched_skills / missing_skills immediately.
"""
from __future__ import annotations

import re

# ──────────────────────────────────────────────────────────────────────────────
# Regex skill extractor (fallback when llm_skills not yet populated)
# ──────────────────────────────────────────────────────────────────────────────

_TECH_RE = re.compile(
    r"\b("
    r"Python|JavaScript|TypeScript|Java|Go|Golang|Rust|Ruby|C\+\+|C#|Swift|Kotlin|Scala|R|MATLAB|"
    r"React|Vue\.?js|Angular|Next\.?js|Svelte|Node\.?js|Express|"
    r"Django|Flask|FastAPI|Spring|Rails|Laravel|ASP\.NET|"
    r"PostgreSQL|MySQL|SQLite|MongoDB|Redis|Elasticsearch|DynamoDB|Cassandra|Neo4j|"
    r"AWS|Azure|GCP|Google Cloud|"
    r"Docker|Kubernetes|Terraform|Ansible|Helm|Jenkins|GitLab CI|GitHub Actions|"
    r"PyTorch|TensorFlow|Keras|JAX|scikit-learn|HuggingFace|Transformers|LangChain|LlamaIndex|"
    r"pandas|NumPy|SciPy|Matplotlib|Seaborn|"
    r"Apache Spark|Kafka|Airflow|dbt|Snowflake|BigQuery|Databricks|"
    r"GraphQL|REST|gRPC|Kafka|RabbitMQ|Celery|"
    r"Linux|Bash|PowerShell|Git|CI/CD|"
    r"Tableau|Power BI|Looker|"
    r"OpenAI|Claude|Anthropic|LLM|RAG|Vector|Embeddings"
    r")\b",
    re.IGNORECASE,
)


def _extract_skills_regex(text: str) -> set[str]:
    return {m.group(0).lower() for m in _TECH_RE.finditer(text)}


def _normalize(s: str) -> str:
    return re.sub(r"[^a-z0-9\s]", " ", s.lower()).strip()


def _skill_set(skills: list[str]) -> set[str]:
    return {_normalize(s) for s in (skills or []) if s and len(s.strip()) > 1}


# ──────────────────────────────────────────────────────────────────────────────
# Component scorers
# ──────────────────────────────────────────────────────────────────────────────

def _skills_score(resume: set[str], job: set[str]) -> float:
    if not resume or not job:
        return 0.5   # neutral when one side is empty
    matched = resume & job
    return len(matched) / len(resume | job)   # Jaccard


def _exp_score(resume_years: int, job_years_min: int) -> float:
    if job_years_min <= 0:
        return 1.0
    if resume_years <= 0:
        return 0.5   # unknown → neutral
    if resume_years >= job_years_min:
        return 1.0
    gap = job_years_min - resume_years
    return max(0.0, 1.0 - gap * 0.25)


def _title_score(resume_title: str, job_title: str) -> float:
    rt = set(_normalize(resume_title).split())
    jt = set(_normalize(job_title).split())
    stopwords = {"a", "an", "the", "and", "or", "of", "for", "in", "at", "to", "with"}
    rt -= stopwords
    jt -= stopwords
    if not rt or not jt:
        return 0.0
    return len(rt & jt) / len(rt | jt)


def _keyword_score(resume_skills: set[str], job_description: str) -> float:
    desc = _normalize(job_description)
    if not resume_skills or not desc:
        return 0.5
    hits = sum(1 for s in resume_skills if s in desc)
    return min(1.0, hits / max(1, len(resume_skills)))


def _extract_years_from_text(text: str) -> int:
    m = re.search(r"(\d+)\+?\s*(?:year|yr)", text, re.IGNORECASE)
    return int(m.group(1)) if m else 0


# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────

def score_job_for_user(
    job_title: str,
    job_description: str,
    job_llm_skills: list[str] | None,
    job_llm_years_min: int | None,
    resume_extraction: dict,
) -> tuple[float, list[str], list[str]]:
    """
    Score a single job against a user's resume_extraction dict.

    Returns:
        (score_0_to_1, matched_skills, missing_skills)
    """
    r_skills  = _skill_set(resume_extraction.get("skills") or [])
    r_years   = int(resume_extraction.get("years_exp") or 0)
    r_title   = str(resume_extraction.get("title") or "")

    # Job skills: prefer LLM-extracted, fall back to regex
    if job_llm_skills:
        j_skills = _skill_set(job_llm_skills)
    else:
        j_skills = _extract_skills_regex(job_description)

    # Job years_min
    j_years = int(job_llm_years_min or 0) or _extract_years_from_text(job_description)

    # Component scores
    kw     = _keyword_score(r_skills, job_description)
    skills = _skills_score(r_skills, j_skills)
    exp    = _exp_score(r_years, j_years)
    title  = _title_score(r_title, job_title)

    score = round(kw * 0.35 + skills * 0.30 + exp * 0.20 + title * 0.15, 4)

    matched = sorted(r_skills & j_skills) if j_skills else []
    missing = sorted(j_skills - r_skills) if j_skills else []

    return score, matched, missing
