"""
extract_jobs.py — Extract skills/title/years from unprocessed job listings via Groq API.

Runs on server (2 GB RAM OK — just API calls, zero GPU).
Queries job_listings for rows where llm_extracted_at IS NULL, calls Groq in parallel, writes back.

Usage
-----
  python scripts/extract_jobs.py              # process all pending, then exit
  python scripts/extract_jobs.py --loop       # run forever, poll every 5 min
  python scripts/extract_jobs.py --limit 500  # cap at 500 jobs per run
  python scripts/extract_jobs.py --workers 10 # concurrent Groq calls (default 5)
  python scripts/extract_jobs.py --dry-run    # show pending count, no writes

Groq free tier: ~30 req/min → --workers 5 with 2s sleep is safe.
Groq paid tier: crank --workers up to 20-50.

Cron (server, every 30 min):
  */30 * * * * cd /opt/jobezee && .venv/bin/python scripts/extract_jobs.py >> /var/log/extract_jobs.log 2>&1
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import time
from pathlib import Path

# ── Load .env ─────────────────────────────────────────────────────────────────
_ROOT = Path(__file__).resolve().parent.parent


def _load_env() -> None:
    for p in [_ROOT / ".env", _ROOT.parent / ".env"]:
        if p.exists():
            for line in p.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
            return


_load_env()
sys.path.insert(0, str(_ROOT))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

BATCH_SIZE    = 100   # jobs fetched per DB query
POLL_INTERVAL = 300   # seconds between polls in --loop mode


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers (psycopg2 — sync, Windows-safe SSL)
# ─────────────────────────────────────────────────────────────────────────────

def _pg_url() -> str:
    """Convert DATABASE_URL to plain postgresql:// for asyncpg (no SSL needed on Hetzner)."""
    url = os.environ.get("DATABASE_URL", "")
    for pfx in ("postgresql+asyncpg://", "postgres://"):
        if url.startswith(pfx):
            url = "postgresql://" + url[len(pfx):]
    # Strip any ssl params — Hetzner postgres is local, no SSL
    import re as _re
    url = _re.sub(r"[?&]ssl\w*=\w+", "", url).rstrip("?&")
    return url


async def _get_pool():
    import asyncpg
    return await asyncpg.create_pool(_pg_url(), min_size=2, max_size=10)


async def count_pending(pool) -> int:
    row = await pool.fetchrow(
        "SELECT COUNT(*) AS n FROM job_listings "
        "WHERE llm_extracted_at IS NULL AND char_length(description) > 100"
    )
    return int(row["n"])


async def fetch_batch(pool, limit: int) -> list[dict]:
    rows = await pool.fetch(
        "SELECT id::text AS id, description FROM job_listings "
        "WHERE llm_extracted_at IS NULL AND char_length(description) > 100 "
        "ORDER BY first_seen_at DESC LIMIT $1",
        limit,
    )
    return [{"id": r["id"], "description": r["description"]} for r in rows]


async def write_result(pool, job_id: str, skills: list, title: str, years_min: int | None) -> None:
    await pool.execute(
        """
        UPDATE job_listings
           SET llm_skills       = $1::jsonb,
               llm_title        = $2,
               llm_years_min    = $3,
               llm_extracted_at = now()
         WHERE id = $4::uuid
        """,
        json.dumps(skills), title or "", years_min, job_id,
    )


