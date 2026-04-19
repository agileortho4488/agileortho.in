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
from datetime import datetime, timezone
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
]
DEFAULT_LOCATIONS = [
    "Hyderabad, Telangana, India",
    "Warangal, Telangana, India",
    "Karimnagar, Telangana, India",
    "Khammam, Telangana, India",
    "Nizamabad, Telangana, India",
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
    """Insert (or update) a prospect doc; returns doc on insert, None if dup."""
    phone = (item.get("phone") or "").strip()
    name = (item.get("title") or "").strip()
    if not phone and not name:
        return None

    # Normalise Indian phone format
    phone_digits = "".join(c for c in phone if c.isdigit())
    if phone_digits.startswith("91") and len(phone_digits) > 10:
        phone_digits = phone_digits[-10:]
    elif len(phone_digits) > 10:
        phone_digits = phone_digits[-10:]

    # Dedupe by phone OR by name+city combo
    city = (item.get("city") or source_location.split(",")[0]).strip()
    existing = await prospects_col.find_one({
        "$or": [
            {"phone": phone_digits} if phone_digits else {"_never": True},
            {"name": name, "city": city},
        ]
    })
    if existing:
        return None

    category = item.get("categoryName") or (item.get("categories") or ["Hospital"])[0]
    doc = {
        "name": name,
        "phone": phone_digits,
        "phone_raw": phone,
        "website": item.get("website") or "",
        "address": item.get("address") or "",
        "city": city,
        "district": source_location.split(",")[1].strip() if "," in source_location else "",
        "state": "Telangana",
        "category": category,
        "tags": _tag_divisions(category, source_query),
        "rating": item.get("totalScore") or 0,
        "reviews_count": item.get("reviewsCount") or 0,
        "google_place_id": item.get("placeId") or "",
        "google_maps_url": item.get("url") or "",
        "source": "apify_google_maps",
        "source_query": source_query,
        "source_location": source_location,
        "status": "new",
        "replied": False,
        "last_contacted": None,
        "notes": "",
        "created_at": _now(),
        "updated_at": _now(),
    }
    await prospects_col.insert_one(doc)
    doc.pop("_id", None)
    return doc


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
