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
PILOT_DIVISIONS = ["Trauma", "Cardiovascular", "Diagnostics", "Joint Replacement"]

# Division metadata for frontend
DIVISION_META = {
    "Trauma": {"slug": "trauma", "icon": "bone", "color": "amber"},
    "Cardiovascular": {"slug": "cardiovascular", "icon": "heart-pulse", "color": "rose"},
    "Diagnostics": {"slug": "diagnostics", "icon": "microscope", "color": "violet"},
    "Joint Replacement": {"slug": "joint-replacement", "icon": "activity", "color": "teal"},
}

SLUG_TO_DIVISION = {v["slug"]: k for k, v in DIVISION_META.items()}

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


import re as _re

# Humerus plate prefix → subtype name mapping (from brochure extraction)
HUMERUS_PLATE_TYPES = {
    "01": "Posterolateral Distal",
    "02": "Posterolateral Distal w/ Lat Support",
    "03": "Posterolateral Distal w/ Lat Support",
    "09": "Medial Distal",
    "15": "Medial Distal Metaphyseal",
    "41": "Extra-articular Distal",
    "49": "Extra-articular Distal (Short)",
    "51": "Proximal",
    "52": "Proximal (Long)",
    "74": "Periarticular Proximal Lateral",
}

def parse_sku_code(sku_code, division=""):
    """Parse structured info from SKU codes based on known patterns."""
    parsed = {}
    if not sku_code:
        return parsed

    # Side detection (L/R suffix)
    if sku_code.endswith("L"):
        parsed["side"] = "Left"
    elif sku_code.endswith("R"):
        parsed["side"] = "Right"

    # Trauma plate pattern: MT-PT{type}{holes}{length}{side}
    # e.g., MT-PT0103058L → type=01, holes=03, length=058mm, side=L
    m = _re.match(r"^MT-PT(\d{2})(\d{2})(\d{3})([LR]?)$", sku_code)
    if m:
        type_code = m.group(1)
        parsed["plate_type"] = HUMERUS_PLATE_TYPES.get(type_code, f"Type {type_code}")
        holes = int(m.group(2))
        length_mm = int(m.group(3))
        if holes > 0:
            parsed["holes"] = holes
        if length_mm > 0:
            parsed["length_mm"] = length_mm
        return parsed

    # Stent pattern: various diameter x length
    dims = _re.findall(r"(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)", sku_code)
    if dims:
        parsed["diameter_mm"] = float(dims[0][0])
        parsed["length_mm"] = float(dims[0][1])

    # Nail pattern: MT-NT{type:2}{diameter:2}{length:3}{side?}
    # Also handles MT-NTO variant (O instead of 0 in type)
    m = _re.match(r"^MT-NT[O0]?(\d{1,2})(\d{2})(\d{3})([LR]?)$", sku_code)
    if m:
        nail_type = int(m.group(1))
        diameter_raw = int(m.group(2))
        length_mm = int(m.group(3))
        # Elastic nails (type 05) encode diameter in tenths of mm
        if nail_type == 5 and diameter_raw >= 10:
            parsed["diameter_mm"] = round(diameter_raw / 10, 1)
        elif diameter_raw > 0:
            parsed["diameter_mm"] = diameter_raw
        if length_mm > 0:
            parsed["length_mm"] = length_mm

    return parsed


def format_sku_for_response(sku_doc, brochure_url=""):
    """Format a SKU document for API response with parsed fields."""
    parsed = parse_sku_code(sku_doc.get("sku_code", ""), sku_doc.get("division", ""))
    result = {
        "sku_code": sku_doc.get("sku_code", ""),
        "product_name": sku_doc.get("product_name", ""),
        "brand": sku_doc.get("brand", ""),
        "description": sku_doc.get("description", ""),
        "source": sku_doc.get("source", ""),
        "source_file": sku_doc.get("source_file", ""),
        "sub_category": sku_doc.get("sub_category", ""),
    }
    if parsed:
        result["parsed"] = parsed
    return result


@router.get("/divisions")
async def catalog_divisions():
    """List pilot divisions with product counts and metadata."""
    divisions = []
    for div in PILOT_DIVISIONS:
        filt = {**PILOT_FILTER, "division_canonical": div}
        count = await catalog_products_col.count_documents(filt)
        categories = await catalog_products_col.distinct("category", filt)
        brands = await catalog_products_col.distinct("brand", filt)
        meta = DIVISION_META.get(div, {})
        divisions.append({
            "name": div,
            "slug": meta.get("slug", div.lower().replace(" ", "-")),
            "icon": meta.get("icon", "package"),
            "color": meta.get("color", "slate"),
            "product_count": count,
            "categories": sorted(categories),
            "brands": sorted([b for b in brands if b]),
        })
    return {"divisions": divisions, "pilot_active": True}


