"""Quick check of semantic enrichment results."""
import asyncio, os
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
import motor.motor_asyncio

client = motor.motor_asyncio.AsyncIOMotorClient(os.environ.get("MONGO_URL"))
db = client[os.environ.get("DB_NAME")]

async def check():
    cp = db["catalog_products"]

    # Check MBOSS
    mboss = await cp.find(
        {"brand": {"$regex": "MBOSS", "$options": "i"}},
        {"_id": 0, "brand": 1, "product_name": 1, "semantic_implant_class": 1}
    ).to_list(5)
    print("MBOSS products:", mboss)

    # Enrichment stats
    enriched = await cp.count_documents({"semantic_brand_system": {"$exists": True, "$ne": None}})
    total = await cp.count_documents({})
    print(f"\nEnriched: {enriched}/{total}")

    # All brands breakdown
    brands = await cp.distinct("brand")
    print(f"\nAll brands ({len(brands)}):")
    for b in sorted(brands):
        count = await cp.count_documents({"brand": b})
        has_sem = await cp.count_documents({"brand": b, "semantic_brand_system": {"$exists": True}})
        marker = "Y" if has_sem > 0 else "N"
        print(f"  [{marker}] {b} ({count} products, {has_sem} enriched)")

    # Sample enriched product
    sample = await cp.find_one(
        {"semantic_brand_system": {"$exists": True}},
        {"_id": 0, "product_name_display": 1, "brand": 1, "semantic_brand_system": 1, "semantic_system_type": 1, "semantic_material_default": 1, "semantic_coating_default": 1, "semantic_implant_class": 1}
    )
    print(f"\nSample enriched product: {sample}")

asyncio.run(check())
