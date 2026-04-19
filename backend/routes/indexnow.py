"""
IndexNow admin API routes — trigger instant indexing to Bing, Yandex,
Naver, Seznam for added/updated URLs.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from helpers import admin_required
from db import catalog_products_col
from services.indexnow import submit_urls, INDEXNOW_HOST

router = APIRouter(tags=["indexnow"])

SITE_BASE = f"https://{INDEXNOW_HOST}"


class URLList(BaseModel):
    urls: list[str]


@router.post("/api/admin/indexnow/submit")
async def indexnow_submit(body: URLList, admin=Depends(admin_required)):
    """Submit a custom URL list to IndexNow (admin-triggered)."""
    return await submit_urls(body.urls)


@router.post("/api/admin/indexnow/submit-all-products")
async def indexnow_submit_all_products(admin=Depends(admin_required)):
    """Submit every published catalog product URL to IndexNow in one shot."""
    urls: list[str] = [
        f"{SITE_BASE}/",
        f"{SITE_BASE}/catalog",
        f"{SITE_BASE}/districts",
        f"{SITE_BASE}/about",
        f"{SITE_BASE}/contact",
    ]

    cursor = catalog_products_col.find(
        {"status": {"$ne": "draft"}, "review_required": False},
        {"_id": 0, "slug": 1},
    )
    async for p in cursor:
        if p.get("slug"):
            urls.append(f"{SITE_BASE}/catalog/products/{p['slug']}")

    result = await submit_urls(urls)
    return {
        "total_urls": len(urls),
        **result,
    }


@router.post("/api/admin/indexnow/submit-url")
async def indexnow_submit_url(body: dict, admin=Depends(admin_required)):
    """Submit a single URL (expects {url: '...'})."""
    url = body.get("url")
    if not url:
        return {"error": "url required"}
    return await submit_urls([url])
