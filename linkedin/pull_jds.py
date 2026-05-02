'''
pull_jds.py — Search LinkedIn via UI (same as runAiBot), apply filters,
go through each job card, extract JD from the right panel, save to Excel.
Does NOT apply to any jobs.
'''

import time, os, re, urllib.parse
import pandas as pd
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains

from config.secrets import username, password
from config.search import (
    search_terms, sort_by, date_posted, salary,
    experience_level, companies, job_type, on_site,
    location, easy_apply_only, title_keywords,
)

OUT_FILE = "all excels/pulled_jds.xlsx"

# ── Browser ───────────────────────────────────────────────────────────────────
bot_dir = os.path.join(os.path.expandvars("%LOCALAPPDATA%"), "Google", "Chrome", "LinkedInBotData")
options = Options()
options.add_argument("--no-first-run")
options.add_argument("--no-default-browser-check")
options.add_argument("--disable-popup-blocking")
options.add_argument("--disable-features=ProfilePickerOnStartupFeature,ChromeWhatsNewUI")
options.add_argument("--suppress-message-center-popups")
options.add_argument("--disable-default-apps")
options.add_argument(f"--user-data-dir={bot_dir}")
options.add_argument("--profile-directory=Default")

driver = webdriver.Chrome(options=options)
time.sleep(2)
try: driver.maximize_window()
except: pass
wait    = WebDriverWait(driver, 15)
actions = ActionChains(driver)

# ── Login ─────────────────────────────────────────────────────────────────────
driver.get("https://www.linkedin.com/feed/")
time.sleep(4)
if "login" in driver.current_url or "authwall" in driver.current_url:
    try:
        wait.until(EC.presence_of_element_located((By.ID, "username"))).send_keys(username)
        driver.find_element(By.ID, "password").send_keys(password)
        driver.find_element(By.XPATH, '//button[@type="submit"]').click()
        time.sleep(6)
        print("Logged in")
    except Exception as e:
        print(f"Login failed: {e}")
else:
    print("Already logged in")


# ── Helpers ───────────────────────────────────────────────────────────────────
def span_click(text, timeout=4):
    if not text: return False
    try:
        el = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.XPATH, f'.//span[normalize-space(.)="{text}"]'))
        )
        driver.execute_script('arguments[0].scrollIntoView({block:"center"});', el)
        el.click(); time.sleep(0.5)
        return True
    except: return False

def multi_click(texts):
    for text in texts:
        try:
            el = driver.find_element(By.XPATH, f'.//span[normalize-space(.)="{text}"]')
            driver.execute_script('arguments[0].scrollIntoView({block:"center"});', el)
            el.click(); time.sleep(0.4)
        except: pass

def dynamic_search(value, placeholder):
    try:
        span_click(placeholder, 2)
        inp = WebDriverWait(driver, 3).until(
            EC.presence_of_element_located((By.XPATH, f'(.//input[@placeholder="{placeholder}"])[1]'))
        )
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", inp)
        inp.send_keys(Keys.CONTROL + "a"); inp.send_keys(value)
        time.sleep(2)
        actions.send_keys(Keys.DOWN).perform()
        actions.send_keys(Keys.ENTER).perform()
        time.sleep(0.5)
    except: pass

def toggle(text):
    try:
        btn = driver.find_element(By.XPATH,
            f'//label[normalize-space()="{text}"]'
            f'|//*[contains(normalize-space(.), "{text}") and (@role="switch" or @type="checkbox")][1]'
        )
        driver.execute_script('arguments[0].scrollIntoView({block:"center"});', btn)
        if btn.tag_name == "label":
            driver.execute_script("arguments[0].click();", btn)
        elif not btn.is_selected():
            actions.move_to_element(btn).click().perform()
        time.sleep(0.5)
    except: pass


