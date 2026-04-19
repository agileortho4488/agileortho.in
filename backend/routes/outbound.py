"""
Outbound Engine admin API + public click tracking.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse

from helpers import admin_required
from services import outbound_engine as oe

router = APIRouter()


# ============================================================
# Admin dashboard
# ============================================================
@router.get("/api/admin/outbound/dashboard")
async def outbound_dashboard(_=Depends(admin_required)):
    return await oe.get_dashboard()


@router.get("/api/admin/outbound/config")
async def get_outbound_config(_=Depends(admin_required)):
    return await oe.get_config()


@router.put("/api/admin/outbound/config")
async def put_outbound_config(request: Request, _=Depends(admin_required)):
    body = await request.json()
    return await oe.update_config(body)


# ============================================================
# AI Lead Handler admin — view recent, correct mistakes
# ============================================================
from services import ai_lead_handler as aih
from db import db as _db_aih


@router.get("/api/admin/ai/recent")
async def ai_recent_interactions(
    intent: str = "",
    channel: str = "",
    limit: int = 50,
    _=Depends(admin_required),
):
    q = {}
    if intent:
        q["intent"] = intent.upper()
    if channel:
        q["channel"] = channel
    rows = await _db_aih["ai_interactions"].find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"interactions": rows, "total": len(rows)}


@router.get("/api/admin/ai/stats")
async def ai_stats(_=Depends(admin_required)):
    pipeline = [
        {"$group": {"_id": "$intent", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    by_intent = await _db_aih["ai_interactions"].aggregate(pipeline).to_list(20)
    total = await _db_aih["ai_interactions"].count_documents({})
    last_24h = await _db_aih["ai_interactions"].count_documents({
        "created_at": {"$gte": (__import__("datetime").datetime.now(__import__("datetime").timezone.utc)
                                - __import__("datetime").timedelta(hours=24)).isoformat()}
    })
    return {
        "total_interactions": total,
        "last_24h": last_24h,
        "by_intent": [{"intent": r["_id"], "count": r["count"]} for r in by_intent],
    }


@router.get("/api/admin/ai/config")
async def ai_get_config(_=Depends(admin_required)):
    cfg = await aih.get_config()
    # Expose the live system prompt too
    custom_prompt = await _db_aih["app_config"].find_one({"type": "ai_handler_prompt"}, {"_id": 0})
    return {
        **cfg,
        "system_prompt": (custom_prompt or {}).get("prompt", aih.SYSTEM_PROMPT),
        "default_prompt": aih.SYSTEM_PROMPT,
    }


@router.put("/api/admin/ai/config")
async def ai_put_config(request: Request, _=Depends(admin_required)):
    body = await request.json()
    # Persist custom system prompt separately if provided
    if "system_prompt" in body:
        prompt = body.pop("system_prompt") or ""
        await _db_aih["app_config"].update_one(
            {"type": "ai_handler_prompt"},
            {"$set": {"type": "ai_handler_prompt", "prompt": prompt,
                      "updated_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()}},
            upsert=True,
        )
        # Hot-swap the live prompt
        if prompt.strip():
            aih.SYSTEM_PROMPT = prompt
    return await aih.update_config(body)


@router.post("/api/admin/ai/test")
async def ai_test_message(request: Request, _=Depends(admin_required)):
    """Test a message against the AI handler without any lead side-effects."""
    body = await request.json()
    msg = (body.get("message") or "").strip()
    if not msg:
        raise HTTPException(400, "message required")
    # Run against a throwaway phone so lead updates don't affect real leads
    return await aih.handle_message(
        message=msg,
        channel=body.get("channel", "whatsapp"),
        phone=body.get("phone", "9100000000"),
        session_id=body.get("session_id", ""),
    )


@router.post("/api/admin/ai/correct/{interaction_id}")
async def ai_correct_interaction(interaction_id: str, request: Request, _=Depends(admin_required)):
    """Mark an AI reply as wrong + store the corrected version for training/review."""
    body = await request.json()
    corrected = body.get("corrected_reply", "")
    note = body.get("note", "")
    await _db_aih["ai_interactions"].update_one(
        {"id": interaction_id},
        {"$set": {
            "corrected_reply": corrected,
            "correction_note": note,
            "corrected_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        }},
    )
    return {"ok": True}


# ============================================================
# Rules CRUD
# ============================================================
@router.get("/api/admin/outbound/rules")
async def list_outbound_rules(_=Depends(admin_required)):
    return {"rules": await oe.list_rules()}


@router.post("/api/admin/outbound/rules")
async def create_outbound_rule(request: Request, _=Depends(admin_required)):
    body = await request.json()
    return await oe.upsert_rule(body)


@router.put("/api/admin/outbound/rules/{rule_id}")
async def update_outbound_rule(rule_id: str, request: Request, _=Depends(admin_required)):
    body = await request.json()
    body["id"] = rule_id
    return await oe.upsert_rule(body)


@router.delete("/api/admin/outbound/rules/{rule_id}")
async def delete_outbound_rule(rule_id: str, _=Depends(admin_required)):
    deleted = await oe.delete_rule(rule_id)
    if not deleted:
        raise HTTPException(404, "rule not found")
    return {"deleted": deleted}


# ============================================================
# Manual controls
# ============================================================
@router.post("/api/admin/outbound/pause")
async def pause_outbound(request: Request, _=Depends(admin_required)):
    body = await request.json() if await request.body() else {}
    reason = body.get("reason", "manual pause")
    await oe.manual_pause(reason)
    return {"paused": True, "reason": reason}


@router.post("/api/admin/outbound/resume")
async def resume_outbound(_=Depends(admin_required)):
    await oe.manual_resume()
    return {"paused": False}


@router.post("/api/admin/outbound/tick")
async def manual_tick(_=Depends(admin_required)):
    """Fire one scheduler tick now (doesn't wait for 5-min interval)."""
    return await oe.process_rules_tick()


# ============================================================
# Public click tracking (NO AUTH — this is the link in WhatsApp templates)
# ============================================================
@router.get("/api/track/click")
async def track_click(t: str = "", to: str = ""):
    """Handle UTM tracking click from outbound WhatsApp template.

    Usage in template: https://<backend>/api/track/click?t=<tracking_id>&to=<destination_url>
    """
    if not t:
        return RedirectResponse(to or "https://www.agileortho.in/")
    await oe.record_click(t)
    # Default destination if not supplied
    destination = to or "https://www.agileortho.in/catalog?utm_source=wa&utm_medium=whatsapp"
    return RedirectResponse(destination)
