"""
Phase 1 runner service.

Converts a UserProfile (DB row) into a Phase 1 UserPreferences object,
executes all three discovery sources, deduplicates, then bulk-inserts
PulledJob rows into the database.

Runs inside a FastAPI BackgroundTask so the HTTP response is instant.
"""
from __future__ import annotations

import asyncio
import logging
import re
import sys
import traceback as _traceback
import uuid
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from urllib.parse import urlparse

log = logging.getLogger(__name__)

# ── Phase 1 is one directory up from JOBEZEE/backend/ ─────────────────────────
_REPO_ROOT = Path(__file__).resolve().parents[3]   # …/RESUME-MAKER
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

# ── Lazy-import Phase 1 so missing deps don't break the whole app ─────────────
try:
    from JOBEZEE.PHASE1_JOB_SEARCH import (  # type: ignore
        JobRecord,
        UserPreferences,
        SearchFilters,
        deduplicate,
        search_boards,
    )
    _PHASE1_AVAILABLE = True
    _WORKDAY_AVAILABLE = False
    _SMARTEXTRACT_AVAILABLE = False

    try:
        from JOBEZEE.PHASE1_JOB_SEARCH import search_workday  # type: ignore
        _WORKDAY_AVAILABLE = True
    except Exception as _we:
        log.info("Workday search not available (%s)", _we)

    try:
        from JOBEZEE.PHASE1_JOB_SEARCH import search_smart, LLMClient  # type: ignore
        _SMARTEXTRACT_AVAILABLE = True
    except Exception as _se:
        log.info("SmartExtract not available (%s)", _se)

except Exception as _e:
    log.warning("Phase 1 not importable (%s) — search will run in mock mode", _e)
    _PHASE1_AVAILABLE = False
    _WORKDAY_AVAILABLE = False
    _SMARTEXTRACT_AVAILABLE = False


# ---------------------------------------------------------------------------
# In-memory guard — prevents concurrent Phase 1 runs for the same profile
# ---------------------------------------------------------------------------

_RUNNING_PROFILES: set[str] = set()


# ---------------------------------------------------------------------------
# Experience-level → auto exclude title keywords
# ---------------------------------------------------------------------------

_LEVEL_EXCLUDES: dict[str, list[str]] = {
    "entry":     ["director", "vp", "vice president", "head of", "chief",
                  "principal", "staff engineer", "distinguished"],
    "mid":       ["intern", "internship", "director", "vp", "vice president",
                  "chief", "head of", "distinguished"],
    "senior":    ["intern", "internship", "junior", "entry level", "entry-level"],
    "executive": ["intern", "internship", "junior", "entry level", "entry-level",
                  "associate"],
}


def _exclude_for_level(level: str) -> list[str]:
    return list(_LEVEL_EXCLUDES.get((level or "").lower(), []))


# ---------------------------------------------------------------------------
# Known foreign cities that appear WITHOUT a country name in job postings.
# Maps lowercase city name → lowercase Indeed country code.
# Used by _passes_country() to reject city-only locations in wrong countries.
# ---------------------------------------------------------------------------

