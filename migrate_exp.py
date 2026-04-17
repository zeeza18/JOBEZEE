import psycopg2, re
from psycopg2.extras import execute_values

db_url = "postgresql://neondb_owner:npg_dmxC5cyOnX6D@ep-ancient-snow-aik3fv7k.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"
conn = psycopg2.connect(db_url)
cur = conn.cursor()

# 1. Migration
cur.execute("ALTER TABLE job_listings ADD COLUMN IF NOT EXISTS exp_years_min INTEGER DEFAULT NULL")
conn.commit()
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='job_listings' AND column_name='exp_years_min'")
print("Column added:", cur.fetchone())


# 2. Extractor
def extract_exp_years(title, description):
    """
    Returns minimum years of experience from title or description.
    Checks title first (more reliable), then first 3000 chars of description.
    Returns None if not determinable.
    """
    for text in [title or "", (description or "")[:3000]]:
        t = text.lower()

        # 0-year keyword shortcuts — check before year patterns
        if any(kw in t for kw in ["intern", "internship", "apprentice", "co-op", "coop", "trainee"]):
            return 0

        # "entry level" / "entry-level" / "no experience required"
        if re.search(r"entry[\s-]level|no experience required|no prior experience", t):
            return 0

        # Ordered patterns (most specific first)
        patterns = [
            r"(\d+)\s*\+\s*years?\s*(?:of\s+)?(?:experience|exp\b)",     # 3+ years experience
            r"minimum\s+(?:of\s+)?(\d+)\s*years?",                         # minimum 3 years
            r"at\s+least\s+(\d+)\s*years?",                                 # at least 3 years
            r"(\d+)\s*[-\u2013]\s*\d+\s*years?\s*(?:of\s+)?(?:experience|exp\b)",  # 3-5 years exp
            r"(\d+)\s*years?\s*(?:of\s+)?(?:experience|exp\b|relevant|related|professional)",
        ]
        for pat in patterns:
            m = re.search(pat, t)
            if m:
                return int(m.group(1))

    return None


# 3. Backfill all existing jobs
print("Fetching all jobs for backfill...")
cur.execute("SELECT id, title, description FROM job_listings WHERE exp_years_min IS NULL")
rows = cur.fetchall()
print(f"Jobs to backfill: {len(rows)}")

updates = []
dist = {}
for job_id, title, desc in rows:
    yrs = extract_exp_years(title, desc)
    updates.append((yrs, str(job_id)))
    key = str(yrs) if yrs is not None else "null"
    dist[key] = dist.get(key, 0) + 1

# Batch update
for i in range(0, len(updates), 500):
    batch = updates[i:i+500]
    cur.executemany("UPDATE job_listings SET exp_years_min = %s WHERE id::text = %s", batch)
    conn.commit()

print(f"Backfill done. Distribution:")
for k in sorted(dist.keys(), key=lambda x: (x == "null", int(x) if x != "null" else 999)):
    print(f"  exp_years_min={k}: {dist[k]} jobs")

conn.close()
