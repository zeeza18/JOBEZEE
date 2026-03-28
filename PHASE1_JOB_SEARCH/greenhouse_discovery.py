"""
Greenhouse ATS job discovery.

Uses the public Greenhouse Jobs Board API (no auth required):
    GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true

Every company using Greenhouse exposes this endpoint publicly.
We maintain a list of known tech companies with their board tokens,
filter by the user's target countries, then keyword-match titles.

Public API:
    results = search(queries, countries)

Returns a list[JobRecord] — no database, no file I/O.
"""
from __future__ import annotations

import json
import logging
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

from .models import JobRecord

log = logging.getLogger(__name__)

_API_BASE    = "https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true"
_TIMEOUT     = 8   # seconds per request
_MAX_WORKERS = 10  # concurrent company fetches
_USER_AGENT  = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# ---------------------------------------------------------------------------
# Known companies on Greenhouse, organized by country.
# token = the board slug in boards.greenhouse.io/token
# ---------------------------------------------------------------------------
GREENHOUSE_COMPANIES: list[dict] = [

    # ── USA — AI / ML ──────────────────────────────────────────────────────
    {"name": "Anthropic",        "token": "anthropic",        "country": "USA"},
    {"name": "Scale AI",         "token": "scaleai",          "country": "USA"},
    {"name": "Cohere",           "token": "cohere",           "country": "USA"},
    {"name": "Weights & Biases", "token": "wandb",            "country": "USA"},
    {"name": "Hugging Face",     "token": "huggingface",      "country": "USA"},
    {"name": "Dataiku",          "token": "dataiku",          "country": "USA"},
    {"name": "Replit",           "token": "replit",           "country": "USA"},
    {"name": "Perplexity AI",    "token": "perplexityai",     "country": "USA"},
    {"name": "Mistral AI",       "token": "mistral",          "country": "USA"},
    {"name": "Stability AI",     "token": "stabilityai",      "country": "USA"},

    # ── USA — Cloud / Infra ────────────────────────────────────────────────
    {"name": "Cloudflare",       "token": "cloudflare",       "country": "USA"},
    {"name": "Datadog",          "token": "datadog",          "country": "USA"},
    {"name": "PagerDuty",        "token": "pagerduty",        "country": "USA"},
    {"name": "HashiCorp",        "token": "hashicorp",        "country": "USA"},
    {"name": "DigitalOcean",     "token": "digitalocean",     "country": "USA"},
    {"name": "Fastly",           "token": "fastly",           "country": "USA"},
    {"name": "Lacework",         "token": "lacework",         "country": "USA"},
    {"name": "Harness",          "token": "harness",          "country": "USA"},
    {"name": "Cockroach Labs",   "token": "cockroachlabs",    "country": "USA"},
    {"name": "PlanetScale",      "token": "planetscale",      "country": "USA"},
    {"name": "Temporal",         "token": "temporal",         "country": "USA"},

    # ── USA — Fintech / Payments ────────────────────────────────────────────
    {"name": "Stripe",           "token": "stripe",           "country": "USA"},
    {"name": "Coinbase",         "token": "coinbase",         "country": "USA"},
    {"name": "Plaid",            "token": "plaid",            "country": "USA"},
    {"name": "Brex",             "token": "brex",             "country": "USA"},
    {"name": "Ramp",             "token": "ramp",             "country": "USA"},
    {"name": "Mercury",          "token": "mercury",          "country": "USA"},
    {"name": "Rippling",         "token": "rippling",         "country": "USA"},

    # ── USA — SaaS / Productivity ───────────────────────────────────────────
    {"name": "Notion",           "token": "notion",           "country": "USA"},
    {"name": "Figma",            "token": "figma",            "country": "USA"},
    {"name": "Airtable",         "token": "airtable",         "country": "USA"},
    {"name": "Dropbox",          "token": "dropbox",          "country": "USA"},
    {"name": "GitLab",           "token": "gitlab",           "country": "USA"},
    {"name": "Twilio",           "token": "twilio",           "country": "USA"},
    {"name": "Zendesk",          "token": "zendesk",          "country": "USA"},
    {"name": "HubSpot",          "token": "hubspot",          "country": "USA"},
    {"name": "Intercom",         "token": "intercom",         "country": "USA"},
    {"name": "Loom",             "token": "loom",             "country": "USA"},
    {"name": "Linear",           "token": "linear",           "country": "USA"},
    {"name": "Vercel",           "token": "vercel",           "country": "USA"},
    {"name": "Retool",           "token": "retool",           "country": "USA"},
    {"name": "Segment",          "token": "segment",          "country": "USA"},
    {"name": "Amplitude",        "token": "amplitude",        "country": "USA"},
    {"name": "Mixpanel",         "token": "mixpanel",         "country": "USA"},
    {"name": "Pendo",            "token": "pendo",            "country": "USA"},
    {"name": "Verkada",          "token": "verkada",          "country": "USA"},

    # ── USA — Health / Bio ──────────────────────────────────────────────────
    {"name": "Color Health",     "token": "colorhealth",      "country": "USA"},
    {"name": "Tempus",           "token": "tempus",           "country": "USA"},
    {"name": "Benchling",        "token": "benchling",        "country": "USA"},

    # ── UK / Europe ─────────────────────────────────────────────────────────
    {"name": "Monzo",            "token": "monzo",            "country": "UK"},
    {"name": "Revolut",          "token": "revolut",          "country": "UK"},
    {"name": "Deliveroo",        "token": "deliveroo",        "country": "UK"},
    {"name": "Wise",             "token": "wise",             "country": "UK"},
    {"name": "Babylon Health",   "token": "babylonhealth",    "country": "UK"},
    {"name": "Checkout.com",     "token": "checkoutcom",      "country": "UK"},
    {"name": "Beamery",          "token": "beamery",          "country": "UK"},
    {"name": "Contentful",       "token": "contentful",       "country": "Germany"},
    {"name": "GetYourGuide",     "token": "getyourguide",     "country": "Germany"},
    {"name": "N26",              "token": "n26",              "country": "Germany"},
    {"name": "Adyen",            "token": "adyen",            "country": "Netherlands"},
    {"name": "Mollie",           "token": "mollie",           "country": "Netherlands"},

    # ── India ────────────────────────────────────────────────────────────────
    {"name": "Razorpay",         "token": "razorpay",         "country": "India"},
    {"name": "Zepto",            "token": "zepto",            "country": "India"},
    {"name": "slice",            "token": "slice",            "country": "India"},
    {"name": "Browserstack",     "token": "browserstack",     "country": "India"},
    {"name": "Postman",          "token": "postman",          "country": "India"},

    # ── Canada ───────────────────────────────────────────────────────────────
    {"name": "Hootsuite",        "token": "hootsuite",        "country": "Canada"},
    {"name": "Clio",             "token": "clio",             "country": "Canada"},
    {"name": "Thinkific",        "token": "thinkific",        "country": "Canada"},

    # ── Australia ────────────────────────────────────────────────────────────
    {"name": "Canva",            "token": "canva",            "country": "Australia"},
    {"name": "Atlassian",        "token": "atlassian",        "country": "Australia"},
    {"name": "SafetyCulture",    "token": "safetyculture",    "country": "Australia"},
]

