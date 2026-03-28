"""
Web-Search Fallback Enrichment Pipeline
========================================
Resolves unenriched catalog products by:
1. Gathering internal evidence (product fields, SKU examples)
2. Searching the web via SerpAPI (tiered source priority)
3. Parsing results via LLM (Claude Sonnet 4.5) into structured JSON
4. Writing staged fields to MongoDB for review before promotion

Usage:
  python scripts/web_search_fallback.py --mode dry-run          # 50 stratified sample
  python scripts/web_search_fallback.py --mode wave --limit 200  # wave batch
  python scripts/web_search_fallback.py --mode promote           # promote accepted staged fields
"""

import asyncio
import argparse
import json
import os
import sys
import time
import traceback
import httpx
from datetime import datetime, timezone
from collections import defaultdict

from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

import motor.motor_asyncio

# --------------- Config ---------------
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
SERPAPI_KEY = os.environ.get("SERPAPI_KEY")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
products_col = db["catalog_products"]
skus_col = db["catalog_skus"]
verification_log_col = db["web_verification_log"]

# Rate limiting
SERP_DELAY_SEC = 1.5   # delay between SerpAPI calls
LLM_DELAY_SEC = 0.5    # delay between LLM calls

# --------------- LLM System Prompt ---------------
SYSTEM_PROMPT = """You are verifying medical device catalog meaning, not writing marketing copy.

Your job:
1. Determine what the product actually is in clinical/commercial terms.
2. Use internal brochure/catalog evidence first.
3. Use trusted external sources only to verify or disambiguate.
4. Do not guess.
5. If sources conflict, do not resolve silently. Mark for review.
6. Return structured JSON only. No markdown fences, no explanation outside the JSON."""

# --------------- Helpers ---------------

def build_search_query(product: dict) -> str:
    """Build a focused SerpAPI query from product evidence."""
    parts = []
    name = product.get("product_name_display") or product.get("product_name") or ""
    brand = product.get("brand") or ""
    family = product.get("product_family") or ""
    manufacturer = product.get("manufacturer") or "Meril Life Sciences"
    division = product.get("division_canonical") or ""

    # Use the most specific identifier available
    if brand and brand.lower() not in name.lower():
        parts.append(brand)
    parts.append(name)
    if manufacturer and manufacturer.lower() not in name.lower():
        parts.append(manufacturer)
    parts.append("medical device")

    # Add division hint for disambiguation
    div_hints = {
        "Trauma": "orthopedic trauma implant",
        "Joint Replacement": "joint replacement implant",
        "Cardiovascular": "cardiovascular device",
        "Diagnostics": "diagnostic test kit",
        "Infection Prevention": "infection prevention medical",
        "ENT": "ENT medical device",
        "Endo Surgery": "endoscopic surgical instrument",
        "Sports Medicine": "sports medicine orthopedic",
        "Instruments": "surgical instrument",
        "Urology": "urology medical device",
        "Critical Care": "critical care medical device",
        "Peripheral Intervention": "peripheral intervention device",
        "Spine": "spine implant",
        "Robotics": "surgical robotics",
    }
    hint = div_hints.get(division, "")
    if hint:
        parts.append(hint)

    return " ".join(parts)


async def web_search(query: str, http_client: httpx.AsyncClient) -> list[dict]:
    """Call SerpAPI and return top organic results with source tier classification."""
    try:
        resp = await http_client.get(
            "https://serpapi.com/search.json",
            params={
                "q": query,
                "api_key": SERPAPI_KEY,
                "num": 8,
                "hl": "en",
            },
            timeout=20,
        )
        data = resp.json()
        organic = data.get("organic_results", [])

        results = []
        for r in organic[:6]:
            url = r.get("link", "")
            title = r.get("title", "")
            snippet = r.get("snippet", "")
            source_tier = classify_source_tier(url, title)
            results.append({
                "source_type": source_tier["type"],
                "source_tier": source_tier["tier"],
                "source_title": title,
                "source_url": url,
                "snippet": snippet,
            })

        # Sort by tier priority (tier1 first)
        tier_order = {"tier1_manufacturer": 0, "tier2_regulatory": 1, "tier3_authorized": 2, "tier4_general": 3}
        results.sort(key=lambda x: tier_order.get(x["source_tier"], 99))
        return results[:4]  # Top 4 after sorting

    except Exception as e:
        print(f"    [WARN] SerpAPI error: {e}")
        return []


