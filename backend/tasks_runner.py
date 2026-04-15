"""
Standalone background tasks runner — runs on Hetzner.

Runs: auto-search loop (hourly job pull) + digest email loop (every 5h).
Does NOT start an HTTP server — this is a pure background worker.

Run from /opt/jobezee:
    .venv/bin/python -m backend.tasks_runner
"""
from __future__ import annotations

import asyncio
import logging
import os

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

log = logging.getLogger(__name__)


async def main() -> None:
    # Run DB migrations once before starting loops
    from .database import create_tables, run_column_migrations, run_schema_migration
    log.info("[TasksRunner] Running DB startup migrations...")
    try:
        await create_tables()
        await run_column_migrations()
        await run_schema_migration()
        log.info("[TasksRunner] DB ready")
    except Exception as exc:
        log.warning("[TasksRunner] DB startup warning (non-fatal): %s", exc)

    from .main import _auto_search_loop, _digest_email_loop
    log.info("[TasksRunner] Starting auto-search + digest-email loops")

    await asyncio.gather(
        _auto_search_loop(),
        _digest_email_loop(),
    )


if __name__ == "__main__":
    asyncio.run(main())
