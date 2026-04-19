"""
Prospects CRM — Apify-sourced hospital/clinic prospects for outbound outreach.
"""
from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from bson import ObjectId

from helpers import admin_required, serialize_docs, serialize_doc
from services.apify import (
    prospects_col, apify_runs_col,
    run_scrape_job, DEFAULT_QUERIES, DEFAULT_LOCATIONS,
)
import asyncio

router = APIRouter()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/api/admin/prospects")
async def list_prospects(
    q: str = "",
    city: str = "",
    status: str = "",
    source: str = "",
    page: int = 1,
    limit: int = 50,
    _=Depends(admin_required),
):
    filt = {}
    if q:
        filt["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q}},
            {"address": {"$regex": q, "$options": "i"}},
        ]
    if city:
        filt["city"] = {"$regex": f"^{city}$", "$options": "i"}
    if status:
        filt["status"] = status
    if source:
        filt["source"] = source

    total = await prospects_col.count_documents(filt)
    skip = max(0, (page - 1) * limit)
    cursor = prospects_col.find(filt).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    return {
        "prospects": serialize_docs(docs),
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/api/admin/prospects/stats")
async def prospect_stats(_=Depends(admin_required)):
    total = await prospects_col.count_documents({})
    by_status_cursor = prospects_col.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ])
    by_city_cursor = prospects_col.aggregate([
        {"$group": {"_id": "$city", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ])
    by_tag_cursor = prospects_col.aggregate([
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ])
    recent_runs = await apify_runs_col.find({}, {"_id": 0}).sort("started_at", -1).limit(5).to_list(5)
    return {
        "total": total,
        "by_status": [{"status": d["_id"] or "new", "count": d["count"]} async for d in by_status_cursor],
        "by_city": [{"city": d["_id"] or "Unknown", "count": d["count"]} async for d in by_city_cursor],
        "by_tag": [{"tag": d["_id"], "count": d["count"]} async for d in by_tag_cursor],
        "recent_runs": recent_runs,
    }


@router.post("/api/admin/prospects/scrape")
async def trigger_scrape(request: Request, _=Depends(admin_required)):
    """Fires an Apify Google Maps scrape in the background.

    Body (all optional — sensible defaults used otherwise):
      {"queries": ["orthopedic hospital"], "locations": ["Hyderabad, Telangana, India"], "max_per_query": 15}
    """
    body = await request.json() if await request.body() else {}
    queries = body.get("queries") or DEFAULT_QUERIES
    locations = body.get("locations") or DEFAULT_LOCATIONS
    max_per_query = int(body.get("max_per_query") or 15)
    max_per_query = min(max_per_query, 50)  # cost guardrail

    run_id = f"apify_{uuid.uuid4().hex[:10]}"
    await apify_runs_col.insert_one({
        "run_id": run_id,
        "status": "queued",
        "created_at": _now(),
        "queries": queries,
        "locations": locations,
        "max_per_query": max_per_query,
    })
    # Fire-and-forget
    asyncio.create_task(run_scrape_job(run_id, queries, locations, max_per_query))
    return {"run_id": run_id, "status": "queued"}


@router.get("/api/admin/prospects/runs/{run_id}")
async def get_run(run_id: str, _=Depends(admin_required)):
    r = await apify_runs_col.find_one({"run_id": run_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "run not found")
    return r


@router.put("/api/admin/prospects/{prospect_id}")
async def update_prospect(prospect_id: str, request: Request, _=Depends(admin_required)):
    try:
        oid = ObjectId(prospect_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    body = await request.json()
    allowed = {"status", "notes", "tags", "name", "phone"}
    update = {k: v for k, v in body.items() if k in allowed}
    update["updated_at"] = _now()
    res = await prospects_col.update_one({"_id": oid}, {"$set": update})
    if not res.matched_count:
        raise HTTPException(404, "not found")
    doc = await prospects_col.find_one({"_id": oid})
    return serialize_doc(doc)


@router.delete("/api/admin/prospects/{prospect_id}")
async def delete_prospect(prospect_id: str, _=Depends(admin_required)):
    try:
        oid = ObjectId(prospect_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    res = await prospects_col.delete_one({"_id": oid})
    return {"deleted": res.deleted_count}


@router.get("/api/admin/prospects/export.csv")
async def export_csv(
    city: str = "",
    status: str = "",
    _=Depends(admin_required),
):
    filt = {}
    if city:
        filt["city"] = city
    if status:
        filt["status"] = status

    # Collect first, stream as one blob — dataset is small (<10k rows)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["name", "phone", "city", "category", "tags", "website",
                "rating", "reviews_count", "status", "source", "created_at"])
    async for p in prospects_col.find(filt).sort("created_at", -1):
        w.writerow([
            p.get("name", ""), p.get("phone", ""), p.get("city", ""),
            p.get("category", ""), ",".join(p.get("tags", [])),
            p.get("website", ""), p.get("rating", 0),
            p.get("reviews_count", 0), p.get("status", ""),
            p.get("source", ""), p.get("created_at", ""),
        ])

    def _stream():
        yield buf.getvalue()

    return StreamingResponse(
        _stream(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=prospects_{datetime.now().strftime('%Y%m%d')}.csv"},
    )


@router.post("/api/admin/prospects/bulk-update")
async def bulk_update_status(request: Request, _=Depends(admin_required)):
    body = await request.json()
    ids = body.get("ids", [])
    status = body.get("status", "")
    if not ids or not status:
        raise HTTPException(400, "ids and status required")
    oids = []
    for i in ids:
        try:
            oids.append(ObjectId(i))
        except Exception:
            continue
    res = await prospects_col.update_many(
        {"_id": {"$in": oids}},
        {"$set": {"status": status, "updated_at": _now()}},
    )
    return {"modified": res.modified_count}
