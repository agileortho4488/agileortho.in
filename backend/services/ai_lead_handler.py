"""
AI Lead Handler — unified intelligence layer for inbound messages.

Handles BOTH channels:
  • WhatsApp replies (via routes/whatsapp.py webhook, when no funnel button matches)
  • Website chatbot messages (via routes/chat.py)

Per message:
  1. Load or create lead record (matched by phone / session_id)
  2. Build context (lead profile + last 5 messages + relevant products)
  3. Claude Sonnet classifies intent + drafts natural reply
  4. Apply intent-specific actions:
       PRICING        → qualify with GST + volume ask, NO price leak
       BULK_QUOTE     → upgrade to Hot, notify sales number
       MEETING        → send booking link
       PRODUCT_SPEC   → reply with catalog facts
       CATALOG_REQUEST→ send catalog URL
       SPAM / IRRELEVANT → flag, don't reply
       GENERAL        → natural reply
  5. Update leads_col (score, status, product_interest, ai_reasoning, intent_history)
  6. Log to ai_interactions_col for analytics

Output: dict {reply_text, intent, confidence, lead_updates, sales_alert_fired}
"""
from __future__ import annotations

import os
import re
import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from db import db as mongo_db, leads_col

ai_interactions_col = mongo_db["ai_interactions"]
app_config_col = mongo_db["app_config"]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

INTENTS = ["PRICING", "BULK_QUOTE", "MEETING", "PRODUCT_SPEC",
           "CATALOG_REQUEST", "SPAM", "IRRELEVANT", "GENERAL"]

# Sales number for hot-lead pings (overridable via app_config.type=ai_handler_config)
DEFAULT_SALES_WHATSAPP = "917416521222"

SYSTEM_PROMPT = """You are the lead qualification assistant for Agile Healthcare — a premier Meril Life Sciences master franchise supplying orthopedic implants, trauma plates, joint replacement systems, spine implants, endoscopy equipment, and cardiovascular devices across Telangana, India.

Your role is to CLASSIFY every inbound message and DRAFT a professional reply for a B2B medical-device buyer (hospital / clinic / surgeon).

RULES (absolute):
1. NEVER quote specific prices. Prices change daily and incorrect quotes lose deals.
   • If asked for price → ask for GST number + expected monthly volume + delivery location, and promise exact quote within 1 working day.
2. NEVER claim stock availability beyond "usually in stock in Hyderabad, 24h delivery across Telangana".
3. Respond in the SAME LANGUAGE as the user (English / Hindi / Telugu).
4. Keep replies SHORT (40-80 words, plain text, no markdown bold/italic).
5. If message looks like spam, an irrelevant topic, or automated noise → classify as SPAM / IRRELEVANT and reply empty.
6. If user asks for a meeting / demo / call → acknowledge + say we'll share a booking link.
7. Mention the specific clinic name and district you're addressing ONLY if they're present in the CONTEXT section below.
8. IMPORTANT — when user asks for CATALOG / brochure / product info / details:
   • Mention specific product NAMES from the PRODUCT CONTEXT block below (if provided).
   • Tell them we are sending a brochure/catalog link.
   • DO NOT invent URLs — the system will auto-append the correct division catalog link + available brochures after your reply.
   • Keep your reply focused on the 2-3 most relevant products to their query.

You MUST respond with VALID JSON in this exact shape (no other text):
{
  "intent": "PRICING" | "BULK_QUOTE" | "MEETING" | "PRODUCT_SPEC" | "CATALOG_REQUEST" | "SPAM" | "IRRELEVANT" | "GENERAL",
  "confidence": 0.0-1.0,
  "reply": "<message to send to user, empty string if SPAM/IRRELEVANT>",
  "product_interest": "<short label like 'trauma plates' or 'knee implants', empty if unclear>",
  "division_hint": "<Trauma | Joint Replacement | Spine | Sports Medicine | Cardiovascular | Endo Surgery | Urology | Instruments | Infection Prevention | Orthobiologics | IVD | Surgical Specialities | empty>",
  "score_suggestion": "Hot" | "Warm" | "Cold",
  "reasoning": "<one sentence why>"
}

If the message truly has zero buying intent (e.g., random number, prank, scam), set intent=SPAM and reply="".
"""


