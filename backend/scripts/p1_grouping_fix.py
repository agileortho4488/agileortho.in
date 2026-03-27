"""
Comprehensive Product Grouping Fix — Pilot Divisions
Fixes:
1. ARMAR Titanium Plates → rename to "ARMAR LPS Plating System (Titanium)" + flag for anatomy review
2. PFRN 4.9mm Locking Bolts → consolidate 27 individual-size pages into ONE product family page
3. Destiknee duplicate → hide one
4. Audit for other vague/overbroad product names in all pilot divisions
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
col = db["catalog_products"]
NOW = datetime.now(timezone.utc).isoformat()


async def fix_armar():
    """ARMAR Titanium Plates → more descriptive name."""
    result = await col.update_one(
        {"slug": "armar-titanium-plates"},
        {"$set": {
            "product_name_display": "ARMAR LPS Plating System (Titanium)",
            "description_live": "ARMAR LPS (Low Profile System) titanium plating system for trauma surgery. 16 plate variants. Requires anatomy-level classification.",
            "grouping_audit": {
                "status": "renamed_needs_anatomy",
                "original_display_name": "ARMAR Titanium Plates",
                "reason": "Brand+material heading only — no anatomy. Brochure source does not provide anatomy-level breakdown for individual SKUs.",
                "action": "Renamed to 'ARMAR LPS Plating System (Titanium)'. Flagged for manual anatomy classification when more detailed catalog data is available.",
                "audit_date": NOW,
            },
        }}
    )
    print(f"ARMAR: renamed, modified={result.modified_count}")


async def fix_pfrn_bolt_duplicates():
    """Consolidate 27 PFRN 4.9mm bolt-size pages into one product family page."""
    # Find all PFRN 4.9mm Locking Bolt pages
    pfrn_pages = await col.find(
        {
            "product_name_display": {"$regex": r"^PFRN Proximal Femoral.*4\.9mm Locking Bolt"},
            "mapping_confidence": "high",
            "review_required": False,
        },
        {"_id": 1, "slug": 1, "product_name_display": 1}
    ).sort("product_name_display", 1).to_list(50)

    if len(pfrn_pages) <= 1:
        print(f"PFRN bolts: only {len(pfrn_pages)} found, nothing to consolidate")
        return

    # Keep the first one as the canonical page, hide the rest
    canonical = pfrn_pages[0]
    duplicates = pfrn_pages[1:]

    # Rename the canonical page to the family name
    await col.update_one(
        {"_id": canonical["_id"]},
        {"$set": {
            "product_name_display": "PFRN 4.9mm Locking Bolt Self Tapping",
            "category": "Locking Bolts",
            "description_live": "PFRN 4.9mm locking bolt self tapping for proximal femoral rotational stability nail system. Available in lengths from 26mm to 100mm. Part of the Meril AGFN System.",
            "grouping_audit": {
                "status": "consolidated_from_size_pages",
                "original_display_name": canonical["product_name_display"],
                "reason": f"Live shop had {len(pfrn_pages)} individual size pages (26mm-100mm). All share the same 27 shadow SKUs. Consolidated into one product family page.",
                "action": "Renamed to family-level heading. Size-specific pages hidden.",
                "hidden_count": len(duplicates),
                "audit_date": NOW,
            },
        }}
    )
    print(f"PFRN bolts: kept canonical slug={canonical['slug'][:50]}")

    # Hide all duplicates
    dup_ids = [d["_id"] for d in duplicates]
    result = await col.update_many(
        {"_id": {"$in": dup_ids}},
        {"$set": {
            "review_required": True,
            "grouping_audit": {
                "status": "hidden_size_variant",
                "reason": "Individual size page consolidated into family page",
                "canonical_slug": canonical["slug"],
                "audit_date": NOW,
            },
        }}
    )
    print(f"PFRN bolts: hidden {result.modified_count} duplicate size pages")


async def fix_destiknee_duplicate():
    """Hide one of the two Destiknee duplicates."""
    dupes = await col.find(
        {"slug": "destiknee-total-knee-replacement-system",
         "mapping_confidence": "high", "review_required": False},
        {"_id": 1, "slug": 1}
    ).to_list(5)

    if len(dupes) <= 1:
        print(f"Destiknee: only {len(dupes)}, no action needed")
        return

    # Keep first, hide rest
    for d in dupes[1:]:
        await col.update_one(
            {"_id": d["_id"]},
            {"$set": {
                "review_required": True,
                "grouping_audit": {
                    "status": "hidden_duplicate",
                    "reason": "Duplicate of same product",
                    "audit_date": NOW,
                },
            }}
        )
    print(f"Destiknee: hidden {len(dupes) - 1} duplicates")


async def final_count():
    """Print final pilot product counts."""
    print("\n" + "=" * 60)
    print("FINAL PILOT PRODUCT COUNTS")
    print("=" * 60)
    for div in ["Trauma", "Cardiovascular", "Diagnostics", "Joint Replacement"]:
        count = await col.count_documents({
            "division_canonical": div,
            "mapping_confidence": "high",
            "review_required": False,
            "status": {"$ne": "draft"},
        })
        print(f"  {div}: {count} products")

    total = await col.count_documents({
        "mapping_confidence": "high",
        "review_required": False,
        "status": {"$ne": "draft"},
        "division_canonical": {"$in": ["Trauma", "Cardiovascular", "Diagnostics", "Joint Replacement"]},
    })
    print(f"  TOTAL: {total}")


async def main():
    print("=" * 60)
    print("COMPREHENSIVE PRODUCT GROUPING FIX")
    print("=" * 60)

    await fix_armar()
    await fix_pfrn_bolt_duplicates()
    await fix_destiknee_duplicate()
    await final_count()

    print("\nDONE.")

asyncio.run(main())
