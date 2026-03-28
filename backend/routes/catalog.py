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

# Production-eligible filter: only clean, verified, non-draft products
LIVE_FILTER = {
    "semantic_brand_system": {"$nin": [None, ""]},    # enriched
    "review_required": False,                          # not flagged for review
    "proposed_conflict_detected": {"$ne": True},       # no unresolved conflicts
    "mapping_confidence": {"$in": ["high", "medium"]}, # not low/weak confidence
    "division_canonical": {"$nin": ["_REVIEW", None, ""]},  # valid division
    "status": {"$ne": "draft"},                        # not draft
}

# All divisions with production-eligible products (dynamically populated)
ALL_DIVISION_META = {
    "Trauma": {"slug": "trauma", "icon": "bone", "color": "amber"},
    "Cardiovascular": {"slug": "cardiovascular", "icon": "heart-pulse", "color": "rose"},
    "Diagnostics": {"slug": "diagnostics", "icon": "microscope", "color": "violet"},
    "Joint Replacement": {"slug": "joint-replacement", "icon": "activity", "color": "teal"},
    "Endo Surgery": {"slug": "endo-surgery", "icon": "scissors", "color": "blue"},
    "Infection Prevention": {"slug": "infection-prevention", "icon": "shield", "color": "green"},
    "ENT": {"slug": "ent", "icon": "ear-off", "color": "orange"},
    "Instruments": {"slug": "instruments", "icon": "wrench", "color": "slate"},
    "Sports Medicine": {"slug": "sports-medicine", "icon": "dumbbell", "color": "emerald"},
    "Urology": {"slug": "urology", "icon": "droplets", "color": "cyan"},
    "Critical Care": {"slug": "critical-care", "icon": "heart", "color": "red"},
    "Peripheral Intervention": {"slug": "peripheral-intervention", "icon": "git-branch", "color": "purple"},
    "Robotics": {"slug": "robotics", "icon": "cpu", "color": "indigo"},
    "Spine": {"slug": "spine", "icon": "align-vertical-distribute-center", "color": "yellow"},
}

# Backward compat aliases
PILOT_FILTER = LIVE_FILTER
DIVISION_META = ALL_DIVISION_META
PILOT_DIVISIONS = list(ALL_DIVISION_META.keys())

