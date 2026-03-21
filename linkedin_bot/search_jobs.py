'''
search_jobs.py — Search LinkedIn for jobs and pull JDs WITHOUT applying.

Cycles through date ranges and sort orders to collect maximum job coverage.
Output saved to: all excels/search_results.xlsx

Filters are driven by config/search.py (same as the main bot).
'''

import time, os, sys
import pandas as pd
from datetime import datetime
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# ── Config ────────────────────────────────────────────────────────────────────
from config.secrets  import username, password
from config.search   import (
    search_terms, search_location,
    sort_by        as cfg_sort_by,
    easy_apply_only,
    experience_level, companies, job_type, on_site,
    location, industry, job_function, job_titles,
    salary, benefits, commitments,
    under_10_applicants, in_your_network, fair_chance_employer,
    title_keywords,
)

# Date ranges to cycle through (most recent first for deduplication)
DATE_RANGES = ["Past 24 hours", "Past week", "Past month", "Any time"]
SORT_ORDERS = ["Most recent", "Most relevant"]

DATE_PARAM_MAP = {
    "Past 24 hours": "r86400",
    "Past week":     "r604800",
    "Past month":    "r2592000",
    "Any time":      "",
}
SORT_PARAM_MAP = {
    "Most recent":   "DD",
    "Most relevant": "R",
}

OUT_FILE = "all excels/search_results.xlsx"

# ── Browser ───────────────────────────────────────────────────────────────────
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

bot_dir = os.path.join(os.path.expandvars("%LOCALAPPDATA%"), "Google", "Chrome", "SearchBotProfile")

options = Options()
options.add_argument("--no-first-run")
options.add_argument("--no-default-browser-check")
options.add_argument("--disable-popup-blocking")
options.add_argument("--disable-features=ProfilePickerOnStartupFeature")
options.add_argument("--disable-features=ChromeWhatsNewUI")
options.add_argument("--suppress-message-center-popups")
options.add_argument("--disable-default-apps")
options.add_argument(f"--user-data-dir={bot_dir}")
options.add_argument("--profile-directory=Default")

from selenium.webdriver.common.action_chains import ActionChains

driver  = webdriver.Chrome(options=options)
driver.maximize_window()
wait    = WebDriverWait(driver, 15)
actions = ActionChains(driver)

# ── Helper: clickers ──────────────────────────────────────────────────────────
def _wait_span(text, timeout=5, click=True):
    if not text: return False
    try:
        el = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.XPATH, f'.//span[normalize-space(.)="{text}"]'))
        )
        _scroll(el)
        if click: el.click(); time.sleep(0.5)
        return el
    except: return False

def _scroll(el, top=False):
    driver.execute_script(
        'arguments[0].scrollIntoView({block:"center",behavior:"instant"});', el
    )

def _multi_sel(texts, use_search=False):
    for text in texts:
        try:
            el = driver.find_element(By.XPATH, f'.//span[normalize-space(.)="{text}"]')
            _scroll(el); el.click(); time.sleep(0.4)
        except:
            if use_search:
                _dynamic_search(text, "Add a company")

def _dynamic_search(value, placeholder):
    try:
        _wait_span(placeholder, 2)
        inp = driver.find_element(By.XPATH, f'(.//input[@placeholder="{placeholder}"])[1]')
        inp.send_keys(Keys.CONTROL + "a"); inp.send_keys(value)
        time.sleep(2.5)
        actions.send_keys(Keys.DOWN).perform(); actions.send_keys(Keys.ENTER).perform()
        time.sleep(0.5)
    except: pass

def _bool_toggle(text):
    try:
        btn = driver.find_element(By.XPATH,
            f'//*[contains(normalize-space(.), "{text}") and (@role="switch" or @type="checkbox")][1]'
            f'|//label[contains(normalize-space(.), "{text}")]/preceding-sibling::input[@role="switch"][1]'
            f'|//label[contains(normalize-space(.), "{text}")]/following-sibling::input[@role="switch"][1]'
        )
        _scroll(btn)
        if not btn.is_selected():
            actions.move_to_element(btn).click().perform(); time.sleep(0.4)
    except: pass

