"""
AI-powered smart extraction for arbitrary career websites.

Handles sites that are not on JobSpy and do not use the Workday platform.
Uses a two-phase approach to find and extract job listings from any page layout.

Phase 1 — Intelligence collection (no LLM):
    Opens the page with Playwright, captures:
    - JSON-LD structured data (fastest, most reliable)
    - Intercepted API/XHR responses (very reliable when present)
    - data-testid attributes and repeating card candidates
    - Full rendered HTML for fallback

Phase 2 — Strategy selection and execution (LLM):
    Sends a lightweight briefing (not raw HTML) to the LLM.
    LLM picks the best strategy: json_ld | api_response | css_selectors.
    - json_ld and api_response execute directly from stored data.
    - css_selectors triggers a second LLM call with cleaned page HTML
      to generate selectors, then applies them with BeautifulSoup.

Public API:
    results = search(targets, llm_client)

Returns a list[JobRecord] — no database, no file I/O.
"""
from __future__ import annotations

import json
import logging
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Callable
from urllib.parse import quote_plus, urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

from .llm import LLMClient, extract_json
from .models import JobRecord

log = logging.getLogger(__name__)

# Fix Windows console encoding so Unicode job titles don't crash stdout
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Attributes worth keeping when cleaning HTML for the LLM
_ALLOWED_ATTRS = {
    "id", "href", "data-testid", "data-id", "data-type", "data-slug",
    "role", "aria-label", "aria-labelledby", "type", "name",
}
_ALLOWED_PREFIXES = ("data-", "aria-")

# Utility/generated CSS class patterns to strip (they carry no semantic meaning)
_UTILITY_CLASS_RE = re.compile(
    r"^("
    r"[a-z]{1,2}-\d+|[a-z]{1,3}-[a-z]{1,3}-\d+|col-\d+|d-\w+|"
    r"align-\w+|justify-\w+|flex-\w+|order-\d+|text-\w+|font-\w+|"
    r"bg-\w+|border-\w+|rounded-?\w*|shadow-?\w*|w-\d+|h-\d+|"
    r"position-\w+|overflow-\w+|float-\w+|clearfix|visible-\w+|"
    r"invisible|sr-only|css-[a-z0-9]+|sc-[a-zA-Z]+|sc-[a-f0-9]+-\d+"
    r")$"
)

_CAPTCHA_SIGNALS = (
    "captcha", "are you a human", "verify you", "unusual requests",
    "access denied", "please verify", "bot detection", "cf-chl",
)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def search(
    targets: list[dict],
    llm_client: LLMClient,
    location_filter: Callable[[str], bool] | None = None,
    workers: int = 1,
    headless: bool = True,
    page_timeout_ms: int = 60_000,
) -> list[JobRecord]:
    """
    Run AI-powered extraction on a list of target URLs.

    Args:
        targets:          List of target dicts. Each must have 'name' and 'url'.
                          Optional 'query' key is added to the JobRecord.search_query.
                          Use build_targets_from_yaml() to load from a YAML file.
        llm_client:       LLMClient instance for strategy selection and selector generation.
        location_filter:  Optional callable(location_str) -> bool. Remote always passes.
        workers:          Parallel threads for site scraping. Default 1 (sequential).
        headless:         Run Playwright browser in headless mode. Set False to debug.
        page_timeout_ms:  Playwright page load timeout in milliseconds.

    Returns:
        List of JobRecord. Deduplication by URL is performed before returning.

    Target dict shape:
        {
            "name":  "Stripe Careers",
            "url":   "https://stripe.com/jobs/search?query=engineer",
            "query": "software engineer",   # optional
        }
    """
    if not targets:
        log.warning("smartextract: no targets provided, returning empty")
        return []

    log.info(
        "smartextract: starting | targets=%d workers=%d headless=%s",
        len(targets), workers, headless,
    )

    all_records: list[JobRecord] = []
    seen_urls:   set[str]        = set()

    def _process(target: dict) -> list[JobRecord]:
        name = target.get("name", target.get("url", "unknown"))
        url  = target.get("url", "")
        if not url:
            log.warning("smartextract: target %r has no URL, skipping", name)
            return []
        try:
            result = _extract_site(
                name         = name,
                url          = url,
                query        = target.get("query", ""),
                llm_client   = llm_client,
                headless     = headless,
                page_timeout = page_timeout_ms,
            )
            return result.get("records", [])
        except Exception as exc:
            log.error("smartextract: %r failed: %s", name, exc)
            return []

    if workers > 1 and len(targets) > 1:
        with ThreadPoolExecutor(max_workers=min(workers, len(targets))) as pool:
            futures = {pool.submit(_process, t): t for t in targets}
            for future in as_completed(futures):
                batch = future.result()
                for rec in batch:
                    if location_filter and not _passes_location(rec.location, location_filter):
                        continue
                    if rec.url and rec.url not in seen_urls:
                        seen_urls.add(rec.url)
                        all_records.append(rec)
    else:
        for i, target in enumerate(targets, 1):
            name  = target.get("name", target.get("url", "?"))
            query = target.get("query", "")
            label = f"{name} [{query}]" if query else name
            log.info("smartextract: [%d/%d] %s", i, len(targets), label)

            batch = _process(target)
            kept  = 0
            for rec in batch:
                if location_filter and not _passes_location(rec.location, location_filter):
                    continue
                if rec.url and rec.url not in seen_urls:
                    seen_urls.add(rec.url)
                    all_records.append(rec)
                    kept += 1

            log.info(
                "smartextract: [%d/%d] raw=%d kept=%d running_total=%d",
                i, len(targets), len(batch), kept, len(all_records),
            )

    log.info("smartextract: finished | total_records=%d", len(all_records))
    return all_records


