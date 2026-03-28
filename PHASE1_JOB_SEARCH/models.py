"""
Shared data models for all Phase 1 discovery scrapers.

Public classes
--------------
JobRecord       — canonical job record returned by every scraper
UserPreferences — user fills this in at login; drives ALL search decisions
SearchFilters   — low-level technical params passed to each discovery function

Typical flow::

    prefs = UserPreferences(
        job_titles       = ["software engineer", "backend developer"],
        countries        = ["Germany", "Netherlands"],
        remote_ok        = True,
        experience_level = "senior",
        industries       = ["technology"],
    )

    # All three discovery functions accept params derived from preferences:
    jobs  = search_boards(**prefs.to_jobspy_kwargs())
    jobs += search_workday(queries=prefs.job_titles,
                           employers=prefs.get_workday_employers())
    jobs += search_smart(targets=prefs.get_site_targets(SITES_YAML))
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


# ===========================================================================
# Region → country mapping  (used by UserPreferences helpers)
# ===========================================================================

#: Maps broad region names to the country names used in INDEED_COUNTRY_CODES
#: and GLOBAL_EMPLOYERS.  Add new regions/countries here as needed.
REGION_COUNTRIES: dict[str, list[str]] = {
    "north_america": [
        "USA", "Canada", "Mexico",
    ],
    "europe": [
        "United Kingdom", "Germany", "France", "Netherlands", "Spain",
        "Italy", "Switzerland", "Sweden", "Poland", "Belgium", "Austria",
        "Ireland", "Denmark", "Norway", "Finland", "Portugal",
        "Czech Republic", "Romania", "Greece", "Hungary",
    ],
    "asia_pacific": [
        "India", "Australia", "Singapore", "Japan", "South Korea",
        "Hong Kong", "New Zealand", "Malaysia", "Philippines", "Taiwan",
        "Pakistan",
    ],
    "middle_east": [
        "UAE", "Saudi Arabia", "Qatar",
    ],
    "latin_america": [
        "Brazil", "Argentina", "Colombia", "Chile", "Mexico",
    ],
    "africa": [
        "South Africa", "Nigeria",
    ],
}

#: Default salary currency per country (used when the user doesn't specify one)
_COUNTRY_CURRENCY: dict[str, str] = {
    "USA":            "USD",
    "Canada":         "CAD",
    "Mexico":         "MXN",
    "United Kingdom": "GBP",
    "Germany":        "EUR",
    "France":         "EUR",
    "Netherlands":    "EUR",
    "Spain":          "EUR",
    "Italy":          "EUR",
    "Belgium":        "EUR",
    "Austria":        "EUR",
    "Ireland":        "EUR",
    "Portugal":       "EUR",
    "Finland":        "EUR",
    "Greece":         "EUR",
    "Switzerland":    "CHF",
    "Sweden":         "SEK",
    "Denmark":        "DKK",
    "Norway":         "NOK",
    "Poland":         "PLN",
    "Czech Republic": "CZK",
    "Romania":        "RON",
    "Hungary":        "HUF",
    "Australia":      "AUD",
    "New Zealand":    "NZD",
    "India":          "INR",
    "Singapore":      "SGD",
    "Japan":          "JPY",
    "South Korea":    "KRW",
    "Hong Kong":      "HKD",
    "Malaysia":       "MYR",
    "Philippines":    "PHP",
    "Taiwan":         "TWD",
    "Pakistan":       "PKR",
    "UAE":            "AED",
    "Saudi Arabia":   "SAR",
    "Qatar":          "QAR",
    "Brazil":         "BRL",
    "Argentina":      "ARS",
    "Colombia":       "COP",
    "Chile":          "CLP",
    "South Africa":   "ZAR",
    "Nigeria":        "NGN",
}


# ===========================================================================
# Indeed country codes  (country name → indeed regional code)
# ===========================================================================

INDEED_COUNTRY_CODES: dict[str, str] = {
    # North America
    "USA":              "usa",   "United States":  "usa",
    "Canada":           "canada","Mexico":         "mexico",
    # Europe
    "UK":               "uk",    "United Kingdom": "uk",
    "Germany":          "germany","France":         "france",
    "Netherlands":      "netherlands","Spain":      "spain",
    "Italy":            "italy", "Belgium":        "belgium",
    "Switzerland":      "switzerland","Austria":    "austria",
    "Poland":           "poland","Sweden":         "sweden",
    "Denmark":          "denmark","Norway":        "norway",
    "Finland":          "finland","Ireland":       "ireland",
    "Portugal":         "portugal","Czech Republic":"czechrepublic",
    "Romania":          "romania","Greece":        "greece",
    "Hungary":          "hungary",
    # Asia-Pacific
    "Australia":        "australia","New Zealand":  "newzealand",
    "India":            "india", "Singapore":      "singapore",
    "Japan":            "japan", "South Korea":    "southkorea",
    "Hong Kong":        "hongkong","Philippines":  "philippines",
    "Malaysia":         "malaysia","Taiwan":       "taiwan",
    "Pakistan":         "pakistan",
    # Middle East
    "UAE":              "uae",   "Saudi Arabia":   "saudiarabia",
    "Qatar":            "qatar",
    # Latin America
    "Brazil":           "brazil","Argentina":      "argentina",
    "Colombia":         "colombia","Chile":        "chile",
    # Africa
    "South Africa":     "southafrica","Nigeria":   "nigeria",
}


# ===========================================================================
# Country → job boards  (which boards are active per country)
# ===========================================================================

#: Maps country name → list of jobspy site names to search.
#: Boards not in this list for a country are simply skipped.
COUNTRY_BOARDS: dict[str, list[str]] = {
    "USA":             ["indeed", "linkedin", "glassdoor", "zip_recruiter"],
    "Canada":          ["indeed", "linkedin", "glassdoor"],
    "UK":              ["indeed", "linkedin", "glassdoor"],
    "United Kingdom":  ["indeed", "linkedin", "glassdoor"],
    "Ireland":         ["indeed", "linkedin"],
    "Germany":         ["indeed", "linkedin"],
    "France":          ["indeed", "linkedin"],
    "Netherlands":     ["indeed", "linkedin"],
    "Spain":           ["indeed", "linkedin"],
    "Italy":           ["indeed", "linkedin"],
    "Belgium":         ["indeed", "linkedin"],
    "Switzerland":     ["indeed", "linkedin"],
    "Austria":         ["indeed", "linkedin"],
    "Sweden":          ["indeed", "linkedin"],
    "Denmark":         ["indeed", "linkedin"],
    "Norway":          ["indeed", "linkedin"],
    "Finland":         ["indeed", "linkedin"],
    "Poland":          ["indeed", "linkedin"],
    "Czech Republic":  ["indeed", "linkedin"],
    "Portugal":        ["indeed", "linkedin"],
    "Romania":         ["indeed", "linkedin"],
    "Greece":          ["indeed", "linkedin"],
    "Hungary":         ["indeed", "linkedin"],
    "Australia":       ["indeed", "linkedin"],
    "New Zealand":     ["indeed", "linkedin"],
    "Singapore":       ["indeed", "linkedin"],
    "Japan":           ["indeed", "linkedin"],
    "South Korea":     ["indeed", "linkedin"],
    "India":           ["indeed", "linkedin", "naukri"],
    "Pakistan":        ["indeed", "linkedin"],
    "Malaysia":        ["indeed", "linkedin"],
    "Philippines":     ["indeed", "linkedin"],
    "UAE":             ["indeed", "linkedin", "bayt"],
    "Saudi Arabia":    ["bayt", "linkedin"],
    "Qatar":           ["bayt", "linkedin"],
    "Kuwait":          ["bayt", "linkedin"],
    "Bahrain":         ["bayt", "linkedin"],
    "Bangladesh":      ["bdjobs", "linkedin"],
    "Brazil":          ["indeed", "linkedin"],
    "Mexico":          ["indeed", "linkedin"],
    "Argentina":       ["indeed", "linkedin"],
    "Colombia":        ["indeed", "linkedin"],
    "Chile":           ["indeed", "linkedin"],
    "South Africa":    ["indeed", "linkedin"],
    "Nigeria":         ["indeed", "linkedin"],
    "_default":        ["indeed", "linkedin"],
}

#: Top cities per country used when user picks a country (not a specific city).
#: Glassdoor requires city-level strings; Indeed/LinkedIn handle country-level fine.
#: Keep to ≤10 per country — each city = one extra scrape_jobs call.
COUNTRY_TOP_CITIES: dict[str, list[str]] = {
    "USA": [
        "San Francisco", "New York", "Seattle", "Austin", "Boston",
        "Chicago", "Los Angeles", "Denver", "Atlanta", "Washington DC",
    ],
    "Canada": [
        "Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa",
    ],
    "UK": [
        "London", "Manchester", "Birmingham", "Edinburgh", "Bristol",
    ],
    "United Kingdom": [
        "London", "Manchester", "Birmingham", "Edinburgh", "Bristol",
    ],
    "Germany": [
        "Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne",
    ],
    "France": [
        "Paris", "Lyon", "Marseille", "Toulouse", "Bordeaux",
    ],
    "Netherlands": [
        "Amsterdam", "Rotterdam", "The Hague", "Eindhoven",
    ],
    "Spain": [
        "Madrid", "Barcelona", "Valencia",
    ],
    "Italy": [
        "Milan", "Rome", "Turin",
    ],
    "Switzerland": [
        "Zurich", "Geneva", "Basel",
    ],
    "Sweden": [
        "Stockholm", "Gothenburg", "Malmo",
    ],
    "Poland": [
        "Warsaw", "Krakow", "Wroclaw",
    ],
    "Portugal": [
        "Lisbon", "Porto",
    ],
    "Australia": [
        "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide",
    ],
    "New Zealand": [
        "Auckland", "Wellington",
    ],
    "India": [
        "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Pune",
        "Chennai", "Noida", "Gurgaon", "Kolkata", "Ahmedabad",
    ],
    "Singapore": ["Singapore"],
    "Japan": ["Tokyo", "Osaka"],
    "South Korea": ["Seoul", "Busan"],
    "UAE": ["Dubai", "Abu Dhabi", "Sharjah"],
    "Saudi Arabia": ["Riyadh", "Jeddah"],
    "Qatar": ["Doha"],
    "Kuwait": ["Kuwait City"],
    "Bahrain": ["Manama"],
    "Brazil": ["Sao Paulo", "Rio de Janeiro", "Belo Horizonte"],
    "Mexico": ["Mexico City", "Guadalajara", "Monterrey"],
    "Argentina": ["Buenos Aires"],
    "Colombia": ["Bogota", "Medellin"],
    "Chile": ["Santiago"],
    "South Africa": ["Johannesburg", "Cape Town"],
    "Nigeria": ["Lagos", "Abuja"],
}


def _countries_for_regions(regions: list[str]) -> list[str]:
    """Return a flat deduplicated list of countries for the given regions."""
    seen: set[str] = set()
    out:  list[str] = []
    for region in regions:
        for country in REGION_COUNTRIES.get(region, []):
            if country not in seen:
                seen.add(country)
                out.append(country)
    return out


def _detect_currency(countries: list[str]) -> str:
    """Return the most likely salary currency given a list of countries."""
    for c in countries:
        cur = _COUNTRY_CURRENCY.get(c)
        if cur:
            return cur
    return "USD"


# ===========================================================================
# JobRecord — canonical output of every scraper
# ===========================================================================

@dataclass
class JobRecord:
    """
    Canonical job record produced by every Phase 1 scraper.

    Design rules:
    - All fields have safe defaults so partial records are never None-unsafe.
    - `url` is the primary key — always the application/listing URL.
    - `source` identifies which scraper produced the record.
    - `site` is the human-readable board or company name.

    Global fields:
    - `country`          : country where the job is located ("Germany", "India", …).
    - `currency`         : salary currency code ("USD", "GBP", "EUR", "INR", …).
    - `job_type`         : "full_time" | "part_time" | "contract" | "internship" | "temporary".
    - `experience_level` : "entry" | "mid" | "senior" | "executive".
    """

    title:            str  = ""
    company:          str  = ""
    location:         str  = ""
    url:              str  = ""
    salary:           str  = ""
    description:      str  = ""
    remote:           bool = False
    date_posted:      str  = ""
    source:           str  = ""   # "jobspy" | "workday" | "smartextract"
    site:             str  = ""   # "indeed" | "linkedin" | "NVIDIA" | site name
    search_query:     str  = ""
    # --- global enrichment ---
    country:          str  = ""   # e.g. "Germany", "United Kingdom", "India"
    currency:         str  = ""   # e.g. "EUR", "GBP", "INR"
    job_type:         str  = ""   # full_time | part_time | contract | internship | temporary
    experience_level: str  = ""   # entry | mid | senior | executive
    discovered_at:    str  = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")
    )

    @property
    def is_valid(self) -> bool:
        """Minimum viable record: must have both a URL and a title."""
        return bool(self.url and self.title)

    def to_dict(self) -> dict[str, Any]:
        """Return a plain dict (safe for JSON, Excel, Pandas, etc.)."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "JobRecord":
        known = {f for f in cls.__dataclass_fields__}
        return cls(**{k: v for k, v in data.items() if k in known})