# ============================================================
# Config helpers
# ============================================================
async def get_config() -> dict:
    doc = await app_config_col.find_one({"type": "ai_handler_config"}, {"_id": 0}) or {}
    return {
        "enabled": doc.get("enabled", True),
        "sales_whatsapp": doc.get("sales_whatsapp", DEFAULT_SALES_WHATSAPP),
        "model": doc.get("model", "claude-sonnet-4-20250514"),
        "booking_url": doc.get("booking_url", "https://cal.com/agile-ortho/demo"),
        "catalog_url": doc.get("catalog_url", "https://www.agileortho.in/catalog"),
    }


async def update_config(patch: dict) -> dict:
    allowed = {"enabled", "sales_whatsapp", "model", "booking_url", "catalog_url"}
    update = {k: v for k, v in patch.items() if k in allowed}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await app_config_col.update_one(
        {"type": "ai_handler_config"},
        {"$set": {"type": "ai_handler_config", **update}},
        upsert=True,
    )
    return await get_config()


# ============================================================
# Lead context builder
# ============================================================
async def _load_lead_context(phone: str = "", session_id: str = "") -> dict:
    """Returns a compact context dict about the lead."""
    lead = None
    if phone:
        digits = "".join(c for c in phone if c.isdigit())
        if digits.startswith("91") and len(digits) > 10:
            digits = digits[2:]
        lead = await leads_col.find_one({"phone_whatsapp": digits}, {"_id": 0})
    if not lead and session_id:
        lead = await leads_col.find_one({"chat_session_id": session_id}, {"_id": 0})

    ctx = {
        "known": bool(lead),
        "name": "",
        "hospital": "",
        "district": "",
        "category": "",
        "source": "",
        "score": "",
        "last_product_interest": "",
    }
    if lead:
        ctx.update({
            "name": (lead.get("name") or "")[:80],
            "hospital": (lead.get("hospital_clinic") or "")[:120],
            "district": (lead.get("district") or "")[:60],
            "category": (lead.get("gmaps_category") or lead.get("inquiry_type") or "")[:60],
            "source": lead.get("source", ""),
            "score": lead.get("score", ""),
            "last_product_interest": (lead.get("product_interest") or "")[:80],
        })
    return ctx


def _build_context_block(ctx: dict) -> str:
    if not ctx.get("known"):
        return "CONTEXT: No prior record for this contact. Treat as a new inbound lead."
    bits = []
    if ctx.get("name"):
        bits.append(f"Name: {ctx['name']}")
    if ctx.get("hospital"):
        bits.append(f"Clinic: {ctx['hospital']}")
    if ctx.get("district"):
        bits.append(f"District: {ctx['district']}, Telangana")
    if ctx.get("category"):
        bits.append(f"Category: {ctx['category']}")
    if ctx.get("last_product_interest"):
        bits.append(f"Previously interested in: {ctx['last_product_interest']}")
    if ctx.get("score"):
        bits.append(f"Lead score: {ctx['score']}")
    return "CONTEXT:\n  " + "\n  ".join(bits)


async def _recent_conversation(phone: str, session_id: str, channel: str, limit: int = 5) -> list:
    """Fetch last N messages from whichever conversation store applies."""
    if channel == "whatsapp" and phone:
        digits = "".join(c for c in phone if c.isdigit())
        if digits.startswith("91") and len(digits) > 10:
            digits = digits[2:]
        conv = await mongo_db["wa_conversations"].find_one({"phone": digits})
        if conv:
            msgs = conv.get("messages", [])[-limit:]
            return [{"role": m.get("direction", "user"), "content": m.get("text", "")[:300]}
                    for m in msgs if m.get("text")]
    if channel == "web" and session_id:
        conv = await mongo_db["conversations"].find_one({"session_id": session_id})
        if conv:
            return [{"role": m["role"], "content": str(m.get("content", ""))[:300]}
                    for m in (conv.get("messages", [])[-limit:])]
    return []


