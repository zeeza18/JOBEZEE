"""
workday_autodiscovery.py
========================
Connects to the Neon DB, finds any Workday company names in job_listings
that are NOT already in workday_discovery.py's GLOBAL_EMPLOYERS, and prints
them as candidate entries ready to test + add.

Run any time after a crawl cycle to find new companies to register.
"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DB = "postgresql+asyncpg://neondb_owner:npg_dmxC5cyOnX6D@ep-ancient-snow-aik3fv7k.c-4.us-east-1.aws.neon.tech/neondb?ssl=require"

# Companies already registered (name strings — keep in sync with workday_discovery.py)
REGISTERED_NAMES = {
    "TD Bank", "CIBC", "RBC", "BMO", "Manulife", "Sun Life Financial",
    "Desjardins", "Intact Financial", "Aviva Canada", "TMX Group", "Brookfield Asset Management",
    "FIS Global", "Mastercard", "PayPal", "CPP Investments", "OMERS", "Ontario Teachers",
    "PSP Investments", "CDPQ", "HOOPP", "AIMCo",
    "NVIDIA", "Salesforce", "Workday", "Adobe", "Cisco", "Intel", "Motorola Solutions",
    "Thomson Reuters", "Moderna", "BlackBerry", "Ciena", "CrowdStrike", "HP",
    "Northrop Grumman", "RTX (Raytheon Technologies)", "Accenture", "Kyndryl", "PwC", "BDO",
    "Morgan Stanley", "Capital One", "Capital Group", "Santander",
    "Comcast", "Johnson Controls", "Argonne National Laboratory", "Mars", "Tempus AI",
    "Disney", "Walmart", "Danaher", "JLL", "CVS Health",
    "Humana", "Cigna", "Pfizer",
    "TELUS International", "TELUS Health",
    "Boeing (Engineering)", "Boeing (Manufacturing)", "Lockheed Martin",
    "Qualcomm", "Applied Materials",
    "Illinois Tool Works", "Leidos", "Travelers Insurance",
    "Enbridge", "Magna International", "CAE", "Canadian Solar",
    "Target", "Canadian Tire",
    "LSEG (London Stock Exchange Group)", "Lloyds Banking Group", "Smith+Nephew",
    "Lloyd's of London",
    "Commonwealth Bank of Australia", "Westpac New Zealand", "Westpac Australia",
    "National Australia Bank", "Telstra",
    "Samsung Electronics", "AIA Group", "MUFG (Mitsubishi UFJ)",
    "Rakuten Viki", "Tencent",
}

async def run():
    engine = create_async_engine(DB)
    async with engine.connect() as c:
        r = await c.execute(text("""
            SELECT DISTINCT company, COUNT(*) as cnt
            FROM job_listings
            WHERE source = 'workday'
            GROUP BY company
            ORDER BY cnt DESC
        """))
        rows = list(r)

    print(f"Total unique Workday companies in DB: {len(rows)}")
    new_ones = [(name, cnt) for name, cnt in rows if name not in REGISTERED_NAMES]

    if not new_ones:
        print("All Workday companies in DB are already registered. Nothing new to add.")
        return

    print(f"\nNEW companies not yet in registry ({len(new_ones)}):")
    print("-" * 60)
    for name, cnt in new_ones:
        print(f"  {cnt:4d} jobs  {name}")

    print("\nTo add these, find their Workday tenant + site_id and add to workday_discovery_remote.py")

asyncio.run(run())
