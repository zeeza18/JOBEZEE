import os
import sys
from modules.helpers import get_default_temp_profile, make_directories
from config.settings import run_in_background, stealth_mode, disable_extensions, safe_mode, file_name, failed_file_name, logs_folder_path, generated_resume_path
from config.questions import default_resume_path
if stealth_mode:
    import undetected_chromedriver as uc
else:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from modules.helpers import find_default_profile_directory, critical_error_log, print_lg
from selenium.common.exceptions import SessionNotCreatedException


def get_bot_profile_dir() -> str:
    '''
    Returns a dedicated Chrome profile directory only for this bot.
    Completely separate from the user's Chrome — no conflicts even when Chrome is open.
    Saves login session so LinkedIn stays logged in across runs.
    '''
    if sys.platform.startswith('win'):
        return os.path.join(os.path.expandvars("%LOCALAPPDATA%"), "Google", "Chrome", "LinkedInBotData")
    elif sys.platform.startswith('linux'):
        return os.path.expanduser("~/.config/google-chrome-linkedin-bot")
    return os.path.expanduser("~/Library/Application Support/Google/Chrome/LinkedInBotData")


def get_cached_driver_path() -> str | None:
    '''
    Returns path to already-downloaded ChromeDriver to avoid re-downloading every run.
    '''
    if sys.platform.startswith('win'):
        path = os.path.join(os.path.expandvars("%APPDATA%"), "undetected_chromedriver", "undetected_chromedriver.exe")
        if os.path.exists(path):
            return path
    return None


def createChromeSession(isRetry: bool = False):
    make_directories([file_name, failed_file_name, logs_folder_path+"/screenshots", default_resume_path, generated_resume_path+"/temp"])

    options = uc.ChromeOptions() if stealth_mode else Options()
    if run_in_background:   options.add_argument("--headless")
    if disable_extensions:  options.add_argument("--disable-extensions")
    # Stabilize ChromeDriver startup on newer Chrome builds
    options.add_argument("--remote-allow-origins=*")
    options.add_argument("--remote-debugging-port=0")  # let Chrome choose a free port

    # Required in containerised Linux (Render, Docker) — Chrome refuses to run as root otherwise
    if sys.platform.startswith("linux"):
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--disable-software-rasterizer")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-background-networking")
        options.add_argument("--disable-sync")
        options.add_argument("--disable-translate")
        options.add_argument("--no-service-autorun")
        options.add_argument("--password-store=basic")
        # Point ChromeDriver to the Chrome binary — check env var first, then known paths
        import shutil as _shutil
        _chrome_bin = os.environ.get("CHROME_BIN", "")
        if _chrome_bin and os.path.exists(_chrome_bin):
            options.binary_location = _chrome_bin
            print_lg(f"Chrome binary (CHROME_BIN): {_chrome_bin}")
        else:
            for _cb in (
                "/usr/bin/google-chrome",
                "/usr/bin/google-chrome-stable",
                "/opt/google/chrome/google-chrome",
                "/opt/google/chrome/chrome",
                "/usr/bin/chromium-browser",
                "/usr/bin/chromium",
            ):
                if os.path.exists(_cb):
                    options.binary_location = _cb
                    print_lg(f"Chrome binary: {_cb}")
                    break
            else:
                _found = (_shutil.which("google-chrome") or _shutil.which("google-chrome-stable")
                          or _shutil.which("chromium-browser") or _shutil.which("chromium") or "")
                if _found:
                    options.binary_location = _found
                    print_lg(f"Chrome binary (which): {_found}")
                else:
                    print_lg("[WARN] Chrome binary not found — ChromeDriver will try defaults")

    # Stability flags — suppress profile picker and first-run UI
    options.add_argument("--no-first-run")
    options.add_argument("--no-default-browser-check")
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--disable-features=ProfilePickerOnStartupFeature")
    options.add_argument("--disable-features=ChromeWhatsNewUI")
    options.add_argument("--suppress-message-center-popups")
    options.add_argument("--disable-default-apps")

    print_lg("IF YOU HAVE MORE THAN 10 TABS OPENED, PLEASE CLOSE OR BOOKMARK THEM! Or it's highly likely that application will just open browser and not do anything!")
    print_lg(f"[Chrome] safe_mode={safe_mode} run_in_background={run_in_background} isRetry={isRetry}")

    if not isRetry and not safe_mode:
        bot_dir = get_bot_profile_dir()
        print_lg(f"Using dedicated bot profile: {bot_dir}")
        options.add_argument(f"--user-data-dir={bot_dir}")
        options.add_argument("--profile-directory=Default")
    else:
        print_lg("Using temporary profile...")
        options.add_argument(get_default_temp_profile())

    if stealth_mode:
        cached_driver = get_cached_driver_path()
        if cached_driver:
            print_lg("Using cached Chrome Driver (fast start)...")
            driver = uc.Chrome(driver_executable_path=cached_driver, options=options)
        else:
            print_lg("Downloading Chrome Driver... This may take some time. Only needed once!")
            driver = uc.Chrome(options=options)
    else:
        import threading, shutil
        from selenium.webdriver.chrome.service import Service as ChromeService
        _done = threading.Event()
        def _heartbeat():
            secs = 0
            while not _done.is_set():
                _done.wait(10)
                if not _done.is_set():
                    secs += 10
                    print_lg(f"  [Chrome] still starting... ({secs}s elapsed)", flush=True)
        threading.Thread(target=_heartbeat, daemon=True).start()
        _cd_path = shutil.which("chromedriver")
        if _cd_path:
            print_lg(f"Using chromedriver from PATH: {_cd_path}")
            driver = webdriver.Chrome(service=ChromeService(_cd_path), options=options)
        else:
            print_lg("chromedriver not on PATH — letting selenium-manager auto-download matching version...")
            driver = webdriver.Chrome(options=options)
        _done.set()
        print_lg("Chrome launched successfully")

    driver.maximize_window()
    wait = WebDriverWait(driver, 5)
    actions = ActionChains(driver)
    return options, driver, actions, wait

try:
    options, driver, actions, wait = None, None, None, None
    options, driver, actions, wait = createChromeSession()
except Exception as e:
    critical_error_log("Failed to create Chrome Session with bot profile, retrying with temp profile", e)
    try:
        options, driver, actions, wait = createChromeSession(True)
    except Exception as e2:
        msg = 'Failed to open Chrome. Try closing all Chrome windows and running again.\n\nIf issue persists, try Safe Mode. Set, safe_mode = True in config/settings.py'
        print_lg(msg)
        critical_error_log("In Opening Chrome", e2)
        print_lg(f"[FATAL] {msg}")
        exit()
