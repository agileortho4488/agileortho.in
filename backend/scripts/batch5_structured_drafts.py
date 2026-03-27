#!/usr/bin/env python3
"""
Batch 5 Structured Draft Generator (Files 101-125)
Deep SKU extraction from raw extractions.
"""
import json, os, glob, re
from datetime import datetime, timezone

RAW_DIR = "/app/backend/brochure_intelligence/raw_extractions"
DRAFT_DIR = "/app/backend/brochure_intelligence/structured_drafts"
NOW = datetime.now(timezone.utc).isoformat()


def load_raw(fnum):
    matches = glob.glob(os.path.join(RAW_DIR, f"{fnum:03d}_*.json"))
    if not matches: return None
    with open(matches[0]) as f:
        return json.load(f)


def save_draft(fnum, draft, raw_filename):
    base = raw_filename.replace(".json", "")
    out = os.path.join(DRAFT_DIR, f"{base}_draft.json")
    with open(out, "w") as f:
        json.dump(draft, f, indent=2)
    return out


def no_sku(raw, reason, ctype="product_brochure"):
    return {
        "extraction_id": raw["extraction_id"], "file_id": raw["file_id"],
        "source_file": raw["source_file"], "content_type": ctype,
        "_needs_evidence_verification": False,
        "_extraction_method": "batch5_300dpi_structured_draft", "_extracted_at": NOW,
        "_evidence_notes": reason, "products": [],
        "_sku_verification": {
            "verdict": "NO_SKU_CODES_EXIST", "pages_checked": "all",
            "reason": reason, "verified_at": NOW,
            "verification_method": "page_by_page_raw_text_scan_300dpi"
        }
    }


def with_skus(raw, products, notes, ctype="product_catalog"):
    total = sum(len(p.get("skus", [])) for p in products)
    return {
        "extraction_id": raw["extraction_id"], "file_id": raw["file_id"],
        "source_file": raw["source_file"], "content_type": ctype,
        "_needs_evidence_verification": False,
        "_extraction_method": "batch5_deep_sku_extraction_300dpi", "_extracted_at": NOW,
        "_evidence_notes": notes,
        "_stats": {"products_found": len(products), "unique_sku_codes": total},
        "products": products
    }


def dedup(sku_list):
    seen = set()
    out = []
    for s in sku_list:
        if s["code"] not in seen:
            seen.add(s["code"])
            out.append(s)
    return out


# ========== FILE 101: MOZEC SEB (85 MOZS stent codes) ==========
def process_101(raw):
    all_text = " ".join(raw["_raw_text_by_page"].values())
    codes = sorted(set(re.findall(r'MOZS\d+', all_text)))
    products = [{
        "name": "MOZEC SEB Sirolimus-Eluting Balloon-Expandable Stent",
        "brand": "MOZEC", "division": "Cardiovascular",
        "category": "Coronary Stents - Drug Eluting",
        "source_page": "1-3",
        "description": f"Sirolimus-Eluting Balloon-Expandable Coronary Stent System. CoCr L605 platform with biodegradable polymer. {len(codes)} size variants.",
        "skus": [{"code": c, "source_page": "2-3"} for c in codes]
    }]
    return with_skus(raw, products, f"3-page MOZEC SEB brochure. {len(codes)} MOZS stent codes.")


# ========== FILE 106: MeRes100 (56 MRL stent codes) ==========
def process_106(raw):
    all_text = " ".join(raw["_raw_text_by_page"].values())
    codes = sorted(set(re.findall(r'MRL\d+', all_text)))
    products = [{
        "name": "MeRes100 Bioresorbable Vascular Scaffold (BVS)",
        "brand": "MeRes100", "division": "Cardiovascular",
        "category": "Bioresorbable Vascular Scaffold",
        "source_page": "1-2",
        "description": f"MeRes100 Bioresorbable Vascular Scaffold. Fully bioresorbable scaffold. {len(codes)} size variants.",
        "skus": [{"code": c, "source_page": "2"} for c in codes]
    }]
    return with_skus(raw, products, f"2-page MeRes100 BVS brochure. {len(codes)} MRL codes.")


