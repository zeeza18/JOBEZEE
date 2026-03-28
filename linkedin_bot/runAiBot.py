import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
print("[Bot] runAiBot.py started", flush=True)

# Imports
import os
import sys
import csv
import re
import time
try:
    import pyautogui
except (Exception, SystemExit):
    pyautogui = None
import pandas as pd

# Set CSV field size limit to prevent field size errors
csv.field_size_limit(1000000)  # Set to 1MB instead of default 131KB

from random import choice, shuffle, randint
from datetime import datetime

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support.select import Select
from selenium.webdriver.remote.webelement import WebElement
from selenium.common.exceptions import NoSuchElementException, ElementClickInterceptedException, NoSuchWindowException, ElementNotInteractableException, WebDriverException

from config.personals import *
from config.questions import *
from config.search import *
from config.secrets import use_AI, username, password
from config.settings import *
from config.settings import tailor_resume, jobezee_root

print("[Bot] importing open_chrome (starts Chrome)...", flush=True)
from modules.open_chrome import *
print("[Bot] Chrome session ready", flush=True)
from modules.helpers import *

# Hide Selenium automation fingerprint BEFORE any LinkedIn navigation
try:
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": (
            "Object.defineProperty(navigator,'webdriver',{get:()=>undefined});"
            "window.chrome=window.chrome||{runtime:{}};"
        )
    })
    print_lg("[Bot] Stealth: navigator.webdriver hidden from PerimeterX")
except Exception as _se:
    print_lg(f"[Bot] Stealth patch skipped: {_se}")
from modules.clickers_and_finders import *
from modules.validator import validate_config

if use_AI:
    from modules.ai.openaiConnections import ai_create_openai_client, ai_answer_question, ai_close_openai_client

from typing import Literal


if pyautogui: pyautogui.FAILSAFE = False
# if use_resume_generator:    from resume_generator import is_logged_in_GPT, login_GPT, open_resume_chat, create_custom_resume


#< Global Variables and logics

if run_in_background == True:
    pause_at_failed_question = False
    pause_before_submit = False
    run_non_stop = False

first_name = first_name.strip()
middle_name = middle_name.strip()
last_name = last_name.strip()
full_name = first_name + " " + middle_name + " " + last_name if middle_name else first_name + " " + last_name

useNewResume = True
randomly_answered_questions = set()

tabs_count = 1
easy_applied_count = 0
external_jobs_count = 0
failed_count = 0
skip_count = 0
dailyEasyApplyLimitReached = False

re_experience = re.compile(r'[(]?\s*(\d+)\s*[)]?\s*[-to]*\s*\d*[+]*\s*year[s]?', re.IGNORECASE)

desired_salary_lakhs = str(round(desired_salary / 100000, 2))
desired_salary_monthly = str(round(desired_salary/12, 2))
desired_salary = str(desired_salary)

current_ctc_lakhs = str(round(current_ctc / 100000, 2))
current_ctc_monthly = str(round(current_ctc/12, 2))
current_ctc = str(current_ctc)