# ---------------------------------------------------------------------------
# Utility: build targets from YAML
# ---------------------------------------------------------------------------

def build_targets_from_yaml(
    sites_yaml_path: str | Path,
    queries: list[str] | None = None,
    default_location: str = "",
    regions_filter: set[str] | None = None,
) -> list[dict]:
    """
    Build the SmartExtract target list from a sites.yaml file.

    Sites with type="search" are expanded: one target per query.
    Sites with type="static" are scraped once as-is.

    Args:
        sites_yaml_path:  Path to a sites.yaml file.  Defaults to the bundled
                          PHASE1_JOB_SEARCH/config/sites.yaml when called via
                          UserPreferences.get_site_targets().
        queries:          Search terms to inject into search-type URLs.
        default_location: Substituted for {location_encoded} in URLs.
        regions_filter:   Set of region strings to include, e.g.
                          {"europe", "global"}.  Sites tagged "global" are
                          ALWAYS included.  When None, all sites are included.

    Placeholders in URLs:
        {query_encoded}    -> URL-encoded search query
        {query}            -> raw search query
        {location_encoded} -> URL-encoded location
    """
    try:
        import yaml
    except ImportError:
        raise ImportError("Install PyYAML: pip install pyyaml")

    p = Path(sites_yaml_path)
    if not p.exists():
        raise FileNotFoundError(f"Sites YAML not found: {p}")

    data    = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    sites   = data.get("sites", [])
    queries = queries or []

    targets: list[dict] = []
    skipped = 0

    for site in sites:
        url       = site.get("url", "")
        name      = site.get("name", "Unknown")
        site_type = site.get("type", "static")
        region    = site.get("region", "global")

        # Region filter: always include "global" sites; filter the rest
        if regions_filter is not None:
            if region != "global" and region not in regions_filter:
                skipped += 1
                continue

        if site_type == "search" and queries:
            for q in queries:
                expanded = (
                    url
                    .replace("{query_encoded}", quote_plus(q))
                    .replace("{query}",         quote_plus(q))
                    .replace("{location_encoded}", quote_plus(default_location))
                )
                targets.append({
                    "name":   name,
                    "url":    expanded,
                    "query":  q,
                    "region": region,
                })
        else:
            expanded = url.replace("{location_encoded}", quote_plus(default_location))
            targets.append({
                "name":   name,
                "url":    expanded,
                "query":  None,
                "region": region,
            })

    log.info(
        "smartextract: built %d targets from %s (skipped %d by region filter)",
        len(targets), p, skipped,
    )
    return targets


# ---------------------------------------------------------------------------
# Per-site extraction pipeline
# ---------------------------------------------------------------------------

