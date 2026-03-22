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
