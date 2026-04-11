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
from typing import Any
from urllib.parse import urlparse

log = logging.getLogger(__name__)

# ── PHASE1_JOB_SEARCH lives at the repo root (same level as backend/) ──────────
_REPO_ROOT = Path(__file__).resolve().parents[2]   # …/JOBEZEE (repo root)
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

# ── Lazy-import Phase 1 so missing deps don't break the whole app ─────────────
try:
    from PHASE1_JOB_SEARCH import (  # type: ignore
        JobRecord,
        UserPreferences,
        SearchFilters,
        deduplicate,
        search_boards,
    )
    _PHASE1_AVAILABLE = True
    _WORKDAY_AVAILABLE = False
    _GREENHOUSE_AVAILABLE = False
    _SMARTEXTRACT_AVAILABLE = False

    try:
        from PHASE1_JOB_SEARCH import search_workday  # type: ignore
        _WORKDAY_AVAILABLE = True
    except Exception as _we:
        log.info("Workday search not available (%s)", _we)

    try:
        from PHASE1_JOB_SEARCH import search_greenhouse  # type: ignore
        _GREENHOUSE_AVAILABLE = True
    except Exception as _ghe:
        log.info("Greenhouse search not available (%s)", _ghe)

    try:
        from PHASE1_JOB_SEARCH import search_smart, LLMClient  # type: ignore
        _SMARTEXTRACT_AVAILABLE = True
    except Exception as _se:
        log.info("SmartExtract not available (%s)", _se)

except Exception as _e:
    log.warning("Phase 1 not importable (%s) — search will run in mock mode", _e)
    _PHASE1_AVAILABLE = False
    _WORKDAY_AVAILABLE = False
    _GREENHOUSE_AVAILABLE = False
    _SMARTEXTRACT_AVAILABLE = False


# ---------------------------------------------------------------------------
# In-memory guard — prevents concurrent Phase 1 runs for the same profile
# ---------------------------------------------------------------------------

_RUNNING_PROFILES: set[str] = set()

# ---------------------------------------------------------------------------
# ProcessPoolExecutor — each scrape runs in its own Python process.
# tls-client is completely isolated per process → true concurrency, no
# shared C-library state, no corruption between simultaneous users.
# max_workers is read from env so it can be tuned per deployment tier.
# ---------------------------------------------------------------------------
import os as _os
import multiprocessing as _mp
from concurrent.futures import ProcessPoolExecutor as _PPE

# MUST use "spawn" not "fork" on Linux.
# fork() duplicates asyncpg socket FDs into the worker process; when the worker
# exits it closes them, which closes the PARENT's sockets too → DB pool corrupt
# → every simultaneous user gets 0 jobs.  spawn starts a fresh interpreter with
# no inherited file descriptors, so the parent's pool is never touched.
_spawn_ctx   = _mp.get_context("spawn")
_SCRAPER_POOL = _PPE(
    max_workers=int(_os.getenv("SCRAPER_WORKERS", "2")),   # 2 = safe default for 512MB Render
    mp_context=_spawn_ctx,
)


def _scrape_boards_worker(kwargs: dict) -> list:
    """
    Module-level worker — MUST be at module scope so ProcessPoolExecutor
    can pickle it across process boundaries.

    Each call runs in its own Python interpreter: tls-client gets a fresh
    instance, no shared state with other concurrent scrapes.
    """
    import sys, traceback, os
    from pathlib import Path

    # Re-establish sys.path in the worker process (spawn starts fresh)
    _root = str(Path(__file__).resolve().parents[2])
    if _root not in sys.path:
        sys.path.insert(0, _root)

    print(f"[WORKER] pid={os.getpid()} kwargs={kwargs}", flush=True)

    try:
        from PHASE1_JOB_SEARCH import search_boards  # type: ignore
        print(f"[WORKER] PHASE1_JOB_SEARCH imported OK", flush=True)
    except Exception as e:
        print(f"[WORKER] IMPORT FAILED: {e}", flush=True)
        print(traceback.format_exc(), flush=True)
        return []

    import threading
    result_holder: list = []
    exc_holder:   list = []

    def _run():
        try:
            result_holder.extend(search_boards(**kwargs))
        except Exception as e:
            exc_holder.append(e)
            print(f"[WORKER] search_boards EXCEPTION: {e}", flush=True)
            print(traceback.format_exc(), flush=True)

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    t.join(timeout=180)  # 180s cap — multi-country + Glassdoor city calls need time

    if t.is_alive():
        print(f"[WORKER] TIMEOUT after 90s — returning 0 results", flush=True)
        return []

    print(f"[WORKER] search_boards returned {len(result_holder)} results", flush=True)
    return result_holder


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
    hours_old      : int = 72,
) -> int:
    """
    Insert only genuinely new PulledJob rows (dedup against existing DB records).

    Jobs whose URL already exists in pulled_jobs for this user are skipped so
    that the 3-hour auto-search never creates duplicates and existing statuses
    (saved, applied, etc.) are preserved.  Only brand-new URLs land as "new".

    Jobs with date_posted older than hours_old are also skipped — jobspy does
    not always respect its own hours_old filter so we enforce it here.
    """
    from ..database import AsyncSessionLocal
    from ..models import PulledJob
    from sqlalchemy import select
    from datetime import datetime, timezone, timedelta

    BATCH_SIZE  = 10
    stale_limit = datetime.now(timezone.utc) - timedelta(hours=hours_old)

    # Single session: load existing URLs AND insert new ones.
    # Two separate sessions doubled connection usage and caused pool exhaustion
    # when multiple users searched simultaneously.
    async with AsyncSessionLocal() as db:
        existing_result = await db.execute(
            select(PulledJob.url).where(PulledJob.user_profile_id == profile_id)
        )
        existing_urls: set[str] = {row[0] for row in existing_result.fetchall() if row[0]}

        inserted    = 0
        skipped     = 0
        skipped_old = 0
        for rec in jobs:
            # ── Reject jobs posted before the hours_old window ───────────────
            raw_posted = getattr(rec, "date_posted", None)
            if raw_posted:
                try:
                    if isinstance(raw_posted, str):
                        from dateutil.parser import parse as _parse_date
                        posted_dt = _parse_date(raw_posted)
                        if posted_dt.tzinfo is None:
                            posted_dt = posted_dt.replace(tzinfo=timezone.utc)
                    else:
                        posted_dt = raw_posted
                        if hasattr(posted_dt, 'tzinfo') and posted_dt.tzinfo is None:
                            posted_dt = posted_dt.replace(tzinfo=timezone.utc)
                    if posted_dt < stale_limit:
                        skipped_old += 1
                        continue
                except Exception:
                    pass  # unparseable date — let it through

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
        log.info("[Phase1] session=%s final: inserted=%d skipped_dupes=%d skipped_old=%d (hours_old=%d)",
                 session_id, inserted, skipped, skipped_old, hours_old)
        await _update_session(session_id, "running", inserted, mark_finished=False)
    return inserted


