"""
Outbound Engine — rule-based WhatsApp outreach with quality & safety guardrails.

Key guarantees:
  • No message sent to `source:google_maps` leads without prior opt-in (MVP-C)
  • Global daily cap (default 2000, configurable)
  • Auto-pause kill-switch when >3 spam/block events in 24h
  • 7-day cooldown per phone number
  • Business-hours only (9 AM – 7 PM IST, configurable)
  • Every link carries a unique tracking ID (UTM click → auto lead upgrade)

Collections:
  • outbound_rules_col — rule definitions (editable via admin UI)
  • outbound_sends_col — one doc per send attempt (source of truth for tracking)
  • outbound_quality_col — daily quality snapshot (singleton per date)
"""
from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from db import db as mongo_db, leads_col

outbound_rules_col = mongo_db["outbound_rules"]
outbound_sends_col = mongo_db["outbound_sends"]
outbound_quality_col = mongo_db["outbound_quality"]
app_config_col = mongo_db["app_config"]

IST = ZoneInfo("Asia/Kolkata")

# Defaults (overridable via app_config.type="outbound_config")
DEFAULT_DAILY_CAP = 2000
DEFAULT_COOLDOWN_HOURS = 168            # 7 days
DEFAULT_BLOCK_THRESHOLD = 3             # pause if ≥N blocks in 24h
DEFAULT_BUSINESS_HOURS = (9, 19)        # 9 AM – 7 PM IST
DEFAULT_OPT_IN_REQUIRED_SOURCES = ["google_maps", "indiamart_rfq"]


# ============================================================
# Config helpers
# ============================================================
async def get_config() -> dict:
    doc = await app_config_col.find_one({"type": "outbound_config"}, {"_id": 0}) or {}
    return {
        "daily_cap": doc.get("daily_cap", DEFAULT_DAILY_CAP),
        "cooldown_hours": doc.get("cooldown_hours", DEFAULT_COOLDOWN_HOURS),
        "block_threshold": doc.get("block_threshold", DEFAULT_BLOCK_THRESHOLD),
        "business_hours": doc.get("business_hours", list(DEFAULT_BUSINESS_HOURS)),
        "opt_in_required_sources": doc.get("opt_in_required_sources", DEFAULT_OPT_IN_REQUIRED_SOURCES),
        "engine_enabled": doc.get("engine_enabled", True),
    }


async def update_config(patch: dict) -> dict:
    allowed = {"daily_cap", "cooldown_hours", "block_threshold", "business_hours",
               "opt_in_required_sources", "engine_enabled"}
    update = {k: v for k, v in patch.items() if k in allowed}
    update["updated_at"] = _now_iso()
    await app_config_col.update_one(
        {"type": "outbound_config"},
        {"$set": {"type": "outbound_config", **update}},
        upsert=True,
    )
    return await get_config()


# ============================================================
# Quality / safety layer
# ============================================================
def _today_key() -> str:
    return datetime.now(IST).strftime("%Y-%m-%d")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def get_quality_today() -> dict:
    key = _today_key()
    doc = await outbound_quality_col.find_one({"date": key}, {"_id": 0})
    if not doc:
        doc = {"date": key, "sent_count": 0, "blocks_count": 0, "opt_in_count": 0,
               "click_count": 0, "reply_count": 0, "paused": False,
               "pause_reason": "", "updated_at": _now_iso()}
        await outbound_quality_col.insert_one({**doc})
    return doc


async def _bump_quality(field: str, inc: int = 1):
    await outbound_quality_col.update_one(
        {"date": _today_key()},
        {"$inc": {field: inc}, "$set": {"updated_at": _now_iso()}},
        upsert=True,
    )


async def check_kill_switch() -> tuple[bool, str]:
    """Return (can_send, reason). Auto-pauses when block threshold exceeded."""
    cfg = await get_config()
    if not cfg["engine_enabled"]:
        return False, "engine_disabled"

    q = await get_quality_today()
    if q.get("paused"):
        return False, f"paused: {q.get('pause_reason', 'manual')}"

    if q.get("blocks_count", 0) >= cfg["block_threshold"]:
        await outbound_quality_col.update_one(
            {"date": _today_key()},
            {"$set": {"paused": True, "pause_reason": f"auto: {q['blocks_count']} blocks today"}},
        )
        return False, f"auto_paused: {q['blocks_count']} blocks"

    if q.get("sent_count", 0) >= cfg["daily_cap"]:
        return False, f"daily_cap_hit: {cfg['daily_cap']}"

    # Business hours check
    hour = datetime.now(IST).hour
    lo, hi = cfg["business_hours"]
    if not (lo <= hour < hi):
        return False, f"outside_business_hours: now={hour}, allowed={lo}-{hi}"

    return True, "ok"