# ============================================================
# Core handler
# ============================================================
async def handle_message(
    message: str,
    channel: str = "whatsapp",           # "whatsapp" | "web"
    phone: str = "",
    session_id: str = "",
) -> dict:
    """Process an inbound message, return action plan + reply text."""
    cfg = await get_config()
    if not cfg["enabled"]:
        return {"skipped": True, "reason": "ai_handler_disabled"}

    if not message or not message.strip():
        return {"skipped": True, "reason": "empty"}

    # Detect business auto-replies and stay silent to prevent bot-to-bot loops
    try:
        from services.whatsapp_funnel import is_business_auto_reply
        if is_business_auto_reply(message):
            return {"skipped": True, "reason": "auto_reply_detected",
                    "intent": "SPAM", "reply": ""}
    except Exception:
        pass

    lead_ctx = await _load_lead_context(phone=phone, session_id=session_id)
    history = await _recent_conversation(phone=phone, session_id=session_id, channel=channel)

    context_block = _build_context_block(lead_ctx)
    user_prompt_parts = [context_block, f"CHANNEL: {channel}", "INBOUND MESSAGE:", message.strip()]
    if history:
        user_prompt_parts.insert(1, "RECENT CONVERSATION:")
        for h in history:
            user_prompt_parts.insert(2, f"  [{h['role']}] {h['content']}")
    user_prompt = "\n".join(user_prompt_parts)

    # Call Claude
    ai_result = await _call_claude(user_prompt, cfg["model"])

    # Enrich reply with REAL product/brochure/catalog links from our DB (not AI hallucinations)
    reply = ai_result.get("reply", "")
    try:
        reply = await _enrich_reply_with_links(reply, ai_result, query=message)
    except Exception as e:
        logging.exception(f"link enrichment failed: {e}")

    # Inject booking link for MEETING
    if ai_result.get("intent") == "MEETING" and reply and cfg["booking_url"] not in reply:
        reply = f"{reply}\n\n📅 Book a 15-min call: {cfg['booking_url']}"
    ai_result["reply"] = reply

    # Update lead record + log
    lead_updates = await _apply_lead_updates(phone=phone, session_id=session_id, ai_result=ai_result)
    await _log_interaction(
        channel=channel, phone=phone, session_id=session_id,
        message=message, ai_result=ai_result, lead_ctx=lead_ctx,
    )

    # Hot-lead pings
    sales_alert = False
    if ai_result.get("intent") == "BULK_QUOTE" and cfg.get("sales_whatsapp"):
        sales_alert = await _fire_sales_alert(lead_ctx, message, ai_result, cfg)

    return {
        "intent": ai_result.get("intent"),
        "confidence": ai_result.get("confidence"),
        "reply": ai_result.get("reply", ""),
        "product_interest": ai_result.get("product_interest"),
        "score_suggestion": ai_result.get("score_suggestion"),
        "reasoning": ai_result.get("reasoning"),
        "lead_updated": bool(lead_updates),
        "sales_alert_fired": sales_alert,
    }


# ============================================================
# Product / brochure lookup — make replies actually useful
# ============================================================
DIVISION_SLUG_MAP = {
    "trauma": "trauma",
    "joint replacement": "joint-replacement",
    "spine": "spine",
    "sports medicine": "sports-medicine",
    "cardiovascular": "cardiovascular",
    "endo surgery": "endo-surgery",
    "urology": "urology",
    "instruments": "instruments",
    "infection prevention": "infection-prevention",
    "orthobiologics": "orthobiologics",
    "ivd": "ivd",
    "surgical specialities": "surgical-specialities",
    "ent": "ent",
}

PUBLIC_SITE_BASE = os.environ.get("PUBLIC_SITE_BASE", "https://www.agileortho.in")
FILES_BASE = os.environ.get("PUBLIC_FILES_BASE", "https://www.agileortho.in/api/files")


async def _search_relevant_products(query: str, division_hint: str = "", limit: int = 5) -> list:
    """Return top products matching the query, preferring those with brochures."""
    if not query and not division_hint:
        return []
    catalog_col = mongo_db["catalog_products"]
    filt = {"status": {"$ne": "draft"}}
    if division_hint:
        filt["division_canonical"] = {"$regex": f"^{re.escape(division_hint)}$", "$options": "i"}

    # Prefer those with brochures first
    or_terms = []
    if query:
        for tok in [t for t in re.split(r"\W+", query.lower()) if len(t) > 2][:6]:
            or_terms.append({"name": {"$regex": tok, "$options": "i"}})
            or_terms.append({"product_name": {"$regex": tok, "$options": "i"}})
            or_terms.append({"description": {"$regex": tok, "$options": "i"}})
    if or_terms:
        filt["$or"] = or_terms

    docs = await catalog_col.find(
        filt,
        {"_id": 0, "name": 1, "product_name": 1, "slug": 1,
         "division_canonical": 1, "brochure_url": 1}
    ).limit(50).to_list(50)
    # Sort: with brochure first
    docs.sort(key=lambda d: (0 if d.get("brochure_url") else 1))
    return docs[:limit]