_MAJOR_CITY_COUNTRY: dict[str, str] = {
    # ── India ── (most common offender; LinkedIn/Workday often omits "India")
    "kolkata":      "india", "calcutta":    "india",
    "bengaluru":    "india", "bangalore":   "india",
    "hyderabad":    "india", "pune":        "india",
    "chennai":      "india", "madras":      "india",
    "mumbai":       "india", "bombay":      "india",
    "gurgaon":      "india", "gurugram":    "india",
    "noida":        "india", "ahmedabad":   "india",
    "kochi":        "india", "cochin":      "india",
    "coimbatore":   "india", "jaipur":      "india",
    "chandigarh":   "india", "lucknow":     "india",
    "indore":       "india", "nagpur":      "india",
    "bhopal":       "india", "vizag":       "india",
    "visakhapatnam":"india", "trivandrum":  "india",
    "thiruvananthapuram":"india",

    # ── Canada ──
    "toronto":      "canada", "vancouver":  "canada",
    "montreal":     "canada", "calgary":    "canada",
    "ottawa":       "canada", "edmonton":   "canada",
    "winnipeg":     "canada", "quebec":     "canada",
    "hamilton":     "canada", "waterloo":   "canada",

    # ── United Kingdom ── (use full name; "uk" is len=2, not in _non_target_set)
    "london":       "united kingdom", "manchester":  "united kingdom",
    "birmingham":   "united kingdom", "edinburgh":   "united kingdom",
    "glasgow":      "united kingdom", "bristol":     "united kingdom",
    "leeds":        "united kingdom", "liverpool":   "united kingdom",
    "sheffield":    "united kingdom", "cambridge":   "united kingdom",
    "oxford":       "united kingdom", "belfast":     "united kingdom",
    "uxbridge":     "united kingdom", "reading":     "united kingdom",

    # ── Germany ──
    "berlin":       "germany", "munich":      "germany",
    "hamburg":      "germany", "frankfurt":   "germany",
    "cologne":      "germany", "stuttgart":   "germany",
    "dusseldorf":   "germany", "düsseldorf":  "germany",
    "leipzig":      "germany", "dresden":     "germany",
    "nuremberg":    "germany", "hannover":    "germany",

    # ── France ──
    "paris":        "france", "lyon":       "france",
    "marseille":    "france", "toulouse":   "france",
    "bordeaux":     "france", "nantes":     "france",
    "nice":         "france", "strasbourg": "france",
    "rennes":       "france", "grenoble":   "france",

    # ── Netherlands ──
    "amsterdam":    "netherlands", "rotterdam":  "netherlands",
    "eindhoven":    "netherlands", "utrecht":    "netherlands",
    "the hague":    "netherlands", "hague":      "netherlands",

    # ── Spain ──
    "madrid":       "spain", "barcelona":  "spain",
    "valencia":     "spain", "seville":    "spain",
    "bilbao":       "spain", "malaga":     "spain",

    # ── Italy ──
    "rome":         "italy", "milan":      "italy",
    "turin":        "italy", "bologna":    "italy",
    "florence":     "italy", "naples":     "italy",

    # ── Switzerland ──
    "zurich":       "switzerland", "geneva":   "switzerland",
    "basel":        "switzerland", "bern":     "switzerland",
    "lausanne":     "switzerland",

    # ── Sweden ──
    "stockholm":    "sweden", "gothenburg": "sweden",
    "malmo":        "sweden", "Uppsala":    "sweden",

    # ── Poland ──
    "warsaw":       "poland", "krakow":     "poland",
    "wroclaw":      "poland", "poznan":     "poland",
    "gdansk":       "poland", "katowice":   "poland",

    # ── Romania ──
    "bucharest":    "romania", "cluj":       "romania",
    "timisoara":    "romania", "iasi":       "romania",

    # ── Portugal ──
    "lisbon":       "portugal", "porto":     "portugal",
    "braga":        "portugal",

    # ── Ireland ──
    "dublin":       "ireland", "cork":       "ireland",
    "galway":       "ireland",

    # ── Austria ──
    "vienna":       "austria", "graz":       "austria",
    "linz":         "austria",

    # ── Belgium ──
    "brussels":     "belgium", "antwerp":    "belgium",
    "ghent":        "belgium",

    # ── Denmark ──
    "copenhagen":   "denmark", "aarhus":     "denmark",

    # ── Norway ──
    "oslo":         "norway", "bergen":      "norway",

    # ── Finland ──
    "helsinki":     "finland", "tampere":    "finland",
    "espoo":        "finland",

    # ── Czech Republic ──
    "prague":       "czech republic", "brno":  "czech republic",

    # ── Hungary ──
    "budapest":     "hungary", "debrecen":   "hungary",

    # ── Greece ──
    "athens":       "greece", "thessaloniki":"greece",

    # ── Israel (not in INDEED_COUNTRY_CODES — use sentinel "israel") ──
    "tel aviv":     "israel", "jerusalem":   "israel",
    "haifa":        "israel", "herzliya":    "israel",
    "raanana":      "israel", "petah tikva": "israel",
    "beersheba":    "israel",

    # ── Turkey ──
    "istanbul":     "turkey", "ankara":      "turkey",
    "izmir":        "turkey",

    # ── Ukraine ──
    "kyiv":         "ukraine", "kharkiv":    "ukraine",
    "lviv":         "ukraine", "odessa":     "ukraine",

    # ── Australia ──
    "sydney":       "australia", "melbourne":"australia",
    "brisbane":     "australia", "perth":    "australia",
    "adelaide":     "australia", "canberra": "australia",

    # ── New Zealand ──
    "auckland":     "new zealand", "wellington":"new zealand",
    "christchurch": "new zealand",

    # ── Singapore ──
    "singapore":    "singapore",

    # ── Japan ──
    "tokyo":        "japan", "osaka":       "japan",
    "kyoto":        "japan", "yokohama":    "japan",

    # ── South Korea ──
    "seoul":        "south korea", "busan":   "south korea",
    "incheon":      "south korea",

    # ── China ──
    "beijing":      "china", "shanghai":    "china",
    "shenzhen":     "china", "guangzhou":   "china",
    "chengdu":      "china", "hangzhou":    "china",

    # ── Hong Kong ──
    "hong kong":    "hong kong",

    # ── Taiwan ──
    "taipei":       "taiwan",

    # ── Malaysia ──
    "kuala lumpur": "malaysia", "petaling jaya":"malaysia",

    # ── Philippines ──
    "manila":       "philippines", "cebu":  "philippines",
    "makati":       "philippines",

    # ── Pakistan ──
    "karachi":      "pakistan", "lahore":   "pakistan",
    "islamabad":    "pakistan",

    # ── UAE ──
    "dubai":        "uae", "abu dhabi":    "uae",
    "sharjah":      "uae",

    # ── Saudi Arabia ──
    "riyadh":       "saudi arabia", "jeddah":"saudi arabia",

    # ── Qatar ──
    "doha":         "qatar",

    # ── Egypt ──
    "cairo":        "egypt", "alexandria":  "egypt",

    # ── South Africa ──
    "johannesburg": "south africa", "cape town":"south africa",
    "durban":       "south africa", "pretoria": "south africa",

    # ── Nigeria ──
    "lagos":        "nigeria", "abuja":     "nigeria",

    # ── Brazil ──
    "sao paulo":    "brazil", "rio de janeiro":"brazil",
    "belo horizonte":"brazil", "curitiba":  "brazil",

    # ── Argentina ──
    "buenos aires": "argentina", "cordoba":  "argentina",

    # ── Colombia ──
    "bogota":       "colombia", "medellin":  "colombia",
    "bogotá":       "colombia",

    # ── Chile ──
    "santiago":     "chile",

    # ── Mexico ──
    "mexico city":  "mexico", "guadalajara":"mexico",
    "monterrey":    "mexico",
}

# Countries not in INDEED_COUNTRY_CODES that still appear in job listings.
# These get merged into _non_target_set after the main build loop.
_EXTRA_FOREIGN_COUNTRIES: frozenset[str] = frozenset({
    # ── NOT in INDEED_COUNTRY_CODES ─────────────────────────────────────────
    "china", "prc",          # People's Republic of China + abbreviation
    "israel", "turkey", "ukraine", "vietnam", "indonesia", "egypt",
    "kenya", "ghana", "ethiopia", "morocco", "tunisia", "czechia",
    "slovakia", "croatia", "bulgaria", "serbia", "lithuania",
    "latvia", "estonia", "iceland", "luxembourg", "malta", "cyprus",
    "peru", "ecuador", "uruguay", "venezuela", "bolivia", "paraguay",
    "russia", "belarus", "moldova", "georgia", "armenia", "azerbaijan",
    "kazakhstan", "uzbekistan", "jordan", "lebanon", "iran", "iraq",
    "cambodia", "myanmar", "bangladesh", "sri lanka", "nepal", "tibet",
})


