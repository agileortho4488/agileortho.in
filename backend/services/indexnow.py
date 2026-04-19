"""
IndexNow Integration — real-time indexing notifications for Bing, Yandex,
Naver, Seznam, and any other IndexNow-compliant search engine.

Docs: https://www.indexnow.org/documentation

Usage:
  from services.indexnow import submit_urls
  await submit_urls(["https://www.agileortho.in/catalog/products/foo"])
"""
from __future__ import annotations

import asyncio
from typing import Iterable

import httpx

INDEXNOW_HOST = "www.agileortho.in"
INDEXNOW_KEY = "1aba0e33283d4f07a047b9ef333dea47"
INDEXNOW_KEY_LOCATION = f"https://{INDEXNOW_HOST}/{INDEXNOW_KEY}.txt"
INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow"

# IndexNow accepts up to 10,000 URLs per request.
MAX_BATCH = 10_000


async def submit_urls(urls: Iterable[str]) -> dict:
    """
    POST a batch of URLs to IndexNow. Returns {status_code, submitted, message}.
    Silently accepts empty lists (no-op).
    """
    url_list = [u for u in urls if u]
    if not url_list:
        return {"status_code": 0, "submitted": 0, "message": "no urls"}

    # Chunk if larger than IndexNow's limit (rare)
    results = []
    for i in range(0, len(url_list), MAX_BATCH):
        chunk = url_list[i : i + MAX_BATCH]
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                INDEXNOW_ENDPOINT,
                headers={"Content-Type": "application/json; charset=utf-8"},
                json={
                    "host": INDEXNOW_HOST,
                    "key": INDEXNOW_KEY,
                    "keyLocation": INDEXNOW_KEY_LOCATION,
                    "urlList": chunk,
                },
            )
        results.append({
            "status_code": resp.status_code,
            "submitted": len(chunk),
            "body": resp.text[:300] if resp.status_code >= 400 else "ok",
        })
    total = sum(r["submitted"] for r in results)
    return {
        "submitted": total,
        "batches": len(results),
        "results": results,
    }


async def submit_single_url(url: str) -> dict:
    """Fire-and-forget helper for a single URL."""
    return await submit_urls([url])


def schedule_submit(urls: list[str]) -> None:
    """
    Non-blocking fire-and-forget — schedule an IndexNow submit on the current
    event loop without awaiting. Safe to call from sync code paths.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(submit_urls(urls))
    except RuntimeError:
        # No running loop — just skip rather than raise.
        pass