SLUG_TO_DIVISION = {v["slug"]: k for k, v in ALL_DIVISION_META.items()}

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
    """List all divisions with production-eligible products."""
    # Get all divisions that have at least 1 eligible product
    pipeline = [
        {"$match": LIVE_FILTER},
        {"$group": {"_id": "$division_canonical", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    div_counts = {r["_id"]: r["count"] async for r in catalog_products_col.aggregate(pipeline)}

    divisions = []
    for div, count in sorted(div_counts.items(), key=lambda x: -x[1]):
        if count == 0 or not div:
            continue
        meta = ALL_DIVISION_META.get(div, {})
        slug = meta.get("slug", div.lower().replace(" ", "-"))
        filt = {**LIVE_FILTER, "division_canonical": div}
        categories = await catalog_products_col.distinct("category", filt)
        brands = await catalog_products_col.distinct("brand", filt)
        divisions.append({
            "name": div,
            "slug": slug,
            "icon": meta.get("icon", "package"),
            "color": meta.get("color", "slate"),
            "product_count": count,
            "categories": sorted([c for c in categories if c]),
            "brands": sorted([b for b in brands if b]),
        })
    return {"divisions": divisions, "total_products": sum(div_counts.values())}


@router.get("/divisions/{slug}")
async def catalog_division_detail(slug: str):
    """Get single division info by slug."""
    div_name = SLUG_TO_DIVISION.get(slug)
    if not div_name:
        raise HTTPException(status_code=404, detail="Division not found")
    filt = {**LIVE_FILTER, "division_canonical": div_name}
    count = await catalog_products_col.count_documents(filt)
    categories = await catalog_products_col.distinct("category", filt)
    brands = await catalog_products_col.distinct("brand", filt)
    meta = ALL_DIVISION_META.get(div_name, {})
    return {
        "name": div_name,
        "slug": slug,
        "icon": meta.get("icon", "package"),
        "color": meta.get("color", "slate"),
        "product_count": count,
        "categories": sorted([c for c in categories if c]),
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
    """List catalog products with filters. Only production-eligible products."""
    filt = dict(LIVE_FILTER)
    if division:
        filt["division_canonical"] = division

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


fr_col = mongo_db["family_relationships"]

# ═══════════════════════════════════════════════════
# Relationship type → bucket + display label mapping
# ═══════════════════════════════════════════════════
RELATIONSHIP_BUCKET_MAP = {
    # Compatible Components bucket
    "uses_screw_family": ("compatible_components", "Compatible Screw"),
    "used_with_hip_system": ("compatible_components", "Compatible Component"),
    "used_with_ceramic_head": ("compatible_components", "Compatible Component"),
    # Same Family Alternatives bucket
    "coated_variant_of": ("same_family_alternatives", "Coated Variant"),
    "same_family_as": ("same_family_alternatives", "Same Family Alternative"),
    # Related System Products bucket (fallback)
    "belongs_to_system": ("related_system_products", "Related System Product"),
}

# Reverse relationships (target sees source with these labels)
REVERSE_LABEL_MAP = {
    "coated_variant_of": ("same_family_alternatives", "Coated Variant Available"),
    "uses_screw_family": ("compatible_components", "Used With Plate/Nail System"),
    "used_with_hip_system": ("compatible_components", "Compatible Component"),
    "used_with_ceramic_head": ("compatible_components", "Compatible Component"),
}

MIN_CONFIDENCE = 0.85  # Only high-confidence relationships


def _product_card(doc):
    """Minimal product card for related products list."""
    return {
        "slug": doc.get("slug", ""),
        "product_name_display": doc.get("product_name_display", ""),
        "clinical_subtitle": doc.get("clinical_subtitle", ""),
        "category": doc.get("category_canonical", ""),
        "brand": doc.get("brand", ""),
        "division": doc.get("division_canonical", ""),
        "sku_count": doc.get("shadow_sku_count", 0),
    }


@router.get("/products/{slug}/related")
async def get_related_products(slug: str):
    """
    Get related products for a given product, organized into 3 buckets:
    1. Compatible Components (screws, bolts, accessories)
    2. Same Family Alternatives (coated/stainless variants, same family different anatomy)
    3. Related System Products (same implant class, same division system)
    
    Only returns results for products with high semantic confidence.
    """
    product = await catalog_products_col.find_one(
        {"slug": slug, "status": {"$ne": "draft"}},
        {"_id": 0}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    brand_system = product.get("semantic_brand_system")
    confidence = product.get("semantic_confidence", 0) or 0

    # Only return related products for high-confidence enriched products
    if not brand_system or confidence < MIN_CONFIDENCE:
        return {"compatible_components": [], "same_family_alternatives": [], "related_system_products": []}

    division = product.get("division_canonical", "")
    category = product.get("category_canonical", "")
    product_slug = product.get("slug", "")

    buckets = {
        "compatible_components": [],
        "same_family_alternatives": [],
        "related_system_products": [],
    }
    seen_slugs = {product_slug}  # Avoid self-reference

    # ── Step 1: Brand-level relationships (forward direction) ──
    forward_rels = await fr_col.find({
        "source_entity_code": brand_system,
        "confidence": {"$gte": MIN_CONFIDENCE},
        "status": "active",
    }, {"_id": 0}).to_list(50)

    for rel in forward_rels:
        rel_type = rel.get("relationship_type", "")
        target_code = rel.get("target_entity_code", "")
        target_type = rel.get("target_entity_type", "")

        if rel_type not in RELATIONSHIP_BUCKET_MAP:
            continue
        if target_type != "brand_system":
            continue

        bucket_key, label = RELATIONSHIP_BUCKET_MAP[rel_type]

        # Find products with this target brand (must also pass PILOT_FILTER to be accessible)
        related_docs = await catalog_products_col.find({
            **PILOT_FILTER,
            "semantic_brand_system": target_code,
            "division_canonical": division,
            "semantic_confidence": {"$gte": MIN_CONFIDENCE},
        }, {"_id": 0, "slug": 1, "product_name_display": 1, "clinical_subtitle": 1,
            "category_canonical": 1, "brand": 1, "division_canonical": 1, "shadow_sku_count": 1}
        ).sort("product_name_display", 1).to_list(10)

        for doc in related_docs:
            s = doc.get("slug", "")
            if s in seen_slugs:
                continue
            seen_slugs.add(s)
            card = _product_card(doc)
            card["relationship_label"] = label
            buckets[bucket_key].append(card)

    # ── Step 2: Reverse relationships (this product's brand is the target) ──
    reverse_rels = await fr_col.find({
        "target_entity_code": brand_system,
        "target_entity_type": "brand_system",
        "confidence": {"$gte": MIN_CONFIDENCE},
        "status": "active",
    }, {"_id": 0}).to_list(50)

    for rel in reverse_rels:
        rel_type = rel.get("relationship_type", "")
        source_code = rel.get("source_entity_code", "")

        if rel_type not in REVERSE_LABEL_MAP:
            continue

        bucket_key, label = REVERSE_LABEL_MAP[rel_type]

        related_docs = await catalog_products_col.find({
            **PILOT_FILTER,
            "semantic_brand_system": source_code,
            "division_canonical": division,
            "semantic_confidence": {"$gte": MIN_CONFIDENCE},
        }, {"_id": 0, "slug": 1, "product_name_display": 1, "clinical_subtitle": 1,
            "category_canonical": 1, "brand": 1, "division_canonical": 1, "shadow_sku_count": 1}
        ).sort("product_name_display", 1).to_list(10)

        for doc in related_docs:
            s = doc.get("slug", "")
            if s in seen_slugs:
                continue
            seen_slugs.add(s)
            card = _product_card(doc)
            card["relationship_label"] = label
            buckets[bucket_key].append(card)

    # ── Step 3: Same category, different brand (Same Family Alternatives) ──
    if category:
        same_cat_docs = await catalog_products_col.find({
            **PILOT_FILTER,
            "division_canonical": division,
            "category_canonical": category,
            "semantic_brand_system": {"$ne": brand_system, "$exists": True},
            "semantic_confidence": {"$gte": MIN_CONFIDENCE},
        }, {"_id": 0, "slug": 1, "product_name_display": 1, "clinical_subtitle": 1,
            "category_canonical": 1, "brand": 1, "division_canonical": 1, "shadow_sku_count": 1}
        ).sort("product_name_display", 1).to_list(8)

        for doc in same_cat_docs:
            s = doc.get("slug", "")
            if s in seen_slugs:
                continue
            seen_slugs.add(s)
            card = _product_card(doc)
            # Determine specific label based on material difference
            if product.get("semantic_material_default") and doc.get("brand"):
                card["relationship_label"] = "Alternative System"
            else:
                card["relationship_label"] = "Same Category"
            buckets["same_family_alternatives"].append(card)

    return buckets


# ═══════════════════════════════════════════════════
# PHASE 5D: PRODUCT COMPARISON
# ═══════════════════════════════════════════════════

from pydantic import BaseModel
from typing import List


class CompareRequest(BaseModel):
    slugs: List[str]  # 2-4 product slugs


COMPARISON_FIELDS = [
    ("Division", "division_canonical"),
    ("Category", "category_canonical"),
    ("Brand System", "semantic_brand_system"),
    ("Material", "semantic_material_default"),
    ("Coating", "semantic_coating_default"),
    ("System Type", "semantic_system_type"),
    ("Implant Class", "semantic_implant_class"),
]


def _format_value(val):
    """Format snake_case values for display."""
    if not val or val == "—":
        return val
    if "_" in val:
        return val.replace("_", " ").title()
    # Also title-case pure lowercase multi-word values
    if val == val.lower() and len(val) > 2:
        return val.title()
    return val


def _comparison_card(doc):
    """Full comparison card for a product."""
    specs = doc.get("technical_specifications", {}) or {}
    
    # Build specs list from both structured and shadow data
    spec_rows = {}
    for k, v in specs.items():
        if v and str(v).strip():
            label = k.replace("_", " ").title()
            spec_rows[label] = str(v)
    
    # Also include shadow specs
    shadow_specs = doc.get("technical_specifications_shadow", {}) or {}
    for k, v in shadow_specs.items():
        if v and str(v).strip():
            label = k.replace("_", " ").title()
            if label not in spec_rows:
                spec_rows[label] = str(v)
    
    return {
        "slug": doc.get("slug", ""),
        "product_name_display": doc.get("product_name_display", ""),
        "clinical_subtitle": doc.get("clinical_subtitle", ""),
        "description": doc.get("description", "") or doc.get("description_shadow", ""),
        "division": doc.get("division_canonical", ""),
        "category": doc.get("category_canonical", ""),
        "brand": doc.get("brand", ""),
        "brand_system": doc.get("semantic_brand_system", ""),
        "material": doc.get("semantic_material_default", "") or doc.get("material_canonical", ""),
        "coating": doc.get("semantic_coating_default", ""),
        "system_type": _format_value(doc.get("semantic_system_type", "")),
        "implant_class": _format_value(doc.get("semantic_implant_class", "")),
        "anatomy_scope": doc.get("semantic_anatomy_scope", []),
        "sku_count": doc.get("shadow_sku_count", 0),
        "manufacturer": doc.get("manufacturer", ""),
        "pack_size": doc.get("pack_size", ""),
        "brochure_url": doc.get("brochure_url", ""),
        "specs": spec_rows,
    }


@router.post("/compare")
async def compare_products(req: CompareRequest):
    """
    Compare 2-4 products side by side.
    
    Guardrails:
    - Only compares products from the same division
    - Only compares pilot-filter products
    - Rejects unresolved shared-SKU pools (status=merged)
    - Returns structured comparison with clinical alignment
    """
    slugs = req.slugs
    if len(slugs) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 products to compare")
    if len(slugs) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 products can be compared")
    
    # Fetch all products
    products = []
    for slug in slugs:
        doc = await catalog_products_col.find_one(
            {"slug": slug, **PILOT_FILTER},
            {"_id": 0}
        )
        if not doc:
            raise HTTPException(status_code=404, detail=f"Product not found: {slug}")
        products.append(doc)
    
    # Guardrail: same division
    divisions = set(p.get("division_canonical", "") for p in products)
    if len(divisions) > 1:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot compare products from different divisions: {', '.join(divisions)}"
        )
    
    # ── Clinical-level guardrail ──
    # Products must be at the same clinical level (plate vs plate, not plate vs screw)
    impl_classes = set(p.get("semantic_implant_class") or "" for p in products)
    sys_types = set(p.get("semantic_system_type") or "" for p in products)
    categories = set(p.get("category_canonical") or "" for p in products)
    
    # Remove empties for comparison
    impl_classes_real = impl_classes - {"", None}
    sys_types_real = sys_types - {"", None}
    categories_real = categories - {"", None}
    
    # Determine comparison basis and confidence
    comparison_basis = "unknown"
    comparison_confidence = "low"
    guardrail_reasons = []
    
    if len(impl_classes_real) == 1 and len(impl_classes_real) > 0:
        # Same implant class (plate vs plate, stent vs stent)
        comparison_basis = "same_clinical_class"
        comparison_confidence = "high"
        guardrail_reasons.append(f"Same implant class: {list(impl_classes_real)[0]}")
    elif len(sys_types_real) == 1 and len(sys_types_real) > 0:
        # Same system type (nail_system vs nail_system)
        comparison_basis = "same_system_type"
        comparison_confidence = "high"
        guardrail_reasons.append(f"Same system type: {list(sys_types_real)[0]}")
    elif len(categories_real) == 1 and len(categories_real) > 0:
        # Same category (fallback for unenriched products)
        comparison_basis = "same_category"
        comparison_confidence = "medium"
        guardrail_reasons.append(f"Same category: {list(categories_real)[0]}")
    elif len(impl_classes_real) > 1:
        # Different implant classes — block comparison
        raise HTTPException(
            status_code=400,
            detail=f"Cannot compare different clinical classes: {', '.join(_format_value(c) for c in impl_classes_real)}. Compare products of the same type (e.g., plate vs plate, stent vs stent)."
        )
    elif len(sys_types_real) > 1:
        # Different system types — block
        raise HTTPException(
            status_code=400,
            detail=f"Cannot compare different system types: {', '.join(_format_value(t) for t in sys_types_real)}. Compare products of the same clinical family."
        )
    else:
        # No semantic data — allow with low confidence
        comparison_basis = "same_division_only"
        comparison_confidence = "low"
        guardrail_reasons.append("No semantic classification — limited comparison")
    
    # Check for related brand systems (adds confidence)
    brand_systems = set(p.get("semantic_brand_system") or "" for p in products) - {"", None}
    if len(brand_systems) > 1:
        # Check if brands are related
        for bs in brand_systems:
            rel = await fr_col.find_one({
                "$or": [
                    {"source_entity_code": bs, "target_entity_code": {"$in": list(brand_systems - {bs})}},
                    {"target_entity_code": bs, "source_entity_code": {"$in": list(brand_systems - {bs})}},
                ],
                "status": "active",
            })
            if rel:
                guardrail_reasons.append(f"Related brand systems: {rel.get('relationship_type', '').replace('_', ' ')}")
                if comparison_confidence == "medium":
                    comparison_confidence = "high"
                break
    
    # Build comparison cards
    cards = [_comparison_card(p) for p in products]
    
    # Build comparison rows — collect all unique spec keys across products
    all_spec_keys = set()
    for card in cards:
        all_spec_keys.update(card["specs"].keys())
    
    # Build structured comparison attributes
    comparison_attrs = []
    for label, field in COMPARISON_FIELDS:
        values = [_format_value(card.get(field.replace("semantic_", "").replace("_canonical", ""), "") or "—") for card in cards]
        if any(v != "—" for v in values):
            is_different = len(set(v for v in values if v != "—")) > 1
            comparison_attrs.append({
                "label": label,
                "values": values,
                "is_different": is_different,
            })
    
    # Add spec rows
    for key in sorted(all_spec_keys):
        values = [card["specs"].get(key, "—") for card in cards]
        if any(v != "—" for v in values):
            is_different = len(set(v for v in values if v != "—")) > 1
            comparison_attrs.append({
                "label": key,
                "values": values,
                "is_different": is_different,
            })
    
    # Add computed rows
    sku_values = [str(card["sku_count"]) for card in cards]
    comparison_attrs.append({
        "label": "Available Variants (SKUs)",
        "values": sku_values,
        "is_different": len(set(sku_values)) > 1,
    })
    
    anatomy_values = [", ".join(card["anatomy_scope"]) if card["anatomy_scope"] else "—" for card in cards]
    if any(v != "—" for v in anatomy_values):
        comparison_attrs.append({
            "label": "Anatomy Scope",
            "values": anatomy_values,
            "is_different": len(set(v for v in anatomy_values if v != "—")) > 1,
        })
    
    return {
        "products": cards,
        "comparison": comparison_attrs,
        "division": list(divisions)[0],
        "comparison_basis": comparison_basis,
        "comparison_confidence": comparison_confidence,
        "comparison_guardrail_reason": " + ".join(guardrail_reasons),
    }


@router.get("/compare/suggestions/{slug}")
async def get_comparison_suggestions(slug: str):
    """
    Suggest products that can be meaningfully compared with the given product.
    Uses: same category, related products, same division.
    """
    product = await catalog_products_col.find_one(
        {"slug": slug, **PILOT_FILTER},
        {"_id": 0}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    division = product.get("division_canonical", "")
    category = product.get("category_canonical", "")
    brand_system = product.get("semantic_brand_system", "")
    implant_class = product.get("semantic_implant_class", "")
    system_type = product.get("semantic_system_type", "")
    
    suggestions = []
    seen = {slug}
    
    # Clinical-level filter: only suggest same implant class or system type
    clinical_filter = {}
    if implant_class:
        clinical_filter["semantic_implant_class"] = implant_class
    elif system_type:
        clinical_filter["semantic_system_type"] = system_type
    
    # Priority 1: Same implant class + same division (clinical alternatives)
    if clinical_filter:
        same_class = await catalog_products_col.find({
            **PILOT_FILTER,
            **clinical_filter,
            "division_canonical": division,
            "slug": {"$ne": slug},
        }, {"_id": 0, "slug": 1, "product_name_display": 1, "clinical_subtitle": 1,
            "category_canonical": 1, "brand": 1, "semantic_material_default": 1}
        ).sort("product_name_display", 1).to_list(10)
        
        for doc in same_class:
            s = doc.get("slug", "")
            if s not in seen:
                seen.add(s)
                suggestions.append({
                    **_product_card(doc),
                    "comparison_reason": "Same Clinical Family",
                })
    
    # Priority 2: Same category (fallback for unenriched products)
    if category:
        same_cat = await catalog_products_col.find({
            **PILOT_FILTER,
            "division_canonical": division,
            "category_canonical": category,
            "slug": {"$ne": slug},
        }, {"_id": 0, "slug": 1, "product_name_display": 1, "clinical_subtitle": 1,
            "category_canonical": 1, "brand": 1, "semantic_material_default": 1}
        ).sort("product_name_display", 1).to_list(10)
        
        for doc in same_cat:
            s = doc.get("slug", "")
            if s not in seen:
                seen.add(s)
                suggestions.append({
                    **_product_card(doc),
                    "comparison_reason": "Same clinical category",
                })
    
    # Priority 2: Related products (coated/uncoated variants)
    if brand_system:
        # Forward relationships
        fwd_rels = await fr_col.find({
            "source_entity_code": brand_system,
            "confidence": {"$gte": MIN_CONFIDENCE},
            "status": "active",
        }, {"_id": 0}).to_list(20)
        
        for rel in fwd_rels:
            target = rel.get("target_entity_code", "")
            target_type = rel.get("target_entity_type", "")
            if target_type != "brand_system":
                continue
            
            rel_docs = await catalog_products_col.find({
                **PILOT_FILTER,
                "semantic_brand_system": target,
                "division_canonical": division,
            }, {"_id": 0, "slug": 1, "product_name_display": 1, "clinical_subtitle": 1,
                "category_canonical": 1, "brand": 1, "semantic_material_default": 1}
            ).to_list(5)
            
            for doc in rel_docs:
                s = doc.get("slug", "")
                if s not in seen:
                    seen.add(s)
                    suggestions.append({
                        **_product_card(doc),
                        "comparison_reason": rel.get("relationship_type", "").replace("_", " ").title(),
                    })
        
        # Reverse relationships
        rev_rels = await fr_col.find({
            "target_entity_code": brand_system,
            "target_entity_type": "brand_system",
            "confidence": {"$gte": MIN_CONFIDENCE},
            "status": "active",
        }, {"_id": 0}).to_list(20)
        
        for rel in rev_rels:
            source = rel.get("source_entity_code", "")
            rel_docs = await catalog_products_col.find({
                **PILOT_FILTER,
                "semantic_brand_system": source,
                "division_canonical": division,
            }, {"_id": 0, "slug": 1, "product_name_display": 1, "clinical_subtitle": 1,
                "category_canonical": 1, "brand": 1, "semantic_material_default": 1}
            ).to_list(5)
            
            for doc in rel_docs:
                s = doc.get("slug", "")
                if s not in seen:
                    seen.add(s)
                    suggestions.append({
                        **_product_card(doc),
                        "comparison_reason": rel.get("relationship_type", "").replace("_", " ").title(),
                    })
    
    return {"suggestions": suggestions[:12]}