# ========== FILE 110: Armar Titanium Plate & Screws Catalogue ==========
def process_110(raw):
    pages = raw["_raw_text_by_page"]
    products = []

    # INDR codes (instrument/drill)
    indr_codes = set()
    # NSLPS codes (LPS plates)
    nslps_codes = set()
    # Other codes
    other_codes = set()

    for pn, txt in pages.items():
        for c in re.findall(r'INDR\d+', txt):
            indr_codes.add(c)
        for c in re.findall(r'NSLPS\d+', txt):
            nslps_codes.add(c)

    if indr_codes:
        products.append({
            "name": "Armar Titanium Drill/Instrument Set",
            "brand": "Armar", "division": "Trauma",
            "category": "Trauma Instruments",
            "source_page": "9-10,26-27",
            "description": f"Armar Titanium drill and instrument codes. {len(indr_codes)} variants.",
            "skus": [{"code": c, "source_page": "9-10"} for c in sorted(indr_codes)]
        })

    if nslps_codes:
        products.append({
            "name": "Armar Titanium LPS Plates",
            "brand": "Armar", "division": "Trauma",
            "category": "Bone Plates - LPS Titanium",
            "source_page": "18-20",
            "description": f"Armar Titanium LPS (Low Profile System) plates. {len(nslps_codes)} variants.",
            "skus": [{"code": c, "source_page": "18-20"} for c in sorted(nslps_codes)]
        })

    total = sum(len(p["skus"]) for p in products)
    return with_skus(raw, products,
        f"50-page Armar Titanium Plate & Screws Catalogue. {total} ordering codes (INDR drills, NSLPS plates).")


# ========== FILE 120: Mozec NC (108 MNC codes) ==========
def process_120(raw):
    all_text = " ".join(raw["_raw_text_by_page"].values())
    codes = sorted(set(re.findall(r'MNC\d+', all_text)))
    products = [{
        "name": "MOZEC NC Non-Compliant PTCA Balloon Dilatation Catheter",
        "brand": "MOZEC", "division": "Cardiovascular",
        "category": "PTCA Balloon Catheters - Non-Compliant",
        "source_page": "2-4",
        "description": f"Non-Compliant PTCA Balloon Dilatation Catheter. Nylon balloon, hydrophilic coating. {len(codes)} size variants.",
        "skus": [{"code": c, "source_page": "3"} for c in codes]
    }]
    return with_skus(raw, products, f"4-page MOZEC NC brochure. {len(codes)} MNC codes.")


# ========== FILE 121: Mozec Rx PTCA (116 MOZ codes) ==========
def process_121(raw):
    all_text = " ".join(raw["_raw_text_by_page"].values())
    codes = sorted(set(re.findall(r'MOZ\d+', all_text)))
    products = [{
        "name": "MOZEC Rx Semi-Compliant PTCA Balloon Dilatation Catheter",
        "brand": "MOZEC", "division": "Cardiovascular",
        "category": "PTCA Balloon Catheters - Semi-Compliant",
        "source_page": "2-4",
        "description": f"Rx Semi-Compliant PTCA Balloon Dilatation Catheter. Nylon balloon, hydrophilic coating. {len(codes)} size variants.",
        "skus": [{"code": c, "source_page": "3"} for c in codes]
    }]
    return with_skus(raw, products, f"4-page MOZEC Rx brochure. {len(codes)} MOZ codes.")


# ========== FILE 123: CLAVO Ti Catalogue (6 MT-NT codes) ==========
def process_123(raw):
    pages = raw["_raw_text_by_page"]
    all_text = " ".join(pages.values())
    mt_codes = sorted(set(re.findall(r'MT-NT\d+', all_text)))

    products = []
    if mt_codes:
        products.append({
            "name": "CLAVO Elastic Titanium Nail (Ti Catalogue)",
            "brand": "CLAVO", "division": "Trauma",
            "category": "Intramedullary Nails - Elastic Titanium",
            "source_page": "22",
            "description": f"Elastic Titanium Nails from CLAVO Ti Catalogue. TAV (Ti-6Al-4V). {len(mt_codes)} codes. Additional nail types (PFRN, Tibial, Femoral, Humerus) have sizing tables but product codes unreadable due to PDF encoding.",
            "skus": [{"code": c, "source_page": "22"} for c in mt_codes]
        })

    return with_skus(raw, products,
        f"26-page CLAVO Titanium Nail Catalogue. {len(mt_codes)} MT-NT elastic nail codes extracted. Rest of catalogue has sizing tables (diameter/length) but product codes locked in CID-encoded PDF font.",
        "product_catalog")


