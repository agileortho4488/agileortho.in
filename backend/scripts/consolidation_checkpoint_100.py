#!/usr/bin/env python3
"""
Consolidation Checkpoint: Files 1-100
Rebuilds the ENTIRE normalized dataset from structured drafts.
Single source of truth: structured_drafts/ JSON files.

Produces:
- Deduplicated products_master.json
- Deduplicated sku_master.json
- Updated brand_hierarchy.json
- Merged training chunks
- Full reconciliation report
"""
import json
import os
import glob
import hashlib
from collections import defaultdict
from datetime import datetime, timezone

BASE_DIR = "/app/backend/brochure_intelligence"
DRAFT_DIR = os.path.join(BASE_DIR, "structured_drafts")
NORM_DIR = os.path.join(BASE_DIR, "normalized_products")
CHUNKS_DIR = os.path.join(BASE_DIR, "training_chunks")
LOGS_DIR = os.path.join(BASE_DIR, "logs")
NOW = datetime.now(timezone.utc).isoformat()


def gen_product_id(name, brand):
    """Deterministic product ID from name+brand."""
    key = f"{name.strip()}|{brand.strip()}".lower()
    return hashlib.md5(key.encode()).hexdigest()[:16]


def load_json(path):
    with open(path) as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def get_batch(fnum):
    if fnum <= 25: return "batch_1"
    if fnum <= 50: return "batch_2"
    if fnum <= 75: return "batch_3"
    if fnum <= 100: return "batch_4"
    return f"batch_{(fnum-1)//25 + 1}"


# ============================================================
# PHASE 1: Full extraction from ALL structured drafts
# ============================================================
def phase1_extract_all():
    """Extract every product and SKU from all 100 structured drafts."""
    print("=" * 70)
    print("PHASE 1: FULL EXTRACTION FROM STRUCTURED DRAFTS (1-100)")
    print("=" * 70)

    # Tracking
    all_products = {}  # pid -> product dict
    all_skus = {}      # code -> sku dict  
    raw_product_count = 0
    raw_sku_occurrences = 0
    sku_occurrence_log = []  # (code, file_id, page)
    cross_file_dupes = defaultdict(list)  # pid -> [(file_id, name, brand)]
    file_stats = {}
    missing_files = []
    files_with_skus = 0
    files_without_skus = 0

    for fnum in range(1, 101):
        if fnum == 8:  # Blocked file
            missing_files.append({"file": 8, "reason": "Corrupted DOCX (BadZipFile)"})
            continue

        matches = glob.glob(os.path.join(DRAFT_DIR, f"{fnum:03d}_*_draft.json"))
        if not matches:
            missing_files.append({"file": fnum, "reason": "No structured draft found"})
            continue

        draft = load_json(matches[0])
        products = draft.get("products", [])
        batch = get_batch(fnum)
        eid = draft.get("extraction_id", f"{fnum:03d}")
        source_file = draft.get("source_file", "")

        if not products:
            files_without_skus += 1
            file_stats[fnum] = {
                "source": source_file[:60],
                "batch": batch,
                "products": 0,
                "skus": 0,
                "has_skus": False,
                "content_type": draft.get("content_type", ""),
                "sku_verdict": draft.get("_sku_verification", {}).get("verdict", "")
            }
            continue

        files_with_skus += 1
        file_products = 0
        file_skus = 0

        for p in products:
            raw_product_count += 1
            name = p["name"].strip()
            brand = p.get("brand", "Unknown").strip()
            pid = gen_product_id(name, brand)

            if pid in all_products:
                # DUPLICATE — same product in multiple files
                cross_file_dupes[pid].append((eid, name, brand, source_file))
                # Merge source references
                if eid not in all_products[pid]["source_extraction_ids"]:
                    all_products[pid]["source_extraction_ids"].append(eid)
                    all_products[pid]["source_files"].append(source_file)
            else:
                all_products[pid] = {
                    "product_id": pid,
                    "name": name,
                    "brand": brand,
                    "parent_brand": "Meril",
                    "division": p.get("division", "Unknown"),
                    "sub_category": p.get("category", ""),
                    "description": p.get("description", ""),
                    "source_extraction_ids": [eid],
                    "source_files": [source_file],
                    "source_pages": [p.get("source_page", "")],
                    "_batch": batch,
                    "_first_seen_file": fnum,
                    "_normalized_at": NOW
                }

            file_products += 1

            # Process SKUs
            for s in p.get("skus", []):
                code = s.get("code", s.get("sku_code", ""))
                if not code:
                    continue

                raw_sku_occurrences += 1
                file_skus += 1
                sku_occurrence_log.append({
                    "code": code,
                    "file_id": eid,
                    "source_file": source_file,
                    "page": s.get("source_page", p.get("source_page", "")),
                    "product_name": name
                })

                if code not in all_skus:
                    all_skus[code] = {
                        "sku_code": code,
                        "product_id": pid,
                        "product_name": name,
                        "brand": brand,
                        "division": p.get("division", "Unknown"),
                        "sub_category": p.get("category", ""),
                        "description": s.get("description", ""),
                        "source_extraction_id": eid,
                        "source_file": source_file,
                        "source_page": s.get("source_page", p.get("source_page", "")),
                        "_batch": batch,
                        "_first_seen_file": fnum
                    }
                # else: duplicate SKU across files (tracked in occurrence_log)

        file_stats[fnum] = {
            "source": source_file[:60],
            "batch": batch,
            "products": file_products,
            "skus": file_skus,
            "has_skus": True
        }

    metrics = {
        "raw_product_count": raw_product_count,
        "unique_products_after_dedupe": len(all_products),
        "raw_sku_occurrences": raw_sku_occurrences,
        "unique_sku_codes": len(all_skus),
        "cross_file_product_dupes": len(cross_file_dupes),
        "files_with_skus": files_with_skus,
        "files_without_skus": files_without_skus,
        "missing_files": missing_files,
        "sku_code_overlap": raw_sku_occurrences - len(all_skus),
    }

    print(f"\n--- Phase 1 Results ---")
    print(f"Raw extracted products (all drafts): {raw_product_count}")
    print(f"Unique products after name+brand dedupe: {len(all_products)}")
    print(f"Products deduplicated (cross-file): {raw_product_count - len(all_products)}")
    print(f"Total SKU occurrences/source mentions: {raw_sku_occurrences}")
    print(f"Unique SKU codes: {len(all_skus)}")
    print(f"SKU overlap (same code, multiple files): {raw_sku_occurrences - len(all_skus)}")
    print(f"Files with SKUs: {files_with_skus}")
    print(f"Files without SKUs: {files_without_skus}")
    print(f"Missing/blocked files: {len(missing_files)}")

    return all_products, all_skus, metrics, cross_file_dupes, sku_occurrence_log, file_stats


