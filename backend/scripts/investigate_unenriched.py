"""Investigate: which brands/product families still need classification."""
import asyncio, os
from collections import Counter
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
import motor.motor_asyncio

client = motor.motor_asyncio.AsyncIOMotorClient(os.environ.get("MONGO_URL"))
db = client[os.environ.get("DB_NAME")]

async def investigate():
    cp = db["catalog_products"]
    bsi = db["brand_system_intelligence"]
    
    # 1. All unique brands and their enrichment status
    print("=== UNENRICHED BRANDS (no semantic_brand_system) ===")
    pipeline = [
        {"$match": {"semantic_brand_system": {"$in": [None, ""]}}},
        {"$group": {"_id": "$brand", "count": {"$sum": 1}, "divisions": {"$addToSet": "$division_canonical"}}},
        {"$sort": {"count": -1}}
    ]
    unenriched = await cp.aggregate(pipeline).to_list(200)
    total_unenriched = sum(g["count"] for g in unenriched)
    print(f"  Total unenriched products: {total_unenriched}")
    for g in unenriched[:30]:
        brand = g["_id"] or "(empty)"
        print(f"  [{g['count']:3}] Brand: {brand:25} | Divisions: {g['divisions']}")
    if len(unenriched) > 30:
        print(f"  ... +{len(unenriched)-30} more brands")
    
    # 2. Known brands in BSI
    print("\n=== KNOWN BRANDS (in brand_system_intelligence) ===")
    known = await bsi.distinct("entity_code")
    print(f"  Known brands: {sorted(known)}")
    
    # 3. Brands with products but NOT in BSI
    all_brands = await cp.distinct("brand")
    unknown_brands = set(b for b in all_brands if b and b.upper() not in [k.upper() for k in known])
    print(f"\n=== UNKNOWN BRANDS (have products but no BSI entry) ===")
    print(f"  Count: {len(unknown_brands)}")
    for b in sorted(unknown_brands):
        count = await cp.count_documents({"brand": b})
        divs = await cp.distinct("division_canonical", {"brand": b})
        print(f"  [{count:3}] {b:30} | {divs}")
    
    # 4. Products with empty brand
    empty_brand = await cp.count_documents({"brand": {"$in": ["", None]}})
    print(f"\n=== EMPTY BRAND products: {empty_brand} ===")
    # Sample some
    samples = await cp.find(
        {"brand": {"$in": ["", None]}},
        {"_id": 0, "product_name_display": 1, "division_canonical": 1, "category_canonical": 1}
    ).sort("division_canonical", 1).to_list(15)
    for s in samples:
        print(f"  [{s.get('division_canonical',''):15}] {s.get('product_name_display',''):50} | cat: {s.get('category_canonical','')}")

asyncio.run(investigate())
