"""
workday_batch_probe2.py — Slot 2 batch
Run: python scripts/workday_batch_probe2.py
"""
from __future__ import annotations
import json, time, urllib.error, urllib.request
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

# (key, name, region, country, industry, slugs, custom_domains)
COMPANIES = [
    ("pitneybowes",      "Pitney Bowes",              "north_america", "United States",  "technology",
     ["pitneybowes", "pb", "pitney"],
     [("https://pitneybowes.wd1.myworkdayjobs.com", "pitneybowes"),
      ("https://pitneybowes.wd5.myworkdayjobs.com", "pitneybowes")]),

    ("empower",          "Empower",                   "north_america", "United States",  "finance",
     ["empower", "empowerretirement", "empowerfinancial"],
     [("https://empower.wd1.myworkdayjobs.com", "empower"),
      ("https://empower.wd5.myworkdayjobs.com", "empower")]),

    ("belk",             "Belk",                      "north_america", "United States",  "retail",
     ["belk", "belkdept", "belkstores"],
     [("https://belk.wd5.myworkdayjobs.com", "belk")]),

    ("valmet",           "Valmet",                    "europe",        "Finland",        "manufacturing",
     ["valmet", "valmetcorp"],
     [("https://valmet.wd3.myworkdayjobs.com", "valmet")]),

    ("ferrovial",        "Ferrovial",                 "europe",        "Netherlands",    "consulting",
     ["ferrovial", "ferrovialsa"],
     [("https://ferrovial.wd3.myworkdayjobs.com", "ferrovial")]),

    ("elsevier",         "Elsevier",                  "europe",        "Netherlands",    "media",
     ["elsevier", "relx", "reedelseviergroup"],
     [("https://elsevier.wd3.myworkdayjobs.com", "elsevier"),
      ("https://relx.wd3.myworkdayjobs.com", "relx")]),

    ("daveandbusters",   "Dave & Buster's",           "north_america", "United States",  "retail",
     ["daveandbusters", "dab", "davebusters"],
     [("https://daveandbusters.wd5.myworkdayjobs.com", "daveandbusters")]),

    ("ineos",            "INEOS",                     "europe",        "United Kingdom", "manufacturing",
     ["ineos", "ineosgroup"],
     [("https://ineos.wd3.myworkdayjobs.com", "ineos")]),

    ("cinemark",         "Cinemark",                  "north_america", "United States",  "media",
     ["cinemark", "cinemarkholdingsinc"],
     [("https://cinemark.wd5.myworkdayjobs.com", "cinemark"),
      ("https://cinemark.wd1.myworkdayjobs.com", "cinemark")]),

    ("lvhn",             "Lehigh Valley Health Network","north_america","United States",  "healthcare",
     ["lvhn", "lehighvalleyhealth", "lvhealthnetwork"],
     [("https://lvhn.wd5.myworkdayjobs.com", "lvhn")]),

    ("howden",           "Howden Group",              "europe",        "United Kingdom", "finance",
     ["howden", "howdengroup", "howdengroupholdings"],
     [("https://howden.wd3.myworkdayjobs.com", "howden")]),

    ("xcelenergy",       "Xcel Energy",               "north_america", "United States",  "energy",
     ["xcelenergy", "nspexcel", "xcl"],
     [("https://xcelenergy.wd5.myworkdayjobs.com", "xcelenergy"),
      ("https://xcelenergy.wd1.myworkdayjobs.com", "xcelenergy")]),

    ("hshs",             "HSHS Medical Group",        "north_america", "United States",  "healthcare",
     ["hshs", "hshshealth"],
     [("https://hshs.wd5.myworkdayjobs.com", "hshs")]),

    ("lsu",              "Louisiana State University","north_america",  "United States",  "education",
     ["lsu", "louisianastate", "lsuedu"],
     [("https://lsu.wd1.myworkdayjobs.com", "lsu")]),

    ("banfield",         "Banfield Pet Hospital",     "north_america", "United States",  "healthcare",
     ["banfield", "banfieldpet", "marspetcare"],
     [("https://banfield.wd5.myworkdayjobs.com", "banfield")]),

    ("uottawa",          "University of Ottawa",      "north_america", "Canada",         "education",
     ["uottawa", "universityofottawa"],
     [("https://uottawa.wd3.myworkdayjobs.com", "uottawa")]),

    ("aaa",              "AAA",                       "north_america", "United States",  "finance",
     ["aaa", "aaaclub", "acanational"],
     [("https://aaa.wd5.myworkdayjobs.com", "aaa"),
      ("https://aaa.wd1.myworkdayjobs.com", "aaa")]),

    ("hdsupply",         "HD Supply",                 "north_america", "United States",  "retail",
     ["hdsupply", "hdsi"],
     [("https://hdsupply.wd5.myworkdayjobs.com", "hdsupply")]),

    ("nytco",            "The New York Times",        "north_america", "United States",  "media",
     ["nytco", "newyorktimes", "nyt"],
     [("https://nytco.wd1.myworkdayjobs.com", "nytco"),
      ("https://newyorktimes.wd5.myworkdayjobs.com", "newyorktimes")]),

    ("icf",              "ICF",                       "north_america", "United States",  "consulting",
     ["icf", "icfinternational"],
     [("https://workday.icf.com", "icf"),
      ("https://icf.wd5.myworkdayjobs.com", "icf"),
      ("https://icf.wd1.myworkdayjobs.com", "icf")]),

    ("erm",              "ERM",                       "europe",        "United Kingdom", "consulting",
     ["erm", "ermgroup", "environmentalresources"],
     [("https://erm.wd3.myworkdayjobs.com", "erm")]),

    ("wgu",              "WGU",                       "north_america", "United States",  "education",
     ["wgu", "westerngovernors"],
     [("https://wgu.wd5.myworkdayjobs.com", "wgu"),
      ("https://wgu.wd1.myworkdayjobs.com", "wgu")]),

    ("lexisnexis",       "LexisNexis",                "north_america", "United States",  "technology",
     ["lexisnexis", "relx", "lexisnexisrisk"],
     [("https://lexisnexis.wd5.myworkdayjobs.com", "lexisnexis"),
      ("https://relx.wd5.myworkdayjobs.com", "relx")]),

    ("marvell",          "Marvell Technology",        "north_america", "United States",  "technology",
     ["marvell", "marvelltech", "marvellsemiconductor"],
     [("https://marvell.wd1.myworkdayjobs.com", "marvell"),
      ("https://marvell.wd5.myworkdayjobs.com", "marvell")]),

    ("capitalgroup",     "Capital Group",             "north_america", "United States",  "finance",
     ["capitalgroup", "capgroup", "americanfunds"],
     [("https://capitalgroup.wd1.myworkdayjobs.com", "capitalgroup"),
      ("https://capitalgroup.wd5.myworkdayjobs.com", "capitalgroup")]),

    ("cloudsoftwaregroup","Cloud Software Group",     "north_america", "United States",  "technology",
     ["cloudsoftwaregroup", "citrix", "tibco", "cloud"],
     [("https://careers.cloud.com", "cloudsoftwaregroup"),
      ("https://citrix.wd1.myworkdayjobs.com", "citrix"),
      ("https://cloudsoftwaregroup.wd5.myworkdayjobs.com", "cloudsoftwaregroup")]),

    ("bakertilly",       "Baker Tilly",               "north_america", "United States",  "consulting",
     ["bakertilly", "bt", "bakertillyus"],
     [("https://bakertilly.wd5.myworkdayjobs.com", "bakertilly"),
      ("https://bakertilly.wd1.myworkdayjobs.com", "bakertilly")]),

    ("claires",          "Claire's",                  "north_america", "United States",  "retail",
     ["claires", "clairesstore", "clairesinc"],
     [("https://claires.wd5.myworkdayjobs.com", "claires")]),

    ("vspvision",        "VSP Vision",                "north_america", "United States",  "healthcare",
     ["vspvision", "vsp", "vspglobal"],
     [("https://vspvision.wd5.myworkdayjobs.com", "vspvision"),
      ("https://vsp.wd1.myworkdayjobs.com", "vsp")]),

    ("libertyu",         "Liberty University",        "north_america", "United States",  "education",
     ["libertyu", "liberty", "libertyuniversity"],
     [("https://libertyu.wd1.myworkdayjobs.com", "libertyu"),
      ("https://liberty.wd5.myworkdayjobs.com", "liberty")]),

    ("lennar",           "Lennar Corporation",        "north_america", "United States",  "consulting",
     ["lennar", "lennarcorp"],
     [("https://lennar.wd5.myworkdayjobs.com", "lennar"),
      ("https://lennar.wd1.myworkdayjobs.com", "lennar")]),

    ("fidelityintl",     "Fidelity International",   "europe",        "United Kingdom", "finance",
     ["fidelityinternational", "fil", "fidintl"],
     [("https://fidelityinternational.wd3.myworkdayjobs.com", "fidelityinternational"),
      ("https://fil.wd3.myworkdayjobs.com", "fil")]),

    ("worldpay",         "Worldpay",                  "north_america", "United States",  "finance",
     ["worldpay", "fisglobal", "vantiv"],
     [("https://worldpay.wd5.myworkdayjobs.com", "worldpay"),
      ("https://fis.wd5.myworkdayjobs.com", "fis")]),

    ("ivytech",          "Ivy Tech",                  "north_america", "United States",  "education",
     ["ivytech", "ivytechcc", "ivytechcommunitycollege"],
     [("https://ivytech.wd1.myworkdayjobs.com", "ivytech")]),

    ("industrialalliance","Industrial Alliance",      "north_america", "Canada",         "finance",
     ["ia", "industrialalliance", "iainc"],
     [("https://ia.wd3.myworkdayjobs.com", "ia"),
      ("https://industrialalliance.wd3.myworkdayjobs.com", "industrialalliance")]),

    ("jpl",              "Jet Propulsion Laboratory", "north_america", "United States",  "technology",
     ["jpl", "nasajpl"],
     [("https://jpl.wd1.myworkdayjobs.com", "jpl"),
      ("https://jpl.wd5.myworkdayjobs.com", "jpl")]),

    ("ifpci",            "If P&C Insurance",          "europe",        "Sweden",         "finance",
     ["if", "ifinsurance", "sampo"],
     [("https://if.wd3.myworkdayjobs.com", "if"),
      ("https://sampo.wd3.myworkdayjobs.com", "sampo")]),

    ("brunswick",        "Brunswick Corporation",     "north_america", "United States",  "manufacturing",
     ["brunswick", "brunsvickcorp"],
     [("https://brunswick.wd5.myworkdayjobs.com", "brunswick"),
      ("https://brunswick.wd1.myworkdayjobs.com", "brunswick")]),

    ("wiley",            "Wiley",                     "north_america", "United States",  "media",
     ["wiley", "johnwiley", "wileyandsons"],
     [("https://wiley.wd1.myworkdayjobs.com", "wiley"),
      ("https://wiley.wd5.myworkdayjobs.com", "wiley")]),

    ("nortonrosefulbright","Norton Rose Fulbright",   "europe",        "United Kingdom", "consulting",
     ["nortonrosefulbright", "nrf", "nortonrose"],
     [("https://nortonrosefulbright.wd3.myworkdayjobs.com", "nortonrosefulbright"),
      ("https://nrf.wd3.myworkdayjobs.com", "nrf")]),

    ("citi",             "Citigroup",                 "north_america", "United States",  "finance",
     ["citi", "citigroup", "citibank"],
     [("https://citi.wd5.myworkdayjobs.com", "citi"),
      ("https://citigroup.wd1.myworkdayjobs.com", "citigroup"),
      ("https://citi.wd1.myworkdayjobs.com", "citi")]),

    ("chep",             "CHEP",                      "europe",        "United Kingdom", "logistics",
     ["chep", "brambles", "cheplogistics"],
     [("https://chep.wd3.myworkdayjobs.com", "chep"),
      ("https://brambles.wd3.myworkdayjobs.com", "brambles")]),

    ("dematic",          "Dematic",                   "north_america", "United States",  "logistics",
     ["dematic", "kion"],
     [("https://dematic.wd3.myworkdayjobs.com", "dematic"),
      ("https://kion.wd3.myworkdayjobs.com", "kion")]),

    ("aurecon",          "Aurecon Group",             "asia_pacific",  "Australia",      "consulting",
     ["aurecon", "aurecongroup"],
     [("https://aurecon.wd3.myworkdayjobs.com", "aurecon")]),

    ("vanderlande",      "Vanderlande",               "europe",        "Netherlands",    "manufacturing",
     ["vanderlande", "toyota-industries"],
     [("https://vanderlande.wd3.myworkdayjobs.com", "vanderlande")]),

    ("moog",             "Moog Inc",                  "north_america", "United States",  "manufacturing",
     ["moog", "mooginc"],
     [("https://moog.wd5.myworkdayjobs.com", "moog"),
      ("https://moog.wd1.myworkdayjobs.com", "moog")]),

    ("thrivent",         "Thrivent",                  "north_america", "United States",  "finance",
     ["thrivent", "thriventfinancial"],
     [("https://thrivent.wd5.myworkdayjobs.com", "thrivent"),
      ("https://thrivent.wd1.myworkdayjobs.com", "thrivent")]),

    ("carilion",         "Carilion Clinic",           "north_america", "United States",  "healthcare",
     ["carilion", "carilionclinic", "ccrh"],
     [("https://carilion.wd5.myworkdayjobs.com", "carilion")]),

    ("doterra",          "doTERRA",                   "north_america", "United States",  "retail",
     ["doterra", "mydoterra"],
     [("https://doterra.wd5.myworkdayjobs.com", "doterra"),
      ("https://doterra.wd1.myworkdayjobs.com", "doterra")]),

    ("galderma",         "Galderma",                  "europe",        "Switzerland",    "healthcare",
     ["galderma", "galdermagroup"],
     [("https://galderma.wd3.myworkdayjobs.com", "galderma")]),

    ("nasdaq",           "Nasdaq",                    "north_america", "United States",  "finance",
     ["nasdaq", "nasdaqinc"],
     [("https://nasdaq.wd5.myworkdayjobs.com", "nasdaq"),
      ("https://nasdaq.wd1.myworkdayjobs.com", "nasdaq")]),

    ("bacardi",          "Bacardi",                   "north_america", "United States",  "retail",
     ["bacardi", "bacardilimited"],
     [("https://bacardi.wd3.myworkdayjobs.com", "bacardi")]),

    ("eversource",       "Eversource Energy",         "north_america", "United States",  "energy",
     ["eversource", "eversourceenergy"],
     [("https://eversource.wd5.myworkdayjobs.com", "eversource"),
      ("https://eversource.wd1.myworkdayjobs.com", "eversource")]),

    ("cooperstandard",   "Cooper-Standard",           "north_america", "United States",  "manufacturing",
     ["cooperstandard", "cooperstd", "cps"],
     [("https://cooperstandard.wd1.myworkdayjobs.com", "cooperstandard")]),

    ("heidelbergmaterials","Heidelberg Materials",    "europe",        "Germany",        "manufacturing",
     ["heidelbergmaterials", "heidelbergcement"],
     [("https://heidelbergmaterials.wd3.myworkdayjobs.com", "heidelbergmaterials")]),

    ("trendmicro",       "Trend Micro",               "asia_pacific",  "Japan",          "technology",
     ["trendmicro", "trendmicroinc"],
     [("https://trendmicro.wd3.myworkdayjobs.com", "trendmicro"),
      ("https://trendmicro.wd1.myworkdayjobs.com", "trendmicro")]),

    ("jotun",            "Jotun Group",               "europe",        "Norway",         "manufacturing",
     ["jotun", "jotungroup"],
     [("https://jotun.wd3.myworkdayjobs.com", "jotun")]),

    ("hntb",             "HNTB Corporation",          "north_america", "United States",  "consulting",
     ["hntb", "hntbcorp"],
     [("https://hntb.wd5.myworkdayjobs.com", "hntb"),
      ("https://hntb.wd1.myworkdayjobs.com", "hntb")]),

    ("hoganlovells",     "Hogan Lovells",             "north_america", "United States",  "consulting",
     ["hoganlovells", "hogan", "hoganlovellslaw"],
     [("https://hoganlovells.wd3.myworkdayjobs.com", "hoganlovells")]),

    ("csg",              "CSG",                       "north_america", "United States",  "technology",
     ["csg", "csgi", "csgsystems"],
     [("https://csg.wd5.myworkdayjobs.com", "csg"),
      ("https://csgi.wd1.myworkdayjobs.com", "csgi")]),

    ("countryfinancial", "Country Financial",         "north_america", "United States",  "finance",
     ["countryfinancial", "country", "ccmic"],
     [("https://countryfinancial.wd5.myworkdayjobs.com", "countryfinancial")]),

    ("blackstone",       "Blackstone",                "north_america", "United States",  "finance",
     ["blackstone", "blackstonegroup"],
     [("https://blackstone.wd1.myworkdayjobs.com", "blackstone"),
      ("https://blackstone.wd5.myworkdayjobs.com", "blackstone")]),

    ("conagra",          "ConAgra Brands",            "north_america", "United States",  "retail",
     ["conagra", "conagrabrands", "conagrafoods"],
     [("https://conagra.wd5.myworkdayjobs.com", "conagra"),
      ("https://conagrabrands.wd1.myworkdayjobs.com", "conagrabrands")]),

    ("organon",          "Organon",                   "north_america", "United States",  "healthcare",
     ["organon", "organonglobal"],
     [("https://organon.wd1.myworkdayjobs.com", "organon"),
      ("https://organon.wd5.myworkdayjobs.com", "organon")]),

    ("cna",              "CNA Insurance",             "north_america", "United States",  "finance",
     ["cna", "cnainsurance", "cnafi"],
     [("https://cna.wd5.myworkdayjobs.com", "cna"),
      ("https://cna.wd1.myworkdayjobs.com", "cna")]),

    ("gngroup",          "GN Group",                  "europe",        "Denmark",        "manufacturing",
     ["gn", "gngroup", "jabra", "gnstore"],
     [("https://gn.wd3.myworkdayjobs.com", "gn"),
      ("https://gngroup.wd3.myworkdayjobs.com", "gngroup")]),

    ("avangrid",         "AVANGRID",                  "north_america", "United States",  "energy",
     ["avangrid", "iberdrola"],
     [("https://avangrid.wd5.myworkdayjobs.com", "avangrid"),
      ("https://avangrid.wd1.myworkdayjobs.com", "avangrid")]),

    ("aristocrat",       "Aristocrat Leisure",        "asia_pacific",  "Australia",      "technology",
     ["aristocrat", "aristocratleisure"],
     [("https://aristocrat.wd3.myworkdayjobs.com", "aristocrat"),
      ("https://aristocrat.wd1.myworkdayjobs.com", "aristocrat")]),

    ("safelite",         "Safelite AutoGlass",        "north_america", "United States",  "retail",
     ["safelite", "safeliteautoglass"],
     [("https://safelite.wd5.myworkdayjobs.com", "safelite"),
      ("https://safelite.wd1.myworkdayjobs.com", "safelite")]),

    ("ringcentral",      "RingCentral",               "north_america", "United States",  "technology",
     ["ringcentral", "ringcentralinc"],
     [("https://ringcentral.wd5.myworkdayjobs.com", "ringcentral"),
      ("https://ringcentral.wd1.myworkdayjobs.com", "ringcentral")]),

    ("baptisthealth",    "Baptist Health",            "north_america", "United States",  "healthcare",
     ["baptisthealth", "baptisthealthcare"],
     [("https://baptisthealth.wd5.myworkdayjobs.com", "baptisthealth"),
      ("https://baptisthealth.wd1.myworkdayjobs.com", "baptisthealth")]),

    ("ipsen",            "Ipsen Group",               "europe",        "France",         "healthcare",
     ["ipsen", "ipsengroup"],
     [("https://ipsen.wd3.myworkdayjobs.com", "ipsen"),
      ("https://ipsen.wd1.myworkdayjobs.com", "ipsen")]),
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
            total = _post(base_url, tenant, site_id)
            if total is not None:
                return dict(key=key, name=name, region=region, country=country,
                            industry=industry, base_url=base_url, tenant=tenant,
                            site_id=site_id, total_jobs=total)

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
            entry = futures[future]
            name = entry[1]
            result = future.result()
            if result:
                hits.append(result)
                print(f"  [{done:3d}/{total}] OK   {name:<40} {result['total_jobs']:>6} jobs  ({result['base_url']})")
            else:
                misses.append(name)
                print(f"  [{done:3d}/{total}] MISS {name}")

    Path("scripts/workday_batch_results2.json").write_text(json.dumps(hits, indent=2), encoding="utf-8")
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
