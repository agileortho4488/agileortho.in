"""
Non-Pilot Shared-SKU Cleanup: ENT + Endo Surgery
=================================================
Fixes:
1. ENT: Merge laser duplicates, split Tracheal T-Tube SKU pool, fix Tracheostomy cross-brand
2. Endo Surgery: Split Hernia mesh, Endocutter+Reloads mix, Mericron XL sizes
3. Brand normalization across both divisions
"""
import asyncio, os, re
from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
import motor.motor_asyncio

client = motor.motor_asyncio.AsyncIOMotorClient(os.environ.get("MONGO_URL"))
db = client[os.environ.get("DB_NAME")]
products_col = db["catalog_products"]
skus_col = db["catalog_skus"]

NOW = datetime.now(timezone.utc).isoformat()


async def merge_products(keep_slug, remove_slug, reason):
    """Merge remove_slug into keep_slug, reassign SKUs."""
    keep = await products_col.find_one({"slug": keep_slug})
    remove = await products_col.find_one({"slug": remove_slug})
    if not keep or not remove:
        print(f"  SKIP merge {keep_slug} <- {remove_slug}: product not found")
        return

    # Reassign SKUs from remove to keep
    if remove.get("shadow_product_id") and keep.get("shadow_product_id"):
        result = await skus_col.update_many(
            {"product_id_shadow": remove["shadow_product_id"]},
            {"$set": {"product_id_shadow": keep["shadow_product_id"]}},
        )
        print(f"  Reassigned {result.modified_count} SKUs from {remove_slug} to {keep_slug}")

    # Delete the duplicate
    await products_col.delete_one({"_id": remove["_id"]})
    print(f"  Merged: {remove_slug} -> {keep_slug} ({reason})")


async def split_skus_by_pattern(shadow_id, sku_rules):
    """Split a shared SKU pool by matching SKU codes to product slugs.
    sku_rules: list of (slug, pattern_fn) where pattern_fn(sku_code) -> bool
    """
    # Get all SKUs in the pool
    skus = await skus_col.find({"product_id_shadow": shadow_id}).to_list(100)
    if not skus:
        print(f"  No SKUs for shadow_id {shadow_id}")
        return

    # Get new shadow_product_ids for each target product
    product_shadows = {}
    for slug, _ in sku_rules:
        p = await products_col.find_one({"slug": slug})
        if p:
            product_shadows[slug] = p.get("shadow_product_id", "")

    assigned = 0
    for sku in skus:
        code = sku.get("sku_code", "")
        for slug, pattern_fn in sku_rules:
            if pattern_fn(code) and slug in product_shadows:
                new_shadow = product_shadows[slug]
                if new_shadow and new_shadow != shadow_id:
                    await skus_col.update_one(
                        {"_id": sku["_id"]},
                        {"$set": {"product_id_shadow": new_shadow}},
                    )
                    assigned += 1
                break

    print(f"  Split {assigned} SKUs from shared pool {shadow_id}")


async def assign_unique_shadow_ids(slugs):
    """Give each product its own unique shadow_product_id if they share one."""
    import hashlib
    for slug in slugs:
        p = await products_col.find_one({"slug": slug})
        if not p:
            continue
        new_id = hashlib.md5(f"split_{slug}_{NOW}".encode()).hexdigest()[:16]
        await products_col.update_one(
            {"_id": p["_id"]},
            {"$set": {"shadow_product_id": new_id}},
        )
    print(f"  Assigned unique shadow_ids to {len(slugs)} products")


async def normalize_brands(division, rules):
    """Normalize brand names within a division.
    rules: dict of {pattern: canonical_brand}
    """
    for pattern, canonical in rules.items():
        result = await products_col.update_many(
            {
                "division_canonical": division,
                "brand": {"$regex": pattern, "$options": "i"},
            },
            {"$set": {"brand": canonical}},
        )
        if result.modified_count:
            print(f"  Brand: '{pattern}' -> '{canonical}' ({result.modified_count} products)")