async def _get_preference_cache(role_tag: str, location_tag: str):
    """Return PreferenceCache row for (role_tag, location_tag) or None."""
    from ..database import AsyncSessionLocal
    from ..models import PreferenceCache
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PreferenceCache).where(
                PreferenceCache.role_tag == role_tag,
                PreferenceCache.location_tag == location_tag,
            )
        )
        return result.scalar_one_or_none()


async def _save_jobs_v2(
    jobs                : list[Any],
    role_tag            : str,
    location_tag        : str,
    session_id          : str,
    hours_old           : int = 72,
    requesting_user_id  : str = "",
) -> int:
    """
    Global-pool version of _save_jobs.

    Writes new job records to job_listings (deduped by URL globally, not per-user).
    Fans out a user_job_states row (status='new') to EVERY user whose preferences
    include this (role_tag, location_tag) pair.  Users who already have a state row
    for a job are untouched (their saved/applied/hidden status is preserved).

    Updates preference_cache.last_pulled_at after a successful save.
    """
    from ..database import AsyncSessionLocal
    from ..models import JobListing, UserJobState, PreferenceCache, UserProfile
    from sqlalchemy import select
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from datetime import datetime, timezone, timedelta

    BATCH_SIZE  = 10
    stale_limit = datetime.now(timezone.utc) - timedelta(hours=hours_old)

    async with AsyncSessionLocal() as db:
        # ── 1. Load global URL→id map ────────────────────────────────────────
        existing_rows = (await db.execute(select(JobListing.url, JobListing.id))).fetchall()
        url_to_id: dict[str, uuid.UUID] = {
            row.url: row.id for row in existing_rows if row.url
        }

        inserted = 0
        skipped  = 0
        new_job_ids: list[uuid.UUID] = []

        # ── 2. Insert genuinely new jobs into job_listings ───────────────────
        for rec in jobs:
            # Date filter
            raw_posted = getattr(rec, "date_posted", None)
            if raw_posted:
                try:
                    if isinstance(raw_posted, str):
                        from dateutil.parser import parse as _parse_date
                        posted_dt = _parse_date(raw_posted)
                        if posted_dt.tzinfo is None:
                            posted_dt = posted_dt.replace(tzinfo=timezone.utc)
                    else:
                        posted_dt = raw_posted
                        if hasattr(posted_dt, "tzinfo") and posted_dt.tzinfo is None:
                            posted_dt = posted_dt.replace(tzinfo=timezone.utc)
                    if posted_dt < stale_limit:
                        skipped += 1
                        continue
                except Exception:
                    pass

            url = (getattr(rec, "job_url", "") or getattr(rec, "url", "") or "").strip()[:1000]
            if not url:
                skipped += 1
                continue

            if url in url_to_id:
                # Job already globally known — still fan out to users who haven't seen it
                new_job_ids.append(url_to_id[url])
                skipped += 1
                continue

            # Build salary text
            smin = getattr(rec, "min_amount", None) or getattr(rec, "salary_min", None)
            smax = getattr(rec, "max_amount", None) or getattr(rec, "salary_max", None)
            cur  = getattr(rec, "currency", "USD") or "USD"
            if smin and smax:
                salary_text = f"{cur} {int(smin):,} – {int(smax):,}"
            elif smin:
                salary_text = f"{cur} {int(smin):,}+"
            else:
                salary_text = ""

            job_id = uuid.uuid4()
            db.add(JobListing(
                id             = job_id,
                title          = (getattr(rec, "title",       "") or "")[:300],
                company        = (getattr(rec, "company",     "") or "")[:200],
                location       = (getattr(rec, "location",    "") or "")[:200],
                country        = (getattr(rec, "country",     "") or "")[:100],
                url            = url,
                description    = getattr(rec, "description",  "") or "",
                job_type       = str(getattr(rec, "job_type", "") or ""),
                salary_min     = smin,
                salary_max     = smax,
                salary_currency= cur[:10],
                salary_text    = salary_text[:200],
                source         = (getattr(rec, "source", "") or "jobspy")[:100],
                site           = (getattr(rec, "site",   "") or "")[:100],
                posted_at      = str(getattr(rec, "date_posted", "") or ""),
                skills         = [],
            ))
            url_to_id[url] = job_id
            new_job_ids.append(job_id)
            inserted += 1

            if inserted % BATCH_SIZE == 0:
                await db.commit()
                await _update_session(session_id, "running", inserted, mark_finished=False)

        await db.commit()
        log.info("[Phase1][v2] inserted=%d skipped=%d role=%s loc=%s",
                 inserted, skipped, role_tag, location_tag)

        if not new_job_ids:
            return 0   # nothing to fan out

        fanout_count       = 0   # total rows inserted across all users
        user_fanout_count  = 0   # rows inserted for the requesting user only

        # ── 3. Find all users whose preferences match (role_tag, location_tag) ─
        all_profiles = (await db.execute(select(UserProfile))).scalars().all()
        matching_user_ids: list[str] = []
        for p in all_profiles:
            roles     = [r.lower().strip() for r in (p.desired_roles or [])]
            countries = [c.lower().strip() for c in (p.preferred_countries or [])]

            # Mirror build_preferences: infer countries from location strings if
            # preferred_countries is not set.  Without this, users who fill in
            # preferred_locations ("Remote", "New York") but leave preferred_countries
            # blank will never match the (role_tag, location_tag) pair and receive
            # zero jobs even though their search runs correctly.
            if not countries and not (getattr(p, "preferred_regions", None) or []):
                inferred = _infer_countries_from_locations(p.preferred_locations or [])
                countries = [c.lower().strip() for c in _normalise_countries(inferred)]

            # country_ok: if still no countries resolved, accept any location_tag
            # (user has no geographic preference → give them everything).
            country_ok = (not countries) or (location_tag in countries)
            if role_tag in roles and country_ok:
                matching_user_ids.append(str(p.id))

        log.info("[Phase1][v2] fanning out %d jobs → %d users",
                 len(new_job_ids), len(matching_user_ids))

        # ── 4. Bulk fan-out via INSERT ... ON CONFLICT DO NOTHING ─────────────
        if matching_user_ids:
            fan_rows = [
                {
                    "id"         : str(uuid.uuid4()),
                    "user_id"    : uid,
                    "job_id"     : str(jid),
                    "status"     : "new",
                    "created_at" : datetime.now(timezone.utc),
                    "updated_at" : datetime.now(timezone.utc),
                }
                for uid in matching_user_ids
                for jid in new_job_ids
            ]
            # Batch in chunks to avoid huge parameter lists
            CHUNK = 500
            for i in range(0, len(fan_rows), CHUNK):
                res = await db.execute(
                    pg_insert(UserJobState)
                    .values(fan_rows[i:i + CHUNK])
                    .on_conflict_do_nothing(index_elements=["user_id", "job_id"])
                )
                fanout_count += res.rowcount or 0
            await db.commit()

            # Count how many of these jobs are now in the requesting user's view
            if requesting_user_id and new_job_ids:
                from sqlalchemy import func as _func
                cnt_res = await db.execute(
                    select(_func.count())
                    .select_from(UserJobState)
                    .where(
                        UserJobState.user_id == requesting_user_id,
                        UserJobState.job_id.in_(new_job_ids),
                    )
                )
                user_fanout_count = cnt_res.scalar() or 0

        # ── 5. Upsert preference_cache ────────────────────────────────────────
        await db.execute(
            pg_insert(PreferenceCache)
            .values(
                role_tag=role_tag,
                location_tag=location_tag,
                last_pulled_at=datetime.now(timezone.utc),
                total_jobs=len(url_to_id),
            )
            .on_conflict_do_update(
                index_elements=["role_tag", "location_tag"],
                set_={
                    "last_pulled_at": datetime.now(timezone.utc),
                    "total_jobs":     len(url_to_id),
                },
            )
        )
        await db.commit()

    # Return the requesting user's job count so jobs_found on the session
    # reflects what THIS user actually sees, not the global fanout total.
    if requesting_user_id and user_fanout_count > 0:
        return user_fanout_count
    return fanout_count if fanout_count > 0 else inserted


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


