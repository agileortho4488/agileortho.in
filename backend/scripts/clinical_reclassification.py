"""
Phase 5A: Clinical Product Reclassification Pipeline
=====================================================
Transforms product display names from brand-centric to clinical-centric.
Evidence order: brochure headings > shadow product names > SKU names > fallback rules.

Rules by division:
  Trauma/Ortho:  Anatomy + Implant Type + Size/System
  Cardiovascular: Device Type + Clinical Function + Platform  
  Diagnostics:   Test Type + Analyte/Assay
  Joint Replace:  Joint + Component Type + System
  Endo Surgery:  Device Type + Use Case

Brand becomes secondary context (subtitle), NOT the title.
"""
import asyncio
import os
import re
from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
import motor.motor_asyncio

client = motor.motor_asyncio.AsyncIOMotorClient(os.environ.get("MONGO_URL"))
db = client[os.environ.get("DB_NAME")]

NOW = datetime.now(timezone.utc)

cp = db["catalog_products"]
cs = db["catalog_skus"]
sp = db["shadow_products"]

# ═══════════════════════════════════════════════════
# BRAND PREFIXES TO STRIP FROM DISPLAY TITLES
# ═══════════════════════════════════════════════════
BRAND_PREFIXES = [
    r"^ARMAR\s+", r"^Armar\s+", r"^AURIC\s+", r"^Auric\s+",
    r"^KET[\s-]+", r"^Ket[\s-]+", r"^CLAVO\s+", r"^Clavo\s+",
    r"^MBOSS\s+", r"^Mboss\s+", r"^MIRUS\s+", r"^Mirus\s+",
    r"^Meril\s+", r"^MeriScreen\s+", r"^MeriSera\s+", r"^MeriLisa\s+",
    r"^AutoQuant\s+\d*\s*", r"^MERISCREEN\s+",
]

def strip_brand_prefix(name):
    """Remove brand prefixes from product name to get clinical name."""
    result = name
    for pattern in BRAND_PREFIXES:
        result = re.sub(pattern, "", result, flags=re.IGNORECASE).strip()
    # Also strip "Titanium" when it's just brand filler (e.g., "Titanium LPS Plates")
    # But keep it in proper context (e.g., "Titanium Elastic Nail")
    result = re.sub(r"^Titanium\s+(LPS\s+)?Plates?$", r"\1Plates", result).strip()
    return result if result else name


# ═══════════════════════════════════════════════════
# CLINICAL NAMING RULES BY DIVISION
# ═══════════════════════════════════════════════════

def classify_trauma_product(product, sku_names, shadow_names):
    """Derive clinical display title for trauma/ortho products."""
    name = product.get("product_name_display", "") or product.get("product_name", "")
    brand = product.get("brand", "")
    
    # Priority 1: If the name already has good anatomy+implant info, clean it
    clean = strip_brand_prefix(name)
    
    # Priority 2: Check shadow products for better clinical names
    if shadow_names:
        # Shadow product names from brochure extraction are usually clinical
        best_shadow = shadow_names[0]
        shadow_clean = strip_brand_prefix(best_shadow)
        if len(shadow_clean) > len(clean) and not shadow_clean.startswith(brand):
            clean = shadow_clean
    
    # Priority 3: Check if SKU names have more specific info
    if sku_names and len(sku_names) == 1:
        sku_clean = strip_brand_prefix(sku_names[0])
        if len(sku_clean) > len(clean):
            clean = sku_clean
    
    # Build subtitle: "BRAND by PARENT • Material"
    material = product.get("material_canonical", "") or product.get("semantic_material_default", "")
    coating = product.get("semantic_coating_default", "")
    parent = product.get("parent_brand", "")
    
    subtitle_parts = []
    if brand:
        if parent and parent != brand:
            subtitle_parts.append(f"{brand} by {parent}")
        else:
            subtitle_parts.append(brand)
    if material:
        subtitle_parts.append(material)
    if coating:
        subtitle_parts.append(coating)
    
    subtitle = " • ".join(subtitle_parts)
    
    return clean, subtitle


def classify_cardiovascular_product(product, sku_names, shadow_names):
    """CV products: Device Type + Clinical Function + Platform."""
    name = product.get("product_name_display", "") or product.get("product_name", "")
    # CV products already tend to have good clinical names
    clean = strip_brand_prefix(name)
    brand = product.get("brand", "")
    parent = product.get("parent_brand", "")
    
    subtitle_parts = []
    if brand:
        subtitle_parts.append(f"{brand} by {parent}" if parent and parent != brand else brand)
    material = product.get("material_canonical", "") or product.get("semantic_material_default", "")
    if material:
        subtitle_parts.append(material)
    
    return clean, " • ".join(subtitle_parts)