notice_period_months = str(notice_period//30)
notice_period_weeks = str(notice_period//7)
notice_period = str(notice_period)

aiClient = None
about_company_for_ai = None # TODO extract about company for AI

#>


#< Login Functions

def _solve_captcha_2captcha(page_url: str) -> tuple:
    """
    Detect CAPTCHA type (hCaptcha or reCAPTCHA v2) on the current page,
    submit to 2captcha and return (token, captcha_type) or ("", "").
    LinkedIn checkpoints use hCaptcha — tries that first.
    """
    api_key = os.environ.get("TWOCAPTCHA_API_KEY", "").strip()
    if not api_key:
        print_lg("[CAPTCHA] TWOCAPTCHA_API_KEY not set — skipping auto-solve")
        return "", ""
    try:
        import requests as _req
    except ImportError:
        print_lg("[CAPTCHA] requests package not available")
        return "", ""
    try:
        import re as _re
        time.sleep(4)  # let page fully render before searching

        # LinkedIn known sitekeys
        LI_HCAPTCHA_KEY  = "13257c76-22d2-4002-ab59-b3e350e4dbef"
        LI_RECAPTCHA_KEY = "6LdaGNMUAAAAAGBs7OAlhz6PBZ6PYfLkCMQGFbMV"

        def _find_sitekey_and_type():
            src = driver.page_source

            # 1. hCaptcha element
            for attr in ["data-sitekey", "data-site-key"]:
                try:
                    el = driver.find_element(By.XPATH, f'//div[@class and contains(@class,"h-captcha")]//*[@{attr}] | //*[contains(@class,"h-captcha") and @{attr}]')
                    sk = el.get_attribute(attr)
                    if sk: return sk, "hcaptcha"
                except Exception:
                    pass

            # 2. hCaptcha in page source
            for pat in [r'hcaptcha\.com/[^"\']*["\']sitekey["\']\s*:\s*["\']([^"\']+)["\']',
                        r'data-sitekey=["\']([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})["\']']:
                m = _re.search(pat, src)
                if m: return m.group(1), "hcaptcha"

            # 3. reCAPTCHA element attributes
            for attr in ["data-sitekey", "data-site-key"]:
                try:
                    el = driver.find_element(By.XPATH, f'//*[@{attr}]')
                    sk = el.get_attribute(attr)
                    if sk: return sk, "recaptcha"
                except Exception:
                    pass

            # 4. reCAPTCHA in page source
            for pat in [r'data-sitekey=["\']([^"\']+)["\']',
                        r'["\']sitekey["\']\s*:\s*["\']([^"\']+)["\']',
                        r'grecaptcha\.render\([^)]*["\']([^"\']{20,})["\']']:
                m = _re.search(pat, src)
                if m: return m.group(1), "recaptcha"

            # 5. reCAPTCHA iframe src — sitekey is in URL param ?k=
            for iframe in driver.find_elements(By.TAG_NAME, "iframe"):
                try:
                    src_attr = iframe.get_attribute("src") or ""
                    is_hc = "hcaptcha.com" in src_attr
                    is_rc = "recaptcha" in src_attr or "google.com/recaptcha" in src_attr
                    # reCAPTCHA sitekey lives in the iframe src as ?k=SITEKEY
                    if is_rc:
                        m = _re.search(r'[?&]k=([^&]+)', src_attr)
                        if m:
                            return m.group(1), "recaptcha"
                    # hCaptcha sitekey in iframe src as ?sitekey=
                    if is_hc:
                        m = _re.search(r'[?&]sitekey=([^&]+)', src_attr)
                        if m:
                            return m.group(1), "hcaptcha"
                    # Fall through to DOM inspection inside the iframe
                    driver.switch_to.frame(iframe)
                    for attr in ["data-sitekey", "data-site-key"]:
                        try:
                            el = driver.find_element(By.XPATH, f'//*[@{attr}]')
                            sk = el.get_attribute(attr)
                            if sk:
                                driver.switch_to.default_content()
                                return sk, "hcaptcha" if is_hc else "recaptcha"
                        except Exception:
                            pass
                    isrc = driver.page_source
                    m = _re.search(r'data-sitekey=["\']([^"\']+)["\']', isrc)
                    if m:
                        driver.switch_to.default_content()
                        return m.group(1), "hcaptcha" if is_hc else "recaptcha"
                    driver.switch_to.default_content()
                except Exception:
                    driver.switch_to.default_content()

            # 6. LinkedIn known fallback — checkpoint reCAPTCHA v2
            if "linkedin.com/checkpoint" in page_url:
                print_lg("[CAPTCHA] Using LinkedIn known reCAPTCHA sitekey as fallback")
                return LI_RECAPTCHA_KEY, "recaptcha"

            return None, None

        sitekey, captcha_type = _find_sitekey_and_type()
        if not sitekey:
            print_lg("[CAPTCHA] Could not find CAPTCHA sitekey on page")
            return "", ""

        print_lg(f"[CAPTCHA] Detected {captcha_type}, sitekey={sitekey[:16]}… — submitting to 2captcha")

        if captcha_type == "hcaptcha":
            post_data = {
                "key":     api_key,
                "method":  "hcaptcha",
                "sitekey": sitekey,
                "pageurl": page_url,
                "json":    1,
            }
        else:
            post_data = {
                "key":        api_key,
                "method":     "userrecaptcha",
                "googlekey":  sitekey,
                "pageurl":    page_url,
                "enterprise": 1,   # LinkedIn uses reCAPTCHA Enterprise
                "json":       1,
            }

        resp = _req.post("https://2captcha.com/in.php", data=post_data, timeout=30).json()

        if resp.get("status") != 1:
            print_lg(f"[CAPTCHA] 2captcha rejected submission: {resp}")
            return "", ""

        captcha_id = resp["request"]
        print_lg(f"[CAPTCHA] Waiting for 2captcha to solve (id={captcha_id})...")
        for _ in range(36):   # poll up to 180 s (hcaptcha can be slower)
            time.sleep(5)
            res = _req.get("https://2captcha.com/res.php", params={
                "key":    api_key,
                "action": "get",
                "id":     captcha_id,
                "json":   1,
            }, timeout=10).json()
            if res.get("status") == 1:
                print_lg("[CAPTCHA] Solved!")
                return res["request"], captcha_type
            if res.get("request") not in ("CAPCHA_NOT_READY", "CAPTCHA_NOT_READY"):
                print_lg(f"[CAPTCHA] 2captcha error: {res}")
                return "", ""
            print_lg("[CAPTCHA] Still solving...")
        print_lg("[CAPTCHA] Timed out waiting for 2captcha")
        return "", ""
    except Exception as e:
        print_lg(f"[CAPTCHA] Solver error: {e}")
        return "", ""

# keep old name as alias so nothing else breaks
def _solve_recaptcha_2captcha(page_url: str) -> str:
    token, _ = _solve_captcha_2captcha(page_url)
    return token


def _inject_captcha_token(token: str, captcha_type: str = "recaptcha") -> None:
    """Inject a solved CAPTCHA token into the page and submit the form."""
    try:
        if captcha_type == "hcaptcha":
            driver.execute_script("""
                var areas = document.querySelectorAll(
                    "textarea[name='h-captcha-response'], [name='h-captcha-response']");
                for (var a of areas) { a.innerHTML = arguments[0]; a.value = arguments[0]; }
                document.querySelectorAll("form").forEach(function(f) {
                    var inp = f.querySelector("[name='h-captcha-response']");
                    if (inp) { try { f.submit(); } catch(e) {} }
                });
            """, token)
        else:
            # 1. Fill all g-recaptcha-response textareas (including hidden ones)
            # 2. Fire the grecaptcha callback so LinkedIn's JS validation passes
            # 3. Submit the form
            driver.execute_script("""
                var token = arguments[0];
                // Fill textarea
                document.querySelectorAll(
                    "textarea[name='g-recaptcha-response'], #g-recaptcha-response"
                ).forEach(function(el) {
                    el.innerHTML = token;
                    el.value     = token;
                    el.dispatchEvent(new Event('change', {bubbles: true}));
                });
                // Fire grecaptcha callback — this is what tells LinkedIn the checkbox passed
                try {
                    var cfg = window.___grecaptcha_cfg;
                    if (cfg && cfg.clients) {
                        Object.values(cfg.clients).forEach(function(client) {
                            function findAndCall(obj, depth) {
                                if (!obj || typeof obj !== 'object' || depth > 5) return;
                                if (typeof obj.callback === 'function') {
                                    try { obj.callback(token); } catch(e) {}
                                    return;
                                }
                                Object.values(obj).forEach(function(v) { findAndCall(v, depth+1); });
                            }
                            findAndCall(client, 0);
                        });
                    }
                } catch(e) {}
                // Also try data-callback attribute
                try {
                    var el = document.querySelector('[data-callback]');
                    if (el) {
                        var cbName = el.getAttribute('data-callback');
                        if (cbName && typeof window[cbName] === 'function') window[cbName](token);
                    }
                } catch(e) {}
            """, token)
            import time as _time; _time.sleep(1)
            try:
                driver.find_element(By.XPATH, '//button[@type="submit"]').click()
            except Exception:
                driver.execute_script("var f = document.querySelector('form'); if(f) f.submit();")
        print_lg("[CAPTCHA] Token injected and form submitted")
    except Exception as e:
        print_lg(f"[CAPTCHA] Token injection error: {e}")


def _inject_recaptcha_token(token: str) -> None:
    """Backward-compat alias."""
    _inject_captcha_token(token, "recaptcha")


def is_logged_in_LN() -> bool:
    '''
    Function to check if user is logged-in in LinkedIn
    * Returns: `True` if user is logged-in or `False` if not
    '''
    if driver.current_url == "https://www.linkedin.com/feed/": return True
    if try_linkText(driver, "Sign in"): return False
    if try_xp(driver, '//button[@type="submit" and contains(text(), "Sign in")]'):  return False
    if try_linkText(driver, "Join now"): return False
    print_lg("Didn't find Sign in link, so assuming user is logged in!")
    return True


def login_LN() -> None:
    '''
    Function to login for LinkedIn
    * Tries to login using given `username` and `password` from `secrets.py`
    * If failed, tries to login using saved LinkedIn profile button if available
    * If both failed, asks user to login manually
    '''
    # Find the username and password fields and fill them with user credentials
    driver.get("https://www.linkedin.com/login")
    if username == "username@example.com" and password == "example_password":
        print_lg("[WARNING] Username/password not configured — please login manually!")
        manual_login_retry(is_logged_in_LN, 2)
        return
    try:
        wait.until(EC.presence_of_element_located((By.LINK_TEXT, "Forgot password?")))
        try:
            text_input_by_ID(driver, "username", username, 1)
        except Exception as e:
            print_lg("Couldn't find username field.")
            # print_lg(e)
        try:
            text_input_by_ID(driver, "password", password, 1)
        except Exception as e:
            print_lg("Couldn't find password field.")
            # print_lg(e)
        # Find the login submit button and click it
        driver.find_element(By.XPATH, '//button[@type="submit" and contains(text(), "Sign in")]').click()
    except Exception as e1:
        try:
            profile_button = find_by_class(driver, "profile__details")
            profile_button.click()
        except Exception as e2:
            # print_lg(e1, e2)
            print_lg("Couldn't Login!")

    # ── Captcha / checkpoint handling ─────────────────────────────────────────
    time.sleep(3)
    _cur = driver.current_url
    _checkpoint_hit = "checkpoint" in _cur or "captcha" in _cur.lower() or "challenge" in _cur
    if _checkpoint_hit:
        print_lg(f"[CAPTCHA] Checkpoint detected at: {_cur}")
        _solved = False
        for _attempt in range(3):
            _token, _ctype = _solve_captcha_2captcha(driver.current_url)
            if not _token:
                print_lg("[CAPTCHA] Could not auto-solve — will attempt manual login retry")
                break
            _inject_captcha_token(_token, _ctype)
            time.sleep(4)
            # Dismiss any blocking error dialogs (e.g. "Something went wrong")
            try:
                _ok_btn = driver.find_element(By.XPATH,
                    '//button[normalize-space()="OK" or normalize-space()="Dismiss" or normalize-space()="Close"]')
                _ok_btn.click()
                print_lg("[CAPTCHA] Dismissed error dialog")
                time.sleep(2)
            except Exception:
                pass
            _now = driver.current_url
            if "checkpoint" not in _now and "challenge" not in _now:
                print_lg("[CAPTCHA] Passed checkpoint!")
                _solved = True
                break
            print_lg(f"[CAPTCHA] Still on checkpoint after attempt {_attempt + 1}, retrying…")
            time.sleep(2)
        if not _solved:
            print_lg("[CAPTCHA] All CAPTCHA attempts failed — waiting for manual login")

    try:
        from selenium.webdriver.support.ui import WebDriverWait as _WDW
        _login_wait = _WDW(driver, 150 if _checkpoint_hit else 30)
        _login_wait.until(EC.url_to_be("https://www.linkedin.com/feed/"))
        return print_lg("Login successful!")
    except Exception as e:
        print_lg("Seems like login attempt failed! Possibly due to wrong credentials or already logged in! Try logging in manually!")
        manual_login_retry(is_logged_in_LN, 2)
#>



def get_applied_job_ids() -> set[str]:
    '''
    Function to get a `set` of applied job's Job IDs
    * Returns a set of Job IDs from existing applied jobs history csv file
    '''
    job_ids: set[str] = set()
    try:
        with open(file_name, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            for row in reader:
                job_ids.add(row[0])
    except FileNotFoundError:
        print_lg(f"The CSV file '{file_name}' does not exist.")
    return job_ids



def search_jobs_via_ui(search_term: str) -> None:
    '''
    LinkedIn job search:
      1. Navigate to LinkedIn feed, type in typeahead search bar (human-like)
      2. Immediately navigate to the canonical jobs search URL — guarantees
         the filter bar ("All filters") is always present on the next step.
    '''
    import urllib.parse as _up
    jobs_url = f"https://www.linkedin.com/jobs/search/?keywords={_up.quote(search_term)}&refresh=true"

    # Step 1 — go to feed and type in the search bar (visible, human-like)
    try:
        driver.get("https://www.linkedin.com/feed/")
        buffer(4)
        search_input = None
        for selector in [
            (By.CSS_SELECTOR, '[data-testid="typeahead-input"]'),
            (By.CSS_SELECTOR, 'input.search-global-typeahead__input'),
            (By.XPATH,        '//input[contains(@class,"search-global-typeahead__input")]'),
        ]:
            try:
                search_input = WebDriverWait(driver, 6).until(
                    EC.element_to_be_clickable(selector)
                )
                break
            except Exception:
                pass
        if search_input:
            search_input.click()
            buffer(0.5)
            search_input.send_keys(Keys.CONTROL + "a")
            search_input.send_keys(search_term)
            buffer(0.5)
            search_input.send_keys(Keys.RETURN)
            buffer(2)
            print_lg(f'[Search] Typed "{search_term}" in LinkedIn search bar')
        else:
            print_lg('[Search] Typeahead not found on feed — skipping to direct URL')
    except Exception as _e:
        print_lg(f'[Search] Feed step error: {_e}')

    # Step 2 — always land on the canonical jobs URL so "All filters" is present
    print_lg(f'[Search] Navigating to Jobs search URL for: "{search_term}"')
    driver.get(jobs_url)
    buffer(4)
    print_lg(f'[Search] Ready — URL: {driver.current_url}')


def set_search_location() -> None:
    '''
    Function to set search location
    '''
    if search_location.strip():
        try:
            print_lg(f'Setting search location as: "{search_location.strip()}"')
            search_location_ele = try_xp(driver, ".//input[@aria-label='City, state, or zip code'and not(@disabled)]", False) #  and not(@aria-hidden='true')]")
            text_input(actions, search_location_ele, search_location, "Search Location")
        except ElementNotInteractableException:
            try_xp(driver, ".//label[@class='jobs-search-box__input-icon jobs-search-box__keywords-label']")
            actions.send_keys(Keys.TAB, Keys.TAB).perform()
            actions.key_down(Keys.CONTROL).send_keys("a").key_up(Keys.CONTROL).perform()
            actions.send_keys(search_location.strip()).perform()
            sleep(2)
            actions.send_keys(Keys.ENTER).perform()
            try_xp(driver, ".//button[@aria-label='Cancel']")
        except Exception as e:
            try_xp(driver, ".//button[@aria-label='Cancel']")
            print_lg("Failed to update search location, continuing with default location!", e)


def apply_filters() -> None:
    '''
    Function to apply job search filters
    '''
    set_search_location()

    try:
        recommended_wait = 1 if click_gap < 1 else 0

        # Scroll down slightly so nav bar doesn't intercept the filters bar
        driver.execute_script("window.scrollBy(0, 150);")
        buffer(0.5)

        # JS click bypasses interception from sticky nav bar (same as reference)
        print_lg('[Filters] Looking for "All filters" button...')
        all_filters_btn = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.XPATH, '//button[normalize-space()="All filters"]'))
        )
        print_lg('[Filters] Found "All filters" — clicking...')
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", all_filters_btn)
        driver.execute_script("arguments[0].click();", all_filters_btn)
        buffer(recommended_wait)

        wait_span_click(driver, sort_by)
        wait_span_click(driver, date_posted)
        buffer(recommended_wait)

        multi_sel_noWait(driver, experience_level)
        multi_sel_noWait(driver, companies, actions)
        if experience_level or companies: buffer(recommended_wait)

        multi_sel_noWait(driver, job_type)
        multi_sel_noWait(driver, on_site)
        if job_type or on_site: buffer(recommended_wait)

        if easy_apply_only: boolean_button_click(driver, actions, "Easy Apply")

        for loc in location:
            if not wait_span_click(driver, loc, 2):
                dynamic_filter_search(driver, actions, loc, "Add a location")
        if location: buffer(recommended_wait)

        if under_10_applicants: boolean_button_click(driver, actions, "Under 10 applicants")
        if in_your_network: boolean_button_click(driver, actions, "In your network")
        if fair_chance_employer: boolean_button_click(driver, actions, "Fair Chance Employer")

        wait_span_click(driver, salary)
        buffer(recommended_wait)

        multi_sel_noWait(driver, benefits)
        multi_sel_noWait(driver, commitments)
        if benefits or commitments: buffer(recommended_wait)

        show_results_button: WebElement = driver.find_element(By.XPATH, '//button[contains(translate(@aria-label, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "apply current filters to show")]')
        show_results_button.click()
        print_lg('[Filters] Filters applied — Show results clicked')

    except Exception as e:
        print_lg(f"Setting the preferences failed! {e}")



