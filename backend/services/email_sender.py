import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging
import asyncio
from dotenv import load_dotenv
import urllib.request
import json

load_dotenv()

logger = logging.getLogger(__name__)

GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx50Ah9t-LG_DR7eE_-JcjgYgqtRdwyXGAsqAcukZYV122W00DuotCCmvizeVb0Pxq_/exec"

def send_email_alert_sync(to_email: str, subject: str, message: str):
    """Synchronous function to send email via Google Apps Script."""
    if not to_email or "@" not in to_email:
        logger.warning(f"Invalid email address: {to_email}")
        return
        
    try:
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
        
        payload = {
            "to": to_email,
            "subject": subject,
            "message": html_content
        }
        
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            GOOGLE_SCRIPT_URL, 
            data=data, 
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        )
        
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                logger.info(f"Email sent request pushed to Google Apps Script for {to_email}. Status code: {response.getcode()}")
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            logger.error(f"HTTPError {e.code}: {error_body}")
            raise Exception(f"HTTP Error {e.code}: Forbidden. Make sure Google Apps Script 'Who has access' is set to 'Anyone' (not 'Anyone with Google Account').")
            
    except Exception as e:
        logger.error(f"Failed to send email to {to_email} via Google Apps Script: {e}")
        raise e

async def send_email_alert(to_email: str, subject: str, message: str):
    """Asynchronous wrapper for sending emails."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, send_email_alert_sync, to_email, subject, message)
