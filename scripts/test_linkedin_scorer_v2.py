#!/usr/bin/env python3
"""
LinkedIn scorer integration test — posts real profile to Hetzner worker and audits results.
Usage:  python scripts/test_linkedin_scorer_v2.py [--optimize]
"""
import argparse
import json
import sys
from pathlib import Path

import requests

WORKER_URL    = "http://5.161.60.37:8001"
WORKER_SECRET = "0KjGN4CyApHlkxsPpxIG9QlYQfcaZsnQCP2jbA1kKLE"
HEADERS       = {"Authorization": f"Bearer {WORKER_SECRET}"}

PROFILE_PDF   = Path(r"C:\Users\azeez\Downloads\Profile (1).pdf")
PROFILE_IMG   = Path(r"C:\Users\azeez\Downloads\prfolie.png")
HEADER_IMG    = Path(r"C:\Users\azeez\Downloads\header.jpg")

TARGET_ROLE   = "AI/ML Engineer"


def poll(endpoint: str, job_id: str, label: str, timeout_s: int = 300) -> dict:
    import time
    url = f"{WORKER_URL}{endpoint}/{job_id}"
    deadline = time.time() + timeout_s
    dots = 0
    while time.time() < deadline:
        r = requests.get(url, headers=HEADERS, timeout=30)
        r.raise_for_status()
        data = r.json()
        status = data.get("status", "")
        if status == "done":
            print(f"\r  {label} complete.                    ")
            return data.get("result", data)
        if status == "error":
            raise RuntimeError(f"{label} failed: {data.get('error', data)}")
        dots = (dots + 1) % 4
        print(f"\r  {label} [{status}]{'.' * dots}   ", end="", flush=True)
        time.sleep(4)
    raise TimeoutError(f"{label} timed out after {timeout_s}s")


def post_analyze() -> dict:
    files = [
        ("profile_pdf", ("Profile.pdf", PROFILE_PDF.read_bytes(), "application/pdf")),
        ("profile_image", (PROFILE_IMG.name, PROFILE_IMG.read_bytes(), "image/png")),
        ("cover_image",   (HEADER_IMG.name,  HEADER_IMG.read_bytes(),  "image/jpeg")),
    ]
    data = {"target_role": TARGET_ROLE}
    print(f"  POST {WORKER_URL}/api/linkedin-boost/analyze  (PDF + 2 images)...")
    r = requests.post(
        f"{WORKER_URL}/api/linkedin-boost/analyze",
        headers=HEADERS, files=files, data=data, timeout=30,
    )
    r.raise_for_status()
    resp = r.json()
    if "job_id" in resp:
        return poll("/api/linkedin-boost/status", resp["job_id"], "Scoring")
    return resp


def post_optimize(score_result: dict) -> dict:
    body = {
        "pdf_text":    score_result.get("pdf_text", ""),
        "score_result": score_result,
        "target_role": TARGET_ROLE,
    }
    print(f"  POST {WORKER_URL}/api/linkedin-boost/optimize ...")
    r = requests.post(
        f"{WORKER_URL}/api/linkedin-boost/optimize",
        headers=HEADERS, json=body, timeout=30,
    )
    r.raise_for_status()
    resp = r.json()
    if "job_id" in resp:
        return poll("/api/linkedin-boost/optimize-status", resp["job_id"], "Optimizing")
    return resp


def bar(pct: int, width: int = 20) -> str:
    filled = round(pct / 100 * width)
    return "█" * filled + "░" * (width - filled)


