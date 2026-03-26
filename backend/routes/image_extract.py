from fastapi import APIRouter, Depends, BackgroundTasks
from datetime import datetime, timezone
import asyncio
import uuid
import fitz
import io
import os
import re

from db import products_col, db
from helpers import admin_required, get_object, put_object, APP_NAME

router = APIRouter()

catalog_files_col = db["catalog_files"]
extract_jobs_col = db["extract_jobs"]


def clean_name(filename: str) -> str:
    """Extract a clean product-like name from a brochure filename."""
    name = filename.rsplit(".", 1)[0] if "." in filename else filename
    name = re.sub(r"[_\-]+", " ", name)
    name = re.sub(r"\b(brochure|catalog|catalogue|leaflet|flyer|datasheet)\b", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b", "", name)
    name = re.sub(r"\b[a-f0-9]{8,}\b", "", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def extract_best_image(pdf_bytes: bytes, max_pages: int = 3) -> tuple:
    """Extract the largest/best product image from the first few pages of a PDF."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    best = None
    best_score = 0

    pages_to_check = min(doc.page_count, max_pages)
    for page_num in range(pages_to_check):
        page = doc[page_num]
        img_list = page.get_images(full=True)
        for img in img_list:
            xref = img[0]
            try:
                base = doc.extract_image(xref)
                if not base:
                    continue
                img_bytes = base["image"]
                ext = base["ext"]
                w = base.get("width", 0)
                h = base.get("height", 0)
                size_kb = len(img_bytes) / 1024

                if w < 200 or h < 200 or size_kb < 20:
                    continue

                aspect = max(w, h) / max(min(w, h), 1)
                if aspect > 5:
                    continue

                score = size_kb * 0.5 + (w * h / 10000)
                if page_num == 0:
                    score *= 1.5

                if score > best_score:
                    best_score = score
                    content_type = "image/jpeg" if ext in ("jpeg", "jpg") else f"image/{ext}"
                    best = (img_bytes, ext, content_type, w, h)
            except Exception:
                continue

    doc.close()
    return best


async def run_batch_extraction(job_id: str):
    """Background task to extract images from brochures and assign to products."""
    from rapidfuzz import fuzz

    await extract_jobs_col.update_one(
        {"job_id": job_id},
        {"$set": {"status": "running", "started_at": datetime.now(timezone.utc).isoformat()}}
    )

    brochures = await catalog_files_col.find(
        {"storage_path": {"$exists": True, "$ne": None}},
        {"_id": 0, "filename": 1, "storage_path": 1}
    ).to_list(None)

    products = await products_col.find(
        {"$or": [{"images": {"$exists": False}}, {"images": []}, {"images": None}]},
        {"_id": 1, "product_name": 1, "sku_code": 1, "division": 1}
    ).to_list(None)

    if not products:
        await extract_jobs_col.update_one(
            {"job_id": job_id},
            {"$set": {"status": "completed", "message": "All products already have images",
                       "completed_at": datetime.now(timezone.utc).isoformat()}}
        )
        return

    product_names = [(str(p["_id"]), p.get("product_name", ""), p.get("sku_code", "")) for p in products]

    pdf_brochures = [b for b in brochures if b["filename"].lower().endswith(".pdf")]
    total = len(pdf_brochures)
    matched = 0
    failed = 0
    processed = 0
    log = []

    for brochure in pdf_brochures:
        processed += 1
        filename = brochure["filename"]
        storage_path = brochure["storage_path"]

        try:
            pdf_data, _ = get_object(storage_path)
        except Exception as e:
            failed += 1
            log.append(f"SKIP {filename}: download failed - {str(e)[:80]}")
            continue

        try:
            result = extract_best_image(pdf_data)
        except Exception as e:
            failed += 1
            log.append(f"SKIP {filename}: extraction failed - {str(e)[:80]}")
            del pdf_data
            continue

        del pdf_data

        if not result:
            log.append(f"SKIP {filename}: no suitable image found")
            continue

        img_bytes, ext, content_type, w, h = result

        clean = clean_name(filename)
        best_pid = None
        best_score = 0

        for pid, pname, psku in product_names:
            name_score = max(
                fuzz.token_sort_ratio(clean.lower(), pname.lower()),
                fuzz.token_set_ratio(clean.lower(), pname.lower()),
                fuzz.partial_ratio(clean.lower(), pname.lower()) * 0.85,
            )
            if name_score > best_score:
                best_score = name_score
                best_pid = pid

        if best_score < 55:
            log.append(f"SKIP {filename}: no product match (best score: {best_score})")
            del img_bytes
            continue

        try:
            img_path = f"{APP_NAME}/products/{best_pid}/{uuid.uuid4().hex}.{ext}"
            put_result = put_object(img_path, img_bytes, content_type)

            image_doc = {
                "id": uuid.uuid4().hex[:12],
                "storage_path": put_result["path"],
                "original_filename": f"brochure_{filename}.{ext}",
                "content_type": content_type,
                "size": put_result.get("size", len(img_bytes)),
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "source": "brochure_extraction",
            }

            await products_col.update_one(
                {"_id": __import__("bson").ObjectId(best_pid)},
                {
                    "$push": {"images": image_doc},
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
                }
            )

            pname_match = next((n for i, n, s in product_names if i == best_pid), "?")
            product_names = [(i, n, s) for i, n, s in product_names if i != best_pid]
            matched += 1
            log.append(f"MATCH {filename} -> {pname_match} (score: {best_score})")
        except Exception as e:
            failed += 1
            log.append(f"ERROR {filename}: upload/assign failed - {str(e)[:80]}")
        finally:
            del img_bytes

        if processed % 10 == 0:
            await extract_jobs_col.update_one(
                {"job_id": job_id},
                {"$set": {
                    "processed": processed, "total": total,
                    "matched": matched, "failed": failed,
                    "log": log[-20:],
                }}
            )

    await extract_jobs_col.update_one(
        {"job_id": job_id},
        {"$set": {
            "status": "completed",
            "processed": processed, "total": total,
            "matched": matched, "failed": failed,
            "log": log,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }}
    )


@router.post("/api/admin/extract-brochure-images")
async def start_brochure_extraction(background_tasks: BackgroundTasks, _=Depends(admin_required)):
    existing = await extract_jobs_col.find_one({"status": "running"})
    if existing:
        return {"message": "Extraction already running", "job_id": existing["job_id"]}

    job_id = uuid.uuid4().hex[:12]
    await extract_jobs_col.insert_one({
        "job_id": job_id,
        "status": "queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "processed": 0, "total": 0, "matched": 0, "failed": 0, "log": [],
    })

    background_tasks.add_task(run_batch_extraction, job_id)
    return {"message": "Extraction started", "job_id": job_id}


@router.get("/api/admin/extract-brochure-images/status")
async def get_extraction_status(_=Depends(admin_required)):
    job = await extract_jobs_col.find_one(
        {}, {"_id": 0}, sort=[("created_at", -1)]
    )
    if not job:
        return {"status": "none", "message": "No extraction jobs found"}
    return job


@router.get("/api/admin/products-without-images")
async def get_products_without_images(_=Depends(admin_required)):
    products = await products_col.find(
        {"$or": [{"images": {"$exists": False}}, {"images": []}, {"images": None}]},
        {"_id": 1, "product_name": 1, "sku_code": 1, "division": 1, "category": 1}
    ).to_list(None)
    result = []
    for p in products:
        result.append({
            "id": str(p["_id"]),
            "product_name": p.get("product_name"),
            "sku_code": p.get("sku_code"),
            "division": p.get("division"),
            "category": p.get("category"),
        })
    return {"count": len(result), "products": result[:100]}


@router.delete("/api/admin/clear-brochure-images")
async def clear_brochure_images(_=Depends(admin_required)):
    """Remove all auto-extracted brochure images so extraction can be rerun."""
    result = await products_col.update_many(
        {"images.source": "brochure_extraction"},
        {"$pull": {"images": {"source": "brochure_extraction"}}}
    )
    return {"cleared_products": result.modified_count}
