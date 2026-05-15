import os
import logging
import asyncio
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER") # e.g. 'whatsapp:+14155238886'

def send_whatsapp_alert_sync(to_number: str, message: str):
    if not to_number:
        logger.warning("No phone number provided for WhatsApp alert.")
        return
        
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        logger.info(f"MOCK WHATSAPP (No Twilio configured) to {to_number}: {message}")
        return
        
    try:
        formatted_number = to_number.strip()
        if not formatted_number.startswith("+"):
            formatted_number = "+91" + formatted_number
            
        if not formatted_number.startswith("whatsapp:"):
            formatted_number = "whatsapp:" + formatted_number
            
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        # Determine sender number (fallback to a default test sandbox if env var is missing)
        from_num = TWILIO_WHATSAPP_NUMBER if TWILIO_WHATSAPP_NUMBER else "whatsapp:+14155238886"
        
        msg = client.messages.create(
            body=message,
            from_=from_num,
            to=formatted_number
        )
        logger.info(f"WhatsApp sent successfully to {formatted_number}. SID: {msg.sid}")
    except Exception as e:
        logger.error(f"Failed to send WhatsApp to {to_number}: {e}")

async def send_whatsapp_alert(to_number: str, message: str):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, send_whatsapp_alert_sync, to_number, message)