async def fix_ent():
    """Fix ENT division shared-SKU issues."""
    print("\n=== ENT CLEANUP ===")

    # 1. Merge laser duplicates
    print("\n1. Merge laser duplicates:")
    await merge_products("mesic-ent-diode-laser", "mesic-ent-laser", "duplicate laser product")

    # 2. Tracheal T-Tube: 7 products share 20 SKUs
    # SKU pattern: ALT{size}{length} -> ALT0860 = 8mm x 60mm, ALT1060 = 10mm x 60mm
    print("\n2. Split Tracheal T-Tube SKU pool:")
    # First, give each size variant its own shadow_id
    tracheal_sizes = [
        "tracheal-t-tube-8x80mm",
        "tracheal-t-tube-10x60mm",
        "tracheal-t-tube-10x80mm",
        "tracheal-t-tube-12x80mm",
        "tracheal-t-tube-14x80mm",
    ]
    await assign_unique_shadow_ids(tracheal_sizes)

    # Assign SKUs based on code pattern
    size_map = {
        "08": "tracheal-t-tube-8x80mm",
        "10": None,  # handled below
        "12": "tracheal-t-tube-12x80mm",
        "14": "tracheal-t-tube-14x80mm",
    }

    # Get the shared pool SKUs
    parent = await products_col.find_one({"slug": "tracheal-t-tube"})
    if parent:
        shared_sid = parent.get("shadow_product_id", "")
        skus = await skus_col.find({"product_id_shadow": shared_sid}).to_list(50)
        for sku in skus:
            code = sku.get("sku_code", "")
            # Parse ALT{diameter}{length}
            m = re.match(r"ALT(\d{2})(\d{2})", code)
            if m:
                diameter = m.group(1)
                length = m.group(2)
                # Map 10mm: 60mm->tracheal-t-tube-10x60mm, 80mm->tracheal-t-tube-10x80mm
                if diameter == "10":
                    if length == "60":
                        target_slug = "tracheal-t-tube-10x60mm"
                    else:
                        target_slug = "tracheal-t-tube-10x80mm"
                else:
                    target_slug = size_map.get(diameter)

                if target_slug:
                    target = await products_col.find_one({"slug": target_slug})
                    if target and target.get("shadow_product_id"):
                        await skus_col.update_one(
                            {"_id": sku["_id"]},
                            {"$set": {"product_id_shadow": target["shadow_product_id"]}},
                        )

        # Keep parent (tracheal-t-tube) as the family overview page
        # Also merge alrine-tracheal-t-tube into the parent
        await merge_products("tracheal-t-tube", "alrine-tracheal-t-tube", "duplicate family page")

    print("  Tracheal T-Tube SKU pool split by size")

    # 3. Tracheostomy cross-brand: fix brand names (mukic->MAFIC) and split cuffed/uncuffed
    print("\n3. Fix Tracheostomy brand + split cuffed/uncuffed:")
    # Fix brand on mukic slugs (they're actually MAFIC products)
    await products_col.update_many(
        {"slug": {"$regex": "^mukic-tracheostomy"}},
        {"$set": {"brand": "MAFIC"}},
    )
    # Split SKUs: C suffix = cuffed, no C = uncuffed
    trach_parent = await products_col.find_one({"slug": "mukic-tracheostomy-tube-cuffed"})
    if trach_parent:
        trach_sid = trach_parent.get("shadow_product_id", "")
        # Give uncuffed and mafic their own shadow_ids
        await assign_unique_shadow_ids(["mukic-tracheostomy-tube-uncuffed", "mafic-tracheostomy-tube"])
        # Get uncuffed product for SKU reassignment
        uncuffed = await products_col.find_one({"slug": "mukic-tracheostomy-tube-uncuffed"})
        mafic = await products_col.find_one({"slug": "mafic-tracheostomy-tube"})

        skus = await skus_col.find({"product_id_shadow": trach_sid}).to_list(50)
        for sku in skus:
            code = sku.get("sku_code", "")
            if code.endswith("C") and uncuffed:
                # Cuffed stays with parent (mukic-tracheostomy-tube-cuffed)
                pass
            elif not code.endswith("C") and uncuffed:
                await skus_col.update_one(
                    {"_id": sku["_id"]},
                    {"$set": {"product_id_shadow": uncuffed["shadow_product_id"]}},
                )

        # Merge mafic-tracheostomy-tube into cuffed (same product, different slug)
        await merge_products("mukic-tracheostomy-tube-cuffed", "mafic-tracheostomy-tube", "duplicate trach tube")

    print("  Tracheostomy cleanup complete")

    # 4. Brand normalization
    print("\n4. Brand normalization:")
    await normalize_brands("ENT", {
        r"^Mesire$": "MESIRE",
        r"^Mesic$": "MESIC",
    })


