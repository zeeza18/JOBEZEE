"""OpenAI + MCP agentic runner for job applications.

Provides run_openai_job() as a drop-in replacement for the Claude subprocess
path in launcher.py when --model starts with 'gpt-'.
"""

import asyncio
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from applypilot import config
from applypilot.apply.dashboard import add_event, get_state, update_state

# ---------------------------------------------------------------------------
# Suppress "RuntimeError: Event loop is closed" from __del__ on Windows.
# Python 3.10 + ProactorEventLoop leaves pipe transports un-finalized; their
# __del__ fires during GC after the loop is already closed.  The hook is
# installed once at import time so it persists through GC cycles.
# ---------------------------------------------------------------------------
_orig_unraisablehook = sys.unraisablehook


def _quiet_unraisable_hook(unraisable) -> None:
    if isinstance(unraisable.exc_value, RuntimeError) and \
            "Event loop is closed" in str(unraisable.exc_value):
        return
    _orig_unraisablehook(unraisable)


sys.unraisablehook = _quiet_unraisable_hook

# ---------------------------------------------------------------------------
# Direct Gmail IMAP tool (replaces Gmail MCP)
# ---------------------------------------------------------------------------

def _gmail_search(query: str = "", max_results: int = 5) -> str:
    """Search Gmail inbox via IMAP using GMAIL_EMAIL + GMAIL_APP_PASSWORD env vars."""
    import email
    import imaplib
    import os
    from email.header import decode_header

    gmail_email = os.environ.get("GMAIL_EMAIL", "")
    gmail_password = os.environ.get("GMAIL_APP_PASSWORD", "").replace(" ", "")

    if not gmail_email or not gmail_password:
        return "Gmail not configured (GMAIL_EMAIL / GMAIL_APP_PASSWORD missing in .env)"

    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(gmail_email, gmail_password)
        mail.select("inbox")

        # Map simple query terms to IMAP criteria
        if query:
            criteria = f'(SUBJECT "{query}")'
        else:
            criteria = "ALL"

        _, data = mail.search(None, criteria)
        ids = data[0].split()
        ids = ids[-max_results:] if ids else []

        results = []
        for uid in reversed(ids):
            _, msg_data = mail.fetch(uid, "(RFC822.HEADER)")
            msg = email.message_from_bytes(msg_data[0][1])

            raw_subject = decode_header(msg.get("Subject", "") or "")
            subject = raw_subject[0][0]
            if isinstance(subject, bytes):
                subject = subject.decode(raw_subject[0][1] or "utf-8", errors="replace")

            results.append(
                f"From: {msg.get('From', '')}\n"
                f"Subject: {subject}\n"
                f"Date: {msg.get('Date', '')}"
            )

        mail.logout()
        return "\n\n".join(results) if results else "No matching emails found."
    except Exception as e:
        return f"Gmail IMAP error: {e}"

# ---------------------------------------------------------------------------
# Per-token pricing (USD per 1 M tokens) for cost computation
# ---------------------------------------------------------------------------

_TOKEN_PRICES: dict[str, dict[str, float]] = {
    "gpt-4o":      {"input": 2.50,  "output": 10.00},
    "gpt-4o-mini": {"input": 0.15,  "output": 0.60},
}

_MAX_TURNS = 100
_TIMEOUT_SECONDS = 600
_MAX_RESULT_CHARS = 50_000


# ---------------------------------------------------------------------------
# Tool-result truncation
# ---------------------------------------------------------------------------

def _mcp_result_to_text(result: Any) -> str:
    """Convert an MCP CallToolResult to a (possibly truncated) string."""
    parts: list[str] = []
    for content in result.content:
        if hasattr(content, "text"):
            parts.append(content.text)
        elif hasattr(content, "data"):
            parts.append(f"[image data: {len(content.data)} bytes]")
        else:
            parts.append(str(content))
    text = "\n".join(parts)
    if len(text) > _MAX_RESULT_CHARS:
        text = text[:_MAX_RESULT_CHARS] + "\n...[truncated]"
    return text


# ---------------------------------------------------------------------------
# Result parsing — exact mirror of launcher.py run_job() lines 465–494
# ---------------------------------------------------------------------------

def _clean_reason(s: str) -> str:
    return re.sub(r'[*`"]+$', '', s).strip()