# Normalize UK aliases
_UK_ALIASES = {"UK", "United Kingdom", "England", "Scotland", "Wales"}


def _normalize_country(c: str) -> str:
    return "UK" if c in _UK_ALIASES else c


def get_companies_for_countries(countries: list[str]) -> list[dict]:
    """Return companies whose country is in the user's target countries."""
    if not countries:
        return GREENHOUSE_COMPANIES
    normalized = {_normalize_country(c) for c in countries}
    return [co for co in GREENHOUSE_COMPANIES if _normalize_country(co["country"]) in normalized]


# ---------------------------------------------------------------------------
# Fetcher
# ---------------------------------------------------------------------------

def _fetch_company_jobs(company: dict, queries: list[str]) -> list[JobRecord]:
    """Fetch all jobs for one company and filter by keyword match in title."""
    token = company["token"]
    url   = _API_BASE.format(token=token)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        log.debug("greenhouse: %s (%s) — %s", company["name"], token, exc)
        return []

    raw_jobs = data.get("jobs", [])
    if not raw_jobs:
        return []

    # Build keyword set from queries (same logic as SearchFilters._title_include_keywords)
    _GENERIC = {"engineer", "developer", "scientist", "analyst", "researcher",
                "specialist", "manager", "lead", "senior", "junior", "associate",
                "principal", "staff", "architect", "consultant", "advisor",
                "intern", "contractor"}
    kws: set[str] = set()
    for q in queries:
        q_lo = q.lower()
        kws.add(q_lo)
        words  = q_lo.split()
        domain = [w for w in words if w not in _GENERIC]
        if domain:
            kws.add(" ".join(domain))
            kws.update(w for w in domain if len(w) > 1)

    import re as _re
    # Pre-compile patterns with word boundaries so "ai" doesn't match "entertainment"
    kw_patterns = [
        _re.compile(r"\b" + _re.escape(kw) + r"\b", _re.IGNORECASE)
        for kw in kws
    ]

    records: list[JobRecord] = []
    for job in raw_jobs:
        title = (job.get("title") or "").strip()
        if not title:
            continue
        if kw_patterns and not any(pat.search(title) for pat in kw_patterns):
            continue

        location   = (job.get("location") or {}).get("name") or ""
        job_url    = job.get("absolute_url") or ""
        if not job_url:
            continue

        # Raw HTML description → strip tags for plain text
        raw_desc   = job.get("content") or ""
        description = _strip_html(raw_desc)[:4000]

        updated_at = job.get("updated_at") or ""

        records.append(JobRecord(
            title        = title,
            company      = company["name"],
            location     = location,
            url          = job_url,
            description  = description,
            date_posted  = updated_at[:10] if updated_at else "",
            source       = "greenhouse",
            site         = company["name"],
            country      = company["country"],
            search_query = queries[0] if queries else "",
        ))

    return records