# ── Login ──────────────────────────────────────────────────────────────────────
driver.get("https://www.linkedin.com/login")
time.sleep(4)
if "login" in driver.current_url or "authwall" in driver.current_url:
    try:
        wait.until(EC.presence_of_element_located((By.ID, "username"))).send_keys(username)
        driver.find_element(By.ID, "password").send_keys(password)
        driver.find_element(By.XPATH, '//button[@type="submit"]').click()
        time.sleep(6)
        print("Logged in successfully")
    except Exception as e:
        print(f"Login failed: {e}. Continuing...")
else:
    print("Already logged in")

# ── JD extraction ──────────────────────────────────────────────────────────────
JD_SELECTORS = [
    (By.ID,        "job-details"),
    (By.CLASS_NAME,"jobs-description-content__text"),
    (By.CLASS_NAME,"jobs-box__html-content"),
    (By.CLASS_NAME,"jobs-description__content"),
    (By.XPATH,     '//div[@id="job-details"]'),
    (By.XPATH,     '//article[contains(@class,"jobs-description")]'),
    (By.XPATH,     '//*[contains(@class,"jobs-description-content")]'),
    (By.XPATH,     '//*[contains(@class,"jobs-description")]'),
]

def extract_jd_from_panel():
    '''Try to extract JD from the right-side details panel on the search results page.'''
    time.sleep(2)
    for by, sel in JD_SELECTORS:
        try:
            el = WebDriverWait(driver, 4).until(EC.presence_of_element_located((by, sel)))
            text = el.text.strip()
            if text and len(text) > 80:
                return text
        except: continue
    return "JD not found"

# ── Apply All Filters modal ────────────────────────────────────────────────────
def apply_all_filters(date_range: str, sort_order: str):
    '''Open All Filters modal and apply every configured filter.'''
    try:
        btn = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, '//button[normalize-space()="All filters"]'))
        )
        btn.click(); time.sleep(1.5)

        # Sort
        _wait_span(sort_order)
        # Date posted
        _wait_span(date_range)
        time.sleep(0.5)

        # Experience level
        _multi_sel(experience_level)
        # Companies
        _multi_sel(companies, use_search=True)
        if experience_level or companies: time.sleep(0.8)

        # Job type
        _multi_sel(job_type)
        # On-site / Remote / Hybrid
        _multi_sel(on_site)
        if job_type or on_site: time.sleep(0.8)

        # Easy Apply — always ON
        _bool_toggle("Easy Apply")

        # Location
        for loc in location:
            _dynamic_search(loc, "Add a location") if not _wait_span(loc, 2) else None
        # Industry
        for ind in industry:
            _dynamic_search(ind, "Add an industry") if not _wait_span(ind, 2) else None
        if location or industry: time.sleep(0.8)

        # Job function
        for fn in job_function:
            _dynamic_search(fn, "Add a job function") if not _wait_span(fn, 2) else None
        # Title
        for title in job_titles:
            _dynamic_search(title, "Add a title")
        if job_function or job_titles: time.sleep(0.8)

        # Toggles
        if under_10_applicants: _bool_toggle("Under 10 applicants")
        if in_your_network:     _bool_toggle("In your network")
        if fair_chance_employer:_bool_toggle("Fair Chance Employer")

        # Salary
        _wait_span(salary)
        time.sleep(0.5)

        # Benefits / Commitments
        _multi_sel(benefits)
        _multi_sel(commitments)
        if benefits or commitments: time.sleep(0.8)

        # Show results
        show_btn = driver.find_element(By.XPATH,
            '//button[contains(translate(@aria-label,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"apply current filters to show")]'
        )
        show_btn.click(); time.sleep(2)
        print(f"  Filters applied: sort={sort_order}, date={date_range}")

    except Exception as e:
        print(f"  Filter application error: {e}")
        # Try to close modal if open
        try: driver.find_element(By.XPATH, '//button[@aria-label="Dismiss"]').click()
        except: pass

