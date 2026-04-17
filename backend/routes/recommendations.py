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


@router.post("/api/admin/knowledge-graph/rebuild")
async def kg_rebuild(admin=Depends(admin_required)):
    """Admin: re-mine all relationships from scratch. Idempotent."""
    await ensure_indexes()
    return await rebuild_graph()
