"""
JobSpy-based job discovery.

Searches Indeed, LinkedIn, Glassdoor, ZipRecruiter, and Google Jobs
using the python-jobspy library, which handles the HTTP requests and
HTML/API parsing for each board internally.

Public API:
    results = search(queries, locations)

Returns a list[JobRecord] — no database, no file I/O.
"""
from __future__ import annotations

import logging
import time
import warnings
from typing import Callable

from .models import JobRecord

log = logging.getLogger(__name__)

# Default boards supported by jobspy
ALL_SITES = ("indeed", "linkedin", "zip_recruiter", "glassdoor", "google")

# ---------------------------------------------------------------------------
# Global country codes for Indeed
# Pass one of these as `country_indeed` to scrape the regional Indeed site.
# Keys are human-readable country names (match SearchFilters.countries).
# ---------------------------------------------------------------------------
INDEED_COUNTRY_CODES: dict[str, str] = {
    # North America
    "USA":              "usa",
    "United States":    "usa",
    "Canada":           "canada",
    "Mexico":           "mexico",
    # Europe
    "UK":               "uk",
    "United Kingdom":   "uk",
    "Germany":          "germany",
    "France":           "france",
    "Netherlands":      "netherlands",
    "Spain":            "spain",
    "Italy":            "italy",
    "Belgium":          "belgium",
    "Switzerland":      "switzerland",
    "Austria":          "austria",
    "Poland":           "poland",
    "Sweden":           "sweden",
    "Denmark":          "denmark",
    "Norway":           "norway",
    "Finland":          "finland",
    "Ireland":          "ireland",
    "Portugal":         "portugal",
    "Czech Republic":   "czechrepublic",
    "Romania":          "romania",
    "Greece":           "greece",
    "Hungary":          "hungary",
    # Asia-Pacific
    "Australia":        "australia",
    "New Zealand":      "newzealand",
    "India":            "india",
    "Singapore":        "singapore",
    "Japan":            "japan",
    "South Korea":      "southkorea",
    "Hong Kong":        "hongkong",
    "Philippines":      "philippines",
    "Malaysia":         "malaysia",
    "Taiwan":           "taiwan",
    "Pakistan":         "pakistan",
    # Middle East
    "UAE":              "uae",
    "Saudi Arabia":     "saudiarabia",
    "Qatar":            "qatar",
    # Latin America
    "Brazil":           "brazil",
    "Argentina":        "argentina",
    "Colombia":         "colombia",
    "Chile":            "chile",
    # Africa
    "South Africa":     "southafrica",
    "Nigeria":          "nigeria",
}