def get_page_info() -> tuple[WebElement | None, int | None]:
    '''
    Function to get pagination element and current page number
    '''
    try:
        pagination_element = try_find_by_classes(driver, ["jobs-search-pagination__pages", "artdeco-pagination", "artdeco-pagination__pages"])
        scroll_to_view(driver, pagination_element)
        current_page = int(pagination_element.find_element(By.XPATH, "//button[contains(@class, 'active')]").text)
    except Exception as e:
        print_lg("Failed to find Pagination element, hence couldn't scroll till end!")
        pagination_element = None
        current_page = None
        print_lg(e)
    return pagination_element, current_page



def get_job_main_details(job: WebElement, blacklisted_companies: set, rejected_jobs: set) -> tuple[str, str, str, str, str, bool]:
    '''
    # Function to get job main details.
    Returns a tuple of (job_id, title, company, work_location, work_style, skip)
    * job_id: Job ID
    * title: Job title
    * company: Company name
    * work_location: Work location of this job
    * work_style: Work style of this job (Remote, On-site, Hybrid)
    * skip: A boolean flag to skip this job
    '''
    skip = False
    job_details_button = job.find_element(By.TAG_NAME, 'a')  # job.find_element(By.CLASS_NAME, "job-card-list__title")  # Problem in India
    scroll_to_view(driver, job_details_button, True)
    job_id = job.get_dom_attribute('data-occludable-job-id')
    title = job_details_button.text
    title = title[:title.find("\n")]
    # company = job.find_element(By.CLASS_NAME, "job-card-container__primary-description").text
    # work_location = job.find_element(By.CLASS_NAME, "job-card-container__metadata-item").text
    other_details = job.find_element(By.CLASS_NAME, 'artdeco-entity-lockup__subtitle').text
    index = other_details.find(' · ')
    company = other_details[:index]
    work_location = other_details[index+3:]
    work_style = work_location[work_location.rfind('(')+1:work_location.rfind(')')]
    work_location = work_location[:work_location.rfind('(')].strip()
    
    # Skip if title doesn't contain any required keyword
    if title_keywords and not any(kw.lower() in title.lower() for kw in title_keywords):
        print_lg(f'Skipping "{title} | {company}" — title doesn\'t match AI keywords. Job ID: {job_id}!')
        return (job_id, title, company, work_location, work_style, True)

    # Skip if previously rejected due to blacklist or already applied
    if company in blacklisted_companies:
        print_lg(f'Skipping "{title} | {company}" job (Blacklisted Company). Job ID: {job_id}!')
        skip = True
    elif job_id in rejected_jobs: 
        print_lg(f'Skipping previously rejected "{title} | {company}" job. Job ID: {job_id}!')
        skip = True
    try:
        if job.find_element(By.CLASS_NAME, "job-card-container__footer-job-state").text == "Applied":
            skip = True
            print_lg(f'Already applied to "{title} | {company}" job. Job ID: {job_id}!')
    except: pass
    try: 
        if not skip: job_details_button.click()
    except Exception as e:
        print_lg(f'Failed to click "{title} | {company}" job on details button. Job ID: {job_id}!') 
        # print_lg(e)
        discard_job()
        job_details_button.click() # To pass the error outside
    buffer(click_gap)
    return (job_id,title,company,work_location,work_style,skip)


# Function to check for Blacklisted words in About Company
def check_blacklist(rejected_jobs: set, job_id: str, company: str, blacklisted_companies: set) -> tuple[set, set, WebElement] | ValueError:
    jobs_top_card = try_find_by_classes(driver, ["job-details-jobs-unified-top-card__primary-description-container","job-details-jobs-unified-top-card__primary-description","jobs-unified-top-card__primary-description","jobs-details__main-content"])
    about_company_org = find_by_class(driver, "jobs-company__box")
    scroll_to_view(driver, about_company_org)
    about_company_org = about_company_org.text
    about_company = about_company_org.lower()
    skip_checking = False
    for word in about_company_good_words:
        if word.lower() in about_company:
            print_lg(f'Found the word "{word}". So, skipped checking for blacklist words.')
            skip_checking = True
            break
    if not skip_checking:
        for word in about_company_bad_words: 
            if word.lower() in about_company: 
                rejected_jobs.add(job_id)
                blacklisted_companies.add(company)
                raise ValueError(f'\n"{about_company_org}"\n\nContains "{word}".')
    buffer(click_gap)
    scroll_to_view(driver, jobs_top_card)
    return rejected_jobs, blacklisted_companies, jobs_top_card



# Function to extract years of experience required from About Job
def extract_years_of_experience(text: str) -> int:
    # Extract all patterns like '10+ years', '5 years', '3-5 years', etc.
    matches = re.findall(re_experience, text)
    if len(matches) == 0: 
        print_lg(f'\n{text}\n\nCouldn\'t find experience requirement in About the Job!')
        return 0
    return max([int(match) for match in matches if int(match) <= 12])