async def record_block_event(phone: str, reason: str = "spam_report"):
    """Called by webhook when Meta flags a message as blocked/spam."""
    await _bump_quality("blocks_count", 1)
    await outbound_sends_col.update_one(
        {"phone": phone, "status": "sent"},
        {"$set": {"blocked_at": _now_iso(), "block_reason": reason}},
        upsert=False,
    )


async def manual_pause(reason: str):
    await outbound_quality_col.update_one(
        {"date": _today_key()},
        {"$set": {"paused": True, "pause_reason": f"manual: {reason}", "updated_at": _now_iso()}},
        upsert=True,
    )


async def manual_resume():
    await outbound_quality_col.update_one(
        {"date": _today_key()},
        {"$set": {"paused": False, "pause_reason": "", "updated_at": _now_iso()}},
        upsert=True,
    )


# ============================================================
# Cooldown / opt-in checks (per-lead)
# ============================================================
async def _in_cooldown(phone: str, cooldown_hours: int) -> bool:
    cutoff = _now() - timedelta(hours=cooldown_hours)
    last = await outbound_sends_col.find_one(
        {"phone": phone, "status": "sent"},
        sort=[("sent_at_dt", -1)],
    )
    if not last:
        return False
    sent_at = last.get("sent_at_dt")
    return bool(sent_at and sent_at > cutoff)


async def has_opted_in(phone: str) -> bool:
    doc = await outbound_sends_col.find_one(
        {"phone": phone, "opted_in_at": {"$ne": None}},
        sort=[("opted_in_at", -1)],
    )
    return bool(doc)


# ============================================================
# Rule management
# ============================================================
async def list_rules() -> list:
    return await outbound_rules_col.find({}, {"_id": 0}).sort("priority", 1).to_list(200)


async def upsert_rule(rule: dict) -> dict:
    rule_id = rule.get("id") or uuid.uuid4().hex[:12]
    doc = {
        "id": rule_id,
        "name": rule.get("name", "Unnamed rule"),
        "enabled": bool(rule.get("enabled", True)),
        "match": rule.get("match", {}),                   # e.g. {"source":"google_maps","status":"new","min_age_minutes":10}
        "template_name": rule.get("template_name", ""),
        "body_values": rule.get("body_values", []),       # list of token strings, e.g. ["{{product_interest}}"]
        "header_values": rule.get("header_values", []),
        "button_values": rule.get("button_values", {}),
        "cooldown_hours": int(rule.get("cooldown_hours", DEFAULT_COOLDOWN_HOURS)),
        "priority": int(rule.get("priority", 10)),
        "updated_at": _now_iso(),
    }
    existing = await outbound_rules_col.find_one({"id": rule_id})
    if existing:
        await outbound_rules_col.update_one({"id": rule_id}, {"$set": doc})
    else:
        doc["created_at"] = _now_iso()
        await outbound_rules_col.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


async def delete_rule(rule_id: str) -> int:
    res = await outbound_rules_col.delete_one({"id": rule_id})
    return res.deleted_count


# ============================================================
# Template token substitution
# ============================================================
def _render_tokens(values: list, lead: dict, tracking_id: str) -> list:
    out = []
    ctx = {
        "name": lead.get("name", "Doctor"),
        "hospital": lead.get("hospital_clinic", ""),
        "district": lead.get("district", ""),
        "product_interest": lead.get("product_interest", "orthopedic implants"),
        "category": lead.get("gmaps_category", "clinic"),
        "tracking_id": tracking_id,
    }
    for v in values or []:
        rendered = str(v)
        for key, val in ctx.items():
            rendered = rendered.replace("{{" + key + "}}", str(val or ""))
        out.append(rendered)
    return out