# ===========================================================================
# UserPreferences — user fills this in once at login
# ===========================================================================

@dataclass
class UserPreferences:
    """
    Everything the user tells us about what they want.

    This is the ONLY thing the user needs to configure.
    The system derives all technical search parameters automatically:
      - which Indeed country sites to query
      - which Workday employer portals to hit
      - which regional job boards to scrape
      - which salary currency to use

    Example — German senior engineer open to remote::

        prefs = UserPreferences(
            job_titles       = ["software engineer", "backend developer"],
            countries        = ["Germany", "Netherlands"],
            remote_ok        = True,
            experience_level = "senior",
            industries       = ["technology"],
            exclude_titles   = ["intern", "VP", "director"],
        )

    Example — entry-level finance analyst, anywhere in Europe::

        prefs = UserPreferences(
            job_titles       = ["financial analyst", "data analyst"],
            regions          = ["europe"],
            remote_ok        = False,
            experience_level = "entry",
            industries       = ["finance"],
        )

    Example — global remote only::

        prefs = UserPreferences(
            job_titles = ["ML engineer", "data scientist"],
            remote_ok  = True,   # no locations/countries → truly global remote
        )
    """

    # -----------------------------------------------------------------------
    # What you're looking for
    # -----------------------------------------------------------------------
    job_titles: list[str] = field(default_factory=list)
    # e.g. ["software engineer", "backend developer", "data engineer"]

    # -----------------------------------------------------------------------
    # Where you want to work
    # Set at least one of: locations / countries / regions.
    # If only remote_ok=True and nothing else → global remote search.
    # -----------------------------------------------------------------------
    locations: list[str] = field(default_factory=list)
    # Specific city strings, e.g. ["London, UK", "Berlin, Germany", "Remote"]

    countries: list[str] = field(default_factory=list)
    # Country names from INDEED_COUNTRY_CODES, e.g. ["Germany", "India"]

    regions: list[str] = field(default_factory=list)
    # Broad regions: "north_america" | "europe" | "asia_pacific" |
    #                "middle_east"   | "latin_america" | "africa"

    remote_ok: bool = True
    # Include remote/anywhere jobs?  Remote is always searched when True.

    # -----------------------------------------------------------------------
    # What kind of role
    # -----------------------------------------------------------------------
    job_types: list[str] = field(default_factory=list)
    # "full_time" | "part_time" | "contract" | "internship" | "temporary"

    experience_level: str = ""
    # "entry" | "mid" | "senior" | "executive"

    industries: list[str] = field(default_factory=list)
    # "technology" | "finance" | "healthcare" | "consulting" | "retail" |
    # "manufacturing" | "logistics" | "media" | "energy" | "education"

    # -----------------------------------------------------------------------
    # Filters
    # -----------------------------------------------------------------------
    exclude_titles: list[str] = field(default_factory=list)
    # Drop jobs whose title contains any of these (case-insensitive).
    # e.g. ["intern", "VP", "director", "clearance required"]

    hours_old: int = 72
    # Only fetch jobs posted within this many hours.

    results_per_site: int = 50
    # Max results per board per query-location pair.

    # -----------------------------------------------------------------------
    # Compensation
    # -----------------------------------------------------------------------
    salary_min: float | None = None
    salary_max: float | None = None   # accepted but not used in search (post-filter only)
    salary_currency: str = ""
    # If blank, auto-detected from the primary country in `countries`.

    # -----------------------------------------------------------------------
    # Derived helpers — call these when building search calls
    # -----------------------------------------------------------------------

    def effective_countries(self) -> list[str]:
        """
        Return the list of countries to search.

        Priority:
          1. Explicitly set `countries`
          2. Expanded from `regions`
          3. Empty list (caller falls back to default country_indeed="usa")
        """
        if self.countries:
            return list(self.countries)
        if self.regions:
            return _countries_for_regions(self.regions)
        return []

    def effective_locations(self) -> list[str]:
        """
        Build the location list to pass to job board searches.

        Always prepends "Remote" when remote_ok is True.
        """
        locs: list[str] = []
        if self.remote_ok:
            locs.append("Remote")
        locs.extend(l for l in self.locations if l.lower() != "remote")
        return locs or (["Remote"] if self.remote_ok else [])

    def effective_currency(self) -> str:
        """Return salary currency — explicit, auto-detected, or 'USD'."""
        if self.salary_currency:
            return self.salary_currency
        return _detect_currency(self.effective_countries())

    def to_jobspy_kwargs(self) -> dict:
        """
        Return kwargs ready to unpack into search_boards().

        Example::

            jobs = search_boards(**prefs.to_jobspy_kwargs())
        """
        countries = self.effective_countries()
        return {
            "queries":          self.job_titles,
            "locations":        self.effective_locations(),
            "results_per_site": self.results_per_site,
            "hours_old":        self.hours_old,
            # multi-country sweep when the user specified countries/regions
            "countries":        countries if countries else None,
        }

    def get_workday_employers(self) -> dict:
        """
        Return the subset of GLOBAL_EMPLOYERS that matches these preferences.

        Filters by region, industry, and country simultaneously.
        If none of those are set, returns ALL global employers.

        Example::

            employers = prefs.get_workday_employers()
            jobs = search_workday(queries=prefs.job_titles, employers=employers)
        """
        from .workday_discovery import get_global_employers
        return get_global_employers(
            regions    = self.regions    or None,
            industries = self.industries or None,
            countries  = self.effective_countries() or None,
        )

    def get_site_targets(
        self,
        sites_yaml_path: str | Path | None = None,
    ) -> list[dict]:
        """
        Return SmartExtract targets filtered to the user's regions.

        Loads config/sites.yaml (or the path you provide).  Sites tagged
        with matching regions are included; sites tagged "global" are
        always included.

        Region resolution priority:
          1. Explicit ``regions`` field (e.g. ["europe"])
          2. Inferred from ``countries`` (e.g. ["Germany"] → "europe")
          3. No filter — all sites included (global remote search)

        Example::

            from PHASE1_JOB_SEARCH import search_smart, LLMClient
            llm     = LLMClient.from_env()
            targets = prefs.get_site_targets()
            jobs    = search_smart(targets=targets, llm_client=llm)
        """
        from .smartextract_discovery import build_targets_from_yaml

        if sites_yaml_path is None:
            sites_yaml_path = Path(__file__).parent / "config" / "sites.yaml"

        # Determine which regions to show job boards for
        if self.regions:
            active_regions: set[str] | None = set(self.regions)
        elif self.countries:
            # Build a reverse map: country → region
            active_regions = set()
            country_to_region = {
                country: region
                for region, countries in REGION_COUNTRIES.items()
                for country in countries
            }
            for c in self.countries:
                r = country_to_region.get(c)
                if r:
                    active_regions.add(r)
            active_regions = active_regions or None   # empty set → no filter
        else:
            active_regions = None   # no geography specified → all sites

        locs = self.effective_locations()
        return build_targets_from_yaml(
            sites_yaml_path  = sites_yaml_path,
            queries          = self.job_titles,
            default_location = locs[0] if locs else "Remote",
            regions_filter   = active_regions,
        )

    def to_search_filters(self) -> "SearchFilters":
        """
        Convert to a SearchFilters object (low-level technical params).

        Most callers should use to_jobspy_kwargs(), get_workday_employers(),
        and get_site_targets() directly. Use this when you need the unified
        filter object for downstream pipeline stages.
        """
        return SearchFilters(
            queries            = self.job_titles,
            locations          = self.effective_locations(),
            countries          = self.effective_countries(),
            remote_only        = (
                self.remote_ok
                and not self.locations
                and not self.countries
                and not self.regions
            ),
            job_types          = self.job_types,
            experience_levels  = [self.experience_level] if self.experience_level else [],
            hours_old          = self.hours_old,
            results_per_site   = self.results_per_site,
            salary_min         = self.salary_min,
            salary_currency    = self.effective_currency(),
            title_exclude      = self.exclude_titles,
            employer_regions   = self.regions,
            employer_industries= self.industries,
        )