def classify_diagnostics_product(product, sku_names, shadow_names):
    """Diagnostics: Test Type + Analyte + Assay."""
    name = product.get("product_name_display", "") or product.get("product_name", "")
    brand = product.get("brand", "")
    
    # Strip brand prefix but keep reagent/test context
    clean = strip_brand_prefix(name)
    
    # For AutoQuant reagents, the name after stripping is already the analyte
    # e.g., "ALAT (GPT) Reagent", "Albumin Reagent"
    
    parent = product.get("parent_brand", "")
    subtitle_parts = []
    if brand:
        subtitle_parts.append(f"{brand} by {parent}" if parent and parent != brand else brand)
    
    # Add system type context
    sys_type = product.get("semantic_system_type", "")
    if sys_type == "diagnostic_line":
        subtitle_parts.append("Rapid Diagnostic Test")
    elif sys_type == "reagent_line":
        subtitle_parts.append("Laboratory Reagent")
    
    return clean, " • ".join(subtitle_parts)


def classify_joint_replacement_product(product, sku_names, shadow_names):
    """Joint Replacement: Joint + Component Type + System."""
    name = product.get("product_name_display", "") or product.get("product_name", "")
    clean = strip_brand_prefix(name)
    brand = product.get("brand", "")
    parent = product.get("parent_brand", "")
    
    subtitle_parts = []
    if brand:
        subtitle_parts.append(f"{brand} by {parent}" if parent and parent != brand else brand)
    material = product.get("material_canonical", "") or product.get("semantic_material_default", "")
    if material:
        subtitle_parts.append(material)
    
    return clean, " • ".join(subtitle_parts)


def classify_generic_product(product, sku_names, shadow_names):
    """Fallback for any other division."""
    name = product.get("product_name_display", "") or product.get("product_name", "")
    clean = strip_brand_prefix(name)
    brand = product.get("brand", "")
    parent = product.get("parent_brand", "")
    
    subtitle_parts = []
    if brand:
        subtitle_parts.append(f"{brand} by {parent}" if parent and parent != brand else brand)
    
    return clean, " • ".join(subtitle_parts)


CLASSIFIERS = {
    "Trauma": classify_trauma_product,
    "Cardiovascular": classify_cardiovascular_product,
    "Diagnostics": classify_diagnostics_product,
    "Joint Replacement": classify_joint_replacement_product,
}


# ═══════════════════════════════════════════════════
# MAIN PIPELINE
# ═══════════════════════════════════════════════════

async def run_reclassification():
    """Reclassify all catalog products with clinical display titles."""
    
    total = await cp.count_documents({})
    updated = 0
    unchanged = 0
    
    cursor = cp.find({})
    async for product in cursor:
        pid = product["_id"]
        pname = product.get("product_name", "")
        division = product.get("division_canonical", "")
        
        # Get SKU product names for this product
        skus = await cs.find(
            {"catalog_product_name": pname},
            {"_id": 0, "product_name": 1}
        ).to_list(500)
        sku_names = sorted(set(s.get("product_name", "") for s in skus if s.get("product_name")))
        
        # Get shadow product names (brochure-derived)
        shadow_docs = await sp.find(
            {"name": {"$regex": re.escape(pname[:20]), "$options": "i"}},
            {"_id": 0, "name": 1}
        ).to_list(5)
        shadow_names = [s.get("name", "") for s in shadow_docs if s.get("name")]
        
        # Classify
        classifier = CLASSIFIERS.get(division, classify_generic_product)
        clinical_title, clinical_subtitle = classifier(product, sku_names, shadow_names)
        
        # Only update if the title actually changed
        old_display = product.get("product_name_display", "")
        if clinical_title != old_display or not product.get("clinical_subtitle"):
            await cp.update_one({"_id": pid}, {"$set": {
                "product_name_display": clinical_title,
                "clinical_subtitle": clinical_subtitle,
                "clinical_reclassified_at": NOW,
            }})
            updated += 1
            if clinical_title != old_display:
                print(f"  [{division:20}] {old_display:55} → {clinical_title}")
        else:
            unchanged += 1
    
    print(f"\nReclassified: {updated}/{total} products updated, {unchanged} unchanged")


async def main():
    print("=" * 70)
    print("PHASE 5A: CLINICAL PRODUCT RECLASSIFICATION")
    print("=" * 70)
    
    await run_reclassification()
    
    # Verification: show sample products per division with new titles
    print("\n" + "=" * 70)
    print("VERIFICATION — Sample products per division")
    print("=" * 70)
    
    for div in ["Trauma", "Cardiovascular", "Diagnostics", "Joint Replacement"]:
        print(f"\n  === {div} ===")
        docs = await cp.find(
            {"division_canonical": div, "status": {"$ne": "draft"}, "mapping_confidence": "high", "review_required": False},
            {"_id": 0, "product_name_display": 1, "clinical_subtitle": 1, "brand": 1}
        ).sort("product_name_display", 1).to_list(8)
        for d in docs:
            print(f"    {d.get('product_name_display','?'):55} | {d.get('clinical_subtitle','')}")
    
    print("\nDONE.")


asyncio.run(main())