# ── Collect jobs from current page ────────────────────────────────────────────
def collect_jobs_from_page(seen_ids: set) -> list[dict]:
    jobs = []
    try:
        job_cards = driver.find_elements(By.XPATH, '//li[contains(@class,"jobs-search-results__list-item")]')
        for card in job_cards:
            try:
                job_id = card.get_attribute("data-occludable-job-id") or card.get_attribute("data-job-id") or ""
                if not job_id:
                    try:
                        link_el = card.find_element(By.XPATH, './/a[contains(@href,"/jobs/view/")]')
                        href = link_el.get_attribute("href") or ""
                        job_id = href.split("/jobs/view/")[-1].split("?")[0].split("/")[0]
                    except: pass

                if not job_id or job_id in seen_ids:
                    continue

                # Click card to load details panel
                try:
                    driver.execute_script("arguments[0].scrollIntoView({block:'center',behavior:'instant'});", card)
                    card.click(); time.sleep(2)
                except: pass

                title, company, link = "", "", ""
                try:
                    title = card.find_element(By.XPATH, './/a[contains(@class,"job-card-list__title") or contains(@class,"job-card-container__link")]').text.strip()
                except:
                    try: title = card.find_element(By.XPATH, './/strong').text.strip()
                    except: pass
                try:
                    company = card.find_element(By.XPATH, './/span[contains(@class,"job-card-container__primary-description") or contains(@class,"artdeco-entity-lockup__subtitle")]').text.strip()
                except: pass
                try:
                    link_el = card.find_element(By.XPATH, './/a[contains(@href,"/jobs/view/")]')
                    link = link_el.get_attribute("href").split("?")[0]
                except: pass

                # Apply title_keywords filter
                if title_keywords and not any(kw.lower() in title.lower() for kw in title_keywords):
                    seen_ids.add(job_id)
                    continue

                jd = extract_jd_from_panel()
                seen_ids.add(job_id)

                jobs.append({
                    "Job ID":   job_id,
                    "Title":    title,
                    "Company":  company,
                    "Link":     link or f"https://www.linkedin.com/jobs/view/{job_id}",
                    "JD":       jd,
                    "Scraped":  datetime.now().strftime("%Y-%m-%d %H:%M"),
                })
            except Exception as e:
                print(f"    Card error: {e}")
    except Exception as e:
        print(f"  Page error: {e}")
    return jobs

# ── Main search loop ───────────────────────────────────────────────────────────
all_results = []
seen_ids    = set()

for search_term in search_terms:
    for sort_order in SORT_ORDERS:
        for date_range in DATE_RANGES:
            print(f"\n{'─'*60}")
            print(f"Search: '{search_term}'  |  Sort: {sort_order}  |  Date: {date_range}")
            print(f"{'─'*60}")

            # Build search URL with URL-level filters for speed
            easy_param  = "&f_LF=f_AL" if easy_apply_only else ""
            date_param  = DATE_PARAM_MAP.get(date_range, "")
            sort_param  = SORT_PARAM_MAP.get(sort_order, "DD")
            date_qs     = f"&f_TPR={date_param}" if date_param else ""

            import urllib.parse
            kw = urllib.parse.quote_plus(search_term)
            url = f"https://www.linkedin.com/jobs/search/?keywords={kw}{easy_param}{date_qs}&sortBy={sort_param}"

            driver.get(url)
            time.sleep(3)

            # Apply remaining filters via All Filters modal
            apply_all_filters(date_range, sort_order)

            # Paginate through results
            page = 1
            while True:
                print(f"  Page {page} ...", end=" ", flush=True)
                new_jobs = collect_jobs_from_page(seen_ids)
                all_results.extend(new_jobs)
                print(f"{len(new_jobs)} new jobs  (total: {len(all_results)})")

                # Next page
                try:
                    next_btn = driver.find_element(By.XPATH, '//button[@aria-label="View next page"]')
                    if next_btn.is_enabled():
                        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", next_btn)
                        next_btn.click(); time.sleep(3)
                        page += 1
                    else:
                        break
                except:
                    break

                if page > 10:   # safety cap — LinkedIn rarely shows >10 pages
                    break

# ── Save results ──────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"Total unique jobs collected: {len(all_results)}")

if all_results:
    df = pd.DataFrame(all_results)
    df.drop_duplicates(subset=["Job ID"], inplace=True)
    df.to_excel(OUT_FILE, index=False)
    print(f"Saved to: {OUT_FILE}")
else:
    print("No jobs collected.")

driver.quit()
