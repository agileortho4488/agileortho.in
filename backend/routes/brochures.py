"""
Bulk brochure import for Agile Healthcare.

Admin uploads ONE ZIP containing:
  - 1..N PDF brochures
  - 1 manifest.csv with columns: filename, scope_type, scope_value
      scope_type ∈ {product_slug, product_family, division}
      scope_value = the slug / family name / division name to attach the PDF to

The endpoint:
  1. Unpacks the ZIP in-memory
  2. Uploads every PDF to object storage under agile-ortho/brochures/<filename>
  3. Reads manifest.csv and for each row, sets brochure_url on every matching product
  4. Returns a detailed per-row report (matched count, unmatched filenames, errors)
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from datetime import datetime, timezone
import zipfile
import io
import csv
import re

from db import catalog_products_col
from helpers import admin_required, put_object

router = APIRouter()

VALID_SCOPE_TYPES = {"product_slug", "product_family", "division"}
BROCHURE_PREFIX = "agile-ortho/brochures"


def _slugify_filename(name: str) -> str:
    """Normalize a PDF filename to a safe storage key (lowercase, hyphens)."""
    base = name.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    base = base.lower()
    base = re.sub(r"\.pdf$", "", base)
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return f"{base}.pdf"


@router.get("/api/admin/brochures/summary")
async def brochures_summary(_=Depends(admin_required)):
    """Coverage stats for the admin dashboard."""
    total = await catalog_products_col.count_documents({})
    with_broc = await catalog_products_col.count_documents(
        {"brochure_url": {"$nin": [None, ""]}}
    )
    pipe = [
        {"$group": {
            "_id": "$division_canonical",
            "total": {"$sum": 1},
            "with_broc": {
                "$sum": {"$cond": [
                    {"$and": [
                        {"$ne": ["$brochure_url", None]},
                        {"$ne": ["$brochure_url", ""]},
                    ]}, 1, 0]}
            },
        }},
        {"$sort": {"total": -1}},
    ]
    by_div = []
    async for r in catalog_products_col.aggregate(pipe):
        by_div.append({
            "division": r["_id"] or "(none)",
            "total": r["total"],
            "with_brochure": r["with_broc"],
            "missing": r["total"] - r["with_broc"],
            "percent": round(100 * r["with_broc"] / r["total"], 1) if r["total"] else 0,
        })
    return {
        "total_products": total,
        "with_brochure": with_broc,
        "missing": total - with_broc,
        "by_division": by_div,
    }


@router.get("/api/admin/brochures/manifest-template")
async def manifest_template(_=Depends(admin_required)):
    """
    Returns a starter CSV the user can edit. Lists every division with zero or
    partial brochure coverage as a `division` row, and every unique
    product_family for divisions the user typically handles per-family.
    """
    lines = ["filename,scope_type,scope_value"]

    # Divisions with 0% coverage → suggest division-wide brochure
    pipe = [
        {"$group": {
            "_id": "$division_canonical",
            "total": {"$sum": 1},
            "with_broc": {"$sum": {"$cond": [
                {"$and": [
                    {"$ne": ["$brochure_url", None]},
                    {"$ne": ["$brochure_url", ""]},
                ]}, 1, 0]}},
        }},
        {"$sort": {"total": -1}},
    ]
    async for r in catalog_products_col.aggregate(pipe):
        div = r["_id"]
        if not div or div.startswith("_"):
            continue
        if r["with_broc"] == 0:
            safe = re.sub(r"[^a-z0-9]+", "-", div.lower()).strip("-")
            lines.append(f"{safe}.pdf,division,{div}")

    # Product families without a brochure — one row each
    pipe2 = [
        {"$match": {"brochure_url": {"$in": [None, ""]},
                    "product_family": {"$nin": [None, ""]}}},
        {"$group": {"_id": {"family": "$product_family",
                            "division": "$division_canonical"},
                    "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 300},
    ]
    async for r in catalog_products_col.aggregate(pipe2):
        fam = (r["_id"] or {}).get("family")
        if not fam:
            continue
        safe = re.sub(r"[^a-z0-9]+", "-", fam.lower()).strip("-")
        lines.append(f"{safe}.pdf,product_family,{fam}")

    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        "\n".join(lines),
        headers={"Content-Disposition":
                 'attachment; filename="brochure_manifest_template.csv"'},
    )


@router.post("/api/admin/brochures/bulk-import")
async def brochures_bulk_import(
    file: UploadFile = File(...),
    _=Depends(admin_required),
):
    """
    Accept a ZIP containing PDFs + manifest.csv. Upload all PDFs, then apply
    the manifest to set brochure_url on every matching product.
    """
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(400, "Please upload a .zip archive")

    raw = await file.read()
    try:
        zf = zipfile.ZipFile(io.BytesIO(raw))
    except zipfile.BadZipFile:
        raise HTTPException(400, "File is not a valid ZIP archive")

    # --- Index files inside the zip ---
    pdfs_in_zip = {}  # normalized_filename -> (original_name, bytes)
    manifest_bytes = None
    for info in zf.infolist():
        if info.is_dir():
            continue
        name = info.filename
        lower = name.lower()
        if lower.endswith("/manifest.csv") or lower == "manifest.csv":
            manifest_bytes = zf.read(info)
        elif lower.endswith(".pdf"):
            norm = _slugify_filename(name)
            pdfs_in_zip[norm] = (name, zf.read(info))

    if not manifest_bytes:
        raise HTTPException(400, "ZIP must contain a manifest.csv at the root")
    if not pdfs_in_zip:
        raise HTTPException(400, "ZIP must contain at least one .pdf file")

    # --- Upload every PDF to object storage ---
    upload_report = []
    uploaded_paths = {}  # normalized_filename -> storage_path
    for norm, (orig, data) in pdfs_in_zip.items():
        storage_path = f"{BROCHURE_PREFIX}/{norm}"
        try:
            put_object(storage_path, data, "application/pdf")
            uploaded_paths[norm] = storage_path
            upload_report.append({
                "filename": orig, "stored_as": storage_path,
                "size_bytes": len(data), "ok": True,
            })
        except Exception as e:
            upload_report.append({
                "filename": orig, "ok": False, "error": str(e),
            })

    # --- Parse manifest.csv ---
    manifest_text = manifest_bytes.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(manifest_text))
    required = {"filename", "scope_type", "scope_value"}
    if not reader.fieldnames or not required.issubset({f.strip() for f in reader.fieldnames}):
        raise HTTPException(
            400, "manifest.csv must have columns: filename, scope_type, scope_value"
        )

    # --- Apply each manifest row ---
    manifest_report = []
    total_products_updated = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for row_num, row in enumerate(reader, start=2):
        fname_raw = (row.get("filename") or "").strip()
        scope_type = (row.get("scope_type") or "").strip().lower()
        scope_value = (row.get("scope_value") or "").strip()

        if not fname_raw or not scope_type or not scope_value:
            manifest_report.append({
                "row": row_num, "filename": fname_raw, "ok": False,
                "error": "Missing filename, scope_type or scope_value",
            })
            continue

        if scope_type not in VALID_SCOPE_TYPES:
            manifest_report.append({
                "row": row_num, "filename": fname_raw, "ok": False,
                "error": f"Invalid scope_type '{scope_type}'. Use one of: "
                         + ", ".join(sorted(VALID_SCOPE_TYPES)),
            })
            continue

        norm = _slugify_filename(fname_raw)
        storage_path = uploaded_paths.get(norm)
        if not storage_path:
            manifest_report.append({
                "row": row_num, "filename": fname_raw, "ok": False,
                "error": f"PDF '{fname_raw}' not found in ZIP (expected '{norm}')",
            })
            continue

        # Build query per scope
        if scope_type == "product_slug":
            q = {"slug": scope_value}
        elif scope_type == "product_family":
            q = {"product_family": {"$regex": f"^{re.escape(scope_value)}$",
                                    "$options": "i"}}
        else:  # division
            q = {"division_canonical": {"$regex": f"^{re.escape(scope_value)}$",
                                        "$options": "i"}}

        # Only update products that don't already have a brochure, unless
        # scope_type is product_slug (explicit override wins).
        if scope_type != "product_slug":
            q = {**q, "brochure_url": {"$in": [None, ""]}}

        result = await catalog_products_col.update_many(
            q,
            {"$set": {
                "brochure_url": storage_path,
                "brochure_uploaded_at": now_iso,
                "brochure_scope": scope_type,
                "brochure_scope_value": scope_value,
            }},
        )
        total_products_updated += result.modified_count
        manifest_report.append({
            "row": row_num,
            "filename": fname_raw,
            "scope_type": scope_type,
            "scope_value": scope_value,
            "matched": result.matched_count,
            "updated": result.modified_count,
            "ok": True,
        })

    # --- Final coverage snapshot ---
    total = await catalog_products_col.count_documents({})
    with_broc = await catalog_products_col.count_documents(
        {"brochure_url": {"$nin": [None, ""]}}
    )

    return {
        "ok": True,
        "pdfs_in_zip": len(pdfs_in_zip),
        "pdfs_uploaded": len(uploaded_paths),
        "manifest_rows": len(manifest_report),
        "products_updated": total_products_updated,
        "coverage_after": {
            "total_products": total,
            "with_brochure": with_broc,
            "missing": total - with_broc,
            "percent": round(100 * with_broc / total, 1) if total else 0,
        },
        "upload_report": upload_report,
        "manifest_report": manifest_report,
    }