# ── Search via UI then navigate to jobs ───────────────────────────────────────
def navigate_to_jobs(search_term):
    try:
        search_bar = wait.until(EC.presence_of_element_located((By.XPATH,
            '//input[contains(@class,"search-global-typeahead__input")]'
        )))
        driver.execute_script("arguments[0].click();", search_bar)
        time.sleep(0.5)
        search_bar.send_keys(Keys.CONTROL + "a")
        search_bar.send_keys(search_term)
        time.sleep(0.5)
        search_bar.send_keys(Keys.ENTER)
        time.sleep(3)
    except Exception as e:
        print(f"  Search bar failed: {e}")
    kw = urllib.parse.quote_plus(search_term)
    driver.get(f"https://www.linkedin.com/jobs/search/?keywords={kw}")
    time.sleep(4)
    print(f"  Navigated to jobs for: '{search_term}'")


# ── Apply filters ─────────────────────────────────────────────────────────────
def apply_filters():
    try:
        driver.execute_script("window.scrollBy(0, 150);")
        time.sleep(0.5)
        btn = wait.until(EC.presence_of_element_located((By.XPATH, '//button[normalize-space()="All filters"]')))
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", btn)
        driver.execute_script("arguments[0].click();", btn)
        time.sleep(2)

        span_click(sort_by)
        span_click(date_posted)
        time.sleep(0.5)

        multi_click(experience_level)
        multi_click(companies)
        multi_click(job_type)
        multi_click(on_site)

        if easy_apply_only: toggle("Easy Apply")

        for loc in location:
            if not span_click(loc, 2): dynamic_search(loc, "Add a location")
        time.sleep(0.5)

        span_click(salary)

        # Show results
        show_btn = driver.find_element(By.XPATH,
            '//button[contains(translate(@aria-label,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"apply current filters to show")]'
        )
        driver.execute_script("arguments[0].click();", show_btn)
        time.sleep(4)
        print("  Filters applied")
    except Exception as e:
        print(f"  Filter error: {e}")


# ── Extract JD from right panel ───────────────────────────────────────────────
JD_SELECTORS = [
    (By.ID,         "job-details"),
    (By.CLASS_NAME, "jobs-description-content__text"),
    (By.CLASS_NAME, "jobs-box__html-content"),
    (By.CLASS_NAME, "jobs-description__content"),
    (By.CLASS_NAME, "job-details-about-the-job-module__description"),
    (By.XPATH,      '//div[@id="job-details"]'),
    (By.XPATH,      '//article[contains(@class,"jobs-description")]'),
    (By.XPATH,      '//*[contains(@class,"jobs-description-content")]'),
    (By.XPATH,      '//*[contains(@class,"job-details-about-the-job-module")]'),
]

def extract_jd():
    time.sleep(2)
    # Click "See more" to expand full JD if truncated
    for xpath in [
        '//button[contains(@aria-label,"see more")]',
        '//button[normalize-space()="See more"]',
        '//button[contains(@class,"inline-show-more-text__button") and not(contains(@class,"see-less"))]',
        '//button[contains(normalize-space(),"Show more")]',
    ]:
        try:
            btn = driver.find_element(By.XPATH, xpath)
            driver.execute_script("arguments[0].click();", btn)
            time.sleep(0.5)
            break
        except: pass

    for by, sel in JD_SELECTORS:
        try:
            el = WebDriverWait(driver, 5).until(EC.presence_of_element_located((by, sel)))
            # textContent captures hidden/truncated text (behind "show more") that .text misses
            text = driver.execute_script("return arguments[0].textContent;", el)
            if not text or len(text.strip()) < 80:
                text = el.text  # fallback to visible text
            text = text.strip() if text else ""
            # Clean up excessive whitespace from textContent
            text = re.sub(r'\n{3,}', '\n\n', re.sub(r'[ \t]+', ' ', text))
            if text and len(text) > 80:
                return text
        except: continue
    return ""