def _parse_result(output: str) -> str | None:
    """Return a status string if a RESULT: line is present, else None."""
    for result_status in ["APPLIED", "SUBMITTED", "EXPIRED", "CAPTCHA", "LOGIN_ISSUE"]:
        if f"RESULT:{result_status}" in output:
            return result_status.lower()

    if "RESULT:FAILED" in output:
        for line in output.split("\n"):
            if "RESULT:FAILED" in line:
                reason = (
                    line.split("RESULT:FAILED:")[-1].strip()
                    if ":" in line[line.index("FAILED") + 6:]
                    else "unknown"
                )
                reason = _clean_reason(reason)
                PROMOTE_TO_STATUS = {"captcha", "expired", "login_issue"}
                if reason in PROMOTE_TO_STATUS:
                    return reason
                return f"failed:{reason}"
        return "failed:unknown"

    return None


# ---------------------------------------------------------------------------
# Tool registry builder
# ---------------------------------------------------------------------------

async def _build_tool_registry(
    pw_session: Any,
) -> tuple[list[dict], dict[str, Any]]:
    """Enumerate MCP tools and return (openai_tools_list, tool_map).

    tool_map maps openai_tool_name -> (mcp_tool_name, session) for MCP tools,
    or openai_tool_name -> callable for local Python tools.
    """
    openai_tools: list[dict] = []
    tool_map: dict[str, Any] = {}

    # Playwright tools — prefix pw__
    pw_result = await pw_session.list_tools()
    for tool in pw_result.tools:
        oai_name = f"pw__{tool.name}"
        tool_map[oai_name] = (tool.name, pw_session)
        openai_tools.append({
            "type": "function",
            "function": {
                "name": oai_name,
                "description": tool.description or "",
                "parameters": tool.inputSchema or {"type": "object", "properties": {}},
            },
        })

    # CAPTCHA solver — 2Captcha API, called when agent detects a CAPTCHA
    def _solve_captcha(page_url: str, site_key: str, captcha_type: str = "recaptcha") -> str:
        """Solve a CAPTCHA via 2Captcha API. Returns the solution token or an error string."""
        import os, logging
        api_key = os.environ.get("TWOCAPTCHA_API_KEY", "")
        if not api_key:
            return "Error: TWOCAPTCHA_API_KEY not set"
        try:
            from TwoCaptcha import TwoCaptcha
            solver = TwoCaptcha(api_key)
            if captcha_type.lower() == "hcaptcha":
                result = solver.hcaptcha(sitekey=site_key, url=page_url)
            else:
                result = solver.recaptcha(sitekey=site_key, url=page_url)
            token = result.get("code", "")
            logging.getLogger(__name__).info("CAPTCHA solved via 2Captcha")
            return token
        except Exception as e:
            return f"Error: {e}"

    tool_map["solve_captcha"] = _solve_captcha
    openai_tools.append({
        "type": "function",
        "function": {
            "name": "solve_captcha",
            "description": (
                "Solve a CAPTCHA on the current page using 2Captcha. "
                "Use this when you detect a reCAPTCHA or hCaptcha blocking the form. "
                "Extract the site key from the page (data-sitekey attribute), then call this tool. "
                "Inject the returned token into g-recaptcha-response and trigger the callback."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "page_url": {"type": "string", "description": "Current page URL"},
                    "site_key": {"type": "string", "description": "CAPTCHA site key (data-sitekey)"},
                    "captcha_type": {
                        "type": "string",
                        "enum": ["recaptcha", "hcaptcha"],
                        "description": "Type of CAPTCHA (default: recaptcha)",
                    },
                },
                "required": ["page_url", "site_key"],
            },
        },
    })

    # Gmail search — direct IMAP, no MCP needed
    tool_map["gmail_search"] = _gmail_search
    openai_tools.append({
        "type": "function",
        "function": {
            "name": "gmail_search",
            "description": (
                "Search your Gmail inbox for emails matching a query string (matched against subject). "
                "Use this to check for job application confirmation or status emails."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Subject keyword to search for, e.g. 'application received'",
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Max number of emails to return (default 5)",
                        "default": 5,
                    },
                },
                "required": [],
            },
        },
    })

    return openai_tools, tool_map


# ---------------------------------------------------------------------------
# Agentic loop — max 50 turns, 300 s timeout
# ---------------------------------------------------------------------------