# ===========================================================================
# SearchFilters — low-level technical params (derived from UserPreferences)
# ===========================================================================

@dataclass
class SearchFilters:
    """
    Low-level search configuration passed directly to discovery functions.

    Normally you don't build this manually — call
    ``UserPreferences.to_search_filters()`` instead.  But you can construct
    it directly for fine-grained control.
    """

    queries:             list[str]    = field(default_factory=list)
    locations:           list[str]    = field(default_factory=list)
    countries:           list[str]    = field(default_factory=list)
    remote_only:         bool         = False
    job_types:           list[str]    = field(default_factory=list)
    experience_levels:   list[str]    = field(default_factory=list)
    hours_old:           int          = 72
    results_per_site:    int          = 50
    salary_min:          float | None = None
    salary_max:          float | None = None
    salary_currency:     str          = "USD"
    sites:               list[str]    = field(default_factory=list)
    title_exclude:       list[str]    = field(default_factory=list)
    employer_regions:    list[str]    = field(default_factory=list)
    employer_industries: list[str]    = field(default_factory=list)

    def to_jobspy_kwargs(self) -> dict:
        return {
            "queries":          self.queries,
            "locations":        ["Remote"] if self.remote_only else self.locations,
            "sites":            self.sites or None,
            "results_per_site": self.results_per_site,
            "hours_old":        self.hours_old,
            "countries":        self.countries or None,
        }

    # Words too generic to use as positive title filters on their own.
    _GENERIC_WORDS: frozenset = frozenset([
        "engineer", "developer", "scientist", "analyst", "researcher",
        "specialist", "manager", "lead", "senior", "junior", "associate",
        "principal", "staff", "architect", "consultant", "advisor",
        "intern", "contractor",
    ])

    def _title_include_keywords(self) -> list[str]:
        """
        Extract domain-specific keywords from self.queries.

        "AI engineer"              → ["ai engineer", "ai"]
        "machine learning engineer"→ ["machine learning engineer",
                                       "machine learning", "machine", "learning"]
        "LLM engineer"             → ["llm engineer", "llm"]
        """
        kws: set[str] = set()
        for q in self.queries:
            q_lo = q.lower()
            kws.add(q_lo)                          # full phrase always included
            words = q_lo.split()
            domain = [w for w in words if w not in self._GENERIC_WORDS]
            if domain:
                kws.add(" ".join(domain))          # multi-word domain phrase
                for w in domain:
                    if len(w) > 1:
                        kws.add(w)                 # individual domain word
        return list(kws)

    def passes_title(self, title: str) -> bool:
        """
        Two-stage title gate:
          1. Exclude  — reject if any exclude keyword appears in the title.
          2. Include  — if queries are set, require at least one domain keyword
                        to appear in the title (prevents off-topic results where
                        the search term only matched the job *description*).
        """
        tl = title.lower()

        # Stage 1: exclusion filter
        if self.title_exclude and any(kw.lower() in tl for kw in self.title_exclude):
            return False

        # Stage 2: positive include filter (only when queries are provided)
        if self.queries:
            include_kws = self._title_include_keywords()
            return any(kw in tl for kw in include_kws)

        return True


# ===========================================================================
# Utilities
# ===========================================================================

def deduplicate(records: list[JobRecord]) -> list[JobRecord]:
    """
    Remove duplicate records by URL, preserving first-seen order.

    Records with no URL are kept but only one per title+company pair.
    """
    seen_urls:   set[str]            = set()
    seen_no_url: set[tuple[str, str]] = set()
    out:         list[JobRecord]      = []

    for rec in records:
        if rec.url:
            if rec.url in seen_urls:
                continue
            seen_urls.add(rec.url)
        else:
            key = (rec.title.lower(), rec.company.lower())
            if key in seen_no_url:
                continue
            seen_no_url.add(key)
        out.append(rec)

    return out
