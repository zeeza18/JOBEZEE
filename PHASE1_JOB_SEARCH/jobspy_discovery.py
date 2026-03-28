"""
JobSpy-based job discovery.

Searches Indeed, LinkedIn, Glassdoor, ZipRecruiter, and regional boards
(Naukri, Bayt, BDJobs) using the jobspy library.

Board selection is automatic based on the user's target countries:
  - USA        → indeed, linkedin, glassdoor, zip_recruiter
  - India      → indeed, linkedin, naukri
  - UAE/Gulf   → bayt, linkedin, indeed
  - Bangladesh → bdjobs, linkedin
  - others     → indeed, linkedin

Glassdoor requires city-level location strings; all other boards work
fine with country-level search via the country_indeed parameter.

Public API:
    results = search(queries, countries, ...)

Returns a list[JobRecord] — no database, no file I/O.
"""
from __future__ import annotations

import logging
import time
import warnings
from typing import Callable

from .models import JobRecord, COUNTRY_BOARDS, COUNTRY_TOP_CITIES, INDEED_COUNTRY_CODES

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def search(
    queries:                list[str],
    countries:              list[str] | None = None,
    sites:                  list[str] | None = None,
    results_per_site:       int              = 50,
    hours_old:              int              = 72,
    proxy:                  str | None       = None,
    location_filter:        Callable[[str], bool] | None = None,
    delay_between_searches: float            = 1.5,
    max_retries:            int              = 2,
    retry_backoff:          float            = 5.0,
    # Legacy params — accepted but ignored (kept for callers that pass them)
    locations:              list[str] | None = None,
    country_indeed:         str              = "usa",
) -> list[JobRecord]:
    """
    Search job boards and return a list of JobRecord objects.

    Args:
        queries:          Search terms, e.g. ["ai engineer", "mlops"].
        countries:        User's target countries, e.g. ["USA", "India"].
                          Drives which boards are searched AND which Indeed
                          regional site is used.  Defaults to USA-only.
        sites:            Override board list (skips COUNTRY_BOARDS logic).
        results_per_site: Max results per board per query.
        hours_old:        Only include jobs posted within this many hours.
        proxy:            Optional "host:port" or "host:port:user:pass".
        location_filter:  Optional callable(location_str) → bool.
                          Remote jobs always pass regardless.
        delay_between_searches: Seconds between scrape_jobs calls.
        max_retries:      Retry count on transient errors.
        retry_backoff:    Base wait seconds between retries.

    Returns:
        Deduplicated list of JobRecord ordered by discovery time.
    """
    try:
        from jobspy import scrape_jobs  # noqa: F401 — validate import early
    except ImportError:
        log.error("jobspy not installed — run: pip install python-jobspy")
        return []

    if not countries:
        countries = ["USA"]

    proxy_str = _parse_proxy_str(proxy) if proxy else None

    # Determine board set for this search
    if sites:
        all_boards = list(sites)
    else:
        board_set: set[str] = set()
        for c in countries:
            board_set.update(COUNTRY_BOARDS.get(c, COUNTRY_BOARDS["_default"]))
        all_boards = list(board_set)

    glassdoor_boards = ["glassdoor"] if "glassdoor" in all_boards else []
    non_gd_boards    = [b for b in all_boards if b != "glassdoor"]

    # Build (country_name, indeed_code) pairs for multi-country sweeps
    country_pairs: list[tuple[str, str]] = []
    for c in countries:
        code = INDEED_COUNTRY_CODES.get(c)
        if code:
            country_pairs.append((c, code))
        else:
            log.warning("jobspy: unknown country %r — using 'usa' code", c)
            country_pairs.append((c, "usa"))
    if not country_pairs:
        country_pairs = [("USA", "usa")]

    # Cities for Glassdoor (city-level required)
    gd_cities: list[str] = []
    if glassdoor_boards:
        for c in countries:
            gd_cities.extend(COUNTRY_TOP_CITIES.get(c, [])[:5])
        if not gd_cities:
            gd_cities = ["New York", "San Francisco", "Chicago"]

    log.info(
        "jobspy: queries=%d countries=%s boards=%s glassdoor_cities=%d",
        len(queries), countries, all_boards, len(gd_cities),
    )

    all_records: list[JobRecord] = []
    seen_urls:   set[str]        = set()

    for query in queries:
        log.info("jobspy: query=%r", query)

        # ── Non-Glassdoor boards: one call per country ────────────────────
        if non_gd_boards:
            for country_name, indeed_code in country_pairs:
                kwargs: dict = {
                    "site_name":          non_gd_boards,
                    "search_term":        query,
                    "location":           "",       # country-level via country_indeed
                    "country_indeed":     indeed_code,
                    "results_wanted":     results_per_site,
                    "hours_old":          hours_old,
                    "description_format": "markdown",
                    "verbose":            0,
                }
                if "linkedin" in non_gd_boards:
                    kwargs["linkedin_fetch_description"] = True
                if proxy_str:
                    kwargs["proxies"] = [proxy_str]

                df = _scrape_with_retry(kwargs, max_retries, retry_backoff)
                if df is not None and not df.empty:
                    recs = _df_to_records(df, query, country_name, seen_urls, location_filter)
                    all_records.extend(recs)
                    log.info("jobspy: [non-gd] %s got %d records", country_name, len(recs))

                time.sleep(delay_between_searches)

        # ── Glassdoor: one call per city ─────────────────────────────────
        if glassdoor_boards:
            for city in gd_cities:
                gd_kwargs: dict = {
                    "site_name":          ["glassdoor"],
                    "search_term":        query,
                    "location":           city,
                    "results_wanted":     results_per_site,
                    "hours_old":          hours_old,
                    "description_format": "markdown",
                    "verbose":            0,
                }
                if proxy_str:
                    gd_kwargs["proxies"] = [proxy_str]

                gd_df = _scrape_with_retry(gd_kwargs, max_retries, retry_backoff)
                if gd_df is not None and not gd_df.empty:
                    recs = _df_to_records(gd_df, query, "", seen_urls, location_filter)
                    all_records.extend(recs)
                    log.info("jobspy: [glassdoor] city=%r got %d records", city, len(recs))

                time.sleep(delay_between_searches)

    log.info("jobspy: total unique records=%d", len(all_records))
    return all_records


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _scrape_with_retry(kwargs: dict, max_retries: int, backoff: float):
    """Call scrape_jobs with exponential backoff on transient errors."""
    from jobspy import scrape_jobs

    _TRANSIENT = ("timeout", "429", "proxy", "connection", "reset", "refused", "rate")
    _PERMANENT = ("invalid country", "valid countries are", "invalid location", "keyerror")

    for attempt in range(max_retries + 1):
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                return scrape_jobs(**kwargs)
        except Exception as exc:
            err = str(exc).lower()
            if any(k in err for k in _PERMANENT):
                log.warning("jobspy: permanent error — skipping: %s", exc)
                return None
            is_transient = any(k in err for k in _TRANSIENT)
            if is_transient and attempt < max_retries:
                wait = backoff * (attempt + 1)
                log.warning(
                    "jobspy: transient error (attempt %d/%d), retry in %.0fs: %s",
                    attempt + 1, max_retries, wait, exc,
                )
                time.sleep(wait)
            else:
                log.error(
                    "jobspy: failed for sites=%s query=%r: %s",
                    kwargs.get("site_name"), kwargs.get("search_term"), exc,
                )
                return None
    return None