HALLUCINATION_CHECKS = [
    # (description, check_fn that returns (passed: bool, note: str))
    ("Recommendations not fabricated",
     lambda r: (
         not any(
             any(
                 ("recommendations" in str(s).lower() and
                  any(w in str(s).lower() for w in ["present", "received", "endorsed", "written", "from colleague", "peer"]))
                 for s in b.get("strengths", [])
             )
             for b in r.get("buckets", [])
             if b.get("id") == "proof" and not r.get("parsed_sections", {}).get("has_recommendations")
         ),
         "proof bucket shouldn't claim peer recommendations exist when none are visible"
     )),
    ("Skills section thin flag present",
     lambda r: (
         any(
             "skills" in (b.get("id") or "") and b.get("score", 10) <= 7
             for b in r.get("buckets", [])
         ),
         "skills score should be ≤7/10 since only 3 Top Skills visible in PDF"
     )),
    ("Visual bucket scored (not zero)",
     lambda r: (
         any(b.get("id") == "visual" and b.get("score", 0) > 0 for b in r.get("buckets", [])),
         "images were uploaded — visual score should be > 0"
     )),
    ("No 'no photo uploaded' in fixes",
     lambda r: (
         not any("no photo" in str(f).lower() for f in r.get("priority_fixes", [])),
         "photos were provided — fix text must not say 'no photo uploaded'"
     )),
    ("Headline rewrite present",
     lambda r: (bool(r.get("headline_rewrite")), "headline_rewrite should be present")),
    ("About tips present",
     lambda r: (len(r.get("about_tips", [])) >= 2, "should have ≥2 about tips")),
    ("Priority fixes have example field",
     lambda r: (
         all("example" in f for f in r.get("priority_fixes", []) if f.get("impact") == "High"),
         "High-impact fixes must include an example field"
     )),
]


def run_hallucination_checks(result: dict) -> None:
    print("\n─── HALLUCINATION / QUALITY CHECKS ─────────────────────────")
    passed = 0
    for desc, check_fn in HALLUCINATION_CHECKS:
        try:
            ok, note = check_fn(result)
        except Exception as e:
            ok, note = False, f"check error: {e}"
        icon = "✓" if ok else "✗"
        print(f"  {icon} {desc}")
        if not ok:
            print(f"      FAIL: {note}")
        else:
            passed += 1
    print(f"\n  {passed}/{len(HALLUCINATION_CHECKS)} checks passed")


def print_score_report(result: dict) -> None:
    print("\n══════════════════════════════════════════════════════════════")
    print("  LINKEDIN PROFILE SCORER — TEST REPORT")
    print("══════════════════════════════════════════════════════════════")

    ps = result.get("parsed_sections", {})
    print("\n─── PARSED SECTIONS ─────────────────────────────────────────")
    print(f"  Headline     : {(ps.get('headline') or '')[:90]}")
    about_len = len(ps.get("about") or "")
    print(f"  About        : {about_len} chars")
    exp = ps.get("experience") or []
    print(f"  Experience   : {len(exp)} role entries detected")
    skills = ps.get("skills") or []
    print(f"  Skills       : {len(skills)} skills visible in PDF")
    edu = ps.get("education") or []
    print(f"  Education    : {edu[:2]}")
    print(f"  Recommendations: {'YES' if ps.get('has_recommendations') else 'NO'}")

    print(f"\n─── OVERALL: {result['overall_score']}/100  [{result['grade']}] ──────────────────────")
    print(f"  {result.get('overall_verdict', '')}")

    print("\n─── BUCKET SCORES ───────────────────────────────────────────")
    for b in result.get("buckets", []):
        flag = " ⚠️ " if b["pct"] < 50 else ("  ✓ " if b["pct"] >= 80 else "    ")
        print(f"  {flag}{b['label']:<18} {b['score']:>2}/{b['max']:<2}  {bar(b['pct'])}  {b['pct']}%")
        for g in b.get("gaps", [])[:2]:
            print(f"         GAP: {g[:100]}")

    print("\n─── TOP STRENGTHS ───────────────────────────────────────────")
    for s in result.get("top_strengths", []):
        print(f"  ✓ {s}")

    print("\n─── TOP GAPS ────────────────────────────────────────────────")
    for g in result.get("top_gaps", []):
        print(f"  ✗ {g}")

    print("\n─── PRIORITY FIXES ──────────────────────────────────────────")
    for i, f in enumerate(result.get("priority_fixes", []), 1):
        print(f"  [{f['impact']:^6}] #{i} — {f['section'].upper()}")
        print(f"    Issue  : {f['issue'][:120]}")
        print(f"    Fix    : {f['fix'][:120]}")
        if f.get("example"):
            print(f"    Example: {f['example'][:120]}")

    hr = result.get("headline_rewrite")
    if hr:
        print("\n─── HEADLINE REWRITE ────────────────────────────────────────")
        print(f"  Current : {hr['current'][:100]}")
        print(f"  Improved: {hr['improved'][:100]}")
        print(f"  Why     : {hr['reason'][:120]}")

    print("\n─── ABOUT TIPS ──────────────────────────────────────────────")
    for t in result.get("about_tips", []):
        print(f"  → {t[:120]}")

    pi = result.get("profile_image")
    ci = result.get("cover_image")
    if pi or ci:
        print("\n─── IMAGE ANALYSIS ──────────────────────────────────────────")
        if pi:
            print(f"  Profile Photo : {pi['score']}/100")
            for s in (pi.get("suggestions") or [])[:2]:
                print(f"    → {s}")
        if ci:
            print(f"  Cover Banner  : {ci['score']}/100")
            for s in (ci.get("suggestions") or [])[:2]:
                print(f"    → {s}")

    run_hallucination_checks(result)


