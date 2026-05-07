"""
workday_batch_probe3.py — Slot 3 batch
Run: python scripts/workday_batch_probe3.py
"""
from __future__ import annotations
import json, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

USER_AGENT = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
              "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

WD_VARIANTS = ["wd1", "wd3", "wd5", "wd12", "wd2", "wd4", "wd6", "wd7", "wd8"]

SITE_IDS = [
    "jobs", "careers", "search", "External", "external",
    "External_Careers", "Careers", "JobSearch", "Global_Careers",
    "External_Career_Site", "CareersPage", "Career", "career",
    "Global_Jobs", "GlobalCareers", "GlobalJobs", "Global",
    "Opportunities", "opportunities", "ExternalCareer", "ExternalCareers",
    "Ext_Careers", "US_Careers", "US", "career_site", "CareerSite",
    "external_careers", "ext_careers", "Public_Jobs", "PublicJobs",
    "Careers_External", "careers_external", "JobPostings",
    "job", "Job", "talent", "Talent", "OpenPositions",
]

COMPANIES = [
    ("aritzia",          "Aritzia",                   "north_america", "Canada",         "retail",
     ["aritzia", "aritzialp"],
     [("https://aritzia.wd3.myworkdayjobs.com", "aritzia"),
      ("https://aritzia.wd5.myworkdayjobs.com", "aritzia")]),

    ("mrcooper",         "Mr. Cooper",                "north_america", "United States",  "finance",
     ["mrcooper", "nationstar", "coopermortgage"],
     [("https://mrcooper.wd1.myworkdayjobs.com", "mrcooper"),
      ("https://nationstar.wd5.myworkdayjobs.com", "nationstar")]),

    ("arianegroup",      "ArianeGroup",               "europe",        "France",         "manufacturing",
     ["arianegroup", "ariane", "airbus-safran"],
     [("https://arianegroup.wd3.myworkdayjobs.com", "arianegroup")]),

    ("king",             "King",                      "europe",        "Sweden",         "technology",
     ["king", "activisionblizzard", "kingdigital"],
     [("https://king.wd3.myworkdayjobs.com", "king"),
      ("https://activisionblizzard.wd1.myworkdayjobs.com", "activisionblizzard")]),

    ("ferring",          "Ferring Pharmaceuticals",   "europe",        "Switzerland",    "healthcare",
     ["ferring", "ferringpharma"],
     [("https://ferring.wd3.myworkdayjobs.com", "ferring")]),

    ("finra",            "FINRA",                     "north_america", "United States",  "finance",
     ["finra", "finraorg"],
     [("https://finra.wd5.myworkdayjobs.com", "finra"),
      ("https://finra.wd1.myworkdayjobs.com", "finra")]),

    ("bluecrossnc",      "Blue Cross NC",             "north_america", "United States",  "healthcare",
     ["bluecrossnc", "bcbsnc", "bluecrossblue"],
     [("https://bluecrossnc.wd5.myworkdayjobs.com", "bluecrossnc"),
      ("https://bcbsnc.wd1.myworkdayjobs.com", "bcbsnc")]),

    ("f5",               "F5",                        "north_america", "United States",  "technology",
     ["f5", "f5networks", "f5inc"],
     [("https://f5.wd5.myworkdayjobs.com", "f5"),
      ("https://f5networks.wd1.myworkdayjobs.com", "f5networks")]),

    ("exactsciences",    "Exact Sciences",            "north_america", "United States",  "healthcare",
     ["exactsciences", "exas"],
     [("https://exactsciences.wd1.myworkdayjobs.com", "exactsciences"),
      ("https://exactsciences.wd5.myworkdayjobs.com", "exactsciences")]),

    ("newschool",        "The New School",            "north_america", "United States",  "education",
     ["newschool", "thenewschool"],
     [("https://newschool.wd1.myworkdayjobs.com", "newschool")]),

    ("ummc",             "UMMC",                      "north_america", "United States",  "healthcare",
     ["umc", "ummc", "umsmed"],
     [("https://umc.wd1.myworkdayjobs.com", "umc"),
      ("https://ummc.wd5.myworkdayjobs.com", "ummc")]),

    ("umgc",             "UMGC",                      "north_america", "United States",  "education",
     ["umgc", "umarylandglobal"],
     [("https://umgc.wd1.myworkdayjobs.com", "umgc"),
      ("https://umgc.wd5.myworkdayjobs.com", "umgc")]),

    ("huron",            "Huron Consulting Group",    "north_america", "United States",  "consulting",
     ["huron", "huronconsulting", "huronconsultinggroup"],
     [("https://huron.wd5.myworkdayjobs.com", "huron"),
      ("https://huronconsultinggroup.wd1.myworkdayjobs.com", "huronconsultinggroup")]),

    ("epicor",           "Epicor Software",           "north_america", "United States",  "technology",
     ["epicor", "epicorsoftware"],
     [("https://epicor.wd5.myworkdayjobs.com", "epicor"),
      ("https://epicor.wd1.myworkdayjobs.com", "epicor")]),

    ("vertex",           "Vertex Pharmaceuticals",    "north_america", "United States",  "healthcare",
     ["vrtx", "vertexpharma", "vertexpharmaceuticals"],
     [("https://vrtx.wd1.myworkdayjobs.com", "vrtx"),
      ("https://vertexpharma.wd5.myworkdayjobs.com", "vertexpharma")]),

    ("constellationbrands","Constellation Brands",    "north_america", "United States",  "retail",
     ["cbrands", "constellationbrands", "stzbrands"],
     [("https://cbrands.wd5.myworkdayjobs.com", "cbrands"),
      ("https://constellationbrands.wd1.myworkdayjobs.com", "constellationbrands")]),

    ("woodward",         "Woodward Inc",              "north_america", "United States",  "manufacturing",
     ["woodward", "woodwardinc"],
     [("https://woodward.wd5.myworkdayjobs.com", "woodward"),
      ("https://woodward.wd1.myworkdayjobs.com", "woodward")]),

    ("blizzard",         "Blizzard Entertainment",    "north_america", "United States",  "technology",
     ["blizzard", "blizzardentertainment", "activisionblizzard"],
     [("https://blizzard.wd5.myworkdayjobs.com", "blizzard"),
      ("https://activisionblizzard.wd5.myworkdayjobs.com", "activisionblizzard")]),

    ("crosscountrymortgage","CrossCountry Mortgage",  "north_america", "United States",  "finance",
     ["crosscountrymortgage", "ccm", "crosscountry"],
     [("https://crosscountrymortgage.wd5.myworkdayjobs.com", "crosscountrymortgage")]),

    ("fnzgroup",         "FNZ Group",                 "europe",        "United Kingdom", "finance",
     ["fnz", "fnzgroup"],
     [("https://fnz.wd3.myworkdayjobs.com", "fnz"),
      ("https://fnzgroup.wd3.myworkdayjobs.com", "fnzgroup")]),

    ("scripps",          "E.W. Scripps",              "north_america", "United States",  "media",
     ["scripps", "ewscripps", "scrippsnetworks"],
     [("https://scripps.wd5.myworkdayjobs.com", "scripps"),
      ("https://ewscripps.wd1.myworkdayjobs.com", "ewscripps")]),

    ("mcafee",           "McAfee",                    "north_america", "United States",  "technology",
     ["mcafee", "mcafeellc"],
     [("https://mcafee.wd5.myworkdayjobs.com", "mcafee"),
      ("https://mcafee.wd1.myworkdayjobs.com", "mcafee")]),

    ("abrdn",            "abrdn",                     "europe",        "United Kingdom", "finance",
     ["abrdn", "aberdeenstandard", "aberdeenasset"],
     [("https://abrdn.wd3.myworkdayjobs.com", "abrdn"),
      ("https://aberdeenstandard.wd3.myworkdayjobs.com", "aberdeenstandard")]),

    ("apria",            "Apria Healthcare",          "north_america", "United States",  "healthcare",
     ["apria", "apriahealthcare"],
     [("https://apria.wd5.myworkdayjobs.com", "apria"),
      ("https://apria.wd1.myworkdayjobs.com", "apria")]),

    ("swift",            "SWIFT",                     "europe",        "Belgium",        "finance",
     ["swift", "swiftnet"],
     [("https://swift.wd3.myworkdayjobs.com", "swift")]),

    ("extendicare",      "Extendicare",               "north_america", "Canada",         "healthcare",
     ["extendicare"],
     [("https://extendicare.wd3.myworkdayjobs.com", "extendicare")]),

    ("curtisswright",    "Curtiss-Wright",            "north_america", "United States",  "manufacturing",
     ["curtisswright", "curtisswrightcorp"],
     [("https://curtisswright.wd1.myworkdayjobs.com", "curtisswright"),
      ("https://curtisswright.wd5.myworkdayjobs.com", "curtisswright")]),

    ("wilhelmsen",       "Wilhelmsen",                "europe",        "Norway",         "logistics",
     ["wilhelmsen", "wilhelmsengroup"],
     [("https://wilhelmsen.wd3.myworkdayjobs.com", "wilhelmsen")]),

    ("redfin",           "Redfin",                    "north_america", "United States",  "consulting",
     ["redfin", "redfinco"],
     [("https://redfin.wd5.myworkdayjobs.com", "redfin"),
      ("https://redfin.wd1.myworkdayjobs.com", "redfin")]),

    ("teladoc",          "Teladoc Health",            "north_america", "United States",  "healthcare",
     ["teladoc", "teladochealth"],
     [("https://teladoc.wd5.myworkdayjobs.com", "teladoc"),
      ("https://teladochealth.wd1.myworkdayjobs.com", "teladochealth")]),

    ("hbfuller",         "H.B. Fuller",               "north_america", "United States",  "manufacturing",
     ["hbfuller", "hbfullercorp"],
     [("https://hbfuller.wd5.myworkdayjobs.com", "hbfuller"),
      ("https://hbfuller.wd1.myworkdayjobs.com", "hbfuller")]),

    ("goodlifefitness",  "GoodLife Fitness",          "north_america", "Canada",         "retail",
     ["goodlifefitness", "goodlife"],
     [("https://goodlifefitness.wd3.myworkdayjobs.com", "goodlifefitness")]),

    ("autoowners",       "Auto-Owners Insurance",     "north_america", "United States",  "finance",
     ["autoowners", "auto-owners"],
     [("https://autoowners.wd5.myworkdayjobs.com", "autoowners"),
      ("https://autoowners.wd1.myworkdayjobs.com", "autoowners")]),

    ("greenbergtraurig", "Greenberg Traurig",         "north_america", "United States",  "consulting",
     ["gtlaw", "greenbergtraurig"],
     [("https://gtlaw.wd5.myworkdayjobs.com", "gtlaw"),
      ("https://greenbergtraurig.wd1.myworkdayjobs.com", "greenbergtraurig")]),

    ("agl",              "AGL",                       "asia_pacific",  "Australia",      "energy",
     ["agl", "aglenergy"],
     [("https://agl.wd3.myworkdayjobs.com", "agl"),
      ("https://aglenergy.wd3.myworkdayjobs.com", "aglenergy")]),

    ("encorecapital",    "Encore Capital Group",      "north_america", "United States",  "finance",
     ["encorecapital", "encore"],
     [("https://encorecapital.wd5.myworkdayjobs.com", "encorecapital"),
      ("https://encorecapital.wd1.myworkdayjobs.com", "encorecapital")]),

    ("wework",           "WeWork",                    "north_america", "United States",  "consulting",
     ["wework", "weworkco"],
     [("https://wework.wd5.myworkdayjobs.com", "wework"),
      ("https://wework.wd1.myworkdayjobs.com", "wework")]),

    ("greif",            "Greif Inc",                 "north_america", "United States",  "manufacturing",
     ["greif", "greifinc"],
     [("https://greif.wd5.myworkdayjobs.com", "greif"),
      ("https://greif.wd1.myworkdayjobs.com", "greif")]),

    ("claytonhomes",     "Clayton Homes",             "north_america", "United States",  "consulting",
     ["claytonhomes", "clayton"],
     [("https://claytonhomes.wd5.myworkdayjobs.com", "claytonhomes"),
      ("https://clayton.wd1.myworkdayjobs.com", "clayton")]),

    ("apollo",           "Apollo Global Management", "north_america", "United States",  "finance",
     ["apollo", "apolloglobal", "apolloglobalmanagement"],
     [("https://apollo.wd5.myworkdayjobs.com", "apollo"),
      ("https://apolloglobal.wd1.myworkdayjobs.com", "apolloglobal")]),

    ("univision",        "Univision",                 "north_america", "United States",  "media",
     ["univision", "univisioncommunications"],
     [("https://univision.wd5.myworkdayjobs.com", "univision"),
      ("https://univision.wd1.myworkdayjobs.com", "univision")]),

    ("valmont",          "Valmont Industries",        "north_america", "United States",  "manufacturing",
     ["valmont", "valmontindustries"],
     [("https://valmont.wd5.myworkdayjobs.com", "valmont"),
      ("https://valmont.wd1.myworkdayjobs.com", "valmont")]),

    ("frostbank",        "Frost Bank",                "north_america", "United States",  "finance",
     ["frostbank", "cullen", "cullenfrost"],
     [("https://frostbank.wd5.myworkdayjobs.com", "frostbank"),
      ("https://cullenfrost.wd1.myworkdayjobs.com", "cullenfrost")]),

    ("evotec",           "Evotec SE",                 "europe",        "Germany",        "healthcare",
     ["evotec", "evotecse"],
     [("https://evotec.wd3.myworkdayjobs.com", "evotec")]),

    ("proofpoint",       "Proofpoint",                "north_america", "United States",  "technology",
     ["proofpoint", "proofpointinc"],
     [("https://proofpoint.wd5.myworkdayjobs.com", "proofpoint"),
      ("https://proofpoint.wd1.myworkdayjobs.com", "proofpoint")]),

    ("varsitybrands",    "Varsity Brands",            "north_america", "United States",  "retail",
     ["varsitybrands", "varsity"],
     [("https://varsitybrands.wd5.myworkdayjobs.com", "varsitybrands"),
      ("https://varsitybrands.wd1.myworkdayjobs.com", "varsitybrands")]),

    ("archcapital",      "Arch Capital",              "europe",        "Bermuda",        "finance",
     ["archgroup", "archcapital", "archinsurance"],
     [("https://archgroup.wd5.myworkdayjobs.com", "archgroup"),
      ("https://archcapital.wd1.myworkdayjobs.com", "archcapital")]),

    ("hancockwhitney",   "Hancock Whitney",           "north_america", "United States",  "finance",
     ["hancockwhitney", "hancock"],
     [("https://hancockwhitney.wd5.myworkdayjobs.com", "hancockwhitney"),
      ("https://hancockwhitney.wd1.myworkdayjobs.com", "hancockwhitney")]),

    ("wolverine",        "Wolverine World Wide",      "north_america", "United States",  "retail",
     ["wolverineworldwide", "wolverine", "www"],
     [("https://wolverineworldwide.wd5.myworkdayjobs.com", "wolverineworldwide"),
      ("https://wolverine.wd1.myworkdayjobs.com", "wolverine")]),

    ("caresource",       "CareSource",                "north_america", "United States",  "healthcare",
     ["caresource"],
     [("https://caresource.wd5.myworkdayjobs.com", "caresource"),
      ("https://caresource.wd1.myworkdayjobs.com", "caresource")]),

    ("plantemoran",      "Plante & Moran",            "north_america", "United States",  "consulting",
     ["plantemoran", "plante"],
     [("https://plantemoran.wd5.myworkdayjobs.com", "plantemoran"),
      ("https://plantemoran.wd1.myworkdayjobs.com", "plantemoran")]),

    ("bdc",              "BDC Capital",               "north_america", "Canada",         "finance",
     ["bdc", "bdccapital"],
     [("https://bdc.wd3.myworkdayjobs.com", "bdc"),
      ("https://bdccapital.wd3.myworkdayjobs.com", "bdccapital")]),

    ("cambiahealth",     "Cambia Health Solutions",   "north_america", "United States",  "healthcare",
     ["cambia", "cambiahealth", "regencebluecross"],
     [("https://cambia.wd5.myworkdayjobs.com", "cambia"),
      ("https://cambiahealth.wd1.myworkdayjobs.com", "cambiahealth")]),

    ("insulet",          "Insulet Corporation",       "north_america", "United States",  "healthcare",
     ["insulet", "insuletcorp"],
     [("https://insulet.wd1.myworkdayjobs.com", "insulet"),
      ("https://insulet.wd5.myworkdayjobs.com", "insulet")]),

    ("chemours",         "The Chemours Company",      "north_america", "United States",  "manufacturing",
     ["chemours", "chemourscompany"],
     [("https://chemours.wd5.myworkdayjobs.com", "chemours"),
      ("https://chemours.wd1.myworkdayjobs.com", "chemours")]),

    ("extraspace",       "Extra Space Storage",       "north_america", "United States",  "consulting",
     ["extraspace", "extraspacestorage"],
     [("https://extraspace.wd5.myworkdayjobs.com", "extraspace"),
      ("https://extraspacestorage.wd1.myworkdayjobs.com", "extraspacestorage")]),

    ("nuance",           "Nuance Communications",     "north_america", "United States",  "technology",
     ["nuance", "nuancecommunications"],
     [("https://nuance.wd5.myworkdayjobs.com", "nuance"),
      ("https://nuance.wd1.myworkdayjobs.com", "nuance")]),

    ("eisneramper",      "EisnerAmper",               "north_america", "United States",  "consulting",
     ["eisneramper", "eisner"],
     [("https://eisneramper.wd5.myworkdayjobs.com", "eisneramper"),
      ("https://eisneramper.wd1.myworkdayjobs.com", "eisneramper")]),

    ("thedacare",        "ThedaCare",                 "north_america", "United States",  "healthcare",
     ["thedacare", "thedacarephysician"],
     [("https://thedacare.wd5.myworkdayjobs.com", "thedacare"),
      ("https://thedacare.wd1.myworkdayjobs.com", "thedacare")]),

    ("worldmarket",      "World Market",              "north_america", "United States",  "retail",
     ["worldmarket", "costplus", "worldmarketllc"],
     [("https://worldmarket.wd5.myworkdayjobs.com", "worldmarket"),
      ("https://costplus.wd1.myworkdayjobs.com", "costplus")]),
]


