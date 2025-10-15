# app/utils/emailer.py
import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr
from app.core.config import settings

def send_email(to_email: str, subject: str, html_body: str):
    """Send email using SMTP configuration from settings"""
    msg = MIMEText(html_body, "html", "utf-8")
    
    # Use the updated Storm AI Services branding with new email
    from_name = getattr(settings, 'EMAILS_FROM_NAME', 'Storm AI Services')
    from_email = getattr(settings, 'EMAILS_FROM_EMAIL', settings.EMAIL_USER)
    
    msg["From"] = formataddr((from_name, from_email))
    msg["To"] = to_email
    msg["Subject"] = subject

    # Use your existing EMAIL_* settings (compatible with Office365)
    with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=20) as server:
        server.ehlo()
        server.starttls()  # This handles STARTTLS encryption for Office365
        server.ehlo()
        server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
        server.sendmail(settings.EMAIL_USER, [to_email], msg.as_string())