# ============================================================
# PHASE 2: Cross-batch dedupe and conflict review
# ============================================================
def phase2_cross_batch_review(all_products, all_skus, cross_file_dupes):
    """Review cross-batch duplicates and resolve conflicts."""
    print(f"\n{'=' * 70}")
    print("PHASE 2: CROSS-BATCH DEDUPE & CONFLICT REVIEW")
    print(f"{'=' * 70}")

    conflict_log = []

    # Check product dedupes by batch
    batch_cross_dupes = defaultdict(list)
    for pid, dupe_list in cross_file_dupes.items():
        batches = set()
        for eid, name, brand, sf in dupe_list:
            for b_start, b_end, b_name in [(1,25,"batch_1"),(26,50,"batch_2"),(51,75,"batch_3"),(76,100,"batch_4")]:
                if eid.isdigit() and b_start <= int(eid) <= b_end:
                    batches.add(b_name)
        if len(batches) > 1:
            batch_cross_dupes[pid] = {
                "product": all_products[pid]["name"],
                "brand": all_products[pid]["brand"],
                "batches": sorted(batches),
                "files": [(e, s) for e, _, _, s in dupe_list]
            }

    print(f"Cross-batch product duplicates: {len(batch_cross_dupes)}")
    for pid, info in batch_cross_dupes.items():
        print(f"  \"{info['product']}\" ({info['brand']}): {info['batches']}")
        conflict_log.append({
            "type": "cross_batch_product_dupe",
            "product_id": pid,
            "product_name": info["product"],
            "brand": info["brand"],
            "batches": info["batches"],
            "files": info["files"],
            "resolution": "MERGED — kept first occurrence, added cross-references"
        })

    # Check SKU-to-product mapping consistency
    sku_product_conflicts = []
    for code, sku_data in all_skus.items():
        # Verify product_id is valid
        if sku_data["product_id"] not in all_products:
            sku_product_conflicts.append({
                "sku_code": code,
                "orphan_product_id": sku_data["product_id"],
                "product_name": sku_data["product_name"]
            })

    if sku_product_conflicts:
        print(f"\nOrphan SKUs (product_id not in products): {len(sku_product_conflicts)}")
        for c in sku_product_conflicts[:5]:
            print(f"  {c['sku_code']} -> orphan pid={c['orphan_product_id']} ({c['product_name']})")
    else:
        print("No orphan SKUs — all SKU product_ids are valid.")

    return conflict_log, batch_cross_dupes