# ── Paginate and collect ──────────────────────────────────────────────────────
def collect_from_page(seen_ids):
    results = []
    try:
        wait.until(EC.presence_of_all_elements_located((By.XPATH, '//li[@data-occludable-job-id]')))
        time.sleep(3)

        # Pass 1: collect all card metadata while cards are visible (before any clicking)
        card_data = {}
        for card in driver.find_elements(By.XPATH, '//li[@data-occludable-job-id]'):
            jid = card.get_attribute("data-occludable-job-id") or ""
            if not jid or jid in seen_ids:
                continue
            title, company, link = "", "", ""
            try:
                raw = driver.execute_script("return arguments[0].textContent;", card.find_element(By.TAG_NAME, 'a')).strip()
                title = raw[:raw.find("\n")] if "\n" in raw else raw
            except: pass
            try:
                sub = driver.execute_script("return arguments[0].textContent;", card.find_element(By.CLASS_NAME, "artdeco-entity-lockup__subtitle")).strip()
                company = sub[:sub.find(" · ")] if " · " in sub else sub
            except: pass
            try: link = card.find_element(By.XPATH, './/a[contains(@href,"/jobs/view/")]').get_attribute("href").split("?")[0]
            except: pass
            card_data[jid] = {"title": title, "company": company, "link": link}

        print(f"  Found {len(card_data)} new card IDs on page")

        for job_id, meta in card_data.items():
            title   = meta["title"]
            company = meta["company"]
            link    = meta["link"]

            # Skip by title keyword filter — only skip if title was actually found
            if title and title_keywords and not any(kw.lower() in title.lower() for kw in title_keywords):
                print(f"    - Skipped (title filter): {title}")
                seen_ids.add(job_id)
                continue

            # Re-fetch card and click to load JD panel
            try:
                card = driver.find_element(By.XPATH, f'//li[@data-occludable-job-id="{job_id}"]')
            except:
                seen_ids.add(job_id)
                continue

            # JS click avoids stale intercept issues
            try:
                driver.execute_script("arguments[0].scrollIntoView({block:'center',behavior:'instant'});", card)
                driver.execute_script("arguments[0].click();", card)
                time.sleep(2)
            except: pass

            jd = extract_jd()
            seen_ids.add(job_id)

            results.append({
                "Job ID":   job_id,
                "Title":    title,
                "Company":  company,
                "Link":     link or f"https://www.linkedin.com/jobs/view/{job_id}",
                "JD":       jd,
                "Scraped":  datetime.now().strftime("%Y-%m-%d %H:%M"),
            })
            print(f"    + {title} | {company} ({len(jd)} chars)")
    except Exception as e:
        print(f"  Page collect error: {e}")
    return results


# ── Incremental Excel save ────────────────────────────────────────────────────
def _save_to_excel(results):
    if not results:
        return
    os.makedirs("all excels", exist_ok=True)
    df = pd.DataFrame(results)
    df.drop_duplicates(subset=["Job ID"], inplace=True)
    df.to_excel(OUT_FILE, index=False)
    print(f"  [Saved {len(df)} rows -> {OUT_FILE}]")


# ── Main ──────────────────────────────────────────────────────────────────────
all_results = []
seen_ids    = set()

for search_term in search_terms:
    print(f"\n{'-'*60}")
    print(f"Searching: '{search_term}'")
    print(f"{'-'*60}")

    navigate_to_jobs(search_term)
    apply_filters()

    page = 1
    while page <= 10:
        print(f"  Page {page}...")
        new = collect_from_page(seen_ids)
        all_results.extend(new)
        print(f"  -> {len(new)} new | total: {len(all_results)}")
        if new:
            _save_to_excel(all_results)  # Save after every page

        try:
            next_btn = driver.find_element(By.XPATH, '//button[@aria-label="View next page"]')
            if next_btn.is_enabled():
                driver.execute_script("arguments[0].scrollIntoView({block:'center'});", next_btn)
                next_btn.click(); time.sleep(3)
                page += 1
            else:
                break
        except: break

# ── Save to Excel ─────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"Total jobs collected: {len(all_results)}")


_save_to_excel(all_results)
if not all_results:
    print("No jobs collected.")

driver.quit()