def get_job_description(
) -> tuple[
    str | Literal['Unknown'],
    int | Literal['Unknown'],
    bool,
    str | None,
    str | None
    ]:
    '''
    # Job Description
    Function to extract job description from About the Job.
    ### Returns:
    - `jobDescription: str | 'Unknown'`
    - `experience_required: int | 'Unknown'`
    - `skip: bool`
    - `skipReason: str | None`
    - `skipMessage: str | None`
    '''
    try:
        jobDescription = "Unknown"
        experience_required = "Unknown"
        found_masters = 0
        skip = False
        skipReason = None
        skipMessage = None
        # Click "See more" to expand truncated JDs before extracting
        _see_more_clicked = False
        for _xpath in [
            '//button[contains(@aria-label,"see more")]',
            '//button[normalize-space()="See more"]',
            '//button[contains(@class,"inline-show-more-text__button") and not(contains(@class,"see-less"))]',
        ]:
            try:
                _btn = driver.find_element(By.XPATH, _xpath)
                driver.execute_script("arguments[0].click();", _btn)
                time.sleep(0.5)
                _see_more_clicked = True
                break
            except: pass
        print_lg(f"[JD] Expanding full description: {'yes' if _see_more_clicked else 'already expanded'}")

        # Try multiple selectors — use textContent to capture hidden/truncated text
        _jd_classes = ["jobs-box__html-content", "jobs-description-content__text",
                       "jobs-description__content", "jobs-description",
                       "job-details-about-the-job-module__description"]
        try:
            _el = driver.find_element(By.ID, "job-details")
            jobDescription = driver.execute_script("return arguments[0].textContent;", _el) or _el.text
        except:
            try:
                _el = try_find_by_classes(driver, _jd_classes)
                jobDescription = driver.execute_script("return arguments[0].textContent;", _el) or _el.text
            except:
                _el = driver.find_element(By.XPATH, '//article[contains(@class,"jobs-description")]')
                jobDescription = driver.execute_script("return arguments[0].textContent;", _el) or _el.text
        # Clean up whitespace from textContent
        jobDescription = re.sub(r'\n{3,}', '\n\n', re.sub(r'[ \t]+', ' ', jobDescription)).strip()
        print_lg(f"[JD] Pulled -- {len(jobDescription)} chars")
        jobDescriptionLow = jobDescription.lower()
        for word in bad_words:
            if word.lower() in jobDescriptionLow:
                skipMessage = f'\n{jobDescription}\n\nContains bad word "{word}". Skipping this job!\n'
                skipReason = "Found a Bad Word in About Job"
                skip = True
                print_lg(f'[JD] FAILED -- bad word: "{word}"')
                break
        if not skip and security_clearance == False and ('polygraph' in jobDescriptionLow or 'clearance' in jobDescriptionLow or 'secret' in jobDescriptionLow):
            skipMessage = f'\n{jobDescription}\n\nFound "Clearance" or "Polygraph". Skipping this job!\n'
            skipReason = "Asking for Security clearance"
            skip = True
            print_lg("[JD] FAILED -- requires security clearance")
        if not skip:
            if did_masters and 'master' in jobDescriptionLow:
                print_lg(f'Found the word "master" in \n{jobDescription}')
                found_masters = 2
            experience_required = extract_years_of_experience(jobDescription)
            if current_experience > -1 and experience_required > current_experience + found_masters:
                skipMessage = f'\n{jobDescription}\n\nExperience required {experience_required} > Current Experience {current_experience + found_masters}. Skipping this job!\n'
                skipReason = "Required experience is high"
                skip = True
                print_lg(f"[JD] FAILED -- needs {experience_required} yrs, you have {current_experience + found_masters}")
        if not skip:
            print_lg(f"[JD] PASSED -- experience required: {experience_required if experience_required != 'Unknown' else 'not specified'}")
    except Exception as e:
        if jobDescription == "Unknown":
            print_lg("[JD] FAILED -- could not extract job description")
        else:
            experience_required = "Error in extraction"
            print_lg("[JD] Pulled OK but experience extraction failed")
            # print_lg(e)
    return jobDescription, experience_required, skip, skipReason, skipMessage
        


# Function to upload resume
def upload_resume(modal: WebElement, resume: str) -> tuple[bool, str]:
    try:
        modal.find_element(By.NAME, "file").send_keys(os.path.abspath(resume))
        return True, os.path.basename(default_resume_path)
    except: return False, "Previous resume"

# Function to answer common questions for Easy Apply
def answer_common_questions(label: str, answer: str) -> str:
    if 'sponsorship' in label or 'visa' in label: answer = require_visa
    return answer