# ============================================================
# PHASE 3: Brand hierarchy and alias normalization
# ============================================================
def phase3_brand_hierarchy(all_products, all_skus):
    """Build clean brand hierarchy from scratch."""
    print(f"\n{'=' * 70}")
    print("PHASE 3: BRAND HIERARCHY & ALIAS NORMALIZATION")
    print(f"{'=' * 70}")

    # Collect all unique brands and their divisions/categories
    brand_data = defaultdict(lambda: {
        "parent_brand": "Meril",
        "divisions": set(),
        "categories": set(),
        "product_count": 0,
        "sku_count": 0,
        "source_files": set()
    })

    for pid, prod in all_products.items():
        brand = prod["brand"]
        bd = brand_data[brand]
        bd["divisions"].add(prod["division"])
        if prod["sub_category"]:
            bd["categories"].add(prod["sub_category"])
        bd["product_count"] += 1
        for sf in prod.get("source_files", []):
            bd["source_files"].add(sf[:30])

    for code, sku in all_skus.items():
        brand_data[sku["brand"]]["sku_count"] += 1

    # Build hierarchy by division
    divisions = defaultdict(lambda: {
        "total_products": 0,
        "total_skus": 0,
        "brands": {}
    })

    for brand, bd in brand_data.items():
        for div in bd["divisions"]:
            div_cats = [c for c in bd["categories"]]
            div_products = [pid for pid, p in all_products.items() if p["brand"] == brand and p["division"] == div]
            div_skus = [c for c, s in all_skus.items() if s["brand"] == brand and s["division"] == div]

            divisions[div]["brands"][brand] = {
                "parent_brand": "Meril",
                "products": len(div_products),
                "skus": len(div_skus),
                "sub_categories": sorted(bd["categories"]),
                "source_files": sorted(list(bd["source_files"]))[:10]
            }
            divisions[div]["total_products"] += len(div_products)
            divisions[div]["total_skus"] += len(div_skus)

    # Known brand aliases to check
    alias_fixes = []
    brand_names = set(brand_data.keys())

    # Check for near-duplicate brands
    import difflib
    brand_list = sorted(brand_names)
    for i, b1 in enumerate(brand_list):
        for b2 in brand_list[i+1:]:
            ratio = difflib.SequenceMatcher(None, b1.lower(), b2.lower()).ratio()
            if ratio > 0.8 and b1 != b2:
                alias_fixes.append({
                    "brand1": b1,
                    "brand2": b2,
                    "similarity": round(ratio, 2),
                    "action": "REVIEW — possible alias"
                })

    brand_hierarchy = {
        "version": "consolidation_1_100",
        "normalized_at": NOW,
        "total_brands": len(brand_data),
        "total_divisions": len(divisions),
        "divisions": {k: {
            "total_products": v["total_products"],
            "total_skus": v["total_skus"],
            "brands": v["brands"]
        } for k, v in divisions.items()}
    }

    print(f"Total brands: {len(brand_data)}")
    print(f"Total divisions: {len(divisions)}")
    print(f"Near-duplicate brand names: {len(alias_fixes)}")
    for af in alias_fixes:
        print(f"  {af['brand1']} ~ {af['brand2']} (similarity: {af['similarity']})")

    print(f"\nBrands by product count:")
    for brand, bd in sorted(brand_data.items(), key=lambda x: x[1]["product_count"], reverse=True)[:15]:
        print(f"  {brand}: {bd['product_count']} products, {bd['sku_count']} SKUs ({', '.join(sorted(bd['divisions']))})")

    return brand_hierarchy, alias_fixes, brand_data