def print_optimize_report(opt: dict) -> None:
    print("\n══════════════════════════════════════════════════════════════")
    print("  OPTIMIZE RESULTS")
    print("══════════════════════════════════════════════════════════════")

    hl = opt.get("headline", {})
    if hl:
        print("\n─── HEADLINE ────────────────────────────────────────────────")
        print(f"  Before : {hl.get('current','')[:100]}")
        print(f"  After  : {hl.get('optimized','')[:100]}")
        print(f"  Why    : {hl.get('reason','')[:120]}")

    ab = opt.get("about", {})
    if ab:
        print("\n─── ABOUT (first 400 chars of optimized) ────────────────────")
        print(f"  {ab.get('optimized','')[:400]}")
        for c in (ab.get("key_changes") or [])[:4]:
            print(f"  ✓ {c}")

    for exp in (opt.get("experience") or [])[:3]:
        print(f"\n─── {exp.get('company','')} — {exp.get('title','')} ──────")
        for b in (exp.get("optimized_bullets") or [])[:4]:
            print(f"  • {b[:110]}")

    sk = opt.get("skills", {})
    if sk:
        print("\n─── SKILLS (reordered) ──────────────────────────────────────")
        print("  " + ", ".join((sk.get("reordered") or [])[:15]))
        for a in (sk.get("add_if_true") or [])[:5]:
            print(f"  + {a.get('skill','')} — {a.get('reason','')[:80]}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--optimize", action="store_true", help="Also run optimize after scoring")
    args = parser.parse_args()

    for p in [PROFILE_PDF, PROFILE_IMG, HEADER_IMG]:
        if not p.exists():
            print(f"ERROR: File not found: {p}")
            sys.exit(1)

    print("Step 1 — Scoring profile (PDF + profile photo + cover banner)...")
    result = post_analyze()

    # Save raw JSON for inspection
    out = Path("scripts/test_score_result.json")
    out.write_text(json.dumps(result, indent=2))
    print(f"  Raw result saved → {out}")

    print_score_report(result)

    if args.optimize:
        print("\nStep 2 — Optimizing profile sections...")
        opt = post_optimize(result)
        out2 = Path("scripts/test_optimize_result.json")
        out2.write_text(json.dumps(opt, indent=2))
        print(f"  Raw result saved → {out2}")
        print_optimize_report(opt)


if __name__ == "__main__":
    main()
