"""
Shadow DB Sync — Files 1-75 (Merged Normalized Layer)
Uploads from the frozen normalized snapshot to MongoDB shadow collections.
NOT production — for validation and chatbot testing only.
"""
import json
import os
from datetime import datetime, timezone
from pymongo import MongoClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

SNAP = "/app/backend/brochure_intelligence/normalized_products/snapshots/2026-02-28"


def upload_products():
    col = db["shadow_products"]
    col.drop()

    with open(f"{SNAP}/products_master.json") as f:
        products = json.load(f)

    now = datetime.now(timezone.utc).isoformat()
    for p in products:
        p["_uploaded_at"] = now
        p["_snapshot"] = "2026-02-28"

    if products:
        col.insert_many(products)
    print(f"  shadow_products: {len(products)} documents")
    return len(products)


def upload_skus():
    col = db["shadow_skus"]
    col.drop()

    with open(f"{SNAP}/sku_master.json") as f:
        skus = json.load(f)

    now = datetime.now(timezone.utc).isoformat()
    for s in skus:
        s["_uploaded_at"] = now
        s["_snapshot"] = "2026-02-28"

    if skus:
        col.insert_many(skus)
    print(f"  shadow_skus: {len(skus)} documents")
    return len(skus)


def upload_brands():
    col = db["shadow_brands"]
    col.drop()

    with open(f"{SNAP}/brand_hierarchy.json") as f:
        hierarchy = json.load(f)

    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for brand_name, brand_data in hierarchy.items():
        docs.append({
            "brand": brand_name,
            "division": brand_data.get("division", "Unknown"),
            "parent_brand": "Meril",
            "product_count": brand_data.get("product_count", 0),
            "sku_count": brand_data.get("sku_count", 0),
            "categories": brand_data.get("categories", []),
            "source_files": brand_data.get("source_files", []),
            "_uploaded_at": now,
            "_snapshot": "2026-02-28"
        })

    if docs:
        col.insert_many(docs)
    print(f"  shadow_brands: {len(docs)} documents")
    return len(docs)


def upload_taxonomy():
    col = db["shadow_taxonomy"]
    col.drop()

    with open(f"{SNAP}/taxonomy.json") as f:
        taxonomy = json.load(f)

    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for div_name, div_data in taxonomy.get("divisions", {}).items():
        docs.append({
            "type": "division",
            "name": div_name,
            "categories": div_data.get("categories", []),
            "product_count": div_data.get("product_count", 0),
            "sku_count": div_data.get("sku_count", 0),
            "_uploaded_at": now,
            "_snapshot": "2026-02-28"
        })

    if docs:
        col.insert_many(docs)
    print(f"  shadow_taxonomy: {len(docs)} documents")
    return len(docs)


def upload_chunks():
    col = db["shadow_chunks"]
    col.drop()

    chunk_dir = "/app/backend/brochure_intelligence/training_chunks"
    all_chunks = []

    if os.path.isdir(chunk_dir):
        for fname in sorted(os.listdir(chunk_dir)):
            if fname.endswith(".json") and not fname.startswith("_"):
                with open(os.path.join(chunk_dir, fname)) as f:
                    data = json.load(f)
                chunks = data if isinstance(data, list) else data.get("chunks", [])
                for chunk in chunks:
                    chunk["_snapshot"] = "2026-02-28"
                    chunk["_uploaded_at"] = datetime.now(timezone.utc).isoformat()
                    all_chunks.append(chunk)

    if all_chunks:
        col.insert_many(all_chunks)
    print(f"  shadow_chunks: {len(all_chunks)} documents")
    return len(all_chunks)


if __name__ == "__main__":
    print("=" * 80)
    print("Shadow DB Sync — Files 1-75 Normalized Snapshot")
    print(f"  MongoDB: {MONGO_URL}")
    print(f"  Database: {DB_NAME}")
    print(f"  Snapshot: {SNAP}")
    print("=" * 80)

    n_products = upload_products()
    n_skus = upload_skus()
    n_brands = upload_brands()
    n_taxonomy = upload_taxonomy()
    n_chunks = upload_chunks()

    # Indexes
    db["shadow_products"].create_index("brand")
    db["shadow_products"].create_index("division")
    db["shadow_products"].create_index("product_id")
    db["shadow_products"].create_index("category")
    db["shadow_skus"].create_index("code")
    db["shadow_skus"].create_index("brand")
    db["shadow_skus"].create_index("division")
    db["shadow_skus"].create_index("product_id")
    db["shadow_brands"].create_index("brand")
    db["shadow_brands"].create_index("division")
    db["shadow_chunks"].create_index("chunk_type")

    print(f"\nSync complete!")
    print(f"  Products: {n_products}")
    print(f"  SKUs: {n_skus}")
    print(f"  Brands: {n_brands}")
    print(f"  Taxonomy: {n_taxonomy}")
    print(f"  Chunks: {n_chunks}")
