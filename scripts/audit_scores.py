"""
audit_scores.py — Diagnose and optionally rescore job-resume match scores.

Usage
-----
    python scripts/audit_scores.py              # summary report
    python scripts/audit_scores.py --rescore    # rescore all unscored jobs
    python scripts/audit_scores.py --rescore --user <email>   # rescore one user
    python scripts/audit_scores.py --hetzner    # run against Hetzner DB (SSH)

Output
------
  - Per-user table: email | resume title | skills | scored | unscored | issues
  - Global stats: total jobs, scored %, avg score
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

# ── Allow running as a script from repo root ─────────────────────────────────
_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_ROOT))


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers (asyncpg / SQLAlchemy)
# ─────────────────────────────────────────────────────────────────────────────

async def audit(rescore: bool = False, user_email: str = "") -> None:
    from backend.database import AsyncSessionLocal
    from backend.models import User, UserProfile, UserJobState
    from sqlalchemy import select, func as _func

    async with AsyncSessionLocal() as db:
        # ── 1. Load all users with profiles ──────────────────────────────────
        users_rows = (await db.execute(select(User))).scalars().all()
        profiles_map: dict[str, UserProfile] = {}

        for u in users_rows:
            if user_email and u.email.lower() != user_email.lower():
                continue
            import uuid
            pid = uuid.UUID(u.id) if not isinstance(u.id, uuid.UUID) else u.id
            p_res = await db.execute(select(UserProfile).where(UserProfile.id == pid))
            p = p_res.scalar_one_or_none()
            if p:
                profiles_map[u.email] = p

        if not profiles_map:
            print("No user profiles found" + (f" for {user_email}" if user_email else ""))
            return

        print()
        print("=" * 90)
        print(f"  JOBEZEE Score Audit — {len(profiles_map)} user(s)")
        print("=" * 90)
        print(f"{'EMAIL':<35} {'TITLE':<25} {'SKILLS':>6} {'SCORED':>7} {'UNSCORE':>7} {'ISSUES'}")
        print("-" * 90)

        total_scored = total_unscored = 0
        score_sum    = score_cnt = 0
        issues: list[str] = []

        for email, profile in profiles_map.items():
            rex   = profile.resume_extraction
            title = (rex or {}).get("title", "") or ""
            n_skills = len((rex or {}).get("skills") or [])

            if not rex:
                issues.append(f"  [NO_EXTRACTION] {email} — resume uploaded but never extracted (re-upload resume)")

            # Count job states
            uid_str = str(profile.id)
            scored_cnt = (await db.execute(
                select(_func.count())
                .select_from(UserJobState)
                .where(UserJobState.user_id == uid_str, UserJobState.match_score.isnot(None))
            )).scalar() or 0

            unscored_cnt = (await db.execute(
                select(_func.count())
                .select_from(UserJobState)
                .where(UserJobState.user_id == uid_str, UserJobState.match_score.is_(None))
            )).scalar() or 0

            if unscored_cnt > 0 and rex:
                issues.append(f"  [UNSCORED_JOBS] {email} — {unscored_cnt} jobs unscored (run --rescore)")
            if unscored_cnt > 0 and not rex:
                issues.append(f"  [CANT_SCORE] {email} — {unscored_cnt} jobs can't be scored (no resume_extraction)")

            # Avg score
            avg_res = await db.execute(
                select(_func.avg(UserJobState.match_score))
                .select_from(UserJobState)
                .where(UserJobState.user_id == uid_str, UserJobState.match_score.isnot(None))
            )
            avg = avg_res.scalar()
            if avg:
                score_sum += avg * scored_cnt
                score_cnt += scored_cnt

            total_scored   += scored_cnt
            total_unscored += unscored_cnt

            flag = "" if rex else " [NO EXT]"
            print(f"  {email:<33} {(title[:24] or '—'):<25} {n_skills:>6} {scored_cnt:>7} {unscored_cnt:>7}  {flag}")

        print("-" * 90)
        overall_avg = score_sum / score_cnt if score_cnt > 0 else 0
        print(f"  TOTAL: {total_scored + total_unscored} job-states | scored {total_scored} | unscored {total_unscored} | avg score {overall_avg*100:.1f}%")
        print()

        if issues:
            print("Issues detected:")
            for iss in issues:
                print(iss)
            print()

        # ── 2. Rescore if requested ───────────────────────────────────────────
        if rescore:
            await _rescore(db, profiles_map)


async def _rescore(db, profiles_map: dict) -> None:
    from backend.models import UserJobState, JobListing
    from backend.services.scorer_service import score_job_for_user
    from sqlalchemy import select, update
    from datetime import datetime, timezone

    print("Re-scoring unscored jobs...")
    now    = datetime.now(timezone.utc)
    total  = 0
    errors = 0

    for email, profile in profiles_map.items():
        rex = profile.resume_extraction
        if not rex:
            print(f"  Skip {email}: no resume_extraction")
            continue

        uid_str = str(profile.id)

        # Find unscored UserJobState rows for this user
        unscored = (await db.execute(
            select(UserJobState)
            .where(UserJobState.user_id == uid_str, UserJobState.match_score.is_(None))
        )).scalars().all()

        if not unscored:
            print(f"  {email}: already fully scored")
            continue

        # Load corresponding job listings
        import uuid
        job_ids = [row.job_id for row in unscored]
        jobs_rows = (await db.execute(
            select(JobListing).where(JobListing.id.in_(job_ids))
        )).scalars().all()
        jobs_map = {j.id: j for j in jobs_rows}

        scored_this = 0
        for state in unscored:
            job = jobs_map.get(state.job_id)
            if not job:
                errors += 1
                continue
            try:
                score, matched, missing = score_job_for_user(
                    job_title         = job.title or "",
                    job_description   = job.description or "",
                    job_llm_skills    = list(job.llm_skills) if job.llm_skills else None,
                    job_llm_years_min = job.llm_years_min,
                    resume_extraction = rex,
                )
                await db.execute(
                    update(UserJobState)
                    .where(UserJobState.id == state.id)
                    .values(match_score=score, matched_skills=matched, missing_skills=missing, scored_at=now)
                )
                scored_this += 1
                total       += 1
            except Exception as exc:
                print(f"    Error scoring job {job.id}: {exc}")
                errors += 1

        await db.commit()
        print(f"  {email}: scored {scored_this} jobs")

    print(f"\nRescore complete: {total} scored, {errors} errors")


# ─────────────────────────────────────────────────────────────────────────────
# Hetzner SSH mode
# ─────────────────────────────────────────────────────────────────────────────

def _run_on_hetzner(args: argparse.Namespace) -> None:
    import subprocess, shlex
    cmd = "python3 /app/scripts/audit_scores.py"
    if args.rescore:
        cmd += " --rescore"
    if args.user:
        cmd += f" --user {shlex.quote(args.user)}"

    ssh_cmd = [
        "ssh", "-o", "StrictHostKeyChecking=no",
        "root@5.161.60.37",
        f"docker exec jobezee-backend-1 {cmd}",
    ]
    print(f"Running on Hetzner: {' '.join(ssh_cmd)}")
    subprocess.run(ssh_cmd)


# ─────────────────────────────────────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Audit and rescore job-resume match scores")
    parser.add_argument("--rescore",  action="store_true", help="Rescore all unscored jobs")
    parser.add_argument("--user",     default="",          help="Filter to a single user email")
    parser.add_argument("--hetzner",  action="store_true", help="Run via SSH on Hetzner server")
    args = parser.parse_args()

    if args.hetzner:
        _run_on_hetzner(args)
        return

    asyncio.run(audit(rescore=args.rescore, user_email=args.user))


if __name__ == "__main__":
    main()