# Function to answer the questions for Easy Apply
def answer_questions(modal: WebElement, questions_list: set, work_location: str, job_description: str | None = None ) -> set:
    # Get all questions from the page
     
    all_questions = modal.find_elements(By.XPATH, ".//div[@data-test-form-element]")
    # all_questions = modal.find_elements(By.CLASS_NAME, "jobs-easy-apply-form-element")
    # all_list_questions = modal.find_elements(By.XPATH, ".//div[@data-test-text-entity-list-form-component]")
    # all_single_line_questions = modal.find_elements(By.XPATH, ".//div[@data-test-single-line-text-form-component]")
    # all_questions = all_questions + all_list_questions + all_single_line_questions

    for Question in all_questions:
        # Check if it's a select Question
        select = try_xp(Question, ".//select", False)
        if select:
            label_org = "Unknown"
            try:
                label = Question.find_element(By.TAG_NAME, "label")
                label_org = label.find_element(By.TAG_NAME, "span").text
            except: pass
            answer = 'Yes'
            label = label_org.lower()
            select = Select(select)
            selected_option = select.first_selected_option.text
            optionsText = []
            options = '"List of phone country codes"'
            if label != "phone country code":
                optionsText = [option.text for option in select.options]
                options = "".join([f' "{option}",' for option in optionsText])
            prev_answer = selected_option
            if overwrite_previous_answers or selected_option == "Select an option":
                if 'email' in label or 'phone' in label: 
                    answer = prev_answer
                elif 'gender' in label or 'sex' in label: 
                    answer = gender
                elif 'disability' in label: 
                    answer = disability_status
                elif 'proficiency' in label: 
                    answer = 'Professional'
                # Add location handling
                elif any(loc_word in label for loc_word in ['location', 'city', 'state', 'country']):
                    if 'country' in label:
                        answer = country 
                    elif 'state' in label:
                        answer = state
                    elif 'city' in label:
                        answer = current_city if current_city else work_location
                    else:
                        answer = work_location
                else: 
                    answer = answer_common_questions(label,answer)
                try: 
                    select.select_by_visible_text(answer)
                except NoSuchElementException as e:
                    # Define similar phrases for common answers
                    possible_answer_phrases = []
                    if answer == 'Decline':
                        possible_answer_phrases = ["Decline", "not wish", "don't wish", "Prefer not", "not want"]
                    elif 'yes' in answer.lower():
                        possible_answer_phrases = ["Yes", "Agree", "I do", "I have"]
                    elif 'no' in answer.lower():
                        possible_answer_phrases = ["No", "Disagree", "I don't", "I do not"]
                    else:
                        # Try partial matching for any answer
                        possible_answer_phrases = [answer]
                        # Add lowercase and uppercase variants
                        possible_answer_phrases.append(answer.lower())
                        possible_answer_phrases.append(answer.upper())
                        # Try without special characters
                        possible_answer_phrases.append(''.join(c for c in answer if c.isalnum()))
                    foundOption = False
                    for phrase in possible_answer_phrases:
                        for option in optionsText:
                            # Check if phrase is in option or option is in phrase (bidirectional matching)
                            if phrase.lower() in option.lower() or option.lower() in phrase.lower():
                                select.select_by_visible_text(option)
                                answer = option
                                foundOption = True
                                break
                    if not foundOption:
                        #TODO: Use AI to answer the question need to be implemented logic to extract the options for the question
                        print_lg(f'Failed to find an option with text "{answer}" for question labelled "{label_org}", answering randomly!')
                        select.select_by_index(randint(1, len(select.options)-1))
                        answer = select.first_selected_option.text
                        randomly_answered_questions.add((f'{label_org} [ {options} ]',"select"))
            questions_list.add((f'{label_org} [ {options} ]', answer, "select", prev_answer))
            continue
        
        # Check if it's a radio Question
        radio = try_xp(Question, './/fieldset[@data-test-form-builder-radio-button-form-component="true"]', False)
        if radio:
            prev_answer = None
            label = try_xp(radio, './/span[@data-test-form-builder-radio-button-form-component__title]', False)
            try: label = find_by_class(label, "visually-hidden", 2.0)
            except: pass
            label_org = label.text if label else "Unknown"
            answer = 'Yes'
            label = label_org.lower()

            label_org += ' [ '
            options = radio.find_elements(By.TAG_NAME, 'input')
            options_labels = []
            
            for option in options:
                id = option.get_attribute("id")
                option_label = try_xp(radio, f'.//label[@for="{id}"]', False)
                options_labels.append( f'"{option_label.text if option_label else "Unknown"}"<{option.get_attribute("value")}>' ) # Saving option as "label <value>"
                if option.is_selected(): prev_answer = options_labels[-1]
                label_org += f' {options_labels[-1]},'

            if overwrite_previous_answers or prev_answer is None:
                if 'citizenship' in label or 'employment eligibility' in label: answer = us_citizenship
                elif 'veteran' in label or 'protected' in label: answer = veteran_status
                elif 'disability' in label or 'handicapped' in label: 
                    answer = disability_status
                else: answer = answer_common_questions(label,answer)
                foundOption = try_xp(radio, f".//label[normalize-space()='{answer}']", False)
                if foundOption: 
                    actions.move_to_element(foundOption).click().perform()
                else:    
                    possible_answer_phrases = ["Decline", "not wish", "don't wish", "Prefer not", "not want"] if answer == 'Decline' else [answer]
                    ele = options[0]
                    answer = options_labels[0]
                    for phrase in possible_answer_phrases:
                        for i, option_label in enumerate(options_labels):
                            if phrase in option_label:
                                foundOption = options[i]
                                ele = foundOption
                                answer = f'Decline ({option_label})' if len(possible_answer_phrases) > 1 else option_label
                                break
                        if foundOption: break
                    # if answer == 'Decline':
                    #     answer = options_labels[0]
                    #     for phrase in ["Prefer not", "not want", "not wish"]:
                    #         foundOption = try_xp(radio, f".//label[normalize-space()='{phrase}']", False)
                    #         if foundOption:
                    #             answer = f'Decline ({phrase})'
                    #             ele = foundOption
                    #             break
                    actions.move_to_element(ele).click().perform()
                    if not foundOption: randomly_answered_questions.add((f'{label_org} ]',"radio"))
            else: answer = prev_answer
            questions_list.add((label_org+" ]", answer, "radio", prev_answer))
            continue
        
        # Check if it's a text question
        text = try_xp(Question, ".//input[@type='text']", False)
        if text: 
            do_actions = False
            label = try_xp(Question, ".//label[@for]", False)
            try: label = label.find_element(By.CLASS_NAME,'visually-hidden')
            except: pass
            label_org = label.text if label else "Unknown"
            answer = "" # years_of_experience
            label = label_org.lower()

            prev_answer = text.get_attribute("value")
            if not prev_answer or overwrite_previous_answers:
                if 'experience' in label or 'years' in label: answer = years_of_experience
                elif 'phone' in label or 'mobile' in label: answer = phone_number
                elif 'street' in label: answer = street
                elif 'city' in label or 'location' in label or 'address' in label:
                    answer = current_city if current_city else work_location
                    do_actions = True
                elif 'signature' in label: answer = full_name # 'signature' in label or 'legal name' in label or 'your name' in label or 'full name' in label: answer = full_name     # What if question is 'name of the city or university you attend, name of referral etc?'
                elif 'name' in label:
                    if 'full' in label: answer = full_name
                    elif 'first' in label and 'last' not in label: answer = first_name
                    elif 'middle' in label and 'last' not in label: answer = middle_name
                    elif 'last' in label and 'first' not in label: answer = last_name
                    elif 'employer' in label: answer = recent_employer
                    else: answer = full_name
                elif 'notice' in label:
                    if 'month' in label:
                        answer = notice_period_months
                    elif 'week' in label:
                        answer = notice_period_weeks
                    else: answer = notice_period
                elif 'salary' in label or 'compensation' in label or 'ctc' in label or 'pay' in label: 
                    if 'current' in label or 'present' in label:
                        if 'month' in label:
                            answer = current_ctc_monthly
                        elif 'lakh' in label:
                            answer = current_ctc_lakhs
                        else:
                            answer = current_ctc
                    else:
                        if 'month' in label:
                            answer = desired_salary_monthly
                        elif 'lakh' in label:
                            answer = desired_salary_lakhs
                        else:
                            answer = desired_salary
                elif 'linkedin' in label: answer = linkedIn
                elif 'website' in label or 'blog' in label or 'portfolio' in label or 'link' in label: answer = website
                elif 'scale of 1-10' in label: answer = confidence_level
                elif 'headline' in label: answer = linkedin_headline
                elif ('hear' in label or 'come across' in label) and 'this' in label and ('job' in label or 'position' in label): answer = "LinkedIn"
                elif 'state' in label or 'province' in label: answer = state
                elif 'zip' in label or 'postal' in label or 'code' in label: answer = zipcode
                elif 'country' in label: answer = country
                else: answer = answer_common_questions(label,answer)
                if answer == "":
                    if use_AI and aiClient:
                        try:
                            answer = ai_answer_question(aiClient, label_org, question_type="text", job_description=job_description, user_information_all=user_information_all)
                            if answer and isinstance(answer, str) and len(answer) > 0:
                                print_lg(f'[AI] Answered: "{label_org[:60]}"')
                            else:
                                randomly_answered_questions.add((label_org, "text"))
                                answer = years_of_experience
                        except Exception as e:
                            print_lg("Failed to get AI answer!", e)
                            randomly_answered_questions.add((label_org, "text"))
                            answer = years_of_experience
                    else:
                        randomly_answered_questions.add((label_org, "text"))
                        answer = years_of_experience
                text.clear()
                text.send_keys(answer)
                if do_actions:
                    sleep(2)
                    actions.send_keys(Keys.ARROW_DOWN)
                    actions.send_keys(Keys.ENTER).perform()
            questions_list.add((label, text.get_attribute("value"), "text", prev_answer))
            continue

        # Check if it's a textarea question
        text_area = try_xp(Question, ".//textarea", False)
        if text_area:
            label = try_xp(Question, ".//label[@for]", False)
            label_org = label.text if label else "Unknown"
            label = label_org.lower()
            answer = ""
            prev_answer = text_area.get_attribute("value")
            if not prev_answer or overwrite_previous_answers:
                if 'summary' in label: answer = linkedin_summary
                elif 'cover' in label: answer = cover_letter
                if answer == "":
                    if use_AI and aiClient:
                        try:
                            answer = ai_answer_question(aiClient, label_org, question_type="textarea", job_description=job_description, user_information_all=user_information_all)
                            if answer and isinstance(answer, str) and len(answer) > 0:
                                print_lg(f'[AI] Answered: "{label_org[:60]}"')
                            else:
                                randomly_answered_questions.add((label_org, "textarea"))
                                answer = ""
                        except Exception as e:
                            print_lg("Failed to get AI answer!", e)
                            randomly_answered_questions.add((label_org, "textarea"))
                            answer = ""
                    else:
                        randomly_answered_questions.add((label_org, "textarea"))
            text_area.clear()
            text_area.send_keys(answer)
            if do_actions:
                    sleep(2)
                    actions.send_keys(Keys.ARROW_DOWN)
                    actions.send_keys(Keys.ENTER).perform()
            questions_list.add((label, text_area.get_attribute("value"), "textarea", prev_answer))
            continue

        # Check if it's a checkbox question
        checkbox = try_xp(Question, ".//input[@type='checkbox']", False)
        if checkbox:
            label = try_xp(Question, ".//span[@class='visually-hidden']", False)
            label_org = label.text if label else "Unknown"
            label = label_org.lower()
            answer = try_xp(Question, ".//label[@for]", False)  # Sometimes multiple checkboxes are given for 1 question, Not accounted for that yet
            answer = answer.text if answer else "Unknown"
            prev_answer = checkbox.is_selected()
            checked = prev_answer
            if not prev_answer:
                try:
                    actions.move_to_element(checkbox).click().perform()
                    checked = True
                except Exception as e: 
                    print_lg("Checkbox click failed!", e)
                    pass
            questions_list.add((f'{label} ([X] {answer})', checked, "checkbox", prev_answer))
            continue


    # Select todays date
    try_xp(driver, "//button[contains(@aria-label, 'This is today')]")

    # Collect important skills
    # if 'do you have' in label and 'experience' in label and ' in ' in label -> Get word (skill) after ' in ' from label
    # if 'how many years of experience do you have in ' in label -> Get word (skill) after ' in '

    return questions_list




def external_apply(pagination_element: WebElement, job_id: str, job_link: str, resume: str, date_listed, application_link: str, screenshot_name: str) -> tuple[bool, str, int]:
    '''
    Function to open new tab and save external job application links
    '''
    global tabs_count, dailyEasyApplyLimitReached
    if easy_apply_only:
        try:
            if "exceeded the daily application limit" in driver.find_element(By.CLASS_NAME, "artdeco-inline-feedback__message").text: dailyEasyApplyLimitReached = True
        except: pass
        print_lg("Easy apply failed I guess!")
        if pagination_element != None: return True, application_link, tabs_count
    try:
        wait.until(EC.element_to_be_clickable((By.XPATH, ".//button[contains(@class,'jobs-apply-button') and contains(@class, 'artdeco-button--3')]"))).click() # './/button[contains(span, "Apply") and not(span[contains(@class, "disabled")])]'
        wait_span_click(driver, "Continue", 1, True, False)
        windows = driver.window_handles
        tabs_count = len(windows)
        driver.switch_to.window(windows[-1])
        application_link = driver.current_url
        print_lg('Got the external application link "{}"'.format(application_link))
        if close_tabs and driver.current_window_handle != linkedIn_tab: driver.close()
        driver.switch_to.window(linkedIn_tab)
        return False, application_link, tabs_count
    except Exception as e:
        # print_lg(e)
        print_lg("Failed to apply!")
        failed_job(job_id, job_link, resume, date_listed, "Probably didn't find Apply button or unable to switch tabs.", e, application_link, screenshot_name)
        global failed_count
        failed_count += 1
        return True, application_link, tabs_count



def follow_company(modal: WebDriver = driver) -> None:
    '''
    Function to follow or un-follow easy applied companies based om `follow_companies`
    '''
    try:
        follow_checkbox_input = try_xp(modal, ".//input[@id='follow-company-checkbox' and @type='checkbox']", False)
        if follow_checkbox_input and follow_checkbox_input.is_selected() != follow_companies:
            try_xp(modal, ".//label[@for='follow-company-checkbox']")
    except Exception as e:
        print_lg("Failed to update follow companies checkbox!", e)
    