def _extract_site(
    name: str,
    url: str,
    query: str,
    llm_client: LLMClient,
    headless: bool,
    page_timeout: int,
) -> dict:
    """
    Run the full two-phase extraction pipeline for one site.

    Returns a dict with keys: name, status, strategy, records, error.
    """
    # --- Phase 1: collect intelligence ---
    log.info("smartextract: %s | phase1: collecting page intelligence", name)
    t0    = time.perf_counter()
    intel = _collect_intelligence(url, headless=headless, timeout_ms=page_timeout)
    t1    = time.perf_counter()

    log.info(
        "smartextract: %s | collected in %.1fs | json_ld=%d api=%d testids=%d cards=%d html=%d chars",
        name, t1 - t0,
        len(intel["json_ld"]),
        len(intel["api_responses"]),
        len(intel["data_testids"]),
        len(intel["card_candidates"]),
        len(intel.get("full_html", "")),
    )

    # Headful retry if rendered content is suspiciously small
    full_html = intel.get("full_html", "")
    is_captcha = any(sig in full_html.lower() for sig in _CAPTCHA_SIGNALS)
    if not is_captcha and len(_clean_page_html(full_html)) < 5_000:
        log.info("smartextract: %s | sparse content, retrying headful", name)
        intel = _collect_intelligence(url, headless=False, timeout_ms=page_timeout)
        log.info(
            "smartextract: %s | headful retry done | json_ld=%d api=%d",
            name, len(intel["json_ld"]), len(intel["api_responses"]),
        )
    elif is_captcha:
        log.warning("smartextract: %s | CAPTCHA or bot-block detected", name)

    # Filter intercepted API responses with LLM judge
    if intel["api_responses"]:
        log.info(
            "smartextract: %s | judging %d intercepted API responses",
            name, len(intel["api_responses"]),
        )
        intel["api_responses"] = _judge_api_responses(intel["api_responses"], llm_client)
        log.info(
            "smartextract: %s | %d responses passed judge",
            name, len(intel["api_responses"]),
        )

    # --- Phase 1: strategy selection ---
    briefing = _format_briefing(intel)
    log.info(
        "smartextract: %s | phase1: strategy selection (%d char briefing)",
        name, len(briefing),
    )

    prompt = _STRATEGY_PROMPT.format(briefing=briefing)
    try:
        raw = llm_client.ask(prompt, temperature=0.0, max_tokens=1024)
        plan = extract_json(raw)
    except Exception as exc:
        log.error("smartextract: %s | strategy LLM failed: %s", name, exc)
        return {"name": name, "status": "LLM_ERROR", "records": [], "error": str(exc)}

    strategy  = plan.get("strategy", "unknown")
    reasoning = plan.get("reasoning", "")
    log.info("smartextract: %s | strategy=%s reasoning=%r", name, strategy, reasoning)

    # --- Phase 2: execute strategy ---
    log.info("smartextract: %s | phase2: executing %s", name, strategy)
    try:
        if strategy == "json_ld":
            raw_jobs = _execute_json_ld(intel, plan)
        elif strategy == "api_response":
            raw_jobs = _execute_api_response(intel, plan)
        elif strategy == "css_selectors":
            raw_jobs = _execute_css_selectors(intel, llm_client)
        else:
            log.warning("smartextract: %s | unknown strategy %r", name, strategy)
            raw_jobs = []
    except Exception as exc:
        log.error("smartextract: %s | execution error: %s", name, exc)
        return {"name": name, "status": "EXEC_ERROR", "records": [], "error": str(exc)}

    # Convert raw job dicts to JobRecord objects
    records = _jobs_to_records(raw_jobs, site=name, query=query, base_url=url)

    valid   = sum(1 for r in records if r.is_valid)
    status  = "PASS" if valid > 0 else "FAIL"
    log.info(
        "smartextract: %s | status=%s total=%d valid=%d strategy=%s",
        name, status, len(records), valid, strategy,
    )
    if records:
        for r in records[:3]:
            log.debug(
                "smartextract: %s | sample: title=%r location=%r",
                name, r.title[:60], r.location[:30],
            )

    return {"name": name, "status": status, "strategy": strategy, "records": records}


def _jobs_to_records(
    raw_jobs: list[dict],
    site: str,
    query: str,
    base_url: str,
) -> list[JobRecord]:
    """Convert raw job dicts (from extractors) to typed JobRecord objects."""
    records = []
    for job in raw_jobs:
        url = job.get("url") or ""
        # Resolve relative URLs against the page base URL
        if url and not url.startswith("http"):
            url = urljoin(base_url, url)
        location = job.get("location") or ""
        records.append(JobRecord(
            title        = job.get("title") or "",
            company      = site,
            location     = location,
            url          = url,
            salary       = job.get("salary") or "",
            description  = (job.get("description") or "")[:500],
            remote       = "remote" in location.lower(),
            source       = "smartextract",
            site         = site,
            search_query = query or "",
        ))
    return records


