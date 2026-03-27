"""
Investigate brochure source data to understand what headings/families exist.
This will help build the clinical reclassification pipeline.
"""
import asyncio, os, json
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
import motor.motor_asyncio

client = motor.motor_asyncio.AsyncIOMotorClient(os.environ.get("MONGO_URL"))
db = client[os.environ.get("DB_NAME")]

async def investigate():
    cp = db["catalog_products"]
    cs = db["catalog_skus"]
    
    # 1. Check what source data fields exist on products
    sample = await cp.find_one({"division_canonical": "Trauma", "brand": "AURIC"}, {"_id": 0})
    print("=== SAMPLE AURIC PRODUCT ===")
    for k, v in sorted(sample.items()):
        if v and v != "" and v != [] and v != {}:
            print(f"  {k}: {repr(v)[:200]}")
    
    print("\n=== TRAUMA PRODUCTS - All product_name values ===")
    trauma = await cp.find(
        {"division_canonical": "Trauma", "status": {"$ne": "draft"}},
        {"_id": 0, "product_name": 1, "product_name_display": 1, "brand": 1, "category": 1, 
         "product_family": 1, "product_family_display": 1, "shadow_source_files": 1,
         "description_shadow": 1}
    ).sort("brand", 1).to_list(100)
    
    for p in trauma:
        src = (p.get("shadow_source_files") or [""])[0] if p.get("shadow_source_files") else ""
        print(f"  [{p.get('brand','?'):10}] {p.get('product_name_display','?'):60} | src: {src}")
    
    print(f"\n=== BROCHURE SOURCE FILES (Trauma) ===")
    source_files = set()
    async for p in cp.find({"division_canonical": "Trauma"}, {"_id": 0, "shadow_source_files": 1}):
        for sf in (p.get("shadow_source_files") or []):
            source_files.add(sf)
    for sf in sorted(source_files):
        print(f"  {sf}")
    
    # 2. Check what's in the shadow DB raw collections
    collections = await db.list_collection_names()
    print(f"\n=== ALL COLLECTIONS ===")
    for c in sorted(collections):
        count = await db[c].count_documents({})
        print(f"  {c}: {count}")
    
    # 3. Check if there's extracted text/heading data
    for coll_name in ["extracted_products", "shadow_products", "raw_extractions", "brochure_pages", "training_chunks"]:
        if coll_name in collections:
            sample = await db[coll_name].find_one({}, {"_id": 0})
            if sample:
                print(f"\n=== SAMPLE from {coll_name} ===")
                for k in sorted(sample.keys()):
                    v = sample[k]
                    if v and str(v)[:5] != "None":
                        print(f"  {k}: {repr(v)[:150]}")
    
    # 4. Check SKU data for brochure headings
    print("\n=== SAMPLE SKUs for ARMAR ===")
    skus = await cs.find(
        {"brand": {"$regex": "ARMAR|Armar", "$options": "i"}},
        {"_id": 0, "sku_code": 1, "product_name": 1, "sub_category": 1, "description": 1, "source_file": 1}
    ).sort("sku_code", 1).to_list(20)
    for s in skus:
        print(f"  {s.get('sku_code','?'):20} | {s.get('product_name','?'):50} | sub: {s.get('sub_category','')} | desc: {s.get('description','')[:80]}")
    
    print("\n=== SAMPLE SKUs for CLAVO ===")
    skus = await cs.find(
        {"brand": {"$regex": "CLAVO|Clavo", "$options": "i"}},
        {"_id": 0, "sku_code": 1, "product_name": 1, "sub_category": 1, "description": 1}
    ).sort("sku_code", 1).to_list(20)
    for s in skus:
        print(f"  {s.get('sku_code','?'):20} | {s.get('product_name','?'):50} | sub: {s.get('sub_category','')} | desc: {s.get('description','')[:80]}")

    # 5. Check what sub_categories exist for trauma SKUs
    print("\n=== UNIQUE sub_category values (Trauma SKUs) ===")
    sub_cats = await cs.distinct("sub_category", {"division": {"$regex": "Trauma", "$options": "i"}})
    for sc in sorted([s for s in sub_cats if s]):
        count = await cs.count_documents({"sub_category": sc, "division": {"$regex": "Trauma", "$options": "i"}})
        print(f"  {sc} ({count} SKUs)")

    # 6. Check product_name values in SKUs - these often carry brochure headings
    print("\n=== UNIQUE product_name in SKUs (Trauma, top 30) ===")
    sku_names = await cs.distinct("product_name", {"division": {"$regex": "Trauma", "$options": "i"}})
    for n in sorted([x for x in sku_names if x])[:30]:
        count = await cs.count_documents({"product_name": n, "division": {"$regex": "Trauma", "$options": "i"}})
        print(f"  [{count:3} SKUs] {n}")

asyncio.run(investigate())