def _df_to_records(
    df,
    query: str,
    country_name: str,
    seen_urls: set[str],
    location_filter: Callable[[str], bool] | None,
) -> list[JobRecord]:
    """Convert a jobspy DataFrame to JobRecord list, deduping by URL."""
    records: list[JobRecord] = []
    for _, row in df.iterrows():
        url = _str(row.get("job_url"))
        if not url or url in seen_urls:
            continue

        location  = _str(row.get("location"))
        is_remote = bool(row.get("is_remote", False))
        if is_remote and location and "remote" not in location.lower():
            location = f"{location} (Remote)"

        if location_filter and not _passes_location_filter(location, location_filter):
            continue

        seen_urls.add(url)
        records.append(JobRecord(
            title        = _str(row.get("title")),
            company      = _str(row.get("company")),
            location     = location,
            url          = url,
            salary       = _parse_salary(row),
            description  = _str(row.get("description")),
            remote       = is_remote,
            date_posted  = _str(row.get("date_posted")),
            source       = "jobspy",
            site         = _str(row.get("site")),
            search_query = query,
            country      = country_name,
        ))
    return records


def _parse_salary(row) -> str:
    min_amt  = row.get("min_amount")
    max_amt  = row.get("max_amount")
    interval = _str(row.get("interval"))
    currency = _str(row.get("currency")) or "USD"
    if min_amt and _str(min_amt):
        try:
            lo  = f"{currency}{int(float(min_amt)):,}"
            hi  = f"-{currency}{int(float(max_amt)):,}" if max_amt and _str(max_amt) else ""
            sfx = f"/{interval}" if interval else ""
            return f"{lo}{hi}{sfx}"
        except (ValueError, TypeError):
            pass
    return ""


def _str(value, max_len: int = 0) -> str:
    s = str(value) if value is not None else ""
    if s in ("nan", "NaT", "None", "<NA>"):
        return ""
    return s[:max_len] if max_len and len(s) > max_len else s


def _is_remote(location: str) -> bool:
    loc = location.lower()
    return any(k in loc for k in ("remote", "anywhere", "work from home", "wfh"))


def _passes_location_filter(location: str, fn: Callable[[str], bool]) -> bool:
    if _is_remote(location):
        return True
    return fn(location)


def _parse_proxy_str(proxy: str) -> str:
    parts = proxy.split(":")
    if len(parts) == 4:
        host, port, user, passwd = parts
        return f"{user}:{passwd}@{host}:{port}"
    if len(parts) == 2:
        return proxy
    raise ValueError(f"Unsupported proxy format: {proxy!r}. Use 'host:port' or 'host:port:user:pass'.")
