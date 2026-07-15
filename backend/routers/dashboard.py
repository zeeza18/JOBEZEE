"""
Dashboard router — overview stats from DB + job-market news feed.

GET /api/dashboard/stats  — applied job stats from pulled_jobs DB table
GET /api/dashboard/news   — job market news from Google News RSS, persisted in
                            news_items (kept: today through 14 days back).
                            Refreshed daily at 12:00 PM America/Chicago by the
                            _news_refresh_loop background task in main.py.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import httpx
import xml.etree.ElementTree as ET
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..database import get_db
from ..models import UserJobState, UserProfile, NewsItem

router = APIRouter()

_NEWS_RETENTION = timedelta(days=14)


def _build_queries(country: str, role: str) -> list[tuple[str, str]]:
    """Return (query, category) pairs personalised to user's country + role.

    `when:14d` restricts Google News results to the last 14 days so we never
    pull in stale articles — no hardcoded year here, it goes stale every Jan 1.
    """
    c = country.strip() if country else "USA"
    r = role.strip()    if role    else "software engineer"
    return [
        # hiring / job match
        (f"{r} jobs hiring {c} when:14d",            "hiring"),
        (f"{r} new job openings {c} when:14d",       "new_posting"),
        (f"companies hiring {r} {c} when:14d",       "hiring"),
        (f"{r} remote jobs when:14d",                "new_posting"),
        (f"tech companies expanding {c} when:14d",   "hiring"),
        (f"startup hiring {r} when:14d",             "hiring"),
        # layoffs
        (f"tech layoffs {c} when:14d",               "layoffs"),
        (f"job cuts technology {c} when:14d",        "layoffs"),
        (f"tech company layoffs when:14d",           "layoffs"),
        # salary
        (f"{r} salary {c} when:14d",                 "salary"),
        (f"tech salary trends {c} when:14d",         "salary"),
        (f"{r} compensation benchmark when:14d",     "salary"),
        # market
        (f"job market outlook {c} when:14d",         "market"),
        (f"unemployment rate tech {c} when:14d",     "market"),
        (f"AI jobs future {c} when:14d",              "market"),
        (f"tech industry trends {c} when:14d",       "market"),
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


def _parse_pub_datetime(pub: str) -> datetime | None:
    try:
        from email.utils import parsedate_to_datetime
        dt = parsedate_to_datetime(pub)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def fetch_news_items(country: str, role: str) -> list[dict]:
    """Hit Google News RSS for every query variant for this country+role, deduped."""
    all_items: list[dict] = []
    seen: set[str] = set()
    for query, category in _build_queries(country, role):
        for item in _fetch_google_news(query, category, max_items=8):
            key = item["title"][:60]
            if key not in seen:
                seen.add(key)
                all_items.append(item)
    return all_items


async def store_news_items(db: AsyncSession, items: list[dict], country: str, role: str) -> int:
    """Upsert fetched RSS items into news_items, skipping ones already stored by link."""
    if not items:
        return 0
    links = [i["link"] for i in items]
    existing_res = await db.execute(select(NewsItem.link).where(NewsItem.link.in_(links)))
    existing = {row[0] for row in existing_res}
    added = 0
    for item in items:
        if item["link"] in existing:
            continue
        db.add(NewsItem(
            title=item["title"][:500],
            link=item["link"][:1000],
            source=(item.get("source") or "")[:200],
            category=item.get("category", ""),
            topic=(item.get("topic") or "")[:300],
            country=country,
            role=role,
            published_at=_parse_pub_datetime(item.get("published", "")),
        ))
        existing.add(item["link"])
        added += 1
    if added:
        await db.commit()
    return added


async def prune_old_news(db: AsyncSession) -> int:
    """Delete news_items older than the 14-day retention window."""
    from sqlalchemy import delete
    cutoff = datetime.now(timezone.utc) - _NEWS_RETENTION
    res = await db.execute(delete(NewsItem).where(NewsItem.published_at < cutoff))
    await db.commit()
    return res.rowcount


async def _get_news(db: AsyncSession, country: str = "USA", role: str = "software engineer") -> list[NewsItem]:
    cutoff = datetime.now(timezone.utc) - _NEWS_RETENTION
    query = (
        select(NewsItem)
        .where(
            func.lower(NewsItem.country) == country.lower(),
            func.lower(NewsItem.role) == role.lower(),
            NewsItem.published_at >= cutoff,
        )
        .order_by(NewsItem.published_at.desc())
    )
    rows = (await db.execute(query)).scalars().all()
    if rows:
        return list(rows)

    # Nothing fresh in DB yet for this combo (first request ever, or the
    # scheduled noon refresh hasn't covered this role/country) — fetch now.
    items = fetch_news_items(country, role)
    await store_news_items(db, items, country, role)
    rows = (await db.execute(query)).scalars().all()
    return list(rows)


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

    rows = await _get_news(db, country=country, role=role)
    news = [
        {
            "title": r.title, "link": r.link,
            "published": r.published_at.isoformat() if r.published_at else "",
            "source": r.source, "category": r.category, "topic": r.topic,
        }
        for r in rows
    ]
    return {"news": news, "country": country, "role": role}
