import json
import os
from datetime import datetime, timezone
from db import products_col, leads_col

DATA_DIR = os.path.dirname(os.path.abspath(__file__))


def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
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