# ============================================================
# PHASE 4: Rebuild merged training chunks
# ============================================================
def phase4_training_chunks(all_products, all_skus):
    """Rebuild training chunks from deduplicated data."""
    print(f"\n{'=' * 70}")
    print("PHASE 4: REBUILD TRAINING CHUNKS")
    print(f"{'=' * 70}")

    chunks = []
    chunk_id = 0

    for pid, prod in sorted(all_products.items(), key=lambda x: x[1].get("_first_seen_file", 0)):
        # Get associated SKUs
        prod_skus = [(c, s) for c, s in all_skus.items() if s["product_id"] == pid]

        text_parts = [
            f"Product: {prod['name']}",
            f"Brand: {prod['brand']}",
            f"Division: {prod['division']}",
            f"Category: {prod['sub_category']}" if prod['sub_category'] else None,
            f"Source: {', '.join(prod.get('source_files', [])[:3])}",
        ]
        text_parts = [t for t in text_parts if t]

        if prod.get("description"):
            text_parts.append(prod["description"])

        if prod_skus:
            text_parts.append(f"SKU Codes ({len(prod_skus)} variants):")
            batch_skus = prod_skus[:50]
            for code, s in batch_skus:
                desc = s.get("description", "")
                text_parts.append(f"  - {code}" + (f": {desc}" if desc else ""))

        chunks.append({
            "chunk_id": f"c100_p{chunk_id:04d}",
            "chunk_type": "product",
            "text": "\n".join(text_parts),
            "metadata": {
                "product_id": pid,
                "product_name": prod["name"],
                "brand": prod["brand"],
                "division": prod["division"],
                "category": prod["sub_category"],
                "sku_count": len(prod_skus),
                "batch": prod.get("_batch", "unknown")
            }
        })
        chunk_id += 1

        # Overflow for >50 SKUs
        if len(prod_skus) > 50:
            for i in range(50, len(prod_skus), 50):
                batch = prod_skus[i:i+50]
                overflow_text = [
                    f"Product: {prod['name']} (SKU continuation {i//50 + 1})",
                    f"Brand: {prod['brand']}",
                    f"SKU Codes ({len(batch)} more variants):"
                ]
                for code, s in batch:
                    desc = s.get("description", "")
                    overflow_text.append(f"  - {code}" + (f": {desc}" if desc else ""))

                chunks.append({
                    "chunk_id": f"c100_p{chunk_id:04d}",
                    "chunk_type": "product_sku_overflow",
                    "text": "\n".join(overflow_text),
                    "metadata": {
                        "product_id": pid,
                        "product_name": prod["name"],
                        "brand": prod["brand"],
                        "batch": prod.get("_batch", "unknown")
                    }
                })
                chunk_id += 1

    print(f"Training chunks generated: {len(chunks)}")
    return chunks


# ============================================================
# PHASE 5: Retrieval validation
# ============================================================
def phase5_retrieval_validation(all_products, all_skus, chunks):
    """Validate that products and SKUs are retrievable from chunks."""
    print(f"\n{'=' * 70}")
    print("PHASE 5: RETRIEVAL VALIDATION")
    print(f"{'=' * 70}")

    all_chunk_text = " ".join(c["text"] for c in chunks)

    # Check product coverage
    products_found = 0
    products_missing = []
    for pid, prod in all_products.items():
        if prod["name"] in all_chunk_text:
            products_found += 1
        else:
            products_missing.append(prod["name"][:50])

    # Check SKU coverage
    skus_found = 0
    skus_missing = []
    for code in all_skus:
        if code in all_chunk_text:
            skus_found += 1
        else:
            skus_missing.append(code)

    # Check brand coverage
    brands = set(p["brand"] for p in all_products.values())
    brands_found = sum(1 for b in brands if b in all_chunk_text)

    print(f"Products in chunks: {products_found}/{len(all_products)} ({products_found*100//len(all_products)}%)")
    print(f"SKU codes in chunks: {skus_found}/{len(all_skus)} ({skus_found*100//len(all_skus)}%)")
    print(f"Brands in chunks: {brands_found}/{len(brands)} ({brands_found*100//len(brands)}%)")

    if products_missing:
        print(f"\nProducts NOT in chunks ({len(products_missing)}):")
        for pm in products_missing[:5]:
            print(f"  - {pm}")

    if skus_missing:
        print(f"\nSKU codes NOT in chunks ({len(skus_missing)}):")
        for sm in skus_missing[:5]:
            print(f"  - {sm}")

    return {
        "product_coverage": f"{products_found}/{len(all_products)}",
        "sku_coverage": f"{skus_found}/{len(all_skus)}",
        "brand_coverage": f"{brands_found}/{len(brands)}",
        "products_missing_from_chunks": products_missing,
        "skus_missing_from_chunks": skus_missing
    }