async def _agentic_loop(
    pw_session: Any,
    model: str,
    agent_prompt: str,
    worker_id: int,
    worker_log: Path,
    log_header: str,
    dry_run: bool,
) -> tuple[str, str]:
    """Run the OpenAI tool-calling loop.

    Returns:
        (status_string, accumulated_output_text)
    """
    from openai import AsyncOpenAI

    openai_tools, tool_map = await _build_tool_registry(pw_session)
    client = AsyncOpenAI(max_retries=5, timeout=60.0)

    _SYSTEM_MESSAGE = (
        "You are an autonomous job application agent. "
        "Complete the application using the browser tools provided.\n\n"
        "IMPORTANT — after clicking Submit/Apply:\n"
        "1. Wait for the page to show a confirmation message (e.g. 'Application submitted', 'Thank you').\n"
        "2. Use gmail_search to check for a confirmation email from the company "
        "(search for terms like 'application received', 'thank you for applying', 'we received your application'). "
        "Wait up to 60 seconds and try 2-3 times if no email yet.\n"
        "3. Only output RESULT:APPLIED if EITHER the page confirms submission AND a confirmation email is found in Gmail.\n"
        "4. If you submitted the form successfully but NO confirmation email arrived, output RESULT:SUBMITTED.\n\n"
        "When finished, you MUST output exactly one of these lines as your final message:\n"
        "  RESULT:APPLIED       — submitted AND confirmed by email\n"
        "  RESULT:SUBMITTED     — form submitted but no confirmation email yet\n"
        "  RESULT:EXPIRED\n"
        "  RESULT:CAPTCHA\n"
        "  RESULT:LOGIN_ISSUE\n"
        "  RESULT:FAILED:<short_reason>\n"
        "Do NOT stop without outputting a RESULT: line."
    )
    messages: list[dict] = [
        {"role": "system", "content": _SYSTEM_MESSAGE},
        {"role": "user", "content": agent_prompt},
    ]
    _cdp_failures = 0  # consecutive CDP connection failures
    text_accumulator: list[str] = []
    prices = _TOKEN_PRICES.get(model, _TOKEN_PRICES["gpt-4o"])
    deadline = time.time() + _TIMEOUT_SECONDS

    # Step-progress flags — each fires once to update the frontend stepper
    _step_opened     = False
    _step_filling    = False
    _step_resume     = False
    _step_submitting = False

    with open(worker_log, "a", encoding="utf-8") as lf:
        lf.write(log_header)

        for _turn in range(_MAX_TURNS):
            if time.time() > deadline:
                break

            # Check Chrome is still alive before each turn
            try:
                from applypilot.apply.chrome import _chrome_procs
                cp = _chrome_procs.get(worker_id)
                if cp is not None and cp.poll() is not None:
                    lf.write("     FATAL: Chrome process died, aborting.\n")
                    return "failed:chrome_crashed", "\n".join(text_accumulator)
            except Exception:
                pass

            # Warn the agent when it's running low on turns
            if _turn == _MAX_TURNS - 5:
                messages.append({
                    "role": "user",
                    "content": (
                        f"WARNING: Only {_MAX_TURNS - _turn} turns remaining. "
                        "If the application is not complete, stop now and output "
                        "RESULT:FAILED:<reason>. If it is complete, output RESULT:APPLIED."
                    ),
                })

            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                tools=openai_tools if openai_tools else None,
            )

            # Accumulate cost from token usage
            usage = response.usage
            if usage:
                turn_cost = (
                    usage.prompt_tokens * prices["input"]
                    + usage.completion_tokens * prices["output"]
                ) / 1_000_000
                ws = get_state(worker_id)
                prev_cost = ws.total_cost if ws else 0.0
                update_state(worker_id, total_cost=prev_cost + turn_cost)

            choice = response.choices[0]
            assistant_msg = choice.message

            # Build message dict to append to conversation
            msg_dict: dict[str, Any] = {"role": "assistant", "content": assistant_msg.content}
            if assistant_msg.tool_calls:
                msg_dict["tool_calls"] = [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in assistant_msg.tool_calls
                ]
            messages.append(msg_dict)

            # Log and accumulate any text content
            if assistant_msg.content:
                text_accumulator.append(assistant_msg.content)
                lf.write(assistant_msg.content + "\n")
                # Early exit if a result line is already present
                accumulated = "\n".join(text_accumulator)
                parsed = _parse_result(accumulated)
                if parsed is not None:
                    return parsed, accumulated

            if not assistant_msg.tool_calls:
                break

            # Process each tool call
            for tc in assistant_msg.tool_calls:
                fn_name = tc.function.name
                try:
                    fn_args: dict = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    fn_args = {}

                if fn_name not in tool_map:
                    tool_result_text = f"Error: unknown tool {fn_name}"
                else:
                    handler = tool_map[fn_name]
                    is_local = callable(handler)
                    mcp_name = fn_name if is_local else handler[0]

                    # Build a short description for the dashboard / log
                    if "url" in fn_args:
                        desc = f"{mcp_name} {fn_args['url'][:60]}"
                    elif "ref" in fn_args:
                        desc = f"{mcp_name} {fn_args.get('element', fn_args.get('text', ''))}"[:50]
                    elif "fields" in fn_args:
                        desc = f"{mcp_name} ({len(fn_args['fields'])} fields)"
                    elif "paths" in fn_args:
                        paths_str = ", ".join(fn_args["paths"]) if isinstance(fn_args.get("paths"), list) else str(fn_args.get("paths", ""))
                        desc = f"{mcp_name} upload {paths_str[:60]}"
                    else:
                        desc = mcp_name

                    lf.write(f"  >> {desc}\n")
                    ws = get_state(worker_id)
                    cur_actions = ws.actions if ws else 0
                    update_state(worker_id, actions=cur_actions + 1, last_action=desc[:35])

                    # Emit one-time step-progress events for the frontend stepper
                    _fn_lower = fn_name.lower()
                    if not _step_opened and "navigate" in _fn_lower:
                        _step_opened = True
                        add_event("STEP:opened")
                    elif _step_opened and not _step_filling and (
                        "fill" in _fn_lower or "type" in _fn_lower or "select" in _fn_lower
                    ):
                        _step_filling = True
                        add_event("STEP:filling")
                    elif _step_filling and not _step_resume and (
                        "upload" in _fn_lower or "file" in _fn_lower
                    ):
                        _step_resume = True
                        add_event("STEP:resume")
                    elif not _step_submitting and "click" in _fn_lower:
                        _args_str = str(fn_args).lower()
                        if any(kw in _args_str for kw in ("submit", "apply now", "send application")):
                            _step_submitting = True
                            add_event("STEP:submitting")

                    try:
                        if is_local:
                            # Local Python tool — run in thread to avoid blocking
                            tool_result_text = await asyncio.to_thread(handler, **fn_args)
                        else:
                            mcp_tool_name, session = handler
                            result = await session.call_tool(mcp_tool_name, fn_args)
                            tool_result_text = _mcp_result_to_text(result)
                            # Chrome CDP lost — only abort after 3 consecutive failures
                            if "ECONNREFUSED" in tool_result_text:
                                _cdp_failures += 1
                                lf.write(f"     CDP failure #{_cdp_failures}\n")
                                if _cdp_failures >= 3:
                                    lf.write("     FATAL: Chrome CDP lost, aborting.\n")
                                    return "failed:chrome_crashed", "\n".join(text_accumulator)
                            else:
                                _cdp_failures = 0
                            if result.isError or "error" in tool_result_text.lower()[:80]:
                                lf.write(f"     TOOL ERROR: {tool_result_text[:200]}\n")
                    except Exception as e:
                        tool_result_text = f"Error calling {mcp_name}: {e}"
                        lf.write(f"     CALL ERROR: {e}\n")
                        if "ECONNREFUSED" in str(e) or "connect ECONNREFUSED" in str(e):
                            _cdp_failures += 1
                            lf.write(f"     CDP failure #{_cdp_failures}\n")
                            if _cdp_failures >= 3:
                                lf.write("     FATAL: Chrome CDP lost, aborting.\n")
                                return "failed:chrome_crashed", "\n".join(text_accumulator)

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": tool_result_text,
                })

    output = "\n".join(text_accumulator)
    parsed = _parse_result(output)
    return parsed or "failed:no_result_line", output