async def mark_failed(pool, job_id: str) -> None:
    await pool.execute(
        "UPDATE job_listings SET llm_skills='[]'::jsonb, llm_title='', "
        "llm_extracted_at=now() WHERE id=$1::uuid",
        job_id,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Extraction (one job — runs in thread pool for parallelism)
# ─────────────────────────────────────────────────────────────────────────────

def _extract_one(job: dict) -> tuple[str, list, str, int | None]:
    """Sync — runs in thread pool. Returns (job_id, skills, title, years_min)."""
    job_id = job["id"]
    desc   = job["description"] or ""
    try:
        from backend.services.extraction_service import extract_jd
        result = extract_jd(desc)
        if result and result.skills:
            return job_id, result.skills, result.title, result.years_min or None
    except Exception as exc:
        log.debug("[%s] extraction error: %s", job_id[:8], exc)
    return job_id, [], "", None


# ─────────────────────────────────────────────────────────────────────────────
# Main processing loop (async)
# ─────────────────────────────────────────────────────────────────────────────

async def _process_one(pool, job: dict, sem: asyncio.Semaphore, stats: dict, dry_run: bool) -> None:
    if dry_run:
        log.info("  [dry-run] %s (%d chars)", job["id"][:8], len(job["description"] or ""))
        stats["ok"] += 1
        return

    async with sem:
        job_id, skills, title, years_min = await asyncio.to_thread(_extract_one, job)

    if skills:
        await write_result(pool, job_id, skills, title, years_min)
        log.info("  ✓ %s  →  %-40s  %2d skills  %s yrs",
                 job_id[:8], (title or "(no title)")[:40], len(skills), years_min or "?")
        stats["ok"] += 1
    else:
        await mark_failed(pool, job_id)
        log.warning("  ✗ %s  empty extraction — marked done", job_id[:8])
        stats["fail"] += 1


async def run(limit: int, loop_mode: bool, dry_run: bool, workers: int) -> None:
    log.info("=== extract_jobs  workers=%d  limit=%s  loop=%s  dry_run=%s ===",
             workers, limit or "all", loop_mode, dry_run)

    pool = await _get_pool()
    n    = await count_pending(pool)
    log.info("Connected  (pending: %d)", n)

    sem        = asyncio.Semaphore(workers)
    total_done = 0

    try:
        while True:
            batch_size = min(limit - total_done, BATCH_SIZE) if limit > 0 else BATCH_SIZE
            batch   = await fetch_batch(pool, batch_size)
            pending = await count_pending(pool)

            if not batch:
                log.info("No pending jobs — done.")
                if not loop_mode:
                    break
                log.info("Sleeping %ds…", POLL_INTERVAL)
                await asyncio.sleep(POLL_INTERVAL)
                continue

            t0    = time.perf_counter()
            stats = {"ok": 0, "fail": 0}
            log.info("── Batch: %d jobs  (pending total: %d) ──", len(batch), pending)
            await asyncio.gather(*[_process_one(pool, j, sem, stats, dry_run) for j in batch])
            elapsed = time.perf_counter() - t0
            total_done += stats["ok"] + stats["fail"]

            log.info("Batch done in %.1fs  ✓ %d  ✗ %d  (total: %d)",
                     elapsed, stats["ok"], stats["fail"], total_done)

            if limit > 0 and total_done >= limit:
                break
            if not loop_mode and pending <= len(batch):
                break
            if loop_mode:
                log.info("Sleeping %ds…", POLL_INTERVAL)
                await asyncio.sleep(POLL_INTERVAL)
    finally:
        await pool.close()

    log.info("=== All done. Total processed: %d ===", total_done)


def main() -> None:
    args = sys.argv[1:]
    loop_mode = "--loop"    in args
    dry_run   = "--dry-run" in args

    limit = 0
    if "--limit" in args:
        idx = args.index("--limit")
        try:
            limit = int(args[idx + 1])
        except (IndexError, ValueError):
            log.error("--limit requires an integer")
            sys.exit(1)

    workers = 5  # safe for Groq free tier (~30 req/min)
    if "--workers" in args:
        idx = args.index("--workers")
        try:
            workers = int(args[idx + 1])
        except (IndexError, ValueError):
            log.error("--workers requires an integer")
            sys.exit(1)

    if "--hetzner" in args:
        _run_on_hetzner([a for a in args if a != "--hetzner"])
        return

    asyncio.run(run(limit=limit, loop_mode=loop_mode, dry_run=dry_run, workers=workers))


def _run_on_hetzner(extra_args: list[str]) -> None:
    """SSH to Hetzner and run extract_jobs.py there (has direct DB access)."""
    import paramiko
    host = os.environ.get("HETZNER_HOST", "5.161.60.37")
    user = os.environ.get("HETZNER_USER", "root")
    pwd  = os.environ.get("HETZNER_PASSWORD", "")

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(host, username=user, password=pwd, timeout=15)

    args_str = " ".join(extra_args)
    cmd = f"cd /opt/jobezee && .venv/bin/python scripts/extract_jobs.py {args_str}"
    log.info("Running on Hetzner: %s", cmd)

    _, out, err = c.exec_command(cmd, timeout=600)
    for line in out:
        print(line, end="", flush=True)
    for line in err:
        print(line, end="", flush=True)
    c.close()


if __name__ == "__main__":
    main()
