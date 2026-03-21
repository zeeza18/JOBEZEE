"""
PHASE1_JOB_SEARCH — Global job discovery library.

Three discovery sources, one unified interface.  Designed for worldwide reach:
  - 35+ country codes for Indeed regional searches
  - 80+ Workday employer portals across North America, Europe, APAC & Middle East
  - AI-powered extraction for any career site (Playwright + LLM)

Quick start::

    from PHASE1_JOB_SEARCH import search_boards, search_workday, search_smart
    from PHASE1_JOB_SEARCH import (
        JobRecord, SearchFilters, LLMClient, deduplicate,
        INDEED_COUNTRY_CODES, GLOBAL_EMPLOYERS, get_global_employers,
    )

    # --- Global board search ---
    jobs = search_boards(
        queries   = ["software engineer"],
        locations = ["Remote", "London, UK", "Berlin, Germany"],
        countries = ["United Kingdom", "Germany"],   # multi-country Indeed sweep
    )

    # --- Filter global Workday employers ---
    eu_fintech = get_global_employers(regions=["europe"], industries=["finance"])
    wd_jobs = search_workday(queries=["data analyst"], employers=eu_fintech)

    # --- SearchFilters (future filter pipeline) ---
    f = SearchFilters(
        queries    = ["ML engineer"],
        locations  = ["Remote"],
        countries  = ["USA", "Canada"],
        hours_old  = 48,
        remote_only = True,
    )
    jobs = search_boards(**f.to_jobspy_kwargs())

Modules:
    jobspy_discovery       — Indeed, LinkedIn, ZipRecruiter, Glassdoor, Google Jobs
    workday_discovery      — Workday ATS company career portals (direct JSON API)
    smartextract_discovery — AI-powered extraction for arbitrary career sites
    models                 — JobRecord, SearchFilters, deduplicate()
    llm                    — LLMClient (Gemini / OpenAI)
"""

from .llm import LLMClient, extract_json
from .models import JobRecord, UserPreferences, SearchFilters, deduplicate, REGION_COUNTRIES
from .jobspy_discovery import search as search_boards, INDEED_COUNTRY_CODES
from .workday_discovery import (
    search as search_workday,
    load_employers_yaml,
    GLOBAL_EMPLOYERS,
    get_global_employers,
)
try:
    from .smartextract_discovery import search as search_smart, build_targets_from_yaml
except ImportError:
    search_smart = None          # type: ignore[assignment]
    build_targets_from_yaml = None  # type: ignore[assignment]

__all__ = [
    # --- User entry point ---
    "UserPreferences",          # fill this in at login; drives all search decisions

    # --- Data model ---
    "JobRecord",
    "SearchFilters",
    "deduplicate",

    # --- LLM client ---
    "LLMClient",
    "extract_json",

    # --- Discovery functions ---
    "search_boards",            # Indeed, LinkedIn, ZipRecruiter, Glassdoor, Google
    "search_workday",           # 120+ Workday employer portals (direct JSON API)
    "search_smart",             # AI-powered extraction for any career site

    # --- Global reference data ---
    "INDEED_COUNTRY_CODES",     # dict[country_name -> indeed_code]  (45 countries)
    "GLOBAL_EMPLOYERS",         # dict of 120+ global Workday employers
    "REGION_COUNTRIES",         # dict[region -> list[country]]  (6 regions)
    "get_global_employers",     # filter GLOBAL_EMPLOYERS by region/industry/country

    # --- Config loaders ---
    "load_employers_yaml",      # load custom Workday employers from a YAML file
    "build_targets_from_yaml",  # build SmartExtract targets from sites.yaml
]
