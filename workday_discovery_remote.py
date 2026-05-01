"""
Workday ATS direct-API job discovery.

Calls the undocumented Workday CXS JSON API on employer career portals.
No browser, no HTML scraping — pure HTTP POST to a predictable endpoint.

How it works:
    Every Workday-powered careers page exposes a POST endpoint at:
        {base_url}/wday/cxs/{tenant}/{site_id}/jobs
    We discovered this by inspecting network traffic on any Workday site.
    The response is clean JSON — total count, job postings list, pagination.

Public API:
    results = search(queries, employers)

Returns a list[JobRecord] — no database, no file I/O.
"""
from __future__ import annotations

import json
import logging
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from pathlib import Path
from typing import Callable
import re

from .models import JobRecord

log = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Max pages to fetch per employer per query (20 results/page = 500 max)
_MAX_PAGES       = 25
_PAGE_SIZE       = 20
_REQUEST_TIMEOUT = 20  # seconds


# ---------------------------------------------------------------------------
# Global Workday employer registry
#
# 120+ employers across North America, Europe, Asia-Pacific and Middle East.
# Verified site_ids come from ApplyPilot's confirmed employer registry.
# Estimated entries are marked with a comment and fail gracefully.
#
# Each entry carries:
#   name      – human-readable company name
#   base_url  – Workday subdomain (always *.myworkdayjobs.com)
#   tenant    – Workday tenant slug
#   site_id   – external-career-site path segment
#   region    – north_america | europe | asia_pacific | middle_east |
#               latin_america | africa
#   country   – ISO-style country name (matches UserPreferences.countries)
#   industry  – technology | finance | healthcare | consulting | retail |
#               manufacturing | logistics | media | energy | education | telecom
#
# Use get_global_employers() or UserPreferences.get_workday_employers() to
# filter this dict before passing to search().
# ---------------------------------------------------------------------------
GLOBAL_EMPLOYERS: dict[str, dict] = {

    # =======================================================================
    # NORTH AMERICA — CANADA  (verified site_ids from ApplyPilot registry)
    # =======================================================================

    # --- Canadian Banks & Financial ---
    "td": {
        "name":     "TD Bank",
        "base_url": "https://td.wd3.myworkdayjobs.com",
        "tenant":   "td",
        "site_id":  "TD_Bank_Careers",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "cibc": {
        "name":     "CIBC",
        "base_url": "https://cibc.wd3.myworkdayjobs.com",
        "tenant":   "cibc",
        "site_id":  "search",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "rbc": {
        "name":     "RBC",
        "base_url": "https://rbc.wd3.myworkdayjobs.com",
        "tenant":   "rbc",
        "site_id":  "RBCGLOBAL1",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "bmo": {
        "name":     "BMO Financial Group",
        "base_url": "https://bmo.wd3.myworkdayjobs.com",
        "tenant":   "bmo",
        "site_id":  "External",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "manulife": {
        "name":     "Manulife",
        "base_url": "https://manulife.wd3.myworkdayjobs.com",
        "tenant":   "manulife",
        "site_id":  "MFCJH_Jobs",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "sun_life": {
        "name":     "Sun Life Financial",
        "base_url": "https://sunlife.wd3.myworkdayjobs.com",
        "tenant":   "sunlife",
        "site_id":  "Experienced-Jobs",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "desjardins": {
        "name":     "Desjardins",
        "base_url": "https://desjardins.wd10.myworkdayjobs.com",
        "tenant":   "desjardins",
        "site_id":  "Desjardins",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "intact": {
        "name":     "Intact Financial",
        "base_url": "https://intactfc.wd3.myworkdayjobs.com",
        "tenant":   "intactfc",
        "site_id":  "intactfc",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "aviva_ca": {
        "name":     "Aviva Canada",
        "base_url": "https://aviva.wd1.myworkdayjobs.com",
        "tenant":   "aviva",
        "site_id":  "External",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "tmx": {
        "name":     "TMX Group",
        "base_url": "https://tmx.wd3.myworkdayjobs.com",
        "tenant":   "tmx",
        "site_id":  "TMX_Careers",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "brookfield": {
        "name":     "Brookfield Asset Management",
        "base_url": "https://brookfield.wd5.myworkdayjobs.com",
        "tenant":   "brookfield",
        "site_id":  "brookfield",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "fis": {
        "name":     "FIS Global",
        "base_url": "https://fis.wd5.myworkdayjobs.com",
        "tenant":   "fis",
        "site_id":  "SearchJobs",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "mastercard": {
        "name":     "Mastercard",
        "base_url": "https://mastercard.wd1.myworkdayjobs.com",
        "tenant":   "mastercard",
        "site_id":  "CorporateCareers",
        "region":   "north_america",
        "country":  "USA",
        "industry": "finance",
    },
    "paypal": {
        "name":     "PayPal",
        "base_url": "https://paypal.wd1.myworkdayjobs.com",
        "tenant":   "paypal",
        "site_id":  "jobs",
        "region":   "north_america",
        "country":  "USA",
        "industry": "finance",
    },

    # --- Canadian Pension Funds ---
    "cppib": {
        "name":     "CPP Investments",
        "base_url": "https://cppib.wd10.myworkdayjobs.com",
        "tenant":   "cppib",
        "site_id":  "cppinvestments",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "omers": {
        "name":     "OMERS",
        "base_url": "https://omers.wd3.myworkdayjobs.com",
        "tenant":   "omers",
        "site_id":  "OMERS_External",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "otpp": {
        "name":     "Ontario Teachers' Pension Plan",
        "base_url": "https://otppb.wd3.myworkdayjobs.com",
        "tenant":   "otppb",
        "site_id":  "OntarioTeachers_Careers",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "psp": {
        "name":     "PSP Investments",
        "base_url": "https://investpsp.wd3.myworkdayjobs.com",
        "tenant":   "investpsp",
        "site_id":  "psp_careers",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "cdpq": {
        "name":     "CDPQ",
        "base_url": "https://cdpq.wd10.myworkdayjobs.com",
        "tenant":   "cdpq",
        "site_id":  "CDPQ",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "hoopp": {
        "name":     "HOOPP",
        "base_url": "https://hoopp.wd10.myworkdayjobs.com",
        "tenant":   "hoopp",
        "site_id":  "HOOPP",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },
    "aimco": {
        "name":     "AIMCo",
        "base_url": "https://aimco.wd10.myworkdayjobs.com",
        "tenant":   "aimco",
        "site_id":  "AIMCoCareers",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "finance",
    },

    # --- North America Technology (global companies, verified) ---
    "nvidia": {
        "name":     "NVIDIA",
        "base_url": "https://nvidia.wd5.myworkdayjobs.com",
        "tenant":   "nvidia",
        "site_id":  "NVIDIAExternalCareerSite",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },
    "salesforce": {
        "name":     "Salesforce",
        "base_url": "https://salesforce.wd12.myworkdayjobs.com",
        "tenant":   "salesforce",
        "site_id":  "External_Career_Site",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },
    "workday": {
        "name":     "Workday",
        "base_url": "https://workday.wd5.myworkdayjobs.com",
        "tenant":   "workday",
        "site_id":  "Workday",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },
    "adobe": {
        "name":     "Adobe",
        "base_url": "https://adobe.wd5.myworkdayjobs.com",
        "tenant":   "adobe",
        "site_id":  "external_experienced",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },
    # ServiceNow — removed: 422 Unprocessable Entity (site_id unverified)
    # Netflix — removed: returns empty body (Workday session auth required)
    # "netflix": { ... }  Requires browser cookie session, not patchable via API.
    "cisco": {
        "name":     "Cisco",
        "base_url": "https://cisco.wd5.myworkdayjobs.com",
        "tenant":   "cisco",
        "site_id":  "Cisco_Careers",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },
    "intel": {
        "name":     "Intel",
        "base_url": "https://intel.wd1.myworkdayjobs.com",
        "tenant":   "intel",
        "site_id":  "External",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },
    # Uber — removed: uses Greenhouse ATS, not Workday.
    "motorola": {
        "name":     "Motorola Solutions",
        "base_url": "https://motorolasolutions.wd5.myworkdayjobs.com",
        "tenant":   "motorolasolutions",
        "site_id":  "Careers",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },
    "thomson_reuters": {
        "name":     "Thomson Reuters",
        "base_url": "https://thomsonreuters.wd5.myworkdayjobs.com",
        "tenant":   "thomsonreuters",
        "site_id":  "External_Career_Site",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "technology",
    },
    "moderna": {
        "name":     "Moderna",
        "base_url": "https://modernatx.wd1.myworkdayjobs.com",
        "tenant":   "modernatx",
        "site_id":  "M_tx",
        "region":   "north_america",
        "country":  "USA",
        "industry": "healthcare",
    },
    # DocuSign — removed: 422 Unprocessable Entity (may have migrated off Workday).
    "blackberry": {
        "name":     "BlackBerry",
        "base_url": "https://bb.wd3.myworkdayjobs.com",
        "tenant":   "bb",
        "site_id":  "BlackBerry",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "technology",
    },
    "ciena": {
        "name":     "Ciena",
        "base_url": "https://ciena.wd5.myworkdayjobs.com",
        "tenant":   "ciena",
        "site_id":  "Careers",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "technology",
    },
    # Okta — removed: 422 Unprocessable Entity (site_id unverified).
    # Palantir — removed: uses own ATS (Lever), not Workday.
    "crowdstrike": {
        "name":     "CrowdStrike",
        "base_url": "https://crowdstrike.wd5.myworkdayjobs.com",
        "tenant":   "crowdstrike",
        "site_id":  "crowdstrikecareers",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },
    "hp": {
        "name":     "HP",
        "base_url": "https://hp.wd5.myworkdayjobs.com",
        "tenant":   "hp",
        "site_id":  "ExternalCareerSite",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },

    # --- North America Defense & Aerospace ---
    "northrop_grumman": {
        "name":     "Northrop Grumman",
        "base_url": "https://ngc.wd1.myworkdayjobs.com",
        "tenant":   "ngc",
        "site_id":  "Northrop_Grumman_External_Site",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },
    "rtx": {
        "name":     "RTX (Raytheon Technologies)",
        "base_url": "https://globalhr.wd5.myworkdayjobs.com",
        "tenant":   "globalhr",
        "site_id":  "REC_RTX_Ext_Gateway",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },

    # --- North America Consulting ---
    "accenture": {
        "name":     "Accenture",
        "base_url": "https://accenture.wd103.myworkdayjobs.com",
        "tenant":   "accenture",
        "site_id":  "AccentureCareers",
        "region":   "north_america",
        "country":  "USA",
        "industry": "consulting",
    },
    "kyndryl": {
        "name":     "Kyndryl",
        "base_url": "https://kyndryl.wd5.myworkdayjobs.com",
        "tenant":   "kyndryl",
        "site_id":  "KyndrylProfessionalCareers",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },
    "pwc": {
        "name":     "PwC",
        "base_url": "https://pwc.wd3.myworkdayjobs.com",
        "tenant":   "pwc",
        "site_id":  "Global_Experienced_Careers",
        "region":   "north_america",
        "country":  "USA",
        "industry": "consulting",
    },
    # Deloitte — removed: persistent 422 (requires Workday browser session/CSRF token)
    "bdo": {
        "name":     "BDO",
        "base_url": "https://bdo.wd3.myworkdayjobs.com",
        "tenant":   "bdo",
        "site_id":  "BDO",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "consulting",
    },

    # --- North America Finance & Banking ---
    "morgan_stanley": {
        "name":     "Morgan Stanley",
        "base_url": "https://ms.wd5.myworkdayjobs.com",
        "tenant":   "ms",
        "site_id":  "External",
        "region":   "north_america",
        "country":  "USA",
        "industry": "finance",
    },
    "capital_one": {
        "name":     "Capital One",
        "base_url": "https://capitalone.wd12.myworkdayjobs.com",
        "tenant":   "capitalone",
        "site_id":  "Capital_One",
        "region":   "north_america",
        "country":  "USA",
        "industry": "finance",
    },
    "capital_group": {
        "name":     "Capital Group",
        "base_url": "https://capgroup.wd1.myworkdayjobs.com",
        "tenant":   "capgroup",
        "site_id":  "capitalgroupcareers",
        "region":   "north_america",
        "country":  "USA",
        "industry": "finance",
    },
    "santander_us": {
        "name":     "Santander",
        "base_url": "https://santander.wd3.myworkdayjobs.com",
        "tenant":   "santander",
        "site_id":  "SantanderCareers",
        "region":   "north_america",
        "country":  "USA",
        "industry": "finance",
    },

    # --- North America Technology (additional) ---
    "comcast": {
        "name":     "Comcast",
        "base_url": "https://comcast.wd5.myworkdayjobs.com",
        "tenant":   "comcast",
        "site_id":  "Comcast_Careers",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },
    "johnson_controls": {
        "name":     "Johnson Controls",
        "base_url": "https://jci.wd5.myworkdayjobs.com",
        "tenant":   "jci",
        "site_id":  "JCI",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },
    "argonne": {
        "name":     "Argonne National Laboratory",
        "base_url": "https://argonne.wd1.myworkdayjobs.com",
        "tenant":   "argonne",
        "site_id":  "Argonne_Careers",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },
    "mars": {
        "name":     "Mars",
        "base_url": "https://mars.wd3.myworkdayjobs.com",
        "tenant":   "mars",
        "site_id":  "External",
        "region":   "north_america",
        "country":  "USA",
        "industry": "retail",
    },
    "tempus": {
        "name":     "Tempus AI",
        "base_url": "https://tempus.wd5.myworkdayjobs.com",
        "tenant":   "tempus",
        "site_id":  "Tempus_Careers",
        "region":   "north_america",
        "country":  "USA",
        "industry": "healthcare",
    },

    # --- North America Healthcare ---
    "humana": {
        "name":     "Humana",
        "base_url": "https://humana.wd5.myworkdayjobs.com",
        "tenant":   "humana",
        "site_id":  "Humana_External_Career_Site",
        "region":   "north_america",
        "country":  "USA",
        "industry": "healthcare",
    },
    "cigna": {
        "name":     "Cigna",
        "base_url": "https://cigna.wd5.myworkdayjobs.com",
        "tenant":   "cigna",
        "site_id":  "CignaCareers",
        "region":   "north_america",
        "country":  "USA",
        "industry": "healthcare",
    },

    "pfizer": {
        "name":     "Pfizer",
        "base_url": "https://pfizer.wd1.myworkdayjobs.com",
        "tenant":   "pfizer",
        "site_id":  "PfizerCareers",
        "region":   "north_america",
        "country":  "USA",
        "industry": "healthcare",
    },

    # --- North America Telecom ---
    "telus": {
        "name":     "TELUS International",
        "base_url": "https://telusinternational.wd3.myworkdayjobs.com",
        "tenant":   "telusinternational",
        "site_id":  "External",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "telecom",
    },
    "telus_health": {
        "name":     "TELUS Health",
        "base_url": "https://lifeworks.wd3.myworkdayjobs.com",
        "tenant":   "lifeworks",
        "site_id":  "External",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "healthcare",
    },

    # --- North America Defense & Aerospace ---
    "boeing_eng": {
        "name":     "Boeing (Engineering)",
        "base_url": "https://boeing.wd1.myworkdayjobs.com",
        "tenant":   "boeing",
        "site_id":  "ENG",
        "region":   "north_america",
        "country":  "USA",
        "industry": "manufacturing",
    },
    "boeing_mfg": {
        "name":     "Boeing (Manufacturing)",
        "base_url": "https://boeing.wd1.myworkdayjobs.com",
        "tenant":   "boeing",
        "site_id":  "MFG",
        "region":   "north_america",
        "country":  "USA",
        "industry": "manufacturing",
    },

    # --- North America Semiconductors ---
    "qualcomm": {
        "name":     "Qualcomm",
        "base_url": "https://qualcomm.wd12.myworkdayjobs.com",
        "tenant":   "qualcomm",
        "site_id":  "External",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },

    # --- North America Cloud / SaaS ---

    # --- North America Finance (USA Banks) ---
    "travelers": {
        "name":     "Travelers Insurance",
        "base_url": "https://travelers.wd5.myworkdayjobs.com",
        "tenant":   "travelers",
        "site_id":  "External",
        "region":   "north_america",
        "country":  "USA",
        "industry": "finance",
    },

    # --- North America Manufacturing & Energy ---
    # Honeywell — removed: persistent 422 across all site_id variants (browser session required)
    # General Electric — removed: persistent 422, GE split (Aerospace/Vernova/Healthcare) all 422
    "applied_materials": {
        "name":     "Applied Materials",
        "base_url": "https://amat.wd1.myworkdayjobs.com",
        "tenant":   "amat",
        "site_id":  "External",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },
    "enbridge": {
        "name":     "Enbridge",
        "base_url": "https://enbridge.wd3.myworkdayjobs.com",
        "tenant":   "enbridge",
        "site_id":  "enbridge_careers",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "energy",
    },
    "magna": {
        "name":     "Magna International",
        "base_url": "https://magna.wd3.myworkdayjobs.com",
        "tenant":   "magna",
        "site_id":  "Magna",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "manufacturing",
    },
    "cae": {
        "name":     "CAE",
        "base_url": "https://cae.wd3.myworkdayjobs.com",
        "tenant":   "cae",
        "site_id":  "career",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "manufacturing",
    },
    "canadian_solar": {
        "name":     "Canadian Solar",
        "base_url": "https://canadiansolar.wd5.myworkdayjobs.com",
        "tenant":   "canadiansolar",
        "site_id":  "CanadianSolar",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "energy",
    },

    # --- North America Retail & Logistics ---
    "target": {
        "name":     "Target",
        "base_url": "https://target.wd5.myworkdayjobs.com",
        "tenant":   "target",
        "site_id":  "TargetCareers",
        "region":   "north_america",
        "country":  "USA",
        "industry": "retail",
    },
    "canadian_tire": {
        "name":     "Canadian Tire",
        "base_url": "https://canadiantirecorporation.wd3.myworkdayjobs.com",
        "tenant":   "canadiantirecorporation",
        "site_id":  "Enterprise_External_Careers_Site",
        "region":   "north_america",
        "country":  "Canada",
        "industry": "retail",
    },
    # UPS — removed: persistent 422 across wd1/wd3/wd5 variants
    # FedEx — removed: wd1 returns 404, wd5 returns 422
    "illinois_tool": {
        "name":     "Illinois Tool Works",
        "base_url": "https://itw.wd5.myworkdayjobs.com",
        "tenant":   "itw",
        "site_id":  "External",
        "region":   "north_america",
        "country":  "USA",
        "industry": "manufacturing",
    },
    "leidos": {
        "name":     "Leidos",
        "base_url": "https://leidos.wd5.myworkdayjobs.com",
        "tenant":   "leidos",
        "site_id":  "External",
        "region":   "north_america",
        "country":  "USA",
        "industry": "technology",
    },

    # =======================================================================
    # EUROPE  (mix of verified and best-estimate site_ids)
    # =======================================================================

    # --- Europe Technology ---

    # --- Europe Finance ---

    # --- Europe Healthcare & Pharma ---

    # --- Europe Manufacturing ---

    # --- Europe Consulting ---

    # --- Europe Retail & Consumer ---

    # --- Europe UK Finance ---
    "lseg": {
        "name":     "LSEG (London Stock Exchange Group)",
        "base_url": "https://lseg.wd3.myworkdayjobs.com",
        "tenant":   "lseg",
        "site_id":  "Careers",
        "region":   "europe",
        "country":  "United Kingdom",
        "industry": "finance",
    },
    "lbg": {
        "name":     "Lloyds Banking Group",
        "base_url": "https://lbg.wd3.myworkdayjobs.com",
        "tenant":   "lbg",
        "site_id":  "lbg_Careers",
        "region":   "europe",
        "country":  "United Kingdom",
        "industry": "finance",
    },

    # --- Europe UK Healthcare ---
    "smith_nephew": {
        "name":     "Smith+Nephew",
        "base_url": "https://smithnephew.wd5.myworkdayjobs.com",
        "tenant":   "smithnephew",
        "site_id":  "External",
        "region":   "europe",
        "country":  "United Kingdom",
        "industry": "healthcare",
    },

    # --- Europe UK Aerospace & Defense ---

    # --- Europe UK Telecom & Banking ---
    "lloyds_london": {
        "name":     "Lloyd's of London",
        "base_url": "https://lloyds.wd3.myworkdayjobs.com",
        "tenant":   "lloyds",
        "site_id":  "Lloyds-of-London",
        "region":   "europe",
        "country":  "United Kingdom",
        "industry": "finance",
    },

    # =======================================================================
    # ASIA-PACIFIC
    # =======================================================================

    # --- APAC Technology ---

    # --- APAC Finance ---

    # --- APAC Finance (Australia) ---
    "commbank": {
        "name":     "Commonwealth Bank of Australia",
        "base_url": "https://cba.wd3.myworkdayjobs.com",
        "tenant":   "cba",
        "site_id":  "CommBank_Careers",
        "region":   "asia_pacific",
        "country":  "Australia",
        "industry": "finance",
    },
    "westpac_nz": {
        "name":     "Westpac New Zealand",
        "base_url": "https://westpacnz.wd105.myworkdayjobs.com",
        "tenant":   "westpacnz",
        "site_id":  "Westpac_Careers",
        "region":   "asia_pacific",
        "country":  "New Zealand",
        "industry": "finance",
    },

    # --- APAC Korea / Japan / HK ---
    "samsung": {
        "name":     "Samsung Electronics",
        "base_url": "https://sec.wd3.myworkdayjobs.com",
        "tenant":   "sec",
        "site_id":  "Samsung_Careers",
        "region":   "asia_pacific",
        "country":  "South Korea",
        "industry": "technology",
    },
    "aia": {
        "name":     "AIA Group",
        "base_url": "https://aia.wd3.myworkdayjobs.com",
        "tenant":   "aia",
        "site_id":  "External",
        "region":   "asia_pacific",
        "country":  "Hong Kong",
        "industry": "finance",
    },
    "mufg": {
        "name":     "MUFG (Mitsubishi UFJ)",
        "base_url": "https://mufgub.wd3.myworkdayjobs.com",
        "tenant":   "mufgub",
        "site_id":  "MUFG-Careers",
        "region":   "asia_pacific",
        "country":  "Japan",
        "industry": "finance",
    },
    "rakuten_viki": {
        "name":     "Rakuten Viki",
        "base_url": "https://rakuten.wd1.myworkdayjobs.com",
        "tenant":   "rakuten",
        "site_id":  "RakutenVikiSingapore",
        "region":   "asia_pacific",
        "country":  "Singapore",
        "industry": "technology",
    },
    "tencent": {
        "name":     "Tencent",
        "base_url": "https://tencent.wd1.myworkdayjobs.com",
        "tenant":   "tencent",
        "site_id":  "Tencent_Careers",
        "region":   "asia_pacific",
        "country":  "China",
        "industry": "technology",
    },

    # =======================================================================
    # MIDDLE EAST
    # =======================================================================

}


# ---------------------------------------------------------------------------
# Global employer filter helper
# ---------------------------------------------------------------------------

def get_global_employers(
    regions:    list[str] | None = None,
    industries: list[str] | None = None,
    countries:  list[str] | None = None,
) -> dict[str, dict]:
    """
    Return a filtered subset of GLOBAL_EMPLOYERS.

    All three filters are applied together (AND logic). Omitting a filter
    means "no restriction on that dimension".

    
    Args:
        regions:    Subset of: "north_america", "europe", "asia_pacific",
                    "middle_east". E.g. ["europe", "asia_pacific"].
        industries: Subset of: "technology", "finance", "healthcare",
                    "consulting", "retail", "manufacturing", "logistics",
                    "media", "energy", "education".
        countries:  Country name strings exactly as stored in GLOBAL_EMPLOYERS,
                    e.g. ["Germany", "India", "Singapore"].

    Returns:
        Dict in the same format as GLOBAL_EMPLOYERS, ready to pass directly
        to search_workday() as the `employers` argument.

    Example::

        from PHASE1_JOB_SEARCH import search_workday, get_global_employers

        eu_tech = get_global_employers(regions=["europe"], industries=["technology"])
        jobs    = search_workday(queries=["backend engineer"], employers=eu_tech)
    """
    out: dict[str, dict] = {}
    for key, emp in GLOBAL_EMPLOYERS.items():
        if regions    and emp.get("region",   "") not in regions:
            continue
        if industries and emp.get("industry", "") not in industries:
            continue
        if countries  and emp.get("country",  "") not in countries:
            continue
        out[key] = emp
    return out


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def search(
    queries: list[str],
    employers: dict[str, dict],
    location_filter: Callable[[str], bool] | None = None,
    workers: int = 1,
    request_timeout: int = _REQUEST_TIMEOUT,
    proxy: str | None = None,
    fetch_details: bool = False,
    max_jobs_per_employer: int = 0,
) -> list[JobRecord]:
    """
    Search Workday employer portals and return a list of JobRecord objects.

    Args:
        queries:              Search terms to run against every employer.
        employers:            Dict of employer configs keyed by a short slug.
                              Each value must have: name, base_url, tenant, site_id.
                              Use load_employers_yaml() to load from a YAML file.
        location_filter:      Optional callable(location_str) -> bool.
                              Remote jobs always pass. Non-remote jobs are tested.
        workers:              Number of parallel threads for employer scraping.
                              Default 1 (sequential). Set higher for large employer lists.
        request_timeout:      HTTP timeout in seconds per API call.
        proxy:                Optional proxy string "host:port" or "host:port:user:pass".
        fetch_details:        If True, fetch each job's detail page for description + URL.
                              Disabled by default — avoids N×HTTP calls that can stall.
        max_jobs_per_employer: Cap results per employer per query (0 = no cap).
                              Useful for fast test runs.

    Returns:
        List of JobRecord. Deduplication by URL is performed before returning.

    Employer config shape:
        {
            "nvidia": {
                "name":     "NVIDIA",
                "base_url": "https://nvidia.wd5.myworkdayjobs.com",
                "tenant":   "nvidia",
                "site_id":  "NVIDIAExternalCareerSite",
            }
        }
    """
    if not employers:
        log.warning("workday: no employers configured, returning empty")
        return []

    opener = _build_opener(proxy)

    log.info(
        "workday: starting search | queries=%d employers=%d workers=%d fetch_details=%s",
        len(queries), len(employers), workers, fetch_details,
    )

    all_records: list[JobRecord] = []
    seen_urls:   set[str]        = set()

    for q_idx, query in enumerate(queries, 1):
        log.info("workday: query [%d/%d] %r", q_idx, len(queries), query)

        batch = _scrape_all_employers(
            query                = query,
            employers            = employers,
            location_filter      = location_filter,
            workers              = workers,
            timeout              = request_timeout,
            opener               = opener,
            fetch_details        = fetch_details,
            max_jobs_per_employer = max_jobs_per_employer,
        )

        for rec in batch:
            if rec.url and rec.url not in seen_urls:
                seen_urls.add(rec.url)
                all_records.append(rec)

        log.info(
            "workday: query [%d/%d] done | batch=%d running_total=%d",
            q_idx, len(queries), len(batch), len(all_records),
        )

    log.info("workday: finished | total_records=%d", len(all_records))
    return all_records


# ---------------------------------------------------------------------------
# Employer loader utility
# ---------------------------------------------------------------------------

def load_employers_yaml(path: str | Path) -> dict[str, dict]:
    """
    Load an employer registry from a YAML file.

    Expected format:
        employers:
          nvidia:
            name: NVIDIA
            base_url: https://nvidia.wd5.myworkdayjobs.com
            tenant: nvidia
            site_id: NVIDIAExternalCareerSite
    """
    try:
        import yaml
    except ImportError:
        raise ImportError("Install PyYAML: pip install pyyaml")

    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Employers YAML not found: {p}")

    data = yaml.safe_load(p.read_text(encoding="utf-8"))
    employers = data.get("employers", {})
    log.info("workday: loaded %d employers from %s", len(employers), p)
    return employers


# ---------------------------------------------------------------------------
# Internal: scrape all employers for one query
# ---------------------------------------------------------------------------

def _scrape_all_employers(
    query: str,
    employers: dict[str, dict],
    location_filter: Callable[[str], bool] | None,
    workers: int,
    timeout: int,
    opener,
    fetch_details: bool = False,
    max_jobs_per_employer: int = 0,
) -> list[JobRecord]:
    """Run one query against all employers, optionally in parallel."""
    keys = list(employers.keys())
    results: list[JobRecord] = []

    def _process(key: str) -> list[JobRecord]:
        emp = employers[key]
        try:
            return _scrape_one_employer(
                key, emp, query, location_filter, timeout, opener,
                fetch_details=fetch_details,
                max_jobs_per_employer=max_jobs_per_employer,
            )
        except Exception as exc:
            log.error(
                "workday: employer=%r query=%r error: %s",
                emp.get("name", key), query, exc,
            )
            return []

    if workers > 1 and len(keys) > 1:
        with ThreadPoolExecutor(max_workers=min(workers, len(keys))) as pool:
            futures = {pool.submit(_process, k): k for k in keys}
            for future in as_completed(futures):
                results.extend(future.result())
    else:
        for key in keys:
            results.extend(_process(key))

    return results


def _scrape_one_employer(
    key: str,
    emp: dict,
    query: str,
    location_filter: Callable[[str], bool] | None,
    timeout: int,
    opener,
    fetch_details: bool = False,
    max_jobs_per_employer: int = 0,
) -> list[JobRecord]:
    """
    Paginate through all results for one employer + query.

    Steps:
        1. POST to search endpoint to get total count and first page.
        2. Continue paginating until we have all results or hit _MAX_PAGES.
        3. Optionally fetch full detail (description + apply URL) for each posting.
           When fetch_details=False (default), build JobRecord directly from search
           data using a constructed URL — avoids N×HTTP calls that can stall.
        4. Apply location filter and max_jobs_per_employer cap.
        5. Return JobRecord list.
    """
    emp_name = emp.get("name", key)
    postings: list[dict] = []
    offset = 0
    total  = None

    while True:
        try:
            data = _api_search(emp, query, limit=_PAGE_SIZE, offset=offset, timeout=timeout, opener=opener)
        except Exception as exc:
            log.error("workday: %s search failed at offset=%d: %s", emp_name, offset, exc)
            break

        if total is None:
            total = data.get("total", 0)
            if total == 0:
                break
            log.debug("workday: %s | query=%r | total=%d", emp_name, query, total)

        page = data.get("jobPostings", [])
        if not page:
            break

        for posting in page:
            loc = posting.get("locationsText", "")
            if location_filter and not _passes_location(loc, location_filter):
                continue
            postings.append({
                "title":         posting.get("title", ""),
                "location":      loc,
                "posted":        posting.get("postedOn", ""),
                "external_path": posting.get("externalPath", ""),
            })
            # Stop paginating early if we've already hit the cap
            if max_jobs_per_employer and len(postings) >= max_jobs_per_employer:
                break

        offset += _PAGE_SIZE
        page_num = offset // _PAGE_SIZE
        if offset >= total or page_num >= _MAX_PAGES:
            break
        if max_jobs_per_employer and len(postings) >= max_jobs_per_employer:
            break

    if not postings:
        return []

    # Apply cap after collecting
    if max_jobs_per_employer and len(postings) > max_jobs_per_employer:
        postings = postings[:max_jobs_per_employer]

    log.debug("workday: %s | query=%r | %d postings after filter", emp_name, query, len(postings))

    records: list[JobRecord] = []

    if fetch_details:
        # Fetch full detail page for description + canonical URL (slow but rich)
        for posting in postings:
            rec = _fetch_detail_record(emp, posting, query, timeout, opener)
            if rec:
                records.append(rec)
    else:
        # Fast path: build JobRecord directly from search-listing data.
        # URL is constructed from base_url + site_id + externalPath — same
        # pattern the detail page would give us, no extra HTTP call needed.
        base_url = emp.get("base_url", "")
        site_id  = emp.get("site_id", "")
        for posting in postings:
            ext_path = posting.get("external_path", "")
            url = f"{base_url}/{site_id}{ext_path}" if ext_path else ""
            if not url:
                continue
            records.append(JobRecord(
                title        = posting.get("title", ""),
                company      = emp_name,
                location     = posting.get("location", ""),
                url          = url,
                salary       = "",
                description  = "",
                remote       = "remote" in posting.get("location", "").lower(),
                date_posted  = posting.get("posted", ""),
                source       = "workday",
                site         = emp_name,
                search_query = query,
            ))

    return records


def _fetch_detail_record(
    emp: dict,
    posting: dict,
    query: str,
    timeout: int,
    opener,
) -> JobRecord | None:
    """Fetch full job detail and return a JobRecord."""
    ext_path  = posting.get("external_path", "")
    emp_name  = emp.get("name", "")
    site_id   = emp.get("site_id", "")
    base_url  = emp.get("base_url", "")

    # Construct fallback URL before fetching detail
    fallback_url = f"{base_url}/{site_id}{ext_path}" if ext_path else ""

    description = ""
    apply_url   = fallback_url
    location    = posting.get("location", "")

    if ext_path:
        try:
            detail   = _api_detail(emp, ext_path, timeout, opener)
            info     = detail.get("jobPostingInfo", {})
            raw_html = info.get("jobDescription", "")
            description = strip_html(raw_html)
            apply_url   = info.get("externalUrl") or fallback_url
        except Exception as exc:
            log.debug("workday: %s detail fetch failed for %s: %s", emp_name, ext_path, exc)

    if not apply_url:
        return None

    return JobRecord(
        title        = posting.get("title", ""),
        company      = emp_name,
        location     = location,
        url          = apply_url,
        salary       = "",
        description  = description,
        remote       = "remote" in location.lower(),
        date_posted  = posting.get("posted", ""),
        source       = "workday",
        site         = emp_name,
        search_query = query,
    )


# ---------------------------------------------------------------------------
# Internal: HTTP helpers
# ---------------------------------------------------------------------------

def _api_search(
    emp: dict,
    search_text: str,
    limit: int,
    offset: int,
    timeout: int,
    opener,
) -> dict:
    """POST to the Workday CXS search endpoint. Returns raw JSON dict."""
    url = (
        f"{emp['base_url']}/wday/cxs"
        f"/{emp['tenant']}/{emp['site_id']}/jobs"
    )
    payload = json.dumps({
        "appliedFacets": {},
        "limit":         limit,
        "offset":        offset,
        "searchText":    search_text,
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept",       "application/json")
    req.add_header("User-Agent",   USER_AGENT)

    with opener.open(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def _api_detail(emp: dict, external_path: str, timeout: int, opener) -> dict:
    """GET the Workday CXS detail endpoint for one job. Returns raw JSON dict."""
    url = f"{emp['base_url']}/wday/cxs/{emp['tenant']}/{emp['site_id']}{external_path}"

    req = urllib.request.Request(url)
    req.add_header("Accept",     "application/json")
    req.add_header("User-Agent", USER_AGENT)

    with opener.open(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def _build_opener(proxy: str | None):
    """Build a urllib opener, optionally with proxy support."""
    if not proxy:
        return urllib.request.build_opener()

    parts = proxy.split(":")
    if len(parts) == 4:
        host, port, user, passwd = parts
        proxy_url = f"http://{user}:{passwd}@{host}:{port}"
    elif len(parts) == 2:
        proxy_url = f"http://{parts[0]}:{parts[1]}"
    else:
        log.warning("workday: unrecognised proxy format %r, ignoring", proxy)
        return urllib.request.build_opener()

    handler = urllib.request.ProxyHandler({"http": proxy_url, "https": proxy_url})
    log.info("workday: proxy configured (%s:%s)", parts[0], parts[1])
    return urllib.request.build_opener(handler)


# ---------------------------------------------------------------------------
# Internal: location filter
# ---------------------------------------------------------------------------

_REMOTE_KEYWORDS = ("remote", "anywhere", "work from home", "wfh", "distributed")


def _passes_location(location: str, fn: Callable[[str], bool]) -> bool:
    """Remote locations always pass. Non-remote are tested with fn."""
    loc = location.lower()
    if any(k in loc for k in _REMOTE_KEYWORDS):
        return True
    return fn(location)


# ---------------------------------------------------------------------------
# Internal: HTML stripping (no external dependency)
# ---------------------------------------------------------------------------

class _HTMLStripper(HTMLParser):
    """Minimal HTML-to-text converter using only stdlib."""

    _BLOCK_TAGS  = frozenset({"p", "div", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "br"})
    _SKIP_TAGS   = frozenset({"script", "style"})

    def __init__(self):
        super().__init__()
        self._parts: list[str] = []
        self._skip = False

    def handle_starttag(self, tag, attrs):
        if tag in self._SKIP_TAGS:
            self._skip = True
        elif tag in self._BLOCK_TAGS:
            self._parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self._SKIP_TAGS:
            self._skip = False
        elif tag in self._BLOCK_TAGS:
            self._parts.append("\n")

    def handle_data(self, data):
        if not self._skip:
            self._parts.append(data)

    def get_text(self) -> str:
        text = "".join(self._parts)
        text = re.sub(r"[^\S\n]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()


def strip_html(html: str) -> str:
    """Convert HTML to plain text. Returns empty string on failure."""
    if not html:
        return ""
    try:
        stripper = _HTMLStripper()
        stripper.feed(html)
        return stripper.get_text()
    except Exception:
        return re.sub(r"<[^>]+>", " ", html).strip()
