"""
reset.py — wipe ALL data from the database (keeps table structure).

Usage:
    python reset.py                  # dry-run: shows what would be deleted
    python reset.py --confirm        # actually deletes everything

DATABASE_URL is read from (in order):
  1. DATABASE_URL environment variable
  2. backend/.env file
  3. .env file in this directory

On Windows, connections to Neon fail at the TLS layer.  The script
automatically routes through the Hetzner VPS (Linux) via paramiko SSH
when running on Windows or when the direct connection fails.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path


# ── Load .env if present ──────────────────────────────────────────────────────

def _load_env() -> None:
    for candidate in [
        Path(__file__).parent / ".env",
        Path(__file__).parent / "backend" / ".env",
    ]:
        if candidate.exists():
            for line in candidate.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())
            print(f"[reset] Loaded env from {candidate}")
            break


_load_env()

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("[reset] ERROR: DATABASE_URL not set.")
    print("  Set it as an env var, or create a .env / backend/.env file.")
    sys.exit(1)


# ── Parse DB URL into connection kwargs (psycopg2 style) ─────────────────────

from urllib.parse import urlparse, parse_qs, unquote

def _parse_db_url(url: str) -> dict:
    """Convert any postgres:// URL variant into psycopg2 keyword args."""
    # Normalise scheme
    for src, dst in [
        ("postgresql+asyncpg://", "postgresql://"),
        ("postgresql+psycopg2://", "postgresql://"),
        ("postgres://", "postgresql://"),
    ]:
        if url.startswith(src):
            url = dst + url[len(src):]
            break

    p = urlparse(url)
    qs = parse_qs(p.query, keep_blank_values=True)
    needs_ssl = bool(qs.get("ssl") or qs.get("sslmode"))

    host = p.hostname or ""
    endpoint_id = host.split(".")[0] if host else ""

    kwargs: dict = {
        "host":     host,
        "port":     p.port or 5432,
        "dbname":   (p.path or "/neondb").lstrip("/"),
        "user":     unquote(p.username or ""),
        "password": unquote(p.password or ""),
        "connect_timeout": 20,
    }
    if needs_ssl:
        kwargs["sslmode"] = "require"
    if endpoint_id.startswith("ep-"):
        kwargs["options"] = f"endpoint={endpoint_id}"
    return kwargs


_DB_KWARGS = _parse_db_url(DATABASE_URL)


# ── Tables to wipe (order matters — FK children first) ───────────────────────

_DATA_TABLES = [
    "application_emails",
    "applications",
    "user_job_states",
    "job_listings",
    "preference_cache",
    "pulled_jobs",
    "tailor_jobs",
    "resumes",
    "search_sessions",
    "portfolio_configs",
    "password_reset_tokens",
    "feedback",
    "app_logs",
    "error_logs",
    "billing_txns",
    "tool_usage",
    "user_events",
    # v2 schema (may not exist on all envs)
    "job_preferences",
    "user_skills",
    "user_credentials",
    # parent / auth tables last
    "user_profiles",
    "users",
]


# ── Local (direct) reset ──────────────────────────────────────────────────────

def _try_local_conn():
    """Try opening a psycopg2 connection. Returns conn or raises."""
    import psycopg2
    return psycopg2.connect(**_DB_KWARGS)


def _reset_via_local(confirm: bool) -> None:
    conn = _try_local_conn()
    conn.autocommit = True
    cur = conn.cursor()
    _run_reset(cur, conn, confirm)
    cur.close()
    conn.close()


# ── Remote (Hetzner SSH) reset ────────────────────────────────────────────────

# Hetzner credentials — override via env vars if needed
_HETZNER_HOST = os.environ.get("HETZNER_HOST", "5.161.60.37")
_HETZNER_USER = os.environ.get("HETZNER_USER", "root")
_HETZNER_PASS = os.environ.get("HETZNER_PASS", "Zeeza_het@6996")