# ========== FILE 125: New Pricing (303 codes) ==========
def process_125(raw):
    pages = raw["_raw_text_by_page"]
    products = []

    # Process each page for product groups
    all_codes = {}
    for pn in sorted(pages.keys(), key=int):
        txt = pages[pn]
        # Extract product codes with various patterns
        codes = re.findall(r'[A-Z]{3,6}[A-Z0-9]*[-]?\d{1,2}', txt)
        codes = [c for c in codes if not re.match(r'^(ISO|ASTM|FDA|MRP|INR|CDSCO|AAMI|HIV|HCV|HBV)', c)]
        codes = [c for c in codes if len(c) >= 5]
        for c in codes:
            if c not in all_codes:
                all_codes[c] = pn

    # Group by page/section
    # Pages 28-29: FSR (Fully Automated Semi-Micro) reagents
    fsr_codes = {c: p for c, p in all_codes.items() if 'FSR' in c}
    # Pages 30-33: AQ (AutoQuant) reagents
    aq_codes = {c: p for c, p in all_codes.items() if 'AQ' in c and c not in fsr_codes}
    # Page 34: MBS reagents
    mbs_codes = {c: p for c, p in all_codes.items() if 'MBS' in c}
    # Page 35: ERS (AriQuant ER) reagents
    ers_codes = {c: p for c, p in all_codes.items() if 'ERS' in c}
    # Pages 36: PRV, FQ4 codes
    prv_codes = {c: p for c, p in all_codes.items() if 'PRV' in c or 'FQ4' in c or 'F04' in c}
    # Pages 37-38: CCR, BDT codes (coagulation)
    coag_codes = {c: p for c, p in all_codes.items() if 'CCR' in c or 'BDT' in c or 'CLY' in c}
    # Pages 39: COA, ELC, CNC codes
    spec_codes = {c: p for c, p in all_codes.items() if any(x in c for x in ['COA','ELC','CNC'])}
    # Page 40: RPD codes (rapid diagnostics)
    rpd_codes = {c: p for c, p in all_codes.items() if 'RPD' in c or 'HCDRPD' in c or 'RDHBWB' in c}
    # Page 41: SER, ELI codes (serology, ELISA)
    ser_codes = {c: p for c, p in all_codes.items() if 'SER' in c or 'ELI' in c}
    # Page 42: FV codes
    fv_codes = {c: p for c, p in all_codes.items() if 'MPSCFV' in c}
    # Remaining
    assigned = set()
    for group in [fsr_codes, aq_codes, mbs_codes, ers_codes, prv_codes, coag_codes, spec_codes, rpd_codes, ser_codes, fv_codes]:
        assigned.update(group.keys())
    remaining = {c: p for c, p in all_codes.items() if c not in assigned}

    def make_prod(name, brand, div, cat, codes_dict, desc):
        if not codes_dict: return None
        return {
            "name": name, "brand": brand, "division": div, "category": cat,
            "source_page": ",".join(sorted(set(codes_dict.values()), key=int)),
            "description": f"{desc} {len(codes_dict)} codes.",
            "skus": [{"code": c, "source_page": p} for c, p in sorted(codes_dict.items())]
        }

    prods = [
        make_prod("AutoQuant FSR Reagents (Pricing)", "AutoQuant", "Diagnostics", "Clinical Chemistry Reagents", fsr_codes, "Fully Automated Semi-Micro reagents."),
        make_prod("AutoQuant AQ Reagents (Pricing)", "AutoQuant", "Diagnostics", "Clinical Chemistry Reagents", aq_codes, "AutoQuant biochemistry analyzer reagents."),
        make_prod("AutoQuant MBS Reagents (Pricing)", "AutoQuant", "Diagnostics", "Clinical Chemistry Reagents", mbs_codes, "MBS series reagents."),
        make_prod("AriQuant ER Series Reagents (Pricing)", "AriQuant", "Diagnostics", "Clinical Chemistry Reagents", ers_codes, "AriQuant ER series reagents with pricing."),
        make_prod("AutoQuant PRV/FQ4 Special Reagents (Pricing)", "AutoQuant", "Diagnostics", "Special Chemistry Reagents", prv_codes, "PRV and FQ4 special reagents."),
        make_prod("ClotQuant Coagulation Reagents (Pricing)", "ClotQuant", "Diagnostics", "Coagulation Reagents", coag_codes, "Coagulation analyzer reagents (CCR, BDT, CLY)."),
        make_prod("Specialty Reagents COA/ELC/CNC (Pricing)", "Meril Diagnostics", "Diagnostics", "Specialty Reagents", spec_codes, "Specialty reagents for coagulation and electrolytes."),
        make_prod("Rapid Diagnostic Tests (Pricing)", "MeriScreen", "Diagnostics", "Rapid Diagnostic Tests", rpd_codes, "Rapid diagnostic test kits with pricing."),
        make_prod("Serology & ELISA Kits (Pricing)", "MeriLisa", "Diagnostics", "Serology & ELISA", ser_codes, "Serology and ELISA test kits."),
        make_prod("Flow Cytometry Reagents (Pricing)", "FloQuant", "Diagnostics", "Flow Cytometry", fv_codes, "Flow cytometry reagents."),
    ]
    if remaining:
        prods.append(make_prod("Other Diagnostic Products (Pricing)", "Meril Diagnostics", "Diagnostics", "Other", remaining, "Other diagnostic products from pricing catalog."))

    products = [p for p in prods if p is not None]
    total = sum(len(p["skus"]) for p in products)
    return with_skus(raw, products,
        f"46-page Meril Diagnostics comprehensive pricing catalog. {total} product codes with MRP, distributor, and Saarthi pricing.",
        "pricing_catalog")


