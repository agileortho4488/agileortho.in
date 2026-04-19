"""Market Intelligence — Google Trends (Phase 1), GSC (Phase 2), IndiaMART (Phase 3)."""
from fastapi import APIRouter, Depends, Request

from helpers import admin_required
from services.market_intelligence import (
    fetch_trends, fetch_product_trends,
    DEFAULT_KEYWORDS, PRODUCT_KEYWORD_MAP,
)

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
