"""
Deep investigation: How catalog_products map to catalog_skus,
and what clinical names exist across ALL divisions.
"""
import asyncio, os
from collections import Counter, defaultdict
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
import motor.motor_asyncio

client = motor.motor_asyncio.AsyncIOMotorClient(os.environ.get("MONGO_URL"))
db = client[os.environ.get("DB_NAME")]

async def investigate():
    cp = db["catalog_products"]
    cs = db["catalog_skus"]
    
    # 1. For each catalog_product, show its SKU product_names
    print("=== TRAUMA: catalog_product → SKU product_names ===")
    products = await cp.find(
        {"division_canonical": "Trauma", "status": {"$ne": "draft"}, "mapping_confidence": "high", "review_required": False},
        {"_id": 0, "product_name": 1, "product_name_display": 1, "brand": 1, "slug": 1, "shadow_sku_count": 1}
    ).sort("product_name_display", 1).to_list(100)
    
    for p in products:
        pname = p.get("product_name", "")
        skus = await cs.find(
            {"catalog_product_name": pname},
            {"_id": 0, "product_name": 1}
        ).to_list(500)
        sku_names = sorted(set(s.get("product_name", "") for s in skus if s.get("product_name")))
        sku_count = len(skus)
        print(f"\n  PRODUCT: {p.get('product_name_display','?')} [{p.get('brand','?')}] ({sku_count} SKUs)")
        print(f"  SLUG: {p.get('slug','?')}")
        if sku_names:
            for sn in sku_names[:5]:
                print(f"    → SKU name: {sn}")
            if len(sku_names) > 5:
                print(f"    ... +{len(sku_names)-5} more unique SKU names")
    
    # 2. Diagnostics products
    print("\n\n=== DIAGNOSTICS: catalog_product → SKU product_names (sample 10) ===")
    diag = await cp.find(
        {"division_canonical": "Diagnostics", "status": {"$ne": "draft"}, "mapping_confidence": "high", "review_required": False},
        {"_id": 0, "product_name": 1, "product_name_display": 1, "brand": 1}
    ).sort("product_name_display", 1).to_list(10)
    for p in diag:
        pname = p.get("product_name", "")
        sku_count = await cs.count_documents({"catalog_product_name": pname})
        skus = await cs.find({"catalog_product_name": pname}, {"_id": 0, "product_name": 1}).to_list(5)
        sku_names = [s.get("product_name", "") for s in skus]
        print(f"  [{p.get('brand','?'):15}] {p.get('product_name_display','?'):50} ({sku_count} SKUs)")
        for sn in sku_names[:3]:
            print(f"    → {sn}")
    
    # 3. Cardiovascular products
    print("\n\n=== CARDIOVASCULAR: catalog_product → SKU product_names ===")
    cardio = await cp.find(
        {"division_canonical": "Cardiovascular", "status": {"$ne": "draft"}, "mapping_confidence": "high", "review_required": False},
        {"_id": 0, "product_name": 1, "product_name_display": 1, "brand": 1}
    ).sort("product_name_display", 1).to_list(20)
    for p in cardio:
        pname = p.get("product_name", "")
        sku_count = await cs.count_documents({"catalog_product_name": pname})
        print(f"  [{p.get('brand','?'):15}] {p.get('product_name_display','?'):50} ({sku_count} SKUs)")
    
    # 4. Joint Replacement
    print("\n\n=== JOINT REPLACEMENT: catalog_product → SKU product_names ===")
    jr = await cp.find(
        {"division_canonical": "Joint Replacement", "status": {"$ne": "draft"}, "mapping_confidence": "high", "review_required": False},
        {"_id": 0, "product_name": 1, "product_name_display": 1, "brand": 1}
    ).sort("product_name_display", 1).to_list(20)
    for p in jr:
        pname = p.get("product_name", "")
        sku_count = await cs.count_documents({"catalog_product_name": pname})
        print(f"  [{p.get('brand','?'):15}] {p.get('product_name_display','?'):50} ({sku_count} SKUs)")

    # 5. Check shadow_products for richer clinical data
    print("\n\n=== SHADOW PRODUCTS (Trauma, sample 15) ===")
    shadow = await db["shadow_products"].find(
        {"division": {"$regex": "Trauma|Ortho", "$options": "i"}},
        {"_id": 0, "name": 1, "brand": 1, "sub_category": 1, "description": 1, "source_files": 1}
    ).sort("name", 1).to_list(15)
    for s in shadow:
        print(f"  [{s.get('brand','?'):10}] {s.get('name','?'):60} | sub: {s.get('sub_category','')}")

    # 6. Check shadow_chunks for brochure headings 
    print("\n\n=== SHADOW CHUNKS (sample - look for heading/section data) ===")
    chunk = await db["shadow_chunks"].find_one({}, {"_id": 0})
    if chunk:
        for k in sorted(chunk.keys()):
            print(f"  {k}: {repr(chunk[k])[:200]}")

asyncio.run(investigate())
