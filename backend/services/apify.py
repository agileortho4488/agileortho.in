"""
Apify integration — Google Maps Scraper for hospital / clinic prospects.

Apify charges per result so we keep queries tight. Default preset targets the
highest-ROI prospects for Meril devices:
  • Orthopedic + Multi-specialty hospitals
  • Top 5 Telangana districts by market size

One full run: ~50-100 places, ~$0.35-0.70 on Apify paid plan.
"""
from __future__ import annotations

import os
import asyncio
import time
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx

from db import db as mongo_db

APIFY_TOKEN = os.environ.get("APIFY_API_TOKEN") or ""
APIFY_BASE = "https://api.apify.com/v2"
GOOGLE_MAPS_ACTOR = "compass~crawler-google-places"

prospects_col = mongo_db["prospects"]
apify_runs_col = mongo_db["apify_runs"]

# Sensible defaults targeting Meril's highest-revenue divisions (Trauma, JR, Endo)
DEFAULT_QUERIES = [
    "orthopedic hospital",
    "multi specialty hospital",
    "trauma center",
    "joint replacement clinic",
    "spine surgery clinic",
    "endoscopy center",
]
DEFAULT_LOCATIONS = [
    "Hyderabad, Telangana, India",
    "Warangal, Telangana, India",
    "Karimnagar, Telangana, India",
    "Khammam, Telangana, India",
    "Nizamabad, Telangana, India",
    "Rangareddy, Telangana, India",
    "Medchal, Telangana, India",
    "Sangareddy, Telangana, India",
    "Nalgonda, Telangana, India",
    "Adilabad, Telangana, India",
    "Mahabubnagar, Telangana, India",
    "Siddipet, Telangana, India",
    "Suryapet, Telangana, India",
    "Jagtial, Telangana, India",
    "Peddapalli, Telangana, India",
    "Kamareddy, Telangana, India",
    "Mancherial, Telangana, India",
    "Vikarabad, Telangana, India",
    "Hanumakonda, Telangana, India",
    "Mahabubabad, Telangana, India",
]

