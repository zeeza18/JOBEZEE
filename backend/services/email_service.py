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
  <title>Job Digest &mdash; JOBEZEE</title>
  <style>
    body {{ margin:0; padding:0; background:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif; }}
    .wrapper {{ max-width:600px; margin:32px auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 1px 8px rgba(0,0,0,0.07); }}
    .accent-bar {{ background:#06b6d4; height:4px; }}
    .header {{ background:#0f172a; padding:28px 36px 26px; }}
    .logo {{ font-size:15px; font-weight:800; letter-spacing:2px; color:#ffffff; text-transform:uppercase; }}
    .logo em {{ color:#06b6d4; font-style:normal; }}
    .header-title {{ margin:18px 0 5px; font-size:20px; font-weight:700; color:#ffffff; line-height:1.4; }}
    .header-sub {{ margin:0; font-size:12px; color:#64748b; letter-spacing:0.2px; }}
    .body {{ padding:28px 36px; }}
    .stat-row {{ display:flex; align-items:center; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:16px 20px; margin-bottom:28px; gap:14px; }}
    .stat-num {{ font-size:30px; font-weight:800; color:#0f172a; line-height:1; }}
    .stat-text {{ font-size:13px; color:#64748b; margin:3px 0 0; }}
    .section-label {{ font-size:10px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; color:#94a3b8; margin:0 0 14px; }}
    .job-card {{ border:1px solid #e2e8f0; border-left:3px solid #06b6d4; padding:14px 18px; margin-bottom:10px; background:#ffffff; }}
    .job-title {{ font-size:14px; font-weight:700; color:#0f172a; margin:0 0 3px; }}
    .job-company {{ font-size:13px; color:#64748b; margin:0 0 10px; }}
    .job-meta {{ display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; }}
    .tag {{ display:inline-block; font-size:11px; font-weight:500; padding:2px 8px; border-radius:3px; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; }}
    .tag.salary {{ background:#f0fdf4; color:#15803d; border-color:#bbf7d0; }}
    .tag.source {{ background:#f5f3ff; color:#6d28d9; border-color:#ddd6fe; }}
    .view-link {{ font-size:12px; font-weight:600; color:#06b6d4; text-decoration:none; }}
    .score-high {{ display:inline-block; font-size:11px; font-weight:700; padding:2px 9px; border-radius:12px; background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; white-space:nowrap; }}
    .score-mid  {{ display:inline-block; font-size:11px; font-weight:700; padding:2px 9px; border-radius:12px; background:#fffbeb; color:#b45309; border:1px solid #fde68a; white-space:nowrap; }}
    .score-low  {{ display:inline-block; font-size:11px; font-weight:700; padding:2px 9px; border-radius:12px; background:#fef2f2; color:#dc2626; border:1px solid #fecaca; white-space:nowrap; }}
    .more-note {{ font-size:12px; color:#94a3b8; margin:12px 0 0; text-align:center; }}
    .divider {{ border:none; border-top:1px solid #e2e8f0; margin:24px 0; }}
    .cta-wrap {{ text-align:center; padding:4px 0 8px; }}
    .cta-btn {{ display:inline-block; background:#0f172a; color:#ffffff !important; text-decoration:none; font-size:14px; font-weight:600; padding:12px 32px; border-radius:6px; letter-spacing:0.3px; }}
    .cta-sub {{ text-align:center; font-size:12px; color:#94a3b8; margin:10px 0 0; }}
    .footer {{ padding:18px 36px 24px; font-size:11px; color:#94a3b8; background:#f8fafc; border-top:1px solid #e2e8f0; line-height:1.9; }}
    .footer a {{ color:#64748b; text-decoration:none; }}
    @media(max-width:480px){{
      .body,.header {{ padding:20px 18px; }}
      .footer {{ padding:14px 18px 20px; }}
      .stat-num {{ font-size:24px; }}
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="accent-bar"></div>
    <div class="header">
      <div class="logo">JOB<em>EZEE</em></div>
      <p class="header-title">{count} new roles in your digest</p>
      <p class="header-sub">Compiled from hourly scans &mdash; new listings since your last digest</p>
    </div>
    <div class="body">
      <div class="stat-row">
        <div class="stat-num">{count}</div>
        <div class="stat-text">new listings matching your profile<br />since your last digest</div>
      </div>

      <div class="section-label">Top matches</div>

      {job_cards}

      {more_line}

      <hr class="divider" />

      <div class="cta-wrap">
        <a href="{app_url}" class="cta-btn">Open full job list &rarr;</a>
      </div>
      <p class="cta-sub">Review, tailor your resume, and apply directly from the app.</p>
    </div>
    <div class="footer">
      Hi {name} &mdash; you&rsquo;re receiving this digest because job alerts are enabled on your account.<br />
      &copy; 2026 JOBEZEE &nbsp;&middot;&nbsp;
      <a href="{app_url}">Open app</a> &nbsp;&middot;&nbsp;
      <a href="https://www.jobezee.org/privacy">Privacy</a> &nbsp;&middot;&nbsp;
      <a href="https://www.jobezee.org/settings">Manage alerts</a>
    </div>
  </div>
</body>
</html>
"""

_JOB_CARD_HTML = """\
<div class="job-card">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:3px;">
    <div class="job-title" style="margin:0;">{title}</div>
    {score_badge}
  </div>
  <div class="job-company">{company} &middot; {location}</div>
  <div class="job-meta">
    {type_tag}
    {salary_tag}
    {source_tag}
  </div>
  <a href="{url}" class="view-link">View listing &rarr;</a>
</div>
"""


def _build_job_cards(jobs: list) -> str:
    cards = []
    for j in jobs:
        loc    = (j.location or "").strip() or "Location not specified"
        jtype  = (j.job_type or "").replace("_", " ").title() or ""
        sal    = (j.salary_text or "").strip()
        source = (j.site or getattr(j, "source", "") or "").title()
        url    = j.url or "#"

        type_tag   = f'<span class="tag">{jtype}</span>' if jtype else ""
        salary_tag = f'<span class="tag salary">{sal}</span>' if sal else ""
        source_tag = f'<span class="tag source">{source}</span>' if source else ""

        # Match score badge
        raw_score = getattr(j, "match_score", None)
        if raw_score is not None:
            boosted = min(round(raw_score * 100) + 10, 98)
            cls = "score-high" if boosted >= 70 else ("score-mid" if boosted >= 50 else "score-low")
            score_badge = f'<span class="{cls}">{boosted}% match</span>'
        else:
            score_badge = ""

        cards.append(_JOB_CARD_HTML.format(
            title       = j.title or "Untitled",
            company     = j.company or "Unknown Company",
            location    = loc,
            type_tag    = type_tag,
            salary_tag  = salary_tag,
            source_tag  = source_tag,
            score_badge = score_badge,
            url         = url,
        ))
    return "\n".join(cards)


async def send_new_jobs_email(
    to_email   : str,
    name       : str,
    jobs       : list,   # list of PulledJob ORM objects
    total_count: int,
    app_url    : str = "https://www.jobezee.org/app/search",
) -> None:
    """Send the 5-hour job digest notification email."""
    preview_jobs = jobs[:5]
    remaining    = total_count - len(preview_jobs)
    more_line    = (
        f'<p class="more-note">Plus <strong>{remaining} more</strong> listings available in the app.</p>'
    ) if remaining > 0 else ""

    job_cards_html = _build_job_cards(preview_jobs)

    html = _JOBS_HTML.format(
        name      = name or "there",
        count     = total_count,
        job_cards = job_cards_html,
        more_line = more_line,
        app_url   = app_url,
    )

    # Plain-text fallback
    lines = [
        f"Hi {name or 'there'},",
        "",
        f"Your job digest: {total_count} new listings matching your profile.",
        "",
    ]
    for j in preview_jobs:
        sal = f" · {j.salary_text}" if j.salary_text else ""
        lines.append(f"  {j.title} — {j.company} ({j.location or 'Location not specified'}){sal}")
        lines.append(f"  {j.url}")
        lines.append("")
    if remaining > 0:
        lines.append(f"  Plus {remaining} more listings in the app.")
    lines += ["", f"  View all: {app_url}", "", "JOBEZEE"]
    text = "\n".join(lines)

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        _send_smtp,
        to_email,
        f"Your job digest: {total_count} new roles — JOBEZEE",
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
