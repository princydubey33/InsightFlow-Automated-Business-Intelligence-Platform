import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from ..config import settings

logger = logging.getLogger(__name__)

def send_reset_email(to_email: str, reset_link: str) -> bool:
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password:
        logger.error("SMTP configuration is missing. Cannot send email.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Password Reset Request - InsightFlow"
        msg["From"] = settings.smtp_from
        msg["To"] = to_email

        text = f"You requested a password reset. Click the link below to reset your password:\n\n{reset_link}\n\nIf you did not request this, please ignore this email."
        html = f"""
        <html>
          <body>
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your InsightFlow account.</p>
            <p><a href="{reset_link}" style="display:inline-block;padding:10px 20px;background-color:#4F46E5;color:white;text-decoration:none;border-radius:5px;">Reset Password</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p>{reset_link}</p>
            <p><small>If you did not request this, please ignore this email. This link will expire in 1 hour.</small></p>
          </body>
        </html>
        """
        
        part1 = MIMEText(text, "plain")
        part2 = MIMEText(html, "html")
        msg.attach(part1)
        msg.attach(part2)

        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False