def _public_brochure_url(brochure_path: str) -> str:
    if not brochure_path:
        return ""
    if brochure_path.startswith("http"):
        return brochure_path
    return f"{FILES_BASE}/{brochure_path.lstrip('/')}"


def _division_catalog_url(division_name: str) -> str:
    if not division_name:
        return f"{PUBLIC_SITE_BASE}/catalog"
    slug = DIVISION_SLUG_MAP.get(division_name.strip().lower())
    if not slug:
        slug = division_name.strip().lower().replace(" ", "-")
    return f"{PUBLIC_SITE_BASE}/catalog/{slug}"


async def _enrich_reply_with_links(reply: str, ai_result: dict, query: str) -> str:
    """Append the most helpful links/brochures based on the AI's intent + division hint."""
    intent = ai_result.get("intent", "")
    division = (ai_result.get("division_hint") or "").strip()
    # Only enrich when the user actually wants info/catalog/spec
    if intent not in ("CATALOG_REQUEST", "PRODUCT_SPEC", "PRICING", "BULK_QUOTE", "GENERAL"):
        return reply

    products = await _search_relevant_products(query, division_hint=division, limit=3)
    if not products and not division:
        return reply

    extras = []
    # Division landing page
    if division:
        extras.append(f"📁 {division} catalog: {_division_catalog_url(division)}")

    # Up to 2 product brochure links
    added = 0
    for p in products:
        brochure = p.get("brochure_url")
        name = p.get("product_name") or p.get("name") or ""
        slug = p.get("slug")
        if brochure and added < 2:
            extras.append(f"📄 {name} brochure: {_public_brochure_url(brochure)}")
            added += 1
        elif slug and added < 2 and not brochure:
            extras.append(f"🔗 {name}: {PUBLIC_SITE_BASE}/catalog/products/{slug}")
            added += 1

    if not extras:
        return reply
    return (reply.rstrip() + "\n\n" + "\n".join(extras)).strip()
async def _call_claude(user_prompt: str, model: str) -> dict:
    """Return dict with intent/reply/etc. Falls back gracefully on parse errors."""
    # Use latest stored custom prompt if admin has edited it
    active_prompt = SYSTEM_PROMPT
    try:
        custom = await app_config_col.find_one({"type": "ai_handler_prompt"}, {"_id": 0})
        if custom and (custom.get("prompt") or "").strip():
            active_prompt = custom["prompt"]
    except Exception:
        pass

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"ai-lead-{uuid.uuid4().hex[:8]}",
            system_message=active_prompt,
        ).with_model("anthropic", model)
        raw = await chat.send_message(UserMessage(text=user_prompt))
    except Exception as e:
        logging.exception(f"AI handler Claude call failed: {e}")
        return _fallback_result()

    # Extract JSON (Claude sometimes adds fluff or code fences)
    parsed = _parse_strict_json(raw)
    if not parsed:
        return _fallback_result(raw_text=raw)

    # Normalize fields
    intent = (parsed.get("intent") or "").upper().strip()
    if intent not in INTENTS:
        intent = "GENERAL"
    return {
        "intent": intent,
        "confidence": float(parsed.get("confidence") or 0.7),
        "reply": (parsed.get("reply") or "").strip(),
        "product_interest": (parsed.get("product_interest") or "").strip(),
        "division_hint": (parsed.get("division_hint") or "").strip(),
        "score_suggestion": (parsed.get("score_suggestion") or "Cold").strip(),
        "reasoning": (parsed.get("reasoning") or "")[:300],
    }


def _parse_strict_json(text: str) -> Optional[dict]:
    if not text:
        return None
    # Strip code fences
    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*", "", t)
    t = re.sub(r"\s*```$", "", t)
    # Find first {...} block
    m = re.search(r"\{[\s\S]*\}", t)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


