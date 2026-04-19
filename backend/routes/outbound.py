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