async def fix_endo_surgery():
    """Fix Endo Surgery division shared-SKU issues."""
    print("\n=== ENDO SURGERY CLEANUP ===")

    # 1. Hernia mesh: split merineum vs filaprop
    print("\n1. Split Hernia Mesh pool:")
    await assign_unique_shadow_ids(["merineum-hernia-mesh"])
    # Merineum gets PPM* SKUs (standard), Filaprop gets PPMS* (soft)
    mesh_parent = await products_col.find_one({"slug": "filaprop-mesh-soft-polypropylene-soft-mesh"})
    if mesh_parent:
        mesh_sid = mesh_parent.get("shadow_product_id", "")
        merineum = await products_col.find_one({"slug": "merineum-hernia-mesh"})
        if merineum:
            skus = await skus_col.find({"product_id_shadow": mesh_sid}).to_list(50)
            for sku in skus:
                code = sku.get("sku_code", "")
                # PPM (not PPMS) -> merineum; PPMS -> filaprop soft
                if code.startswith("PPM") and not code.startswith("PPMS"):
                    await skus_col.update_one(
                        {"_id": sku["_id"]},
                        {"$set": {"product_id_shadow": merineum["shadow_product_id"]}},
                    )
    print("  Hernia mesh SKUs split")

    # 2. Endocutter + Reloads: separate devices from reloads
    print("\n2. Split Endocutter devices from Reloads:")
    # Give each endocutter device its own shadow_id
    endocutter_devices = [
        "mirus-power-endocutter-60mm-small",
        "mirus-power-endocutter-60mm-medium",
        "mirus-power-endocutter-60mm-large",
    ]
    reload_products = [
        "power-endocutter-reload-60-25-white",
        "power-endocutter-reload-60-35-blue",
        "power-endocutter-reload-60-38-gold",
        "power-endocutter-reload-60-41-green",
        "power-endocutter-reload-60-44-black",
    ]
    await assign_unique_shadow_ids(endocutter_devices)

    # SKU pattern: MEC60-{size} = devices, MECR{color}-60{height} = reloads
    endo_parent = await products_col.find_one({"slug": "mirus-power-endocutter-60mm-small"})
    if endo_parent:
        shared_sid = "f738dcb61dfb5c04"  # known shared ID
        skus = await skus_col.find({"product_id_shadow": shared_sid}).to_list(50)

        device_map = {"MEC60-280": "small", "MEC60-340": "medium", "MEC60-440": "large"}
        reload_color_map = {"W": "white", "B": "blue", "GD": "gold", "G": "green", "T": "black"}

        for sku in skus:
            code = sku.get("sku_code", "")
            # Device SKUs
            if code in device_map:
                size = device_map[code]
                target_slug = f"mirus-power-endocutter-60mm-{size}"
                target = await products_col.find_one({"slug": target_slug})
                if target:
                    await skus_col.update_one(
                        {"_id": sku["_id"]},
                        {"$set": {"product_id_shadow": target["shadow_product_id"]}},
                    )
            # Reload SKUs
            elif code.startswith("MECR"):
                # Pattern: MECR{color}-60{height}
                m = re.match(r"MECR(\w+)-60(\d+)", code)
                if m:
                    color_code = m.group(1)
                    height = m.group(2)
                    # Map to reload product by height
                    height_map = {"25": "white", "35": "blue", "38": "gold", "41": "green", "44": "black"}
                    color_name = height_map.get(height, "")
                    if color_name:
                        target_slug = f"power-endocutter-reload-60-{height}-{color_name}"
                        target = await products_col.find_one({"slug": target_slug})
                        if target:
                            await skus_col.update_one(
                                {"_id": sku["_id"]},
                                {"$set": {"product_id_shadow": target.get("shadow_product_id", "")}},
                            )

    print("  Endocutter/Reloads SKUs split")

    # 3. Mericron XL: split by suture size
    print("\n3. Split Mericron XL by size:")
    await assign_unique_shadow_ids(["mericron-xl-non-absorbable-suture-size-5"])
    # These are generic ME-series codes — hard to split by pattern. Just separate the pool.
    print("  Mericron XL shadow_ids separated (SKUs need manual mapping)")

    # 4. Brand normalization
    print("\n4. Brand normalization:")
    await normalize_brands("Endo Surgery", {
        r"^MIRUS Power Endocutter System$": "MIRUS",
        r"^MIRUS Power Endocutter$": "MIRUS",
        r"^FILAPROP 3D Mesh$": "FILAPROP",
        r"^FILAPROP 3D$": "FILAPROP",
        r"^MERIGROW PP$": "MERIGROW",
        r"^Meril Endo Surgery$": "Meril",
    })

    # 5. Normalize MIRUS Endocutter family names
    print("\n5. Normalize Endocutter family names:")
    result = await products_col.update_many(
        {
            "division_canonical": "Endo Surgery",
            "product_family": {"$regex": "^POWER ENDOCUTTER RELOAD", "$options": "i"},
        },
        {"$set": {"product_family": "MIRUS Power Endocutter 60mm Reloads"}},
    )
    if result.modified_count:
        print(f"  Normalized {result.modified_count} family names")


async def main():
    print("=" * 60)
    print("NON-PILOT SHARED-SKU CLEANUP")
    print("=" * 60)

    await fix_ent()
    await fix_endo_surgery()

    # Final counts
    print("\n=== FINAL STATE ===")
    for div in ["ENT", "Endo Surgery"]:
        total = await products_col.count_documents({"division_canonical": div})
        shared = 0
        products = await products_col.find(
            {"division_canonical": div},
            {"_id": 0, "shadow_product_id": 1}
        ).to_list(500)
        seen = {}
        for p in products:
            sid = p.get("shadow_product_id", "")
            if sid:
                seen[sid] = seen.get(sid, 0) + 1
        shared = sum(1 for v in seen.values() if v > 1)
        print(f"  {div}: {total} products, {shared} remaining shared shadow_ids")


asyncio.run(main())
