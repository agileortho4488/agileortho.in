#!/usr/bin/env python3
"""
Batch 5 Raw Extraction (Files 101-125)
Mandatory 300 DPI OCR on every PDF page.
CLI tools for files > 10MB to prevent OOM.
"""
import json
import os
import re
import subprocess
import sys
import gc
from datetime import datetime, timezone

SRC_DIR = "/app/backend/brochure_intelligence/source_brochures"
RAW_DIR = "/app/backend/brochure_intelligence/raw_extractions"
NOW = datetime.now(timezone.utc).isoformat()

# File mapping: index 101-125
ALL_FILES = sorted(os.listdir(SRC_DIR))
BATCH5_FILES = {i+101: ALL_FILES[100+i] for i in range(25)}

CLI_THRESHOLD_MB = 10
SPECIFIC_FILE = int(sys.argv[1]) if len(sys.argv) > 1 else None


def slugify(name):
    s = re.sub(r'[^a-z0-9]+', '_', name.lower())
    return s.strip('_')[:60]


def extract_with_python(filepath, file_num):
    """Extract using pdfplumber + pytesseract 300 DPI. For files < 10MB."""
    import pdfplumber
    from PIL import Image
    import pytesseract

    raw_text_by_page = {}
    tables_by_page = {}

    with pdfplumber.open(filepath) as pdf:
        total_pages = len(pdf.pages)
        for page_num, page in enumerate(pdf.pages, 1):
            # Direct text extraction
            direct_text = page.extract_text() or ""

            # Mandatory 300 DPI OCR
            try:
                img = page.to_image(resolution=300)
                pil_img = img.original
                ocr_text = pytesseract.image_to_string(pil_img, lang='eng')
            except Exception as e:
                ocr_text = f"[OCR_ERROR: {e}]"

            # Keep the richer result
            final_text = ocr_text if len(ocr_text) > len(direct_text) else direct_text
            if len(ocr_text) > 50 and len(direct_text) > 50:
                # Merge unique content
                if len(ocr_text) > len(direct_text) * 1.2:
                    final_text = ocr_text
                elif len(direct_text) > len(ocr_text) * 1.2:
                    final_text = direct_text
                else:
                    final_text = direct_text + "\n\n[OCR_SUPPLEMENT]\n" + ocr_text

            raw_text_by_page[str(page_num)] = final_text

            # Tables
            try:
                page_tables = page.extract_tables()
                if page_tables:
                    tables_by_page[str(page_num)] = page_tables
            except:
                pass

            gc.collect()

    return raw_text_by_page, tables_by_page, total_pages


def extract_with_cli(filepath, file_num):
    """Extract using pdftotext + pdftoppm + tesseract. For files >= 10MB."""
    import tempfile

    # Get page count
    info = subprocess.run(['pdfinfo', filepath], capture_output=True, text=True, timeout=30)
    total_pages = 1
    for line in info.stdout.split('\n'):
        if 'Pages:' in line:
            total_pages = int(line.split(':')[1].strip())

    raw_text_by_page = {}

    for page_num in range(1, total_pages + 1):
        # Direct text with pdftotext
        try:
            result = subprocess.run(
                ['pdftotext', '-f', str(page_num), '-l', str(page_num), filepath, '-'],
                capture_output=True, text=True, timeout=60
            )
            direct_text = result.stdout.strip()
        except:
            direct_text = ""

        # Mandatory 300 DPI OCR with pdftoppm + tesseract
        ocr_text = ""
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                img_prefix = os.path.join(tmpdir, "page")
                subprocess.run(
                    ['pdftoppm', '-f', str(page_num), '-l', str(page_num),
                     '-r', '300', '-png', filepath, img_prefix],
                    capture_output=True, timeout=120
                )
                # Find the generated image
                imgs = [f for f in os.listdir(tmpdir) if f.endswith('.png')]
                if imgs:
                    img_path = os.path.join(tmpdir, imgs[0])
                    result = subprocess.run(
                        ['tesseract', img_path, 'stdout', '-l', 'eng'],
                        capture_output=True, text=True, timeout=120
                    )
                    ocr_text = result.stdout.strip()
        except Exception as e:
            ocr_text = f"[CLI_OCR_ERROR: {e}]"

        # Keep richer result
        if len(ocr_text) > len(direct_text):
            final_text = ocr_text
        else:
            final_text = direct_text

        raw_text_by_page[str(page_num)] = final_text
        if page_num % 10 == 0:
            print(f"    Page {page_num}/{total_pages} done")

        gc.collect()

    return raw_text_by_page, {}, total_pages


