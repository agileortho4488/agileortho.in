#!/usr/bin/env python3
"""
Batch 4 Normalization & Shadow DB Sync (Files 076-100)
Merges Batch 4 structured drafts into normalized master lists,
generates training chunks, and syncs to MongoDB shadow collections.
"""
import json
import os
import glob
import hashlib
from datetime import datetime, timezone

BASE_DIR = "/app/backend/brochure_intelligence"
DRAFT_DIR = os.path.join(BASE_DIR, "structured_drafts")
NORM_DIR = os.path.join(BASE_DIR, "normalized_products")
CHUNKS_DIR = os.path.join(BASE_DIR, "training_chunks")
NOW = datetime.now(timezone.utc).isoformat()


def gen_product_id(name, brand):
    """Generate deterministic product ID from name+brand."""
    key = f"{name}|{brand}".lower()
    return hashlib.md5(key.encode()).hexdigest()[:16]


def load_json(path):
    with open(path) as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def normalize_batch4():
    """Process Batch 4 structured drafts into normalized products/SKUs."""
    print("=" * 70)
    print("BATCH 4 NORMALIZATION (Files 076-100)")
    print("=" * 70)

    # Load existing normalized data
    pm = load_json(os.path.join(NORM_DIR, "products_master.json"))
    sm = load_json(os.path.join(NORM_DIR, "sku_master.json"))
    bh = load_json(os.path.join(NORM_DIR, "brand_hierarchy.json"))

    existing_products = pm["products"]
    existing_skus = sm["skus"]
    existing_product_ids = {p["product_id"] for p in existing_products}
    existing_sku_codes = {s["sku_code"] for s in existing_skus}

    new_products = []
    new_skus = []
    new_brands = set()
    new_divisions = set()
    files_with_skus = 0
    files_without_skus = 0

    # Process each Batch 4 draft
    for fnum in range(76, 101):
        matches = glob.glob(os.path.join(DRAFT_DIR, f"{fnum:03d}_*_draft.json"))
        if not matches:
            print(f"  WARNING: No draft found for {fnum:03d}")
            continue

        draft = load_json(matches[0])
        products = draft.get("products", [])

        if not products:
            files_without_skus += 1
            continue

        files_with_skus += 1

        for prod in products:
            prod_name = prod["name"]
            prod_brand = prod.get("brand", "Unknown")
            prod_id = gen_product_id(prod_name, prod_brand)

            # Check for duplicates
            if prod_id in existing_product_ids:
                # Update source references on existing product
                for ep in existing_products:
                    if ep["product_id"] == prod_id:
                        if draft["extraction_id"] not in ep.get("source_extraction_ids", []):
                            ep.setdefault("source_extraction_ids", []).append(draft["extraction_id"])
                            ep.setdefault("source_files", []).append(draft["source_file"])
                        break
            else:
                sku_count = len(prod.get("skus", []))
                new_prod = {
                    "product_id": prod_id,
                    "name": prod_name,
                    "brand": prod_brand,
                    "parent_brand": "Meril",
                    "division": prod.get("division", "Unknown"),
                    "sub_category": prod.get("category", ""),
                    "classification": "Implant" if prod.get("division") in ("Trauma", "Joint Replacement") else "Device",
                    "material": "",
                    "description": prod.get("description", ""),
                    "sku_count": sku_count,
                    "source_extraction_ids": [draft["extraction_id"]],
                    "source_files": [draft["source_file"]],
                    "source_pages": [prod.get("source_page", "")],
                    "_batch": "batch_4",
                    "_normalized_at": NOW
                }
                new_products.append(new_prod)
                existing_product_ids.add(prod_id)

                new_brands.add(prod_brand)
                if prod.get("division"):
                    new_divisions.add(prod["division"])

            # Process SKUs
            for sku in prod.get("skus", []):
                sku_code = sku["code"]
                if sku_code in existing_sku_codes:
                    continue

                new_sku = {
                    "sku_code": sku_code,
                    "product_id": prod_id,
                    "product_name": prod_name,
                    "brand": prod_brand,
                    "division": prod.get("division", "Unknown"),
                    "sub_category": prod.get("category", ""),
                    "variant_attributes": {},
                    "confidence": 0.90,
                    "source_extraction_id": draft["extraction_id"],
                    "source_file": draft["source_file"],
                    "source_page": sku.get("source_page", prod.get("source_page", "")),
                    "_batch": "batch_4"
                }
                if sku.get("description"):
                    new_sku["description"] = sku["description"]
                new_skus.append(new_sku)
                existing_sku_codes.add(sku_code)

    # Merge into master
    all_products = existing_products + new_products
    all_skus = existing_skus + new_skus

    # Update batch stats
    pm["products"] = all_products
    pm["total_products"] = len(all_products)
    pm["batch_stats"]["batch_4"] = {
        "products": len(new_products),
        "skus": len(new_skus),
        "files_with_skus": files_with_skus,
        "files_without_skus": files_without_skus
    }
    pm["normalized_at"] = NOW
    pm["batch"] = "batch_1_to_4"

    sm["skus"] = all_skus
    sm["total_skus"] = len(all_skus)
    sm["normalized_at"] = NOW
    sm["batch"] = "batch_1_to_4"

    # Update brand hierarchy (matches existing structure: products=int count)
    divisions = bh.get("divisions", {})
    for prod in new_products:
        div = prod["division"]
        brand = prod["brand"]
        cat = prod["sub_category"]
        if div not in divisions:
            divisions[div] = {"total_products": 0, "total_skus": 0, "brands": {}}
        if brand not in divisions[div]["brands"]:
            divisions[div]["brands"][brand] = {
                "parent_brand": "Meril",
                "products": 0,
                "skus": 0,
                "source_files": [],
                "sub_categories": []
            }
        divisions[div]["brands"][brand]["products"] += 1
        prod_skus_count = len([s for s in new_skus if s["product_id"] == prod["product_id"]])
        divisions[div]["brands"][brand]["skus"] += prod_skus_count
        divisions[div]["total_products"] += 1
        divisions[div]["total_skus"] += prod_skus_count
        if prod["source_extraction_ids"]:
            for eid in prod["source_extraction_ids"]:
                if eid not in divisions[div]["brands"][brand]["source_files"]:
                    divisions[div]["brands"][brand]["source_files"].append(eid)
        if cat and cat not in divisions[div]["brands"][brand]["sub_categories"]:
            divisions[div]["brands"][brand]["sub_categories"].append(cat)
    bh["divisions"] = divisions
    bh["normalized_at"] = NOW

    # Save updated masters
    save_json(os.path.join(NORM_DIR, "products_master.json"), pm)
    save_json(os.path.join(NORM_DIR, "sku_master.json"), sm)
    save_json(os.path.join(NORM_DIR, "brand_hierarchy.json"), bh)

    # Create snapshot
    snapshot_dir = os.path.join(NORM_DIR, "snapshots")
    os.makedirs(snapshot_dir, exist_ok=True)
    save_json(os.path.join(snapshot_dir, "products_master_batch4_snapshot.json"), pm)
    save_json(os.path.join(snapshot_dir, "sku_master_batch4_snapshot.json"), sm)

    print(f"\n--- Batch 4 Normalization Results ---")
    print(f"New products: {len(new_products)}")
    print(f"New SKU codes: {len(new_skus)}")
    print(f"New brands: {new_brands}")
    print(f"Files with SKUs: {files_with_skus}")
    print(f"Files without SKUs: {files_without_skus}")
    print(f"\n--- Cumulative Totals (Files 1-100) ---")
    print(f"Total products: {len(all_products)}")
    print(f"Total SKU codes: {len(all_skus)}")
    print(f"Total divisions: {len(divisions)}")

    return new_products, new_skus


