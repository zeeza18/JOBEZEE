"""
Standalone test for Phase 1 filtering logic — no DB, no network needed.

Tests the three filter layers:
  1. _passes_country  — country + city filtering
  2. _passes_board_title — exclude_titles + role_keywords
  3. role_keywords extraction via SearchFilters

Run:
    cd JOBEZEE
    python test_scraper_filters.py
"""
import sys
from pathlib import Path

# Allow imports from RESUME-MAKER root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# ── import the new filter helpers ────────────────────────────────────────────
from JOBEZEE.PHASE1_JOB_SEARCH.models import SearchFilters
from JOBEZEE.PHASE1_JOB_SEARCH.jobspy_discovery import INDEED_COUNTRY_CODES


# ── reproduce the _passes_country closure for testing ────────────────────────

_REMOTE_LOC_KW = {"remote", "anywhere", "work from home", "wfh", "distributed"}

# Import production maps directly from service so test == production
sys.path.insert(0, str(Path(__file__).resolve().parent))
from backend.services.phase1_service import (
    _MAJOR_CITY_COUNTRY, _EXTRA_FOREIGN_COUNTRIES
)

_EXTRA_NON_TARGET = _EXTRA_FOREIGN_COUNTRIES  # alias for clarity

def make_country_filter(target_country_names: list[str]):
    """Rebuild the same logic as phase1_service.py."""
    target_codes: set[str] = set()
    _target_set: set[str] = set()
    _non_target_set: set[str] = set()

    for c in target_country_names:
        code = INDEED_COUNTRY_CODES.get(c)
        if code:
            target_codes.add(code)
        else:
            _target_set.add(c.lower())

    for name, code in INDEED_COUNTRY_CODES.items():
        name_lc = name.lower()
        if code in target_codes:
            _target_set.add(name_lc)
        elif len(name) > 2:
            _non_target_set.add(name_lc)

    # Add extra countries not covered by INDEED_COUNTRY_CODES
    _non_target_set.update(c for c in _EXTRA_NON_TARGET if c not in _target_set)

    def _passes(location: str) -> bool:
        if not _target_set:
            return True
        loc = location.lower()
        # 1. Foreign country name → reject (even if "(Remote)" also present)
        if any(nt in loc for nt in _non_target_set):
            return False
        # 2. Known foreign city → reject
        for city, city_country in _MAJOR_CITY_COUNTRY.items():
            if city in loc and city_country in _non_target_set:
                return False
        # 3. Ambiguous / pure remote → keep
        return True

    return _passes, _target_set, _non_target_set


def _passes_board_title(title: str, exclude_titles: list[str], role_keywords: set[str]) -> bool:
    tl = title.lower()
    if exclude_titles and any(ex.lower() in tl for ex in exclude_titles):
        return False
    if role_keywords:
        return any(kw in tl for kw in role_keywords)
    return True


# ── TEST SUITE ───────────────────────────────────────────────────────────────

PASS = "\033[92m✓ PASS\033[0m"
FAIL = "\033[91m✗ FAIL\033[0m"

def check(label: str, got: bool, expected: bool):
    status = PASS if got == expected else FAIL
    exp_str = "KEEP" if expected else "DROP"
    got_str = "KEEP" if got     else "DROP"
    note = "" if got == expected else f"  ← expected {exp_str}, got {got_str}"
    print(f"  {status}  {label}{note}")
    return got == expected