# ---------------------------------------------------------------------------
# Phase 1: page intelligence collection
# ---------------------------------------------------------------------------

def _collect_intelligence(url: str, headless: bool, timeout_ms: int) -> dict:
    """
    Load the page with Playwright and collect every signal useful for extraction.

    Captures: JSON-LD, __NEXT_DATA__, intercepted XHR/API responses,
    data-testid elements, DOM statistics, repeating card candidates,
    and the full rendered HTML.
    """
    intel: dict = {
        "url":             url,
        "json_ld":         [],
        "api_responses":   [],
        "data_testids":    [],
        "page_title":      "",
        "dom_stats":       {},
        "card_candidates": [],
        "full_html":       "",
    }

    captured: list[dict] = []

    def _on_response(response):
        resp_url = response.url
        ct       = response.headers.get("content-type", "")
        # Skip static assets
        if any(ext in resp_url for ext in (".js", ".css", ".png", ".jpg",
                                            ".svg", ".woff", ".ico", ".gif", ".webp")):
            return
        if "json" in ct or "/api/" in resp_url or "algolia" in resp_url or "graphql" in resp_url:
            try:
                body = response.text()
                try:
                    data = json.loads(body)
                except Exception:
                    data = None
                captured.append({
                    "url":    resp_url,
                    "status": response.status,
                    "size":   len(body),
                    "data":   data,
                })
            except Exception:
                pass

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=headless)
        page    = browser.new_page(user_agent=_UA)
        page.on("response", _on_response)

        page.goto(url, timeout=timeout_ms, wait_until="networkidle")
        intel["page_title"] = page.title()

        # JSON-LD blocks
        for el in page.query_selector_all('script[type="application/ld+json"]'):
            try:
                intel["json_ld"].append(json.loads(el.inner_text()))
            except Exception:
                pass

        # Next.js data island
        nd = page.query_selector("script#__NEXT_DATA__")
        if nd:
            try:
                intel["next_data"] = json.loads(nd.inner_text())
            except Exception:
                pass

        # data-testid snapshot (first 50)
        intel["data_testids"] = page.evaluate("""
            () => {
                const els = document.querySelectorAll('[data-testid]');
                return Array.from(els).slice(0, 50).map(el => ({
                    testid: el.getAttribute('data-testid'),
                    tag:    el.tagName.toLowerCase(),
                    text:   (el.innerText || '').slice(0, 80),
                }));
            }
        """)

        # DOM statistics
        intel["dom_stats"] = page.evaluate("""
            () => {
                const b = document.body;
                return {
                    total_elements: b.querySelectorAll('*').length,
                    links:          b.querySelectorAll('a[href]').length,
                    headings:       b.querySelectorAll('h1,h2,h3,h4').length,
                    lists:          b.querySelectorAll('ul,ol').length,
                    tables:         b.querySelectorAll('table').length,
                    articles:       b.querySelectorAll('article').length,
                };
            }
        """)

        # Repeating card candidates (heuristic)
        intel["card_candidates"] = page.evaluate("""
            () => {
                const candidates = [];
                for (const parent of document.querySelectorAll('*')) {
                    const children = Array.from(parent.children);
                    if (children.length < 3) continue;
                    const tagCounts = {};
                    children.forEach(c => { tagCounts[c.tagName] = (tagCounts[c.tagName] || 0) + 1; });
                    const [tag, count] = Object.entries(tagCounts).sort((a,b) => b[1]-a[1])[0] || [];
                    if (!tag || count < 3) continue;
                    const rep  = children.filter(c => c.tagName === tag);
                    const wTxt = rep.filter(c => (c.innerText || '').trim().length > 20);
                    if (wTxt.length < 3) continue;
                    const wLnk = wTxt.filter(c => c.querySelector('a[href]'));
                    const score = wLnk.length * 2 + wTxt.length;
                    const pId  = parent.id ? '#' + parent.id : '';
                    const pCls = Array.from(parent.classList).filter(c => c.length < 30).slice(0,3).join('.');
                    const pSel = parent.tagName.toLowerCase() + (pId || (pCls ? '.' + pCls : ''));
                    const cCls = Array.from(wTxt[0].classList).filter(c => c.length < 30).slice(0,3).join('.');
                    const cSel = tag.toLowerCase() + (cCls ? '.' + cCls : '');
                    const examples = wTxt.slice(0, 3).map(c => {
                        const clone = c.cloneNode(true);
                        clone.querySelectorAll('script,style,svg,noscript').forEach(e => e.remove());
                        const h = clone.outerHTML;
                        return h.length > 5000 ? h.slice(0, 5000) + '...' : h;
                    });
                    candidates.push({
                        parent_selector: pSel, child_selector: cSel,
                        total_children: rep.length, with_text: wTxt.length,
                        with_links: wLnk.length, score: score, examples: examples,
                    });
                }
                candidates.sort((a, b) => b.score - a.score);
                return candidates.slice(0, 3);
            }
        """)

        intel["full_html"] = page.content()
        browser.close()

    # Enrich captured API responses with structure summary
    for resp in captured:
        intel["api_responses"].append(_summarise_api_response(resp))

    return intel