# ============================================================
# PHASE 6: Save everything and generate report
# ============================================================
def phase6_save_and_report(all_products, all_skus, metrics, conflict_log,
                           brand_hierarchy, alias_fixes, brand_data,
                           chunks, retrieval, cross_file_dupes, sku_occurrence_log, file_stats):
    """Save normalized data, rebuild shadow DB, generate report."""
    print(f"\n{'=' * 70}")
    print("PHASE 6: SAVE NORMALIZED DATA & GENERATE REPORT")
    print(f"{'=' * 70}")

    # --- Save products_master.json ---
    products_list = sorted(all_products.values(), key=lambda x: x.get("_first_seen_file", 0))

    # Update sku_count on each product
    for p in products_list:
        p["sku_count"] = sum(1 for s in all_skus.values() if s["product_id"] == p["product_id"])

    # Batch-wise stats
    batch_stats = {}
    for batch_name in ["batch_1", "batch_2", "batch_3", "batch_4"]:
        bp = [p for p in products_list if p.get("_batch") == batch_name]
        bs = [s for s in all_skus.values() if s.get("_batch") == batch_name]
        batch_stats[batch_name] = {
            "products": len(bp),
            "skus": len(bs)
        }

    pm = {
        "version": "consolidation_1_100",
        "batch": "batch_1_to_4",
        "normalized_at": NOW,
        "total_products": len(products_list),
        "total_skus": len(all_skus),
        "batch_stats": batch_stats,
        "products": products_list
    }
    save_json(os.path.join(NORM_DIR, "products_master.json"), pm)

    # --- Save sku_master.json ---
    skus_list = sorted(all_skus.values(), key=lambda x: x.get("sku_code", ""))
    sm = {
        "version": "consolidation_1_100",
        "batch": "batch_1_to_4",
        "normalized_at": NOW,
        "total_skus": len(skus_list),
        "skus": skus_list
    }
    save_json(os.path.join(NORM_DIR, "sku_master.json"), sm)

    # --- Save brand_hierarchy.json ---
    save_json(os.path.join(NORM_DIR, "brand_hierarchy.json"), brand_hierarchy)

    # --- Save snapshots ---
    snap_dir = os.path.join(NORM_DIR, "snapshots")
    os.makedirs(snap_dir, exist_ok=True)
    save_json(os.path.join(snap_dir, "consolidation_1_100_products.json"), pm)
    save_json(os.path.join(snap_dir, "consolidation_1_100_skus.json"), sm)

    # --- Save training chunks ---
    chunk_data = {
        "version": "consolidation_1_100",
        "chunks": chunks,
        "total": len(chunks),
        "generated_at": NOW,
        "coverage": "files_1_to_100"
    }
    save_json(os.path.join(CHUNKS_DIR, "merged_1_100_chunks.json"), chunk_data)

    # --- Build SKU occurrence breakdown ---
    code_occurrence_counts = defaultdict(int)
    for occ in sku_occurrence_log:
        code_occurrence_counts[occ["code"]] += 1
    multi_occurrence_codes = {c: n for c, n in code_occurrence_counts.items() if n > 1}

    # --- Generate consolidation report ---
    report = {
        "report_type": "consolidation_checkpoint",
        "coverage": "Files 1-100 (Batches 1-4)",
        "generated_at": NOW,

        "count_reconciliation": {
            "raw_extracted_products": metrics["raw_product_count"],
            "unique_products_after_dedupe": metrics["unique_products_after_dedupe"],
            "products_merged_as_duplicates": metrics["raw_product_count"] - metrics["unique_products_after_dedupe"],

            "total_sku_occurrences_source_mentions": metrics["raw_sku_occurrences"],
            "unique_sku_codes": metrics["unique_sku_codes"],
            "sku_overlap_same_code_multiple_files": metrics["raw_sku_occurrences"] - metrics["unique_sku_codes"],

            "reconciliation_explanation": (
                f"From 100 structured drafts, {metrics['raw_product_count']} product entries were extracted. "
                f"After name+brand deduplication across files, {metrics['unique_products_after_dedupe']} unique products remain. "
                f"{metrics['raw_product_count'] - metrics['unique_products_after_dedupe']} entries were duplicates "
                f"(same product appearing in multiple brochures/files). "
                f"For SKUs: {metrics['raw_sku_occurrences']} total SKU mentions appear across all files. "
                f"After deduplication, {metrics['unique_sku_codes']} unique codes exist. "
                f"The difference of {metrics['raw_sku_occurrences'] - metrics['unique_sku_codes']} represents SKU codes "
                f"mentioned in multiple source files (e.g., Latitud MSBC codes appear in both File 085 and File 088)."
            )
        },

        "batch_comparison": batch_stats,

        "cross_batch_duplicates_merged": {
            "total": len([d for d in cross_file_dupes.values()]),
            "details": [
                {
                    "product": all_products[pid]["name"],
                    "brand": all_products[pid]["brand"],
                    "files": [eid for eid, _, _, _ in dlist]
                }
                for pid, dlist in list(cross_file_dupes.items())[:20]
            ]
        },

        "conflict_log": conflict_log,

        "brand_alias_fixes": alias_fixes,

        "taxonomy_update": {
            "total_divisions": brand_hierarchy["total_divisions"],
            "total_brands": brand_hierarchy["total_brands"],
            "divisions": list(brand_hierarchy["divisions"].keys())
        },

        "retrieval_validation": retrieval,

        "shadow_db_delta": {
            "products_to_sync": len(products_list),
            "skus_to_sync": len(all_skus),
            "chunks_to_sync": len(chunks),
            "brands_to_sync": brand_hierarchy["total_brands"]
        },

        "website_release_delta": {
            "high_confidence_products": len([p for p in products_list if p.get("sku_count", 0) > 0]),
            "products_without_skus": len([p for p in products_list if p.get("sku_count", 0) == 0]),
            "recommendation": "Products with SKU codes are website-ready. Products without codes serve as descriptions only."
        },

        "blocked_items": [
            {"file": 8, "issue": "Corrupted DOCX (BadZipFile)", "status": "BLOCKED — awaiting uncorrupted file"}
        ],

        "sku_multi_occurrence_summary": {
            "codes_appearing_in_multiple_files": len(multi_occurrence_codes),
            "sample": [
                {"code": c, "occurrences": n}
                for c, n in sorted(multi_occurrence_codes.items(), key=lambda x: -x[1])[:20]
            ]
        }
    }

    # Save report as JSON
    save_json(os.path.join(LOGS_DIR, "consolidation_report_files_1_100.json"), report)

    print(f"Saved: products_master.json ({len(products_list)} products)")
    print(f"Saved: sku_master.json ({len(all_skus)} SKUs)")
    print(f"Saved: brand_hierarchy.json ({brand_hierarchy['total_brands']} brands)")
    print(f"Saved: merged_1_100_chunks.json ({len(chunks)} chunks)")
    print(f"Saved: consolidation_report_files_1_100.json")

    return report


