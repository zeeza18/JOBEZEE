"""
Dashboard router — overview stats from DB + cached job-market news feed.

GET /api/dashboard/stats  — applied job stats from pulled_jobs DB table
GET /api/dashboard/news   — job market news from Google News RSS (cached 3h)
"""
from __future__ import annotations

import time
import uuid
import xml.etree.ElementTree as ET
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..database import get_db
from ..models import UserJobState, UserProfile

router = APIRouter()

# ── News cache (keyed by "country|role") ──────────────────────────────────────
_news_cache: dict[str, list[dict]] = {}
_news_cache_ts: dict[str, float]   = {}

def _clear_news_cache() -> None:
    _news_cache.clear()
    _news_cache_ts.clear()

_clear_news_cache()  # force refresh on every server restart
_NEWS_TTL = 3 * 60 * 60


def _build_queries(country: str, role: str) -> list[tuple[str, str]]:
    """Return (query, category) pairs personalised to user's country + role."""
    c = country.strip() if country else "USA"
    r = role.strip()    if role    else "software engineer"
    yr = "2025"
    return [
        # hiring / job match
        (f"{r} jobs hiring {yr} {c}",            "hiring"),
        (f"{r} new job openings {c}",             "new_posting"),
        (f"companies hiring {r} {c} {yr}",        "hiring"),
        (f"{r} remote jobs {yr}",                 "new_posting"),
        (f"tech companies expanding {c} {yr}",    "hiring"),
        (f"startup hiring {r} {yr}",              "hiring"),
        # layoffs
        (f"tech layoffs {yr} {c}",                "layoffs"),
        (f"job cuts technology {c} {yr}",         "layoffs"),
        (f"tech company layoffs {yr}",            "layoffs"),
        # salary
        (f"{r} salary {yr} {c}",                  "salary"),
        (f"tech salary trends {yr} {c}",          "salary"),
        (f"{r} compensation benchmark {yr}",       "salary"),
        # market
        (f"job market outlook {yr} {c}",          "market"),
        (f"unemployment rate tech {c} {yr}",      "market"),
        (f"AI jobs future {yr} {c}",              "market"),
        (f"tech industry trends {yr} {c}",        "market"),
    ]


def _fetch_google_news(query: str, category: str, max_items: int = 5) -> list[dict]:
    url = f"https://news.google.com/rss/search?q={query.replace(' ', '+')}&hl=en-US&gl=US&ceid=US:en"
    try:
        r = httpx.get(url, timeout=8, follow_redirects=True)
        root = ET.fromstring(r.text)
        items = []
        for item in root.iter("item"):
            title  = item.findtext("title") or ""
            link   = item.findtext("link") or ""
            pub    = item.findtext("pubDate") or ""
            src_el = item.find("source")
            source = src_el.text if src_el is not None else ""
            if title and link:
                items.append({
                    "title": title, "link": link,
                    "published": pub, "source": source,
                    "category": category, "topic": query,
                })
            if len(items) >= max_items:
                break
        return items
    except Exception:
        return []


def _parse_pub_date(pub: str) -> float:
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(pub).timestamp()
    except Exception:
        return 0.0


def _get_news(country: str = "USA", role: str = "software engineer") -> list[dict]:
    cache_key = f"{country.lower()}|{role.lower()}"
    now = time.time()
    if _news_cache.get(cache_key) and (now - _news_cache_ts.get(cache_key, 0)) < _NEWS_TTL:
        return _news_cache[cache_key]

    all_items: list[dict] = []
    seen: set[str] = set()
    for query, category in _build_queries(country, role):
        for item in _fetch_google_news(query, category, max_items=8):
            key = item["title"][:60]
            if key not in seen:
                seen.add(key)
                all_items.append(item)

    # Sort newest first
    all_items.sort(key=lambda x: _parse_pub_date(x["published"]), reverse=True)
    _news_cache[cache_key]    = all_items
    _news_cache_ts[cache_key] = now
    return all_items


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/stats")
async def dashboard_stats(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Job stats from user_job_states table."""
    user_id = str(uuid.UUID(current_user.id))

    # Single grouped query — all statuses at once
    counts_q = (
        select(UserJobState.status, func.count().label("cnt"))
        .where(UserJobState.user_id == user_id)
        .group_by(UserJobState.status)
    )
    counts_res = await db.execute(counts_q)
    status_map: dict[str, int] = {row.status: row.cnt for row in counts_res}

    new_count     = status_map.get("new",       0)
    saved_count   = status_map.get("saved",     0) + status_map.get("favourite", 0)
    hidden_count  = status_map.get("hidden",    0)
    applied_count = status_map.get("applied",   0)
    total         = sum(status_map.values())
    openings_count = total - hidden_count   # all non-hidden jobs

    return {
        "total_applied":  applied_count,
        "total_failed":   hidden_count,
        "openings_count": openings_count,
        "new_jobs_count": new_count,
        "saved_count":    saved_count,
        "pipeline":       {},
        "recent_applied": [],
    }


@router.get("/news")
async def job_market_news(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Personalised job-market news based on user's country + primary role."""
    pid    = uuid.UUID(current_user.id)
    result = await db.execute(select(UserProfile).where(UserProfile.id == pid))
    profile = result.scalar_one_or_none()

    country = (profile.country or "USA")          if profile else "USA"
    roles   = (profile.desired_roles or [])       if profile else []
    role    = roles[0] if roles else "software engineer"

    news = _get_news(country=country, role=role)
    return {"news": news, "country": country, "role": role}