async def _run_async(
    job: dict,
    port: int,
    worker_id: int,
    model: str,
    agent_prompt: str,
    worker_log: Path,
    log_header: str,
    dry_run: bool,
) -> tuple[str, str]:
    """Open the Playwright MCP session and delegate to the agentic loop."""
    from mcp import ClientSession
    from mcp.client.stdio import StdioServerParameters, stdio_client

    viewport = config.DEFAULTS["viewport"]
    pw_params = StdioServerParameters(
        command="npx",
        args=[
            "@playwright/mcp@latest",
            f"--cdp-endpoint=http://127.0.0.1:{port}",
            f"--viewport-size={viewport}",
        ],
    )

    async with stdio_client(pw_params) as (pw_read, pw_write):
        async with ClientSession(pw_read, pw_write) as pw_session:
            await pw_session.initialize()
            return await _agentic_loop(
                pw_session=pw_session,
                model=model,
                agent_prompt=agent_prompt,
                worker_id=worker_id,
                worker_log=worker_log,
                log_header=log_header,
                dry_run=dry_run,
            )


# ---------------------------------------------------------------------------
# Public synchronous entry point (called from launcher.py)
# ---------------------------------------------------------------------------

def run_openai_job(
    job: dict,
    port: int,
    worker_id: int,
    model: str,
    agent_prompt: str,
    worker_log: Path,
    log_header: str,
    dry_run: bool = False,
) -> tuple[str, int]:
    """Run a job application using OpenAI + MCP.

    Drop-in replacement for the Claude subprocess path in launcher.py.

    Returns:
        Tuple of (status_string, duration_ms). Status matches the same
        conventions as run_job(): 'applied', 'expired', 'captcha',
        'login_issue', 'failed:reason', etc.
    """
    import re as _re
    import shutil as _shutil

    start = time.time()

    # Ensure .env is loaded (handles direct invocation outside cli.py)
    config.load_env()

    # Playwright MCP restricts file uploads to the CWD (project dir).
    # If the resume PDF path in the prompt points to .applypilot (outside CWD),
    # copy it to the project root and patch the prompt path.
    _applypilot_prefix = str(config.LOG_DIR.parent)
    _pdf_match = _re.search(
        r'(?:Resume PDF \(upload this\): |browser_file_upload.*?)('
        + _re.escape(_applypilot_prefix)
        + r'[^\s\n"\']+\.pdf)',
        agent_prompt,
        _re.IGNORECASE,
    )
    if _pdf_match:
        _src_pdf = Path(_pdf_match.group(1))
        if _src_pdf.exists():
            _dst_pdf = Path.cwd() / _src_pdf.name
            _shutil.copy2(str(_src_pdf), str(_dst_pdf))
            agent_prompt = agent_prompt.replace(str(_src_pdf), str(_dst_pdf))

    # Windows requires ProactorEventLoop for subprocess (stdio_client) support.
    # We manage the loop manually and suppress the "RuntimeError: Event loop is
    # closed" noise that Python 3.10 + ProactorEventLoop produces when pipe
    # transports are garbage-collected after the loop closes.
    if sys.platform == "win32":
        loop = asyncio.ProactorEventLoop()
    else:
        loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        status, output = loop.run_until_complete(_run_async(
            job=job, port=port, worker_id=worker_id, model=model,
            agent_prompt=agent_prompt, worker_log=worker_log,
            log_header=log_header, dry_run=dry_run,
        ))
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        # Unwrap anyio ExceptionGroup to surface the real root cause
        root: BaseException = e
        if hasattr(e, "exceptions") and getattr(e, "exceptions", None):
            root = e.exceptions[-1]
            while hasattr(root, "exceptions") and getattr(root, "exceptions", None):
                root = root.exceptions[-1]
        err_msg = str(root)[:100]
        add_event(f"[W{worker_id}] OpenAI ERROR: {err_msg[:40]}")
        update_state(worker_id, status="failed", last_action=f"ERROR: {err_msg[:25]}")
        return f"failed:{err_msg}", duration_ms
    finally:
        try:
            loop.run_until_complete(asyncio.sleep(0))
        except Exception:
            pass
        loop.close()
        asyncio.set_event_loop(None)

    elapsed_s = int(time.time() - start)
    duration_ms = int((time.time() - start) * 1000)

    # Save a per-job output log (mirrors the claude_*.txt pattern)
    try:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        job_log = config.LOG_DIR / f"openai_{ts}_w{worker_id}_{job.get('site', 'unknown')[:20]}.txt"
        job_log.write_text(output, encoding="utf-8")
    except Exception:
        pass

    # Update dashboard with final status
    if status in ("applied", "submitted", "expired", "captcha", "login_issue"):
        add_event(f"[W{worker_id}] {status.upper()} ({elapsed_s}s): {job['title'][:30]}")
        update_state(worker_id, status=status, last_action=f"{status.upper()} ({elapsed_s}s)")
    elif status and status.startswith("failed:"):
        reason = status.split(":", 1)[-1]
        add_event(f"[W{worker_id}] FAILED ({elapsed_s}s): {reason[:30]}")
        update_state(worker_id, status="failed", last_action=f"FAILED: {reason[:25]}")
    else:
        add_event(f"[W{worker_id}] NO RESULT ({elapsed_s}s)")
        update_state(worker_id, status="failed", last_action=f"no result ({elapsed_s}s)")

    return status, duration_ms
