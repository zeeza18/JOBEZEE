"""
Transactional email service — uses SMTP (works with Gmail, SendGrid, Resend, Mailgun).

Configure via .env:
  SMTP_HOST     = smtp.gmail.com
  SMTP_PORT     = 587
  SMTP_USER     = you@gmail.com
  SMTP_PASSWORD = your-app-password
  SMTP_FROM     = noreply@jobezee.org
"""
from __future__ import annotations

import asyncio
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

log = logging.getLogger(__name__)

_RESET_HTML = """\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your JOBEZEE password</title>
  <style>
    body {{ margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
    .wrapper {{ max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }}
    .header {{ background: linear-gradient(135deg, #06b6d4, #0ea5e9); padding: 36px 40px 32px; }}
    .logo {{ font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; }}
    .logo span {{ opacity: 0.7; }}
    .body {{ padding: 36px 40px; }}
    h1 {{ margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #0f172a; }}
    p {{ margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #475569; }}
    .btn {{ display: inline-block; background: linear-gradient(135deg, #06b6d4, #0ea5e9); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 10px; }}
    .btn-wrap {{ margin: 28px 0; }}
    .note {{ font-size: 13px; color: #94a3b8; }}
    .divider {{ border: none; border-top: 1px solid #e2e8f0; margin: 28px 0; }}
    .footer {{ padding: 20px 40px 28px; font-size: 12px; color: #94a3b8; background: #f8fafc; }}
    .footer a {{ color: #06b6d4; text-decoration: none; }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">JOBEZEE<span>.org</span></div>
    </div>
    <div class="body">
      <h1>Reset your password</h1>
      <p>Hi {name},</p>
      <p>We received a request to reset the password for your JOBEZEE account. Click the button below — this link is valid for <strong>1 hour</strong>.</p>
      <div class="btn-wrap">
        <a href="{reset_url}" class="btn">Reset Password</a>
      </div>
      <p class="note">If the button doesn't work, copy and paste this URL into your browser:</p>
      <p class="note" style="word-break: break-all;">{reset_url}</p>
      <hr class="divider" />
      <p class="note">If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>
    </div>
    <div class="footer">
      &copy; 2026 JOBEZEE &middot; <a href="https://www.jobezee.org/privacy">Privacy</a> &middot; <a href="https://www.jobezee.org/terms">Terms</a>
    </div>
  </div>
</body>
</html>
"""


def _send_smtp(to_email: str, subject: str, html_body: str, text_body: str) -> None:
    """Synchronous SMTP send — run in a thread executor."""
    from ..config import get_settings
    cfg = get_settings()

    if not cfg.SMTP_HOST or not cfg.SMTP_USER or not cfg.SMTP_PASSWORD:
        log.warning("[Email] SMTP not configured — skipping send to %s", to_email)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"JOBEZEE <{cfg.SMTP_FROM}>"
    msg["To"]      = to_email

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    context = ssl.create_default_context()

    try:
        if cfg.SMTP_PORT == 465:
            # SSL from the start (Resend, some SendGrid configs)
            with smtplib.SMTP_SSL(cfg.SMTP_HOST, cfg.SMTP_PORT, context=context) as server:
                server.login(cfg.SMTP_USER, cfg.SMTP_PASSWORD)
                server.sendmail(cfg.SMTP_FROM, to_email, msg.as_string())
        else:
            # STARTTLS (Gmail, SendGrid default)
            with smtplib.SMTP(cfg.SMTP_HOST, cfg.SMTP_PORT) as server:
                server.ehlo()
                server.starttls(context=context)
                server.login(cfg.SMTP_USER, cfg.SMTP_PASSWORD)
                server.sendmail(cfg.SMTP_FROM, to_email, msg.as_string())

        log.info("[Email] sent '%s' → %s", subject, to_email)

    except Exception as exc:
        log.error("[Email] failed to send to %s: %s", to_email, exc)
        raise


