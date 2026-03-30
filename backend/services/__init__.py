"""Shared WhatsApp messaging service - avoids circular imports between routes."""
import os
import requests as req
from datetime import datetime, timezone


def _get_api_key():
    return (os.environ.get("INTERAKT_API_KEY", "") or "").strip('"').strip("'")


def interakt_auth_header():
    return f"Basic {_get_api_key()}"


def clean_phone_number(phone: str):
    clean = phone.replace("+", "").replace(" ", "").replace("-", "")
    if clean.startswith("91") and len(clean) > 10:
        clean = clean[2:]
    return clean


INTERAKT_API_URL = "https://api.interakt.ai/v1/public/message/"


async def send_whatsapp_message(phone: str, text: str, country_code: str = "+91", callback_data: str = "wa_bot_reply"):
    from db import wa_message_status_col  # Lazy import to avoid startup crash

    headers = {
        "Authorization": interakt_auth_header(),
        "Content-Type": "application/json",
    }
    clean_phone = clean_phone_number(phone)
    payload = {
        "countryCode": country_code,
        "phoneNumber": clean_phone,
        "callbackData": callback_data,
        "type": "Text",
        "data": {"message": text}
    }
    try:
        resp = req.post(INTERAKT_API_URL, json=payload, headers=headers, timeout=15)
        result = resp.json()
        msg_id = result.get("id", "")
        if msg_id:
            await wa_message_status_col.insert_one({
                "message_id": msg_id,
                "phone": clean_phone,
                "type": "text",
                "status": "queued",
                "callback_data": callback_data,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        return {"success": resp.status_code in (200, 201), "data": result, "message_id": msg_id}
    except Exception as e:
        return {"success": False, "error": str(e)}