def _summarise_api_response(resp: dict) -> dict:
    """Extract structural metadata from an intercepted API response."""
    summary: dict = {
        "url":       resp["url"][:200],
        "status":    resp["status"],
        "size":      resp["size"],
        "_raw_data": resp.get("data"),
    }
    data = resp.get("data")
    if not data:
        return summary

    if isinstance(data, list) and data:
        summary["type"] = f"array[{len(data)}]"
        if isinstance(data[0], dict):
            summary["first_item_keys"]   = list(data[0].keys())[:20]
            summary["first_item_sample"] = {k: str(v)[:100] for k, v in list(data[0].items())[:8]}
    elif isinstance(data, dict):
        summary["type"] = "object"
        summary["keys"] = list(data.keys())[:20]

        def _walk(obj, prefix, depth=0):
            if depth > 3 or not isinstance(obj, dict):
                return
            for k in list(obj.keys())[:15]:
                v    = obj[k]
                path = f"{prefix}.{k}" if prefix else k
                if isinstance(v, list) and v and isinstance(v[0], dict):
                    info = {
                        "count":            len(v),
                        "first_item_keys":  list(v[0].keys())[:20],
                        "first_item_sample": {ik: str(iv)[:100] for ik, iv in list(v[0].items())[:8]},
                    }
                    summary[f"nested_{path}"] = info
                elif isinstance(v, dict) and depth < 3:
                    _walk(v, path, depth + 1)

        _walk(data, "")

    return summary


# ---------------------------------------------------------------------------
# Phase 1: LLM judge for API responses
# ---------------------------------------------------------------------------

_JUDGE_PROMPT = """\
You are filtering intercepted API responses from a job listings website.
Decide if this response contains actual job listing data (titles, companies, locations).

  URL:    {url}
  Status: {status}
  Size:   {size} chars
  Type:   {type}
  Fields: {fields}
  Sample: {sample}

Return ONLY valid JSON, no markdown:
{{"relevant": true,  "reason": "job objects with title/company"}}
{{"relevant": false, "reason": "auth endpoint"}}"""


def _judge_api_responses(responses: list[dict], client: LLMClient) -> list[dict]:
    """Use the LLM to keep only job-relevant intercepted API responses."""
    relevant = []
    for resp in responses:
        fields = ""
        sample = ""
        resp_type = resp.get("type", "unknown")

        if "first_item_keys" in resp:
            fields = str(resp["first_item_keys"])
            sample = json.dumps(resp.get("first_item_sample", {}))[:500]
        elif "keys" in resp:
            fields = str(resp["keys"])
            for k, v in resp.items():
                if k.startswith("nested_") and isinstance(v, dict):
                    fields += f"\n  .{k[7:]}: {v.get('count','?')} items"
                    sample  = json.dumps(v.get("first_item_sample", {}))[:300]

        prompt = _JUDGE_PROMPT.format(
            url    = resp.get("url", "?")[:200],
            status = resp.get("status", "?"),
            size   = resp.get("size", "?"),
            type   = resp_type,
            fields = fields or "no structured data",
            sample = sample or "n/a",
        )
        try:
            raw     = client.ask(prompt, temperature=0.0, max_tokens=128)
            verdict = extract_json(raw)
            if verdict.get("relevant", False):
                relevant.append(resp)
                log.debug("smartextract: judge KEEP %s (%s)", resp.get("url","?")[:80], verdict.get("reason",""))
            else:
                log.debug("smartextract: judge DROP %s (%s)", resp.get("url","?")[:80], verdict.get("reason",""))
        except Exception as exc:
            log.warning("smartextract: judge error for %s: %s — keeping", resp.get("url","?")[:80], exc)
            relevant.append(resp)

    return relevant


