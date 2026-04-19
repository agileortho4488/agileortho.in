from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone
import os
import json
import asyncio
import requests as req

from db import (
    leads_col, wa_conversations_col, wa_message_status_col, wa_webhook_logs_col
)
from helpers import admin_required, EMERGENT_LLM_KEY

router = APIRouter()

INTERAKT_API_KEY = (os.environ.get("INTERAKT_API_KEY", "") or "").strip('"').strip("'")
INTERAKT_API_URL = "https://api.interakt.ai/v1/public/message/"
INTERAKT_TRACK_URL = "https://api.interakt.ai/v1/public/track/users/"
INTERAKT_EVENT_URL = "https://api.interakt.ai/v1/public/track/events/"
INTERAKT_WEBHOOK_SECRET = (os.environ.get("INTERAKT_WEBHOOK_SECRET", "") or "").strip('"').strip("'")
WHATSAPP_NUMBER = (os.environ.get("WHATSAPP_BUSINESS_NUMBER", "+917416521222") or "").strip('"').strip("'")


def interakt_auth_header():
    return f"Basic {INTERAKT_API_KEY}"


def clean_phone_number(phone: str):
    clean = phone.replace("+", "").replace(" ", "").replace("-", "")
    if clean.startswith("91") and len(clean) > 10:
        clean = clean[2:]
    return clean


async def send_whatsapp_message(phone: str, text: str, country_code: str = "+91", callback_data: str = "wa_bot_reply"):
    """Delegates to shared service to avoid circular imports."""
    from services import send_whatsapp_message as _send
    return await _send(phone, text, country_code, callback_data)