def generate_training_chunks(new_products, new_skus):
    """Generate training chunks for Batch 4 data."""
    print(f"\n--- Generating Training Chunks ---")

    chunks = []
    chunk_id = 0

    # Product chunks
    for prod in new_products:
        # Product summary chunk
        text_parts = [
            f"Product: {prod['name']}",
            f"Brand: {prod['brand']}",
            f"Division: {prod['division']}",
            f"Category: {prod['sub_category']}",
            f"Source: {', '.join(prod['source_files'])}",
        ]
        if prod.get("description"):
            text_parts.append(prod["description"])

        # Get associated SKUs
        prod_skus = [s for s in new_skus if s["product_id"] == prod["product_id"]]
        if prod_skus:
            text_parts.append(f"SKU Codes ({len(prod_skus)} variants):")
            for s in prod_skus[:50]:  # cap at 50 per chunk
                desc = s.get("description", "")
                text_parts.append(f"  - {s['sku_code']}" + (f": {desc}" if desc else ""))

        chunks.append({
            "chunk_id": f"b4_product_{chunk_id:04d}",
            "chunk_type": "product",
            "text": "\n".join(text_parts),
            "metadata": {
                "product_id": prod["product_id"],
                "product_name": prod["name"],
                "brand": prod["brand"],
                "division": prod["division"],
                "category": prod["sub_category"],
                "sku_count": len(prod_skus),
                "batch": "batch_4"
            }
        })
        chunk_id += 1

        # If too many SKUs, create overflow chunks
        if len(prod_skus) > 50:
            for i in range(50, len(prod_skus), 50):
                batch_skus = prod_skus[i:i+50]
                overflow_text = [
                    f"Product: {prod['name']} (SKU continuation {i//50 + 1})",
                    f"Brand: {prod['brand']}",
                    f"SKU Codes ({len(batch_skus)} more variants):"
                ]
                for s in batch_skus:
                    desc = s.get("description", "")
                    overflow_text.append(f"  - {s['sku_code']}" + (f": {desc}" if desc else ""))

                chunks.append({
                    "chunk_id": f"b4_product_{chunk_id:04d}",
                    "chunk_type": "product_sku_overflow",
                    "text": "\n".join(overflow_text),
                    "metadata": {
                        "product_id": prod["product_id"],
                        "product_name": prod["name"],
                        "brand": prod["brand"],
                        "batch": "batch_4"
                    }
                })
                chunk_id += 1

    # Save batch-specific chunks
    batch4_chunks = {
        "chunks": chunks,
        "total": len(chunks),
        "generated_at": NOW
    }
    save_json(os.path.join(CHUNKS_DIR, "batch4_076_100_chunks.json"), batch4_chunks)

    # Also create merged file for 1-100
    existing_chunks = load_json(os.path.join(CHUNKS_DIR, "merged_1_75_chunks.json"))
    merged = {
        "chunks": existing_chunks["chunks"] + chunks,
        "total": existing_chunks["total"] + len(chunks),
        "generated_at": NOW,
        "coverage": "files_1_to_100"
    }
    save_json(os.path.join(CHUNKS_DIR, "merged_1_100_chunks.json"), merged)

    print(f"Batch 4 chunks: {len(chunks)}")
    print(f"Merged 1-100 chunks: {merged['total']}")
    return chunks


