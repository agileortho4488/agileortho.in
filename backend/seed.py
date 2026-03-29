import json
import os
from datetime import datetime, timezone
from db import products_col, leads_col, catalog_products_col, catalog_skus_col, db as mongo_db

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
SEED_DIR = os.path.join(DATA_DIR, "seed_data")


def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return []


def load_seed(filename):
    path = os.path.join(SEED_DIR, filename)
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return []


async def seed_database():
    count = await products_col.count_documents({})
    products = load_json("product_data.json")

    if not products:
        print("No product_data.json found, skipping product seed")
        return

    if count < len(products):
        # Upsert all products by sku_code to avoid duplicates
        inserted = 0
        updated = 0
        for p in products:
            sku = p.get("sku_code")
            if not sku:
                continue
            # Ensure required fields
            p.setdefault("slug", p.get("product_name", "").lower().replace(" ", "-").replace("/", "-"))
            p.setdefault("status", "published")
            p.setdefault("images", [])
            p.setdefault("size_variables", [])
            p.setdefault("pack_size", "")
            p.setdefault("brochure_url", "")
            p.setdefault("created_at", datetime.now(timezone.utc).isoformat())
            p.setdefault("updated_at", datetime.now(timezone.utc).isoformat())

            result = await products_col.update_one(
                {"sku_code": sku},
                {"$set": p},
                upsert=True
            )
            if result.upserted_id:
                inserted += 1
            elif result.modified_count > 0:
                updated += 1

        print(f"Product seed: {inserted} inserted, {updated} updated (total in file: {len(products)})")
    else:
        print(f"Database already has {count} products (file has {len(products)}), skipping seed")


async def seed_leads():
    count = await leads_col.count_documents({})
    leads = load_json("lead_data.json")

    if not leads:
        print("No lead_data.json found, skipping lead seed")
        return

    if count < 5:
        for lead in leads:
            lead.setdefault("notes", [])
            lead.setdefault("assigned_to", "")
            lead.setdefault("created_at", datetime.now(timezone.utc).isoformat())
            lead.setdefault("updated_at", datetime.now(timezone.utc).isoformat())
        await leads_col.insert_many(leads)
        print(f"Seeded {len(leads)} leads")
    else:
        print(f"Database already has {count} leads, skipping seed")


async def seed_catalog():
    """Auto-seed enriched catalog data on fresh deployments."""
    cat_count = await catalog_products_col.count_documents({})
    if cat_count > 0:
        print(f"Catalog already has {cat_count} products, skipping catalog seed")
        return

    # Seed catalog_products
    products = load_seed("catalog_products.json")
    if products:
        await catalog_products_col.insert_many(products)
        print(f"Seeded {len(products)} catalog products")

    # Seed catalog_skus
    skus = load_seed("catalog_skus.json")
    if skus:
        await catalog_skus_col.insert_many(skus)
        print(f"Seeded {len(skus)} catalog SKUs")

    # Seed catalog_division_map
    divs = load_seed("catalog_division_map.json")
    if divs:
        await mongo_db.catalog_division_map.insert_many(divs)
        print(f"Seeded {len(divs)} division mappings")

    # Seed catalog_category_map
    cats = load_seed("catalog_category_map.json")
    if cats:
        await mongo_db.catalog_category_map.insert_many(cats)
        print(f"Seeded {len(cats)} category mappings")

    # Seed catalog_product_family_map
    fams = load_seed("catalog_product_family_map.json")
    if fams:
        await mongo_db.catalog_product_family_map.insert_many(fams)
        print(f"Seeded {len(fams)} product family maps")

    # Seed leads from seed_data if main leads are empty
    lead_count = await leads_col.count_documents({})
    if lead_count == 0:
        leads = load_seed("leads.json")
        if leads:
            await leads_col.insert_many(leads)
            print(f"Seeded {len(leads)} leads from catalog seed")

    # Create indexes for catalog collections
    await catalog_products_col.create_index("slug", unique=True, sparse=True)
    await catalog_products_col.create_index("division_canonical")
    await catalog_products_col.create_index("product_family")
    await catalog_products_col.create_index("status")
    await catalog_products_col.create_index("live_visible")
    await catalog_products_col.create_index("review_required")
    await catalog_products_col.create_index("semantic_brand_system")
    await catalog_skus_col.create_index("sku_code")
    await catalog_skus_col.create_index("brand")

    # Seed admin auth fallback (hashed password stored in DB)
    from helpers import hash_password
    admin_pw = os.environ.get("ADMIN_PASSWORD", "AgileHealth2026admin")
    await mongo_db["admin_config"].update_one(
        {"type": "admin_auth"},
        {"$set": {
            "type": "admin_auth",
            "password_hash": hash_password(admin_pw),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    print("Admin auth fallback seeded")

    print("Catalog seed complete with indexes")