def _normalise_countries(raw: list[str]) -> list[str]:
    """
    Normalise country strings to the exact keys INDEED_COUNTRY_CODES expects.
    e.g. 'usa' -> 'USA', 'united states' -> 'United States', 'uk' -> 'United Kingdom'
    Build a lowercase lookup once then map each input string.
    """
    try:
        from PHASE1_JOB_SEARCH import INDEED_COUNTRY_CODES  # type: ignore
        lc_lookup = {k.lower(): k for k in INDEED_COUNTRY_CODES}
    except Exception:
        lc_lookup = {}

    # Canonical country names — must match COUNTRY_BOARDS + GLOBAL_EMPLOYERS keys
    _ALIASES: dict[str, str] = {
        "us": "USA", "usa": "USA",
        "u.s.": "USA", "u.s.a.": "USA", "united states": "USA",
        "uk": "United Kingdom", "u.k.": "United Kingdom",
        "uae": "UAE", "united arab emirates": "UAE",
    }

    out: list[str] = []
    for c in raw:
        cl = c.lower().strip()
        if cl in _ALIASES:
            out.append(_ALIASES[cl])
        elif cl in lc_lookup:
            out.append(lc_lookup[cl])
        else:
            out.append(c)  # pass through unchanged — may work or be skipped
    return out