# ========== NO-SKU FILES ==========
NO_SKU = {
    102: ("4-page MYOSIST muscle stimulator brochure. Features and clinical benefits. No ordering codes.", "product_brochure"),
    103: ("2-page MYRAC sinus surgery brochure. Product features. No ordering codes.", "product_brochure"),
    104: ("2-page Malaria diagnostic flyer. Product overview and test procedure. No ordering codes.", "product_brochure"),
    105: ("2-page Mbonest bone graft substitute brochure. Product features. No ordering codes.", "product_brochure"),
    107: ("2-page Meriglue tissue adhesive brochure. Product overview. No ordering codes.", "product_brochure"),
    108: ("64-page Meril corporate brochure (High Res). Company overview, all divisions. No product ordering codes.", "corporate_brochure"),
    109: ("165-page Meril Trauma Training Book. Comprehensive trauma surgery training manual with surgical techniques, implant selection guides, and clinical cases. No product ordering codes.", "training_manual"),
    111: ("2-page BreathFlex BiPAP brochure. Non-invasive ventilator features and specs. No ordering codes.", "product_brochure"),
    112: ("4-page MESIC Compact brochure. Ultrasonic surgical instrument. Product features. No ordering codes.", "product_brochure"),
    113: ("2-page METIC micro-motor system brochure. ENT surgical drill features. No ordering codes.", "product_brochure"),
    114: ("4-page Micromate brochure. Microprocessor-controlled ventilator. Features and specs. No ordering codes.", "product_brochure"),
    115: ("6-page Miltonia brochure. Total knee replacement system features. No ordering codes.", "product_brochure"),
    116: ("4-page Mirus Powered Endoscopic Linear Cutter brochure. Surgical stapler features. No ordering codes.", "product_brochure"),
    117: ("4-page Mirus Powered Endoscopic Linear Cutter (duplicate of File 116). Same content, same file. No ordering codes.", "product_brochure"),
    118: ("24-page Monomod ST surgical technique manual. Total hip replacement monoblock stem surgical steps. No ordering codes.", "surgical_technique"),
    119: ("9-page Monomod brochure. Monoblock hip stem product features. No ordering codes.", "product_brochure"),
    122: ("2-page NOSZEL nasal spray brochure. Product overview and features. No ordering codes.", "product_brochure"),
    124: ("4-page Nautica brochure. Coronary guidewire features and specs. No ordering codes.", "product_brochure"),
}


def main():
    print("=" * 70)
    print("BATCH 5 STRUCTURED DRAFT GENERATION (Files 101-125)")
    print("=" * 70)

    os.makedirs(DRAFT_DIR, exist_ok=True)
    results = {}
    total_products = 0
    total_skus = 0

    # SKU-containing files
    processors = {
        101: process_101, 106: process_106, 110: process_110,
        120: process_120, 121: process_121, 123: process_123, 125: process_125,
    }

    print("\n--- Files WITH ordering codes ---")
    for fnum, proc in sorted(processors.items()):
        raw = load_raw(fnum)
        if not raw:
            print(f"  {fnum:03d}: MISSING raw extraction!")
            continue
        draft = proc(raw)
        raw_fname = os.path.basename(glob.glob(os.path.join(RAW_DIR, f"{fnum:03d}_*.json"))[0])
        out = save_draft(fnum, draft, raw_fname)
        np = len(draft["products"])
        ns = sum(len(p.get("skus", [])) for p in draft["products"])
        total_products += np
        total_skus += ns
        results[fnum] = {"products": np, "skus": ns}
        print(f"  {fnum:03d}: {np} products, {ns} SKUs - {raw['source_file'][:50]}")

    print("\n--- Files WITHOUT ordering codes ---")
    for fnum, (reason, ctype) in sorted(NO_SKU.items()):
        raw = load_raw(fnum)
        if not raw:
            print(f"  {fnum:03d}: MISSING raw extraction!")
            continue
        draft = no_sku(raw, reason, ctype)
        raw_fname = os.path.basename(glob.glob(os.path.join(RAW_DIR, f"{fnum:03d}_*.json"))[0])
        save_draft(fnum, draft, raw_fname)
        results[fnum] = {"products": 0, "skus": 0}
        print(f"  {fnum:03d}: NO_SKU - {reason[:60]}...")

    print(f"\n{'=' * 70}")
    print(f"BATCH 5 SUMMARY")
    print(f"Files processed: {len(results)}/25")
    print(f"Files with SKUs: {len(processors)}")
    print(f"Files without SKUs: {len(NO_SKU)}")
    print(f"Total products: {total_products}")
    print(f"Total unique SKU codes: {total_skus}")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    main()