# ---------------------------------------------------------------------------
# Glassdoor location normalisation map
# Glassdoor only accepts simplified city/region names, not "City, ST" format.
# This map covers major cities worldwide so international searches work.
# ---------------------------------------------------------------------------
_GLASSDOOR_LOCATION_MAP: dict[str, str] = {
    # --- United States ---
    "New York, NY":        "New York",
    "San Francisco, CA":   "San Francisco",
    "Los Angeles, CA":     "Los Angeles",
    "Chicago, IL":         "Chicago",
    "Austin, TX":          "Austin",
    "Seattle, WA":         "Seattle",
    "Boston, MA":          "Boston",
    "Atlanta, GA":         "Atlanta",
    "Denver, CO":          "Denver",
    "Miami, FL":           "Miami",
    "Dallas, TX":          "Dallas",
    "Houston, TX":         "Houston",
    "San Jose, CA":        "San Jose",
    "Washington, DC":      "Washington",
    "Philadelphia, PA":    "Philadelphia",
    "Phoenix, AZ":         "Phoenix",
    "San Diego, CA":       "San Diego",
    "Minneapolis, MN":     "Minneapolis",
    "Portland, OR":        "Portland",
    "Nashville, TN":       "Nashville",
    # --- Canada ---
    "Toronto, ON":         "Toronto",
    "Vancouver, BC":       "Vancouver",
    "Montreal, QC":        "Montreal",
    "Calgary, AB":         "Calgary",
    "Ottawa, ON":          "Ottawa",
    "Edmonton, AB":        "Edmonton",
    # --- United Kingdom ---
    "London, UK":          "London",
    "Manchester, UK":      "Manchester",
    "Birmingham, UK":      "Birmingham",
    "Edinburgh, UK":       "Edinburgh",
    "Bristol, UK":         "Bristol",
    "Leeds, UK":           "Leeds",
    "Glasgow, UK":         "Glasgow",
    "Liverpool, UK":       "Liverpool",
    # --- Germany ---
    "Berlin, Germany":     "Berlin",
    "Munich, Germany":     "Munich",
    "Hamburg, Germany":    "Hamburg",
    "Frankfurt, Germany":  "Frankfurt",
    "Cologne, Germany":    "Cologne",
    "Stuttgart, Germany":  "Stuttgart",
    "Düsseldorf, Germany": "Dusseldorf",
    # --- France ---
    "Paris, France":       "Paris",
    "Lyon, France":        "Lyon",
    "Marseille, France":   "Marseille",
    "Bordeaux, France":    "Bordeaux",
    "Toulouse, France":    "Toulouse",
    # --- Netherlands ---
    "Amsterdam, Netherlands": "Amsterdam",
    "Rotterdam, Netherlands": "Rotterdam",
    "The Hague, Netherlands": "The Hague",
    "Eindhoven, Netherlands": "Eindhoven",
    # --- Spain ---
    "Madrid, Spain":       "Madrid",
    "Barcelona, Spain":    "Barcelona",
    "Valencia, Spain":     "Valencia",
    # --- Italy ---
    "Rome, Italy":         "Rome",
    "Milan, Italy":        "Milan",
    "Turin, Italy":        "Turin",
    # --- Switzerland ---
    "Zurich, Switzerland": "Zurich",
    "Geneva, Switzerland": "Geneva",
    "Basel, Switzerland":  "Basel",
    # --- Sweden ---
    "Stockholm, Sweden":   "Stockholm",
    "Gothenburg, Sweden":  "Gothenburg",
    # --- Poland ---
    "Warsaw, Poland":      "Warsaw",
    "Krakow, Poland":      "Krakow",
    "Wroclaw, Poland":     "Wroclaw",
    # --- Ireland ---
    "Dublin, Ireland":     "Dublin",
    # --- Australia ---
    "Sydney, Australia":   "Sydney",
    "Melbourne, Australia": "Melbourne",
    "Brisbane, Australia": "Brisbane",
    "Perth, Australia":    "Perth",
    "Adelaide, Australia": "Adelaide",
    # --- India ---
    "Bangalore, India":    "Bangalore",
    "Mumbai, India":       "Mumbai",
    "Delhi, India":        "Delhi",
    "Hyderabad, India":    "Hyderabad",
    "Pune, India":         "Pune",
    "Chennai, India":      "Chennai",
    # --- Singapore ---
    "Singapore":           "Singapore",
    # --- Japan ---
    "Tokyo, Japan":        "Tokyo",
    "Osaka, Japan":        "Osaka",
    # --- UAE ---
    "Dubai, UAE":          "Dubai",
    "Abu Dhabi, UAE":      "Abu Dhabi",
    # --- Brazil ---
    "São Paulo, Brazil":   "Sao Paulo",
    "Rio de Janeiro, Brazil": "Rio de Janeiro",
    # --- South Africa ---
    "Johannesburg, South Africa": "Johannesburg",
    "Cape Town, South Africa":    "Cape Town",
}


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def search(
    queries: list[str],
    locations: list[str],
    sites: list[str] | None = None,
    results_per_site: int = 50,
    hours_old: int = 72,
    country_indeed: str = "usa",
    countries: list[str] | None = None,
    proxy: str | None = None,
    location_filter: Callable[[str], bool] | None = None,
    delay_between_searches: float = 2.0,
    max_retries: int = 2,
    retry_backoff: float = 5.0,
) -> list[JobRecord]:
    """
    Search job boards and return a list of JobRecord objects.

    Args:
        queries:               List of search terms, e.g. ["software engineer"].
        locations:             List of location strings, e.g. ["Remote", "London, UK"].
        sites:                 Boards to query. Defaults to indeed + linkedin + zip_recruiter.
                               Full options: indeed, linkedin, zip_recruiter, glassdoor, google.
        results_per_site:      Max results to fetch per board per query-location pair.
        hours_old:             Only return jobs posted within this many hours.
        country_indeed:        Single country code for Indeed (default "usa").
                               Ignored when `countries` is set.
        countries:             Optional list of country names from INDEED_COUNTRY_CODES,
                               e.g. ["USA", "United Kingdom", "Germany"].
                               When provided the search is repeated for every country,
                               each record gets its `country` field set accordingly.
                               This makes searches truly global.
        proxy:                 Optional proxy string "host:port" or "host:port:user:pass".
        location_filter:       Optional callable(location_str) -> bool to drop unwanted locations.
                               Remote jobs always pass regardless of this filter.
        delay_between_searches: Seconds to wait between search calls (rate limiting).
        max_retries:           Retry count on transient network errors.
        retry_backoff:         Base wait in seconds between retries (multiplied by attempt number).

    Returns:
        List of JobRecord. Deduplication by URL is performed before returning.

    Global usage example::

        from PHASE1_JOB_SEARCH import search_boards, INDEED_COUNTRY_CODES

        jobs = search_boards(
            queries   = ["software engineer"],
            locations = ["Remote", "London, UK", "Berlin, Germany"],
            countries = ["United Kingdom", "Germany"],
            sites     = ["indeed", "linkedin"],
        )
    """
    try:
        from jobspy import scrape_jobs
    except ImportError:
        log.error(
            "python-jobspy is not installed. "
            "Run: pip install --no-deps python-jobspy && "
            "pip install pydantic tls-client requests markdownify regex"
        )
        return []

    if sites is None:
        sites = ["indeed", "linkedin", "glassdoor"]

    proxy_str = _parse_proxy_str(proxy) if proxy else None

    # Build the list of (country_name, indeed_code) pairs to iterate over.
    # If `countries` is given, derive the Indeed codes from it; otherwise use
    # the legacy `country_indeed` param so existing callers aren't broken.
    if countries:
        country_pairs: list[tuple[str, str]] = []
        for c in countries:
            code = INDEED_COUNTRY_CODES.get(c)
            if code:
                country_pairs.append((c, code))
            else:
                log.warning("jobspy: unknown country %r — skipping (see INDEED_COUNTRY_CODES)", c)
        if not country_pairs:
            log.error("jobspy: no valid countries in %r — aborting", countries)
            return []
    else:
        # Legacy single-country mode
        country_pairs = [("", country_indeed)]

    log.info(
        "jobspy: starting search | queries=%d locations=%d sites=%s countries=%d",
        len(queries), len(locations), ",".join(sites), len(country_pairs),
    )

    all_records: list[JobRecord] = []
    seen_urls:   set[str]        = set()

    for country_name, indeed_code in country_pairs:
        if country_name:
            log.info("jobspy: === country: %s (%s) ===", country_name, indeed_code)

        total_combos = len(queries) * len(locations)
        combo_idx    = 0

        for query in queries:
            for location in locations:
                combo_idx += 1
                log.info(
                    "jobspy: [%d/%d] query=%r location=%r country=%s",
                    combo_idx, total_combos, query, location, country_name or indeed_code,
                )

                records = _run_one_search(
                    query            = query,
                    location         = location,
                    sites            = sites,
                    results_per_site = results_per_site,
                    hours_old        = hours_old,
                    country_indeed   = indeed_code,
                    proxy_str        = proxy_str,
                    max_retries      = max_retries,
                    retry_backoff    = retry_backoff,
                )

                # Tag with country and apply caller-supplied filters
                kept = 0
                for rec in records:
                    if rec.url in seen_urls:
                        continue
                    if location_filter and not _passes_filter(rec.location, location_filter):
                        continue
                    if country_name:
                        rec.country = country_name
                    seen_urls.add(rec.url)
                    all_records.append(rec)
                    kept += 1

                log.info(
                    "jobspy: [%d/%d] raw=%d kept=%d running_total=%d",
                    combo_idx, total_combos, len(records), kept, len(all_records),
                )

                if combo_idx < total_combos:
                    time.sleep(delay_between_searches)

    log.info("jobspy: finished | total_records=%d", len(all_records))
    return all_records


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _run_one_search(
    query: str,
    location: str,
    sites: list[str],
    results_per_site: int,
    hours_old: int,
    country_indeed: str,
    proxy_str: str | None,
    max_retries: int,
    retry_backoff: float,
) -> list[JobRecord]:
    """
    Execute one query+location combination across all requested boards.

    Glassdoor requires a simplified location string; all other boards
    receive the original location. We run them in two separate scrape_jobs
    calls and merge the results.
    """
    from jobspy import scrape_jobs
    import pandas as pd

    has_glassdoor = "glassdoor" in sites
    other_sites   = [s for s in sites if s != "glassdoor"]

    dfs = []

    # Non-Glassdoor boards
    if other_sites:
        kwargs: dict = {
            "site_name":               other_sites,
            "search_term":             query,
            "location":                location,
            "results_wanted":          results_per_site,
            "hours_old":               hours_old,
            "description_format":      "markdown",
            "country_indeed":          country_indeed,
            "verbose":                 0,
        }
        if "linkedin" in other_sites:
            kwargs["linkedin_fetch_description"] = True
        if proxy_str:
            kwargs["proxies"] = [proxy_str]
        if _is_remote(location):
            kwargs["is_remote"] = True

        df = _scrape_with_retry(kwargs, max_retries, retry_backoff)
        if df is not None:
            dfs.append(df)

    # Glassdoor (simplified location)
    if has_glassdoor:
        gd_loc = _GLASSDOOR_LOCATION_MAP.get(location, location.split(",")[0].strip())
        gd_kwargs: dict = {
            "site_name":          ["glassdoor"],
            "search_term":        query,
            "location":           gd_loc,
            "results_wanted":     results_per_site,
            "hours_old":          hours_old,
            "description_format": "markdown",
            "verbose":            0,
        }
        if _is_remote(location):
            gd_kwargs["is_remote"] = True
        if proxy_str:
            gd_kwargs["proxies"] = [proxy_str]

        gd_df = _scrape_with_retry(gd_kwargs, max_retries, retry_backoff)
        if gd_df is not None:
            dfs.append(gd_df)

    if not dfs:
        return []

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", FutureWarning)
        df = pd.concat(dfs, ignore_index=True) if len(dfs) > 1 else dfs[0]

    return _dataframe_to_records(df, query)


