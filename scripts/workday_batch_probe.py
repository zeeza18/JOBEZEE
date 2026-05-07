"""
workday_batch_probe.py  (v2 — exhaustive)
=========================================
Tries every combination of tenant slug x wdN x site_id for each company.
Stops on first hit per company.

Run:
    python scripts/workday_batch_probe.py
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

WD_VARIANTS = ["wd1", "wd3", "wd5", "wd12", "wd2", "wd4", "wd6", "wd7", "wd8"]

SITE_IDS = [
    # generic
    "jobs", "careers", "search", "External", "external",
    "External_Careers", "Careers", "JobSearch", "Global_Careers",
    "External_Career_Site", "CareersPage", "Career", "career",
    "Global_Jobs", "GlobalCareers", "GlobalJobs", "Global",
    "Opportunities", "opportunities", "OpenPositions",
    "ExternalCareer", "ExternalCareers", "Ext_Careers",
    "US_Careers", "US", "NA_Careers",
    "job", "Job", "talent", "Talent",
    "external-careers", "global-careers",
    # common company-style patterns
    "Careers_External", "careers_external",
    "External_Job_Postings", "JobPostings",
    "CareerSite", "career_site",
    "external_careers", "ext_careers",
    "CareersAtCompany", "WorkHere",
    "Public_Jobs", "PublicJobs",
]

# ---------------------------------------------------------------------------
# Each entry: (key, name, region, country, industry, slug_candidates, custom_domains)
# slug_candidates: tried against every wdN.myworkdayjobs.com
# custom_domains:  list of (base_url, tenant) — fixed base, try all site_ids
# ---------------------------------------------------------------------------
COMPANIES = [
    ("accenture",        "Accenture",                 "north_america", "Ireland",        "consulting",
     ["accenture", "accenturecareers", "accenture-na", "accenturena"],
     [("https://accenture.wd3.myworkdayjobs.com", "accenture")]),

    ("deloitte",         "Deloitte",                  "north_america", "United States",  "consulting",
     ["deloitte", "deloittecareers", "deloitte-us", "deloitteus"],
     [("https://deloitte.wd1.myworkdayjobs.com", "deloitte"),
      ("https://deloitte.wd5.myworkdayjobs.com", "deloitte")]),

    ("bankofamerica",    "Bank of America",           "north_america", "United States",  "finance",
     ["bankofamerica", "bofa", "bac", "boa", "bankofamericacareers"],
     []),

    ("concentrix",       "Concentrix",                "north_america", "United States",  "technology",
     ["concentrix", "cnxcareers"],
     [("https://workday.concentrix.com", "concentrix"),
      ("https://concentrix.wd5.myworkdayjobs.com", "concentrix")]),

    ("disney",           "The Walt Disney Company",   "north_america", "United States",  "media",
     ["disney", "waltdisney", "twdc", "disneycareers", "thewalddisney", "thewaltdisney"],
     [("https://disney.wd5.myworkdayjobs.com", "disney"),
      ("https://disney.wd1.myworkdayjobs.com", "disney")]),

    ("shell",            "Shell",                     "europe",        "United Kingdom", "energy",
     ["shell", "shellgroup", "shellcareers", "shellplc", "royaldutchshell"],
     [("https://shell.wd3.myworkdayjobs.com", "shell"),
      ("https://shell.wd1.myworkdayjobs.com", "shell")]),

    ("thermofisher",     "Thermo Fisher Scientific",  "north_america", "United States",  "healthcare",
     ["thermofisher", "thermofishersci", "thermofisherscientific", "tmo"],
     [("https://thermofisher.wd1.myworkdayjobs.com", "thermofisher")]),

    ("bakerhughes",      "Baker Hughes",              "north_america", "United States",  "energy",
     ["bakerhughes", "bhge", "bakerhughesco", "ge-bhge"],
     [("https://bakerhughes.wd1.myworkdayjobs.com", "bakerhughes"),
      ("https://bakerhughes.wd5.myworkdayjobs.com", "bakerhughes")]),

    ("nordstrom",        "Nordstrom",                 "north_america", "United States",  "retail",
     ["nordstrom", "nordstromcareers", "nordstrominc"],
     [("https://nordstrom.wd5.myworkdayjobs.com", "nordstrom")]),

    ("caterpillar",      "Caterpillar",               "north_america", "United States",  "manufacturing",
     ["caterpillar", "cat", "caterpillarinc", "catjobs"],
     [("https://caterpillar.wd5.myworkdayjobs.com", "caterpillar"),
      ("https://cat.wd5.myworkdayjobs.com", "cat")]),

    ("cocacola",         "The Coca-Cola Company",     "north_america", "United States",  "retail",
     ["cocacola", "coca-cola", "coke", "cocacolacompany", "thecoca-colacompany"],
     [("https://cocacola.wd5.myworkdayjobs.com", "cocacola"),
      ("https://coca-cola.wd1.myworkdayjobs.com", "coca-cola")]),

    ("commbank",         "Commonwealth Bank",         "asia_pacific",  "Australia",      "finance",
     ["commbank", "cba", "commonwealthbank", "commonwealthbankau"],
     [("https://commbank.wd3.myworkdayjobs.com", "commbank")]),

    ("kering",           "Kering",                    "europe",        "France",         "retail",
     ["kering", "keringgroup", "keringcareers"],
     [("https://kering.wd3.myworkdayjobs.com", "kering")]),

    ("fiserv",           "Fiserv",                    "north_america", "United States",  "finance",
     ["fiserv", "fiservcareers", "fiservinc"],
     [("https://fiserv.wd5.myworkdayjobs.com", "fiserv"),
      ("https://fiserv.wd1.myworkdayjobs.com", "fiserv")]),

    ("tysonfoods",       "Tyson Foods",               "north_america", "United States",  "retail",
     ["tysonfoods", "tyson", "tysonfoodsinc"],
     [("https://tysonfoods.wd1.myworkdayjobs.com", "tysonfoods")]),

    ("redbull",          "Red Bull",                  "europe",        "Austria",        "retail",
     ["redbull", "redbullgmbh", "rbr"],
     [("https://rbrworkday.redbull.com", "redbull"),
      ("https://redbull.wd3.myworkdayjobs.com", "redbull")]),

    ("elevancehealth",   "Elevance Health",           "north_america", "United States",  "healthcare",
     ["elevancehealth", "anthem", "antheminc", "elevance", "wellpoint"],
     [("https://elevancehealth.wd1.myworkdayjobs.com", "elevancehealth"),
      ("https://anthem.wd1.myworkdayjobs.com", "anthem")]),

    ("telstra",          "Telstra",                   "asia_pacific",  "Australia",      "telecom",
     ["telstra", "telstracorp", "telstragroup"],
     [("https://telstra.wd3.myworkdayjobs.com", "telstra")]),

    ("spglobal",         "S&P Global",                "north_america", "United States",  "finance",
     ["spglobal", "snp", "sandpglobal", "sp", "spglobalinc"],
     [("https://spglobal.wd1.myworkdayjobs.com", "spglobal"),
      ("https://spglobal.wd5.myworkdayjobs.com", "spglobal")]),

    ("cushmanwakefield", "Cushman & Wakefield",       "north_america", "United States",  "consulting",
     ["cushmanwakefield", "cushman", "cwglobal", "cwrealestate"],
     [("https://cushmanwakefield.wd1.myworkdayjobs.com", "cushmanwakefield")]),

    ("centene",          "Centene",                   "north_america", "United States",  "healthcare",
     ["centene", "centenecorp", "centenehealth"],
     [("https://centene.wd1.myworkdayjobs.com", "centene"),
      ("https://centene.wd5.myworkdayjobs.com", "centene")]),

    ("sky",              "Sky",                       "europe",        "United Kingdom", "media",
     ["sky", "skygroup", "skyuk", "skymedia"],
     [("https://sky.wd3.myworkdayjobs.com", "sky"),
      ("https://sky.wd1.myworkdayjobs.com", "sky")]),

    ("northerntrust",    "Northern Trust",            "north_america", "United States",  "finance",
     ["northerntrust", "ntrs", "northerntrustcorp"],
     [("https://northerntrust.wd5.myworkdayjobs.com", "northerntrust"),
      ("https://northerntrust.wd1.myworkdayjobs.com", "northerntrust")]),

    ("wolterskluwer",    "Wolters Kluwer",            "europe",        "Netherlands",    "technology",
     ["wolterskluwer", "wk", "wolters"],
     [("https://wolterskluwer.wd5.myworkdayjobs.com", "wolterskluwer")]),

    ("cox",              "Cox Enterprises",           "north_america", "United States",  "media",
     ["cox", "coxenterprises", "coxinc", "coxmedia"],
     [("https://coxenterprises.wd1.myworkdayjobs.com", "coxenterprises"),
      ("https://cox.wd5.myworkdayjobs.com", "cox")]),

    ("mtb",              "M&T Bank",                  "north_america", "United States",  "finance",
     ["mtb", "mandtbank", "mt", "mandtbankcorp"],
     [("https://mtb.wd5.myworkdayjobs.com", "mtb"),
      ("https://mandtbank.wd1.myworkdayjobs.com", "mandtbank")]),

    ("freudenberg",      "Freudenberg Group",         "europe",        "Germany",        "manufacturing",
     ["freudenberg", "freudenberggroup", "fst"],
     [("https://freudenberg.wd3.myworkdayjobs.com", "freudenberg")]),

    ("fnb",              "FNB",                       "africa",        "South Africa",   "finance",
     ["fnb", "firstnationalbank", "fnbsa", "rmbfnb"],
     [("https://fnb.wd3.myworkdayjobs.com", "fnb")]),

    ("csl",              "CSL Limited",               "asia_pacific",  "Australia",      "healthcare",
     ["csl", "csllimited", "cslbehring", "cslseqirus"],
     [("https://csl.wd3.myworkdayjobs.com", "csl"),
      ("https://csl.wd1.myworkdayjobs.com", "csl")]),

    ("jbhunt",           "J.B. Hunt",                 "north_america", "United States",  "logistics",
     ["jbhunt", "jb", "jbhunttransport", "jbhunttransportation"],
     [("https://jbhunt.wd5.myworkdayjobs.com", "jbhunt"),
      ("https://jbhunt.wd1.myworkdayjobs.com", "jbhunt")]),

    ("loblaw",           "Loblaw Companies",          "north_america", "Canada",         "retail",
     ["loblaw", "loblawcompanies", "loblaw1", "loblaws"],
     [("https://loblaw.wd3.myworkdayjobs.com", "loblaw"),
      ("https://loblaw1.wd3.myworkdayjobs.com", "loblaw1")]),

    ("intermountain",    "Intermountain Health",      "north_america", "United States",  "healthcare",
     ["intermountain", "intermountainhealthcare", "imail", "ld"],
     [("https://intermountain.wd5.myworkdayjobs.com", "intermountain"),
      ("https://imail.wd1.myworkdayjobs.com", "imail")]),

    ("chrobinson",       "C.H. Robinson",             "north_america", "United States",  "logistics",
     ["chrobinson", "chr", "chrw"],
     [("https://chrobinson.wd5.myworkdayjobs.com", "chrobinson")]),

    ("swisscom",         "Swisscom",                  "europe",        "Switzerland",    "telecom",
     ["swisscom", "swisscomltd", "swisscomag"],
     [("https://swisscom.wd3.myworkdayjobs.com", "swisscom")]),

    ("autodesk",         "Autodesk",                  "north_america", "United States",  "technology",
     ["autodesk", "autodeskinc", "autodeskcareers"],
     [("https://autodesk.wd1.myworkdayjobs.com", "autodesk"),
      ("https://autodesk.wd5.myworkdayjobs.com", "autodesk")]),

    ("westernunion",     "Western Union",             "north_america", "United States",  "finance",
     ["westernunion", "wu", "westernunioncorp"],
     [("https://westernunion.wd5.myworkdayjobs.com", "westernunion"),
      ("https://westernunion.wd1.myworkdayjobs.com", "westernunion")]),

    ("thehartford",      "The Hartford",              "north_america", "United States",  "finance",
     ["thehartford", "hartford", "hartfordfinancial", "hig"],
     [("https://thehartford.wd5.myworkdayjobs.com", "thehartford"),
      ("https://hartford.wd1.myworkdayjobs.com", "hartford")]),

    ("suncor",           "Suncor Energy",             "north_america", "Canada",         "energy",
     ["suncor", "suncorenergyinc", "suncorjobs"],
     [("https://suncor.wd3.myworkdayjobs.com", "suncor"),
      ("https://suncor.wd1.myworkdayjobs.com", "suncor")]),

    ("paloaltonetworks", "Palo Alto Networks",        "north_america", "United States",  "technology",
     ["paloaltonetworks", "paloalto", "pan"],
     [("https://flexwork.paloaltonetworks.com", "paloaltonetworks"),
      ("https://paloaltonetworks.wd1.myworkdayjobs.com", "paloaltonetworks"),
      ("https://paloaltonetworks.wd5.myworkdayjobs.com", "paloaltonetworks")]),

    ("agilent",          "Agilent Technologies",      "north_america", "United States",  "healthcare",
     ["agilent", "agilenttech", "agilenttechnologies"],
     [("https://agilent.wd1.myworkdayjobs.com", "agilent"),
      ("https://agilent.wd5.myworkdayjobs.com", "agilent")]),

    ("medtronic",        "Medtronic",                 "north_america", "United States",  "healthcare",
     ["medtronic", "medtroniccareers", "medtronicplc"],
     [("https://medtronic.wd1.myworkdayjobs.com", "medtronic"),
      ("https://medtronic.wd5.myworkdayjobs.com", "medtronic")]),

    ("finastra",         "Finastra",                  "europe",        "United Kingdom", "finance",
     ["finastra", "finastragroup", "misys"],
     [("https://finastra.wd3.myworkdayjobs.com", "finastra"),
      ("https://finastra.wd1.myworkdayjobs.com", "finastra")]),

    ("firstam",          "First American",            "north_america", "United States",  "finance",
     ["firstam", "firstamerican", "firstamericanfinancial", "faf"],
     [("https://firstam.wd5.myworkdayjobs.com", "firstam"),
      ("https://firstamerican.wd1.myworkdayjobs.com", "firstamerican")]),

    ("protiviti",        "Protiviti",                 "north_america", "United States",  "consulting",
     ["protiviti", "rhi", "roberthalf"],
     [("https://protiviti.wd1.myworkdayjobs.com", "protiviti"),
      ("https://roberthalf.wd1.myworkdayjobs.com", "roberthalf")]),

    ("dentsu",           "Dentsu",                    "asia_pacific",  "Japan",          "media",
     ["dentsu", "dentsugroup", "dentsuinternational", "dentsuinc"],
     [("https://dentsu.wd3.myworkdayjobs.com", "dentsu"),
      ("https://dentsugroup.wd1.myworkdayjobs.com", "dentsugroup")]),

    ("edwards",          "Edwards Lifesciences",      "north_america", "United States",  "healthcare",
     ["edwards", "edwardslifesciences", "edwlife", "edwardsls"],
     [("https://edwards.wd5.myworkdayjobs.com", "edwards"),
      ("https://edwardslifesciences.wd1.myworkdayjobs.com", "edwardslifesciences")]),

    ("dish",             "DISH Network",              "north_america", "United States",  "media",
     ["dish", "dishnetwork", "echostar", "dishwireless"],
     [("https://dish.wd5.myworkdayjobs.com", "dish"),
      ("https://echostar.wd5.myworkdayjobs.com", "echostar")]),

    ("tietoevry",        "TietoEVRY",                 "europe",        "Finland",        "technology",
     ["tietoevry", "tieto", "evry", "tietoevrycareers"],
     [("https://tietoevry.wd3.myworkdayjobs.com", "tietoevry")]),

    ("fis",              "FIS Global",                "north_america", "United States",  "finance",
     ["fis", "fisglobal", "worldpay", "fisnow"],
     [("https://fis.wd5.myworkdayjobs.com", "fis"),
      ("https://fisglobal.wd1.myworkdayjobs.com", "fisglobal")]),

    ("havas",            "Havas",                     "europe",        "France",         "media",
     ["havas", "havasgroup", "havasmedia"],
     [("https://talentspace.havas.com", "havas"),
      ("https://havas.wd3.myworkdayjobs.com", "havas")]),

    ("springernature",   "Springer Nature",           "europe",        "Germany",        "media",
     ["springernature", "springer", "nature", "springernaturegroup"],
     [("https://springernature.wd3.myworkdayjobs.com", "springernature"),
      ("https://group.springernature.com", "springernature")]),

    ("kyndryl",          "Kyndryl",                   "north_america", "United States",  "technology",
     ["kyndryl", "kyndrylcareers", "kyndrylholdings"],
     [("https://kyndryl.wd5.myworkdayjobs.com", "kyndryl"),
      ("https://kyndryl.wd1.myworkdayjobs.com", "kyndryl")]),

    ("danaher",          "Danaher",                   "north_america", "United States",  "healthcare",
     ["danaher", "danahercareers", "danaherinc"],
     [("https://danaher.wd1.myworkdayjobs.com", "danaher"),
      ("https://danaher.wd5.myworkdayjobs.com", "danaher")]),
]


# ── probe core ───────────────────────────────────────────────────────────────

def _post(base_url: str, tenant: str, site_id: str, timeout: int = 10) -> int | None:
    endpoint = f"{base_url}/wday/cxs/{tenant}/{site_id}/jobs"
    payload = json.dumps({"appliedFacets": {}, "limit": 1, "offset": 0, "searchText": ""}).encode()
    req = urllib.request.Request(
        endpoint, data=payload,
        headers={"Content-Type": "application/json", "User-Agent": USER_AGENT, "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                data = json.loads(resp.read())
                total = data.get("total", data.get("totalJobsCount"))
                return int(total) if total is not None else 0
    except Exception:
        pass
    return None


def probe_one(entry: tuple) -> dict | None:
    key, name, region, country, industry, slugs, customs = entry

    # 1. Try custom base_urls first (exact known domain)
    for base_url, tenant in customs:
        for site_id in SITE_IDS:
            total = _post(base_url, tenant, site_id)
            if total is not None:
                return dict(key=key, name=name, region=region, country=country,
                            industry=industry, base_url=base_url, tenant=tenant,
                            site_id=site_id, total_jobs=total)

    # 2. Slug x wdN grid
    for slug in slugs:
        for wd in WD_VARIANTS:
            base_url = f"https://{slug}.{wd}.myworkdayjobs.com"
            for site_id in SITE_IDS:
                total = _post(base_url, slug, site_id)
                if total is not None:
                    return dict(key=key, name=name, region=region, country=country,
                                industry=industry, base_url=base_url, tenant=slug,
                                site_id=site_id, total_jobs=total)

    return None


def _entry_str(h: dict) -> str:
    return (
        f'    "{h["key"]}": {{\n'
        f'        "name":     "{h["name"]}",\n'
        f'        "base_url": "{h["base_url"]}",\n'
        f'        "tenant":   "{h["tenant"]}",\n'
        f'        "site_id":  "{h["site_id"]}",\n'
        f'        "region":   "{h["region"]}",\n'
        f'        "country":  "{h["country"]}",\n'
        f'        "industry": "{h["industry"]}",\n'
        f'    }},'
    )


# ── main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    total = len(COMPANIES)
    slug_count = sum(len(s) * len(WD_VARIANTS) * len(SITE_IDS) + len(c) * len(SITE_IDS)
                     for _, _, _, _, _, s, c in COMPANIES)
    print(f"Probing {total} companies | up to {slug_count:,} endpoint combinations")
    print(f"Workers: 20 parallel | ~2-4 min\n")

    hits: list[dict] = []
    misses: list[str] = []

    with ThreadPoolExecutor(max_workers=20) as pool:
        futures = {pool.submit(probe_one, c): c for c in COMPANIES}
        done = 0
        for future in as_completed(futures):
            done += 1
            entry = futures[future]
            name = entry[1]
            result = future.result()
            if result:
                hits.append(result)
                print(f"  [{done:3d}/{total}] OK   {name:<40} {result['total_jobs']:>6} jobs  ({result['base_url']})")
            else:
                misses.append(name)
                print(f"  [{done:3d}/{total}] MISS {name}")

    out_path = Path("scripts/workday_batch_results.json")
    out_path.write_text(json.dumps(hits, indent=2), encoding="utf-8")

    print(f"\n{'='*65}")
    print(f"HITS: {len(hits)} / {total}  |  saved to {out_path}")
    print(f"{'='*65}\n")

    if hits:
        print("--- READY-TO-PASTE ENTRIES ---\n")
        for h in sorted(hits, key=lambda x: x["name"]):
            print(_entry_str(h))
            print()

    if misses:
        print(f"--- STILL NOT FOUND ({len(misses)}) ---")
        for m in misses:
            print(f"  {m}")
        print("\nFor these: open their careers page -> DevTools -> Network -> filter 'jobs'")
        print("Copy the POST URL, then: python scripts/workday_probe.py <url>")


if __name__ == "__main__":
    main()