def _fallback_result(raw_text: str = "") -> dict:
    # When Claude fails or returns unparseable text — generic human reply
    return {
        "intent": "GENERAL",
        "confidence": 0.3,
        "reply": (raw_text.strip() or "Thanks for reaching out! A team member will connect with you shortly. For urgent queries: +91 74165 21222")[:600],
        "product_interest": "",
        "score_suggestion": "Cold",
        "reasoning": "fallback: llm parse error",
    }


# ============================================================
# Lead updates
# ============================================================
async def _apply_lead_updates(phone: str, session_id: str, ai_result: dict) -> dict:
    score_map = {"Hot": 85, "Warm": 60, "Cold": 30}
    score_sugg = ai_result.get("score_suggestion", "Cold")
    intent = ai_result.get("intent", "GENERAL")

    status_map = {
        "BULK_QUOTE": "qualified",
        "MEETING": "qualified",
        "PRICING": "contacted",
        "PRODUCT_SPEC": "contacted",
        "CATALOG_REQUEST": "contacted",
        "SPAM": "junk",
        "IRRELEVANT": "junk",
        "GENERAL": "contacted",
    }

    updates = {
        "last_ai_intent": intent,
        "last_ai_reasoning": ai_result.get("reasoning", ""),
        "last_ai_reply": ai_result.get("reply", ""),
        "last_ai_at": datetime.now(timezone.utc).isoformat(),
    }
    if ai_result.get("product_interest"):
        updates["product_interest"] = ai_result["product_interest"]
    if intent not in ("SPAM", "IRRELEVANT"):
        updates["score"] = score_sugg
        updates["score_value"] = score_map.get(score_sugg, 30)
        updates["ai_score"] = score_sugg
        updates["ai_reasoning"] = ai_result.get("reasoning", "")
    updates["status"] = status_map.get(intent, "contacted")

    target = {}
    if phone:
        digits = "".join(c for c in phone if c.isdigit())
        if digits.startswith("91") and len(digits) > 10:
            digits = digits[2:]
        target = {"phone_whatsapp": digits}
    elif session_id:
        target = {"chat_session_id": session_id}

    if not target:
        return {}

    res = await leads_col.update_one(target, {
        "$set": updates,
        "$push": {"intent_history": {
            "intent": intent,
            "confidence": ai_result.get("confidence"),
            "at": updates["last_ai_at"],
        }},
    })
    return updates if res.matched_count else {}


async def _log_interaction(channel: str, phone: str, session_id: str,
                           message: str, ai_result: dict, lead_ctx: dict):
    await ai_interactions_col.insert_one({
        "id": uuid.uuid4().hex[:16],
        "channel": channel,
        "phone": phone,
        "session_id": session_id,
        "lead_known": lead_ctx.get("known"),
        "lead_district": lead_ctx.get("district"),
        "inbound": message[:500],
        "intent": ai_result.get("intent"),
        "confidence": ai_result.get("confidence"),
        "reply": ai_result.get("reply", "")[:1000],
        "product_interest": ai_result.get("product_interest"),
        "score_suggestion": ai_result.get("score_suggestion"),
        "reasoning": ai_result.get("reasoning"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


# ============================================================
# Hot-lead sales alert
# ============================================================
async def _fire_sales_alert(lead_ctx: dict, message: str, ai_result: dict, cfg: dict) -> bool:
    try:
        from routes.whatsapp import send_whatsapp_message
        alert = (
            "HOT LEAD — BULK QUOTE intent\n"
            f"Clinic: {lead_ctx.get('hospital') or 'Unknown'}\n"
            f"District: {lead_ctx.get('district') or '—'}\n"
            f"Interest: {ai_result.get('product_interest') or '—'}\n"
            f"Message: {message[:200]}\n"
            "— Agile Ortho AI"
        )
        res = await send_whatsapp_message(cfg["sales_whatsapp"], alert, callback_data="ai_hot_alert")
        return bool(res.get("success"))
    except Exception as e:
        logging.exception(f"sales alert failed: {e}")
        return False


# ============================================================
# Index setup
# ============================================================
async def ensure_indexes():
    await ai_interactions_col.create_index("phone")
    await ai_interactions_col.create_index("session_id")
    await ai_interactions_col.create_index("intent")
    await ai_interactions_col.create_index("created_at")