def _post(base_url, tenant, site_id, timeout=10):
    endpoint = f"{base_url}/wday/cxs/{tenant}/{site_id}/jobs"
    payload = json.dumps({"appliedFacets": {}, "limit": 1, "offset": 0, "searchText": ""}).encode()
    req = urllib.request.Request(endpoint, data=payload,
        headers={"Content-Type": "application/json", "User-Agent": USER_AGENT, "Accept": "application/json"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                data = json.loads(resp.read())
                total = data.get("total", data.get("totalJobsCount"))
                return int(total) if total is not None else 0
    except Exception:
        pass
    return None


def probe_one(entry):
    key, name, region, country, industry, slugs, customs = entry
    for base_url, tenant in customs:
        for site_id in SITE_IDS:
            t = _post(base_url, tenant, site_id)
            if t is not None:
                return dict(key=key, name=name, region=region, country=country,
                            industry=industry, base_url=base_url, tenant=tenant,
                            site_id=site_id, total_jobs=t)
    for slug in slugs:
        for wd in WD_VARIANTS:
            base_url = f"https://{slug}.{wd}.myworkdayjobs.com"
            for site_id in SITE_IDS:
                t = _post(base_url, slug, site_id)
                if t is not None:
                    return dict(key=key, name=name, region=region, country=country,
                                industry=industry, base_url=base_url, tenant=slug,
                                site_id=site_id, total_jobs=t)
    return None


def _entry_str(h):
    return (f'    "{h["key"]}": {{\n'
            f'        "name":     "{h["name"]}",\n'
            f'        "base_url": "{h["base_url"]}",\n'
            f'        "tenant":   "{h["tenant"]}",\n'
            f'        "site_id":  "{h["site_id"]}",\n'
            f'        "region":   "{h["region"]}",\n'
            f'        "country":  "{h["country"]}",\n'
            f'        "industry": "{h["industry"]}",\n'
            f'    }},')


def main():
    total = len(COMPANIES)
    print(f"Probing {total} companies | Workers: 20 parallel\n")
    hits, misses = [], []
    with ThreadPoolExecutor(max_workers=20) as pool:
        futures = {pool.submit(probe_one, c): c for c in COMPANIES}
        done = 0
        for future in as_completed(futures):
            done += 1
            name = futures[future][1]
            result = future.result()
            if result:
                hits.append(result)
                print(f"  [{done:3d}/{total}] OK   {name:<40} {result['total_jobs']:>6} jobs  ({result['base_url']})")
            else:
                misses.append(name)
                print(f"  [{done:3d}/{total}] MISS {name}")

    print(f"\n{'='*65}")
    print(f"HITS: {len(hits)} / {total}")
    print(f"{'='*65}\n")

    if hits:
        print("--- READY-TO-PASTE ---\n")
        for h in sorted(hits, key=lambda x: x["name"]):
            print(_entry_str(h))
            print()

    if misses:
        print(f"--- NOT FOUND ({len(misses)}) ---")
        for m in misses:
            print(f"  {m}")


if __name__ == "__main__":
    main()
