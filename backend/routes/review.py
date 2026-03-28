"""
Review Dashboard API — Admin endpoints for reviewing staged enrichment proposals.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone
from db import catalog_products_col, promotion_log_col, web_verification_log_col
from helpers import admin_required

router = APIRouter()

PROPOSED_FIELDS = [
    "proposed_entity_type", "proposed_clinical_display_title", "proposed_clinical_subtitle",
    "proposed_semantic_brand_system", "proposed_semantic_parent_brand",
    "proposed_semantic_system_type", "proposed_semantic_implant_class",
    "proposed_semantic_material_default", "proposed_semantic_coating_default",
    "proposed_semantic_anatomy_scope", "proposed_semantic_procedure_scope",
    "proposed_semantic_family_group", "proposed_semantic_use_case_tags",
    "proposed_semantic_confidence", "proposed_semantic_review_required",
    "proposed_web_verification_status", "proposed_recommended_action",
    "proposed_conflict_detected", "proposed_reasoning_summary", "proposed_enriched_at",
]


def clean_doc(doc):
    """Remove _id from doc for JSON response."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/api/admin/review/stats")
async def review_stats(_=Depends(admin_required)):
    total_staged = await catalog_products_col.count_documents(
        {"proposed_web_verification_status": {"$exists": True}}
    )
    total_canonical = await catalog_products_col.count_documents(
        {"semantic_brand_system": {"$nin": [None, ""]}}
    )
    total_products = await catalog_products_col.count_documents({})
    total_promoted = await promotion_log_col.count_documents({})

    # By status
    status_pipeline = [
        {"$match": {"proposed_web_verification_status": {"$exists": True}}},
        {"$group": {"_id": "$proposed_web_verification_status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    by_status = await catalog_products_col.aggregate(status_pipeline).to_list(20)

    # By action
    action_pipeline = [
        {"$match": {"proposed_recommended_action": {"$exists": True}}},
        {"$group": {"_id": "$proposed_recommended_action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    by_action = await catalog_products_col.aggregate(action_pipeline).to_list(20)

    # By division
    div_pipeline = [
        {"$match": {"proposed_web_verification_status": {"$exists": True}}},
        {"$group": {
            "_id": "$division_canonical",
            "total": {"$sum": 1},
            "review": {"$sum": {"$cond": [{"$eq": ["$proposed_recommended_action", "send_to_review"]}, 1, 0]}},
            "avg_conf": {"$avg": "$proposed_semantic_confidence"},
        }},
        {"$sort": {"total": -1}},
    ]
    by_division = await catalog_products_col.aggregate(div_pipeline).to_list(30)

    # Pending review (not yet promoted and has proposed fields)
    pending_review = await catalog_products_col.count_documents({
        "proposed_web_verification_status": {"$exists": True},
        "semantic_brand_system": {"$in": [None, ""]},
    })

    return {
        "total_products": total_products,
        "total_canonical": total_canonical,
        "total_staged": total_staged,
        "total_promoted": total_promoted,
        "pending_review": pending_review,
        "coverage_pct": round((total_canonical / total_products) * 100, 1) if total_products else 0,
        "by_status": [{"status": s["_id"], "count": s["count"]} for s in by_status],
        "by_action": [{"action": a["_id"], "count": a["count"]} for a in by_action],
        "by_division": [
            {
                "division": d["_id"] or "(none)",
                "total": d["total"],
                "review": d["review"],
                "avg_conf": round(d["avg_conf"], 2) if d["avg_conf"] else 0,
            }
            for d in by_division
        ],
    }


@router.get("/api/admin/review/products")
async def review_products(
    _=Depends(admin_required),
    division: Optional[str] = None,
    brand: Optional[str] = None,
    status: Optional[str] = None,
    action: Optional[str] = None,
    confidence_min: Optional[float] = None,
    confidence_max: Optional[float] = None,
    family: Optional[str] = None,
    pending_only: bool = True,
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
):
    query = {"proposed_web_verification_status": {"$exists": True}}

    if pending_only:
        query["semantic_brand_system"] = {"$in": [None, ""]}

    if division:
        query["division_canonical"] = division
    if brand:
        query["$or"] = [
            {"brand": {"$regex": brand, "$options": "i"}},
            {"proposed_semantic_brand_system": {"$regex": brand, "$options": "i"}},
        ]
    if status:
        query["proposed_web_verification_status"] = status
    if action:
        query["proposed_recommended_action"] = action
    if confidence_min is not None:
        query.setdefault("proposed_semantic_confidence", {})
        query["proposed_semantic_confidence"]["$gte"] = confidence_min
    if confidence_max is not None:
        query.setdefault("proposed_semantic_confidence", {})
        query["proposed_semantic_confidence"]["$lte"] = confidence_max
    if family:
        query["$or"] = [
            {"product_family": {"$regex": family, "$options": "i"}},
            {"proposed_semantic_family_group": {"$regex": family, "$options": "i"}},
        ]

    total = await catalog_products_col.count_documents(query)
    skip = (page - 1) * limit

    products = await catalog_products_col.find(
        query,
        {
            "_id": 0, "slug": 1, "product_name_display": 1, "brand": 1,
            "division_canonical": 1, "category": 1, "product_family": 1,
            "semantic_brand_system": 1, "semantic_confidence": 1,
            "proposed_clinical_display_title": 1, "proposed_semantic_brand_system": 1,
            "proposed_semantic_confidence": 1, "proposed_web_verification_status": 1,
            "proposed_recommended_action": 1, "proposed_conflict_detected": 1,
            "proposed_semantic_implant_class": 1, "proposed_semantic_family_group": 1,
            "proposed_reasoning_summary": 1,
        }
    ).sort("proposed_semantic_confidence", -1).skip(skip).limit(limit).to_list(limit)

    return {
        "products": products,
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
    }


@router.get("/api/admin/review/products/{slug}")
async def review_product_detail(slug: str, _=Depends(admin_required)):
    product = await catalog_products_col.find_one({"slug": slug}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")

    # Get verification log
    vlog = await web_verification_log_col.find_one(
        {"slug": slug}, {"_id": 0}
    )

    # Get promotion log (if previously promoted)
    plog = await promotion_log_col.find_one(
        {"slug": slug}, {"_id": 0}
    )

    # Build current vs proposed comparison
    current_fields = {
        "product_name_display": product.get("product_name_display", ""),
        "clinical_subtitle": product.get("clinical_subtitle", ""),
        "brand": product.get("brand", ""),
        "semantic_brand_system": product.get("semantic_brand_system", ""),
        "semantic_parent_brand": product.get("semantic_parent_brand", ""),
        "semantic_system_type": product.get("semantic_system_type", ""),
        "semantic_implant_class": product.get("semantic_implant_class", ""),
        "semantic_material_default": product.get("semantic_material_default"),
        "semantic_coating_default": product.get("semantic_coating_default"),
        "semantic_anatomy_scope": product.get("semantic_anatomy_scope", []),
        "semantic_confidence": product.get("semantic_confidence"),
        "mapping_confidence": product.get("mapping_confidence", ""),
    }

    proposed_fields = {
        "clinical_display_title": product.get("proposed_clinical_display_title", ""),
        "clinical_subtitle": product.get("proposed_clinical_subtitle", ""),
        "semantic_brand_system": product.get("proposed_semantic_brand_system", ""),
        "semantic_parent_brand": product.get("proposed_semantic_parent_brand", ""),
        "semantic_system_type": product.get("proposed_semantic_system_type", ""),
        "semantic_implant_class": product.get("proposed_semantic_implant_class", ""),
        "semantic_material_default": product.get("proposed_semantic_material_default"),
        "semantic_coating_default": product.get("proposed_semantic_coating_default"),
        "semantic_anatomy_scope": product.get("proposed_semantic_anatomy_scope", []),
        "semantic_confidence": product.get("proposed_semantic_confidence"),
        "web_verification_status": product.get("proposed_web_verification_status", ""),
        "recommended_action": product.get("proposed_recommended_action", ""),
        "conflict_detected": product.get("proposed_conflict_detected", False),
        "reasoning_summary": product.get("proposed_reasoning_summary", ""),
    }

    return {
        "product": product,
        "current": current_fields,
        "proposed": proposed_fields,
        "verification_log": vlog,
        "promotion_log": plog,
    }


@router.post("/api/admin/review/products/{slug}/approve")
async def approve_product(slug: str, _=Depends(admin_required)):
    product = await catalog_products_col.find_one({"slug": slug})
    if not product:
        raise HTTPException(404, "Product not found")

    conf = product.get("proposed_semantic_confidence", 0)
    action = product.get("proposed_recommended_action", "")
    status = product.get("proposed_web_verification_status", "")

    canonical_update = {
        "semantic_brand_system": product.get("proposed_semantic_brand_system", ""),
        "semantic_parent_brand": product.get("proposed_semantic_parent_brand", ""),
        "semantic_system_type": product.get("proposed_semantic_system_type", ""),
        "semantic_implant_class": product.get("proposed_semantic_implant_class", ""),
        "semantic_material_default": product.get("proposed_semantic_material_default"),
        "semantic_coating_default": product.get("proposed_semantic_coating_default"),
        "semantic_anatomy_scope": product.get("proposed_semantic_anatomy_scope", []),
        "semantic_confidence": conf,
        "semantic_review_required": False,
        "semantic_enriched_at": datetime.now(timezone.utc).isoformat(),
        "semantic_rule_hits": [f"MANUAL_APPROVE_{status.upper()}"],
        "semantic_conflict_codes": [],
    }

    if action == "rename" and product.get("proposed_clinical_display_title"):
        canonical_update["product_name_display"] = product["proposed_clinical_display_title"]
    if product.get("proposed_clinical_subtitle"):
        canonical_update["clinical_subtitle"] = product["proposed_clinical_subtitle"]
    if not product.get("brand") and product.get("proposed_semantic_brand_system"):
        canonical_update["brand"] = product["proposed_semantic_brand_system"]

    canonical_update["mapping_confidence"] = "high" if conf >= 0.9 else ("medium" if conf >= 0.75 else "low")
    canonical_update["review_required"] = False

    await catalog_products_col.update_one({"_id": product["_id"]}, {"$set": canonical_update})

    await promotion_log_col.insert_one({
        "product_id": str(product["_id"]),
        "slug": slug,
        "action": "manual_approve",
        "reviewer": "admin",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "verification_status": status,
        "confidence": conf,
        "recommended_action": action,
        "fields_changed": list(canonical_update.keys()),
        "old_values": {
            "semantic_brand_system": product.get("semantic_brand_system", ""),
            "semantic_confidence": product.get("semantic_confidence"),
        },
        "new_values": {
            "semantic_brand_system": canonical_update.get("semantic_brand_system", ""),
            "semantic_confidence": canonical_update.get("semantic_confidence"),
        },
    })

    return {"status": "approved", "slug": slug}


@router.post("/api/admin/review/products/{slug}/reject")
async def reject_product(slug: str, _=Depends(admin_required)):
    product = await catalog_products_col.find_one({"slug": slug})
    if not product:
        raise HTTPException(404, "Product not found")

    # Clear proposed fields
    unset_fields = {f: "" for f in PROPOSED_FIELDS}
    await catalog_products_col.update_one({"_id": product["_id"]}, {"$unset": unset_fields})

    await promotion_log_col.insert_one({
        "product_id": str(product["_id"]),
        "slug": slug,
        "action": "manual_reject",
        "reviewer": "admin",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "fields_changed": list(unset_fields.keys()),
    })

    return {"status": "rejected", "slug": slug}


@router.post("/api/admin/review/products/{slug}/edit-approve")
async def edit_approve_product(slug: str, body: dict, _=Depends(admin_required)):
    product = await catalog_products_col.find_one({"slug": slug})
    if not product:
        raise HTTPException(404, "Product not found")

    edits = body.get("edits", {})

    # Apply edits to proposed fields first
    for key, value in edits.items():
        proposed_key = f"proposed_{key}" if not key.startswith("proposed_") else key
        await catalog_products_col.update_one(
            {"_id": product["_id"]}, {"$set": {proposed_key: value}}
        )

    # Re-fetch and promote
    product = await catalog_products_col.find_one({"_id": product["_id"]})

    conf = product.get("proposed_semantic_confidence", 0)
    status = product.get("proposed_web_verification_status", "")

    canonical_update = {
        "semantic_brand_system": product.get("proposed_semantic_brand_system", ""),
        "semantic_parent_brand": product.get("proposed_semantic_parent_brand", ""),
        "semantic_system_type": product.get("proposed_semantic_system_type", ""),
        "semantic_implant_class": product.get("proposed_semantic_implant_class", ""),
        "semantic_material_default": product.get("proposed_semantic_material_default"),
        "semantic_coating_default": product.get("proposed_semantic_coating_default"),
        "semantic_anatomy_scope": product.get("proposed_semantic_anatomy_scope", []),
        "semantic_confidence": conf,
        "semantic_review_required": False,
        "semantic_enriched_at": datetime.now(timezone.utc).isoformat(),
        "semantic_rule_hits": [f"MANUAL_EDIT_APPROVE_{status.upper()}"],
        "semantic_conflict_codes": [],
        "mapping_confidence": "high" if conf >= 0.9 else ("medium" if conf >= 0.75 else "low"),
        "review_required": False,
    }

    if product.get("proposed_clinical_display_title"):
        canonical_update["product_name_display"] = product["proposed_clinical_display_title"]
    if product.get("proposed_clinical_subtitle"):
        canonical_update["clinical_subtitle"] = product["proposed_clinical_subtitle"]
    if not product.get("brand") and product.get("proposed_semantic_brand_system"):
        canonical_update["brand"] = product["proposed_semantic_brand_system"]

    await catalog_products_col.update_one({"_id": product["_id"]}, {"$set": canonical_update})

    await promotion_log_col.insert_one({
        "product_id": str(product["_id"]),
        "slug": slug,
        "action": "manual_edit_approve",
        "reviewer": "admin",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "edits_applied": edits,
        "fields_changed": list(canonical_update.keys()),
    })

    return {"status": "edit_approved", "slug": slug}


@router.post("/api/admin/review/bulk-approve")
async def bulk_approve(body: dict, _=Depends(admin_required)):
    """Bulk approve products by family, brand, or explicit slug list."""
    slugs = body.get("slugs", [])
    family = body.get("family")
    brand = body.get("brand")
    division = body.get("division")

    query = {
        "proposed_web_verification_status": {"$exists": True},
        "semantic_brand_system": {"$in": [None, ""]},
    }

    if slugs:
        query["slug"] = {"$in": slugs}
    elif family:
        query["$or"] = [
            {"product_family": {"$regex": family, "$options": "i"}},
            {"proposed_semantic_family_group": {"$regex": family, "$options": "i"}},
        ]
        if division:
            query["division_canonical"] = division
    elif brand:
        query["$or"] = [
            {"brand": {"$regex": brand, "$options": "i"}},
            {"proposed_semantic_brand_system": {"$regex": brand, "$options": "i"}},
        ]
    else:
        raise HTTPException(400, "Provide slugs, family, or brand for bulk approve")

    products = await catalog_products_col.find(query).to_list(500)
    approved = 0

    for product in products:
        conf = product.get("proposed_semantic_confidence", 0)
        status = product.get("proposed_web_verification_status", "")
        action_rec = product.get("proposed_recommended_action", "")

        canonical_update = {
            "semantic_brand_system": product.get("proposed_semantic_brand_system", ""),
            "semantic_parent_brand": product.get("proposed_semantic_parent_brand", ""),
            "semantic_system_type": product.get("proposed_semantic_system_type", ""),
            "semantic_implant_class": product.get("proposed_semantic_implant_class", ""),
            "semantic_material_default": product.get("proposed_semantic_material_default"),
            "semantic_coating_default": product.get("proposed_semantic_coating_default"),
            "semantic_anatomy_scope": product.get("proposed_semantic_anatomy_scope", []),
            "semantic_confidence": conf,
            "semantic_review_required": False,
            "semantic_enriched_at": datetime.now(timezone.utc).isoformat(),
            "semantic_rule_hits": [f"BULK_APPROVE_{status.upper()}"],
            "semantic_conflict_codes": [],
            "mapping_confidence": "high" if conf >= 0.9 else ("medium" if conf >= 0.75 else "low"),
            "review_required": False,
        }

        if action_rec == "rename" and product.get("proposed_clinical_display_title"):
            canonical_update["product_name_display"] = product["proposed_clinical_display_title"]
        if product.get("proposed_clinical_subtitle"):
            canonical_update["clinical_subtitle"] = product["proposed_clinical_subtitle"]
        if not product.get("brand") and product.get("proposed_semantic_brand_system"):
            canonical_update["brand"] = product["proposed_semantic_brand_system"]

        await catalog_products_col.update_one({"_id": product["_id"]}, {"$set": canonical_update})

        await promotion_log_col.insert_one({
            "product_id": str(product["_id"]),
            "slug": product.get("slug", ""),
            "action": "bulk_approve",
            "reviewer": "admin",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "confidence": conf,
        })
        approved += 1

    return {"status": "bulk_approved", "count": approved}


@router.get("/api/admin/review/families")
async def review_families(
    _=Depends(admin_required),
    division: Optional[str] = None,
    pending_only: bool = True,
):
    """Group review products by family for family-level review."""
    query = {"proposed_web_verification_status": {"$exists": True}}
    if pending_only:
        query["semantic_brand_system"] = {"$in": [None, ""]}
    if division:
        query["division_canonical"] = division

    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": {
                "family": {"$ifNull": ["$proposed_semantic_family_group", "$product_family"]},
                "division": "$division_canonical",
            },
            "count": {"$sum": 1},
            "avg_confidence": {"$avg": "$proposed_semantic_confidence"},
            "brands": {"$addToSet": "$proposed_semantic_brand_system"},
            "statuses": {"$addToSet": "$proposed_web_verification_status"},
            "actions": {"$addToSet": "$proposed_recommended_action"},
            "sample_slugs": {"$push": "$slug"},
            "has_conflict": {"$max": "$proposed_conflict_detected"},
        }},
        {"$sort": {"count": -1}},
    ]
    families = await catalog_products_col.aggregate(pipeline).to_list(200)

    return {
        "families": [
            {
                "family": f["_id"]["family"] or "(unnamed)",
                "division": f["_id"]["division"] or "(none)",
                "count": f["count"],
                "avg_confidence": round(f["avg_confidence"], 2) if f["avg_confidence"] else 0,
                "brands": [b for b in f["brands"] if b],
                "statuses": f["statuses"],
                "actions": f["actions"],
                "sample_slugs": f["sample_slugs"][:5],
                "has_conflict": f["has_conflict"] or False,
            }
            for f in families
        ],
        "total_families": len(families),
    }
