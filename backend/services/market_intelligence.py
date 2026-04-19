"""
Market Intelligence — Google Trends (phase 1).

Uses `trendspy` (maintained fork of pytrends, compatible with modern urllib3).

Google Trends returns NORMALIZED scores 0-100 (not absolute volumes). Useful for
directional intent — "which of these products has rising search interest this
week" or "which state is searching the most for this product" — not for exact
lead counts.

All results are cached 24h in `market_intelligence` collection.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Optional

from trendspy import Trends

from db import db as mongo_db

intelligence_col = mongo_db["market_intelligence"]

# Curated high-signal keywords for Meril product line
DEFAULT_KEYWORDS = [
    "orthopedic implant",
    "bone plate",
    "knee implant",
    "hip replacement",
    "Meril",
]

# Division → relevant Google-searchable keywords (max 5 each for Trends API limit)
PRODUCT_KEYWORD_MAP = {
    "Trauma": ["bone plate", "locking plate", "bone screw", "fracture fixation", "MBOSS"],
    "Joint Replacement": ["knee implant", "hip replacement", "knee replacement", "joint prosthesis"],
    "Spine": ["spine implant", "pedicle screw", "spinal fusion"],
    "Sports Medicine": ["ACL implant", "meniscus repair", "shoulder anchor"],
    "Cardiovascular": ["cardiac stent", "drug eluting stent", "angioplasty balloon"],
    "Endo Surgery": ["surgical stapler", "laparoscopic clip", "endoscopy device"],
}

# Include Google referer on every Trends call — avoids rate-limit quota errors
_HEADERS = {"referer": "https://www.google.com/"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _fetch_trends_sync(keywords: list, geo: str, timeframe: str) -> dict:
    """Blocking trendspy call. Always called via asyncio.to_thread."""
    tr = Trends()
    kw = keywords[:5]  # Trends hard-cap

    # Interest over time — DataFrame with date index + keyword columns
    iot_df = tr.interest_over_time(kw, geo=geo, timeframe=timeframe, headers=_HEADERS)
    iot = []
    if iot_df is not None and not iot_df.empty:
        for idx, row in iot_df.iterrows():
            entry = {"date": str(idx)[:10]}
            for k in kw:
                if k in iot_df.columns:
                    v = row[k]
                    entry[k] = int(v) if v == v else 0  # NaN guard
            iot.append(entry)

    # Interest by region (states within India when geo="IN") — does NOT accept headers kwarg
    regions = []
    try:
        region_df = tr.interest_by_region(kw, geo=geo, resolution="REGION")
        if region_df is not None and not region_df.empty:
            for _, row in region_df.iterrows():
                total = 0
                for k in kw:
                    if k in region_df.columns:
                        v = row[k]
                        if v == v:
                            total += int(v)
                if total > 0:
                    regions.append({
                        "region": row.get("geoName", ""),
                        "code": row.get("geoCode", ""),
                        "score": total,
                    })
            regions.sort(key=lambda x: x["score"], reverse=True)
    except Exception as e:
        regions = [{"error": str(e)[:100]}]

    # Related queries — top + rising terms for the primary keyword
    related = {"rising": [], "top": []}
    try:
        rq = tr.related_queries([kw[0]], geo=geo, headers=_HEADERS)
        if isinstance(rq, dict):
            for bucket in ("rising", "top"):
                df = rq.get(bucket)
                if df is not None and not df.empty:
                    related[bucket] = df.head(10).to_dict("records")
    except Exception:
        pass

    return {
        "keywords": kw,
        "geo": geo,
        "timeframe": timeframe,
        "interest_over_time": iot,
        "interest_by_region": regions[:20],
        "related_queries": related,
        "fetched_at": _now(),
    }


async def fetch_trends(
    keywords: Optional[list] = None,
    geo: str = "IN",
    timeframe: str = "today 3-m",
    use_cache: bool = True,
) -> dict:
    """Fetch Google Trends data (24h cache)."""
    keywords = keywords or DEFAULT_KEYWORDS
    cache_key = {
        "type": "trends",
        "keywords_hash": "|".join(sorted(keywords)),
        "geo": geo,
        "timeframe": timeframe,
    }
    if use_cache:
        cached = await intelligence_col.find_one(cache_key, {"_id": 0})
        if cached:
            try:
                fetched = datetime.fromisoformat(
                    cached.get("fetched_at", "").replace("Z", "+00:00")
                )
                age_h = (datetime.now(timezone.utc) - fetched).total_seconds() / 3600
                if age_h < 24:
                    cached["cache_age_hours"] = round(age_h, 1)
                    return cached
            except Exception:
                pass

    try:
        result = await asyncio.to_thread(_fetch_trends_sync, keywords, geo, timeframe)
    except Exception as e:
        return {
            **cache_key,
            "keywords": keywords,
            "error": f"Google Trends fetch failed: {str(e)[:240]}",
            "fetched_at": _now(),
        }

    await intelligence_col.update_one(
        cache_key,
        {"$set": {**cache_key, **result}},
        upsert=True,
    )
    return result


async def fetch_product_trends(division: str) -> dict:
    kw = PRODUCT_KEYWORD_MAP.get(division, DEFAULT_KEYWORDS)
    return await fetch_trends(keywords=kw, geo="IN")


async def ensure_indexes():
    await intelligence_col.create_index("type")
    await intelligence_col.create_index("fetched_at")