#< Failed attempts logging
def failed_job(job_id: str, job_link: str, resume: str, date_listed, error: str, exception: Exception, application_link: str, screenshot_name: str) -> None:
    '''
    Function to update failed jobs list in excel
    '''
    try:
        with open(failed_file_name, 'a', newline='', encoding='utf-8') as file:
            fieldnames = ['Job ID', 'Job Link', 'Resume Tried', 'Date listed', 'Date Tried', 'Assumed Reason', 'Stack Trace', 'External Job link', 'Screenshot Name']
            writer = csv.DictWriter(file, fieldnames=fieldnames)
            if file.tell() == 0: writer.writeheader()
            writer.writerow({'Job ID':truncate_for_csv(job_id), 'Job Link':truncate_for_csv(job_link), 'Resume Tried':truncate_for_csv(resume), 'Date listed':truncate_for_csv(date_listed), 'Date Tried':datetime.now(), 'Assumed Reason':truncate_for_csv(error), 'Stack Trace':truncate_for_csv(exception), 'External Job link':truncate_for_csv(application_link), 'Screenshot Name':truncate_for_csv(screenshot_name)})
            file.close()
    except Exception as e:
        print_lg("Failed to update failed jobs list!", e)
        print_lg("[ERROR] Failed to update failed jobs excel — file may be open or permission denied.")


def screenshot(driver: WebDriver, job_id: str, failedAt: str) -> str:
    '''
    Function to to take screenshot for debugging
    - Returns screenshot name as String
    '''
    screenshot_name = "{} - {} - {}.png".format( job_id, failedAt, str(datetime.now()) )
    path = logs_folder_path+"/screenshots/"+screenshot_name.replace(":",".")
    # special_chars = {'*', '"', '\\', '<', '>', ':', '|', '?'}
    # for char in special_chars:  path = path.replace(char, '-')
    driver.save_screenshot(path.replace("//","/"))
    return screenshot_name
#>



def submitted_jobs(job_id: str, title: str, company: str, work_location: str, work_style: str, description: str, experience_required: int | Literal['Unknown', 'Error in extraction'], 
                   skills: list[str] | Literal['In Development'], hr_name: str | Literal['Unknown'], hr_link: str | Literal['Unknown'], resume: str, 
                   reposted: bool, date_listed: datetime | Literal['Unknown'], date_applied:  datetime | Literal['Pending'], job_link: str, application_link: str, 
                   questions_list: set | None, connect_request: Literal['In Development']) -> None:
    '''
    Function to create or update the Applied jobs CSV file, once the application is submitted successfully
    '''
    row = {
        'Job ID': job_id, 'Title': title, 'Company': company,
        'Work Location': work_location, 'Work Style': work_style,
        'About Job': description, 'Experience required': experience_required,
        'Skills required': str(skills), 'HR Name': hr_name, 'HR Link': hr_link,
        'Resume': resume, 'Re-posted': reposted, 'Date Posted': str(date_listed),
        'Date Applied': str(date_applied), 'Job Link': job_link,
        'External Job link': application_link, 'Questions Found': str(questions_list),
        'Connect Request': connect_request,
    }
    # Save to CSV
    try:
        with open(file_name, mode='a', newline='', encoding='utf-8') as csv_file:
            fieldnames = list(row.keys())
            writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
            if csv_file.tell() == 0: writer.writeheader()
            writer.writerow({k: truncate_for_csv(v) for k, v in row.items()})
    except Exception as e:
        print_lg("Failed to update submitted jobs CSV!", e)
        print_lg("[ERROR] Failed to update applied jobs CSV — file may be open or permission denied.")
    # Save to Excel
    try:
        excel_path = "all excels/applied_jobs.xlsx"
        os.makedirs("all excels", exist_ok=True)
        if os.path.exists(excel_path):
            df = pd.read_excel(excel_path)
            df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
        else:
            df = pd.DataFrame([row])
        df.to_excel(excel_path, index=False)
    except Exception as e:
        print_lg("Failed to update applied jobs Excel!", e)



# Function to discard the job application
def discard_job() -> None:
    """Close the Easy Apply modal — try multiple fallbacks so a stuck modal never crashes Chrome."""
    try:
        actions.send_keys(Keys.ESCAPE).perform()
        buffer(0.5)
    except Exception:
        pass
    # Try "Discard" span click first (normal LinkedIn confirm dialog)
    if not wait_span_click(driver, 'Discard', 2):
        # Fallback 1: "Dismiss" aria-label button (X button on modal)
        try:
            btn = driver.find_element(By.XPATH, "//button[@aria-label='Dismiss']")
            driver.execute_script("arguments[0].click();", btn)
            buffer(0.5)
        except Exception:
            pass
        # Fallback 2: press Escape again to close any remaining overlay
        try:
            actions.send_keys(Keys.ESCAPE).perform()
        except Exception:
            pass






