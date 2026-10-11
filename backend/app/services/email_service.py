import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from ..config import settings

logger = logging.getLogger(__name__)

def send_reset_email(to_email: str, reset_link: str) -> bool:
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password:
        logger.error("SMTP configuration is missing (SMTP_HOST, SMTP_USER, or SMTP_PASSWORD not set). Cannot send reset email.")
        return False

    sender = settings.smtp_from if settings.smtp_from else settings.smtp_user

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Password Reset Request - InsightFlow"
        msg["From"] = sender
        msg["To"] = to_email

        text = (
            f"You requested a password reset for your InsightFlow account.\n\n"
            f"Click the link below or copy and paste it into your browser to reset your password:\n"
            f"{reset_link}\n\n"
            f"This link is valid for 1 hour. If you did not request this, please ignore this email."
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
        Click the button below to choose a new password. For security, this link is single-use and will expire in <strong>1 hour</strong>.
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
        logger.info(f"Password reset email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {type(e).__name__} - {str(e)}")
        return False
