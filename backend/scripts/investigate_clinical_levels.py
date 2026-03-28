"""Investigate clinical classification data for comparison guardrails."""
import asyncio, os
from collections import defaultdict
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
import motor.motor_asyncio

client = motor.motor_asyncio.AsyncIOMotorClient(os.environ.get("MONGO_URL"))
db = client[os.environ.get("DB_NAME")]

async def investigate():
    cp = db["catalog_products"]
    
    # 1. Distribution of system_type + implant_class combos
    print("=== System Type × Implant Class (pilot divisions) ===")
    pipeline = [
        {"$match": {"mapping_confidence": "high", "review_required": False, "status": {"$ne": "draft"}}},
        {"$group": {
            "_id": {
                "div": "$division_canonical",
                "sys": "$semantic_system_type", 
                "impl": "$semantic_implant_class",
                "cat": "$category_canonical"
            },
            "count": {"$sum": 1},
            "products": {"$push": "$product_name_display"}
        }},
        {"$sort": {"_id.div": 1, "count": -1}}
    ]
    groups = await cp.aggregate(pipeline).to_list(100)
    
    current_div = ""
    for g in groups:
        div = g["_id"]["div"]
        if div != current_div:
            print(f"\n  --- {div} ---")
            current_div = div
        sys_type = g["_id"].get("sys") or "(none)"
        impl_class = g["_id"].get("impl") or "(none)"
        cat = g["_id"].get("cat") or "(none)"
        prods = g["products"][:3]
        print(f"  [{g['count']:2}] sys={sys_type:20} impl={impl_class:15} cat={cat:30} | {prods}")
    
    # 2. Find "vague" pages - products with no semantic data or very broad names
    print("\n\n=== VAGUE PRODUCTS (no semantic data, pilot divisions) ===")
    vague = await cp.find(
        {
            "mapping_confidence": "high", "review_required": False, "status": {"$ne": "draft"},
            "$or": [
                {"semantic_brand_system": None},
                {"semantic_brand_system": {"$exists": False}},
                {"semantic_system_type": None},
            ]
        },
        {"_id": 0, "product_name_display": 1, "division_canonical": 1, "category_canonical": 1, "brand": 1}
    ).sort("division_canonical", 1).to_list(50)
    
    for v in vague[:30]:
        print(f"  [{v.get('division_canonical',''):15}] {v.get('product_name_display',''):55} | cat: {v.get('category_canonical','')} | brand: {v.get('brand','')}")
    if len(vague) > 30:
        print(f"  ... +{len(vague)-30} more")
    print(f"  Total vague products: {len(vague)}")

asyncio.run(investigate())