async def send_whatsapp_template(phone: str, template_name: str, language_code: str = "en",
                                  body_values: list = None, header_values: list = None,
                                  button_values: dict = None, country_code: str = "+91",
                                  callback_data: str = "wa_template"):
    headers = {
        "Authorization": interakt_auth_header(),
        "Content-Type": "application/json",
    }
    clean_phone = clean_phone_number(phone)
    template = {
        "name": template_name,
        "languageCode": language_code,
    }
    if body_values:
        template["bodyValues"] = body_values
    if header_values:
        template["headerValues"] = header_values
    if button_values:
        template["buttonValues"] = button_values

    payload = {
        "countryCode": country_code,
        "phoneNumber": clean_phone,
        "callbackData": callback_data,
        "type": "Template",
        "template": template,
    }
    try:
        resp = req.post(INTERAKT_API_URL, json=payload, headers=headers, timeout=15)
        result = resp.json()
        msg_id = result.get("id", "")
        if msg_id:
            await wa_message_status_col.insert_one({
                "message_id": msg_id,
                "phone": clean_phone,
                "type": "template",
                "template_name": template_name,
                "status": "queued",
                "callback_data": callback_data,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        return {"success": resp.status_code in (200, 201), "data": result, "message_id": msg_id}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def track_user_in_interakt(phone: str, name: str = "", email: str = "",
                                  traits: dict = None, tags: list = None):
    headers = {
        "Authorization": interakt_auth_header(),
        "Content-Type": "application/json",
    }
    clean_phone = clean_phone_number(phone)
    user_traits = {"name": name} if name else {}
    if email:
        user_traits["email"] = email
    if traits:
        user_traits.update(traits)

    payload = {
        "phoneNumber": clean_phone,
        "countryCode": "+91",
        "traits": user_traits,
    }
    if tags:
        payload["tags"] = tags

    try:
        resp = req.post(INTERAKT_TRACK_URL, json=payload, headers=headers, timeout=15)
        return {"success": resp.status_code in (200, 201, 202), "data": resp.json()}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def track_event_in_interakt(phone: str, event_name: str, event_traits: dict = None):
    headers = {
        "Authorization": interakt_auth_header(),
        "Content-Type": "application/json",
    }
    clean_phone = clean_phone_number(phone)
    payload = {
        "phoneNumber": clean_phone,
        "countryCode": "+91",
        "event": event_name,
    }
    if event_traits:
        payload["traits"] = event_traits

    try:
        resp = req.post(INTERAKT_EVENT_URL, json=payload, headers=headers, timeout=15)
        return {"success": resp.status_code in (200, 201), "data": resp.json()}
    except Exception as e:
        return {"success": False, "error": str(e)}


# -- Interactive Messages (List / Button) — session messages inside 24h window --

async def send_whatsapp_interactive_list(
    phone: str,
    body_text: str,
    sections: list,
    button_label: str = "Choose",
    header_text: str = "",
    footer_text: str = "",
    country_code: str = "+91",
    callback_data: str = "funnel_list",
):
    """Send a WhatsApp Interactive List message via Interakt session API.

    `sections` shape: [{"title": "...", "rows": [{"id": "...", "title": "...", "description": "..."}]}]
    Returns {success, message_id, data} — on failure we never raise, caller
    may fall back to plain text.
    """
    headers = {"Authorization": interakt_auth_header(), "Content-Type": "application/json"}
    clean_phone = clean_phone_number(phone)

    # Enforce WhatsApp character limits (silent truncation is safer than API reject)
    def _trunc(s, n):
        return (s or "")[:n]
    sane_sections = []
    for s in sections[:10]:
        sane_sections.append({
            "title": _trunc(s.get("title", ""), 24),
            "rows": [
                {
                    "id": _trunc(r["id"], 200),
                    "title": _trunc(r["title"], 23),
                    **({"description": _trunc(r["description"], 72)} if r.get("description") else {}),
                }
                for r in s.get("rows", [])[:10]
            ],
        })

    data_block = {
        "type": "list",
        "body": {"text": _trunc(body_text, 1024)},
        "action": {
            "button": _trunc(button_label, 20),
            "sections": sane_sections,
        },
    }
    if header_text:
        data_block["header"] = {"type": "text", "text": _trunc(header_text, 60)}
    if footer_text:
        data_block["footer"] = {"text": _trunc(footer_text, 60)}

    payload = {
        "countryCode": country_code,
        "phoneNumber": clean_phone,
        "callbackData": callback_data,
        "type": "InteractiveList",
        "data": {"message": data_block},
    }
    try:
        resp = req.post(INTERAKT_API_URL, json=payload, headers=headers, timeout=15)
        result = resp.json() if resp.content else {}
        msg_id = result.get("id", "")
        if msg_id:
            await wa_message_status_col.insert_one({
                "message_id": msg_id,
                "phone": clean_phone,
                "type": "interactive_list",
                "status": "queued",
                "callback_data": callback_data,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        return {
            "success": resp.status_code in (200, 201),
            "status_code": resp.status_code,
            "data": result,
            "message_id": msg_id,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def send_whatsapp_interactive_buttons(
    phone: str,
    body_text: str,
    buttons: list,
    header_text: str = "",
    footer_text: str = "",
    country_code: str = "+91",
    callback_data: str = "funnel_buttons",
):
    """Send a WhatsApp Interactive Reply Buttons message (max 3 buttons)."""
    headers = {"Authorization": interakt_auth_header(), "Content-Type": "application/json"}
    clean_phone = clean_phone_number(phone)

    def _trunc(s, n):
        return (s or "")[:n]

    sane_buttons = [
        {"type": "reply", "reply": {"id": _trunc(b["id"], 200), "title": _trunc(b["title"], 20)}}
        for b in buttons[:3]
    ]

    data_block = {
        "type": "button",
        "body": {"text": _trunc(body_text, 1024)},
        "action": {"buttons": sane_buttons},
    }
    if header_text:
        data_block["header"] = {"type": "text", "text": _trunc(header_text, 60)}
    if footer_text:
        data_block["footer"] = {"text": _trunc(footer_text, 60)}

    payload = {
        "countryCode": country_code,
        "phoneNumber": clean_phone,
        "callbackData": callback_data,
        "type": "InteractiveButton",
        "data": {"message": data_block},
    }
    try:
        resp = req.post(INTERAKT_API_URL, json=payload, headers=headers, timeout=15)
        result = resp.json() if resp.content else {}
        msg_id = result.get("id", "")
        return {
            "success": resp.status_code in (200, 201),
            "status_code": resp.status_code,
            "data": result,
            "message_id": msg_id,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}




WA_SYSTEM_PROMPT = """You are Agile Ortho's WhatsApp sales assistant. You're chatting on WhatsApp — be BRIEF and conversational.

RULES:
- MAX 2 sentences per reply. Use WhatsApp-style short messages.
- Be warm: use "Hi Doctor", "Sure!", "Absolutely!"
- NEVER give pricing. Say "I'll connect you with our team for best bulk rates"
- When user shares name/hospital/district — acknowledge warmly
- Suggest relevant products from CONTEXT below
- For human support, share the right contact number

CONTACTS:
- Dispatch: 7416818183
- Ortho/Spine: 7416162350
- General: 7416216262
- Consumables: 7416416871
- Billing: 7416416093

PRODUCTS:
{product_context}"""


WELCOME_MSG = """Hi! Welcome to *Agile Ortho* — Telangana's authorized Meril Life Sciences distributor.

I can help you with:
1. Product info & specifications
2. Bulk pricing quotations
3. Connect with our specialists

What are you looking for today?"""

async def _ensure_wa_lead(phone: str, customer_name: str, first_message: str):
    """Ensure a lead exists for this phone number (idempotent)."""
    existing = await leads_col.find_one({"phone_whatsapp": phone})
    if existing:
        return
    await leads_col.insert_one({
        "name": customer_name or f"WhatsApp {phone}",
        "phone_whatsapp": phone,
        "hospital_clinic": "", "email": "", "district": "",
        "inquiry_type": "WhatsApp Chat",
        "product_interest": (first_message or "")[:100],
        "source": "whatsapp",
        "score": "Cold", "score_value": 15,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })




def chunk_message(text: str, max_len: int = 300) -> list:
    """Split long AI response into WhatsApp-friendly chunks."""
    if len(text) <= max_len:
        return [text]

    chunks = []
    paragraphs = text.split("\n\n")

    current = ""
    for para in paragraphs:
        if len(current) + len(para) + 2 > max_len and current:
            chunks.append(current.strip())
            current = para
        else:
            current = current + "\n\n" + para if current else para

    if current.strip():
        chunks.append(current.strip())

    if not chunks:
        chunks = [text[:max_len], text[max_len:]] if len(text) > max_len else [text]

    return chunks[:3]


async def handle_wa_incoming(phone: str, message_text: str, customer_name: str = ""):
    from routes.chat import search_relevant_products, format_product_context
    from routes.automation import update_lead_from_conversation, schedule_followups
    from services.whatsapp_funnel import try_handle_funnel

    session_id = f"wa-{phone}"
    conv = await wa_conversations_col.find_one({"phone": phone})
    is_new = conv is None

    if is_new:
        await wa_conversations_col.insert_one({
            "phone": phone,
            "session_id": session_id,
            "customer_name": customer_name or phone,
            "messages": [],
            "status": "active",
            "unread": 0,
            "lead_created": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        conv = await wa_conversations_col.find_one({"phone": phone})

    # Save incoming message immediately
    incoming_msg = {
        "role": "customer",
        "content": message_text,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "channel": "whatsapp",
    }
    await wa_conversations_col.update_one(
        {"phone": phone},
        {
            "$push": {"messages": incoming_msg},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
            "$inc": {"unread": 1},
        }
    )

    # --- 1) Try the Conversational Funnel first ---
    funnel_mode = (os.environ.get("WHATSAPP_FUNNEL_MODE", "text") or "text").strip().lower()
    funnel_replies = await try_handle_funnel(phone, message_text, customer_name or "", mode=funnel_mode)
    if funnel_replies:
        for i, payload in enumerate(funnel_replies):
            ptype = payload.get("type", "text")
            sent_ok = False
            if ptype == "interactive_list" and funnel_mode == "interactive":
                r = await send_whatsapp_interactive_list(
                    phone,
                    body_text=payload.get("body", ""),
                    sections=payload.get("sections", []),
                    button_label=payload.get("button", "Choose"),
                    header_text=payload.get("header", ""),
                    footer_text=payload.get("footer", ""),
                    callback_data=f"funnel_list_{i}",
                )
                sent_ok = r.get("success", False)
            elif ptype == "interactive_buttons" and funnel_mode == "interactive":
                r = await send_whatsapp_interactive_buttons(
                    phone,
                    body_text=payload.get("body", ""),
                    buttons=payload.get("buttons", []),
                    header_text=payload.get("header", ""),
                    footer_text=payload.get("footer", ""),
                    callback_data=f"funnel_buttons_{i}",
                )
                sent_ok = r.get("success", False)

            # Fallback to text if interactive send failed OR it was already text
            if not sent_ok:
                text_body = payload.get("text") or payload.get("body") or ""
                await send_whatsapp_message(phone, text_body, callback_data=f"funnel_{i}")

            if i < len(funnel_replies) - 1:
                await asyncio.sleep(1.0)

            # Save bot reply transcript (use human-readable body)
            transcript = payload.get("text") or payload.get("body") or ""
            await wa_conversations_col.update_one(
                {"phone": phone},
                {
                    "$push": {"messages": {
                        "role": "assistant",
                        "content": transcript,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "channel": "whatsapp",
                        "source": "funnel",
                        "payload_type": ptype,
                    }},
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
                }
            )

        # Ensure a lead exists (first-touch) — funnel will upgrade it later
        if not conv.get("lead_created"):
            await _ensure_wa_lead(phone, customer_name, message_text)
            await wa_conversations_col.update_one(
                {"phone": phone}, {"$set": {"lead_created": True}}
            )
            asyncio.create_task(track_user_in_interakt(
                phone, name=customer_name or f"WhatsApp {phone}",
                tags=["whatsapp-lead", "funnel-entered"]
            ))
        last = funnel_replies[-1]
        return last.get("text") or last.get("body") or ""

    # NOTE: Welcome message removed — Interakt's own auto-reply handles greeting.
    # Our bot only sends ONE contextual AI reply per incoming message.

    # Product search + shorter WhatsApp prompt
    relevant_products = await search_relevant_products(message_text)
    product_context = format_product_context(relevant_products)
    system_prompt = WA_SYSTEM_PROMPT.replace("{product_context}", product_context)

    history = conv.get("messages", []) if conv else []
    initial_msgs = [{"role": "system", "content": system_prompt}]
    for h in history[-6:]:
        role = "user" if h["role"] == "customer" else "assistant"
        initial_msgs.append({"role": role, "content": h["content"]})

    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"wa-chat-{phone}",
        system_message=system_prompt,
        initial_messages=initial_msgs,
    ).with_model("anthropic", "claude-sonnet-4-20250514")

    try:
        ai_response = await chat.send_message(UserMessage(text=message_text))
    except Exception:
        ai_response = "Thanks for your message! Our team will get back to you shortly. For urgent queries, call 7416216262."

    # IMPROVEMENT 3: Message chunking — split into natural chat-size pieces
    chunks = chunk_message(ai_response)
    for i, chunk in enumerate(chunks):
        await send_whatsapp_message(phone, chunk, callback_data=f"ai_reply_{i}")
        if i < len(chunks) - 1:
            await asyncio.sleep(1.5)  # Natural typing delay between chunks

    # Save AI response
    outgoing_msg = {
        "role": "assistant",
        "content": ai_response,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "channel": "whatsapp",
    }
    await wa_conversations_col.update_one(
        {"phone": phone},
        {
            "$push": {"messages": outgoing_msg},
            "$set": {
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "customer_name": customer_name or conv.get("customer_name", phone),
            },
        }
    )

    # IMPROVEMENT 6: Automated lead extraction + follow-up scheduling
    updated_conv = await wa_conversations_col.find_one({"phone": phone})
    customer_msgs = [m for m in updated_conv.get("messages", []) if m.get("role") == "customer"]

    # Extract lead info after every 2nd customer message
    if len(customer_msgs) >= 2 and len(customer_msgs) % 2 == 0:
        try:
            result = await update_lead_from_conversation(phone, updated_conv)
            if result:
                info, score_value, score_label = result
                await schedule_followups(phone, score_label, updated_conv)

                # Track in Interakt
                asyncio.create_task(track_user_in_interakt(
                    phone,
                    name=info.get("name") or customer_name or f"WhatsApp {phone}",
                    traits={k: v for k, v in info.items() if v and isinstance(v, str)},
                    tags=["whatsapp-lead", f"score-{score_label}"]
                ))
        except Exception as e:
            print(f"[WA] Lead extraction error for {phone}: {e}")
    elif len(customer_msgs) == 1 and not conv.get("lead_created"):
        # First message — create basic lead
        lead = {
            "name": customer_name or f"WhatsApp {phone}",
            "phone_whatsapp": phone,
            "hospital_clinic": "", "email": "", "district": "",
            "inquiry_type": "WhatsApp Chat",
            "product_interest": message_text[:100],
            "source": "whatsapp",
            "score": "cold", "score_value": 15,
            "status": "new",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await leads_col.insert_one(lead)
        await wa_conversations_col.update_one(
            {"phone": phone}, {"$set": {"lead_created": True}}
        )
        await schedule_followups(phone, "cold", updated_conv)

        asyncio.create_task(track_user_in_interakt(
            phone, name=customer_name or f"WhatsApp {phone}",
            tags=["whatsapp-lead", "auto-created", "score-cold"]
        ))
        asyncio.create_task(track_event_in_interakt(
            phone, "WhatsApp Conversation Started",
            {"source": "whatsapp", "first_message": message_text[:100]}
        ))

    return ai_response


def verify_interakt_signature(raw_body: bytes, signature: str) -> bool:
    if not INTERAKT_WEBHOOK_SECRET or not signature:
        return not INTERAKT_WEBHOOK_SECRET
    import hmac as hmac_mod
    from hashlib import sha256
    expected = "sha256=" + hmac_mod.new(
        INTERAKT_WEBHOOK_SECRET.encode("utf-8"), raw_body, sha256
    ).hexdigest()
    return hmac_mod.compare_digest(expected, signature)


# --- Webhook ---

@router.post("/api/webhook/whatsapp")
async def whatsapp_webhook(request: Request):
    try:
        raw_body = await request.body()
        payload = json.loads(raw_body)
    except Exception:
        return {"status": "error", "message": "Invalid payload"}

    signature = request.headers.get("Interakt-Signature", "")
    sig_valid = verify_interakt_signature(raw_body, signature)
    if INTERAKT_WEBHOOK_SECRET and not sig_valid:
        print(f"[WEBHOOK] Signature mismatch — event={payload.get('type','?')}, has_sig={bool(signature)}")

    event_type = payload.get("type", "")
    data = payload.get("data", {})

    print(f"[WEBHOOK] Received: type={event_type}, phone={data.get('customer', {}).get('channel_phone_number', '')}")
    await wa_webhook_logs_col.insert_one({
        "event_type": event_type,
        "timestamp": payload.get("timestamp", datetime.now(timezone.utc).isoformat()),
        "received_at": datetime.now(timezone.utc).isoformat(),
        "signature_valid": sig_valid,
        "has_signature": bool(signature),
        "data_summary": {
            "phone": data.get("customer", {}).get("channel_phone_number", ""),
            "message_id": data.get("message", {}).get("id", ""),
        },
        "raw_keys": list(payload.keys()),
    })

    if event_type == "message_received":
        customer = data.get("customer", {})
        message = data.get("message", {})
        phone = customer.get("channel_phone_number", "")
        customer_name = customer.get("traits", {}).get("name", "")
        message_text = message.get("message", "")

        # Interactive reply → encode row/button id as text so the funnel can route it.
        # Interakt delivers interactive replies in TWO possible shapes:
        #   (a) structured:  message.type=="interactive", message.interactive.{list_reply|button_reply}.id
        #   (b) stringified: message.message == '{"type":"list_reply","list_reply":{"id":"div:..."}}'
        #       (this is what Interakt actually does for the public API)
        msg_type = (message.get("type") or "").lower()
        interactive_block = message.get("interactive") or {}

        # Shape (b): parse JSON blob from message.message
        if isinstance(message_text, str) and message_text.strip().startswith("{") and "list_reply" in message_text + "button_reply":
            try:
                parsed = json.loads(message_text)
                itype = (parsed.get("type") or "").lower()
                if itype == "list_reply":
                    rid = (parsed.get("list_reply") or {}).get("id", "")
                    if rid:
                        message_text = rid
                elif itype == "button_reply":
                    bid = (parsed.get("button_reply") or {}).get("id", "")
                    if bid:
                        message_text = bid
            except Exception:
                pass
        # Shape (a): structured interactive field
        elif msg_type == "interactive" and interactive_block:
            itype = (interactive_block.get("type") or "").lower()
            if itype == "list_reply":
                rid = (interactive_block.get("list_reply") or {}).get("id", "")
                if rid:
                    message_text = rid
            elif itype == "button_reply":
                bid = (interactive_block.get("button_reply") or {}).get("id", "")
                if bid:
                    message_text = bid

        if phone and message_text:
            conv = await wa_conversations_col.find_one({"phone": phone})
            if conv and conv.get("status") == "human":
                incoming_msg = {
                    "role": "customer",
                    "content": message_text,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "channel": "whatsapp",
                }
                await wa_conversations_col.update_one(
                    {"phone": phone},
                    {
                        "$push": {"messages": incoming_msg},
                        "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
                        "$inc": {"unread": 1},
                    }
                )
            else:
                asyncio.create_task(handle_wa_incoming(phone, message_text, customer_name))

    elif event_type in ("message_api_sent", "message_api_delivered", "message_api_read",
                        "message_api_failed", "message_api_clicked"):
        message = data.get("message", {})
        msg_id = message.get("id", "")
        status_map = {
            "message_api_sent": "sent",
            "message_api_delivered": "delivered",
            "message_api_read": "read",
            "message_api_failed": "failed",
            "message_api_clicked": "clicked",
        }
        new_status = status_map.get(event_type, event_type)
        update_fields = {
            "status": new_status,
            f"{new_status}_at": datetime.now(timezone.utc).isoformat(),
            "phone": data.get("customer", {}).get("channel_phone_number", ""),
        }
        if event_type == "message_api_failed":
            update_fields["failure_reason"] = message.get("channel_failure_reason", "")
            update_fields["error_code"] = message.get("channel_error_code", "")
        if event_type == "message_api_clicked":
            update_fields["click_type"] = data.get("event", {}).get("click_type", "")
            update_fields["button_text"] = data.get("event", {}).get("button_text", "")
        if msg_id:
            await wa_message_status_col.update_one(
                {"message_id": msg_id},
                {"$set": update_fields},
                upsert=True,
            )

    elif event_type in ("message_campaign_sent", "message_campaign_delivered",
                        "message_campaign_read", "message_campaign_failed"):
        message = data.get("message", {})
        customer = data.get("customer", {})
        msg_id = message.get("id", "")
        phone = customer.get("channel_phone_number", data.get("customer", {}).get("phone_number", ""))
        customer_name = customer.get("traits", {}).get("name", phone)
        campaign_id = message.get("campaign_id", data.get("campaign_id", ""))
        status_map = {
            "message_campaign_sent": "sent",
            "message_campaign_delivered": "delivered",
            "message_campaign_read": "read",
            "message_campaign_failed": "failed",
        }
        new_status = status_map.get(event_type, event_type)

        # 1. Track delivery status
        status_update = {
            "status": new_status,
            "source": "campaign",
            f"{new_status}_at": datetime.now(timezone.utc).isoformat(),
            "phone": phone,
            "campaign_id": campaign_id,
        }
        if event_type == "message_campaign_failed":
            status_update["failure_reason"] = message.get("channel_failure_reason", "")

        status_key = msg_id or f"campaign_{phone}_{campaign_id}"
        await wa_message_status_col.update_one(
            {"message_id": status_key},
            {"$set": status_update},
            upsert=True,
        )

        # 2. Create/update conversation so it appears in the dashboard
        if phone:
            now_iso = datetime.now(timezone.utc).isoformat()
            campaign_msg = {
                "direction": "outbound",
                "text": f"[Campaign] Status: {new_status}",
                "timestamp": now_iso,
                "type": "campaign",
                "campaign_id": campaign_id,
                "status": new_status,
            }
            existing = await wa_conversations_col.find_one({"phone": phone})
            if existing:
                await wa_conversations_col.update_one(
                    {"phone": phone},
                    {
                        "$set": {"updated_at": now_iso, "last_campaign_status": new_status},
                        "$push": {"messages": {"$each": [campaign_msg], "$slice": -100}},
                        "$inc": {"message_count": 1},
                    },
                )
            else:
                await wa_conversations_col.insert_one({
                    "phone": phone,
                    "customer_name": customer_name or phone,
                    "session_id": f"campaign_{phone}",
                    "status": "campaign",
                    "source": "campaign",
                    "messages": [campaign_msg],
                    "message_count": 1,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "last_campaign_status": new_status,
                    "campaign_id": campaign_id,
                })

    elif event_type == "message_template_status_update":
        template_event = data.get("event", "")
        template_name = data.get("message_template_name", "")
        template_lang = data.get("message_template_language", "")
        reason = data.get("reason")
        await wa_webhook_logs_col.update_one(
            {"event_type": event_type, "received_at": {"$exists": True}},
            {"$set": {
                "template_name": template_name,
                "template_status": template_event,
                "template_language": template_lang,
                "rejection_reason": reason,
            }},
            upsert=False,
        )

    elif event_type in ("account_alerts", "account_update", "account_review_update",
                        "business_capability_update", "phone_number_quality_update",
                        "template_performance_metrics", "messages"):
        pass

    return {"status": "success", "code": 200}


# --- Admin WhatsApp endpoints ---

@router.get("/api/admin/whatsapp/conversations")
async def get_wa_conversations(_=Depends(admin_required)):
    cursor = wa_conversations_col.find({}, {"_id": 0}).sort("updated_at", -1).limit(100)
    conversations = []
    async for doc in cursor:
        msgs = doc.get("messages", [])
        last_msg = msgs[-1] if msgs else None
        conversations.append({
            "phone": doc["phone"],
            "session_id": doc.get("session_id", ""),
            "customer_name": doc.get("customer_name", doc["phone"]),
            "status": doc.get("status", "active"),
            "unread": doc.get("unread", 0),
            "message_count": len(msgs),
            "last_message": last_msg.get("content", "")[:100] if last_msg else "",
            "last_message_role": last_msg.get("role", "") if last_msg else "",
            "last_message_time": last_msg.get("timestamp", "") if last_msg else "",
            "lead_created": doc.get("lead_created", False),
            "created_at": doc.get("created_at", ""),
            "updated_at": doc.get("updated_at", ""),
        })
    return {"conversations": conversations, "total": len(conversations)}


@router.get("/api/admin/whatsapp/conversations/{phone}")
async def get_wa_conversation(phone: str, _=Depends(admin_required)):
    doc = await wa_conversations_col.find_one({"phone": phone}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Conversation not found")
    await wa_conversations_col.update_one({"phone": phone}, {"$set": {"unread": 0}})
    return doc


@router.post("/api/admin/whatsapp/send")
async def admin_send_wa_message(request: Request, _=Depends(admin_required)):
    body = await request.json()
    phone = body.get("phone", "")
    message = body.get("message", "")
    if not phone or not message:
        raise HTTPException(400, "Phone and message are required")

    result = await send_whatsapp_message(phone, message)

    admin_msg = {
        "role": "admin",
        "content": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "channel": "whatsapp",
    }
    await wa_conversations_col.update_one(
        {"phone": phone},
        {
            "$push": {"messages": admin_msg},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
        upsert=True,
    )

    return {"success": result.get("success", False), "message": "Reply sent"}


@router.post("/api/admin/whatsapp/conversations/{phone}/takeover")
async def admin_takeover_conversation(phone: str, _=Depends(admin_required)):
    await wa_conversations_col.update_one(
        {"phone": phone},
        {"$set": {"status": "human", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Conversation switched to human mode"}


@router.post("/api/admin/whatsapp/conversations/{phone}/automate")
async def admin_automate_conversation(phone: str, _=Depends(admin_required)):
    await wa_conversations_col.update_one(
        {"phone": phone},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Conversation switched back to AI mode"}


@router.post("/api/admin/whatsapp/send-template")
async def admin_send_template(request: Request, _=Depends(admin_required)):
    body = await request.json()
    phone = body.get("phone", "")
    template_name = body.get("template_name", "")
    language_code = body.get("language_code", "en")
    body_values = body.get("body_values", [])
    header_values = body.get("header_values", [])
    button_values = body.get("button_values")

    if not phone or not template_name:
        raise HTTPException(400, "Phone and template_name are required")

    result = await send_whatsapp_template(
        phone, template_name, language_code,
        body_values=body_values or None,
        header_values=header_values or None,
        button_values=button_values,
        callback_data=f"template_{template_name}",
    )

    template_msg = {
        "role": "admin",
        "content": f"[Template: {template_name}] " + (", ".join(body_values) if body_values else ""),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "channel": "whatsapp",
        "type": "template",
        "template_name": template_name,
    }
    await wa_conversations_col.update_one(
        {"phone": phone},
        {
            "$push": {"messages": template_msg},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
        upsert=True,
    )

    return {"success": result.get("success", False), "message": "Template sent", "data": result.get("data")}


@router.post("/api/admin/whatsapp/sync-lead")
async def admin_sync_lead_to_interakt(request: Request, _=Depends(admin_required)):
    body = await request.json()
    lead_id = body.get("lead_id", "")
    if not lead_id:
        raise HTTPException(400, "lead_id is required")

    lead = await leads_col.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Lead not found")

    phone = lead.get("phone_whatsapp", "")
    if not phone:
        raise HTTPException(400, "Lead has no WhatsApp number")

    tags = ["crm-lead"]
    if lead.get("score"):
        tags.append(f"score-{lead['score'].lower()}")
    if lead.get("source"):
        tags.append(f"source-{lead['source'].lower()}")

    traits = {
        "name": lead.get("name", ""),
        "email": lead.get("email", ""),
        "hospital": lead.get("hospital_clinic", ""),
        "district": lead.get("district", ""),
        "inquiry_type": lead.get("inquiry_type", ""),
        "product_interest": lead.get("product_interest", ""),
        "lead_status_crm": lead.get("status", ""),
    }
    traits = {k: v for k, v in traits.items() if v}

    result = await track_user_in_interakt(phone, name=lead.get("name", ""), email=lead.get("email", ""),
                                           traits=traits, tags=tags)
    return {"success": result.get("success", False), "data": result.get("data")}


@router.post("/api/admin/whatsapp/sync-all-leads")
async def admin_sync_all_leads(request: Request, _=Depends(admin_required)):
    cursor = leads_col.find({"phone_whatsapp": {"$ne": ""}}, {"_id": 0})
    synced = 0
    failed = 0
    async for lead in cursor:
        phone = lead.get("phone_whatsapp", "")
        if not phone:
            continue
        tags = ["crm-lead"]
        if lead.get("score"):
            tags.append(f"score-{lead['score'].lower()}")
        traits = {
            "name": lead.get("name", ""),
            "email": lead.get("email", ""),
            "hospital": lead.get("hospital_clinic", ""),
            "district": lead.get("district", ""),
            "lead_status_crm": lead.get("status", ""),
        }
        traits = {k: v for k, v in traits.items() if v}
        result = await track_user_in_interakt(phone, name=lead.get("name", ""),
                                               email=lead.get("email", ""),
                                               traits=traits, tags=tags)
        if result.get("success"):
            synced += 1
        else:
            failed += 1

    return {"synced": synced, "failed": failed, "total": synced + failed}


@router.post("/api/admin/whatsapp/track-event")
async def admin_track_event(request: Request, _=Depends(admin_required)):
    body = await request.json()
    phone = body.get("phone", "")
    event_name = body.get("event", "")
    event_traits = body.get("traits", {})

    if not phone or not event_name:
        raise HTTPException(400, "phone and event are required")

    result = await track_event_in_interakt(phone, event_name, event_traits)
    return {"success": result.get("success", False), "data": result.get("data")}


@router.get("/api/admin/whatsapp/analytics")
async def get_wa_analytics(_=Depends(admin_required)):
    total_convs = await wa_conversations_col.count_documents({})
    active_convs = await wa_conversations_col.count_documents({"status": "active"})
    human_convs = await wa_conversations_col.count_documents({"status": "human"})

    total_msgs = await wa_message_status_col.count_documents({})
    sent_msgs = await wa_message_status_col.count_documents({"status": "sent"})
    delivered_msgs = await wa_message_status_col.count_documents({"status": "delivered"})
    read_msgs = await wa_message_status_col.count_documents({"status": "read"})
    failed_msgs = await wa_message_status_col.count_documents({"status": "failed"})
    queued_msgs = await wa_message_status_col.count_documents({"status": "queued"})
    template_msgs = await wa_message_status_col.count_documents({"type": "template"})

    pipeline = [
        {"$project": {"msg_count": {"$size": {"$ifNull": ["$messages", []]}}}},
        {"$group": {"_id": None, "total": {"$sum": "$msg_count"}}},
    ]
    agg = await wa_conversations_col.aggregate(pipeline).to_list(1)
    total_chat_msgs = agg[0]["total"] if agg else 0

    # Campaign stats from message status tracking
    campaign_total = await wa_message_status_col.count_documents({"source": "campaign"})
    campaign_delivered = await wa_message_status_col.count_documents({"source": "campaign", "status": "delivered"})
    campaign_read = await wa_message_status_col.count_documents({"source": "campaign", "status": "read"})
    campaign_failed = await wa_message_status_col.count_documents({"source": "campaign", "status": "failed"})
    campaign_convs = await wa_conversations_col.count_documents({"source": "campaign"})

    return {
        "conversations": {
            "total": total_convs,
            "ai_active": active_convs,
            "human_takeover": human_convs,
            "total_messages": total_chat_msgs,
        },
        "delivery": {
            "total_tracked": total_msgs,
            "queued": queued_msgs,
            "sent": sent_msgs,
            "delivered": delivered_msgs,
            "read": read_msgs,
            "failed": failed_msgs,
            "template_messages": template_msgs,
            "delivery_rate": round((delivered_msgs / total_msgs * 100) if total_msgs > 0 else 0, 1),
            "read_rate": round((read_msgs / total_msgs * 100) if total_msgs > 0 else 0, 1),
        },
        "campaigns": {
            "total_events": campaign_total,
            "delivered": campaign_delivered,
            "read": campaign_read,
            "failed": campaign_failed,
            "conversations_created": campaign_convs,
            "read_rate": round((campaign_read / campaign_total * 100) if campaign_total > 0 else 0, 1),
        },
    }


@router.get("/api/admin/whatsapp/webhook-logs")
async def get_wa_webhook_logs(_=Depends(admin_required)):
    cursor = wa_webhook_logs_col.find({}, {"_id": 0}).sort("received_at", -1).limit(50)
    logs = await cursor.to_list(50)
    return {"logs": logs, "total": len(logs)}


INTERAKT_USERS_URL = "https://api.interakt.ai/v1/public/apis/users/"


@router.post("/api/admin/whatsapp/fetch-interakt-contacts")
async def fetch_interakt_contacts(_=Depends(admin_required)):
    """Pull all contacts from Interakt's Customer API with pagination."""
    if not INTERAKT_API_KEY:
        raise HTTPException(400, "Interakt API key not configured")

    headers = {
        "Authorization": interakt_auth_header(),
        "Content-Type": "application/json",
    }

    all_customers = []
    offset = 0
    limit = 100
    max_pages = 20  # Safety cap: 2000 contacts max
    # Interakt requires at least one filter; use created_at > epoch start
    filters = [{"trait": "created_at_utc", "op": "gt", "val": "2020-01-01"}]

    for _ in range(max_pages):
        try:
            resp = req.post(
                f"{INTERAKT_USERS_URL}?offset={offset}&limit={limit}",
                headers=headers,
                json={"filters": filters},
                timeout=30,
            )
            if resp.status_code != 200:
                print(f"[INTERAKT] API returned {resp.status_code}: {resp.text[:200]}")
                break
            data = resp.json()
            if not data.get("result"):
                break
            customers = data.get("data", {}).get("customers", [])
            if not customers:
                break
            all_customers.extend(customers)
            has_next = data.get("data", {}).get("has_next_page", False)
            if not has_next:
                break
            offset += limit
        except Exception as e:
            print(f"[INTERAKT] Fetch page error at offset={offset}: {e}")
            break

    # Format for frontend display
    contacts = []
    for c in all_customers:
        traits = c.get("traits", {})
        contacts.append({
            "interakt_id": c.get("id", ""),
            "phone": c.get("phone_number", ""),
            "country_code": c.get("country_code", "+91"),
            "full_phone": c.get("channel_phone_number", ""),
            "name": traits.get("name", ""),
            "email": traits.get("email", ""),
            "whatsapp_opted_in": traits.get("whatsapp_opted_in", False),
            "tags": c.get("tag_names", []),
            "source": c.get("customer_created_at_source", ""),
            "created_at": c.get("created_at_utc", ""),
            "modified_at": c.get("modified_at_utc", ""),
            "traits": {k: v for k, v in traits.items()
                       if k not in ("name", "email", "whatsapp_opted_in") and v},
        })

    return {"contacts": contacts, "total": len(contacts)}


@router.post("/api/admin/whatsapp/sync-interakt-to-crm")
async def sync_interakt_contacts_to_crm(_=Depends(admin_required)):
    """Fetch contacts from Interakt and upsert them as CRM leads."""
    if not INTERAKT_API_KEY:
        raise HTTPException(400, "Interakt API key not configured")

    headers = {
        "Authorization": interakt_auth_header(),
        "Content-Type": "application/json",
    }

    all_customers = []
    offset = 0
    limit = 100
    max_pages = 20
    filters = [{"trait": "created_at_utc", "op": "gt", "val": "2020-01-01"}]

    for _ in range(max_pages):
        try:
            resp = req.post(
                f"{INTERAKT_USERS_URL}?offset={offset}&limit={limit}",
                headers=headers,
                json={"filters": filters},
                timeout=30,
            )
            if resp.status_code != 200:
                print(f"[INTERAKT SYNC] API returned {resp.status_code}: {resp.text[:200]}")
                break
            data = resp.json()
            if not data.get("result"):
                break
            customers = data.get("data", {}).get("customers", [])
            if not customers:
                break
            all_customers.extend(customers)
            has_next = data.get("data", {}).get("has_next_page", False)
            if not has_next:
                break
            offset += limit
        except Exception as e:
            print(f"[INTERAKT SYNC] Fetch error at offset={offset}: {e}")
            break

    created = 0
    updated = 0
    skipped = 0

    for c in all_customers:
        traits = c.get("traits", {})
        phone = c.get("phone_number", "")
        if not phone:
            skipped += 1
            continue

        name = traits.get("name", "") or f"WhatsApp {phone}"
        email = traits.get("email", "") or ""

        # Check if lead already exists by phone
        existing = await leads_col.find_one({
            "$or": [
                {"phone_whatsapp": phone},
                {"phone_whatsapp": f"+91{phone}"},
                {"phone_whatsapp": c.get("channel_phone_number", "NONE")},
            ]
        })

        now_iso = datetime.now(timezone.utc).isoformat()

        if existing:
            # Update with Interakt data if we have richer info
            update_fields = {"updated_at": now_iso, "interakt_synced": True}
            if name and name != f"WhatsApp {phone}" and not existing.get("name", "").strip():
                update_fields["name"] = name
            if email and not existing.get("email", "").strip():
                update_fields["email"] = email
            interakt_tags = c.get("tag_names", [])
            if interakt_tags:
                update_fields["interakt_tags"] = interakt_tags

            await leads_col.update_one(
                {"_id": existing["_id"]},
                {"$set": update_fields}
            )
            updated += 1
        else:
            # Create new lead from Interakt contact
            lead = {
                "name": name,
                "phone_whatsapp": phone,
                "email": email,
                "hospital_clinic": traits.get("hospital", ""),
                "district": traits.get("district", ""),
                "inquiry_type": "WhatsApp Contact",
                "product_interest": traits.get("product_interest", ""),
                "source": "interakt_sync",
                "score": "Cold",
                "score_value": 10,
                "status": "new",
                "interakt_synced": True,
                "interakt_id": c.get("id", ""),
                "interakt_tags": c.get("tag_names", []),
                "whatsapp_opted_in": traits.get("whatsapp_opted_in", False),
                "created_at": now_iso,
                "updated_at": now_iso,
            }
            await leads_col.insert_one(lead)
            created += 1

        # Also create/update a WA conversation stub so they show in inbox
        conv_exists = await wa_conversations_col.find_one({"phone": phone})
        if not conv_exists:
            await wa_conversations_col.insert_one({
                "phone": phone,
                "session_id": f"interakt-sync-{phone}",
                "customer_name": name,
                "messages": [],
                "status": "synced",
                "source": "interakt_sync",
                "lead_created": True,
                "created_at": c.get("created_at_utc", now_iso),
                "updated_at": now_iso,
            })

    return {
        "total_fetched": len(all_customers),
        "created": created,
        "updated": updated,
        "skipped": skipped,
    }



# --- WhatsApp Funnel (automated catalog walk) ---

@router.get("/api/admin/whatsapp/funnel-analytics")
async def get_funnel_analytics(_=Depends(admin_required)):
    """Return conversion funnel counts + per-division breakdown + recent events."""
    from services.whatsapp_funnel import funnel_analytics
    return await funnel_analytics()


@router.post("/api/admin/whatsapp/funnel-simulate")
async def simulate_funnel(request: Request, _=Depends(admin_required)):
    """Dry-run the funnel engine for a given phone + message (no WhatsApp send).

    Body: {"phone": "9198...", "message": "hi", "mode": "text"|"interactive"}
    Returns the payload(s) the funnel would send + the resulting state.
    """
    from services.whatsapp_funnel import try_handle_funnel, _get_funnel_state
    body = await request.json()
    phone = body.get("phone", "")
    message = body.get("message", "")
    mode = (body.get("mode") or os.environ.get("WHATSAPP_FUNNEL_MODE") or "text").strip().lower()
    if not phone or not message:
        raise HTTPException(400, "phone and message required")
    replies = await try_handle_funnel(phone, message, body.get("customer_name", ""), mode=mode)
    state = await _get_funnel_state(phone)
    return {
        "handled": replies is not None,
        "mode": mode,
        "replies": replies or [],
        "state": state,
    }


@router.post("/api/admin/whatsapp/funnel-reset")
async def reset_funnel(request: Request, _=Depends(admin_required)):
    """Reset the funnel state for a given phone so next message starts fresh."""
    body = await request.json()
    phone = body.get("phone", "")
    if not phone:
        raise HTTPException(400, "phone required")
    await wa_conversations_col.update_one(
        {"phone": phone}, {"$unset": {"funnel": ""}}
    )
    return {"phone": phone, "reset": True}


@router.get("/api/admin/whatsapp/funnel-config")
async def get_funnel_config(_=Depends(admin_required)):
    """Return current funnel runtime mode + whether interactive is available."""
    from db import db as mongo_db
    cfg = await mongo_db["app_config"].find_one({"type": "whatsapp_funnel"}, {"_id": 0})
    mode = (cfg or {}).get("mode") or (os.environ.get("WHATSAPP_FUNNEL_MODE", "text") or "text")
    return {
        "mode": mode,
        "allowed_modes": ["text", "interactive"],
        "business_number": WHATSAPP_NUMBER,
        "interakt_configured": bool(INTERAKT_API_KEY),
        "interactive_supported": True,
        "interactive_note": (
            "Interactive messages (type: InteractiveList / InteractiveButton) are sent as "
            "session messages — they only deliver when the customer has messaged you within "
            "the last 24 hours. Outside that window, Interakt returns an error and the funnel "
            "auto-falls-back to text."
        ),
    }


@router.post("/api/admin/whatsapp/funnel-config")
async def set_funnel_config(request: Request, _=Depends(admin_required)):
    """Switch between 'text' and 'interactive' funnel modes at runtime."""
    body = await request.json()
    mode = (body.get("mode") or "").strip().lower()
    if mode not in ("text", "interactive"):
        raise HTTPException(400, "mode must be 'text' or 'interactive'")
    from db import db as mongo_db
    await mongo_db["app_config"].update_one(
        {"type": "whatsapp_funnel"},
        {"$set": {"type": "whatsapp_funnel", "mode": mode, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    # Also update process env so current pod picks it up immediately
    os.environ["WHATSAPP_FUNNEL_MODE"] = mode
    return {"mode": mode}


@router.post("/api/admin/whatsapp/funnel-test-interactive")
async def test_interactive(request: Request, _=Depends(admin_required)):
    """Send the welcome interactive list to a test phone number for manual QA.

    Requires the test recipient to have messaged the Interakt number within
    the last 24 hours (WhatsApp session window rule).
    """
    body = await request.json()
    phone = body.get("phone", "")
    if not phone:
        raise HTTPException(400, "phone required")

    from services.whatsapp_funnel import build_welcome_list_payload, build_product_detail_buttons_payload
    flavor = (body.get("flavor") or "list").strip().lower()
    if flavor == "buttons":
        # Send a sample buttons message (doesn't need a product, synthetic body)
        r = await send_whatsapp_interactive_buttons(
            phone,
            body_text="This is a test of WhatsApp interactive buttons from Agile Ortho. Pick any option:",
            buttons=[
                {"id": "act:quote", "title": "Bulk quote"},
                {"id": "act:brochure", "title": "Get brochure"},
                {"id": "act:agent", "title": "Talk to agent"},
            ],
            header_text="Test — Agile Ortho",
            footer_text="Interactive buttons",
            callback_data="admin_test_buttons",
        )
    else:
        p = build_welcome_list_payload()
        r = await send_whatsapp_interactive_list(
            phone,
            body_text=p["body"],
            sections=p["sections"],
            button_label=p["button"],
            header_text=p["header"],
            footer_text=p["footer"],
            callback_data="admin_test_list",
        )

    # Surface Interakt's full error message verbatim so the admin sees why it failed
    if not r.get("success"):
        api_msg = ""
        data = r.get("data") or {}
        if isinstance(data, dict):
            api_msg = data.get("message") or ""
        r["error_message"] = (
            f"Interakt rejected the payload ({r.get('status_code','?')}): {api_msg or r.get('error','unknown')}. "
            "Common cause: the recipient hasn't messaged your WhatsApp number in the last 24 hours "
            "(session window closed). Ask them to send any message first, then retry."
        )
    return r