# Function to apply to jobs
def apply_to_jobs(search_terms: list[str]) -> None:
    applied_jobs = get_applied_job_ids()
    rejected_jobs = set()
    blacklisted_companies = set()
    global current_city, failed_count, skip_count, easy_applied_count, external_jobs_count, tabs_count, pause_before_submit, pause_at_failed_question, useNewResume
    current_city = current_city.strip()

    if randomize_search_order:  shuffle(search_terms)
    for searchTerm in search_terms:
        print_lg("\n________________________________________________________________________________________________________________________\n")
        print_lg(f'\n>>>> Now searching for "{searchTerm}" <<<<\n\n')

        search_jobs_via_ui(searchTerm)
        apply_filters()

        current_count = 0
        try:
            while current_count < switch_number:
                # Wait until job listings are loaded
                print_lg(f'[Jobs] Waiting for job listings... URL: {driver.current_url}')
                try:
                    wait.until(EC.presence_of_all_elements_located((By.XPATH, "//li[@data-occludable-job-id]")))
                except Exception as wait_err:
                    print_lg(f'[Jobs] Job listings not found, skipping search term: {wait_err}')
                    break

                pagination_element, current_page = get_page_info()

                # Find all job listings in current page
                buffer(3)
                job_listings = driver.find_elements(By.XPATH, "//li[@data-occludable-job-id]")
                # Collect IDs upfront so re-fetch avoids StaleElementReferenceException
                job_ids = [el.get_dom_attribute("data-occludable-job-id") for el in job_listings]
                print_lg(f'[Jobs] Found {len(job_ids)} job listings on page')

                for jid in job_ids:
                    if keep_screen_awake and pyautogui: pyautogui.press('shiftright')
                    if current_count >= switch_number: break
                    print_lg("\n-@-\n")

                    # Re-fetch element fresh to avoid stale reference after DOM refresh
                    try:
                        job = driver.find_element(By.XPATH, f"//li[@data-occludable-job-id='{jid}']")
                    except Exception as stale_err:
                        print_lg(f'[Jobs] Could not re-fetch job {jid}, skipping: {stale_err}')
                        continue

                    job_id,title,company,work_location,work_style,skip = get_job_main_details(job, blacklisted_companies, rejected_jobs)
                    
                    if skip: continue
                    # Redundant fail safe check for applied jobs!
                    try:
                        if job_id in applied_jobs or find_by_class(driver, "jobs-s-apply__application-link", 2):
                            print_lg(f'Already applied to "{title} | {company}" job. Job ID: {job_id}!')
                            continue
                    except Exception as e:
                        print_lg(f'Trying to Apply to "{title} | {company}" job. Job ID: {job_id}')

                    job_link = "https://www.linkedin.com/jobs/view/"+job_id
                    application_link = "Easy Applied"
                    date_applied = "Pending"
                    hr_link = "Unknown"
                    hr_name = "Unknown"
                    connect_request = "In Development" # Still in development
                    date_listed = "Unknown"
                    skills = "Needs an AI" # Still in development
                    resume = "Pending"
                    reposted = False
                    questions_list = None
                    screenshot_name = "Not Available"

                    try:
                        rejected_jobs, blacklisted_companies, jobs_top_card = check_blacklist(rejected_jobs,job_id,company,blacklisted_companies)
                    except ValueError as e:
                        print_lg(e, 'Skipping this job!\n')
                        failed_job(job_id, job_link, resume, date_listed, "Found Blacklisted words in About Company", e, "Skipped", screenshot_name)
                        skip_count += 1
                        continue
                    except Exception as e:
                        print_lg("Failed to scroll to About Company!")
                        # print_lg(e)



                    # Hiring Manager info
                    try:
                        hr_info_card = WebDriverWait(driver,2).until(EC.presence_of_element_located((By.CLASS_NAME, "hirer-card__hirer-information")))
                        hr_link = hr_info_card.find_element(By.TAG_NAME, "a").get_attribute("href")
                        hr_name = hr_info_card.find_element(By.TAG_NAME, "span").text
                        # if connect_hr:
                        #     driver.switch_to.new_window('tab')
                        #     driver.get(hr_link)
                        #     wait_span_click("More")
                        #     wait_span_click("Connect")
                        #     wait_span_click("Add a note")
                        #     message_box = driver.find_element(By.XPATH, "//textarea")
                        #     message_box.send_keys(connect_request_message)
                        #     if close_tabs: driver.close()
                        #     driver.switch_to.window(linkedIn_tab) 
                        # def message_hr(hr_info_card):
                        #     if not hr_info_card: return False
                        #     hr_info_card.find_element(By.XPATH, ".//span[normalize-space()='Message']").click()
                        #     message_box = driver.find_element(By.XPATH, "//div[@aria-label='Write a message…']")
                        #     message_box.send_keys()
                        #     try_xp(driver, "//button[normalize-space()='Send']")        
                    except Exception as e:
                        print_lg(f'HR info was not given for "{title}" with Job ID: {job_id}!')
                        # print_lg(e)


                    # Salary (log before Time Posted so _extract_from_context can find it)
                    try:
                        salary_selectors = [
                            './/div[contains(@class,"salary")]//span',
                            './/span[contains(@class,"salary")]',
                            './/li[contains(@class,"job-insight")]//span[contains(text(),"$")]',
                            './/span[contains(text(),"$") and (contains(text(),"/yr") or contains(text(),"/hour") or contains(text(),"K"))]',
                        ]
                        salary_text = ""
                        for sel in salary_selectors:
                            try:
                                salary_text = jobs_top_card.find_element(By.XPATH, sel).text.strip()
                                if salary_text and "$" in salary_text:
                                    break
                            except Exception:
                                pass
                        if salary_text:
                            print_lg("Salary: " + salary_text)
                    except Exception:
                        pass

                    # Calculation of date posted
                    try:
                        time_posted_text = jobs_top_card.find_element(By.XPATH, './/span[contains(normalize-space(), " ago")]').text
                        print_lg("Time Posted: " + time_posted_text)
                        if time_posted_text.__contains__("Reposted"):
                            reposted = True
                            time_posted_text = time_posted_text.replace("Reposted", "")
                        date_listed = calculate_date_posted(time_posted_text.strip())
                    except Exception as e:
                        print_lg("Failed to calculate the date posted!",e)


                    description, experience_required, skip, reason, message = get_job_description()
                    if skip:
                        print_lg(message)
                        failed_job(job_id, job_link, resume, date_listed, reason, message, "Skipped", screenshot_name)
                        rejected_jobs.add(job_id)
                        skip_count += 1
                        continue

                    skills = "N/A"

                    # ── Per-job resume tailoring ──────────────────────────────
                    if tailor_resume and use_AI and aiClient and description and description != "Unknown":
                        try:
                            print_lg("[Tailor] Tailoring resume for this job...")
                            if jobezee_root and jobezee_root not in sys.path:
                                sys.path.insert(0, jobezee_root)
                            # Extract only requirements/qualifications from JD, strip boilerplate
                            try:
                                from backend.services.tailor_service import _clean_job_description
                                _clean_jd = _clean_job_description(description)
                                _jd_for_tailor = _clean_jd if len(_clean_jd.split()) >= 40 else description
                                print_lg(f"[Tailor] JD: {len(description)} chars -> {len(_jd_for_tailor)} chars after cleaning")
                            except Exception:
                                _jd_for_tailor = description
                                print_lg("[Tailor] JD cleaning unavailable, using full JD")
                            # Sanitize chars Windows cp1252 can't encode — skip on Linux (Hetzner)
                            import platform as _plat
                            def _cp1252_safe(s):
                                if _plat.system() != "Windows":
                                    return s  # Linux/Hetzner: UTF-8 natively, no stripping needed
                                out = []
                                for c in (s or ""):
                                    try:
                                        c.encode('cp1252')
                                        out.append(c)
                                    except (UnicodeEncodeError, LookupError):
                                        out.append(' ')
                                return ''.join(out)
                            _jd_for_tailor = _cp1252_safe(_jd_for_tailor)
                            from PHASE2_JOB_TAILOR.crew import ResumeCrew
                            from config.secrets import llm_api_key as _llm_key
                            _base_info = _cp1252_safe(globals().get("user_information_all", ""))
                            _openai_key = _llm_key if (_llm_key and _llm_key != "not-needed") else None
                            _crew = ResumeCrew(openai_api_key=_openai_key)
                            _result = _crew.run_tailoring_process(_jd_for_tailor, _base_info, None)
                            _tailored = _result.get("final_resume", "")
                            if _tailored:
                                globals()["user_information_all"] = _tailored
                                print_lg(f"[Tailor] Done (score: {_result.get('final_score', 'N/A')})")
                            else:
                                print_lg("[Tailor] Returned empty result, using original resume")
                        except Exception as _e:
                            print_lg(f"[Tailor] Failed: {_e} - using original resume")

                    uploaded = False
                    # Case 1: Easy Apply Button
                    if try_xp(driver, ".//button[contains(@class,'jobs-apply-button') and contains(@class, 'artdeco-button--3') and contains(@aria-label, 'Easy')]"):
                        try:
                            try:
                                errored = ""
                                modal = find_by_class(driver, "jobs-easy-apply-modal")
                                # Detect LinkedIn daily rate limit BEFORE filling the form
                                try:
                                    modal_text = modal.text
                                    _rate_limit_phrases = [
                                        "apply tomorrow",
                                        "limit daily submissions",
                                        "save this job and apply",
                                        "exceeded the daily",
                                        "daily application limit",
                                    ]
                                    if any(p in modal_text.lower() for p in _rate_limit_phrases):
                                        global dailyEasyApplyLimitReached
                                        dailyEasyApplyLimitReached = True
                                        print_lg("\n[JOBEZEE] ⛔ LinkedIn daily Easy Apply limit reached — stopping bot for today.\n")
                                        print_lg("[JOBEZEE] DAILY_LIMIT_REACHED")
                                        discard_job()
                                        raise Exception("LinkedIn daily Easy Apply limit reached")
                                except Exception as _rl:
                                    if "daily" in str(_rl).lower() or dailyEasyApplyLimitReached:
                                        raise
                                wait_span_click(modal, "Next", 1)
                                # if description != "Unknown":
                                #     resume = create_custom_resume(description)
                                resume = "Previous resume"
                                next_button = True
                                questions_list = set()
                                next_counter = 0
                                while next_button:
                                    next_counter += 1
                                    if next_counter >= 15: 
                                        if pause_at_failed_question:
                                            screenshot(driver, job_id, "Needed manual intervention for failed question")
                                            print_lg("[WARNING] Couldn't answer one or more questions — skipping and continuing.")
                                            next_counter = 1
                                            continue
                                        if questions_list: print_lg("Stuck for one or some of the following questions...", questions_list)
                                        screenshot_name = screenshot(driver, job_id, "Failed at questions")
                                        errored = "stuck"
                                        raise Exception("Seems like stuck in a continuous loop of next, probably because of new questions.")
                                    questions_list = answer_questions(modal, questions_list, work_location, job_description=description)
                                    if useNewResume and not uploaded: uploaded, resume = upload_resume(modal, default_resume_path)
                                    try: next_button = modal.find_element(By.XPATH, './/span[normalize-space(.)="Review"]') 
                                    except NoSuchElementException:  next_button = modal.find_element(By.XPATH, './/button[contains(span, "Next")]')
                                    try: next_button.click()
                                    except ElementClickInterceptedException: break    # Happens when it tries to click Next button in About Company photos section
                                    buffer(click_gap)

                            except NoSuchElementException: errored = "nose"
                            finally:
                                if questions_list and errored != "stuck":
                                    print_lg(f"[Form] Filled {len(questions_list)} question(s) successfully")
                                wait_span_click(driver, "Review", 3, scrollTop=True)
                                cur_pause_before_submit = pause_before_submit
                                if errored != "stuck" and cur_pause_before_submit:
                                    decision = "Submit Application"
                                    print_lg("[AUTO] pause_before_submit skipped — auto-submitting application.")
                                    pause_before_submit = False
                                follow_company(modal)
                                # Try to submit — "Submit application" is the normal button text;
                                # some forms use "Submit" (no "application") so try both.
                                submitted = (
                                    wait_span_click(driver, "Submit application", 4, scrollTop=True)
                                    or wait_span_click(driver, "Submit", 2, scrollTop=True)
                                )
                                if submitted:
                                    date_applied = datetime.now()
                                    if not wait_span_click(driver, "Done", 3): actions.send_keys(Keys.ESCAPE).perform()
                                else:
                                    print_lg("Since, Submit Application failed, discarding the job application...")
                                    if errored == "nose": raise Exception("Failed to click Submit application 😑")


                        except Exception as e:
                            print_lg("Failed to Easy apply!")
                            # print_lg(e)
                            critical_error_log("Somewhere in Easy Apply process",e)
                            failed_job(job_id, job_link, resume, date_listed, "Problem in Easy Applying", e, application_link, screenshot_name)
                            failed_count += 1
                            discard_job()
                            continue
                    else:
                        # Case 2: Apply externally
                        skip, application_link, tabs_count = external_apply(pagination_element, job_id, job_link, resume, date_listed, application_link, screenshot_name)
                        if dailyEasyApplyLimitReached:
                            print_lg("\n###############  Daily application limit for Easy Apply is reached!  ###############\n")
                            return
                        if skip: continue

                    submitted_jobs(job_id, title, company, work_location, work_style, description, experience_required, skills, hr_name, hr_link, resume, reposted, date_listed, date_applied, job_link, application_link, questions_list, connect_request)
                    if uploaded:   useNewResume = False

                    print_lg(f'Successfully saved "{title} | {company}" job. Job ID: {job_id} info')
                    current_count += 1
                    if application_link == "Easy Applied": easy_applied_count += 1
                    else:   external_jobs_count += 1
                    applied_jobs.add(job_id)



                # Switching to next page
                if pagination_element == None:
                    print_lg("Couldn't find pagination element, probably at the end page of results!")
                    break
                next_page = current_page + 1 if current_page else 2
                # Try multiple aria-label formats LinkedIn uses across UI versions
                next_btn = None
                for label in [f"Page {next_page}", str(next_page)]:
                    try:
                        next_btn = driver.find_element(By.XPATH, f"//button[@aria-label='{label}']")
                        break
                    except NoSuchElementException:
                        pass
                if next_btn:
                    scroll_to_view(driver, next_btn)
                    next_btn.click()
                    print_lg(f"\n>-> Now on Page {next_page} \n")
                    buffer(2)
                else:
                    print_lg(f"\n>-> Didn't find Page {next_page}. Probably at the end page of results!\n")
                    break

        except (NoSuchWindowException, WebDriverException) as e:
            print_lg("Browser window closed or session is invalid. Ending application process.", e)
            raise e # Re-raise to be caught by main
        except Exception as e:
            print_lg("Failed to find Job listings!")
            critical_error_log("In Applier", e)
            try:
                print_lg(driver.page_source, pretty=True)
            except Exception as page_source_error:
                print_lg(f"Failed to get page source, browser might have crashed. {page_source_error}")
            # print_lg(e)

        