def _scrape_with_retry(kwargs: dict, max_retries: int, backoff: float):
    """Call scrape_jobs with exponential backoff on transient errors."""
    from jobspy import scrape_jobs

    _TRANSIENT = ("timeout", "429", "proxy", "connection", "reset", "refused", "rate")

    for attempt in range(max_retries + 1):
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                return scrape_jobs(**kwargs)
        except Exception as exc:
            err = str(exc).lower()
            is_transient = any(k in err for k in _TRANSIENT)
            if is_transient and attempt < max_retries:
                wait = backoff * (attempt + 1)
                log.warning(
                    "jobspy: transient error (attempt %d/%d), retrying in %.0fs: %s",
                    attempt + 1, max_retries, wait, exc,
                )
                time.sleep(wait)
            else:
                log.error(
                    "jobspy: scrape failed for sites=%s query=%r: %s",
                    kwargs.get("site_name"), kwargs.get("search_term"), exc,
                )
                return None

    return None


def _dataframe_to_records(df, query: str) -> list[JobRecord]:
    """Convert a jobspy DataFrame into a list of JobRecord objects."""
    records: list[JobRecord] = []

    for _, row in df.iterrows():
        url = _str(row.get("job_url"))
        if not url:
            continue

        location = _str(row.get("location"))
        is_remote = bool(row.get("is_remote", False))
        if is_remote and location and "remote" not in location.lower():
            location = f"{location} (Remote)"

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
        ))

    return records