# Keyword → relevant divisions (for auto-tagging prospects)
DIVISION_TAGS = {
    "orthopedic": ["Trauma", "Joint Replacement", "Spine", "Sports Medicine"],
    "multi specialty": ["Trauma", "Joint Replacement", "Endo Surgery", "Cardiovascular"],
    "cardiac": ["Cardiovascular", "Peripheral Intervention"],
    "sports": ["Sports Medicine"],
    "ent": ["ENT"],
    "urology": ["Urology"],
    "spine": ["Spine"],
    "surgery": ["Endo Surgery", "Trauma"],
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _now_epoch_ms() -> int:
    return int(time.time() * 1000)


def _tag_divisions(category: str, query: str) -> list:
    blob = f"{category or ''} {query or ''}".lower()
    tags = set()
    for keyword, divisions in DIVISION_TAGS.items():
        if keyword in blob:
            tags.update(divisions)
    return sorted(tags) or ["Trauma", "Joint Replacement"]  # safe fallback


async def _start_apify_run(queries: list, locations: list, max_per_query: int) -> dict:
    """Trigger an Apify actor run synchronously and return the run info."""
    if not APIFY_TOKEN:
        raise RuntimeError("APIFY_API_TOKEN not configured")

    # compass/crawler-google-places input schema
    payload = {
        "searchStringsArray": queries,
        "locationQuery": ", ".join(locations) if len(locations) == 1 else locations[0],
        "maxCrawledPlacesPerSearch": max_per_query,
        "language": "en",
        "skipClosedPlaces": True,
        "exportPlaceUrls": False,
    }
    # The compass actor supports list of locations via "customGeolocation" but simpler:
    # run one actor per location (costs only the results actually scraped)
    url = f"{APIFY_BASE}/acts/{GOOGLE_MAPS_ACTOR}/runs?token={APIFY_TOKEN}"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(url, json=payload)
        r.raise_for_status()
        return r.json().get("data", {})


async def _wait_for_run(run_id: str, max_seconds: int = 420) -> str:
    """Poll Apify until the run finishes, returns final status."""
    url = f"{APIFY_BASE}/actor-runs/{run_id}?token={APIFY_TOKEN}"
    start = time.time()
    async with httpx.AsyncClient(timeout=30) as client:
        while time.time() - start < max_seconds:
            r = await client.get(url)
            data = (r.json() or {}).get("data", {})
            status = data.get("status", "")
            if status in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
                return status
            await asyncio.sleep(5)
    return "TIMED-OUT"


async def _fetch_run_items(dataset_id: str) -> list:
    url = f"{APIFY_BASE}/datasets/{dataset_id}/items?token={APIFY_TOKEN}&clean=true&format=json"
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.json() or []


async def _upsert_prospect(item: dict, source_query: str, source_location: str) -> Optional[dict]:
    """Insert scraped business directly into `leads_col` (dedup by phone)."""
    phone = (item.get("phone") or "").strip()
    name = (item.get("title") or "").strip()
    if not phone and not name:
        return None

    # Normalise Indian phone format (10 digits)
    phone_digits = "".join(c for c in phone if c.isdigit())
    if phone_digits.startswith("91") and len(phone_digits) > 10:
        phone_digits = phone_digits[-10:]
    elif len(phone_digits) > 10:
        phone_digits = phone_digits[-10:]

    # Dedupe by phone in the leads collection
    from db import leads_col
    existing = None
    if phone_digits:
        existing = await leads_col.find_one({"phone_whatsapp": phone_digits})
    if not existing:
        existing = await leads_col.find_one({"name": name, "hospital_clinic": name, "source": "google_maps"})

    category = item.get("categoryName") or (item.get("categories") or ["Hospital"])[0]
    city = (item.get("city") or source_location.split(",")[0]).strip()

    lead_doc = {
        "name": name,
        "hospital_clinic": name,
        "phone_whatsapp": phone_digits,
        "email": "",
        "district": city,
        "inquiry_type": "Cold (scraped)",
        "product_interest": source_query,
        "source": "google_maps",
        "status": "new",
        "score": "Cold",
        "score_value": 20,
        # Rich metadata so the admin has context
        "gmaps_category": category,
        "gmaps_address": item.get("address") or "",
        "gmaps_website": item.get("website") or "",
        "gmaps_rating": item.get("totalScore") or 0,
        "gmaps_reviews": item.get("reviewsCount") or 0,
        "gmaps_url": item.get("url") or "",
        "gmaps_place_id": item.get("placeId") or "",
        "gmaps_search_query": source_query,
        "gmaps_search_location": source_location,
        "updated_at": _now(),
    }

    if existing:
        # Preserve existing status/score if human has already touched it
        preserve = {}
        if existing.get("status") and existing["status"] != "new":
            preserve["status"] = existing["status"]
        await leads_col.update_one(
            {"_id": existing["_id"]},
            {"$set": {**lead_doc, **preserve}},
        )
        return None  # updated, not new
    else:
        lead_doc["created_at"] = _now()
        await leads_col.insert_one(lead_doc)
        return lead_doc


async def run_scrape_job(
    run_id_local: str,
    queries: Optional[list] = None,
    locations: Optional[list] = None,
    max_per_query: int = 20,
):
    """Background job: runs one Apify call per location × query pairs, collects results."""
    queries = queries or DEFAULT_QUERIES
    locations = locations or DEFAULT_LOCATIONS

    total_inserted = 0
    total_scraped = 0
    errors = []
    await apify_runs_col.update_one({"run_id": run_id_local}, {"$set": {
        "status": "running",
        "started_at": _now(),
        "queries": queries,
        "locations": locations,
    }}, upsert=True)

    for location in locations:
        try:
            run = await _start_apify_run(queries, [location], max_per_query)
            apify_run_id = run.get("id")
            dataset_id = run.get("defaultDatasetId")
            if not apify_run_id or not dataset_id:
                errors.append(f"start_failed:{location}")
                continue

            status = await _wait_for_run(apify_run_id)
            if status != "SUCCEEDED":
                errors.append(f"{status}:{location}")
                continue

            items = await _fetch_run_items(dataset_id)
            total_scraped += len(items)

            for item in items:
                q = item.get("searchString") or (queries[0] if queries else "")
                inserted = await _upsert_prospect(item, q, location)
                if inserted:
                    total_inserted += 1

            # Per-location progress
            await apify_runs_col.update_one(
                {"run_id": run_id_local},
                {"$set": {"progress": f"{total_inserted} new / {total_scraped} scraped"}},
            )
        except Exception as e:
            errors.append(f"exception:{location}:{str(e)[:120]}")
            continue

    await apify_runs_col.update_one({"run_id": run_id_local}, {"$set": {
        "status": "done",
        "finished_at": _now(),
        "total_scraped": total_scraped,
        "total_inserted": total_inserted,
        "errors": errors,
    }})


async def ensure_indexes():
    await prospects_col.create_index("phone")
    await prospects_col.create_index("city")
    await prospects_col.create_index("status")
    await prospects_col.create_index("tags")
    await prospects_col.create_index("created_at")
    await apify_runs_col.create_index("run_id", unique=True)
    await apify_runs_col.create_index("status")


# ============================================================
# Daily auto-scrape scheduler — fires 6 AM IST every day
# ============================================================
import uuid as _uuid
from zoneinfo import ZoneInfo as _ZoneInfo

_IST = _ZoneInfo("Asia/Kolkata")
_auto_task: Optional[asyncio.Task] = None


async def _daily_auto_scrape_loop():
    """Fires a full Telangana scrape once per day at 6 AM IST."""
    import logging
    while True:
        try:
            now = datetime.now(_IST)
            # Compute seconds until next 6 AM IST
            target = now.replace(hour=6, minute=0, second=0, microsecond=0)
            if now >= target:
                target = target + timedelta(days=1)
            delay = (target - now).total_seconds()
            await asyncio.sleep(max(delay, 60))

            # Check if a scrape already ran in the last 12h (idempotency)
            cutoff = (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat()
            recent = await apify_runs_col.find_one({
                "trigger": "daily_auto",
                "created_at": {"$gte": cutoff},
            })
            if recent:
                logging.info(f"Daily auto-scrape skipped (recent run exists: {recent.get('run_id')})")
                continue

            run_id = f"auto_{_uuid.uuid4().hex[:10]}"
            await apify_runs_col.insert_one({
                "run_id": run_id,
                "status": "queued",
                "trigger": "daily_auto",
                "queries": DEFAULT_QUERIES,
                "locations": DEFAULT_LOCATIONS,
                "max_per_query": 10,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            asyncio.create_task(run_scrape_job(run_id, DEFAULT_QUERIES, DEFAULT_LOCATIONS, 10))
            logging.info(f"Daily auto-scrape triggered: {run_id}")
        except Exception as e:
            logging.exception(f"daily scrape loop error: {e}")
            await asyncio.sleep(3600)  # retry in 1h on error


def start_daily_scheduler():
    global _auto_task
    if _auto_task and not _auto_task.done():
        return
    _auto_task = asyncio.create_task(_daily_auto_scrape_loop())
