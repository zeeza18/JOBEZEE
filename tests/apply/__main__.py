"""
test_apply — quick apply test harness.

Usage:
    python test_apply --url <job_url>               # dry-run (safe, no Submit click)
    python test_apply --url <job_url> --live        # actually submit
    python test_apply --url <job_url> --headless    # run Chrome headless
    python test_apply --url <job_url> --model haiku # choose Claude model

This bypasses the full CLI pipeline and directly invokes the apply launcher
for a single job URL. The job must already be in the database with a tailored
resume (run `applypilot run score tailor` first, or `applypilot apply --url`
will also work for the same purpose).
"""

import argparse
import sys
import os
from pathlib import Path

# Make sure the src package is importable when running from the project root
_src = Path(__file__).parent.parent / "src"
if _src.exists():
    sys.path.insert(0, str(_src))


def main():
    parser = argparse.ArgumentParser(
        prog="python test_apply",
        description="Test the auto-apply pipeline on a single job URL.",
    )
    parser.add_argument("--url", required=True, help="Job URL to apply to")
    parser.add_argument(
        "--live",
        action="store_true",
        default=False,
        help="Actually click Submit (default: dry-run, no submit)",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        default=False,
        help="Run Chrome in headless mode (no visible window)",
    )
    parser.add_argument(
        "--model",
        default="gpt-4o-mini",
        help="Model to use (default: gpt-4o-mini). GPT: gpt-4o-mini, gpt-4o. Claude: haiku, sonnet, opus",
    )
    parser.add_argument(
        "--min-score",
        type=int,
        default=1,
        help="Minimum fit score threshold (default: 1 = accept any scored job)",
    )
    args = parser.parse_args()

    # Bootstrap: load env, create dirs, init DB
    from applypilot.config import load_env, ensure_dirs, check_tier
    from applypilot.database import init_db

    load_env()
    ensure_dirs()
    init_db()

    # Check Tier 3 requirements (Claude CLI + Chrome)
    check_tier(3, "auto-apply")

    dry_run = not args.live

    print(f"\n{'='*55}")
    print(f"  test_apply")
    print(f"{'='*55}")
    print(f"  URL:      {args.url}")
    print(f"  Model:    {args.model}")
    print(f"  Headless: {args.headless}")
    print(f"  Mode:     {'DRY RUN (no Submit)' if dry_run else 'LIVE — will submit!'}")
    print(f"{'='*55}\n")

    if not dry_run:
        confirm = input("LIVE mode will actually submit the application. Type 'yes' to confirm: ")
        if confirm.strip().lower() != "yes":
            print("Aborted.")
            sys.exit(0)

    from applypilot.apply.launcher import main as apply_main

    apply_main(
        limit=1,
        target_url=args.url,
        min_score=args.min_score,
        headless=args.headless,
        model=args.model,
        dry_run=dry_run,
        continuous=False,
        workers=1,
    )


if __name__ == "__main__":
    main()