def _strip_html(html: str) -> str:
    """Very light HTML tag stripper — no external deps."""
    import re
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;",  "&", text)
    text = re.sub(r"&lt;",   "<", text)
    text = re.sub(r"&gt;",   ">", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def search(
    queries:  list[str],
    countries: list[str] | None = None,
    workers:   int = _MAX_WORKERS,
) -> list[JobRecord]:
    """
    Search Greenhouse job boards for the given queries.

    Args:
        queries:   Search terms, e.g. ["ai engineer", "mlops"].
        countries: Only search companies in these countries.
                   None → search all companies.
        workers:   Concurrent HTTP requests.

    Returns:
        List of JobRecord, deduplicated by URL.
    """
    companies = get_companies_for_countries(countries or [])
    if not companies:
        log.info("greenhouse: no companies matched countries=%s", countries)
        return []

    log.info("greenhouse: searching %d companies | queries=%s countries=%s",
             len(companies), queries, countries)

    all_records: list[JobRecord] = []
    seen_urls:   set[str]        = set()

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_fetch_company_jobs, co, queries): co for co in companies}
        for future in as_completed(futures):
            try:
                recs = future.result()
                for rec in recs:
                    if rec.url not in seen_urls:
                        seen_urls.add(rec.url)
                        all_records.append(rec)
            except Exception as exc:
                log.debug("greenhouse: worker error — %s", exc)

    log.info("greenhouse: found %d unique jobs", len(all_records))
    return all_records