_JOBS_HTML = """\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New jobs for you — JOBEZEE</title>
  <style>
    body {{ margin:0; padding:0; background:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }}
    .wrapper {{ max-width:600px; margin:40px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }}
    .header {{ background:linear-gradient(135deg,#06b6d4,#0ea5e9); padding:36px 40px 28px; }}
    .logo {{ font-size:20px; font-weight:900; letter-spacing:-0.5px; color:#ffffff; }}
    .logo span {{ opacity:0.7; }}
    .header-badge {{ display:inline-block; margin-top:14px; background:rgba(255,255,255,0.2); color:#ffffff; font-size:13px; font-weight:700; padding:5px 14px; border-radius:20px; letter-spacing:0.2px; }}
    .header h1 {{ margin:10px 0 0; font-size:24px; font-weight:800; color:#ffffff; line-height:1.3; }}
    .header p {{ margin:8px 0 0; font-size:14px; color:rgba(255,255,255,0.8); }}
    .body {{ padding:32px 40px; }}
    .intro {{ font-size:15px; color:#475569; margin:0 0 24px; line-height:1.6; }}
    .intro strong {{ color:#0f172a; }}
    .job-card {{ background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:18px 20px; margin-bottom:12px; }}
    .job-title {{ font-size:15px; font-weight:700; color:#0f172a; margin:0 0 4px; }}
    .job-company {{ font-size:13px; font-weight:600; color:#06b6d4; margin:0 0 8px; }}
    .job-meta {{ display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; }}
    .tag {{ display:inline-block; background:#e0f2fe; color:#0369a1; font-size:11px; font-weight:600; padding:3px 9px; border-radius:20px; }}
    .tag.salary {{ background:#dcfce7; color:#166534; }}
    .tag.site {{ background:#f3e8ff; color:#7c3aed; }}
    .view-btn {{ display:inline-block; background:linear-gradient(135deg,#06b6d4,#0ea5e9); color:#ffffff !important; text-decoration:none; font-size:12px; font-weight:700; padding:7px 16px; border-radius:8px; }}
    .divider {{ border:none; border-top:1px solid #e2e8f0; margin:28px 0; }}
    .cta-wrap {{ text-align:center; margin:28px 0 8px; }}
    .cta-btn {{ display:inline-block; background:linear-gradient(135deg,#06b6d4,#0ea5e9); color:#ffffff !important; text-decoration:none; font-size:15px; font-weight:700; padding:14px 36px; border-radius:12px; box-shadow:0 4px 14px rgba(6,182,212,0.3); }}
    .cta-sub {{ text-align:center; font-size:12px; color:#94a3b8; margin-top:10px; }}
    .footer {{ padding:20px 40px 28px; font-size:12px; color:#94a3b8; background:#f8fafc; }}
    .footer a {{ color:#06b6d4; text-decoration:none; }}
    @media(max-width:480px){{
      .body,.header {{ padding:24px 20px; }}
      .footer {{ padding:16px 20px 24px; }}
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">JOBEZEE<span>.org</span></div>
      <div class="header-badge">&#127381; {count} new jobs found</div>
      <h1>Fresh opportunities just for you</h1>
      <p>Your hourly search just completed — here's a preview of what we found.</p>
    </div>
    <div class="body">
      <p class="intro">
        Hi <strong>{name}</strong>, we scanned job boards in the last hour and found
        <strong>{count} new listings</strong> matching your profile. Here's a quick preview:
      </p>

      {job_cards}

      {more_line}

      <hr class="divider" />

      <div class="cta-wrap">
        <a href="{app_url}" class="cta-btn">View all {count} new jobs &rarr;</a>
      </div>
      <p class="cta-sub">Tailor your resume and apply directly from the app.</p>
    </div>
    <div class="footer">
      You're receiving this because job alerts are enabled on your JOBEZEE account.<br />
      &copy; 2026 JOBEZEE &middot;
      <a href="{app_url}">Open app</a> &middot;
      <a href="https://www.jobezee.org/privacy">Privacy</a>
    </div>
  </div>
</body>
</html>
"""

_JOB_CARD_HTML = """\
<div class="job-card">
  <div class="job-title">{title}</div>
  <div class="job-company">{company}</div>
  <div class="job-meta">
    {location_tag}
    {type_tag}
    {salary_tag}
    {site_tag}
  </div>
  <a href="{url}" class="view-btn">View Job &rarr;</a>
</div>
"""


def _build_job_cards(jobs: list) -> str:
    cards = []
    for j in jobs:
        loc   = (j.location or "").strip() or "Not specified"
        jtype = (j.job_type or "").replace("_", " ").title() or ""
        sal   = (j.salary_text or "").strip()
        site  = (j.site or j.source or "").title()
        url   = j.url or "#"

        location_tag = f'<span class="tag">{loc}</span>'
        type_tag     = f'<span class="tag">{jtype}</span>' if jtype else ""
        salary_tag   = f'<span class="tag salary">{sal}</span>' if sal else ""
        site_tag     = f'<span class="tag site">{site}</span>' if site else ""

        cards.append(_JOB_CARD_HTML.format(
            title        = j.title or "Untitled",
            company      = j.company or "Unknown Company",
            location_tag = location_tag,
            type_tag     = type_tag,
            salary_tag   = salary_tag,
            site_tag     = site_tag,
            url          = url,
        ))
    return "\n".join(cards)


async def send_new_jobs_email(
    to_email  : str,
    name      : str,
    jobs      : list,   # list of PulledJob ORM objects
    total_count: int,
    app_url   : str = "https://www.jobezee.org/app/search",
) -> None:
    """Send the hourly new-jobs notification email."""
    preview_jobs  = jobs[:5]
    remaining     = total_count - len(preview_jobs)
    more_line     = (
        f'<p style="text-align:center;font-size:13px;color:#64748b;margin:4px 0 0;">'
        f'…and <strong>{remaining} more</strong> waiting in the app.</p>'
    ) if remaining > 0 else ""

    job_cards_html = _build_job_cards(preview_jobs)

    html = _JOBS_HTML.format(
        name       = name or "there",
        count      = total_count,
        job_cards  = job_cards_html,
        more_line  = more_line,
        app_url    = app_url,
    )

    # Plain-text fallback
    lines = [
        f"Hi {name or 'there'},",
        f"",
        f"We found {total_count} new jobs matching your profile. Here's a preview:",
        f"",
    ]
    for j in preview_jobs:
        sal = f" · {j.salary_text}" if j.salary_text else ""
        lines.append(f"• {j.title} at {j.company} ({j.location or 'Remote'}){sal}")
        lines.append(f"  {j.url}")
        lines.append("")
    if remaining > 0:
        lines.append(f"...and {remaining} more in the app.")
    lines += ["", f"View all jobs: {app_url}", "", "— The JOBEZEE Team"]
    text = "\n".join(lines)

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        _send_smtp,
        to_email,
        f"{total_count} new jobs found for you — JOBEZEE",
        html,
        text,
    )


async def send_password_reset_email(to_email: str, name: str, reset_url: str) -> None:
    """Send a password-reset email. Non-blocking (runs SMTP in thread pool)."""
    html = _RESET_HTML.format(name=name or "there", reset_url=reset_url)
    text = (
        f"Hi {name or 'there'},\n\n"
        f"Reset your JOBEZEE password using the link below (valid for 1 hour):\n\n"
        f"{reset_url}\n\n"
        f"If you didn't request this, ignore this email.\n\n"
        f"— The JOBEZEE Team"
    )
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        _send_smtp,
        to_email,
        "Reset your JOBEZEE password",
        html,
        text,
    )