# ---------------------------------------------------------------------------
# Internal DB helpers (sync-compat layer for background threads)
# ---------------------------------------------------------------------------

async def _save_jobs(
    jobs           : list[Any],
    profile_id     : uuid.UUID,
    session_id     : str,
) -> int:
    """
    Insert only genuinely new PulledJob rows (dedup against existing DB records).

    Jobs whose URL already exists in pulled_jobs for this user are skipped so
    that the 3-hour auto-search never creates duplicates and existing statuses
    (saved, applied, etc.) are preserved.  Only brand-new URLs land as "new".
    """
    from ..database import AsyncSessionLocal
    from ..models import PulledJob
    from sqlalchemy import select

    BATCH_SIZE = 10

    # Pre-load the full set of URLs already stored for this user so we can
    # skip duplicates without a per-row DB query.
    async with AsyncSessionLocal() as db:
        existing_result = await db.execute(
            select(PulledJob.url).where(PulledJob.user_profile_id == profile_id)
        )
        existing_urls: set[str] = {row[0] for row in existing_result.fetchall() if row[0]}

    async with AsyncSessionLocal() as db:
        inserted = 0
        skipped  = 0
        for rec in jobs:
            url = (getattr(rec, "job_url", "") or getattr(rec, "url", "") or "").strip()[:1000]
            if url and url in existing_urls:
                skipped += 1
                continue

            # Build salary display text
            smin = getattr(rec, "min_amount", None) or getattr(rec, "salary_min", None)
            smax = getattr(rec, "max_amount", None) or getattr(rec, "salary_max", None)
            cur  = getattr(rec, "currency",   "USD") or "USD"

            if smin and smax:
                salary_text = f"{cur} {int(smin):,} – {int(smax):,}"
            elif smin:
                salary_text = f"{cur} {int(smin):,}+"
            else:
                salary_text = ""

            job = PulledJob(
                id                = uuid.uuid4(),
                user_profile_id   = profile_id,
                search_session_id = session_id,
                title             = (getattr(rec, "title",       "") or "")[:300],
                company           = (getattr(rec, "company",     "") or "")[:200],
                location          = (getattr(rec, "location",    "") or "")[:200],
                country           = (getattr(rec, "country",     "") or "")[:100],
                url               = url,
                description       = getattr(rec, "description",  "") or "",
                job_type          = str(getattr(rec, "job_type", "") or ""),
                salary_min        = smin,
                salary_max        = smax,
                salary_currency   = cur[:10],
                salary_text       = salary_text[:200],
                source            = (getattr(rec, "source", "") or "jobspy")[:100],
                site              = (getattr(rec, "site",   "") or "")[:100],
                posted_at         = str(getattr(rec, "date_posted", "") or ""),
                skills            = [],
                status            = "new",
            )
            db.add(job)
            if url:
                existing_urls.add(url)   # prevent dupes within the same batch
            inserted += 1
            if inserted % BATCH_SIZE == 0:
                log.info("[Phase1] session=%s commit batch %d (skipped %d dupes so far)",
                         session_id, inserted, skipped)
                await db.commit()
                await _update_session(session_id, "running", inserted, mark_finished=False)
        await db.commit()
        log.info("[Phase1] session=%s final: inserted=%d skipped_dupes=%d",
                 session_id, inserted, skipped)
        await _update_session(session_id, "running", inserted, mark_finished=False)
    return inserted


