"""
Product Knowledge Graph — Relationship Mining Engine (Phase 1)

Mines product-level relationships from `catalog_products` and stores them in
`product_relationships`. Two rules in Phase 1:

  - REQUIRES  : plate <-> screw/bolt diameter matching (cross-sell must-haves)
  - BUNDLE    : same brand system / product family (complete the system)

Run via POST /api/admin/knowledge-graph/rebuild or python module entrypoint.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Optional

from db import catalog_products_col, db as mongo_db

product_relationships_col = mongo_db["product_relationships"]

# Hard-coded brand-system pairings from the existing brand_forward_relationships
# (product docs often have no screw match inside their own brand_system,
#  but the distributor knows which screw family pairs with which plate family).
BRAND_SCREW_MAP = {
    "ARMAR": ["MBOSS"],
    "AURIC": ["MBOSS"],
    "CLAVO": ["MBOSS"],
    "KET": ["MBOSS"],
    "Variabilis Multi-Angle Plates": ["Variabilis Multi-Angle Plates"],
    "MAIRA": ["MBOSS"],
    "Mevel": ["MBOSS"],
}

# Hook/anchor/screw terms for detection
SCREW_TERMS = ("screw", "bolt", "pin", "peg")
PLATE_TERMS = ("plate", "nail")

LIVE_FILTER = {
    "status": {"$ne": "draft"},
    "review_required": False,
    "division_canonical": {"$nin": ["_REVIEW", None, ""]},
}


# Valid screw/bone diameters used in orthopedic trauma systems (mm)
# These filter out false positives like plate widths (22mm, 45mm) and lengths.
VALID_DIAMETERS = {
    "1.5", "2.0", "2.4", "2.7", "3.0", "3.5", "4.0", "4.5", "4.9",
    "5.0", "5.5", "6.0", "6.5", "7.0", "7.3",
}


def _extract_diameters(name: str) -> list[str]:
    """
    Extract orthopedic diameter tokens (e.g. 3.5, 4.0, 2.4) from a product name.
    Only returns sizes that match known implant diameters to avoid matching
    widths/lengths like 22mm or 45mm.
    """
    if not name:
        return []
    raw = re.findall(r"(\d{1,2}\.?\d?)\s*mm", name, re.I)
    # Normalize 4.0 → 4.0, 4 → 4.0, keep 4.9 as-is
    normalized = []
    for v in raw:
        if "." not in v:
            v = f"{v}.0"
        if v in VALID_DIAMETERS:
            normalized.append(v)
    return normalized


def _is_screw(name: str) -> bool:
    n = (name or "").lower()
    return any(t in n for t in SCREW_TERMS)


def _is_plate(name: str) -> bool:
    n = (name or "").lower()
    return any(t in n for t in PLATE_TERMS)


def _brand_key(p: dict) -> Optional[str]:
    return p.get("semantic_brand_system") or p.get("brand") or p.get("parent_brand")


async def _load_products() -> list[dict]:
    """Load all live products with fields we need for mining."""
    proj = {
        "_id": 0,
        "slug": 1,
        "product_name": 1,
        "product_name_display": 1,
        "product_family": 1,
        "category": 1,
        "division_canonical": 1,
        "semantic_brand_system": 1,
        "semantic_implant_class": 1,
        "semantic_anatomy_scope": 1,
        "brand": 1,
        "parent_brand": 1,
        "status": 1,
    }
    cursor = catalog_products_col.find(LIVE_FILTER, proj)
    return await cursor.to_list(length=5000)


def mine_requires(products: list[dict]) -> list[dict]:
    """
    REQUIRES rule: For each plate/nail with a diameter D, find screws/bolts
    with the same diameter D, preferring matching brand systems.
    """
    edges: list[dict] = []
    # Bucket screws by diameter for O(1) lookup
    screws_by_diam: dict[str, list[dict]] = {}
    for p in products:
        name = p.get("product_name_display") or p.get("product_name") or ""
        if not _is_screw(name):
            continue
        for d in _extract_diameters(name):
            screws_by_diam.setdefault(d, []).append(p)

    for plate in products:
        plate_name = plate.get("product_name_display") or plate.get("product_name") or ""
        if not _is_plate(plate_name):
            continue
        diams = _extract_diameters(plate_name)
        if not diams:
            continue

        plate_brand = _brand_key(plate)
        # Preferred screw brands for this plate brand
        preferred_brands = set(BRAND_SCREW_MAP.get(plate_brand, []))
        if plate_brand:
            preferred_brands.add(plate_brand)

        for d in set(diams):
            candidates = screws_by_diam.get(d, [])
            for screw in candidates:
                if screw["slug"] == plate["slug"]:
                    continue
                screw_brand = _brand_key(screw)
                # Match logic
                brand_match = (
                    screw_brand
                    and (screw_brand in preferred_brands or screw_brand == plate_brand)
                )
                # Confidence: brand-matched screws → 0.95, else 0.80
                confidence = 0.95 if brand_match else 0.80
                # Skip low-confidence cross-brand noise if preferred brand found
                if preferred_brands and not brand_match:
                    # Only allow unmatched if no branded screws exist at this diameter
                    any_branded = any(_brand_key(s) in preferred_brands for s in candidates)
                    if any_branded:
                        continue

                edges.append({
                    "source_slug": plate["slug"],
                    "target_slug": screw["slug"],
                    "relationship_type": "REQUIRES",
                    "confidence": round(confidence, 2),
                    "rule_source": "diameter_match",
                    "context": {
                        "diameter_mm": d,
                        "plate_brand": plate_brand,
                        "screw_brand": screw_brand,
                        "division": plate.get("division_canonical"),
                    },
                    "revenue_impact": "high",
                    "status": "active",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
    return edges


def mine_bundle(products: list[dict]) -> list[dict]:
    """
    BUNDLE rule: Products in the same brand_system + implant_class OR the same
    product_family are bundle-compatible (complete the system).
    """
    edges: list[dict] = []

    # Group by (brand_system, implant_class)
    by_system: dict[tuple, list[dict]] = {}
    by_family: dict[str, list[dict]] = {}
    for p in products:
        bs = p.get("semantic_brand_system")
        ic = p.get("semantic_implant_class")
        if bs and ic:
            by_system.setdefault((bs, ic), []).append(p)
        pf = p.get("product_family")
        if pf:
            by_family.setdefault(pf, []).append(p)

    seen: set[tuple[str, str]] = set()

    def _add_edge(a: dict, b: dict, rule: str, ctx: dict, conf: float):
        key = (a["slug"], b["slug"])
        if key in seen or a["slug"] == b["slug"]:
            return
        seen.add(key)
        edges.append({
            "source_slug": a["slug"],
            "target_slug": b["slug"],
            "relationship_type": "BUNDLE",
            "confidence": round(conf, 2),
            "rule_source": rule,
            "context": ctx,
            "revenue_impact": "high",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Same product_family (tighter match — e.g., all "CLAVO PFRN 4.9mm Locking Bolts")
    # Mined FIRST so it wins over system+class (higher confidence).
    for pf, items in by_family.items():
        if len(items) < 2 or len(items) > 40:
            continue
        for i, a in enumerate(items):
            for b in items[i + 1:]:
                ctx = {"product_family": pf, "match": "product_family"}
                _add_edge(a, b, "product_family", ctx, 0.90)
                _add_edge(b, a, "product_family", ctx, 0.90)

    # Same brand_system + implant_class (e.g., all Destiknee knee_implants)
    for (bs, ic), items in by_system.items():
        if len(items) < 2 or len(items) > 60:  # Skip trivial or massive noisy groups
            continue
        for i, a in enumerate(items):
            for b in items[i + 1:]:
                ctx = {"brand_system": bs, "implant_class": ic, "match": "system+class"}
                _add_edge(a, b, "same_brand_system", ctx, 0.85)
                _add_edge(b, a, "same_brand_system", ctx, 0.85)

    return edges


async def rebuild_graph() -> dict:
    """
    Full rebuild: clears product_relationships, mines REQUIRES + BUNDLE, inserts.
    Returns stats dict.
    """
    products = await _load_products()

    # Drop & rebuild (idempotent by design)
    await product_relationships_col.delete_many({})

    requires_edges = mine_requires(products)
    bundle_edges = mine_bundle(products)
    all_edges = requires_edges + bundle_edges

    if all_edges:
        # Insert in chunks to avoid BSON size issues
        chunk = 1000
        for i in range(0, len(all_edges), chunk):
            await product_relationships_col.insert_many(all_edges[i:i + chunk])

    await ensure_indexes()

    # Coverage stats
    covered_slugs: set[str] = set()
    for e in all_edges:
        covered_slugs.add(e["source_slug"])
        covered_slugs.add(e["target_slug"])

    return {
        "total_products": len(products),
        "total_relationships": len(all_edges),
        "requires_edges": len(requires_edges),
        "bundle_edges": len(bundle_edges),
        "products_covered": len(covered_slugs),
        "coverage_pct": round(100.0 * len(covered_slugs) / max(len(products), 1), 1),
        "rebuilt_at": datetime.now(timezone.utc).isoformat(),
    }


async def ensure_indexes():
    await product_relationships_col.create_index("source_slug")
    await product_relationships_col.create_index("target_slug")
    await product_relationships_col.create_index([("source_slug", 1), ("relationship_type", 1)])
    await product_relationships_col.create_index("status")


async def get_recommendations(slug: str, limit_per_bucket: int = 12) -> dict:
    """
    Fetch product-level recommendations for a given slug, grouped into
    must_buy (REQUIRES) and bundle (BUNDLE). Joins with catalog_products
    to return display-ready cards.
    """
    product = await catalog_products_col.find_one(
        {"slug": slug, "status": {"$ne": "draft"}}, {"_id": 0}
    )
    if not product:
        return {"found": False}

    edges = await product_relationships_col.find(
        {"source_slug": slug, "status": "active"}, {"_id": 0}
    ).sort("confidence", -1).to_list(length=500)

    # Bucket by type
    buckets: dict[str, list] = {"must_buy": [], "bundle": []}
    target_slugs: set[str] = set()
    for e in edges:
        t = e["target_slug"]
        if t in target_slugs:
            continue
        target_slugs.add(t)
        key = "must_buy" if e["relationship_type"] == "REQUIRES" else "bundle"
        if len(buckets[key]) >= limit_per_bucket:
            continue
        buckets[key].append(e)

    # Fetch target product cards
    all_targets = list(target_slugs)
    target_docs = {}
    if all_targets:
        cursor = catalog_products_col.find(
            {"slug": {"$in": all_targets}},
            {
                "_id": 0,
                "slug": 1,
                "product_name_display": 1,
                "product_name": 1,
                "clinical_subtitle": 1,
                "category": 1,
                "brand": 1,
                "division_canonical": 1,
                "images": 1,
            },
        )
        async for d in cursor:
            target_docs[d["slug"]] = d

    def _enrich(edge):
        t = target_docs.get(edge["target_slug"])
        if not t:
            return None
        return {
            "slug": t["slug"],
            "product_name": t.get("product_name_display") or t.get("product_name"),
            "subtitle": t.get("clinical_subtitle", ""),
            "category": t.get("category", ""),
            "brand": t.get("brand", ""),
            "division": t.get("division_canonical", ""),
            "image": (t.get("images") or [None])[0] if isinstance(t.get("images"), list) else None,
            "confidence": edge["confidence"],
            "reason": _reason_text(edge),
        }

    def _reason_text(edge):
        ctx = edge.get("context") or {}
        if edge["relationship_type"] == "REQUIRES":
            d = ctx.get("diameter_mm")
            pb = ctx.get("plate_brand")
            sb = ctx.get("screw_brand")
            if pb and sb and pb != sb:
                return f"{d}mm diameter match ({pb} ↔ {sb} compatibility)"
            return f"{d}mm diameter match" if d else "Required accessory"
        # BUNDLE
        if ctx.get("match") == "product_family":
            return f"Same product family: {ctx.get('product_family')}"
        if ctx.get("match") == "system+class":
            return f"Same {ctx.get('brand_system')} system"
        return "Bundled component"

    must_buy = [x for x in (_enrich(e) for e in buckets["must_buy"]) if x]
    bundle = [x for x in (_enrich(e) for e in buckets["bundle"]) if x]

    return {
        "found": True,
        "product": {
            "slug": product["slug"],
            "product_name": product.get("product_name_display") or product.get("product_name"),
        },
        "must_buy": must_buy,
        "bundle": bundle,
        "total_recommendations": len(must_buy) + len(bundle),
    }


async def graph_stats() -> dict:
    total = await product_relationships_col.count_documents({"status": "active"})
    req = await product_relationships_col.count_documents(
        {"status": "active", "relationship_type": "REQUIRES"}
    )
    bun = await product_relationships_col.count_documents(
        {"status": "active", "relationship_type": "BUNDLE"}
    )
    # Distinct source slugs
    covered = await product_relationships_col.distinct("source_slug", {"status": "active"})
    total_products = await catalog_products_col.count_documents(LIVE_FILTER)
    return {
        "total_relationships": total,
        "requires_edges": req,
        "bundle_edges": bun,
        "products_covered": len(covered),
        "total_products": total_products,
        "coverage_pct": round(100.0 * len(covered) / max(total_products, 1), 1),
    }
