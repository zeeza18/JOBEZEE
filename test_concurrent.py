import sys, time, asyncio
sys.path.insert(0, '.')
from concurrent.futures import ProcessPoolExecutor
import multiprocessing as mp

_TITLE_EXPANSIONS = {
    'ai':  ['artificial intelligence', 'generative ai', 'genai'],
    'ml':  ['machine learning', 'deep learning', 'mlops'],
    'ds':  ['data science', 'data scientist'],
    'de':  ['data engineer', 'data engineering'],
    'swe': ['software engineer', 'software developer'],
}

def build_keywords(job_titles):
    import sys; sys.path.insert(0, '.')
    from PHASE1_JOB_SEARCH.models import SearchFilters
    _sf = SearchFilters(queries=job_titles)
    kws = set(_sf._title_include_keywords())
    expanded = set(kws)
    for kw in list(kws):
        expanded.update(_TITLE_EXPANSIONS.get(kw, []))
    for q in job_titles:
        expanded.add(q.lower().strip())
    return expanded

def run_search(user_id, job_titles, results_per_site=50):
    import sys, time, os; sys.path.insert(0, '.')
    from PHASE1_JOB_SEARCH import UserPreferences, search_boards
    start = time.time()
    pid = os.getpid()
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
    elapsed = time.time() - start
    return user_id, job_titles, len(raw), len(kept), elapsed, start, time.time(), pid

if __name__ == '__main__':
    users = [
        ('user_A', ['machine learning engineer', 'ai engineer']),
        ('user_B', ['data engineer', 'data scientist']),
        ('user_C', ['software engineer', 'backend engineer', 'python developer']),
    ]

    print('=== 3 CONCURRENT USERS (spawn, results_per_site=50) ===')
    print()

    wall_start = time.time()
    spawn_ctx = mp.get_context('spawn')
    with ProcessPoolExecutor(max_workers=3, mp_context=spawn_ctx) as pool:
        loop = asyncio.new_event_loop()
        async def run_all():
            futures = [
                loop.run_in_executor(pool, run_search, uid, titles, 50)
                for uid, titles in users
            ]
            return await asyncio.gather(*futures)
        results = loop.run_until_complete(run_all())
        loop.close()
    wall_end = time.time()

    # show timeline — prove overlap
    print('Timeline (all started within 1s of each other = truly parallel):')
    earliest = min(r[5] for r in results)
    for uid, titles, raw, kept, elapsed, start, end, pid in results:
        bar_start = int((start - earliest) * 2)
        bar_len   = max(1, int(elapsed * 0.5))
        bar = ' ' * bar_start + '#' * bar_len
        print(f'  {uid} [pid={pid}]  started+{start-earliest:.1f}s  ended+{end-earliest:.1f}s  |{bar}')

    print()
    header = 'User       Roles                                    Raw  Kept    Time'
    print(header)
    print('-' * len(header))
    for uid, titles, raw, kept, elapsed, *_ in results:
        roles_str = ', '.join(titles)[:40]
        print(f'{uid:<10} {roles_str:<40} {raw:>4} {kept:>5} {elapsed:>7.1f}s')

    total_kept = sum(r[3] for r in results)
    all_got    = all(r[3] > 0 for r in results)
    sum_time   = sum(r[4] for r in results)
    wall_time  = wall_end - wall_start

    print()
    print(f'Sum of individual times : {sum_time:.1f}s')
    print(f'Actual wall time        : {wall_time:.1f}s  ({"PARALLEL" if wall_time < sum_time * 0.7 else "SEQUENTIAL - CHECK"})')
    print(f'Total jobs              : {total_kept}')
    print(f'All users got results   : {all_got}')