def _parse_salary(row) -> str:
    """Build a human-readable salary range from jobspy min/max/interval columns."""
    min_amt  = row.get("min_amount")
    max_amt  = row.get("max_amount")
    interval = _str(row.get("interval"))
    currency = _str(row.get("currency")) or "USD"

    if min_amt and _str(min_amt):
        try:
            lo = f"{currency}{int(float(min_amt)):,}"
            hi = f"-{currency}{int(float(max_amt)):,}" if max_amt and _str(max_amt) else ""
            sfx = f"/{interval}" if interval else ""
            return f"{lo}{hi}{sfx}"
        except (ValueError, TypeError):
            pass
    return ""


def _str(value, max_len: int = 0) -> str:
    """Safely stringify a value, treating pandas NaN/NaT as empty."""
    s = str(value) if value is not None else ""
    if s in ("nan", "NaT", "None", "<NA>"):
        return ""
    return s[:max_len] if max_len and len(s) > max_len else s


def _is_remote(location: str) -> bool:
    loc = location.lower()
    return any(k in loc for k in ("remote", "anywhere", "work from home", "wfh"))


def _passes_filter(location: str, fn: Callable[[str], bool]) -> bool:
    """Remote jobs bypass any location filter."""
    if _is_remote(location):
        return True
    return fn(location)


def _parse_proxy_str(proxy: str) -> str:
    """Convert 'host:port:user:pass' or 'host:port' to jobspy proxy string."""
    parts = proxy.split(":")
    if len(parts) == 4:
        host, port, user, passwd = parts
        return f"{user}:{passwd}@{host}:{port}"
    if len(parts) == 2:
        return proxy
    raise ValueError(
        f"Unsupported proxy format: {proxy!r}. "
        "Expected 'host:port' or 'host:port:user:pass'."
    )
