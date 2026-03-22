import sys, time, asyncio
sys.path.insert(0, '.')
from concurrent.futures import ProcessPoolExecutor
import multiprocessing as mp

_TITLE_EXPANSIONS = {
    'ai':  ['artificial intelligence', 'generative ai', 'genai'],
    'ml':  ['machine learning', 'deep learning', 'mlops'],
}

def build_keywords(job_titles):
    import sys; sys.path.insert(0, '.')
    from PHASE1_JOB_SEARCH.models import SearchFilters
    kws = set(SearchFilters(queries=job_titles)._title_include_keywords())
    expanded = set(kws)
    for kw in list(kws):
        expanded.update(_TITLE_EXPANSIONS.get(kw, []))
    for q in job_titles:
        expanded.add(q.lower().strip())
    return expanded

def run_boards(job_titles, countries):
    import sys, time; sys.path.insert(0, '.')
    from PHASE1_JOB_SEARCH import search_boards
    keywords = build_keywords(job_titles)
    all_raw, all_kept = [], []
    for title in job_titles:
        t0 = time.time()
        raw = search_boards(queries=[title], locations=['Remote'], results_per_site=20, hours_old=72, countries=countries)
        kept = [j for j in raw if any(kw in (j.title or '').lower() for kw in keywords)]
        print(f'  Board [{title}]: {len(raw)} raw -> {len(kept)} kept ({time.time()-t0:.1f}s)')
        all_raw.extend(raw)
        all_kept.extend(kept)
    return all_kept

def run_workday(job_titles):
    import sys, time; sys.path.insert(0, '.')
    from PHASE1_JOB_SEARCH import search_workday
    from PHASE1_JOB_SEARCH.workday_discovery import get_global_employers
    employers = get_global_employers(industries=['technology'])
    print(f'  Workday: {len(employers)} tech employers')
    t0 = time.time()
    results = search_workday(
        queries=job_titles,
        employers=employers,
        workers=16,
        request_timeout=5,
        fetch_details=True,
        max_jobs_per_employer=10,
    )
    has_desc = sum(1 for j in results if j.description and len(j.description) > 50)
    print(f'  Workday: {len(results)} jobs, {has_desc} with JD ({time.time()-t0:.1f}s)')
    return results

if __name__ == '__main__':
    roles    = ['ai engineer', 'ml engineer']
    countries = ['United States']

    print('=== PHASE A: Board Search (Indeed + LinkedIn) ===')
    t0 = time.time()
    board_jobs = run_boards(roles, countries)
    board_time = time.time() - t0
    print(f'Board total: {len(board_jobs)} jobs in {board_time:.1f}s')

    print()
    print('=== PHASE B: Workday Search ===')
    t0 = time.time()
    wd_jobs = run_workday(roles)
    wd_time = time.time() - t0

    # cross-dedup
    board_urls = {getattr(j,'job_url','') or getattr(j,'url','') for j in board_jobs}
    wd_new = [j for j in wd_jobs if (getattr(j,'job_url','') or getattr(j,'url','')) not in board_urls]
    print(f'Workday new (after dedup): {len(wd_new)} jobs in {wd_time:.1f}s')

    print()
    total = len(board_jobs) + len(wd_new)
    print(f'=== TOTAL: {total} unique jobs ===')
    print(f'  Boards : {len(board_jobs)}')
    print(f'  Workday: {len(wd_new)}')
    print(f'  Wall   : {board_time + wd_time:.1f}s')
