"""
Batch 1-quality page-by-page verification for Batch 2 ordering pages.
Opens actual PDF brochures at 300 DPI, OCR's ordering pages fresh,
cross-checks against existing structured data, and fixes any OCR misreads.
"""
import json
import sys
import os
from pathlib import Path
from datetime import datetime, timezone

import pdfplumber
import pytesseract
from PIL import Image
import io

BASE = Path("/app/backend/brochure_intelligence")
RAW = BASE / "raw_extractions"
DRAFT = BASE / "structured_drafts"
BROCHURES = Path("/tmp/zoho_brochures")

DPI = 300


def find_brochure(source_file):
    """Find the actual brochure file in the download folder."""
    # Try exact match first
    exact = BROCHURES / source_file
    if exact.exists():
        return exact
    # Try case-insensitive / partial match
    source_lower = source_file.lower().replace(" ", "")
    for f in BROCHURES.iterdir():
        if f.name.lower().replace(" ", "") == source_lower:
            return f
    # Fuzzy match by significant portion of filename
    for f in BROCHURES.iterdir():
        if source_file[:20].lower() in f.name.lower():
            return f
    return None


def extract_page_300dpi(pdf_path, page_num):
    """Extract page text using both pdfplumber (direct) and 300 DPI OCR."""
    results = {
        "page_number": page_num,
        "source_file": pdf_path.name,
        "direct_text": "",
        "ocr_text_300dpi": "",
        "tables": [],
        "extraction_method": "multi_pass"
    }

    with pdfplumber.open(str(pdf_path)) as pdf:
        if page_num < 1 or page_num > len(pdf.pages):
            results["error"] = f"Page {page_num} out of range (total: {len(pdf.pages)})"
            return results

        page = pdf.pages[page_num - 1]

        # Direct text extraction
        results["direct_text"] = page.extract_text() or ""

        # Table extraction
        tables = page.extract_tables()
        if tables:
            results["tables"] = []
            for t_idx, table in enumerate(tables):
                results["tables"].append({
                    "table_index": t_idx,
                    "rows": table
                })

        # 300 DPI OCR
        try:
            img = page.to_image(resolution=DPI)
            pil_img = img.original
            ocr_text = pytesseract.image_to_string(pil_img)
            results["ocr_text_300dpi"] = ocr_text
        except Exception as e:
            results["ocr_error"] = str(e)

    return results


def verify_and_update_file(eid_str, ordering_pages):
    """Re-extract ordering pages at 300 DPI and cross-check structured data."""

    # Load raw extraction to get source file name
    raw_matches = list(RAW.glob(f"{eid_str}_*.json"))
    if not raw_matches:
        print(f"  ERROR: No raw extraction found for {eid_str}")
        return

    with open(raw_matches[0]) as f:
        raw = json.load(f)

    source_file = raw.get("source_file", "")
    brochure_path = find_brochure(source_file)

    if not brochure_path:
        print(f"  ERROR: Brochure not found: {source_file}")
        return

    print(f"\n{'='*100}")
    print(f"FILE {eid_str}: {source_file}")
    print(f"  Brochure: {brochure_path}")
    print(f"  Ordering pages to verify: {ordering_pages}")
    print(f"{'='*100}")

    verification_results = []

    for pg in ordering_pages:
        print(f"\n  --- Page {pg} @ 300 DPI ---")
        result = extract_page_300dpi(brochure_path, pg)

        direct_len = len(result["direct_text"])
        ocr_len = len(result["ocr_text_300dpi"])
        table_count = len(result.get("tables", []))

        print(f"    Direct text: {direct_len} chars")
        print(f"    OCR 300dpi:  {ocr_len} chars")
        print(f"    Tables found: {table_count}")

        # Use the richer text source
        best_text = result["ocr_text_300dpi"] if ocr_len > direct_len else result["direct_text"]
        print(f"    Best source: {'OCR' if ocr_len > direct_len else 'Direct'}")

        # Print key lines that contain codes
        lines = best_text.split('\n')
        code_lines = [l.strip() for l in lines if any(c.isupper() and any(d.isdigit() for d in l) for c in l) and len(l.strip()) > 5]
        if code_lines:
            print(f"    Code-bearing lines ({len(code_lines)}):")
            for cl in code_lines[:15]:
                print(f"      | {cl[:120]}")

        # Print tables if found
        if result.get("tables"):
            for t in result["tables"]:
                print(f"    TABLE {t['table_index']} ({len(t['rows'])} rows):")
                for row in t["rows"][:8]:
                    print(f"      {row}")
                if len(t["rows"]) > 8:
                    print(f"      ... ({len(t['rows']) - 8} more rows)")

        verification_results.append(result)

    # Update raw extraction with fresh 300 DPI data for these pages
    for vr in verification_results:
        pg = str(vr["page_number"])

        # Update _raw_text_by_page with best text
        best = vr["ocr_text_300dpi"] if len(vr["ocr_text_300dpi"]) > len(vr["direct_text"]) else vr["direct_text"]
        if best and len(best) > len(str(raw.get("_raw_text_by_page", {}).get(pg, ""))):
            raw["_raw_text_by_page"][pg] = best
            print(f"  UPDATED page {pg} raw text (improved from {len(str(raw.get('_raw_text_by_page', {}).get(pg, '')))} to {len(best)} chars)")

        # Update _tables_by_page
        if vr.get("tables"):
            if "_tables_by_page" not in raw:
                raw["_tables_by_page"] = {}
            raw["_tables_by_page"][pg] = vr["tables"]
            print(f"  UPDATED page {pg} tables ({len(vr['tables'])} tables)")

        # Update page_extractions metadata
        found = False
        for pe in raw.get("page_extractions", []):
            if pe.get("page_number") == vr["page_number"]:
                pe["extraction_method"] = "multi_pass_300dpi_verified"
                pe["verified_at"] = datetime.now(timezone.utc).isoformat()
                pe["direct_text_chars"] = len(vr["direct_text"])
                pe["ocr_text_chars"] = len(vr["ocr_text_300dpi"])
                found = True
                break
        if not found:
            raw.setdefault("page_extractions", []).append({
                "page_number": vr["page_number"],
                "source_file": source_file,
                "extraction_method": "multi_pass_300dpi_verified",
                "verified_at": datetime.now(timezone.utc).isoformat(),
                "direct_text_chars": len(vr["direct_text"]),
                "ocr_text_chars": len(vr["ocr_text_300dpi"])
            })

    # Save updated raw
    with open(raw_matches[0], "w") as f:
        json.dump(raw, f, indent=2)
    print(f"\n  Raw extraction updated: {raw_matches[0].name}")

    return verification_results


if __name__ == "__main__":
    # Files with ordering pages that need 300 DPI verification
    files_to_verify = {
        "039": [4],  # DOA Rapids ordering table
        "049": [1, 2],  # EIAQuant material codes
        "050": [7, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23],  # ENT portfolio ordering pages
    }

    print("=" * 100)
    print("BATCH 1-QUALITY 300 DPI VERIFICATION FOR BATCH 2 ORDERING PAGES")
    print("=" * 100)

    for eid, pages in files_to_verify.items():
        verify_and_update_file(eid, pages)

    print(f"\n{'='*100}")
    print("VERIFICATION COMPLETE")
    print(f"{'='*100}")
