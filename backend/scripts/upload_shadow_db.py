"""
Shadow DB Upload Script — Batch 1 (Files 1-25)
Uploads normalized products, SKUs, brands, and training chunks to MongoDB shadow collections.
These are NOT production collections — they are for validation and chatbot testing only.
"""
import json
import os
import sys
from datetime import datetime, timezone
from pymongo import MongoClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

BASE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "brochure_intelligence")

def upload_products():
    col = db["shadow_products"]
    col.drop()
    
    with open(os.path.join(BASE_DIR, "normalized_products/products_master.json")) as f:
        data = json.load(f)
    
    products = data["products"]
    for p in products:
        p["_batch"] = "batch_1"
        p["_uploaded_at"] = datetime.now(timezone.utc).isoformat()
    
    if products:
        col.insert_many(products)
    print(f"  shadow_products: {len(products)} documents")
    return len(products)

def upload_skus():
    col = db["shadow_skus"]
    col.drop()
    
    with open(os.path.join(BASE_DIR, "normalized_products/sku_master.json")) as f:
        data = json.load(f)
    
    skus = data["skus"]
    for s in skus:
        s["_batch"] = "batch_1"
        s["_uploaded_at"] = datetime.now(timezone.utc).isoformat()
    
    if skus:
        col.insert_many(skus)
    print(f"  shadow_skus: {len(skus)} documents")
    return len(skus)

def upload_brands():
    col = db["shadow_brands"]
    col.drop()
    
    with open(os.path.join(BASE_DIR, "normalized_products/brand_hierarchy.json")) as f:
        data = json.load(f)
    
    docs = []
    for div_name, div_data in data.get("divisions", {}).items():
        for brand_name, brand_data in div_data.get("brands", {}).items():
            docs.append({
                "brand": brand_name,
                "division": div_name,
                "parent_brand": brand_data.get("parent_brand", "Meril"),
                "products": brand_data.get("products", 0),
                "skus": brand_data.get("skus", 0),
                "source_files": brand_data.get("source_files", []),
                "sub_categories": brand_data.get("sub_categories", []),
                "_batch": "batch_1",
                "_uploaded_at": datetime.now(timezone.utc).isoformat()
            })
    
    if docs:
        col.insert_many(docs)
    print(f"  shadow_brands: {len(docs)} documents")
    return len(docs)

def upload_chunks():
    col = db["shadow_chunks"]
    col.drop()
    
    chunk_dir = os.path.join(BASE_DIR, "training_chunks")
    all_chunks = []
    for fname in os.listdir(chunk_dir):
        if fname.endswith("_chunks.json") and not fname.startswith("_"):
            with open(os.path.join(chunk_dir, fname)) as f:
                data = json.load(f)
            for chunk in data.get("chunks", []):
                chunk["_batch"] = "batch_1"
                chunk["_uploaded_at"] = datetime.now(timezone.utc).isoformat()
                all_chunks.append(chunk)
    
    if all_chunks:
        col.insert_many(all_chunks)
    print(f"  shadow_chunks: {len(all_chunks)} documents")
    return len(all_chunks)

if __name__ == "__main__":
    print("Uploading Batch 1 to Shadow DB...")
    print(f"  MongoDB: {MONGO_URL}")
    print(f"  Database: {DB_NAME}")
    print()
    
    n_products = upload_products()
    n_skus = upload_skus()
    n_brands = upload_brands()
    n_chunks = upload_chunks()
    
    # Create indexes
    db["shadow_products"].create_index("brand")
    db["shadow_products"].create_index("division")
    db["shadow_products"].create_index("product_id")
    db["shadow_skus"].create_index("sku_code")
    db["shadow_skus"].create_index("brand")
    db["shadow_skus"].create_index("product_id")
    db["shadow_chunks"].create_index("chunk_type")
    db["shadow_chunks"].create_index([("metadata.brand", 1)])
    
    print(f"\nShadow DB upload complete!")
    print(f"  Products: {n_products}")
    print(f"  SKUs: {n_skus}")
    print(f"  Brands: {n_brands}")
    print(f"  Chunks: {n_chunks}")
    print(f"  Indexes created")
