"""
workday_probe.py
================
Given a company's Workday careers page URL, detect tenant + site_id and
verify the hidden JSON API is reachable and returning jobs.

Usage:
    python scripts/workday_probe.py <url> [--region REGION] [--country COUNTRY] [--industry INDUSTRY]

Examples:
    python scripts/workday_probe.py https://amazon.wd5.myworkdayjobs.com/en-US/External_Careers
    python scripts/workday_probe.py https://stripe.wd5.myworkdayjobs.com/jobs --region north_america

On success prints a ready-to-paste GLOBAL_EMPLOYERS entry.
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from itertools import product

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Common site_id fallbacks to try when URL path is ambiguous
_COMMON_SITE_IDS = [
    "jobs", "careers", "search", "External", "external",
    "External_Careers", "Careers", "JobSearch",
]

# ── helpers ──────────────────────────────────────────────────────────────────

def _parse_url(url: str) -> tuple[str, str, list[str]]:
    """
    Returns (base_url, tenant, candidate_site_ids).
    Raises ValueError if URL is not a Workday domain.
    """
    parsed = urllib.parse.urlparse(url)
    host = parsed.netloc.lower()

    if "myworkdayjobs.com" not in host:
        # Could still be a redirect — check if the page redirects to Workday
        raise ValueError(
            f"Not a *.myworkdayjobs.com URL: {host}\n"
            "Tip: open the careers page in a browser, copy the URL from the address bar."
        )

    # tenant is the subdomain before .wdN.myworkdayjobs.com
    m = re.match(r"^([^.]+)\.(wd\d+)\.myworkdayjobs\.com$", host)
    if not m:
        raise ValueError(f"Cannot parse Workday subdomain from: {host}")

    tenant = m.group(1)
    base_url = f"https://{host}"

    # Extract site_id candidates from path
    # e.g. /en-US/External_Careers  →  try "External_Careers", "en-US/External_Careers"
    path_parts = [p for p in parsed.path.strip("/").split("/") if p]
    candidates: list[str] = []

    if path_parts:
        # Last segment is usually site_id
        candidates.append(path_parts[-1])
        # Full path (minus leading slash)
        full_path = parsed.path.strip("/")
        if full_path not in candidates:
            candidates.append(full_path)
        # Each individual segment
        for p in path_parts:
            if p not in candidates:
                candidates.append(p)

    # Always append common fallbacks
    for s in _COMMON_SITE_IDS:
        if s not in candidates:
            candidates.append(s)

    return base_url, tenant, candidates


def _probe(base_url: str, tenant: str, site_id: str, timeout: int = 15) -> dict | None:
    """
    POST to the Workday CXS jobs endpoint. Returns parsed JSON on HTTP 200, else None.
    """
    endpoint = f"{base_url}/wday/cxs/{tenant}/{site_id}/jobs"
    payload = json.dumps({
        "appliedFacets": {},
        "limit": 20,
        "offset": 0,
        "searchText": "",
    }).encode()

    req = urllib.request.Request(
        endpoint,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
            "Accept": "application/json, text/plain, */*",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        if e.code not in (403, 404, 410):
            print(f"    HTTP {e.code} — {site_id}")
    except Exception:
        pass
    return None


# ── main ─────────────────────────────────────────────────────────────────────

def probe(url: str, region: str = "unknown", country: str = "Unknown", industry: str = "technology") -> None:
    print(f"\nProbing: {url}")
    print("=" * 60)

    try:
        base_url, tenant, candidates = _parse_url(url)
    except ValueError as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    print(f"  Tenant   : {tenant}")
    print(f"  Base URL : {base_url}")
    print(f"  Trying {len(candidates)} site_id candidate(s)…\n")

    found_site_id: str | None = None
    total_jobs: int = 0

    for site_id in candidates:
        print(f"  -> {site_id:<40}", end="", flush=True)
        result = _probe(base_url, tenant, site_id)
        if result is not None:
            total = result.get("total", result.get("totalJobsCount", "?"))
            print(f"  OK  {total} jobs found")
            found_site_id = site_id
            total_jobs = total if isinstance(total, int) else 0
            break
        else:
            print("  X")
        time.sleep(0.3)

    print()

    if found_site_id is None:
        print("RESULT: No working endpoint found.")
        print("  This company may not use Workday, or the site_id is non-standard.")
        print("  Tip: open DevTools → Network tab → filter 'jobs' → copy the POST URL.")
        sys.exit(1)

    print("RESULT: SUCCESS")
    print(f"  Working endpoint: {base_url}/wday/cxs/{tenant}/{found_site_id}/jobs")
    print(f"  Total jobs available: {total_jobs}")
    print()

    # Ask for company name if not a Workday URL redirect
    company_name = input("  Company display name (e.g. 'Amazon'): ").strip() or tenant.title()

    entry = f'''    "{tenant}": {{
        "name":     "{company_name}",
        "base_url": "{base_url}",
        "tenant":   "{tenant}",
        "site_id":  "{found_site_id}",
        "region":   "{region}",
        "country":  "{country}",
        "industry": "{industry}",
    }},'''

    print()
    print("-" * 60)
    print("Paste this into discovery/workday_discovery.py -> GLOBAL_EMPLOYERS:")
    print("-" * 60)
    print(entry)
    print("-" * 60)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Probe a Workday careers URL")
    parser.add_argument("url", help="Workday careers page URL")
    parser.add_argument("--region",   default="unknown",    help="north_america | europe | asia_pacific | …")
    parser.add_argument("--country",  default="Unknown",    help="Country name matching UserPreferences.countries")
    parser.add_argument("--industry", default="technology", help="technology | finance | healthcare | …")
    args = parser.parse_args()

    probe(args.url, region=args.region, country=args.country, industry=args.industry)
