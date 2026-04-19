"""
Product Knowledge Graph — API Routes

Exposes product-level recommendations (REQUIRES + BUNDLE) and admin endpoints
to rebuild the graph on demand.
"""
from fastapi import APIRouter, HTTPException, Depends

from helpers import admin_required
from services.knowledge_graph import (
    get_recommendations,
    rebuild_graph,
    graph_stats,
    ensure_indexes,
)

router = APIRouter(tags=["knowledge-graph"])


@router.get("/api/products/{slug}/recommendations")
async def product_recommendations(slug: str):
    """
    Public endpoint: Returns cross-sell/upsell recommendations for a product.

    Response shape:
      { found, product, must_buy: [...], bundle: [...], total_recommendations }
    """
    result = await get_recommendations(slug)
    if not result.get("found"):
        raise HTTPException(status_code=404, detail="Product not found")
    return result


@router.get("/api/admin/knowledge-graph/stats")
async def kg_stats(admin=Depends(admin_required)):
    """Admin dashboard stats: relationship counts + coverage."""
    return await graph_stats()


@router.get("/api/admin/knowledge-graph/top")
async def kg_top_recommended(admin=Depends(admin_required), limit: int = 12):
    """
    Top products by # of incoming REQUIRES/BUNDLE edges — products that get
    recommended the most across the catalog (cross-sell hubs).
    """
    from db import db as mongo_db
    from db import catalog_products_col
    pr = mongo_db["product_relationships"]
    pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$target_slug", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    rows = await pr.aggregate(pipeline).to_list(length=limit)
    slugs = [r["_id"] for r in rows]
    docs = {}
    if slugs:
        async for d in catalog_products_col.find(
            {"slug": {"$in": slugs}},
            {"_id": 0, "slug": 1, "product_name_display": 1, "product_name": 1,
             "division_canonical": 1, "brand": 1},
        ):
            docs[d["slug"]] = d
    return {
        "top": [
            {
                "slug": r["_id"],
                "recommendation_count": r["count"],
                "product_name": (docs.get(r["_id"]) or {}).get("product_name_display") or
                                 (docs.get(r["_id"]) or {}).get("product_name") or r["_id"],
                "division": (docs.get(r["_id"]) or {}).get("division_canonical", ""),
                "brand": (docs.get(r["_id"]) or {}).get("brand", ""),
            }
            for r in rows
        ]
    }


@router.post("/api/admin/knowledge-graph/rebuild")
async def kg_rebuild(admin=Depends(admin_required)):
    """Admin: re-mine all relationships from scratch. Idempotent."""
    await ensure_indexes()
    return await rebuild_graph()
