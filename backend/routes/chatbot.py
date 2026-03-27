"""
Chatbot route — queries Batch 1 shadow DB for product intelligence.
Uses keyword-based retrieval from training chunks.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db import shadow_products_col, shadow_skus_col, shadow_brands_col, shadow_chunks_col
import re

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])


class ChatQuery(BaseModel):
    question: str
    top_k: Optional[int] = 5


class ChatResponse(BaseModel):
    answer: str
    sources: list
    confidence: str


def extract_search_terms(question: str) -> list:
    stop_words = {"what", "is", "the", "a", "an", "of", "for", "in", "to", "and", "or",
                  "how", "many", "which", "are", "does", "do", "can", "with", "from",
                  "available", "about", "between", "difference", "tell", "me", "give",
                  "show", "list", "all", "have", "has", "been", "this", "that", "there"}
    words = re.findall(r'\b[a-zA-Z0-9./-]+\b', question)
    terms = [w for w in words if w.lower() not in stop_words and len(w) > 1]
    return terms


async def search_chunks(terms: list, top_k: int = 5) -> list:
    all_chunks = []
    cursor = shadow_chunks_col.find({}, {"_id": 0, "_batch": 0, "_uploaded_at": 0})
    async for chunk in cursor:
        text_lower = chunk.get("text", "").lower()
        score = sum(1 for term in terms if term.lower() in text_lower)
        if score > 0:
            all_chunks.append({"score": score, "chunk": chunk})

    all_chunks.sort(key=lambda x: -x["score"])
    return all_chunks[:top_k]


def format_answer(chunks: list, question: str) -> dict:
    if not chunks:
        return {
            "answer": "I don't have enough information to answer this question from the current product database. This may be covered in brochures not yet processed.",
            "sources": [],
            "confidence": "low"
        }

    answer_parts = []
    sources = []
    seen_sources = set()

    for item in chunks:
        chunk = item["chunk"]
        text = chunk.get("text", "")
        meta = chunk.get("metadata", {})

        answer_parts.append(text)

        source_file = meta.get("source_file", "")
        if source_file and source_file not in seen_sources:
            seen_sources.add(source_file)
            sources.append({
                "file": source_file,
                "extraction_id": meta.get("extraction_id", ""),
                "page": meta.get("source_page", "unknown"),
                "brand": meta.get("brand", ""),
                "relevance_score": item["score"]
            })

    avg_score = sum(i["score"] for i in chunks) / len(chunks) if chunks else 0
    confidence = "high" if avg_score >= 3 else ("medium" if avg_score >= 1.5 else "low")

    return {
        "answer": "\n\n---\n\n".join(answer_parts[:3]),
        "sources": sources[:5],
        "confidence": confidence
    }


@router.post("/query", response_model=ChatResponse)
async def chatbot_query(query: ChatQuery):
    terms = extract_search_terms(query.question)
    if not terms:
        raise HTTPException(status_code=400, detail="Could not extract meaningful search terms from question")

    chunks = await search_chunks(terms, query.top_k)
    result = format_answer(chunks, query.question)
    return result


@router.get("/brands")
async def list_brands():
    brands = []
    cursor = shadow_brands_col.find({}, {"_id": 0, "_batch": 0, "_uploaded_at": 0})
    async for doc in cursor:
        brands.append(doc)
    return {"brands": brands, "total": len(brands)}


@router.get("/products")
async def list_products(brand: Optional[str] = None, division: Optional[str] = None, limit: int = 50):
    query = {}
    if brand:
        query["brand"] = {"$regex": brand, "$options": "i"}
    if division:
        query["division"] = {"$regex": division, "$options": "i"}

    products = []
    cursor = shadow_products_col.find(query, {"_id": 0, "_batch": 0, "_uploaded_at": 0}).limit(limit)
    async for doc in cursor:
        products.append(doc)
    return {"products": products, "total": len(products)}


@router.get("/skus")
async def search_skus(code: Optional[str] = None, brand: Optional[str] = None, limit: int = 50):
    query = {}
    if code:
        query["sku_code"] = {"$regex": code, "$options": "i"}
    if brand:
        query["brand"] = {"$regex": brand, "$options": "i"}

    skus = []
    cursor = shadow_skus_col.find(query, {"_id": 0, "_batch": 0, "_uploaded_at": 0}).limit(limit)
    async for doc in cursor:
        skus.append(doc)
    return {"skus": skus, "total": len(skus)}


@router.get("/stats")
async def shadow_stats():
    products = await shadow_products_col.count_documents({})
    skus = await shadow_skus_col.count_documents({})
    brands = await shadow_brands_col.count_documents({})
    chunks = await shadow_chunks_col.count_documents({})
    return {
        "shadow_db_stats": {
            "products": products,
            "skus": skus,
            "brands": brands,
            "chunks": chunks,
            "batch": "batch_1_to_6",
            "status": "active"
        }
    }