# ============================================================
# MAIN
# ============================================================
def main():
    # Phase 1: Extract all
    all_products, all_skus, metrics, cross_dupes, sku_occ_log, file_stats = phase1_extract_all()

    # Phase 2: Cross-batch review
    conflict_log, batch_cross_dupes = phase2_cross_batch_review(all_products, all_skus, cross_dupes)

    # Phase 3: Brand hierarchy
    brand_hierarchy, alias_fixes, brand_data = phase3_brand_hierarchy(all_products, all_skus)

    # Phase 4: Training chunks
    chunks = phase4_training_chunks(all_products, all_skus)

    # Phase 5: Retrieval validation
    retrieval = phase5_retrieval_validation(all_products, all_skus, chunks)

    # Phase 6: Save and report
    report = phase6_save_and_report(
        all_products, all_skus, metrics, conflict_log,
        brand_hierarchy, alias_fixes, brand_data,
        chunks, retrieval, cross_dupes, sku_occ_log, file_stats
    )

    # Final summary
    print(f"\n{'=' * 70}")
    print("CONSOLIDATION CHECKPOINT COMPLETE")
    print(f"{'=' * 70}")
    print(f"\n--- COUNT RECONCILIATION ---")
    print(f"Raw extracted products:           {metrics['raw_product_count']}")
    print(f"Normalized products after dedupe: {metrics['unique_products_after_dedupe']}")
    print(f"Products merged as duplicates:    {metrics['raw_product_count'] - metrics['unique_products_after_dedupe']}")
    print(f"")
    print(f"Total SKU occurrences/mentions:   {metrics['raw_sku_occurrences']}")
    print(f"Unique SKU codes:                 {metrics['unique_sku_codes']}")
    print(f"SKU overlap (multi-file):         {metrics['raw_sku_occurrences'] - metrics['unique_sku_codes']}")


if __name__ == "__main__":
    main()