def process_file(file_num, filename):
    """Process a single file."""
    filepath = os.path.join(SRC_DIR, filename)
    size_mb = os.path.getsize(filepath) / (1024 * 1024)
    slug = slugify(os.path.splitext(filename)[0])
    extraction_id = f"{file_num:03d}"
    out_name = f"{file_num:03d}_{slug}.json"
    out_path = os.path.join(RAW_DIR, out_name)

    # Skip if already extracted
    if os.path.exists(out_path):
        print(f"  {file_num:03d}: SKIP (already exists)")
        return out_path

    print(f"  {file_num:03d}: {filename[:55]} ({size_mb:.1f}MB)")

    use_cli = size_mb > CLI_THRESHOLD_MB

    if use_cli:
        print(f"    Using CLI extraction (file > {CLI_THRESHOLD_MB}MB)")
        raw_text, tables, total_pages = extract_with_cli(filepath, file_num)
        parser = "pdftotext+tesseract_cli_300dpi"
    else:
        print(f"    Using Python extraction")
        raw_text, tables, total_pages = extract_with_python(filepath, file_num)
        parser = "pdfplumber+pytesseract_mandatory_300dpi"

    # Build raw extraction JSON
    extraction = {
        "extraction_id": extraction_id,
        "file_id": file_num,
        "source_file": filename,
        "file_size_mb": round(size_mb, 1),
        "total_pages": total_pages,
        "parser_used": parser,
        "_extracted_at": NOW,
        "_batch": "batch_5",
        "_raw_text_by_page": raw_text
    }
    if tables:
        extraction["_tables_by_page"] = tables

    with open(out_path, 'w') as f:
        json.dump(extraction, f, indent=2)

    total_chars = sum(len(v) for v in raw_text.values())
    print(f"    Done: {total_pages} pages, {total_chars} chars, saved to {out_name}")

    gc.collect()
    return out_path


def main():
    print("=" * 70)
    print("BATCH 5 RAW EXTRACTION (Files 101-125)")
    print("Mandatory 300 DPI OCR | CLI for files > 10MB")
    print("=" * 70)

    os.makedirs(RAW_DIR, exist_ok=True)

    if SPECIFIC_FILE:
        if SPECIFIC_FILE in BATCH5_FILES:
            process_file(SPECIFIC_FILE, BATCH5_FILES[SPECIFIC_FILE])
        else:
            print(f"File {SPECIFIC_FILE} not in batch 5 range")
        return

    # Process in order, small files first, then large
    small_files = [(n, f) for n, f in BATCH5_FILES.items()
                   if os.path.getsize(os.path.join(SRC_DIR, f)) / (1024*1024) <= CLI_THRESHOLD_MB]
    large_files = [(n, f) for n, f in BATCH5_FILES.items()
                   if os.path.getsize(os.path.join(SRC_DIR, f)) / (1024*1024) > CLI_THRESHOLD_MB]

    print(f"\nSmall files (Python): {len(small_files)}")
    for n, f in sorted(small_files):
        process_file(n, f)

    print(f"\nLarge files (CLI): {len(large_files)}")
    for n, f in sorted(large_files):
        process_file(n, f)

    # Summary
    extracted = len([f for f in os.listdir(RAW_DIR) if f.startswith(('101', '102', '103', '104', '105',
        '106', '107', '108', '109', '110', '111', '112', '113', '114', '115',
        '116', '117', '118', '119', '120', '121', '122', '123', '124', '125'))])
    print(f"\n{'=' * 70}")
    print(f"BATCH 5 EXTRACTION SUMMARY: {extracted}/25 files processed")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    main()
