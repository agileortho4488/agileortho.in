"""
WhatsApp Conversational Funnel Engine
======================================

State machine that drives an automated multi-step WhatsApp conversation:

    root → division_picker → product_picker → product_detail → quote|brochure|agent

Every state transition is logged to `funnel_events` for conversion analytics.

The funnel is text-based (numbered menus). This avoids Interakt's approved-
template constraint for interactive list messages, which means the funnel
works out of the box — no Meta template approval needed.

If the user's reply does not match any expected input at the current node,
we fall back to the existing AI assistant so conversations never dead-end.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
import re

from db import (
    wa_conversations_col,
    catalog_products_col,
    leads_col,
    db as mongo_db,
)

funnel_events_col = mongo_db["funnel_events"]

# --- Catalogue (ordered by live product count — matches /api/admin/stats)
DIVISIONS = [
    "Trauma",
    "Joint Replacement",
    "Spine",
    "Sports Medicine",
    "Endo Surgery",
    "Cardiovascular",
    "Peripheral Intervention",
    "ENT",
    "Urology",
    "Critical Care",
    "Diagnostics",
    "Infection Prevention",
    "Instruments",
]

# Keywords → shortcut directly into a division (case-insensitive substring match)
DIVISION_KEYWORDS = {
    "Trauma": ["trauma", "plate", "screw", "nail", "fracture", "mboss", "locking"],
    "Joint Replacement": ["joint", "knee", "hip", "replacement", "prosthesis"],
    "Spine": ["spine", "vertebra", "disc", "pedicle"],
    "Sports Medicine": ["sports", "acl", "meniscus", "shoulder", "arthroscopy", "anchor"],
    "Endo Surgery": ["endo", "stapler", "laparoscop", "suture", "clip"],
    "Cardiovascular": ["cardiac", "stent", "balloon", "cardiovascular", "angioplast"],
    "Peripheral Intervention": ["peripheral", "vascular"],
    "ENT": ["ent", "ear", "nose", "throat"],
    "Urology": ["urology", "catheter", "urin"],
    "Critical Care": ["critical", "icu"],
    "Diagnostics": ["diagnostic", "tester", "analy"],
    "Infection Prevention": ["mask", "gown", "ppe", "sanit"],
    "Instruments": ["instrument", "forcep"],
}

ROOT_TRIGGERS = {"hi", "hello", "hey", "start", "menu", "hola", "namaste", "help"}

CONTACT_DISPATCH = "7416818183"
CONTACT_ORTHO = "7416162350"
CONTACT_GENERAL = "7416216262"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _log_event(phone: str, from_node: str, to_node: str, input_text: str, action: str = ""):
    await funnel_events_col.insert_one({
        "phone": phone,
        "from_node": from_node,
        "to_node": to_node,
        "input": input_text[:200],
        "action": action,
        "timestamp": _now(),
    })


async def _get_funnel_state(phone: str) -> dict:
    conv = await wa_conversations_col.find_one({"phone": phone}, {"_id": 0, "funnel": 1})
    return (conv or {}).get("funnel") or {"node": "root", "history": []}


async def _set_funnel_state(phone: str, new_state: dict):
    await wa_conversations_col.update_one(
        {"phone": phone},
        {"$set": {"funnel": new_state, "updated_at": _now()}},
        upsert=True,
    )


async def _top_products_for_division(division: str, limit: int = 3) -> list:
    cursor = catalog_products_col.find(
        {
            "division_canonical": division,
            "status": {"$ne": "draft"},
            "review_required": False,
            "semantic_brand_system": {"$nin": [None, ""]},
        },
        {"_id": 0, "slug": 1, "product_name": 1, "product_name_display": 1,
         "brand": 1, "semantic_brand_system": 1, "category": 1, "brochure_url": 1},
    ).sort("product_name", 1).limit(limit)
    return await cursor.to_list(limit)


# --- Menu builders (pure text — WhatsApp friendly) ---

def build_welcome_menu() -> str:
    lines = [
        "Hi! Welcome to *Agile Ortho* — Telangana's authorized Meril distributor.",
        "",
        "Reply with a number to explore our catalog:",
        "",
    ]
    for i, d in enumerate(DIVISIONS, 1):
        lines.append(f"{i}. {d}")
    lines += ["", "0. Talk to a specialist"]
    return "\n".join(lines)


# --- Interactive builders (WhatsApp native list / button UI) ---

def build_welcome_list_payload() -> dict:
    """Native WhatsApp list with 13 divisions grouped into 2 sections."""
    # Split divisions into two visual sections for readability
    section_a = [
        {"id": f"div:{d}", "title": d[:23], "description": "View top products"}
        for d in DIVISIONS[:7]
    ]
    section_b = [
        {"id": f"div:{d}", "title": d[:23], "description": "View top products"}
        for d in DIVISIONS[7:]
    ]
    # WhatsApp caps at 10 total rows — keep top 10 divisions + a "Talk to specialist"
    rows = (section_a + section_b)[:9]
    rows.append({"id": "div:_AGENT", "title": "Talk to specialist", "description": "Connect with our team"})
    return {
        "type": "interactive_list",
        "header": "Agile Ortho Catalog",
        "body": "Tap below to explore 810+ Meril medical devices available in Telangana.",
        "footer": "Authorized Meril distributor",
        "button": "Divisions",
        "sections": [{"title": "Clinical Divisions", "rows": rows}],
    }


def build_products_list_payload(division: str, products: list) -> dict:
    if not products:
        return {
            "type": "text",
            "content": f"We don't have live products in *{division}* right now. Reply *menu* for other divisions.",
        }
    rows = []
    for i, p in enumerate(products):
        name = p.get("product_name_display") or p.get("product_name") or ""
        brand = p.get("brand") or p.get("semantic_brand_system") or ""
        rows.append({
            "id": f"prod:{p.get('slug', '')}",
            "title": name[:23],
            "description": (brand or "Meril")[:72],
        })
    return {
        "type": "interactive_list",
        "header": division[:60],
        "body": f"Top picks in {division}. Tap a product for full specs and quote options.",
        "footer": "Agile Ortho",
        "button": "See products",
        "sections": [{"title": "Featured", "rows": rows}],
    }


def build_product_detail_buttons_payload(product: dict) -> dict:
    name = product.get("product_name_display") or product.get("product_name") or ""
    brand = product.get("brand") or product.get("semantic_brand_system") or ""
    cat = product.get("category") or ""
    body_parts = [f"*{name}*"]
    if brand:
        body_parts.append(f"Brand: {brand}")
    if cat:
        body_parts.append(f"Category: {cat}")
    body_parts.append("What would you like to do?")
    return {
        "type": "interactive_buttons",
        "header": name[:60],
        "body": "\n".join(body_parts)[:1024],
        "buttons": [
            {"id": "act:quote", "title": "Bulk quote"},
            {"id": "act:brochure", "title": "Get brochure"},
            {"id": "act:agent", "title": "Talk to agent"},
        ],
    }


def build_products_menu(division: str, products: list) -> str:
    if not products:
        return (f"We don't have any live products in *{division}* right now.\n\n"
                f"Reply *0* to talk to a specialist, or *menu* to see other divisions.")
    lines = [f"Here are our top picks in *{division}*:", ""]
    letters = ["A", "B", "C", "D", "E"]
    for i, p in enumerate(products):
        name = p.get("product_name_display") or p.get("product_name") or ""
        brand = p.get("brand") or p.get("semantic_brand_system") or ""
        lines.append(f"*{letters[i]}.* {name}")
        if brand:
            lines.append(f"    Brand: {brand}")
    lines += [
        "",
        "Reply with *A*, *B* or *C* for details.",
        "Reply *menu* to see other divisions.",
    ]
    return "\n".join(lines)


def build_product_detail(product: dict) -> str:
    name = product.get("product_name_display") or product.get("product_name") or ""
    brand = product.get("brand") or product.get("semantic_brand_system") or ""
    cat = product.get("category") or ""
    lines = [
        f"*{name}*",
        f"Brand: {brand}" if brand else "",
        f"Category: {cat}" if cat else "",
        "",
        "What would you like to do?",
        "1. Request bulk quote",
        "2. Get brochure",
        "3. Talk to our ortho specialist",
        "",
        "Reply *menu* to go back.",
    ]
    return "\n".join([ln for ln in lines if ln != ""])


def build_quote_confirmation(name_or_phone: str) -> str:
    return (
        "Great — we've logged your quote request!\n\n"
        f"Our team will reach out within a few hours at this number. "
        f"For urgent queries, call *{CONTACT_ORTHO}* (Ortho/Spine) or *{CONTACT_GENERAL}* (General)."
    )


def build_brochure_reply(product: dict) -> str:
    slug = product.get("slug") or ""
    name = product.get("product_name_display") or product.get("product_name") or "Product"
    division = product.get("division_canonical") or ""
    product_url = f"https://www.agileortho.in/catalog/products/{slug}" if slug else "https://www.agileortho.in/catalog"

    # Real brochure PDF from object storage (when available)
    brochure_path = product.get("brochure_url") or ""
    if brochure_path:
        if brochure_path.startswith("http"):
            pdf_url = brochure_path
        else:
            pdf_url = f"https://www.agileortho.in/api/files/{brochure_path.lstrip('/')}"
        return (
            f"📄 Full brochure PDF: {pdf_url}\n"
            f"🔗 Product page: {product_url}\n\n"
            f"Reply *1* for a bulk quote on {name[:40]}, or *menu* for other products."
        )

    # No PDF brochure — build a richer fallback that still feels useful
    lines = [f"*{name}*"]
    images = product.get("images") or []
    if images:
        img0 = images[0]
        img_path = img0.get("storage_path") if isinstance(img0, dict) else ""
        if img_path:
            lines.append(f"🖼 Image: https://www.agileortho.in/api/files/{img_path.lstrip('/')}")
    lines.append(f"🔗 Full specs + pricing enquiry: {product_url}")
    if division:
        div_slug = division.strip().lower().replace(" ", "-")
        lines.append(f"📁 {division} catalog: https://www.agileortho.in/catalog/{div_slug}")
    lines.append("")
    lines.append(f"We've alerted our specialist to send you the detailed brochure for *{name[:40]}* within the hour.")
    lines.append("")
    lines.append("Reply *1* for bulk quote  |  *menu* for other products  |  *call* to speak now")
    return "\n".join(lines)


def build_agent_handoff() -> str:
    return (
        "Connecting you with our specialists. You can reach us directly:\n\n"
        f"• Ortho / Spine: *{CONTACT_ORTHO}*\n"
        f"• Dispatch: *{CONTACT_DISPATCH}*\n"
        f"• General: *{CONTACT_GENERAL}*\n\n"
        "Someone from our team will message you here shortly."
    )


# --- Keyword routing ---

def detect_division_from_text(text: str) -> Optional[str]:
    """Match keywords with word boundaries so short keywords (ent, hip) don't
    trigger on substrings inside longer words (center, relationship, shipping)."""
    low = (text or "").lower()
    # Guard: messages under 8 chars (likely buttons/digits) or > 400 chars
    # (likely business cards / long auto-texts) should not trigger division detection
    # beyond exact-word matches
    if len(low) > 400:
        # Only match the stronger keywords (length >= 5) to avoid noise
        for div, keywords in DIVISION_KEYWORDS.items():
            for kw in keywords:
                if len(kw) >= 5 and re.search(rf"\b{re.escape(kw)}", low):
                    return div
        return None
    for div, keywords in DIVISION_KEYWORDS.items():
        for kw in keywords:
            # Word-boundary on both sides for any keyword ≤ 4 chars to prevent
            # "ent" matching inside "center", "hip" inside "shipping", etc.
            if len(kw) <= 4:
                if re.search(rf"\b{re.escape(kw)}\b", low):
                    return div
            else:
                # Left-boundary only for longer roots like "diagnost", "analy"
                if re.search(rf"\b{re.escape(kw)}", low):
                    return div
    return None


def is_root_trigger(text: str) -> bool:
    t = (text or "").strip().lower()
    return t in ROOT_TRIGGERS or t == "menu"


def parse_division_choice(text: str) -> Optional[int]:
    """Return 1-13 if the text is a valid division number, else None."""
    t = (text or "").strip()
    m = re.match(r"^(\d{1,2})\b", t)
    if not m:
        return None
    n = int(m.group(1))
    return n if 1 <= n <= len(DIVISIONS) else None


def parse_product_choice(text: str) -> Optional[int]:
    """Return 0-based index (0..2) if text is A/B/C (case-insensitive)."""
    t = (text or "").strip().upper()
    if len(t) >= 1 and t[0] in ("A", "B", "C", "D", "E"):
        return ord(t[0]) - ord("A")
    return None


def parse_detail_action(text: str) -> Optional[str]:
    """Return 'quote' | 'brochure' | 'agent' from a numeric reply or interactive ID."""
    t = (text or "").strip().lower()
    # Interactive button reply IDs
    if t.startswith("act:"):
        token = t.split(":", 1)[1]
        if token in ("quote", "brochure", "agent"):
            return token
    if t.startswith("1"):
        return "quote"
    if t.startswith("2"):
        return "brochure"
    if t.startswith("3"):
        return "agent"
    return None


def parse_interactive_reply(text: str) -> Optional[dict]:
    """Decode an interactive reply id like 'div:Trauma', 'prod:some-slug', 'act:quote'."""
    t = (text or "").strip()
    if ":" not in t:
        return None
    kind, _, value = t.partition(":")
    kind = kind.lower()
    if kind in ("div", "prod", "act"):
        return {"kind": kind, "value": value}
    return None


def _text_reply(s: str) -> dict:
    return {"type": "text", "text": s}


def _pick_reply(text_variant: str, interactive_payload: Optional[dict], mode: str) -> dict:
    """Return interactive payload if mode allows it, else plain text."""
    if mode == "interactive" and interactive_payload:
        return interactive_payload
    return _text_reply(text_variant)


# --- Core engine ---

async def try_handle_funnel(
    phone: str,
    message_text: str,
    customer_name: str = "",
    mode: str = "text",
) -> Optional[list]:
    """
    Attempt to advance the WhatsApp conversation through the funnel.

    Returns a list of payload dicts (``{"type": "text"|"interactive_list"|"interactive_buttons", ...}``)
    or ``None`` if the caller should fall back to the AI bot.

    ``mode``: ``"text"`` (default, plain numbered menus) or ``"interactive"``
    (WhatsApp native list/button UI — only works inside the 24h session window).
    """
    state = await _get_funnel_state(phone)
    current_node = state.get("node", "root")
    next_state = dict(state)

    text_raw = (message_text or "").strip()
    text_clean = text_raw
    interactive = parse_interactive_reply(text_raw)

    # Global reset: "menu"/"start"/etc. → root picker
    if is_root_trigger(text_clean):
        reply = _pick_reply(build_welcome_menu(), build_welcome_list_payload(), mode)
        next_state = {"node": "division_picker", "history": state.get("history", []) + ["root_menu"]}
        await _set_funnel_state(phone, next_state)
        await _log_event(phone, current_node, "division_picker", text_clean, "show_menu")
        return [reply]

    # ROOT: first-ever message
    if current_node == "root":
        div = detect_division_from_text(text_clean)
        if div:
            products = await _top_products_for_division(div)
            reply = _pick_reply(
                build_products_menu(div, products),
                build_products_list_payload(div, products),
                mode,
            )
            next_state = {
                "node": "product_picker",
                "division": div,
                "products": [p.get("slug", "") for p in products],
                "history": ["root", f"keyword:{div}"],
            }
            await _set_funnel_state(phone, next_state)
            await _log_event(phone, "root", "product_picker", text_clean, f"keyword:{div}")
            return [reply]

        reply = _pick_reply(build_welcome_menu(), build_welcome_list_payload(), mode)
        next_state = {"node": "division_picker", "history": ["root"]}
        await _set_funnel_state(phone, next_state)
        await _log_event(phone, "root", "division_picker", text_clean, "welcome")
        return [reply]

    # DIVISION PICKER: expect numeric (1..13) or interactive list row (div:Trauma) or "0"
    if current_node == "division_picker":
        # Interactive list row tapped
        if interactive and interactive["kind"] == "div":
            v = interactive["value"]
            if v == "_AGENT":
                reply = _text_reply(build_agent_handoff())
                await _log_event(phone, "division_picker", "agent", text_clean, "agent_handoff")
                await _set_funnel_state(phone, {"node": "agent", "history": state.get("history", []) + ["agent"]})
                return [reply]
            if v in DIVISIONS:
                products = await _top_products_for_division(v)
                reply = _pick_reply(
                    build_products_menu(v, products),
                    build_products_list_payload(v, products),
                    mode,
                )
                next_state = {
                    "node": "product_picker",
                    "division": v,
                    "products": [p.get("slug", "") for p in products],
                    "history": state.get("history", []) + [f"division:{v}"],
                }
                await _set_funnel_state(phone, next_state)
                await _log_event(phone, "division_picker", "product_picker", text_clean, f"division:{v}")
                return [reply]
        # Numeric text
        if text_clean == "0":
            reply = _text_reply(build_agent_handoff())
            await _log_event(phone, "division_picker", "agent", text_clean, "agent_handoff")
            await _set_funnel_state(phone, {"node": "agent", "history": state.get("history", []) + ["agent"]})
            return [reply]
        idx = parse_division_choice(text_clean)
        if idx is not None:
            div = DIVISIONS[idx - 1]
            products = await _top_products_for_division(div)
            reply = _pick_reply(
                build_products_menu(div, products),
                build_products_list_payload(div, products),
                mode,
            )
            next_state = {
                "node": "product_picker",
                "division": div,
                "products": [p.get("slug", "") for p in products],
                "history": state.get("history", []) + [f"division:{div}"],
            }
            await _set_funnel_state(phone, next_state)
            await _log_event(phone, "division_picker", "product_picker", text_clean, f"division:{div}")
            return [reply]
        return None

    # PRODUCT PICKER: expect A/B/C or interactive prod:<slug>
    if current_node == "product_picker":
        chosen_slug = None
        if interactive and interactive["kind"] == "prod":
            chosen_slug = interactive["value"]
        else:
            idx = parse_product_choice(text_clean)
            if idx is not None and idx < len(state.get("products", [])):
                chosen_slug = state["products"][idx]

        if chosen_slug:
            product = await catalog_products_col.find_one({"slug": chosen_slug}, {"_id": 0})
            if not product:
                return None
            reply = _pick_reply(
                build_product_detail(product),
                build_product_detail_buttons_payload(product),
                mode,
            )
            next_state = {
                "node": "product_detail",
                "division": state.get("division", ""),
                "products": state.get("products", []),
                "selected_slug": chosen_slug,
                "history": state.get("history", []) + [f"product:{chosen_slug}"],
            }
            await _set_funnel_state(phone, next_state)
            await _log_event(phone, "product_picker", "product_detail", text_clean, f"product:{chosen_slug}")
            return [reply]
        return None

    # PRODUCT DETAIL: expect 1/2/3 or interactive act:quote|brochure|agent
    if current_node == "product_detail":
        action = parse_detail_action(text_clean)
        slug = state.get("selected_slug", "")
        product = await catalog_products_col.find_one({"slug": slug}, {"_id": 0}) if slug else None

        if action == "quote":
            await _upgrade_lead_to_quote(phone, product, customer_name)
            reply = _text_reply(build_quote_confirmation(customer_name or phone))
            await _log_event(phone, "product_detail", "quote_requested", text_clean, "quote")
            await _set_funnel_state(phone, {"node": "quote_requested", "history": state.get("history", []) + ["quote"]})
            return [reply]
        if action == "brochure":
            reply = _text_reply(build_brochure_reply(product or {}))
            await _log_event(phone, "product_detail", "brochure_sent", text_clean, "brochure")
            await _set_funnel_state(phone, {"node": "brochure_sent", "history": state.get("history", []) + ["brochure"]})
            # Auto-alert sales when brochure is missing — they need to send PDF manually
            if product and not (product.get("brochure_url") or "").strip():
                try:
                    import asyncio as _asyncio
                    _asyncio.create_task(_alert_sales_missing_brochure(phone, product, customer_name))
                except Exception as _e:
                    print(f"[BROCHURE_ALERT] failed: {_e}")
            return [reply]
        if action == "agent":
            reply = _text_reply(build_agent_handoff())
            await _log_event(phone, "product_detail", "agent", text_clean, "agent_handoff")
            await _set_funnel_state(phone, {"node": "agent", "history": state.get("history", []) + ["agent"]})
            return [reply]
        return None

    return None


# ═══════════════════════════════════════════════════════════════════════════
# AUTO-REPLY DETECTION — prevent bot-to-bot conversations
# ═══════════════════════════════════════════════════════════════════════════
_AUTO_REPLY_PATTERNS = [
    r"(?i)thank(s)?\s+you\s+for\s+(your\s+)?(message|contact)",
    r"(?i)we(?:'re|'ve|\s+are)\s+(currently\s+)?(unavailable|out\s+of\s+office|closed|busy)",
    r"(?i)please\s+wait\s+(for\s+one\s+of\s+our\s+)?(operator|agent|representative|team)",
    r"(?i)will\s+(respond|reply|get\s+back)\s+(to\s+you\s+)?(as\s+soon\s+as|shortly|soon)",
    r"(?i)(we\s+)?look\s+forward\s+to\s+(serving|hearing)",
    r"(?i)greetings\s+from\s+",
    r"(?i)welcome\s+to\s+.{3,60}(hospital|clinic|diagnostic|centre|center|lab|care|hotel|restaurant)",
    r"(?i)(we\s+are\s+)?not\s+open\s+right\s+now",
    r"(?i)our\s+(office|business|store)\s+hours",
    r"(?i)automated\s+(message|reply|response)",
    r"(?i)this\s+is\s+an?\s+auto(-|\s)?(reply|generated)",
    r"(?i)assalamu?\s*alaikum.{0,60}(thank|messag|unavailable|respond|contact)",
    r"(?i)dhanyavaad.*message",
    r"(?i)sampark.*aabhaar",
]

_BUSINESS_INDICATORS = [
    r"(?i)\bcustomer\s+care\b",
    r"(?i)\bsupport\s+team\b",
    r"(?i)\bhelp(desk|\s+line)\b",
    r"(?i)\boperating\s+hours\b",
]


def is_business_auto_reply(text: str, customer_name: str = "") -> bool:
    """Detect WhatsApp business auto-replies so we don't engage in bot-to-bot
    loops that hurt Meta quality rating."""
    if not text:
        return False
    t = text.strip()
    if len(t) < 20:
        return False
    for pat in _AUTO_REPLY_PATTERNS:
        if re.search(pat, t):
            return True
    if t.startswith("`") and t.endswith("`") and len(t) > 40:
        return True
    indicator_hits = sum(1 for pat in _BUSINESS_INDICATORS if re.search(pat, t))
    if indicator_hits >= 2:
        return True
    return False



async def _alert_sales_missing_brochure(phone: str, product: dict, customer_name: str):
    """Ping sales team when someone asks for a brochure we don't have."""
    try:
        import os as _os
        from routes.whatsapp import send_whatsapp_message
        sales_wa = _os.environ.get("SALES_WHATSAPP", "917416521222")
        name = product.get("product_name_display") or product.get("product_name") or "product"
        alert = (
            "BROCHURE REQUEST — missing PDF\n"
            f"From: {customer_name or 'Unknown'} ({phone})\n"
            f"Asked for: {name}\n"
            f"Slug: {product.get('slug','')}\n"
            "Action: send PDF brochure manually within the hour.\n"
            "— Agile Ortho AI"
        )
        await send_whatsapp_message(sales_wa, alert, callback_data="brochure_missing_alert")
    except Exception as e:
        print(f"[BROCHURE_ALERT] fail: {e}")