# ============================================================
# Core sender (wraps existing send_whatsapp_template + logging)
# ============================================================
async def send_outbound(lead: dict, rule: dict) -> dict:
    """Send a single outbound template to a lead per rule. Assumes gates passed."""
    # Lazy import to avoid circular (routes/whatsapp.py imports from this file transitively)
    from routes.whatsapp import send_whatsapp_template

    phone = (lead.get("phone_whatsapp") or "").strip()
    if not phone:
        return {"sent": False, "error": "no_phone"}

    tracking_id = uuid.uuid4().hex[:16]
    body_values = _render_tokens(rule.get("body_values"), lead, tracking_id)
    header_values = _render_tokens(rule.get("header_values"), lead, tracking_id)
    button_values = rule.get("button_values") or {}

    send_doc = {
        "tracking_id": tracking_id,
        "lead_id": str(lead.get("_id", "")) or lead.get("id", ""),
        "phone": phone,
        "rule_id": rule.get("id"),
        "rule_name": rule.get("name"),
        "template_name": rule.get("template_name"),
        "body_values": body_values,
        "status": "pending",
        "sent_at_dt": None,
        "sent_at": None,
        "clicked_at": None,
        "opted_in_at": None,
        "replied_at": None,
        "blocked_at": None,
        "created_at": _now_iso(),
    }
    insert_res = await outbound_sends_col.insert_one(send_doc)

    res = await send_whatsapp_template(
        phone=phone,
        template_name=rule["template_name"],
        body_values=body_values if body_values else None,
        header_values=header_values if header_values else None,
        button_values=button_values if button_values else None,
        callback_data=f"outbound:{tracking_id}",
    )

    if res.get("success"):
        await outbound_sends_col.update_one(
            {"_id": insert_res.inserted_id},
            {"$set": {
                "status": "sent",
                "sent_at": _now_iso(),
                "sent_at_dt": _now(),
                "message_id": res.get("message_id", ""),
            }},
        )
        await _bump_quality("sent_count", 1)
        await leads_col.update_one(
            {"phone_whatsapp": phone},
            {"$set": {"last_outbound_at": _now_iso(),
                      "last_outbound_template": rule["template_name"]}},
        )
        return {"sent": True, "tracking_id": tracking_id, "message_id": res.get("message_id")}
    else:
        await outbound_sends_col.update_one(
            {"_id": insert_res.inserted_id},
            {"$set": {"status": "failed", "error": str(res.get("error") or res.get("data"))[:500]}},
        )
        return {"sent": False, "error": res.get("error") or "interakt_error", "tracking_id": tracking_id}


# ============================================================
# Rule matcher — find leads that match a rule's criteria
# ============================================================
def _build_match_filter(match: dict) -> dict:
    """Translate a rule's match criteria into a MongoDB filter."""
    filt = {"phone_whatsapp": {"$nin": [None, ""]}}
    if match.get("source"):
        filt["source"] = match["source"]
    if match.get("status"):
        filt["status"] = match["status"]
    if match.get("score"):
        filt["score"] = match["score"]
    if match.get("district"):
        filt["district"] = match["district"]
    if match.get("min_age_minutes"):
        cutoff = _now() - timedelta(minutes=int(match["min_age_minutes"]))
        filt["created_at"] = {"$lte": cutoff.isoformat()}
    if match.get("max_age_days"):
        floor = _now() - timedelta(days=int(match["max_age_days"]))
        filt.setdefault("created_at", {})
        filt["created_at"]["$gte"] = floor.isoformat()
    return filt


async def _candidates_for_rule(rule: dict, limit: int = 200) -> list:
    filt = _build_match_filter(rule.get("match", {}))
    return await leads_col.find(filt).sort("created_at", 1).limit(limit).to_list(limit)


# ============================================================
# Tick — runs every 5 minutes, processes enabled rules
# ============================================================
async def process_rules_tick(batch_per_rule: int = 50) -> dict:
    """One pass through all enabled rules. Returns summary."""
    can_send, reason = await check_kill_switch()
    if not can_send:
        return {"ran": False, "reason": reason, "sends": 0}

    cfg = await get_config()
    rules = [r for r in await list_rules() if r.get("enabled")]
    rules.sort(key=lambda r: r.get("priority", 10))

    total_sent = 0
    summary = []
    for rule in rules:
        if not rule.get("template_name"):
            continue
        rule_sent = 0
        rule_skipped = 0
        candidates = await _candidates_for_rule(rule, limit=batch_per_rule)
        for lead in candidates:
            # Re-check gates each send (cap may fill mid-batch)
            can, _ = await check_kill_switch()
            if not can:
                break

            phone = (lead.get("phone_whatsapp") or "").strip()
            if not phone:
                continue

            # Opt-in required for certain sources
            src = lead.get("source", "")
            if src in cfg["opt_in_required_sources"] and not await has_opted_in(phone):
                # Only send the opt-in template itself (the "gateway" rule)
                # Rules that enforce opt-in upstream set `match.source`. If this
                # rule's template is not an opt-in, skip.
                if "optin" not in (rule.get("template_name") or ""):
                    rule_skipped += 1
                    continue

            if await _in_cooldown(phone, rule.get("cooldown_hours", DEFAULT_COOLDOWN_HOURS)):
                rule_skipped += 1
                continue

            res = await send_outbound(lead, rule)
            if res.get("sent"):
                rule_sent += 1
                total_sent += 1
            await asyncio.sleep(0.15)  # gentle pacing

        summary.append({"rule": rule["name"], "sent": rule_sent, "skipped": rule_skipped})

    return {"ran": True, "sends": total_sent, "rules": summary}