async def _update_session(
    session_id   : str,
    status       : str,
    jobs_found   : int = 0,
    error        : str = "",
    mark_finished: bool = True,
) -> None:
    from ..database import AsyncSessionLocal
    from ..models import SearchSession

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            __import__("sqlalchemy", fromlist=["select"]).select(SearchSession)
            .where(SearchSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if session:
            session.status      = status
            session.jobs_found  = jobs_found
            session.error       = error
            if mark_finished and status != "running":
                session.finished_at = datetime.now(timezone.utc)
            await db.commit()


# ---------------------------------------------------------------------------
# Build UserPreferences from a UserProfile DB row
# ---------------------------------------------------------------------------

import re as _re

_LOC_COUNTRY_HINTS: list[tuple[str, str]] = [
    # USA — match "usa", "u.s.", "united states", ", us" suffix, "remote, us"
    (r'\busa\b|u\.s\.a?\.?|united states|,\s*us\b|\bremote,?\s*us\b', "USA"),
    # UK
    (r'\bunited kingdom\b|\buk\b|u\.k\.', "United Kingdom"),
    # Canada
    (r'\bcanada\b', "Canada"),
    # Australia
    (r'\baustralia\b', "Australia"),
    # Germany
    (r'\bgermany\b|\bdeutschland\b', "Germany"),
    # India
    (r'\bindia\b', "India"),
    # France
    (r'\bfrance\b', "France"),
    # Netherlands
    (r'\bnetherlands\b|\bholland\b', "Netherlands"),
]

def _infer_countries_from_locations(locs: list[str]) -> list[str]:
    """Infer target countries from preferred_location strings when preferred_countries is not set."""
    found: set[str] = set()
    for loc in (locs or []):
        l = loc.lower()
        for pattern, country in _LOC_COUNTRY_HINTS:
            if _re.search(pattern, l):
                found.add(country)
    return list(found)


def build_preferences(profile: Any) -> "UserPreferences":
    """
    Map all UserProfile DB fields to a Phase 1 UserPreferences object.

    Defaults are chosen to be maximally useful without any profile data.
    """
    # Countries: use explicit field; if empty, infer from location strings.
    # This ensures jobs from Brazil/Europe are filtered out when user sets
    # preferred_locations like "Remote, US" but leaves preferred_countries blank.
    countries = list(profile.preferred_countries or [])
    if not countries and not (profile.preferred_regions or []):
        countries = _infer_countries_from_locations(profile.preferred_locations or [])

    return UserPreferences(
        # ── What to search ─────────────────────────────────────────────────
        job_titles       = profile.desired_roles       or ["software engineer"],

        # ── Where to search ────────────────────────────────────────────────
        locations        = profile.preferred_locations or [],
        countries        = countries,
        regions          = profile.preferred_regions   or [],

        # remote_ok is True for "remote", "hybrid", or "any"
        remote_ok        = (profile.remote_preference or "hybrid") in (
                               "remote", "hybrid", "any"
                           ),

        # ── Role type & level ──────────────────────────────────────────────
        # job_type is a single string in DB; Phase 1 expects a list
        job_types        = [profile.job_type] if profile.job_type else [],
        experience_level = profile.experience_level or "mid",
        industries       = profile.industries         or [],

        # ── Auto-exclude titles that don't match experience level ──────────
        exclude_titles   = _exclude_for_level(profile.experience_level or "mid"),

        # ── Salary: stored in profile but not used as a search filter ──────
        # (salary filters reduce results significantly; we post-filter instead)

        # ── Search tuning ──────────────────────────────────────────────────
        hours_old        = profile.hours_old          or 72,
        results_per_site = profile.results_per_site   or 50,
    )


# ---------------------------------------------------------------------------
# Title filter helper
# ---------------------------------------------------------------------------

def _passes_board_title(
    title: str,
    exclude_titles: list[str],
    role_keywords: set[str],
) -> bool:
    """
    Two-stage title gate for board (Phase A) results.

    Stage 1 — Exclusion: reject if any exclude keyword is in the title.
    Stage 2 — Inclusion: if role_keywords is non-empty, at least one must
               appear in the title. This prevents off-topic results where
               the search term only matched the job description.

    Returns True if the job title passes both stages.
    """
    tl = title.lower()
    # Stage 1: exclusion
    if exclude_titles and any(ex.lower() in tl for ex in exclude_titles):
        return False
    # Stage 2: positive domain keyword match
    if role_keywords:
        return any(kw in tl for kw in role_keywords)
    return True


# ---------------------------------------------------------------------------
# Main entry point (called from BackgroundTask)
# ---------------------------------------------------------------------------

def _url_domain(url: str) -> str:
    try:
        return urlparse(url).netloc.lower().replace("www.", "").split(".")[0]
    except Exception:
        return ""


def _parse_tavily_title(raw: str) -> tuple[str, str]:
    """Split 'Job Title - Company | Site' into (title, company)."""
    # Strip trailing site qualifier like "| LinkedIn"
    raw = re.sub(r'\s*\|\s*\w.*$', '', raw).strip()
    if ' - ' in raw:
        parts = raw.split(' - ', 1)
        return parts[0].strip(), parts[1].strip()
    if ' at ' in raw:
        parts = raw.split(' at ', 1)
        return parts[0].strip(), parts[1].strip()
    return raw.strip(), ''


# Matches aggregation page titles like:
#   "34,264 ai engineer Jobs in United States, March 2026"
#   "20,000+ Ai Startup jobs in United States"
#   "Ai Engineer Jobs, Employment in Boston, MA"
#   "Machine Learning Ai Engineer Jobs, Employment"
_TAVILY_AGGS_TITLE_RE = re.compile(
    r'(\d[\d,]*\+?\s+.{2,60}\bjobs?\b'  # "34,264 ... jobs"
    r'|\bjobs?,\s*employment\b'           # "Jobs, Employment"
    r'|\bjob\s+listings?\b'              # "Job Listings"
    r'|\d[\d,]*\+?\s+.{2,40}\bpositions?\b)',  # "1,000+ ... positions"
    re.IGNORECASE,
)


def _is_individual_job_url(url: str) -> bool:
    """
    Return True only for URLs that point to a single job posting.
    Rejects search-result / collection / listing pages.
    """
    u = url.lower().split("?")[0]   # strip query string for pattern matching

    if "linkedin.com" in u:
        # Individual jobs: linkedin.com/jobs/view/DIGITS
        return bool(re.search(r'/jobs/view/\d+', u))

    if "indeed.com" in u:
        # Individual jobs contain viewjob in path or rc/clk
        full = url.lower()
        return "viewjob" in full or "/rc/clk" in full

    if "glassdoor.com" in u:
        # Individual jobs: /job-listing/ or /partner/jobListing
        return "/job-listing/" in u or "joblisting" in u.replace("-", "")

    # greenhouse, lever, ashbyhq, workday, jobvite, etc.
    # These almost always point to a single opening — keep them.
    return True


async def _tavily_search(profile: Any, session_id: str) -> list[Any]:
    """Search for jobs using Tavily API based on user profile preferences."""
    from ..config import get_settings
    settings = get_settings()

    if not settings.TAVILY_API_KEY:
        log.warning("[Tavily] TAVILY_API_KEY not set — skipping")
        return []

    try:
        from tavily import TavilyClient
    except ImportError:
        log.warning("[Tavily] tavily-python not installed")
        return []

    loop = asyncio.get_event_loop()
    client = TavilyClient(api_key=settings.TAVILY_API_KEY)

    roles     = getattr(profile, 'desired_roles',        []) or []
    locations = getattr(profile, 'preferred_locations',  []) or []
    remote    = (getattr(profile, 'remote_preference',   '') or '').lower()

    JOB_DOMAINS = [
        "linkedin.com", "indeed.com", "glassdoor.com",
        "greenhouse.io", "lever.co", "workday.com", "jobs.ashbyhq.com",
    ]

    queries: list[str] = []
    for role in roles[:2]:
        if 'remote' in remote or not locations:
            queries.append(f'"{role}" jobs remote hiring 2025')
        for loc in (locations[:2] or []):
            queries.append(f'"{role}" jobs {loc} 2025')

    if not queries:
        return []

    results: list[Any] = []
    seen_urls: set[str] = set()

    for query in queries[:4]:
        try:
            resp = await loop.run_in_executor(
                None,
                lambda q=query: client.search(
                    query=q,
                    search_depth="basic",
                    include_domains=JOB_DOMAINS,
                    max_results=10,
                ),
            )
            for r in resp.get('results', []):
                url = (r.get('url') or '').strip()
                if not url or url in seen_urls:
                    continue
                # Skip search-result / collection pages — only keep individual postings
                if not _is_individual_job_url(url):
                    log.debug("[Tavily] skipping aggregation URL: %s", url)
                    continue
                raw_title = r.get('title') or ''
                # Skip aggregation page titles ("34,264 Jobs in ...", "Jobs, Employment")
                if _TAVILY_AGGS_TITLE_RE.search(raw_title):
                    log.debug("[Tavily] skipping aggregation title: %s", raw_title)
                    continue
                seen_urls.add(url)
                title, company = _parse_tavily_title(raw_title)
                results.append(SimpleNamespace(
                    url          = url,
                    title        = title or query,
                    company      = company,
                    location     = '',
                    country      = '',
                    description  = r.get('content') or '',
                    job_type     = '',
                    min_amount   = None,
                    max_amount   = None,
                    currency     = 'USD',
                    source       = 'tavily',
                    site         = _url_domain(url),
                    date_posted  = '',
                ))
        except Exception as exc:
            log.warning("[Tavily] query=%r failed: %s", query, exc)

    log.info("[Tavily] session=%s found %d jobs across %d queries", session_id, len(results), len(queries))
    return results


async def run_phase1_search(profile: Any, session_id: str, include_workday: bool = True) -> None:
    """
    Execute Phase 1 job discovery using the user's saved preferences.

    Pipeline (two-phase save so the frontend sees results ASAP):
      1. search_boards()  → deduplicate → save to DB immediately  ← frontend sees these in ~30 s
      2. search_workday() → relevance filter → dedup vs saved URLs → save to DB
      3. mark session done
    """

    # ── CHECKPOINT 0: entry ──────────────────────────────────────────────────
    profile_id   = profile.id
    profile_key  = str(profile_id)
    log.info("=" * 70)
    log.info("[Phase1][0] SESSION START  session=%s  user=%s", session_id, profile_id)

    # ── Duplicate guard ───────────────────────────────────────────────────────
    if profile_key in _RUNNING_PROFILES:
        log.warning(
            "[Phase1][0] DUPLICATE — profile=%s already has a running search. "
            "Marking session=%s as done (0 jobs).",
            profile_key, session_id,
        )
        await _update_session(session_id, "done", 0)
        return
    _RUNNING_PROFILES.add(profile_key)
    log.info("[Phase1][0]   _RUNNING_PROFILES now = %s", _RUNNING_PROFILES)

    log.info("[Phase1][0]   desired_roles       = %s", getattr(profile, "desired_roles", "MISSING"))
    log.info("[Phase1][0]   preferred_locations = %s", getattr(profile, "preferred_locations", "MISSING"))
    log.info("[Phase1][0]   remote_preference   = %s", getattr(profile, "remote_preference", "MISSING"))
    log.info("[Phase1][0]   experience_level    = %s", getattr(profile, "experience_level", "MISSING"))
    log.info("[Phase1][0]   _PHASE1_AVAILABLE        = %s", _PHASE1_AVAILABLE)
    log.info("[Phase1][0]   _WORKDAY_AVAILABLE       = %s", _WORKDAY_AVAILABLE)
    log.info("[Phase1][0]   _SMARTEXTRACT_AVAILABLE  = %s", _SMARTEXTRACT_AVAILABLE)

    if not _PHASE1_AVAILABLE:
        log.warning("[Phase1][0] Phase1 NOT available — trying Tavily search")
        tavily_jobs = await _tavily_search(profile, session_id)
        if tavily_jobs:
            inserted = await _save_jobs(tavily_jobs, profile_id, session_id)
            await _update_session(session_id, "done", inserted)
            _RUNNING_PROFILES.discard(profile_key)
            log.info("[Phase1][Tavily] done — %d jobs saved", inserted)
            return
        log.warning("[Phase1][0] Tavily returned nothing — falling back to mock")
        mock_jobs = _generate_mock_jobs(profile, session_id)
        inserted  = await _save_jobs(mock_jobs, profile_id, session_id)
        await _update_session(session_id, "done", inserted)
        _RUNNING_PROFILES.discard(profile_key)
        log.info("[Phase1][MOCK] done — %d mock jobs saved", inserted)
        return

    try:
        # ── CHECKPOINT 1: build UserPreferences ─────────────────────────────
        log.info("[Phase1][1] Building UserPreferences from profile...")
        try:
            prefs = build_preferences(profile)
        except Exception as build_exc:
            log.exception("[Phase1][1] FAILED to build UserPreferences: %s", build_exc)
            raise

        log.info("[Phase1][1] UserPreferences OK — titles=%s locs=%s remote=%s",
                 prefs.job_titles, prefs.effective_locations(), prefs.remote_ok)

        # ── CHECKPOINT 2: build jobspy kwargs ───────────────────────────────
        kwargs = prefs.to_jobspy_kwargs()
        log.info("[Phase1][2] jobspy kwargs = %s", kwargs)

        # Role keywords — use SearchFilters._title_include_keywords() which strips
        # generic words ("engineer", "developer", etc.) and keeps domain words.
        # e.g. "AI Engineer" → {"ai engineer", "ai"}  (not just {"engineer"})
        # Falls back to naive split if SearchFilters unavailable.
        if _PHASE1_AVAILABLE:
            _sf = SearchFilters(queries=prefs.job_titles)
            role_keywords: set[str] = set(_sf._title_include_keywords())
        else:
            role_keywords = {
                w.lower() for q in prefs.job_titles for w in q.split() if len(w) > 1
            }
        log.info("[Phase1][2] role_keywords = %s", sorted(role_keywords))

        loop = asyncio.get_event_loop()
        total_inserted = 0

        # ════════════════════════════════════════════════════════════════════
        # PHASE A — Board search (Indeed / LinkedIn / Glassdoor / ZipRecruiter)
        # Run ONE title at a time and save immediately after each query.
        # → First results visible on frontend after ~2-3 min instead of 10-15.
        # Cap results_per_site at 100 per site to balance speed vs volume.
        # ════════════════════════════════════════════════════════════════════
        import time as _time

        # Build per-title kwargs (one query string at a time)
        base_kwargs = {k: v for k, v in kwargs.items() if k != "queries"}
        base_kwargs["results_per_site"] = min(kwargs.get("results_per_site", 50), 100)

        # Country filter — LinkedIn returns global remote jobs even for USA searches.
        # If the user specified countries, drop any job explicitly tagged to a
        # different country. Jobs with no country tag are kept (assume correct).
        target_countries = prefs.effective_countries()
        _REMOTE_LOC_KW   = {"remote", "anywhere", "work from home", "wfh", "distributed"}

        # Build accepted + excluded country name sets from INDEED_COUNTRY_CODES.
        # Data-driven: "USA" and "United States" both map to indeed-code "usa",
        # so both are accepted when the user picks either. Same for every country.
        # No hardcoded aliases — all derived from the existing country-code table.
        _target_set:      set[str] = set()   # accepted country name substrings
        _non_target_set:  set[str] = set()   # explicitly foreign country names (to reject)

        if target_countries and _PHASE1_AVAILABLE:
            try:
                from JOBEZEE.PHASE1_JOB_SEARCH import INDEED_COUNTRY_CODES  # type: ignore

                # Collect all indeed-codes that correspond to the user's targets
                target_codes: set[str] = set()
                for c in target_countries:
                    code = INDEED_COUNTRY_CODES.get(c)
                    if code:
                        target_codes.add(code)
                    else:
                        # Unknown code (maybe a custom entry) — accept the raw name
                        _target_set.add(c.lower())

                # Group ALL INDEED_COUNTRY_CODES names into target vs non-target
                for name, code in INDEED_COUNTRY_CODES.items():
                    name_lc = name.lower()
                    if code in target_codes:
                        _target_set.add(name_lc)
                    elif len(name) > 2:
                        # Only add multi-char names to avoid false-positive
                        # substring matches from 2-letter codes like "CA", "DE"
                        _non_target_set.add(name_lc)

                # Add countries not covered by INDEED_COUNTRY_CODES
                # (e.g. Israel, Turkey, Ukraine) so they're also rejected.
                _non_target_set.update(
                    c for c in _EXTRA_FOREIGN_COUNTRIES if c not in _target_set
                )

            except Exception:
                _target_set = {c.lower() for c in target_countries}
                _non_target_set.update(_EXTRA_FOREIGN_COUNTRIES - _target_set)

        log.info(
            "[Phase1][3] Country filter: targets=%s accepted_names=%d excluded_names=%d",
            target_countries, len(_target_set), len(_non_target_set),
        )

        def _passes_country(j: Any) -> bool:
            """
            Return True if the job is in one of the user's target countries.

            NOTE: jobspy force-tags rec.country = search country (e.g. "USA")
            to ALL results — even ones from India/UK/Germany. That field is
            therefore completely unreliable and must be ignored.

            Decision order (location string only):
              1. Location explicitly names a NON-target country → reject
                 (even if "(Remote)" also appears — e.g. "Bengaluru, India (Remote)")
              2. Location contains a known foreign city name → reject
              3. Location is purely remote (no country name found) → accept
              4. Ambiguous / city-only (no country name found) → keep
            """
            if not _target_set:
                return True   # no preference → keep everything
            loc = (getattr(j, "location", "") or "").lower()
            # 1. Location names a foreign country → reject (remote flag doesn't save it)
            if any(nt in loc for nt in _non_target_set):
                return False
            # 2. Known foreign city → reject
            for city, city_country in _MAJOR_CITY_COUNTRY.items():
                if city in loc and city_country in _non_target_set:
                    return False
            # 3 & 4. Pure remote or ambiguous → keep
            return True

        saved_urls: set[str] = set()   # cross-title dedup tracker

        for t_idx, title in enumerate(prefs.job_titles, 1):
            title_kwargs = {**base_kwargs, "queries": [title]}
            log.info(
                "[Phase1][3] Board search %d/%d — title=%r sites=indeed+linkedin+zip",
                t_idx, len(prefs.job_titles), title,
            )
            t0 = _time.time()
            try:
                title_jobs = await loop.run_in_executor(
                    None, lambda k=title_kwargs: search_boards(**k)
                )
                elapsed = _time.time() - t0
                log.info(
                    "[Phase1][3] Title %d/%d done in %.1fs — %d raw jobs",
                    t_idx, len(prefs.job_titles), elapsed, len(title_jobs),
                )
            except Exception as board_exc:
                log.exception("[Phase1][3] Board search FAILED for title=%r: %s", title, board_exc)
                continue   # skip this title, keep going

            # Country filter — drop jobs explicitly tagged to a different country
            if _target_set:
                before_cf = len(title_jobs)
                title_jobs = [j for j in title_jobs if _passes_country(j)]
                log.info(
                    "[Phase1][3] Title %d/%d country filter (%s): kept %d / %d",
                    t_idx, len(prefs.job_titles), target_countries,
                    len(title_jobs), before_cf,
                )

            # Title filter — apply exclude_titles + positive domain-keyword match
            if prefs.exclude_titles or role_keywords:
                before_tf = len(title_jobs)
                title_jobs = [
                    j for j in title_jobs
                    if _passes_board_title(
                        getattr(j, "title", "") or "",
                        prefs.exclude_titles,
                        role_keywords,
                    )
                ]
                log.info(
                    "[Phase1][3] Title %d/%d title filter: kept %d / %d",
                    t_idx, len(prefs.job_titles), len(title_jobs), before_tf,
                )

            title_unique = deduplicate(title_jobs)

            # Cross-title URL dedup — skip any URL already saved by a previous title
            title_new = [
                j for j in title_unique
                if (getattr(j, "job_url", "") or getattr(j, "url", "") or "").strip()
                   not in saved_urls
            ]
            log.info(
                "[Phase1][3] Title %d/%d: %d unique, %d new after cross-dedup — saving",
                t_idx, len(prefs.job_titles), len(title_unique), len(title_new),
            )

            inserted = await _save_jobs(title_new, profile_id, session_id)
            total_inserted += inserted
            await _update_session(session_id, "running", total_inserted, mark_finished=False)
            log.info(
                "[Phase1][3] Title %d/%d saved — +%d, running total=%d (visible on frontend)",
                t_idx, len(prefs.job_titles), inserted, total_inserted,
            )

            saved_urls.update(
                (getattr(j, "job_url", "") or getattr(j, "url", "") or "").strip()
                for j in title_new
            )
            saved_urls.discard("")

        log.info("[Phase1][3] Board phase complete — %d total jobs saved", total_inserted)

        # ════════════════════════════════════════════════════════════════════
        # PHASE B — Workday search (optional, runs after board results saved)
        # workers=8 → all employers tried in parallel so failures take ~2 s
        # instead of N×1 s serially.
        # ════════════════════════════════════════════════════════════════════
        if _WORKDAY_AVAILABLE and include_workday:
            log.info("[Phase1][4] Starting Workday search (workers=8, parallel failures are fast)...")
            try:
                employers = prefs.get_workday_employers()
                log.info("[Phase1][4] Workday employers matched: %d", len(employers))
                t_wd = _time.time()
                wd_raw = await loop.run_in_executor(
                    None,
                    lambda: search_workday(
                        queries=prefs.job_titles,
                        employers=employers,
                        workers=12,              # more parallelism = faster wall time
                        request_timeout=6,       # tight per-request cap
                        fetch_details=True,      # fetch description from each job's detail page
                        max_jobs_per_employer=5, # fewer detail fetches per employer = much faster
                    ),
                )
                log.info(
                    "[Phase1][4] Workday done in %.1fs — %d raw jobs",
                    _time.time() - t_wd, len(wd_raw),
                )

                # Circuit breaker — if Workday produced nothing, skip the rest
                if not wd_raw:
                    log.info("[Phase1][4] Workday returned 0 jobs — skipping dedup/save")
                    wd_raw = []  # fall through cleanly

                # Country filter — same logic as Phase A (Workday returns global results)
                if _target_set:
                    before_cf = len(wd_raw)
                    wd_raw = [j for j in wd_raw if _passes_country(j)]
                    log.info("[Phase1][4] Workday country filter (%s): kept %d / %d",
                             target_countries, len(wd_raw), before_cf)

                # Title filter — exclude unwanted levels + require domain keywords
                if prefs.exclude_titles or role_keywords:
                    before_tf = len(wd_raw)
                    wd_raw = [
                        j for j in wd_raw
                        if _passes_board_title(
                            getattr(j, "title", "") or "",
                            prefs.exclude_titles,
                            role_keywords,
                        )
                    ]
                    log.info("[Phase1][4] Workday title filter: kept %d / %d | keywords=%s",
                             len(wd_raw), before_tf, sorted(role_keywords))

                # Remove URLs already saved from the board phase
                wd_new = [
                    j for j in wd_raw
                    if (getattr(j, "job_url", "") or getattr(j, "url", "") or "").strip()
                       not in saved_urls
                ]
                log.info("[Phase1][4] After URL dedup vs board: %d new Workday jobs", len(wd_new))

                wd_unique = deduplicate(wd_new)
                log.info("[Phase1][4] After internal dedup: %d unique Workday jobs — saving", len(wd_unique))

                wd_inserted = await _save_jobs(wd_unique, profile_id, session_id)
                total_inserted += wd_inserted
                await _update_session(session_id, "running", total_inserted, mark_finished=False)
                log.info("[Phase1][4] Workday phase complete — %d additional jobs", wd_inserted)

                # Extend saved_urls with workday URLs so SmartExtract doesn't re-save them
                saved_urls.update(
                    (getattr(j, "job_url", "") or getattr(j, "url", "") or "").strip()
                    for j in wd_unique
                )
                saved_urls.discard("")

            except Exception as wd_exc:
                log.warning("[Phase1][4] Workday search failed (skipping): %s", wd_exc)
        else:
            log.info("[Phase1][4] Workday not available — skipping")

        # ════════════════════════════════════════════════════════════════════
        # PHASE C — SmartExtract (Playwright + AI) — DISABLED for now
        # Covers: RemoteOK, Wellfound, Himalayas, Dice, BuiltIn, regional boards
        # TODO: re-enable once Playwright is configured
        # ════════════════════════════════════════════════════════════════════
        _SMARTEXTRACT_THRESHOLD = 200

        if True:  # SmartExtract disabled
            log.info("[Phase1][5] SmartExtract disabled — skipping Phase C")
        elif not _SMARTEXTRACT_AVAILABLE:
            log.info("[Phase1][5] SmartExtract not available (missing deps) — skipping")
        elif total_inserted >= _SMARTEXTRACT_THRESHOLD:
            log.info(
                "[Phase1][5] total_inserted=%d >= %d — SmartExtract not needed, skipping",
                total_inserted, _SMARTEXTRACT_THRESHOLD,
            )
        else:
            log.info(
                "[Phase1][5] total_inserted=%d < %d — triggering SmartExtract Phase C",
                total_inserted, _SMARTEXTRACT_THRESHOLD,
            )
            try:
                from ..config import get_settings
                settings = get_settings()

                # Build LLM client — prefer OpenAI (reliable), fallback to Gemini
                llm_client = None
                if settings.OPENAI_API_KEY:
                    llm_client = LLMClient("openai", settings.OPENAI_API_KEY)
                    log.info("[Phase1][5] SmartExtract: LLM = OpenAI")
                else:
                    gemini_key = settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY
                    if gemini_key:
                        llm_client = LLMClient("gemini", gemini_key)
                        log.info("[Phase1][5] SmartExtract: LLM = Gemini (key=%s...)", gemini_key[:10])

                if llm_client is None:
                    log.warning(
                        "[Phase1][5] SmartExtract skipped — no LLM API key "
                        "(set GEMINI_API_KEY or OPENAI_API_KEY in .env)"
                    )
                else:
                    targets = prefs.get_site_targets()
                    log.info("[Phase1][5] SmartExtract: %d site targets (regions=%s)", len(targets), prefs.regions)

                    smart_raw = await loop.run_in_executor(
                        None,
                        lambda: search_smart(targets=targets, llm_client=llm_client, workers=2),
                    )
                    log.info("[Phase1][5] SmartExtract returned %d raw jobs", len(smart_raw))

                    # Relevance filter — same strict role-keyword rule as Workday
                    if role_keywords:
                        before = len(smart_raw)
                        smart_raw = [
                            j for j in smart_raw
                            if any(kw in (getattr(j, "title", "") or "").lower() for kw in role_keywords)
                        ]
                        log.info(
                            "[Phase1][5] SmartExtract relevance filter: kept %d / %d | keywords=%s",
                            len(smart_raw), before, sorted(role_keywords),
                        )

                    # Remove URLs already saved from Phase A + B
                    smart_new = [
                        j for j in smart_raw
                        if (getattr(j, "url", "") or "").strip() not in saved_urls
                    ]
                    log.info("[Phase1][5] SmartExtract after URL dedup: %d new jobs", len(smart_new))

                    smart_unique = deduplicate(smart_new)
                    log.info("[Phase1][5] SmartExtract after internal dedup: %d unique — saving", len(smart_unique))

                    smart_inserted = await _save_jobs(smart_unique, profile_id, session_id)
                    total_inserted += smart_inserted
                    await _update_session(session_id, "running", total_inserted, mark_finished=False)
                    log.info("[Phase1][5] SmartExtract complete — %d additional jobs", smart_inserted)

            except Exception as smart_exc:
                log.warning("[Phase1][5] SmartExtract failed (skipping): %s", smart_exc)
                log.debug("[Phase1][5] SmartExtract traceback:", exc_info=True)

        # ── CHECKPOINT 6: mark session done ──────────────────────────────────
        await _update_session(session_id, "done", total_inserted)
        log.info("[Phase1][6] Session %s COMPLETE — %d total jobs saved", session_id, total_inserted)
        log.info("[Phase1][6]   Phase A (boards):       contributed to total")
        log.info("[Phase1][6]   Phase B (workday):      contributed to total")
        log.info("[Phase1][6]   Phase C (smartextract): contributed to total")
        log.info("=" * 70)

    except Exception as exc:
        tb = _traceback.format_exc()
        log.error("[Phase1][ERR] session=%s CRASHED:\n%s", session_id, tb)
        await _update_session(session_id, "failed", 0, tb)
        log.info("=" * 70)
    finally:
        _RUNNING_PROFILES.discard(profile_key)
        log.info("[Phase1] profile=%s removed from _RUNNING_PROFILES", profile_key)


# ---------------------------------------------------------------------------
# Mock job generator (for development without Phase 1 deps)
# ---------------------------------------------------------------------------

class _MockRecord:
    def __init__(self, **kw: Any):
        for k, v in kw.items():
            setattr(self, k, v)


def _generate_mock_jobs(profile: Any, session_id: str) -> list[_MockRecord]:
    roles     = profile.desired_roles or ["Software Engineer"]
    locations = profile.preferred_locations or ["Remote"]

    MOCK_COMPANIES = [
        "Cyan Labs", "Northwind Digital", "Atlas Insights", "Brightline",
        "TechCorp", "Velocity Inc", "StreamCo", "DataDriven", "NovaSoft",
        "QuantumLeap", "Horizon AI", "BlueMountain Tech",
    ]
    MOCK_SITES = ["indeed", "linkedin", "glassdoor", "zip_recruiter"]

    jobs: list[_MockRecord] = []
    for i, role in enumerate(roles[:3]):
        for j, company in enumerate(MOCK_COMPANIES):
            loc = locations[j % len(locations)]
            jobs.append(_MockRecord(
                title       = f"{role} — #{i*len(MOCK_COMPANIES)+j+1}",
                company     = company,
                location    = loc,
                country     = "USA",
                job_url     = f"https://example.com/jobs/{session_id}-{i}-{j}",
                description = (
                    f"We are looking for a {role} to join {company}. "
                    "You will work with a world-class team on cutting-edge products. "
                    "Strong communication and technical skills required."
                ),
                job_type    = "Full-time",
                min_amount  = 120_000 + j * 5_000,
                max_amount  = 160_000 + j * 5_000,
                currency    = "USD",
                source      = "jobspy",
                site        = MOCK_SITES[j % len(MOCK_SITES)],
                date_posted = "2026-02-28",
            ))

    return jobs
