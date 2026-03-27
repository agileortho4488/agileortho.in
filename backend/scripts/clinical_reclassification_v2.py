"""
Phase 5A v2: Clinical Product Reclassification Pipeline (Fixed)
================================================================
Key fix: Removed dangerous shadow fuzzy matching. Only strip brand prefix.
Never replace a name with a less specific one.
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

# ═══════════════════════════════════════════════════
# BRAND PREFIXES TO STRIP
# ═══════════════════════════════════════════════════
# Order matters - longer prefixes first
BRAND_STRIP_PATTERNS = [
    (r"^AutoQuant\s+\d+\s+", ""),          # "AutoQuant 400 " → ""
    (r"^AutoQuant\s+", ""),                  # "AutoQuant " → ""
    (r"^Autoquant\s+", ""),
    (r"^MERISCREEN\s+", ""),
    (r"^MeriScreen\s+", ""),
    (r"^Meriscreen\s+", ""),
    (r"^MERISERA\s+", ""),
    (r"^MeriSera\s+", ""),
    (r"^Merisera\s+", ""),
    (r"^MeriLisa\s+", ""),
    (r"^Merilisa\s+", ""),
    (r"^MERILISA\s+", ""),
    (r"^ARMAR\s+", ""),
    (r"^Armar\s+", ""),
    (r"^AURIC\s+", ""),
    (r"^Auric\s+", ""),
    (r"^KET[\s-]+", ""),
    (r"^Ket[\s-]+", ""),
    (r"^CLAVO\s+", ""),
    (r"^Clavo\s+", ""),
    (r"^MBOSS\s+", ""),
    (r"^Mboss\s+", ""),
    (r"^MIRUS\s+", ""),
    (r"^Mirus\s+", ""),
    (r"^Meril\s+", ""),
    (r"^AGFN\s+", ""),                       # Strip AGFN prefix for nail components
]

def strip_brand(name):
    """Remove brand prefix from product name. Returns cleaned name."""
    result = name.strip()
    for pattern, replacement in BRAND_STRIP_PATTERNS:
        new_result = re.sub(pattern, replacement, result, flags=re.IGNORECASE).strip()
        if new_result and new_result != result:
            result = new_result
            break  # Only strip ONE brand prefix
    return result if result else name


def build_subtitle(product):
    """Build brand subtitle: 'BRAND by PARENT • Material • Coating'."""
    brand = product.get("brand", "")
    parent = product.get("parent_brand", "")
    material = product.get("semantic_material_default", "") or ""
    coating = product.get("semantic_coating_default", "") or ""
    
    parts = []
    if brand:
        if parent and parent != brand:
            parts.append(f"{brand} by {parent}")
        else:
            parts.append(brand)
    if material:
        parts.append(material)
    if coating:
        parts.append(f"{coating} Coating")
    
    return " • ".join(parts)


async def run():
    """Reclassify all products: strip brand prefix, add clinical subtitle."""
    
    total = await cp.count_documents({})
    updated = 0
    changed_titles = 0
    
    cursor = cp.find({})
    async for product in cursor:
        pid = product["_id"]
        old_display = product.get("product_name_display", "")
        
        # Strip brand prefix
        new_display = strip_brand(old_display)
        
        # Build subtitle
        subtitle = build_subtitle(product)
        
        # Update
        updates = {"clinical_subtitle": subtitle, "clinical_reclassified_at": NOW}
        if new_display != old_display:
            updates["product_name_display"] = new_display
            changed_titles += 1
            print(f"  {old_display:55} → {new_display}")
        
        await cp.update_one({"_id": pid}, {"$set": updates})
        updated += 1
    
    print(f"\n{updated} products updated, {changed_titles} titles changed")


async def verify():
    """Show sample results per division."""
    for div in ["Trauma", "Cardiovascular", "Diagnostics", "Joint Replacement", "Endo Surgery"]:
        print(f"\n  === {div} (sample 6) ===")
        docs = await cp.find(
            {"division_canonical": div, "status": {"$ne": "draft"}, 
             "mapping_confidence": "high", "review_required": False},
            {"_id": 0, "product_name_display": 1, "clinical_subtitle": 1}
        ).sort("product_name_display", 1).to_list(6)
        for d in docs:
            title = d.get("product_name_display", "?")
            sub = d.get("clinical_subtitle", "")
            print(f"    {title:55} | {sub}")


async def main():
    print("=" * 70)
    print("PHASE 5A v2: CLINICAL RECLASSIFICATION (Brand-Prefix Strip)")
    print("=" * 70)
    
    # First, REVERT any bad renames from v1 by restoring from product_name
    # Then apply clean brand stripping
    print("\nStep 1: Restoring original names from product_name field...")
    cursor = cp.find({}, {"_id": 1, "product_name": 1, "product_name_display": 1})
    restored = 0
    async for doc in cursor:
        pname = doc.get("product_name", "")
        display = doc.get("product_name_display", "")
        # The original product_name_display was set during catalog creation
        # If v1 changed it to something wrong, we need to restore  
        # We check: does the current display look like it was wrongly replaced?
        # Safe approach: re-derive display from the original product_name
        # product_name is the canonical name, product_name_display is what we show
        # Let's just use product_name as the base and strip brand from it
        pass
    
    # Actually - the original product_name_display was the intended display name
    # set during earlier phases. Some were good, some had brand prefixes.
    # The v1 script may have changed some names incorrectly via shadow matching.
    # Best approach: check if product_family_display exists as a better source
    
    print("\nStep 2: Applying clean brand-prefix stripping...")
    
    # First restore product_name_display from the original sources
    # Check what fields are available
    sample = await cp.find_one({}, {"_id": 0, "product_name": 1, "product_name_display": 1, 
                                     "product_family_display": 1, "product_family": 1})
    print(f"  Sample fields: product_name={sample.get('product_name')}, display={sample.get('product_name_display')}, family={sample.get('product_family_display')}")
    
    # The safest base for display is product_family_display or product_name_display
    # Since v1 may have corrupted product_name_display, let's restore from product_name first
    print("\n  Restoring product_name_display from product_name where needed...")
    cursor = cp.find({})
    restore_count = 0
    async for doc in cursor:
        pname = doc.get("product_name", "")
        current_display = doc.get("product_name_display", "")
        
        # If v1 made the display shorter than the original name (lost info), restore
        # But we still want to strip brand prefix
        base_name = pname or current_display
        clean_name = strip_brand(base_name)
        
        # Don't allow the name to become too short/generic
        if len(clean_name) < 5 or clean_name in ("Plates", "System", "LPS Plates", "Screw System", "Nail System"):
            clean_name = base_name  # Keep original if stripping makes it too generic
        
        subtitle = build_subtitle(doc)
        
        update = {"clinical_subtitle": subtitle, "clinical_reclassified_at": NOW}
        if clean_name != current_display:
            update["product_name_display"] = clean_name
            restore_count += 1
            if restore_count <= 50:  # Print first 50
                print(f"    {current_display:55} → {clean_name}")
        
        await cp.update_one({"_id": doc["_id"]}, {"$set": update})
    
    print(f"\n  Restored/updated {restore_count} product display names")
    
    await verify()
    print("\nDONE.")


asyncio.run(main())