# ============================================================
# Tracking / webhooks (called by routes/outbound.py)
# ============================================================
async def record_click(tracking_id: str) -> Optional[dict]:
    doc = await outbound_sends_col.find_one({"tracking_id": tracking_id})
    if not doc:
        return None
    await outbound_sends_col.update_one(
        {"tracking_id": tracking_id},
        {"$set": {"clicked_at": _now_iso()}},
    )
    await _bump_quality("click_count", 1)
    # Upgrade lead to Warm
    if doc.get("phone"):
        await leads_col.update_one(
            {"phone_whatsapp": doc["phone"]},
            {"$set": {"score": "Warm", "score_value": 60, "status": "contacted",
                      "last_click_at": _now_iso()}},
        )
    return doc


async def record_optin(phone: str):
    """Called when a lead clicks 'Yes, send catalog' on the opt-in template."""
    now = _now_iso()
    await outbound_sends_col.update_many(
        {"phone": phone, "opted_in_at": None},
        {"$set": {"opted_in_at": now}},
    )
    await _bump_quality("opt_in_count", 1)
    await leads_col.update_one(
        {"phone_whatsapp": phone},
        {"$set": {"opted_in_at": now, "score": "Warm", "score_value": 70,
                  "status": "qualified"}},
    )


async def record_reply(phone: str):
    await outbound_sends_col.update_one(
        {"phone": phone, "status": "sent"},
        {"$set": {"replied_at": _now_iso()}},
        upsert=False,
    )
    await _bump_quality("reply_count", 1)


# ============================================================
# Dashboard stats
# ============================================================
async def get_dashboard() -> dict:
    cfg = await get_config()
    q = await get_quality_today()
    can_send, reason = await check_kill_switch()
    total_rules = await outbound_rules_col.count_documents({})
    active_rules = await outbound_rules_col.count_documents({"enabled": True})

    last7_cutoff = (_now() - timedelta(days=7)).isoformat()
    sent_7d = await outbound_sends_col.count_documents({
        "status": "sent", "sent_at": {"$gte": last7_cutoff}
    })
    clicks_7d = await outbound_sends_col.count_documents({
        "clicked_at": {"$gte": last7_cutoff}
    })
    optins_7d = await outbound_sends_col.count_documents({
        "opted_in_at": {"$gte": last7_cutoff}
    })

    recent = await outbound_sends_col.find(
        {}, {"_id": 0, "body_values": 0}
    ).sort("created_at", -1).limit(25).to_list(25)

    return {
        "config": cfg,
        "today": q,
        "can_send_now": can_send,
        "reason": reason,
        "total_rules": total_rules,
        "active_rules": active_rules,
        "last_7d": {"sent": sent_7d, "clicks": clicks_7d, "opt_ins": optins_7d,
                    "click_rate": round(clicks_7d / sent_7d * 100, 1) if sent_7d else 0.0,
                    "opt_in_rate": round(optins_7d / sent_7d * 100, 1) if sent_7d else 0.0},
        "recent_sends": recent,
    }


# ============================================================
# Background scheduler — called from server.py startup
# ============================================================
_scheduler_task: Optional[asyncio.Task] = None


async def _scheduler_loop(interval_seconds: int = 300):
    while True:
        try:
            await process_rules_tick()
        except Exception as e:
            # Log but keep the loop alive
            import logging
            logging.exception(f"outbound scheduler tick failed: {e}")
        await asyncio.sleep(interval_seconds)


def start_scheduler(interval_seconds: int = 300):
    global _scheduler_task
    if _scheduler_task and not _scheduler_task.done():
        return
    _scheduler_task = asyncio.create_task(_scheduler_loop(interval_seconds))


async def ensure_indexes():
    await outbound_rules_col.create_index("id", unique=True)
    await outbound_rules_col.create_index("enabled")
    await outbound_sends_col.create_index("tracking_id", unique=True)
    await outbound_sends_col.create_index("phone")
    await outbound_sends_col.create_index("status")
    await outbound_sends_col.create_index([("phone", 1), ("sent_at_dt", -1)])
    await outbound_quality_col.create_index("date", unique=True)
