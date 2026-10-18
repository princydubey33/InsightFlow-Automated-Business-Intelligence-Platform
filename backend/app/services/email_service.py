import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
import httpx
from ..config import settings

logger = logging.getLogger(__name__)

def send_reset_email(to_email: str, reset_link: str) -> bool:
    text = (
        f"You requested a password reset for your InsightFlow account.\n\n"
        f"Click the link below or copy and paste it into your browser to reset your password:\n"
        f"{reset_link}\n\n"
        f"This link is valid for 24 hours. If you did not request this, please ignore this email."
    )
    html = f"""<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="margin-bottom: 24px;">
        <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px;">Reset Your InsightFlow Password</h2>
        <p style="margin: 0; color: #64748b; font-size: 14px;">We received a request to reset your password.</p>
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        Click the button below to choose a new password. For security, this link is single-use and will expire in <strong>24 hours</strong>.
      </p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="{reset_link}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 14px;">Reset Password</a>
      </div>
      <p style="font-size: 13px; line-height: 1.5; color: #64748b;">
        If the button does not work, copy and paste this link into your browser:
      </p>
      <p style="font-size: 12px; word-break: break-all; color: #4f46e5; background: #f1f5f9; padding: 10px; border-radius: 6px;">
        {reset_link}
      </p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        If you did not request a password reset, no action is needed and your account remains safe.
      </p>
    </div>
  </body>
</html>"""

    # Check for Resend API key (works on port 443, bypassed Render SMTP firewall block)
    resend_key = settings.resend_api_key or (settings.smtp_password if settings.smtp_password.startswith("re_") else "")
    if resend_key:
        try:
            sender = "InsightFlow <onboarding@resend.dev>"
            if settings.smtp_from and not settings.smtp_from.endswith("@gmail.com"):
                sender = f"InsightFlow <{settings.smtp_from}>"

            resp = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": sender,
                    "to": [to_email],
                    "subject": "Password Reset Request - InsightFlow",
                    "html": html,
                    "text": text,
                },
                timeout=15.0
            )
            if resp.status_code in (200, 201):
                logger.info(f"Password reset email delivered to {to_email} via Resend API (HTTPS)")
                return True
            else:
                logger.error(f"Resend API error ({resp.status_code}): {resp.text}")
        except Exception as e:
            logger.error(f"Resend API dispatch error to {to_email}: {e}")

    # Check for Brevo API key (works on port 443)
    brevo_key = settings.brevo_api_key or (settings.smtp_password if settings.smtp_password.startswith("xkeysib-") else "")
    if brevo_key:
        try:
            sender_email = settings.smtp_from if settings.smtp_from else "noreply@insightflow.com"
            resp = httpx.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": brevo_key,
                    "Content-Type": "application/json"
                },
                json={
                    "sender": {"email": sender_email, "name": "InsightFlow"},
                    "to": [{"email": to_email}],
                    "subject": "Password Reset Request - InsightFlow",
                    "htmlContent": html,
                    "textContent": text,
                },
                timeout=15.0
            )
            if resp.status_code in (200, 201):
                logger.info(f"Password reset email delivered to {to_email} via Brevo API (HTTPS)")
                return True
            else:
                logger.error(f"Brevo API error ({resp.status_code}): {resp.text}")
        except Exception as e:
            logger.error(f"Brevo API dispatch error to {to_email}: {e}")

    # Standard SMTP (Port 587 / 465)
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password:
        logger.error("Email configuration is missing (neither RESEND_API_KEY, BREVO_API_KEY, nor SMTP settings are configured).")
        return False

    sender = settings.smtp_from if settings.smtp_from else settings.smtp_user

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Password Reset Request - InsightFlow"
        msg["From"] = sender
        msg["To"] = to_email

        part1 = MIMEText(text, "plain", "utf-8")
        part2 = MIMEText(html, "html", "utf-8")
        msg.attach(part1)
        msg.attach(part2)

        timeout = 15
        if settings.smtp_port == 465:
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=timeout)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=timeout)
            server.starttls()

        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(sender, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Password reset email sent to {to_email} via SMTP")
        return True
    except Exception as e:
        logger.error(
            f"Failed to send email to {to_email} via SMTP: {type(e).__name__} - {str(e)}. "
            "Note: Render Free Tier blocks outbound SMTP traffic on ports 25, 465, and 587. "
            "To send emails from Render Free Tier, use RESEND_API_KEY or Brevo API over HTTPS (Port 443)."
        )
        return False