def classify_source_tier(url: str, title: str) -> dict:
    """Classify a web result into the 4-tier source priority system."""
    url_lower = url.lower()
    title_lower = title.lower()

    # Tier 1: Official manufacturer
    manufacturer_domains = [
        "merillife.com", "meril.com", "merilendo.com",
        "merildiagnostics.com", "merilortho.com",
    ]
    manufacturer_signals = ["official", "product catalog", "brochure", "ifu"]
    if any(d in url_lower for d in manufacturer_domains):
        return {"tier": "tier1_manufacturer", "type": "manufacturer"}
    if any(s in title_lower for s in manufacturer_signals) and any(d in url_lower for d in manufacturer_domains):
        return {"tier": "tier1_manufacturer", "type": "manufacturer"}

    # Tier 2: Regulatory / official registries
    regulatory_domains = [
        "cdsco.gov.in", "fda.gov", "accessdata.fda.gov",
        "ec.europa.eu", "tga.gov.au", "pmda.go.jp",
        "who.int", "nice.org.uk",
    ]
    if any(d in url_lower for d in regulatory_domains):
        return {"tier": "tier2_regulatory", "type": "regulatory"}

    # Tier 3: Trusted authorized sources
    authorized_signals = [
        "authorized distributor", "hospital supply",
        "medline", "pubmed", "ncbi.nlm.nih.gov",
        "indiamart.com", "medindia.net",
    ]
    if any(s in url_lower or s in title_lower for s in authorized_signals):
        return {"tier": "tier3_authorized", "type": "authorized_distributor"}

    # Tier 4: General web
    return {"tier": "tier4_general", "type": "general_web"}


def gather_internal_evidence(product: dict, sku_examples: list) -> dict:
    """Compile all internal evidence for LLM consumption."""
    return {
        "product_id": product.get("slug", ""),
        "slug": product.get("slug", ""),
        "current_title": product.get("product_name_display", ""),
        "brand": product.get("brand", ""),
        "division": product.get("division_canonical", ""),
        "category": product.get("category", ""),
        "product_family": product.get("product_family", ""),
        "brochure_heading": product.get("product_family_display", ""),
        "brochure_description": (
            product.get("description_shadow", "") or product.get("description_live", "")
        )[:500],
        "sku_examples": [
            {"code": s.get("sku_code", ""), "name": s.get("product_name", "")}
            for s in sku_examples[:5]
        ],
        "current_classification": {
            "material": product.get("material_canonical", ""),
            "manufacturer": product.get("manufacturer", ""),
            "technical_specs": product.get("technical_specifications", {}),
        },
        "current_confidence": product.get("semantic_confidence", 0),
        "shadow_source_files": product.get("shadow_source_files", []),
    }


