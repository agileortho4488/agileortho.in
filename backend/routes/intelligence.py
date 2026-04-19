"""Market Intelligence — Google Trends (phase 1), GSC (phase 2), IndiaMART (phase 3)."""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
import os

from helpers import admin_required
from services.market_intelligence import (
    fetch_trends, fetch_product_trends,
    DEFAULT_KEYWORDS, PRODUCT_KEYWORD_MAP,
)
from services import gsc as gsc_svc

router = APIRouter()


@router.get("/api/admin/intelligence/trends")
async def get_trends(
    keywords: str = "",
    geo: str = "IN",
    timeframe: str = "today 3-m",
    refresh: bool = False,
    _=Depends(admin_required),
):
    """Query Google Trends for up to 5 keywords.

    Query params:
      keywords=orthopedic implant,bone plate   (comma-separated, max 5)
      geo=IN  (or IN-TG for Telangana only)
      timeframe=today 3-m | today 12-m | today 5-y
      refresh=true    (bypass 24h cache)
    """
    kw_list = [k.strip() for k in keywords.split(",") if k.strip()] if keywords else None
    return await fetch_trends(
        keywords=kw_list,
        geo=geo,
        timeframe=timeframe,
        use_cache=not refresh,
    )


@router.get("/api/admin/intelligence/trends/division/{division}")
async def get_division_trends(division: str, _=Depends(admin_required)):
    """Get trends for a specific Meril division's curated keyword set."""
    return await fetch_product_trends(division)


@router.get("/api/admin/intelligence/keywords")
async def get_keyword_sets(_=Depends(admin_required)):
    """Return the curated keyword presets so admin UI can offer them."""
    return {
        "default": DEFAULT_KEYWORDS,
        "by_division": PRODUCT_KEYWORD_MAP,
    }


# ============= Google Search Console (GSC) =============

@router.get("/api/admin/gsc/status")
async def gsc_status(_=Depends(admin_required)):
    return await gsc_svc.get_status()


@router.get("/api/admin/gsc/connect")
async def gsc_connect(_=Depends(admin_required)):
    """Return the Google OAuth URL for the admin to approve access."""
    if not gsc_svc.is_configured():
        raise HTTPException(
            503,
            "Google OAuth not configured. Set GOOGLE_OAUTH_CLIENT_ID and "
            "GOOGLE_OAUTH_CLIENT_SECRET in backend/.env, then restart backend.",
        )
    url, state = await gsc_svc.build_auth_url()
    return {"auth_url": url, "state": state, "redirect_uri": gsc_svc._redirect_uri()}


@router.get("/api/admin/gsc/callback")
async def gsc_callback(request: Request):
    """OAuth callback — Google redirects here with ?code=...&state=..."""
    code = request.query_params.get("code")
    state = request.query_params.get("state", "")
    error = request.query_params.get("error")
    frontend_base = os.environ.get("REACT_APP_BACKEND_URL") or ""
    target = f"{frontend_base.rstrip('/')}/admin/leads"
    if error:
        return RedirectResponse(f"{target}?gsc=error&reason={error}")
    if not code:
        return RedirectResponse(f"{target}?gsc=error&reason=no_code")
    try:
        await gsc_svc.handle_callback(code, state)
        return RedirectResponse(f"{target}?gsc=connected")
    except Exception as e:
        return RedirectResponse(f"{target}?gsc=error&reason={str(e)[:80]}")


@router.get("/api/admin/gsc/sites")
async def gsc_sites(_=Depends(admin_required)):
    sites = await gsc_svc.list_sites()
    return {"sites": sites}


@router.post("/api/admin/gsc/import")
async def gsc_import(request: Request, _=Depends(admin_required)):
    """Return top GSC search queries as INSIGHTS (not leads).

    Call /api/admin/gsc/find-buyers with a query to scrape Google Maps for
    actual vendors/hospitals matching that search → those become leads.
    """
    body = await request.json() if await request.body() else {}
    site_url = body.get("site_url") or "sc-domain:agileortho.in"
    days = int(body.get("days") or 28)
    top_n = int(body.get("top_n") or 100)
    try:
        return await gsc_svc.fetch_queries_insights(site_url, days=days, top_n=top_n)
    except Exception as e:
        raise HTTPException(400, f"GSC fetch failed: {str(e)[:200]}")


@router.post("/api/admin/gsc/find-buyers")
async def find_buyers_from_query(request: Request, _=Depends(admin_required)):
    """Given a GSC search query (e.g. 'foot drop splint near me'), fire an
    Apify Google Maps scrape for vendors matching that keyword across
    Telangana. Results are inserted into leads_col as source=google_maps.
    """
    from services.apify import run_scrape_job, DEFAULT_LOCATIONS, apify_runs_col
    import uuid as _uuid

    body = await request.json()
    query = (body.get("query") or "").strip()
    if not query:
        raise HTTPException(400, "query required")
    locations = body.get("locations") or DEFAULT_LOCATIONS
    max_per_query = int(body.get("max_per_query") or 8)
    max_per_query = min(max_per_query, 15)  # cost guardrail

    run_id = f"find_buyers_{_uuid.uuid4().hex[:8]}"
    import asyncio as _a
    from datetime import datetime as _dt, timezone as _tz
    await apify_runs_col.insert_one({
        "run_id": run_id,
        "status": "queued",
        "trigger": "gsc_find_buyers",
        "query": query,
        "locations": locations,
        "created_at": _dt.now(_tz.utc).isoformat(),
    })
    _a.create_task(run_scrape_job(run_id, [query], locations, max_per_query))
    return {"run_id": run_id, "status": "queued", "query": query, "locations": locations}