def build_preferences(profile: Any) -> "UserPreferences":
    """
    Map all UserProfile DB fields to a Phase 1 UserPreferences object.

    Defaults are chosen to be maximally useful without any profile data.
    """
    # Countries: use explicit field; if empty, infer from location strings.
    # This ensures jobs from Brazil/Europe are filtered out when user sets
    # preferred_locations like "Remote, US" but leaves preferred_countries blank.
    countries = _normalise_countries(list(profile.preferred_countries or []))
    if not countries and not (profile.preferred_regions or []):
        countries = _infer_countries_from_locations(profile.preferred_locations or [])

    return UserPreferences(
        # ── What to search ─────────────────────────────────────────────────
        job_titles       = profile.desired_roles       or ["software engineer"],

        # ── Where to search ────────────────────────────────────────────────
        # Strip country codes from locations (usa/uk/us etc.) — those belong
        # in `countries`. Passing them as locations confuses jobspy and causes hangs.
        locations        = [
            l for l in (profile.preferred_locations or [])
            if l.lower().strip() not in {
                'usa','us','u.s.','u.s.a.','united states',
                'uk','u.k.','united kingdom',
                'canada','ca','australia','au',
                'germany','de','france','fr','india','in',
                'uae','netherlands','nl','singapore','sg',
            }
        ],
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
        industries       = [i.lower() for i in (profile.industries or [])],

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

import re as _re2
_GARBAGE_LOC_RE = _re2.compile(r"^\d+\s+location", _re2.IGNORECASE)

def _is_garbage_location(location: str) -> bool:
    """Return True for useless Workday location strings like '2 Locations', '6 Locations'."""
    return bool(_GARBAGE_LOC_RE.match(location.strip()))


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




async def run_phase1_search(
    profile: Any,
    session_id: str,
    include_workday: bool = True,
    workday_only: bool = False,
) -> None:
    """
    Execute Phase 1 job discovery using the user's saved preferences.

    Pipeline:
      1. Phase A — search_boards() (LinkedIn/Indeed/Glassdoor/ZipRecruiter)
                   skipped when workday_only=True
      2. Phase B — search_workday()
                   skipped when include_workday=False
    """

    # ── CHECKPOINT 0: entry ──────────────────────────────────────────────────
    profile_id   = profile.id
    profile_key  = str(profile_id)
    log.info("=" * 70)
    log.info("[Phase1][0] SESSION START  session=%s  user=%s", session_id, profile_id)

    # ── In-process duplicate guard (router handles cross-instance via DB) ────────
    if profile_key in _RUNNING_PROFILES:
        log.warning("[Phase1][0] DUPLICATE in-process — session=%s skipped", session_id)
        await _update_session(session_id, "done", 0)
        return
    _RUNNING_PROFILES.add(profile_key)

    log.info("[Phase1][0]   desired_roles       = %s", getattr(profile, "desired_roles", "MISSING"))
    log.info("[Phase1][0]   preferred_locations = %s", getattr(profile, "preferred_locations", "MISSING"))
    log.info("[Phase1][0]   remote_preference   = %s", getattr(profile, "remote_preference", "MISSING"))
    log.info("[Phase1][0]   experience_level    = %s", getattr(profile, "experience_level", "MISSING"))
    log.info("[Phase1][0]   _PHASE1_AVAILABLE        = %s", _PHASE1_AVAILABLE)
    log.info("[Phase1][0]   _WORKDAY_AVAILABLE       = %s", _WORKDAY_AVAILABLE)
    log.info("[Phase1][0]   _SMARTEXTRACT_AVAILABLE  = %s", _SMARTEXTRACT_AVAILABLE)

    # ── Auto-purge stale 'new' jobs so old postings don't pile up ────────────
    # Removes user_job_states rows with status='new' older than 7 days.
    # saved / applied / favourite rows are preserved regardless of age.
    try:
        from ..database import AsyncSessionLocal
        from ..models import UserJobState as _UJS
        from datetime import datetime, timezone, timedelta
        from sqlalchemy import delete as _sa_delete
        _stale_cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        _uid_str = str(profile_id)
        async with AsyncSessionLocal() as _db:
            _res = await _db.execute(
                _sa_delete(_UJS)
                .where(_UJS.user_id == _uid_str)
                .where(_UJS.status == "new")
                .where(_UJS.created_at < _stale_cutoff)
            )
            await _db.commit()
            log.info("[Phase1][0] Purged %d stale new job-states (>7d old) for user=%s",
                     _res.rowcount, profile_id)
    except Exception as _purge_exc:
        log.warning("[Phase1][0] Stale job purge failed (non-fatal): %s", _purge_exc)

    if not _PHASE1_AVAILABLE:
        log.warning("[Phase1][0] Phase1 NOT available — using mock jobs")
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
        target_countries = prefs.effective_countries() or ["USA"]

        # ── Cache-aware hours_old ─────────────────────────────────────────────
        # If ANY (role, country) pair has never been pulled → use 720h (30 days).
        # If ALL pairs were pulled before → use 72h (3 days, incremental).
        all_cached = True
        from datetime import timedelta as _td
        _one_hour_ago = datetime.now(timezone.utc) - _td(hours=1)
        for _title in prefs.job_titles:
            for _country in target_countries:
                _cache = await _get_preference_cache(_title.lower().strip(), _country.lower().strip())
                if _cache is None or _cache.last_pulled_at is None:
                    all_cached = False
                    break
            if not all_cached:
                break

        effective_hours_old = 72 if all_cached else 720
        log.info("[Phase1][2] cache_status=all_cached=%s → hours_old=%d", all_cached, effective_hours_old)

        kwargs = {
            "queries":          prefs.job_titles,
            "countries":        target_countries,
            "results_per_site": min(prefs.results_per_site or 50, 100),
            "hours_old":        effective_hours_old,
        }
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

        # Expand common tech abbreviations so short tokens like "ml" or "ai"
        # also match expanded titles like "Machine Learning Engineer" or
        # "Artificial Intelligence Researcher".
        _TITLE_EXPANSIONS: dict[str, list[str]] = {
            "ai":  ["artificial intelligence", "generative ai", "genai"],
            "ml":  ["machine learning", "deep learning", "mlops", "ml engineer"],
            "nlp": ["natural language processing", "language model", "llm"],
            "cv":  ["computer vision"],
            "dl":  ["deep learning", "neural network"],
            "llm": ["large language model", "language model"],
            "rl":  ["reinforcement learning"],
            "ds":  ["data science", "data scientist"],
            "de":  ["data engineer", "data engineering"],
            "swe": ["software engineer", "software developer"],
            "sde": ["software development engineer", "software engineer"],
        }
        expanded: set[str] = set(role_keywords)
        for kw in list(role_keywords):
            expanded.update(_TITLE_EXPANSIONS.get(kw, []))
        # Always include the full original query strings as matching patterns
        for q in prefs.job_titles:
            expanded.add(q.lower().strip())
        role_keywords = expanded
        log.info("[Phase1][2] role_keywords expanded = %s", sorted(role_keywords))

        loop = asyncio.get_event_loop()
        total_inserted = 0

        # ════════════════════════════════════════════════════════════════════
        # PHASE A — Board search (Indeed / LinkedIn / Glassdoor / ZipRecruiter)
        # Skipped when workday_only=True (second-pass Workday session).
        # ════════════════════════════════════════════════════════════════════
        import time as _time

        # Build per-title kwargs (one query string at a time)
        base_kwargs = {k: v for k, v in kwargs.items() if k != "queries"}
        base_kwargs["results_per_site"] = min(kwargs.get("results_per_site", 50), 100)

        # Country filter — LinkedIn returns global remote jobs even for USA searches.
        # If the user specified countries, drop any job explicitly tagged to a
        # different country. Jobs with no country tag are kept (assume correct).
        # target_countries already set above from prefs.effective_countries() or ["USA"]
        _REMOTE_LOC_KW   = {"remote", "anywhere", "work from home", "wfh", "distributed"}

        # Build accepted + excluded country name sets from INDEED_COUNTRY_CODES.
        # Data-driven: "USA" and "United States" both map to indeed-code "usa",
        # so both are accepted when the user picks either. Same for every country.
        # No hardcoded aliases — all derived from the existing country-code table.
        _target_set:      set[str] = set()   # accepted country name substrings
        _non_target_set:  set[str] = set()   # explicitly foreign country names (to reject)

        if target_countries and _PHASE1_AVAILABLE:
            try:
                from PHASE1_JOB_SEARCH import INDEED_COUNTRY_CODES  # type: ignore

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

        if workday_only:
            log.info("[Phase1][3] workday_only=True — skipping board search (LinkedIn/Indeed/Glassdoor)")

        for t_idx, title in enumerate([] if workday_only else prefs.job_titles, 1):
            title_kwargs = {**base_kwargs, "queries": [title]}
            log.info(
                "[Phase1][3] Board search %d/%d — title=%r sites=indeed+linkedin+zip",
                t_idx, len(prefs.job_titles), title,
            )
            t0 = _time.time()
            try:
                # Run in isolated process — tls-client fully independent per user.
                # Up to SCRAPER_WORKERS scrapes run truly in parallel.
                title_jobs = await loop.run_in_executor(
                    _SCRAPER_POOL, _scrape_boards_worker, title_kwargs
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

            # Save to global pool + fan out to all matching users
            _role_tag = title.lower().strip()
            _loc_tags = sorted(c.lower().strip() for c in target_countries)
            for _loc_tag in _loc_tags:
                inserted = await _save_jobs_v2(
                    title_new, _role_tag, _loc_tag, session_id, effective_hours_old,
                    requesting_user_id=str(profile.id),
                )
                total_inserted += inserted
            await _update_session(session_id, "running", total_inserted, mark_finished=False)
            log.info(
                "[Phase1][3] Title %d/%d saved — +%d, running total=%d (visible on frontend)",
                t_idx, len(prefs.job_titles), total_inserted // max(t_idx, 1), total_inserted,
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
            log.info("[Phase1][4] Starting Workday search...")
            try:
                # Always filter employers by user's target countries first.
                # This is the primary fix: without it, Canadian/European employers
                # are queried even when the user only wants USA jobs.
                from PHASE1_JOB_SEARCH.workday_discovery import GLOBAL_EMPLOYERS as _GE  # type: ignore
                if target_countries:
                    employers = {
                        k: v for k, v in _GE.items()
                        if v.get("country") in target_countries
                    }
                    log.info("[Phase1][4] Workday employers filtered by countries=%s: %d/%d",
                             target_countries, len(employers), len(_GE))
                else:
                    employers = prefs.get_workday_employers()
                    log.info("[Phase1][4] Workday employers (no country filter): %d", len(employers))

                # If still 0 (rare: country has no Workday employers), skip
                if not employers:
                    log.info("[Phase1][4] No Workday employers for countries=%s — skipping", target_countries)
                    wd_raw = []
                else:
                    t_wd = _time.time()
                    wd_raw = await loop.run_in_executor(
                        None,
                        lambda: search_workday(
                            queries=prefs.job_titles,
                            employers=employers,
                            workers=16,
                            request_timeout=5,
                            fetch_details=True,
                            max_jobs_per_employer=10,
                        ),
                    )
                    log.info(
                        "[Phase1][4] Workday done in %.1fs — %d raw jobs",
                        _time.time() - t_wd, len(wd_raw),
                    )

                if not wd_raw:
                    wd_raw = []

                # Backfill country on Workday jobs that have an empty country field.
                # Workday API often returns no location/country; we know the employer's
                # country from GLOBAL_EMPLOYERS, so tag it here so _passes_country works.
                _employer_country_map = {v["name"]: v.get("country", "") for v in employers.values()}
                for j in wd_raw:
                    if not getattr(j, "country", ""):
                        j.country = _employer_country_map.get(getattr(j, "company", ""), "")

                # Skip jobs with useless location values from Workday ("N Locations" etc.)
                wd_raw = [
                    j for j in wd_raw
                    if not _is_garbage_location(getattr(j, "location", "") or "")
                ]

                # Country filter — now reliable since we backfilled employer country above
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

                wd_inserted = 0
                for _wloc in sorted(c.lower().strip() for c in target_countries):
                    wd_inserted += await _save_jobs_v2(
                        wd_unique, "workday", _wloc, session_id, effective_hours_old,
                        requesting_user_id=str(profile.id),
                    )
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
        # PHASE C — Greenhouse ATS search
        # Public Greenhouse API — no auth, no rate limit, reliable JSON
        # ════════════════════════════════════════════════════════════════════
        if _GREENHOUSE_AVAILABLE:
            log.info("[Phase1][5] Starting Greenhouse search...")
            try:
                t_gh = _time.time()
                gh_raw = await loop.run_in_executor(
                    None,
                    lambda: search_greenhouse(
                        queries=prefs.job_titles,
                        countries=target_countries or None,
                        workers=10,
                    ),
                )
                log.info(
                    "[Phase1][5] Greenhouse done in %.1fs — %d raw jobs",
                    _time.time() - t_gh, len(gh_raw),
                )

                # Title filter
                if prefs.exclude_titles or role_keywords:
                    before_tf = len(gh_raw)
                    gh_raw = [
                        j for j in gh_raw
                        if _passes_board_title(
                            getattr(j, "title", "") or "",
                            prefs.exclude_titles,
                            role_keywords,
                        )
                    ]
                    log.info("[Phase1][5] Greenhouse title filter: kept %d / %d",
                             len(gh_raw), before_tf)

                gh_new = [
                    j for j in gh_raw
                    if (getattr(j, "url", "") or "").strip() not in saved_urls
                ]
                gh_unique = deduplicate(gh_new)
                log.info("[Phase1][5] Greenhouse after dedup: %d new jobs — saving", len(gh_unique))

                gh_inserted = 0
                for _gloc in sorted(c.lower().strip() for c in target_countries):
                    gh_inserted += await _save_jobs_v2(
                        gh_unique, "greenhouse", _gloc, session_id, effective_hours_old,
                        requesting_user_id=str(profile.id),
                    )
                total_inserted += gh_inserted
                await _update_session(session_id, "running", total_inserted, mark_finished=False)
                log.info("[Phase1][5] Greenhouse phase complete — %d additional jobs", gh_inserted)

                saved_urls.update(
                    (getattr(j, "url", "") or "").strip() for j in gh_unique
                )
                saved_urls.discard("")

            except Exception as gh_exc:
                log.warning("[Phase1][5] Greenhouse search failed (skipping): %s", gh_exc)
        else:
            log.info("[Phase1][5] Greenhouse not available — skipping")

        # ════════════════════════════════════════════════════════════════════
        # PHASE D — SmartExtract (Playwright + AI) — DISABLED for now
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

                    smart_inserted = 0
                    for _sloc in sorted(c.lower().strip() for c in target_countries):
                        smart_inserted += await _save_jobs_v2(
                            smart_unique, "smartextract", _sloc, session_id, effective_hours_old,
                            requesting_user_id=str(profile.id),
                        )
                    total_inserted += smart_inserted
                    await _update_session(session_id, "running", total_inserted, mark_finished=False)
                    log.info("[Phase1][5] SmartExtract complete — %d additional jobs", smart_inserted)

            except Exception as smart_exc:
                log.warning("[Phase1][5] SmartExtract failed (skipping): %s", smart_exc)
                log.debug("[Phase1][5] SmartExtract traceback:", exc_info=True)

        # ── CHECKPOINT 6: mark session done ──────────────────────────────────
        await _update_session(session_id, "done", total_inserted)
        log.info("[Phase1][6] Session %s COMPLETE — %d total jobs saved", session_id, total_inserted)
        log.info("[Phase1][6]   Phase A (boards):     contributed to total")
        log.info("[Phase1][6]   Phase B (workday):    contributed to total")
        log.info("[Phase1][6]   Phase C (greenhouse): contributed to total")
        log.info("[Phase1][6]   Phase D (smartextract): disabled")
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

    # (company, site, real_url)
    MOCK_COMPANIES = [
        # ── LinkedIn — real companies with real careers pages ─────────────────
        ("Anthropic",          "linkedin",      "https://www.anthropic.com/careers"),
        ("OpenAI",             "linkedin",      "https://openai.com/careers"),
        ("Google DeepMind",    "linkedin",      "https://deepmind.google/careers/"),
        ("Meta AI",            "linkedin",      "https://www.metacareers.com/"),
        ("Microsoft",          "linkedin",      "https://jobs.microsoft.com/"),
        ("Amazon",             "linkedin",      "https://www.amazon.jobs/"),
        ("Apple",              "linkedin",      "https://jobs.apple.com/"),
        ("Nvidia",             "linkedin",      "https://www.nvidia.com/en-us/about-nvidia/careers/"),
        ("Salesforce",         "linkedin",      "https://www.salesforce.com/company/careers/"),
        ("Databricks",         "linkedin",      "https://www.databricks.com/company/careers"),
        ("Scale AI",           "linkedin",      "https://scale.com/careers"),
        ("Cohere",             "linkedin",      "https://cohere.com/about/careers"),
        ("Hugging Face",       "linkedin",      "https://apply.workable.com/huggingface/"),
        ("Mistral AI",         "linkedin",      "https://mistral.ai/fr/careers/"),
        ("Runway ML",          "linkedin",      "https://runwayml.com/careers/"),
        ("Stability AI",       "linkedin",      "https://stability.ai/careers"),
        ("Perplexity AI",      "linkedin",      "https://www.perplexity.ai/hub/careers"),
        ("Inflection AI",      "linkedin",      "https://inflection.ai/careers"),
        # ── Indeed — search links for the role ───────────────────────────────
        ("TechCorp",           "indeed",        "https://www.indeed.com/jobs?q={role_q}&l=Remote"),
        ("NovaSoft",           "indeed",        "https://www.indeed.com/jobs?q={role_q}&l=Remote"),
        ("Velocity Inc",       "indeed",        "https://www.indeed.com/jobs?q={role_q}&l=Remote"),
        ("Cyan Labs",          "indeed",        "https://www.indeed.com/jobs?q={role_q}&l=Remote"),
        ("Atlas Insights",     "indeed",        "https://www.indeed.com/jobs?q={role_q}&l=Remote"),
        ("DataDriven",         "indeed",        "https://www.indeed.com/jobs?q={role_q}&l=Remote"),
        ("StreamCo",           "indeed",        "https://www.indeed.com/jobs?q={role_q}&l=Remote"),
        ("Horizon AI",         "indeed",        "https://www.indeed.com/jobs?q={role_q}&l=Remote"),
        ("BlueMountain Tech",  "indeed",        "https://www.indeed.com/jobs?q={role_q}&l=Remote"),
        ("InferAI",            "indeed",        "https://www.indeed.com/jobs?q={role_q}&l=Remote"),
        ("Synapse Systems",    "indeed",        "https://www.indeed.com/jobs?q={role_q}&l=Remote"),
        ("VectorWave",         "indeed",        "https://www.indeed.com/jobs?q={role_q}&l=Remote"),
        # ── Glassdoor — search links ─────────────────────────────────────────
        ("QuantumLeap",        "glassdoor",     "https://www.glassdoor.com/Job/jobs.htm?sc.keyword={role_q}&locT=C&locId=1147401"),
        ("Northwind Digital",  "glassdoor",     "https://www.glassdoor.com/Job/jobs.htm?sc.keyword={role_q}&locT=C&locId=1147401"),
        ("Brightline",         "glassdoor",     "https://www.glassdoor.com/Job/jobs.htm?sc.keyword={role_q}&locT=C&locId=1147401"),
        ("Orbit Analytics",    "glassdoor",     "https://www.glassdoor.com/Job/jobs.htm?sc.keyword={role_q}&locT=C&locId=1147401"),
        ("PeakData",           "glassdoor",     "https://www.glassdoor.com/Job/jobs.htm?sc.keyword={role_q}&locT=C&locId=1147401"),
        ("Nexus Intelligence", "glassdoor",     "https://www.glassdoor.com/Job/jobs.htm?sc.keyword={role_q}&locT=C&locId=1147401"),
        ("Luminary AI",        "glassdoor",     "https://www.glassdoor.com/Job/jobs.htm?sc.keyword={role_q}&locT=C&locId=1147401"),
        ("Prism Labs",         "glassdoor",     "https://www.glassdoor.com/Job/jobs.htm?sc.keyword={role_q}&locT=C&locId=1147401"),
        # ── ZipRecruiter — search links ───────────────────────────────────────
        ("SkyNet Solutions",   "zip_recruiter", "https://www.ziprecruiter.com/Jobs/{role_slug}-Jobs"),
        ("IronClad AI",        "zip_recruiter", "https://www.ziprecruiter.com/Jobs/{role_slug}-Jobs"),
        ("DeepRoute",          "zip_recruiter", "https://www.ziprecruiter.com/Jobs/{role_slug}-Jobs"),
        ("Cortex Labs",        "zip_recruiter", "https://www.ziprecruiter.com/Jobs/{role_slug}-Jobs"),
        ("Axiom AI",           "zip_recruiter", "https://www.ziprecruiter.com/Jobs/{role_slug}-Jobs"),
        ("Sentinel Systems",   "zip_recruiter", "https://www.ziprecruiter.com/Jobs/{role_slug}-Jobs"),
        ("Cascade AI",         "zip_recruiter", "https://www.ziprecruiter.com/Jobs/{role_slug}-Jobs"),
        ("Ember Technologies", "zip_recruiter", "https://www.ziprecruiter.com/Jobs/{role_slug}-Jobs"),
    ]

    MOCK_DESCS = [
        (
            "## About the Role\n\nWe are looking for a {role} to join our growing team at {company}. "
            "You will design, build, and deploy production AI systems that serve millions of users.\n\n"
            "## Responsibilities\n\n- Develop and maintain ML pipelines end-to-end\n"
            "- Collaborate with product and data teams to define requirements\n"
            "- Optimize model performance and inference latency\n"
            "- Write clean, well-tested Python code\n\n"
            "## Requirements\n\n- 3+ years of experience in machine learning or AI engineering\n"
            "- Proficiency in Python, PyTorch or TensorFlow\n"
            "- Experience with cloud platforms (AWS, GCP, or Azure)\n"
            "- Strong understanding of LLMs and transformer architectures"
        ),
        (
            "## The Opportunity\n\n{company} is hiring a {role} to help scale our AI infrastructure. "
            "This is a fully remote role with equity and competitive compensation.\n\n"
            "## What You'll Do\n\n- Build and iterate on large language model applications\n"
            "- Own the ML lifecycle from data to deployment\n"
            "- Partner with engineering to integrate AI features into the product\n"
            "- Contribute to internal tooling and frameworks\n\n"
            "## What We're Looking For\n\n- BS/MS in Computer Science, ML, or related field\n"
            "- Hands-on experience fine-tuning or prompting LLMs\n"
            "- Familiarity with vector databases and RAG architectures\n"
            "- Strong problem-solving and communication skills"
        ),
        (
            "## Role Overview\n\n{company} is seeking a talented {role} to join our AI team. "
            "You will work on cutting-edge generative AI products used by enterprise customers globally.\n\n"
            "## Key Responsibilities\n\n- Design and implement AI agents and agentic workflows\n"
            "- Evaluate and improve model outputs using robust benchmarking\n"
            "- Work cross-functionally with research, product, and go-to-market teams\n"
            "- Mentor junior engineers and contribute to technical roadmap\n\n"
            "## Qualifications\n\n- 5+ years of software engineering experience, 2+ in AI/ML\n"
            "- Experience with prompt engineering and RLHF techniques\n"
            "- Proficiency in distributed systems and data engineering\n"
            "- Prior experience shipping AI features to production"
        ),
    ]

    jobs: list[_MockRecord] = []
    for i, role in enumerate(roles[:3]):
        role_q    = role.replace(" ", "+")
        role_slug = role.replace(" ", "-")
        for j, (company, site, url_tpl) in enumerate(MOCK_COMPANIES):
            loc  = locations[j % len(locations)]
            desc = MOCK_DESCS[j % len(MOCK_DESCS)].format(role=role, company=company)
            url  = url_tpl.replace("{role_q}", role_q).replace("{role_slug}", role_slug)
            jobs.append(_MockRecord(
                title       = role,
                company     = company,
                location    = loc,
                country     = "USA",
                job_url     = url,
                description = desc,
                job_type    = "Full-time",
                min_amount  = 120_000 + j * 2_000,
                max_amount  = 160_000 + j * 2_000,
                currency    = "USD",
                source      = "jobspy",
                site        = site,
                date_posted = "2026-02-28",
            ))

    return jobs
