import sys, time, asyncio
sys.path.insert(0, '.')
from PHASE1_JOB_SEARCH import UserPreferences, search_boards
from PHASE1_JOB_SEARCH.models import SearchFilters
from concurrent.futures import ProcessPoolExecutor
import multiprocessing as mp

_TITLE_EXPANSIONS = {
    'ai':  ['artificial intelligence', 'generative ai', 'genai'],
    'ml':  ['machine learning', 'deep learning', 'mlops'],
    'nlp': ['natural language processing', 'language model', 'llm'],
    'llm': ['large language model', 'language model'],
    'ds':  ['data science', 'data scientist'],
    'de':  ['data engineer', 'data engineering'],
}

def build_keywords(job_titles):
    _sf = SearchFilters(queries=job_titles)
    kws = set(_sf._title_include_keywords())
    expanded = set(kws)
    for kw in list(kws):
        expanded.update(_TITLE_EXPANSIONS.get(kw, []))
    for q in job_titles:
        expanded.add(q.lower().strip())
    return expanded

def run_search(user_id, job_titles, results_per_site=15):
    import sys, time
    sys.path.insert(0, '.')
    from PHASE1_JOB_SEARCH import UserPreferences, search_boards
    from PHASE1_JOB_SEARCH.models import SearchFilters
    t0 = time.time()
    prefs = UserPreferences(
        job_titles       = job_titles,
        locations        = ['Remote'],
        remote_ok        = True,
        experience_level = 'mid',
        hours_old        = 72,
        results_per_site = results_per_site,
    )
    keywords = build_keywords(job_titles)
    raw = search_boards(**prefs.to_jobspy_kwargs())
    kept = [j for j in raw if any(kw in (j.title or '').lower() for kw in keywords)]
    elapsed = time.time() - t0
    return user_id, job_titles, len(raw), len(kept), elapsed

if __name__ == '__main__':
    users = [
        ('user_A', ['machine learning engineer', 'ai engineer']),
        ('user_B', ['data engineer', 'data scientist']),
        ('user_C', ['nlp engineer', 'llm engineer']),
    ]

    print('Launching 3 concurrent user searches (spawn mode = Render safe)...')
    print()

    spawn_ctx = mp.get_context('spawn')
    with ProcessPoolExecutor(max_workers=3, mp_context=spawn_ctx) as pool:
        loop = asyncio.new_event_loop()
        async def run_all():
            futures = [
                loop.run_in_executor(pool, run_search, uid, titles, 15)
                for uid, titles in users
            ]
            return await asyncio.gather(*futures)
        results = loop.run_until_complete(run_all())
        loop.close()

    header = 'User       Roles                                         Raw  Kept    Time'
    print(header)
    print('-' * len(header))
    for uid, titles, raw, kept, elapsed in results:
        roles_str = str(titles)[:45]
        print(f'{uid:<10} {roles_str:<45} {raw:>4} {kept:>5} {elapsed:>7.1f}s')

    total_kept = sum(r[3] for r in results)
    all_got = all(r[3] > 0 for r in results)
    print()
    print(f'Total jobs: {total_kept}')
    print(f'All 3 users got results: {all_got}')