@router.get("/divisions/{slug}")
async def catalog_division_detail(slug: str):
    """Get single division info by slug."""
    div_name = SLUG_TO_DIVISION.get(slug)
    if not div_name:
        raise HTTPException(status_code=404, detail="Division not found")
    filt = {**PILOT_FILTER, "division_canonical": div_name}
    count = await catalog_products_col.count_documents(filt)
    categories = await catalog_products_col.distinct("category", filt)
    brands = await catalog_products_col.distinct("brand", filt)
    meta = DIVISION_META.get(div_name, {})
    return {
        "name": div_name,
        "slug": slug,
        "icon": meta.get("icon", "package"),
        "color": meta.get("color", "slate"),
        "product_count": count,
        "categories": sorted(categories),
        "brands": sorted([b for b in brands if b]),
    }


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
        div = doc.get("division_canonical", "")
        div_meta = DIVISION_META.get(div, {})
        products.append({
            "slug": doc.get("slug", ""),
            "product_name": doc.get("product_name", ""),
            "product_name_display": doc.get("product_name_display", ""),
            "product_family": doc.get("product_family", ""),
            "product_family_display": doc.get("product_family_display", ""),
            "brand": doc.get("brand", ""),
            "parent_brand": doc.get("parent_brand", ""),
            "division": div,
            "division_slug": div_meta.get("slug", div.lower().replace(" ", "-")),
            "category": doc.get("category", ""),
            "material": doc.get("material_canonical", ""),
            "images": doc.get("images", []),
            "image_type": detect_image_type(doc.get("images", [])),
            "description": doc.get("description_shadow") or doc.get("description_live", ""),
            "enriched_from_shadow": doc.get("enriched_from_shadow", False),
            "shadow_sku_count": doc.get("shadow_sku_count", 0),
            "brochure_url": doc.get("brochure_url", ""),
            # Clinical & Semantic context
            "clinical_subtitle": doc.get("clinical_subtitle", ""),
            "semantic_brand_system": doc.get("semantic_brand_system"),
            "semantic_system_type": doc.get("semantic_system_type"),
            "semantic_material_default": doc.get("semantic_material_default"),
            "semantic_coating_default": doc.get("semantic_coating_default"),
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
    brochure_url = doc.get("brochure_url", "")
    cursor = catalog_skus_col.find(
        {"catalog_product_name": product_name}, {"_id": 0}
    ).sort("sku_code", 1)
    async for sku in cursor:
        skus.append(format_sku_for_response(sku, brochure_url))

    # Compute available parsed columns for the frontend
    parsed_columns = set()
    for s in skus:
        if "parsed" in s:
            parsed_columns.update(s["parsed"].keys())
    parsed_columns = sorted(parsed_columns)

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
        rel_div = rel.get("division_canonical", "")
        rel_meta = DIVISION_META.get(rel_div, {})
        related.append({
            "slug": rel.get("slug", ""),
            "product_name_display": rel.get("product_name_display", ""),
            "brand": rel.get("brand", ""),
            "category": rel.get("category", ""),
            "images": rel.get("images", []),
            "division": rel_div,
            "division_slug": rel_meta.get("slug", rel_div.lower().replace(" ", "-")),
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
            rel_div = rel.get("division_canonical", "")
            rel_meta = DIVISION_META.get(rel_div, {})
            related.append({
                "slug": rel.get("slug", ""),
                "product_name_display": rel.get("product_name_display", ""),
                "brand": rel.get("brand", ""),
                "category": rel.get("category", ""),
                "images": rel.get("images", []),
                "division": rel_div,
                "division_slug": rel_meta.get("slug", rel_div.lower().replace(" ", "-")),
            })

    div_name = doc.get("division_canonical", "")
    div_meta = DIVISION_META.get(div_name, {})

    return {
        # Product family info
        "product_name": doc.get("product_name", ""),
        "product_name_display": doc.get("product_name_display", ""),
        "product_family": doc.get("product_family", ""),
        "product_family_display": doc.get("product_family_display", ""),
        "brand": doc.get("brand", ""),
        "parent_brand": doc.get("parent_brand", ""),
        "division": div_name,
        "division_slug": div_meta.get("slug", div_name.lower().replace(" ", "-")),
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
        "sku_parsed_columns": parsed_columns,

        # Related
        "related_products": [{**r, "image_type": detect_image_type(r.get("images", []))} for r in related],

        # Enrichment metadata
        "enriched_from_shadow": doc.get("enriched_from_shadow", False),
        "shadow_source_files": doc.get("shadow_source_files", []),

        # Clinical reclassification
        "clinical_subtitle": doc.get("clinical_subtitle", ""),

        # Semantic intelligence (backend use)
        "semantic_brand_system": doc.get("semantic_brand_system"),
        "semantic_system_type": doc.get("semantic_system_type"),
        "semantic_implant_class": doc.get("semantic_implant_class"),
        "semantic_material_default": doc.get("semantic_material_default"),
        "semantic_coating_default": doc.get("semantic_coating_default"),
        "semantic_parent_brand": doc.get("semantic_parent_brand"),
        "semantic_anatomy_scope": doc.get("semantic_anatomy_scope", []),
        "semantic_confidence": doc.get("semantic_confidence"),
    }


bsi_col = mongo_db["brand_system_intelligence"]


@router.get("/brand-intelligence/{entity_code}")
async def get_brand_intelligence(entity_code: str):
    """Get semantic intelligence for a brand system."""
    doc = await bsi_col.find_one(
        {"entity_code": entity_code.upper(), "status": "active"},
        {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Brand system not found")
    # Convert datetime fields to ISO strings
    for k in ("created_at", "updated_at"):
        if k in doc and doc[k]:
            doc[k] = doc[k].isoformat()
    return doc