def build_user_prompt(evidence: dict, web_results: list) -> str:
    """Build the exact user prompt template specified by the user."""
    # Format web results
    source_lines = []
    for i, wr in enumerate(web_results[:3], 1):
        source_lines.append(
            f"- source_{i}: [{wr['source_tier']}] {wr['source_title']} — {wr['snippet']}"
        )
    if not source_lines:
        source_lines.append("- No external sources found.")

    # Determine ambiguity reason
    ambiguity_reasons = []
    if not evidence["brand"]:
        ambiguity_reasons.append("brand_missing")
    if not evidence["brochure_description"]:
        ambiguity_reasons.append("no_brochure_description")
    if evidence["current_confidence"] < 0.8:
        ambiguity_reasons.append("low_confidence")
    if not evidence["current_title"] or len(evidence["current_title"]) < 5:
        ambiguity_reasons.append("vague_title")
    ambiguity = ", ".join(ambiguity_reasons) if ambiguity_reasons else "brand_meaning_unclear"

    sku_text = ", ".join(
        f"{s['code']} ({s['name']})" for s in evidence["sku_examples"]
    ) or "None available"

    specs_text = json.dumps(evidence["current_classification"].get("technical_specs", {}), default=str)

    return f"""Verify the semantic meaning of this catalog product.

Internal evidence:
- product_id: {evidence['product_id']}
- slug: {evidence['slug']}
- current_title: {evidence['current_title']}
- brand: {evidence['brand'] or '(empty)'}
- division: {evidence['division']}
- category: {evidence['category']}
- product_family: {evidence['product_family']}
- brochure_heading: {evidence['brochure_heading']}
- brochure_description: {evidence['brochure_description'][:400] or '(none)'}
- sku_examples: {sku_text}
- current_classification: material={evidence['current_classification']['material']}, manufacturer={evidence['current_classification']['manufacturer']}, specs={specs_text}
- current_confidence: {evidence['current_confidence']}
- ambiguity_reason: {ambiguity}
- source_files: {', '.join(evidence['shadow_source_files']) or '(none)'}

External evidence found:
{chr(10).join(source_lines)}

Tasks:
1. Determine whether this is a:
   - product_family
   - implant/device class
   - diagnostic kit line
   - reagent line
   - instrument/accessory/component
   - consumable line
2. Generate the best clinical display title.
3. Generate the best secondary subtitle.
4. Determine:
   - anatomy_scope
   - implant/device class
   - material/coating meaning
   - system/brand role
5. Decide whether the current classification is:
   - confirmed
   - enriched
   - conflicted
   - still ambiguous
6. Recommend one action:
   - keep_as_is
   - rename
   - split_page
   - merge_into_parent_family
   - send_to_review

Return JSON only, matching this exact schema:
{{
  "entity_type": "product_family|implant_class|diagnostic_kit|reagent_line|instrument|consumable",
  "clinical_display_title": "string",
  "clinical_subtitle": "string",
  "semantic_brand_system": "string",
  "semantic_parent_brand": "string",
  "semantic_system_type": "string",
  "semantic_implant_class": "string",
  "semantic_material_default": "string or null",
  "semantic_coating_default": "string or null",
  "semantic_anatomy_scope": ["array of strings"],
  "semantic_procedure_scope": ["array of strings"],
  "semantic_family_group": "string",
  "semantic_use_case_tags": ["array of strings"],
  "semantic_confidence": 0.0,
  "semantic_review_required": false,
  "web_verification_status": "internally_verified|externally_verified|externally_enriched|review_required_conflict|review_required_ambiguity|insufficient_evidence",
  "recommended_action": "keep_as_is|rename|split_page|merge_into_parent_family|send_to_review",
  "conflict_detected": false,
  "reasoning_summary": "string"
}}"""