# ---------------------------------------------------------------------------
# Phase 1: briefing formatter and strategy prompt
# ---------------------------------------------------------------------------

def _format_briefing(intel: dict) -> str:
    """Produce a compact text briefing of page intelligence for the LLM."""
    lines = [
        f"PAGE: {intel['url']}",
        f"TITLE: {intel['page_title']}",
    ]

    # JSON-LD
    job_postings = [j for j in intel["json_ld"] if isinstance(j, dict) and j.get("@type") == "JobPosting"]
    if job_postings:
        lines.append(f"\nJSON-LD: {len(job_postings)} JobPosting entries (usable!)")
        lines.append(f"First entry:\n{json.dumps(job_postings[0], indent=2)[:2000]}")
    elif intel["json_ld"]:
        types = [j.get("@type", "?") if isinstance(j, dict) else "?" for j in intel["json_ld"]]
        lines.append(f"\nJSON-LD: present but no JobPosting (types: {types}) — json_ld strategy will NOT work")
    else:
        lines.append("\nJSON-LD: none")

    # Intercepted API responses
    if intel["api_responses"]:
        lines.append(f"\nINTERCEPTED API RESPONSES: {len(intel['api_responses'])}")
        for resp in intel["api_responses"]:
            lines.append(f"\n  URL: {resp['url']}")
            lines.append(f"  Status={resp['status']} Size={resp['size']} Type={resp.get('type','?')}")
            if "first_item_keys" in resp:
                lines.append(f"  Item keys: {resp['first_item_keys']}")
                lines.append(f"  Sample: {json.dumps(resp.get('first_item_sample',{}))[:600]}")
            if "keys" in resp:
                lines.append(f"  Object keys: {resp['keys']}")
            for k, v in resp.items():
                if k.startswith("nested_") and isinstance(v, dict):
                    lines.append(f"  .{k[7:]}: {v['count']} items, keys={v.get('first_item_keys','?')}")
    else:
        lines.append("\nINTERCEPTED API RESPONSES: none")

    # data-testid snapshot
    if intel["data_testids"]:
        lines.append(f"\nDATA-TESTID ELEMENTS: {len(intel['data_testids'])}")
        for dt in intel["data_testids"][:12]:
            lines.append(f"  <{dt['tag']} data-testid=\"{dt['testid']}\"> {dt['text'][:60].replace(chr(10),' ')}")
    else:
        lines.append("\nDATA-TESTID: none")

    # DOM stats
    st = intel.get("dom_stats", {})
    lines.append(
        f"\nDOM: {st.get('total_elements','?')} elements, "
        f"{st.get('links','?')} links, {st.get('articles','?')} articles, "
        f"{st.get('tables','?')} tables"
    )

    # Repeating card candidates
    if intel["card_candidates"]:
        lines.append(f"\nREPEATING CARD CANDIDATES: {len(intel['card_candidates'])}")
        for i, c in enumerate(intel["card_candidates"]):
            lines.append(
                f"  [{i}] parent={c['parent_selector']} child={c['child_selector']} "
                f"count={c['total_children']} with_text={c['with_text']} with_links={c['with_links']}"
            )
    else:
        lines.append("\nREPEATING CARDS: none detected")

    return "\n".join(lines)


_STRATEGY_PROMPT = """\
You are analyzing a job listings page to select the best extraction strategy.

Pick ONE strategy:
  "json_ld"      — only if briefing shows JobPosting JSON-LD entries marked "(usable!)"
  "api_response" — only if an intercepted API response contains job-like fields
  "css_selectors"— fallback: when neither JSON-LD nor API data has job listings

Rules for api_response:
  - url_pattern must be a unique substring of one INTERCEPTED API URL (not the page URL)
  - items_path points to the ARRAY of job items using dot notation, e.g. "results[0].hits"
  - field paths are relative to each item in that array

Return ONLY valid JSON, no markdown, no code fences:

json_ld:
{{"strategy":"json_ld","reasoning":"<under 20 words>","extraction":{{"title":"title","salary":"baseSalary or null","description":"description","location":"jobLocation[0].address.addressLocality","url":"url"}}}}

api_response:
{{"strategy":"api_response","reasoning":"<under 20 words>","extraction":{{"url_pattern":"api.example.com/jobs","items_path":"data.jobs","title":"title","salary":"compensation or null","description":"body or null","location":"location.name","url":"link"}}}}

css_selectors:
{{"strategy":"css_selectors","reasoning":"<under 20 words>","extraction":{{}}}}

BRIEFING:
{briefing}"""