def run_tests():
    passed = 0
    total  = 0

    # ── SECTION 1: Country filter (USA only) ─────────────────────────────────
    print("\n═══ 1. Country filter (target=USA) ═══")
    passes, ts, nts = make_country_filter(["USA"])
    print(f"     _target_set sample    : {sorted(ts)[:5]}")
    print(f"     _non_target_set sample: {sorted(nts)[:8]}")

    cases = [
        # (location_string,                        passes_fn,  should_keep, description)
        ("New York, NY",                           passes,  True,  "US city — keep"),
        ("San Francisco, California",              passes,  True,  "US city+state — keep"),
        ("Remote",                                 passes,  True,  "Pure remote — keep"),
        ("Anywhere",                               passes,  True,  "Anywhere — keep"),
        ("Kolkata - Magnacon Building",            passes,  False, "India city, no 'India' — city map"),
        ("Bengaluru Millenia",                     passes,  False, "India city, no 'India' — city map"),
        ("Bangalore, India",                       passes,  False, "Explicit India — drop"),
        ("Bengaluru, Karnataka, India (Remote)",   passes,  False, "India + Remote — drop (country first)"),
        ("Toronto, Canada",                        passes,  False, "Explicit Canada — drop"),
        ("Canada, Remote",                         passes,  False, "Canada + Remote — drop (country first)"),
        ("Lisbon, Portugal",                       passes,  False, "Explicit Portugal — drop"),
        ("Lisbon",                                 passes,  False, "Lisbon city-only — city map"),
        ("Mumbai",                                 passes,  False, "Mumbai city-only — city map"),
        ("Noida",                                  passes,  False, "Noida (UP, India) — city map"),
        ("United Kingdom - London",                passes,  False, "Explicit UK — drop"),
        ("Uxbridge, UK (ZUK131)",                  passes,  False, "UK via city map (uxbridge)"),
        ("Germany, Munich",                        passes,  False, "Explicit Germany — drop"),
        ("Sant Cugat del Valles, Barcelona, Spain",passes,  False, "Explicit Spain — drop"),
        ("Spain - Remote",                         passes,  False, "Spain + Remote — drop (country first)"),
        ("San Francisco Bay Area",                 passes,  True,  "US region — keep"),
        ("United States",                          passes,  True,  "Explicit USA — keep"),
        ("Work from Home",                         passes,  True,  "WFH pure remote — keep"),
        ("2 Locations",                            passes,  True,  "Multi-location ambiguous — keep"),
        ("US, CA, Santa Clara",                    passes,  True,  "US state format — keep"),
        # Extended edge cases (expanded city map + extra countries)
        ("Israel, Tel Aviv",                       passes, False, "Israel (extra countries) — drop"),
        ("Tel Aviv",                               passes, False, "Tel Aviv city-only — city map"),
        ("Bucharest",                              passes, False, "Bucharest (Romania) — city map"),
        ("Prague",                                 passes, False, "Prague (Czech) — city map"),
        ("Istanbul",                               passes, False, "Istanbul (Turkey) — city map"),
        ("Kyiv, Ukraine",                          passes, False, "Explicit Ukraine — drop"),
        ("Cairo",                                  passes, False, "Cairo (Egypt) — city map"),
        ("Buenos Aires",                           passes, False, "Buenos Aires (Argentina) — city map"),
        ("Sydney, Australia",                      passes, False, "Explicit Australia — drop"),
        ("Seoul",                                  passes, False, "Seoul (S. Korea) — city map"),
    ]

    for loc, fn, expected, desc in cases:
        got = fn(loc)
        ok = check(f"{desc:45s}  loc={loc!r}", got, expected)
        passed += ok
        total  += 1

    # ── SECTION 2: Role keywords from SearchFilters ───────────────────────────
    print("\n═══ 2. Role keyword extraction ═══")
    titles_ai = ["AI Engineer", "Machine Learning Engineer", "LLM Engineer", "MLOps Engineer"]
    sf = SearchFilters(queries=titles_ai)
    kws = set(sf._title_include_keywords())
    print(f"     Input titles : {titles_ai}")
    print(f"     role_keywords: {sorted(kws)}")

    assert "ai" in kws,      "❌ 'ai' should be in keywords for 'AI Engineer'"
    assert "llm" in kws,     "❌ 'llm' should be in keywords for 'LLM Engineer'"
    assert "machine" in kws, "❌ 'machine' should be in keywords for 'ML Engineer'"
    print(f"  {PASS}  'ai', 'llm', 'machine' all present in role_keywords")
    passed += 1; total += 1

    # ── SECTION 3: Title filter ───────────────────────────────────────────────
    print("\n═══ 3. Title filter (AI Engineer + senior-level excludes) ═══")
    role_keywords = kws
    excludes = ["intern", "internship", "junior", "entry level", "entry-level"]

    title_cases = [
        # (job_title,                                          expected, note)
        ("Senior AI Engineer",                                 True,  "exact match — keep"),
        ("AI/ML Infrastructure Engineer",                      True,  "contains 'ai' — keep"),
        ("Machine Learning Platform Lead",                     True,  "contains 'machine' — keep"),
        ("LLM Research Engineer",                              True,  "contains 'llm' — keep"),
        ("MLOps Engineer",                                     True,  "mlops — keep"),
        ("IN_Senior Associate_Automation Anywhere Developer",  False, "no AI keyword — drop"),
        ("Principal Engineer - Target India",                  False, "no AI keyword — drop"),
        ("Director, Business Development, Agentic-2",          False, "no AI keyword — drop"),
        ("Manager, Product Management – Technical",            False, "no AI keyword — drop"),
        ("Senior Cloud Platform Engineer",                     False, "no AI keyword — drop"),
        ("AI Test Automation Engineer",                        True,  "contains 'ai' — keep"),
        ("Junior AI Engineer",                                 False, "excluded: junior"),
        ("AI Engineering Intern",                              False, "excluded: intern"),
    ]

    for title, expected, note in title_cases:
        got = _passes_board_title(title, excludes, role_keywords)
        ok  = check(f"{note:45s}  title={title!r}", got, expected)
        passed += ok
        total  += 1

    # ── SECTION 4: Old role_keywords (show the bug) ───────────────────────────
    print("\n═══ 4. Old role_keywords bug demonstration ═══")
    old_kws = {w.lower() for q in titles_ai for w in q.split() if len(w) > 2}
    print(f"     OLD role_keywords (len>2): {sorted(old_kws)}")
    print(f"     NEW role_keywords (SearchFilters): {sorted(kws)}")

    bug_title = "IN-Senior Associate_Automation Anywhere Developer"
    old_passes = _passes_board_title(bug_title, [], old_kws)
    new_passes = _passes_board_title(bug_title, [], kws)
    print(f"     '{bug_title}'")
    print(f"       OLD filter: {'KEEP (BUG!)' if old_passes else 'DROP'}")
    print(f"       NEW filter: {'KEEP (BUG!)' if new_passes else 'DROP (fixed)'}")

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'═'*55}")
    print(f"  Results: {passed}/{total} passed")
    if passed == total:
        print(f"  \033[92mAll tests passed — filters are working correctly!\033[0m")
    else:
        print(f"  \033[91m{total - passed} test(s) failed — review output above.\033[0m")
    print(f"{'═'*55}\n")
    return passed == total


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