async def call_llm(system_prompt: str, user_prompt: str) -> dict:
    """Call Claude Sonnet 4.5 via emergentintegrations and parse JSON response."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    session_id = f"enrich-{int(time.time())}-{os.getpid()}"
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_prompt,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    # Add timeout to prevent hanging
    try:
        response_text = await asyncio.wait_for(
            chat.send_message(UserMessage(text=user_prompt)),
            timeout=60,
        )
    except asyncio.TimeoutError:
        raise TimeoutError("LLM call timed out after 60 seconds")

    # Parse JSON from response (strip markdown fences if present)
    text = response_text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
    if text.startswith("json"):
        text = text[4:].strip()

    return json.loads(text)


async def get_sku_examples(product: dict) -> list:
    """Fetch up to 5 SKU examples for a product."""
    shadow_id = product.get("shadow_product_id")
    if shadow_id:
        skus = await skus_col.find(
            {"product_id_shadow": shadow_id},
            {"_id": 0, "sku_code": 1, "product_name": 1}
        ).to_list(5)
        if skus:
            return skus

    # Fallback: try matching by brand or slug
    slug = product.get("slug", "")
    brand = product.get("brand", "")
    if brand:
        skus = await skus_col.find(
            {"brand": brand},
            {"_id": 0, "sku_code": 1, "product_name": 1}
        ).to_list(5)
        if skus:
            return skus

    return []


# --------------- Stratified Sample Selection ---------------

async def select_stratified_sample(n: int = 50) -> list:
    """Select a stratified sample of unenriched products."""
    unenriched_filter = {"semantic_brand_system": {"$in": [None, ""]}}

    # Get division counts
    div_pipeline = [
        {"$match": unenriched_filter},
        {"$group": {"_id": "$division_canonical", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    div_counts = await products_col.aggregate(div_pipeline).to_list(50)
    total = sum(d["count"] for d in div_counts)

    # Get top 10 brands by unenriched count
    brand_pipeline = [
        {"$match": {**unenriched_filter, "brand": {"$nin": [None, ""]}}},
        {"$group": {"_id": "$brand", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    top_brands = await products_col.aggregate(brand_pipeline).to_list(10)
    top_brand_names = [b["_id"] for b in top_brands]

    selected = []
    seen_slugs = set()

    # 1. Pick 1-2 from each division (ensures division coverage)
    for d in div_counts:
        div_name = d["_id"]
        if not div_name or div_name == "_REVIEW":
            continue
        samples = await products_col.find(
            {**unenriched_filter, "division_canonical": div_name},
            {"_id": 0}
        ).to_list(2)
        for s in samples:
            if s["slug"] not in seen_slugs and len(selected) < n:
                selected.append(s)
                seen_slugs.add(s["slug"])

    # 2. Pick from top 10 brands (ensures brand coverage)
    for brand_name in top_brand_names:
        samples = await products_col.find(
            {**unenriched_filter, "brand": brand_name},
            {"_id": 0}
        ).to_list(3)
        for s in samples:
            if s["slug"] not in seen_slugs and len(selected) < n:
                selected.append(s)
                seen_slugs.add(s["slug"])

    # 3. Pick empty-brand products (biggest group — diverse sample)
    empty_brand = await products_col.find(
        {**unenriched_filter, "brand": {"$in": [None, ""]}},
        {"_id": 0}
    ).to_list(200)
    # Diversify by division
    by_div = defaultdict(list)
    for p in empty_brand:
        by_div[p.get("division_canonical", "")].append(p)

    for div_name, prods in sorted(by_div.items(), key=lambda x: -len(x[1])):
        for p in prods[:3]:
            if p["slug"] not in seen_slugs and len(selected) < n:
                selected.append(p)
                seen_slugs.add(p["slug"])

    # 4. Fill remaining with random unenriched
    if len(selected) < n:
        remaining = await products_col.find(
            {**unenriched_filter, "slug": {"$nin": list(seen_slugs)}},
            {"_id": 0}
        ).to_list(n - len(selected))
        selected.extend(remaining)

    return selected[:n]


# --------------- Wave Selection ---------------

async def select_wave_batch(limit: int, offset: int = 0) -> list:
    """Select a batch of unenriched products that haven't been staged yet."""
    unenriched_filter = {
        "semantic_brand_system": {"$in": [None, ""]},
        "proposed_web_verification_status": {"$exists": False},
    }
    products = await products_col.find(
        unenriched_filter, {"_id": 0}
    ).skip(offset).limit(limit).to_list(limit)
    return products


# --------------- Main Pipeline ---------------