# ---------------------------------------------------------------------------
# Phase 2: execution strategies
# ---------------------------------------------------------------------------

def _execute_json_ld(intel: dict, plan: dict) -> list[dict]:
    """Extract job data from JSON-LD JobPosting entries."""
    ext  = plan.get("extraction", {})
    jobs = []
    for entry in intel.get("json_ld", []):
        if not isinstance(entry, dict) or entry.get("@type") != "JobPosting":
            continue
        job = {}
        for field in ("title", "salary", "description", "location", "url"):
            path = ext.get(field)
            job[field] = _resolve_path(entry, path) if path and path != "null" else None
        jobs.append(job)
    return jobs


def _execute_api_response(intel: dict, plan: dict) -> list[dict]:
    """Extract job data from the matched intercepted API response."""
    ext         = plan.get("extraction", {})
    url_pattern = ext.get("url_pattern", "")

    raw_data = None
    for resp in intel.get("api_responses", []):
        if url_pattern in resp.get("url", ""):
            raw_data = resp.get("_raw_data")
            break

    if raw_data is None:
        log.warning("smartextract: api_response — no stored response matches pattern %r", url_pattern)
        return []

    items_path = ext.get("items_path", "")
    items = _resolve_path_raw(raw_data, items_path)
    if not isinstance(items, list):
        log.warning(
            "smartextract: api_response — items_path %r resolved to %s, expected list",
            items_path, type(items).__name__,
        )
        return []

    jobs = []
    for item in items:
        if not isinstance(item, dict):
            continue
        job = {}
        for field in ("title", "salary", "description", "location", "url"):
            path = ext.get(field)
            job[field] = _resolve_path(item, path) if path and path != "null" else None
        jobs.append(job)
    return jobs


def _execute_css_selectors(intel: dict, client: LLMClient) -> list[dict]:
    """
    Phase 2 CSS path:
        1. Send cleaned page HTML to LLM to generate selectors.
        2. Apply selectors with BeautifulSoup to extract job cards.
    """
    full_html = intel.get("full_html", "")
    if not full_html:
        log.warning("smartextract: css_selectors — no HTML captured")
        return []

    cleaned = _clean_page_html(full_html)
    log.info(
        "smartextract: css_selectors | page html %d -> cleaned %d chars",
        len(full_html), len(cleaned),
    )

    prompt = _CSS_SELECTOR_PROMPT.format(page_html=cleaned)
    try:
        raw       = client.ask(prompt, temperature=0.0, max_tokens=2048)
        selectors = extract_json(raw)
    except Exception as exc:
        log.error("smartextract: css_selectors LLM failed: %s", exc)
        return []

    if "error" in selectors:
        log.warning("smartextract: css_selectors LLM: %s", selectors["error"])
        return []

    log.info("smartextract: css_selectors generated: %s", selectors)

    soup     = BeautifulSoup(full_html, "html.parser")
    card_sel = selectors.get("job_card", "")
    if not card_sel:
        log.warning("smartextract: css_selectors — LLM returned no job_card selector")
        return []

    try:
        cards = soup.select(card_sel)
    except Exception as exc:
        log.error("smartextract: invalid card selector %r: %s", card_sel, exc)
        return []

    log.info("smartextract: css_selectors matched %d cards", len(cards))

    jobs = []
    for card in cards:
        job = {}
        for field in ("title", "salary", "description", "location", "url"):
            sel = selectors.get(field)
            if not sel or sel == "null":
                job[field] = None
                continue
            try:
                el = card.select_one(sel)
            except Exception:
                el = None
            if el:
                job[field] = el.get("href") if field == "url" else el.get_text(strip=True)
            else:
                job[field] = None
        jobs.append(job)

    return jobs