def sync_shadow_db(new_products, new_skus, chunks):
    """Sync Batch 4 data to MongoDB shadow collections."""
    print(f"\n--- Syncing to Shadow DB ---")

    import sys
    sys.path.insert(0, "/app/backend")

    import pymongo
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "agile_ortho")

    client = pymongo.MongoClient(mongo_url)
    db = client[db_name]

    # Sync products
    if new_products:
        for p in new_products:
            p_doc = {k: v for k, v in p.items() if not k.startswith("_")}
            p_doc["_batch"] = "batch_4"
            p_doc["_synced_at"] = NOW
            db.shadow_products.update_one(
                {"product_id": p["product_id"]},
                {"$set": p_doc},
                upsert=True
            )
        print(f"  shadow_products: {len(new_products)} upserted")

    # Sync SKUs
    if new_skus:
        for s in new_skus:
            s_doc = {k: v for k, v in s.items() if not k.startswith("_")}
            s_doc["_batch"] = "batch_4"
            s_doc["_synced_at"] = NOW
            db.shadow_skus.update_one(
                {"sku_code": s["sku_code"]},
                {"$set": s_doc},
                upsert=True
            )
        print(f"  shadow_skus: {len(new_skus)} upserted")

    # Sync chunks
    if chunks:
        for c in chunks:
            db.shadow_chunks.update_one(
                {"chunk_id": c["chunk_id"]},
                {"$set": {**c, "_synced_at": NOW}},
                upsert=True
            )
        print(f"  shadow_chunks: {len(chunks)} upserted")

    # Update brands
    brands_in_batch = set(p["brand"] for p in new_products)
    for brand in brands_in_batch:
        brand_prods = [p for p in new_products if p["brand"] == brand]
        divisions = list(set(p["division"] for p in brand_prods))
        db.shadow_brands.update_one(
            {"brand_name": brand},
            {"$set": {
                "brand_name": brand,
                "parent_brand": "Meril",
                "divisions": divisions,
                "product_count": len(brand_prods),
                "_synced_at": NOW
            }},
            upsert=True
        )
    print(f"  shadow_brands: {len(brands_in_batch)} upserted")

    # Print totals
    total_prods = db.shadow_products.count_documents({})
    total_skus = db.shadow_skus.count_documents({})
    total_chunks = db.shadow_chunks.count_documents({})
    total_brands = db.shadow_brands.count_documents({})

    print(f"\n--- Shadow DB Totals ---")
    print(f"  shadow_products: {total_prods}")
    print(f"  shadow_skus: {total_skus}")
    print(f"  shadow_chunks: {total_chunks}")
    print(f"  shadow_brands: {total_brands}")

    client.close()


def main():
    new_products, new_skus = normalize_batch4()
    chunks = generate_training_chunks(new_products, new_skus)
    sync_shadow_db(new_products, new_skus, chunks)

    print(f"\n{'=' * 70}")
    print("BATCH 4 NORMALIZATION & SYNC COMPLETE")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    main()