async def _upgrade_lead_to_quote(phone: str, product: Optional[dict], customer_name: str):
    """Mark the lead as quote-requested and boost the score."""
    product_name = ""
    if product:
        product_name = product.get("product_name_display") or product.get("product_name") or ""

    existing = await leads_col.find_one({"phone_whatsapp": phone})
    payload = {
        "inquiry_type": "Bulk Quote",
        "product_interest": product_name or "WhatsApp funnel quote request",
        "score": "Hot",
        "score_value": 80,
        "status": "new",
        "source": "whatsapp_funnel",
        "updated_at": _now(),
    }
    if existing:
        await leads_col.update_one({"_id": existing["_id"]}, {"$set": payload})
    else:
        await leads_col.insert_one({
            "name": customer_name or f"WhatsApp {phone}",
            "phone_whatsapp": phone,
            "hospital_clinic": "", "email": "", "district": "",
            "created_at": _now(),
            **payload,
        })


# --- Analytics ---

async def funnel_analytics() -> dict:
    """Aggregate funnel-stage counts for admin dashboard."""
    stages_order = [
        (["welcome", "show_menu"], "Started"),
        ("division:", "Picked Division"),
        ("product:", "Picked Product"),
        ("quote", "Requested Quote"),
        ("brochure", "Requested Brochure"),
        (["agent_handoff"], "Asked for Agent"),
    ]

    counts = []
    for key, label in stages_order:
        if isinstance(key, list):
            c = await funnel_events_col.count_documents({"action": {"$in": key}})
            stage_key = "|".join(key)
        elif key.endswith(":"):
            c = await funnel_events_col.count_documents(
                {"action": {"$regex": f"^{re.escape(key[:-1])}:"}}
            )
            stage_key = key
        else:
            c = await funnel_events_col.count_documents({"action": key})
            stage_key = key
        counts.append({"key": stage_key, "label": label, "count": c})

    # Distinct phones entering each stage (conversion)
    async def distinct_phones(action_filter):
        return len(await funnel_events_col.distinct("phone", action_filter))

    distinct = {
        "started": await distinct_phones({"action": {"$in": ["welcome", "show_menu"]}}),
        "division_picked": await distinct_phones({"action": {"$regex": "^(division|keyword):"}}),
        "product_picked": await distinct_phones({"action": {"$regex": "^product:"}}),
        "quote_requested": await distinct_phones({"action": "quote"}),
        "brochure_requested": await distinct_phones({"action": "brochure"}),
        "agent_requested": await distinct_phones({"action": "agent_handoff"}),
    }

    # Per-division breakdown
    per_division_cursor = funnel_events_col.aggregate([
        {"$match": {"action": {"$regex": "^division:"}}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ])
    per_division = []
    async for row in per_division_cursor:
        per_division.append({
            "division": row["_id"].split(":", 1)[1],
            "count": row["count"],
        })

    # Recent funnel events
    recent_cursor = funnel_events_col.find({}, {"_id": 0}).sort("timestamp", -1).limit(25)
    recent = await recent_cursor.to_list(25)

    total_events = await funnel_events_col.count_documents({})

    return {
        "total_events": total_events,
        "stages": counts,
        "distinct_phones": distinct,
        "per_division": per_division,
        "recent": recent,
    }


async def ensure_indexes():
    await funnel_events_col.create_index("phone")
    await funnel_events_col.create_index("action")
    await funnel_events_col.create_index("timestamp")
