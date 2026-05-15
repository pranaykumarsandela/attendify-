import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging
import asyncio
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Use environment variables, or fallback to dummy values.
# IMPORTANT: For this to work in production, provide valid SMTP credentials.
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "your_email@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "your_app_password")

def send_email_alert_sync(to_email: str, subject: str, message: str):
    """Synchronous function to send email via SMTP."""
    if not to_email or "@" not in to_email:
        logger.warning(f"Invalid email address: {to_email}")
        return
        
    try:
        # Check if we're using the dummy placeholder credentials
        if SMTP_USERNAME == "your_email@gmail.com":
            logger.info(f"MOCK EMAIL (No SMTP configured) To: {to_email} | Subject: {subject} | Msg: {message}")
            return

        msg = MIMEMultipart()
        msg['From'] = f"FRAS Alerts <{SMTP_USERNAME}>"
        msg['To'] = to_email
        msg['Subject'] = subject

        # HTML body with modern styling
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; max-width: 600px; margin: 0 auto; background: #ffffff;">
                <h2 style="color: #0f172a; border-bottom: 2px solid #06b6d4; padding-bottom: 10px;">FRAS Notification System</h2>
                <p style="font-size: 16px;">{message.replace(chr(10), '<br>')}</p>
                <br>
                <p style="font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px;">
                    This is an automated message from the Face Recognition Attendance System. Please do not reply directly to this email.
                </p>
            </div>
        </body>
        </html>
        """
        msg.attach(MIMEText(html_content, 'html'))

        # Send the email
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"Email successfully sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")

async def send_email_alert(to_email: str, subject: str, message: str):
    """Asynchronous wrapper for sending emails."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, send_email_alert_sync, to_email, subject, message)