def run(total_runs: int) -> int:
    if dailyEasyApplyLimitReached:
        return total_runs
    print_lg("\n########################################################################################################################\n")
    print_lg(f"Date and Time: {datetime.now()}")
    print_lg(f"Cycle number: {total_runs}")
    print_lg(f"Currently looking for jobs posted within '{date_posted}' and sorting them by '{sort_by}'")
    apply_to_jobs(search_terms)
    print_lg("########################################################################################################################\n")
    if not dailyEasyApplyLimitReached:
        print_lg("Sleeping for 10 min...")
        sleep(300)
        print_lg("Few more min... Gonna start with in next 5 min...")
        sleep(300)
    buffer(3)
    return total_runs + 1



chatGPT_tab = False
linkedIn_tab = False

def main() -> None:
    total_runs = 1
    try:
        global linkedIn_tab, tabs_count, useNewResume, aiClient
        alert_title = "Error Occurred. Closing Browser!"
        validate_config()
        
        if not os.path.exists(default_resume_path):
            print_lg("[Resume] Not found in profile - bot will use your previously uploaded LinkedIn resume.")
            useNewResume = False
        
        # Inject saved LinkedIn session cookies (Connect LinkedIn flow) before login
        _cookies_injected_ok = False
        try:
            import config.settings as _cfg_s
            _li_cookies_json = getattr(_cfg_s, 'linkedin_cookies_json', '') or ''
            if _li_cookies_json:
                import json as _json
                _saved_cookies = _json.loads(_li_cookies_json)
                if _saved_cookies:
                    print_lg(f"[JOBEZEE] Injecting {len(_saved_cookies)} saved LinkedIn session cookies...")
                    driver.get("https://www.linkedin.com")
                    time.sleep(2)
                    for _ck in _saved_cookies:
                        try:
                            _c = {k: _ck[k] for k in ('name','value','domain','path','secure','httpOnly') if k in _ck}
                            if 'sameSite' in _ck:
                                _c['sameSite'] = _ck['sameSite']
                            if 'expiry' in _ck:
                                _c['expiry'] = int(_ck['expiry'])
                            driver.add_cookie(_c)
                        except Exception:
                            pass
                    print_lg("[JOBEZEE] Cookies injected — navigating to feed...")
                    driver.get("https://www.linkedin.com/feed/")
                    time.sleep(3)
                    _cookies_injected_ok = True
        except Exception as _inj_e:
            print_lg(f"[JOBEZEE] Cookie injection failed (will login normally): {_inj_e}")

        # Login to LinkedIn (skip navigation if already at feed via cookies)
        tabs_count = len(driver.window_handles)
        if not _cookies_injected_ok:
            driver.get("https://www.linkedin.com/login")
        if not is_logged_in_LN(): login_LN()
        
        linkedIn_tab = driver.current_window_handle

        # # Login to ChatGPT in a new tab for resume customization
        # if use_resume_generator:
        #     try:
        #         driver.switch_to.new_window('tab')
        #         driver.get("https://chat.openai.com/")
        #         if not is_logged_in_GPT(): login_GPT()
        #         open_resume_chat()
        #         global chatGPT_tab
        #         chatGPT_tab = driver.current_window_handle
        #     except Exception as e:
        #         print_lg("Opening OpenAI chatGPT tab failed!")
        if use_AI:
            aiClient = ai_create_openai_client()
            
            try:
                about_company_for_ai = " ".join([word for word in (first_name+" "+last_name).split() if len(word) > 3])
                print_lg(f"Extracted about company info for AI: '{about_company_for_ai}'")
            except Exception as e:
                print_lg("Failed to extract about company info!", e)
        
        # Start applying to jobs
        driver.switch_to.window(linkedIn_tab)
        total_runs = run(total_runs)
        while(run_non_stop):
            if cycle_date_posted:
                date_options = ["Any time", "Past month", "Past week", "Past 24 hours"]
                global date_posted
                date_posted = date_options[date_options.index(date_posted)+1 if date_options.index(date_posted)+1 > len(date_options) else -1] if stop_date_cycle_at_24hr else date_options[0 if date_options.index(date_posted)+1 >= len(date_options) else date_options.index(date_posted)+1]
            if alternate_sortby:
                global sort_by
                sort_by = "Most recent" if sort_by == "Most relevant" else "Most relevant"
                total_runs = run(total_runs)
                sort_by = "Most recent" if sort_by == "Most relevant" else "Most relevant"
            total_runs = run(total_runs)
            if dailyEasyApplyLimitReached:
                break
        

    except (NoSuchWindowException, WebDriverException) as e:
        print_lg("Browser window closed or session is invalid. Exiting.", e)
    except Exception as e:
        critical_error_log("In Applier Main", e)
        print_lg(f"[ERROR] {alert_title}: {e}")
    finally:
        summary = "Total runs: {}\nJobs Easy Applied: {}\nExternal job links collected: {}\nTotal applied or collected: {}\nFailed jobs: {}\nIrrelevant jobs skipped: {}\n".format(total_runs,easy_applied_count,external_jobs_count,easy_applied_count + external_jobs_count,failed_count,skip_count)
        print_lg(summary)
        print_lg("\n\nTotal runs:                     {}".format(total_runs))
        print_lg("Jobs Easy Applied:              {}".format(easy_applied_count))
        print_lg("External job links collected:   {}".format(external_jobs_count))
        print_lg("                              ----------")
        print_lg("Total applied or collected:     {}".format(easy_applied_count + external_jobs_count))
        print_lg("\nFailed jobs:                    {}".format(failed_count))
        print_lg("Irrelevant jobs skipped:        {}\n".format(skip_count))
        if randomly_answered_questions: print_lg("\n\nQuestions randomly answered:\n  {}  \n\n".format(";\n".join(str(question) for question in randomly_answered_questions)))
        quotes = choice([
            "Never quit. You're one step closer than before.",
            "All the best with your future interviews, you've got this.",
            "Keep up with the progress. You got this.",
            "If you're tired, learn to take rest but never give up.",
            "Success is not final, failure is not fatal. It is the courage to continue that counts. - Winston Churchill",
            "Believe in yourself and all that you are. - Christian D. Larson",
            "The only way to do great work is to love what you do. - Steve Jobs",
            "Opportunities don't happen, you create them. - Chris Grosser",
            "The only limit to our realization of tomorrow will be our doubts of today. - Franklin D. Roosevelt",
            ])
        timeSaved = (easy_applied_count * 80) + (external_jobs_count * 20) + (skip_count * 10)
        timeSavedMsg = ""
        if timeSaved > 0:
            timeSaved += 60
            timeSavedMsg = f"In this run, you saved approx {round(timeSaved/60)} mins ({timeSaved} secs)."
        msg = f"{quotes}\n\n\n{timeSavedMsg}\n\nSummary:\n{summary}"
        print_lg(msg, "Closing the browser...")
        if tabs_count >= 10:
            msg = "NOTE: IF YOU HAVE MORE THAN 10 TABS OPENED, PLEASE CLOSE OR BOOKMARK THEM!\n\nOr it's highly likely that application will just open browser and not do anything next time!" 
            print_lg("\n[INFO] " + msg)
        if use_AI and aiClient:
            try:
                ai_close_openai_client(aiClient)
                print_lg("[AI] Client closed.")
            except Exception as e:
                print_lg("Failed to close AI client:", e)
        try:
            if driver:
                driver.quit()
        except WebDriverException as e:
            print_lg("Browser already closed.", e)
        except Exception as e: 
            critical_error_log("When quitting...", e)


if __name__ == "__main__":
    main()
