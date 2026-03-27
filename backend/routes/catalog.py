"""
Catalog API routes — serves from catalog_products + catalog_skus.
Phase 3/4: Standardized product pages for pilot divisions.
Only exposes high-confidence, non-draft products by default.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from db import db as mongo_db

router = APIRouter(prefix="/api/catalog", tags=["catalog"])

catalog_products_col = mongo_db["catalog_products"]
catalog_skus_col = mongo_db["catalog_skus"]

# Default filter: only safe, non-draft, high-confidence products
PILOT_FILTER = {
    "mapping_confidence": "high",
    "review_required": False,
    "status": {"$ne": "draft"},
}

# Currently enabled pilot divisions
PILOT_DIVISIONS = ["Trauma"]

# Coating terminology normalization
COATING_ALIASES = {
    "Titanium Niobium (TiNBn)": "Bionik Gold Surface (TiNbN Coating)",
    "TiNBn": "Bionik Gold Surface (TiNbN Coating)",
    "TiNbN": "Bionik Gold Surface (TiNbN Coating)",
    "Titanium Niobium": "Bionik Gold Surface (TiNbN Coating)",
    "Bionik Gold": "Bionik Gold Surface (TiNbN Coating)",
}


def normalize_spec_key(key):
    """Title-case spec keys: 'thickness' -> 'Thickness'."""
    return key.replace("_", " ").strip().title()


def normalize_spec_value(key_lower, value):
    """Normalize spec values — especially coating terminology."""
    if isinstance(value, str) and key_lower in ("coating", "surface"):
        for alias, canonical in COATING_ALIASES.items():
            if alias.lower() in value.lower():
                return canonical
    return value


def normalize_specs(specs):
    """Normalize spec dict: title-case keys, unify coating terms."""
    if not specs or not isinstance(specs, dict):
        return {}
    result = {}
    for k, v in specs.items():
        new_key = normalize_spec_key(k)
        new_val = normalize_spec_value(k.lower().strip(), v)
        if new_val is not None and new_val != "":
            result[new_key] = new_val
    return result


def detect_image_type(images):
    """Detect if images are brochure covers vs real product photos."""
    if not images:
        return "none"
    for img in images:
        fname = (img.get("original_filename") or "").lower()
        source = (img.get("source") or "").lower()
        if "brochure" in fname or "cover" in fname or "propagation" in source:
            return "brochure_cover"
    return "product_photo"


@router.get("/divisions")
async def catalog_divisions():
    """List pilot divisions with product counts."""
    divisions = []
    for div in PILOT_DIVISIONS:
        filt = {**PILOT_FILTER, "division_canonical": div}
        count = await catalog_products_col.count_documents(filt)
        categories = await catalog_products_col.distinct("category", filt)
        brands = await catalog_products_col.distinct("brand", filt)
        divisions.append({
            "name": div,
            "product_count": count,
            "categories": sorted(categories),
            "brands": sorted([b for b in brands if b]),
        })
    return {"divisions": divisions, "pilot_active": True}


@router.get("/products")
async def catalog_product_list(
    division: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    """List catalog products with filters. Only pilot-safe products."""
    filt = dict(PILOT_FILTER)
    if division:
        filt["division_canonical"] = division
    else:
        filt["division_canonical"] = {"$in": PILOT_DIVISIONS}

    if category:
        filt["category"] = category
    if brand:
        filt["brand"] = brand
    if search:
        filt["$or"] = [
            {"product_name": {"$regex": search, "$options": "i"}},
            {"product_name_display": {"$regex": search, "$options": "i"}},
            {"brand": {"$regex": search, "$options": "i"}},
            {"sku_code": {"$regex": search, "$options": "i"}},
        ]

    total = await catalog_products_col.count_documents(filt)
    skip = (page - 1) * limit

    products = []
    cursor = catalog_products_col.find(filt, {"_id": 0}).sort([
        ("brand", 1), ("product_name_display", 1)
    ]).skip(skip).limit(limit)

    async for doc in cursor:
        products.append({
            "slug": doc.get("slug", ""),
            "product_name": doc.get("product_name", ""),
            "product_name_display": doc.get("product_name_display", ""),
            "product_family": doc.get("product_family", ""),
            "product_family_display": doc.get("product_family_display", ""),
            "brand": doc.get("brand", ""),
            "parent_brand": doc.get("parent_brand", ""),
            "division": doc.get("division_canonical", ""),
            "category": doc.get("category", ""),
            "material": doc.get("material_canonical", ""),
            "images": doc.get("images", []),
            "image_type": detect_image_type(doc.get("images", [])),
            "description": doc.get("description_shadow") or doc.get("description_live", ""),
            "enriched_from_shadow": doc.get("enriched_from_shadow", False),
            "shadow_sku_count": doc.get("shadow_sku_count", 0),
            "brochure_url": doc.get("brochure_url", ""),
        })

    return {
        "products": products,
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit),
    }


@router.get("/products/{slug}")
async def catalog_product_detail(slug: str):
    """Get single catalog product by slug, with SKU table."""
    doc = await catalog_products_col.find_one(
        {**PILOT_FILTER, "slug": slug}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found in catalog")

    # Fetch catalog SKUs for this product
    skus = []
    product_name = doc.get("product_name", "")
    cursor = catalog_skus_col.find(
        {"catalog_product_name": product_name}, {"_id": 0}
    ).sort("sku_code", 1)
    async for sku in cursor:
        skus.append(sku)

    # Fetch related products (same brand + division, up to 6)
    related = []
    related_filter = {
        **PILOT_FILTER,
        "division_canonical": doc.get("division_canonical", ""),
        "slug": {"$ne": slug},
    }
    if doc.get("brand"):
        related_filter["brand"] = doc["brand"]

    cursor = catalog_products_col.find(related_filter, {"_id": 0}).limit(6)
    async for rel in cursor:
        related.append({
            "slug": rel.get("slug", ""),
            "product_name_display": rel.get("product_name_display", ""),
            "brand": rel.get("brand", ""),
            "category": rel.get("category", ""),
            "images": rel.get("images", []),
            "division": rel.get("division_canonical", ""),
        })

    # If not enough related from same brand, fill from same division
    if len(related) < 4:
        fill_filter = {
            **PILOT_FILTER,
            "division_canonical": doc.get("division_canonical", ""),
            "slug": {"$ne": slug, "$nin": [r["slug"] for r in related]},
        }
        cursor = catalog_products_col.find(fill_filter, {"_id": 0}).limit(4 - len(related))
        async for rel in cursor:
            related.append({
                "slug": rel.get("slug", ""),
                "product_name_display": rel.get("product_name_display", ""),
                "brand": rel.get("brand", ""),
                "category": rel.get("category", ""),
                "images": rel.get("images", []),
                "division": rel.get("division_canonical", ""),
            })

    return {
        # Product family info
        "product_name": doc.get("product_name", ""),
        "product_name_display": doc.get("product_name_display", ""),
        "product_family": doc.get("product_family", ""),
        "product_family_display": doc.get("product_family_display", ""),
        "brand": doc.get("brand", ""),
        "parent_brand": doc.get("parent_brand", ""),
        "division": doc.get("division_canonical", ""),
        "division_original": doc.get("division_live_original", ""),
        "category": doc.get("category", ""),
        "slug": doc.get("slug", ""),

        # Descriptions
        "description": doc.get("description_shadow") or doc.get("description_live", ""),
        "description_live": doc.get("description_live", ""),
        "description_shadow": doc.get("description_shadow", ""),

        # Specs & materials — normalized
        "material": doc.get("material_canonical", ""),
        "technical_specifications": normalize_specs(doc.get("technical_specifications", {})),
        "sku_code": doc.get("sku_code", ""),

        # Commerce
        "images": doc.get("images", []),
        "image_type": detect_image_type(doc.get("images", [])),
        "brochure_url": doc.get("brochure_url", ""),
        "pack_size": doc.get("pack_size"),
        "manufacturer": doc.get("manufacturer", ""),

        # SKU table
        "skus": skus,
        "sku_count": len(skus),

        # Related
        "related_products": [{**r, "image_type": detect_image_type(r.get("images", []))} for r in related],

        # Enrichment metadata
        "enriched_from_shadow": doc.get("enriched_from_shadow", False),
        "shadow_source_files": doc.get("shadow_source_files", []),
    }