def _reset_via_hetzner(confirm: bool) -> None:
    """Upload a tiny script to Hetzner, run it there, stream output."""
    import io
    import paramiko

    confirm_flag = "--confirm" if confirm else ""

    # Build the remote script
    kwargs_repr = repr(_DB_KWARGS)
    tables_repr = repr(_DATA_TABLES)
    remote_script = f'''
import psycopg2, sys
kwargs = {kwargs_repr}
tables = {tables_repr}
confirm = {"True" if confirm else "False"}

conn = psycopg2.connect(**kwargs)
conn.autocommit = True
cur = conn.cursor()
print("[reset] Connected via Hetzner proxy!")

counts = {{}}
for t in tables:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {{t}}")
        counts[t] = cur.fetchone()[0]
    except Exception:
        conn.rollback()
        counts[t] = -1

print("\\n[reset] Row counts before wipe:")
total = 0
for t, c in counts.items():
    if c == -1:
        print(f"  {{t:<30}}  (does not exist — skip)")
    else:
        mark = " <" if c > 0 else ""
        print(f"  {{t:<30}}  {{c:>8}} rows{{mark}}")
        total += c
print(f"\\n  TOTAL rows to delete: {{total}}")

if not confirm:
    print("\\n[reset] DRY RUN — nothing deleted.")
    print("  Re-run with  python reset.py --confirm  to actually wipe the data.")
    cur.close(); conn.close(); sys.exit(0)

print("\\n[reset] WARNING: DELETING ALL DATA ...")
deleted = {{}}
cur.execute("SET session_replication_role = replica")
for t in tables:
    if counts.get(t, -1) == -1:
        continue
    try:
        cur.execute(f"DELETE FROM {{t}}")
        deleted[t] = cur.rowcount
    except Exception as exc:
        print(f"  [WARN] Could not delete {{t}}: {{exc}}")
        conn.rollback()
        deleted[t] = 0
cur.execute("SET session_replication_role = DEFAULT")

print("\\n[reset] Rows deleted:")
for t, c in deleted.items():
    if c > 0:
        print(f"  {{t:<30}}  {{c:>8}} rows deleted")

grand = sum(deleted.values())
print(f"\\n[reset] Done — {{grand}} rows deleted. Database is now empty.")
cur.close(); conn.close()
'''

    print("[reset] Windows detected — routing through Hetzner SSH proxy...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        _HETZNER_HOST, username=_HETZNER_USER, password=_HETZNER_PASS,
        timeout=30, look_for_keys=False, allow_agent=False
    )

    sftp = client.open_sftp()
    sftp.putfo(io.BytesIO(remote_script.encode()), "/tmp/_jobezee_reset.py")
    sftp.close()

    stdin, stdout, stderr = client.exec_command(
        "pip3 install psycopg2-binary --break-system-packages -q 2>/dev/null; "
        "python3 /tmp/_jobezee_reset.py",
        timeout=120,
    )
    stdout.channel.set_combine_stderr(True)
    for line in iter(lambda: stdout.readline(), ""):
        print(line, end="", flush=True)
    client.close()


# ── Core reset logic (used by local path) ────────────────────────────────────

def _run_reset(cur, conn, confirm: bool) -> None:
    # Count rows
    counts: dict[str, int] = {}
    for table in _DATA_TABLES:
        try:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            counts[table] = cur.fetchone()[0]
        except Exception:
            conn.rollback()
            counts[table] = -1

    print("\n[reset] Row counts before wipe:")
    total = 0
    for table, cnt in counts.items():
        if cnt == -1:
            print(f"  {table:<30}  (does not exist — skip)")
        else:
            mark = " <" if cnt > 0 else ""
            print(f"  {table:<30}  {cnt:>8} rows{mark}")
            total += cnt
    print(f"\n  TOTAL rows to delete: {total}")

    if not confirm:
        print("\n[reset] DRY RUN — nothing deleted.")
        print("  Re-run with  python reset.py --confirm  to actually wipe the data.")
        return

    print("\n[reset] WARNING: DELETING ALL DATA — this cannot be undone …")

    deleted: dict[str, int] = {}
    cur.execute("SET session_replication_role = replica")

    for table in _DATA_TABLES:
        if counts.get(table, -1) == -1:
            continue
        try:
            cur.execute(f"DELETE FROM {table}")
            deleted[table] = cur.rowcount
        except Exception as exc:
            print(f"  [WARN] Could not delete from {table}: {exc}")
            conn.rollback()
            deleted[table] = 0

    cur.execute("SET session_replication_role = DEFAULT")

    print("\n[reset] Rows deleted:")
    for table, cnt in deleted.items():
        if cnt > 0:
            print(f"  {table:<30}  {cnt:>8} rows deleted")

    grand_total = sum(deleted.values())
    print(f"\n[reset] Done — {grand_total} rows deleted. Database is now empty.")


# ── Entry point ───────────────────────────────────────────────────────────────

def reset(confirm: bool) -> None:
    print(f"\n[reset] Connecting to database…")

    if sys.platform == "win32":
        # Windows can't complete TLS handshake with Neon — use Hetzner proxy
        _reset_via_hetzner(confirm)
        return

    # Linux / Mac — try direct connection
    try:
        _reset_via_local(confirm)
    except Exception as exc:
        print(f"[reset] Direct connection failed: {exc}")
        print("[reset] Falling back to Hetzner SSH proxy...")
        _reset_via_hetzner(confirm)


if __name__ == "__main__":
    confirm = "--confirm" in sys.argv
    reset(confirm)