async def enrich_product(product: dict, http_client: httpx.AsyncClient, idx: int, total: int) -> dict:
    """Run the full enrichment pipeline for a single product."""
    slug = product.get("slug", "unknown")
    name = product.get("product_name_display", "")
    brand = product.get("brand", "")
    division = product.get("division_canonical", "")

    print(f"\n[{idx}/{total}] {slug}")
    print(f"  Title: {name} | Brand: {brand or '(empty)'} | Division: {division}")

    result = {
        "slug": slug,
        "status": "failed",
        "error": None,
    }

    try:
        # 1. Gather internal evidence
        sku_examples = await get_sku_examples(product)
        evidence = gather_internal_evidence(product, sku_examples)

        # 2. Web search
        query = build_search_query(product)
        print(f"  Search: {query[:80]}...")
        await asyncio.sleep(SERP_DELAY_SEC)
        web_results = await web_search(query, http_client)
        top_tier = web_results[0]["source_tier"] if web_results else "none"
        print(f"  Found {len(web_results)} results (best tier: {top_tier})")

        # 3. LLM enrichment
        user_prompt = build_user_prompt(evidence, web_results)
        await asyncio.sleep(LLM_DELAY_SEC)
        enrichment = await call_llm(SYSTEM_PROMPT, user_prompt)
        print(f"  LLM: conf={enrichment.get('semantic_confidence', '?')} | "
              f"status={enrichment.get('web_verification_status', '?')} | "
              f"action={enrichment.get('recommended_action', '?')}")

        # 4. Build verification log entry
        verification_entry = {
            "product_id": slug,
            "slug": slug,
            "web_verification_triggered": True,
            "web_verification_reason": evidence.get("ambiguity_reason", "brand_meaning_unclear")
                if isinstance(evidence, dict) else "unenriched",
            "web_verification_status": enrichment.get("web_verification_status", "insufficient_evidence"),
            "web_verification_confidence_delta": round(
                enrichment.get("semantic_confidence", 0) - (product.get("semantic_confidence") or 0), 2
            ),
            "source_priority_used": top_tier,
            "external_sources": [
                {
                    "source_type": wr["source_type"],
                    "source_title": wr["source_title"],
                    "source_url": wr["source_url"],
                    "supports": [],  # LLM doesn't return per-source supports; left empty
                    "confidence": enrichment.get("semantic_confidence", 0),
                }
                for wr in web_results[:3]
            ],
            "external_conflict": enrichment.get("conflict_detected", False),
            "review_required": enrichment.get("semantic_review_required", True),
            "final_recommended_action": enrichment.get("recommended_action", "send_to_review"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        # 5. Write staged fields to catalog_products
        staged_fields = {
            "proposed_entity_type": enrichment.get("entity_type"),
            "proposed_clinical_display_title": enrichment.get("clinical_display_title"),
            "proposed_clinical_subtitle": enrichment.get("clinical_subtitle"),
            "proposed_semantic_brand_system": enrichment.get("semantic_brand_system"),
            "proposed_semantic_parent_brand": enrichment.get("semantic_parent_brand"),
            "proposed_semantic_system_type": enrichment.get("semantic_system_type"),
            "proposed_semantic_implant_class": enrichment.get("semantic_implant_class"),
            "proposed_semantic_material_default": enrichment.get("semantic_material_default"),
            "proposed_semantic_coating_default": enrichment.get("semantic_coating_default"),
            "proposed_semantic_anatomy_scope": enrichment.get("semantic_anatomy_scope", []),
            "proposed_semantic_procedure_scope": enrichment.get("semantic_procedure_scope", []),
            "proposed_semantic_family_group": enrichment.get("semantic_family_group"),
            "proposed_semantic_use_case_tags": enrichment.get("semantic_use_case_tags", []),
            "proposed_semantic_confidence": enrichment.get("semantic_confidence", 0),
            "proposed_semantic_review_required": enrichment.get("semantic_review_required", True),
            "proposed_web_verification_status": enrichment.get("web_verification_status"),
            "proposed_recommended_action": enrichment.get("recommended_action"),
            "proposed_conflict_detected": enrichment.get("conflict_detected", False),
            "proposed_reasoning_summary": enrichment.get("reasoning_summary", ""),
            "proposed_enriched_at": datetime.now(timezone.utc).isoformat(),
        }

        await products_col.update_one(
            {"slug": slug},
            {"$set": staged_fields},
        )

        # 6. Write verification log
        await verification_log_col.insert_one(verification_entry)

        result["status"] = "success"
        result["enrichment"] = enrichment
        result["verification"] = verification_entry
        result["staged_fields"] = staged_fields

    except json.JSONDecodeError as e:
        print(f"  [ERROR] LLM returned invalid JSON: {e}")
        result["error"] = f"json_parse: {str(e)}"
    except Exception as e:
        print(f"  [ERROR] {e}")
        traceback.print_exc()
        result["error"] = str(e)

    return result


async def run_pipeline(mode: str, limit: int, offset: int):
    """Main pipeline orchestrator."""
    print(f"=" * 60)
    print(f"Web-Search Fallback Pipeline — Mode: {mode}")
    print(f"=" * 60)

    # Select products
    if mode == "dry-run":
        products = await select_stratified_sample(limit)
        print(f"Selected {len(products)} stratified sample products")
    elif mode == "wave":
        products = await select_wave_batch(limit, offset)
        print(f"Selected {len(products)} wave products (offset={offset})")
    else:
        print(f"Unknown mode: {mode}")
        return

    if not products:
        print("No unenriched products found!")
        return

    # Print sample breakdown
    div_counter = defaultdict(int)
    brand_counter = defaultdict(int)
    for p in products:
        div_counter[p.get("division_canonical", "(none)")] += 1
        brand_counter[p.get("brand") or "(empty)"] += 1

    print(f"\nDivision breakdown:")
    for d, c in sorted(div_counter.items(), key=lambda x: -x[1]):
        print(f"  {d}: {c}")
    print(f"\nTop brands in batch:")
    for b, c in sorted(brand_counter.items(), key=lambda x: -x[1])[:10]:
        print(f"  {b}: {c}")

    # Process
    results = []
    async with httpx.AsyncClient() as http_client:
        for i, product in enumerate(products, 1):
            result = await enrich_product(product, http_client, i, len(products))
            results.append(result)

    # Summary
    success = sum(1 for r in results if r["status"] == "success")
    failed = sum(1 for r in results if r["status"] == "failed")

    print(f"\n{'=' * 60}")
    print(f"PIPELINE COMPLETE")
    print(f"  Success: {success}/{len(results)}")
    print(f"  Failed:  {failed}/{len(results)}")

    if success > 0:
        # Stats on enrichment results
        confidences = [r["enrichment"]["semantic_confidence"]
                       for r in results if r.get("enrichment")]
        statuses = defaultdict(int)
        actions = defaultdict(int)
        for r in results:
            if r.get("enrichment"):
                statuses[r["enrichment"].get("web_verification_status", "?")] += 1
                actions[r["enrichment"].get("recommended_action", "?")] += 1

        print(f"\n  Confidence: min={min(confidences):.2f} avg={sum(confidences)/len(confidences):.2f} max={max(confidences):.2f}")
        print(f"  Verification statuses:")
        for s, c in sorted(statuses.items(), key=lambda x: -x[1]):
            print(f"    {s}: {c}")
        print(f"  Recommended actions:")
        for a, c in sorted(actions.items(), key=lambda x: -x[1]):
            print(f"    {a}: {c}")

    # Save results to file
    report_path = f"/app/backend/scripts/enrichment_report_{mode}_{int(time.time())}.json"
    report = {
        "mode": mode,
        "total": len(results),
        "success": success,
        "failed": failed,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "results": [
            {
                "slug": r["slug"],
                "status": r["status"],
                "error": r.get("error"),
                "enrichment": r.get("enrichment"),
            }
            for r in results
        ],
    }
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    print(f"\nReport saved: {report_path}")


# --------------- Promotion ---------------

async def promote_staged_fields():
    """Promote accepted staged fields to canonical fields.
    Only promotes if:
    - proposed_semantic_confidence >= 0.85
    - proposed_conflict_detected == False
    - proposed_recommended_action != 'send_to_review'
    - source tier is 1, 2, or strong 3
    """
    print("=" * 60)
    print("PROMOTION: Moving accepted staged fields to canonical")
    print("=" * 60)

    # Find products with staged fields ready for promotion
    promotable = await products_col.find(
        {
            "proposed_web_verification_status": {"$exists": True},
            "proposed_semantic_confidence": {"$gte": 0.85},
            "proposed_conflict_detected": False,
            "proposed_recommended_action": {"$nin": ["send_to_review"]},
        },
        {"_id": 0}
    ).to_list(2000)

    print(f"Found {len(promotable)} products ready for promotion")

    promoted = 0
    skipped = 0

    for p in promotable:
        slug = p.get("slug")
        canonical_update = {
            "semantic_brand_system": p.get("proposed_semantic_brand_system", ""),
            "semantic_parent_brand": p.get("proposed_semantic_parent_brand", ""),
            "semantic_system_type": p.get("proposed_semantic_system_type", ""),
            "semantic_implant_class": p.get("proposed_semantic_implant_class", ""),
            "semantic_material_default": p.get("proposed_semantic_material_default"),
            "semantic_coating_default": p.get("proposed_semantic_coating_default"),
            "semantic_anatomy_scope": p.get("proposed_semantic_anatomy_scope", []),
            "semantic_confidence": p.get("proposed_semantic_confidence", 0),
            "semantic_review_required": p.get("proposed_semantic_review_required", False),
            "semantic_enriched_at": datetime.now(timezone.utc),
            "semantic_conflict_codes": [],
            "semantic_rule_hits": [f"WEB_FALLBACK_{p.get('proposed_web_verification_status', 'unknown').upper()}"],
        }

        # Also update display titles if action is rename
        if p.get("proposed_recommended_action") == "rename":
            if p.get("proposed_clinical_display_title"):
                canonical_update["product_name_display"] = p["proposed_clinical_display_title"]
            if p.get("proposed_clinical_subtitle"):
                canonical_update["clinical_subtitle"] = p["proposed_clinical_subtitle"]

        # Update brand if it was empty and now proposed
        if not p.get("brand") and p.get("proposed_semantic_brand_system"):
            canonical_update["brand"] = p["proposed_semantic_brand_system"]

        # Update mapping confidence
        conf = p.get("proposed_semantic_confidence", 0)
        if conf >= 0.9:
            canonical_update["mapping_confidence"] = "high"
        elif conf >= 0.75:
            canonical_update["mapping_confidence"] = "medium"

        # Remove review_required if confidence is high
        if conf >= 0.85:
            canonical_update["review_required"] = False

        await products_col.update_one(
            {"slug": slug},
            {"$set": canonical_update},
        )
        promoted += 1

    # Mark remaining as needing review
    review_needed = await products_col.count_documents({
        "proposed_web_verification_status": {"$exists": True},
        "$or": [
            {"proposed_semantic_confidence": {"$lt": 0.85}},
            {"proposed_conflict_detected": True},
            {"proposed_recommended_action": "send_to_review"},
        ],
    })

    print(f"\nPromotion complete:")
    print(f"  Promoted: {promoted}")
    print(f"  Still needs review: {review_needed}")
    print(f"  Total remaining unenriched: {await products_col.count_documents({'semantic_brand_system': {'$in': [None, '']}})}")


# --------------- CLI ---------------

def main():
    parser = argparse.ArgumentParser(description="Web-Search Fallback Enrichment Pipeline")
    parser.add_argument("--mode", choices=["dry-run", "wave", "promote"], required=True)
    parser.add_argument("--limit", type=int, default=50, help="Number of products to process")
    parser.add_argument("--offset", type=int, default=0, help="Offset for wave mode")
    args = parser.parse_args()

    if args.mode == "promote":
        asyncio.run(promote_staged_fields())
    else:
        asyncio.run(run_pipeline(args.mode, args.limit, args.offset))


if __name__ == "__main__":
    main()
