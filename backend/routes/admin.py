from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from typing import Optional, List
from bson import ObjectId
from datetime import datetime, timezone
import math
import uuid

from db import products_col, leads_col
from models import AdminLogin, LeadUpdate, ProductCreate, ProductUpdate
from helpers import (
    ADMIN_PASSWORD, create_token, admin_required,
    serialize_doc, serialize_docs, calculate_lead_score,
    put_object, get_mime_type, APP_NAME,
)

router = APIRouter()


# --- Auth ---

@router.post("/api/admin/login")
async def admin_login(body: AdminLogin):
    if body.password == ADMIN_PASSWORD:
        token = create_token({"sub": "admin", "role": "super_admin"})
        return {"token": token, "role": "super_admin"}
    raise HTTPException(401, "Invalid credentials")


# --- Dashboard ---

@router.get("/api/admin/stats")
async def admin_stats(_=Depends(admin_required)):
    total_products = await products_col.count_documents({})
    total_leads = await leads_col.count_documents({})
    hot_leads = await leads_col.count_documents({"score": {"$in": ["hot", "Hot"]}})
    warm_leads = await leads_col.count_documents({"score": {"$in": ["warm", "Warm"]}})
    cold_leads = await leads_col.count_documents({"score": {"$in": ["cold", "Cold"]}})
    new_leads = await leads_col.count_documents({"status": "new"})

    pipeline = [
        {"$group": {"_id": "$division", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    division_counts = await products_col.aggregate(pipeline).to_list(20)

    pipeline2 = [
        {"$group": {"_id": "$inquiry_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    inquiry_counts = await leads_col.aggregate(pipeline2).to_list(20)

    pipeline3 = [
        {"$group": {"_id": "$district", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    district_counts = await leads_col.aggregate(pipeline3).to_list(10)

    return {
        "total_products": total_products,
        "total_leads": total_leads,
        "hot_leads": hot_leads,
        "warm_leads": warm_leads,
        "cold_leads": cold_leads,
        "new_leads": new_leads,
        "products_by_division": [{"division": d["_id"], "count": d["count"]} for d in division_counts],
        "leads_by_inquiry": [{"type": d["_id"], "count": d["count"]} for d in inquiry_counts],
        "leads_by_district": [{"district": d["_id"] or "Unknown", "count": d["count"]} for d in district_counts],
    }


# --- Pipeline / Analytics ---

@router.get("/api/admin/pipeline")
async def admin_pipeline(_=Depends(admin_required)):
    statuses = ["new", "contacted", "qualified", "negotiation", "won", "lost"]
    pipeline_data = {}
    for s in statuses:
        cursor = leads_col.find({"status": s}).sort("score_value", -1)
        docs = await cursor.to_list(100)
        pipeline_data[s] = serialize_docs(docs)
    return {"pipeline": pipeline_data}


@router.get("/api/admin/analytics")
async def admin_analytics(_=Depends(admin_required)):
    total = await leads_col.count_documents({})
    src_pipeline = [{"$group": {"_id": "$source", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    by_source = await leads_col.aggregate(src_pipeline).to_list(20)
    score_pipeline = [{"$group": {"_id": "$score", "count": {"$sum": 1}}}]
    by_score = await leads_col.aggregate(score_pipeline).to_list(10)
    status_pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    by_status = await leads_col.aggregate(status_pipeline).to_list(10)
    district_pipeline = [
        {"$match": {"district": {"$ne": ""}}},
        {"$group": {"_id": "$district", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15}
    ]
    by_district = await leads_col.aggregate(district_pipeline).to_list(15)
    inquiry_pipeline = [{"$group": {"_id": "$inquiry_type", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    by_inquiry = await leads_col.aggregate(inquiry_pipeline).to_list(10)
    recent = await leads_col.find().sort("created_at", -1).to_list(10)
    won = await leads_col.count_documents({"status": "won"})
    conversion_rate = round((won / total * 100), 1) if total > 0 else 0

    return {
        "total_leads": total,
        "conversion_rate": conversion_rate,
        "by_source": [{"source": d["_id"] or "Unknown", "count": d["count"]} for d in by_source],
        "by_score": [{"score": d["_id"], "count": d["count"]} for d in by_score],
        "by_status": [{"status": d["_id"], "count": d["count"]} for d in by_status],
        "by_district": [{"district": d["_id"], "count": d["count"]} for d in by_district],
        "by_inquiry": [{"type": d["_id"], "count": d["count"]} for d in by_inquiry],
        "recent_leads": serialize_docs(recent),
    }


# --- Leads CRUD ---

@router.get("/api/admin/leads")
async def admin_list_leads(
    _=Depends(admin_required),
    score: Optional[str] = None,
    status: Optional[str] = None,
    district: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: int = -1,
    page: int = 1,
    limit: int = 20
):
    query = {}
    if score:
        query["score"] = score
    if status:
        query["status"] = status
    if district:
        query["district"] = district
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"hospital_clinic": {"$regex": search, "$options": "i"}},
            {"phone_whatsapp": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    total = await leads_col.count_documents(query)
    skip = (page - 1) * limit
    cursor = leads_col.find(query).sort(sort_by, sort_order).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)

    return {
        "leads": serialize_docs(docs),
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if total > 0 else 1
    }


@router.get("/api/admin/leads/{lead_id}")
async def admin_get_lead(lead_id: str, _=Depends(admin_required)):
    try:
        doc = await leads_col.find_one({"_id": ObjectId(lead_id)})
    except Exception:
        raise HTTPException(400, "Invalid lead ID")
    if not doc:
        raise HTTPException(404, "Lead not found")
    return serialize_doc(doc)


@router.put("/api/admin/leads/{lead_id}")
async def admin_update_lead(lead_id: str, update: LeadUpdate, _=Depends(admin_required)):
    try:
        oid = ObjectId(lead_id)
    except Exception:
        raise HTTPException(400, "Invalid lead ID")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}

    if "notes" in update_data and update_data["notes"]:
        existing = await leads_col.find_one({"_id": oid})
        if existing:
            notes_list = existing.get("notes", [])
            notes_list.append({
                "text": update_data.pop("notes"),
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            update_data["notes"] = notes_list

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await leads_col.update_one({"_id": oid}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(404, "Lead not found")

    doc = await leads_col.find_one({"_id": oid})
    return serialize_doc(doc)


@router.delete("/api/admin/leads/{lead_id}")
async def admin_delete_lead(lead_id: str, _=Depends(admin_required)):
    try:
        result = await leads_col.delete_one({"_id": ObjectId(lead_id)})
    except Exception:
        raise HTTPException(400, "Invalid lead ID")
    if result.deleted_count == 0:
        raise HTTPException(404, "Lead not found")
    return {"message": "Lead deleted"}


# --- Products CRUD ---

@router.post("/api/admin/products")
async def admin_create_product(product: ProductCreate, _=Depends(admin_required)):
    doc = {
        **product.model_dump(),
        "slug": product.product_name.lower().replace(" ", "-").replace("/", "-"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await products_col.insert_one(doc)
    doc.pop("_id", None)
    doc["id"] = str(result.inserted_id)
    return doc


@router.put("/api/admin/products/{product_id}")
async def admin_update_product(product_id: str, update: ProductUpdate, _=Depends(admin_required)):
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(400, "Invalid product ID")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    if "product_name" in update_data:
        update_data["slug"] = update_data["product_name"].lower().replace(" ", "-").replace("/", "-")

    result = await products_col.update_one({"_id": oid}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(404, "Product not found")
    doc = await products_col.find_one({"_id": oid})
    return serialize_doc(doc)


@router.delete("/api/admin/products/{product_id}")
async def admin_delete_product(product_id: str, _=Depends(admin_required)):
    try:
        result = await products_col.delete_one({"_id": ObjectId(product_id)})
    except Exception:
        raise HTTPException(400, "Invalid product ID")
    if result.deleted_count == 0:
        raise HTTPException(404, "Product not found")
    return {"message": "Product deleted"}


@router.get("/api/admin/products")
async def admin_list_products(
    _=Depends(admin_required),
    division: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    query = {}
    if division:
        query["division"] = division
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"product_name": {"$regex": search, "$options": "i"}},
            {"sku_code": {"$regex": search, "$options": "i"}},
        ]

    total = await products_col.count_documents(query)
    skip = (page - 1) * limit
    cursor = products_col.find(query).sort("product_name", 1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)

    return {
        "products": serialize_docs(docs),
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if total > 0 else 1
    }


# --- Product Image Upload ---

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/api/admin/products/{product_id}/images")
async def upload_product_images(
    product_id: str,
    files: List[UploadFile] = File(...),
    _=Depends(admin_required),
):
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(400, "Invalid product ID")

    product = await products_col.find_one({"_id": oid})
    if not product:
        raise HTTPException(404, "Product not found")

    uploaded = []
    for file in files:
        content_type = file.content_type or get_mime_type(file.filename)
        if content_type not in ALLOWED_IMAGE_TYPES:
            continue

        data = await file.read()
        if len(data) > MAX_IMAGE_SIZE:
            continue

        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
        storage_path = f"{APP_NAME}/products/{product_id}/{uuid.uuid4().hex}.{ext}"

        result = put_object(storage_path, data, content_type)

        image_doc = {
            "id": uuid.uuid4().hex[:12],
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": content_type,
            "size": result.get("size", len(data)),
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
        }
        uploaded.append(image_doc)

    if uploaded:
        await products_col.update_one(
            {"_id": oid},
            {
                "$push": {"images": {"$each": uploaded}},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
            }
        )

    return {
        "uploaded": len(uploaded),
        "images": uploaded,
    }


@router.delete("/api/admin/products/{product_id}/images/{image_id}")
async def delete_product_image(product_id: str, image_id: str, _=Depends(admin_required)):
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(400, "Invalid product ID")

    result = await products_col.update_one(
        {"_id": oid},
        {
            "$pull": {"images": {"id": image_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        }
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Product not found")
    return {"message": "Image removed"}


@router.post("/api/admin/products/bulk-images")
async def bulk_upload_images(
    files: List[UploadFile] = File(...),
    _=Depends(admin_required),
):
    """Bulk upload images — auto-match to products by SKU code in filename.
    Filename pattern: SKU_anything.jpg  e.g. MRL-ORTHO-001_front.jpg
    """
    results = {"matched": 0, "unmatched": 0, "errors": [], "uploads": []}

    for file in files:
        content_type = file.content_type or get_mime_type(file.filename)
        if content_type not in ALLOWED_IMAGE_TYPES:
            results["errors"].append(f"{file.filename}: not an image")
            continue

        data = await file.read()
        if len(data) > MAX_IMAGE_SIZE:
            results["errors"].append(f"{file.filename}: exceeds 10MB")
            continue

        # Try to extract SKU from filename (before first underscore or space)
        name_part = file.filename.rsplit(".", 1)[0] if "." in file.filename else file.filename
        sku_guess = name_part.split("_")[0].split(" ")[0].strip().upper()

        product = await products_col.find_one(
            {"sku_code": {"$regex": f"^{sku_guess}$", "$options": "i"}},
        )

        if not product:
            results["unmatched"] += 1
            results["errors"].append(f"{file.filename}: no product matched for SKU '{sku_guess}'")
            continue

        product_id = str(product["_id"])
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
        storage_path = f"{APP_NAME}/products/{product_id}/{uuid.uuid4().hex}.{ext}"

        try:
            put_result = put_object(storage_path, data, content_type)
        except Exception as e:
            results["errors"].append(f"{file.filename}: upload failed — {str(e)}")
            continue

        image_doc = {
            "id": uuid.uuid4().hex[:12],
            "storage_path": put_result["path"],
            "original_filename": file.filename,
            "content_type": content_type,
            "size": put_result.get("size", len(data)),
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
        }

        await products_col.update_one(
            {"_id": product["_id"]},
            {
                "$push": {"images": image_doc},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
            }
        )

        results["matched"] += 1
        results["uploads"].append({
            "filename": file.filename,
            "product": product.get("product_name"),
            "sku": product.get("sku_code"),
        })

    return results