_CSS_SELECTOR_PROMPT = """\
You are a senior web scraping engineer. Below is cleaned HTML from a job listings page.

Task:
  1. Find the repeating elements that represent individual job listings.
  2. Generate CSS selectors to extract data from each card.

Return ONLY valid JSON:
{{
  "job_card":    "<selector matching every job card on the page>",
  "title":       "<selector relative to card for job title, or null>",
  "salary":      "<selector relative to card for salary, or null>",
  "description": "<selector relative to card for description snippet, or null>",
  "location":    "<selector relative to card for location, or null>",
  "url":         "<selector relative to card for the <a> link to the job detail>"
}}

Selector rules:
  - Simplest wins. Single attribute like [data-testid="job-card"] beats multi-level paths.
  - For dynamic data-testid values use prefix: [data-testid^="card-"]
  - Prefer semantic elements (article, h2, h3) over generic divs.
  - Never use hashed class names (sc-*, css-*, random 5-8 char strings).
  - Max 2 levels deep.
  - The "url" selector must target an <a> element (we extract its href).
  - If no job listings are visible: {{"error": "no job listings found"}}

No explanation, no markdown, no code fences.

PAGE HTML:
{page_html}"""


# ---------------------------------------------------------------------------
# HTML cleaning utilities
# ---------------------------------------------------------------------------

def _clean_page_html(html: str, max_chars: int = 120_000) -> str:
    """
    Strip a full page HTML down to semantic structure for LLM consumption.

    Removes: scripts, styles, SVG, nav, footer, head.
    Removes: utility CSS classes and presentation-only attributes.
    Removes: empty leaf elements.
    Focuses on: main content area if detectable.
    """
    if not html:
        return ""

    soup = BeautifulSoup(html, "html.parser")

    main = soup.find("main") or soup.find(attrs={"role": "main"})
    if main and len(str(main)) > 1000:
        soup = BeautifulSoup(str(main), "html.parser")

    for tag in soup.find_all(["script", "style", "svg", "noscript",
                               "iframe", "link", "meta", "head", "footer", "nav"]):
        tag.decompose()

    for tag in soup.find_all(True):
        new_attrs: dict = {}
        for attr, val in list(tag.attrs.items()):
            if attr in _ALLOWED_ATTRS or any(attr.startswith(p) for p in _ALLOWED_PREFIXES):
                new_attrs[attr] = val
            elif attr == "class":
                classes = val if isinstance(val, list) else val.split()
                kept    = [c for c in classes if not _UTILITY_CLASS_RE.match(c)]
                if kept:
                    new_attrs["class"] = kept
        tag.attrs = new_attrs

    for tag in soup.find_all(True):
        if not tag.get_text(strip=True) and not tag.find("img") and not tag.find("a"):
            tag.decompose()

    result = str(soup)
    if len(result) > max_chars:
        result = result[:max_chars] + "\n<!-- TRUNCATED -->"
    return result


# ---------------------------------------------------------------------------
# JSON path resolution
# ---------------------------------------------------------------------------

def _resolve_path_raw(data, path: str):
    """Navigate a dot-notation path and return whatever is there (raw)."""
    if not path or data is None:
        return None
    try:
        current = data
        for part in path.replace("[", ".[").split("."):
            if not part:
                continue
            if part.startswith("[") and part.endswith("]"):
                current = current[int(part[1:-1])]
            else:
                current = current[part]
        return current
    except (KeyError, IndexError, TypeError):
        return None


def _resolve_path(data, path: str) -> str | None:
    """Navigate a dot-notation path and coerce the result to a display string."""
    raw = _resolve_path_raw(data, path)
    if raw is None:
        return None
    if isinstance(raw, (str, int, float)):
        return str(raw)
    if isinstance(raw, dict):
        return raw.get("name") or raw.get("text") or str(raw)[:100]
    if isinstance(raw, list):
        if raw and isinstance(raw[0], dict):
            return ", ".join(str(item.get("name") or item.get("text") or "") for item in raw[:3])
        return ", ".join(str(x) for x in raw[:3])
    return str(raw)


# ---------------------------------------------------------------------------
# Location filter helper
# ---------------------------------------------------------------------------

_REMOTE_KEYWORDS = ("remote", "anywhere", "work from home", "wfh", "distributed")


def _passes_location(location: str, fn: Callable[[str], bool]) -> bool:
    loc = (location or "").lower()
    if any(k in loc for k in _REMOTE_KEYWORDS):
        return True
    return fn(location)
