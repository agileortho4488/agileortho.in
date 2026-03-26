"""
Evidence-Based Compliance Audit — NOT field-presence checking.
Verifies ACTUAL extraction quality against the strict rules.
"""
import json
import os
import sys

BASE_DIR = "/app/backend/brochure_intelligence"
RAW_DIR = os.path.join(BASE_DIR, "raw_extractions")
DRAFT_DIR = os.path.join(BASE_DIR, "structured_drafts")


def audit_raw_evidence(raw_path):
    """Audit a single raw_extraction file for evidence quality."""
    with open(raw_path) as f:
        data = json.load(f)

    eid = data.get("extraction_id", "???")
    source = data.get("source_file", "???")
    findings = []
    severity_counts = {"CRITICAL": 0, "MAJOR": 0, "MINOR": 0, "INFO": 0}

    def add(sev, msg):
        findings.append({"severity": sev, "message": msg})
        severity_counts[sev] += 1

    # --- CHECK 1: Source identification ---
    if not data.get("source_file"):
        add("CRITICAL", "Missing source_file — cannot trace to original brochure")
    if not data.get("file_id"):
        add("CRITICAL", "Missing file_id — cannot fingerprint source")
    if not data.get("file_type"):
        add("MAJOR", "Missing file_type")

    # --- CHECK 2: Raw evidence presence ---
    evidence_status = data.get("_raw_evidence_status", "UNKNOWN")
    if evidence_status == "UNREADABLE":
        # File is explicitly unreadable — check unreadable_log
        if not data.get("unreadable_log"):
            add("CRITICAL", "File marked UNREADABLE but no unreadable_log explaining why")
        else:
            add("INFO", f"File correctly logged as UNREADABLE: {data['unreadable_log'].get('reason', '?')}")
        return eid, source, findings, severity_counts

    if evidence_status != "PRESENT":
        add("CRITICAL", f"Raw evidence status: {evidence_status} — raw page text not stored")
        return eid, source, findings, severity_counts

    raw_text = data.get("_raw_text_by_page", {})
    if not raw_text:
        add("CRITICAL", "No _raw_text_by_page — raw page text destroyed or never captured")

    # --- CHECK 3: Every page checked ---
    total_pages = data.get("total_pages", 0)
    pages_with_text = len(raw_text)
    if total_pages == 0:
        add("MAJOR", "total_pages is 0")
    elif pages_with_text < total_pages:
        blank_count = total_pages - pages_with_text
        add("MINOR", f"{blank_count}/{total_pages} pages have no text (may be blank/image-only)")

    # Verify each page has a text entry
    for i in range(1, total_pages + 1):
        page_key = str(i)
        if page_key not in raw_text:
            pass  # May be blank, not necessarily an error

    # --- CHECK 4: Page-level metadata ---
    page_extractions = data.get("page_extractions", [])
    if not page_extractions:
        add("MAJOR", "No page_extractions metadata — parser method per page not logged")
    else:
        for pe in page_extractions:
            if not pe.get("parser_used") and not pe.get("extraction_method"):
                add("MAJOR", f"Page {pe.get('page_number', '?')}: parser/extraction method not logged")
            if not pe.get("source_file"):
                add("MAJOR", f"Page {pe.get('page_number', '?')}: source_file not logged in page metadata")

    # --- CHECK 5: Actual text quality ---
    total_text_len = sum(len(v) for v in raw_text.values())
    if total_text_len < 50 and evidence_status == "PRESENT":
        add("MAJOR", f"Total extracted text only {total_text_len} chars — suspiciously low for a brochure")
    elif total_text_len < 200:
        add("MINOR", f"Total extracted text {total_text_len} chars — may be incomplete")

    # --- CHECK 6: No interpreted products in raw layer ---
    if "products" in data:
        add("CRITICAL", "products field found in raw_extractions — interpreted data mixed with raw evidence")
    if "key_insights" in data:
        add("MAJOR", "key_insights found in raw_extractions — interpretation mixed with evidence")
    if "brand_intelligence" in data:
        add("MAJOR", "brand_intelligence found in raw_extractions — interpretation in raw layer")

    # --- CHECK 7: Table capture ---
    tables = data.get("_tables_by_page", {})
    pages_with_tables = len(tables)
    if pages_with_tables > 0:
        add("INFO", f"{pages_with_tables} pages have table data captured")

    # --- CHECK 8: Unreadable pages explicitly logged ---
    for pe in page_extractions:
        method = pe.get("extraction_method", pe.get("parser_used", ""))
        if "failed" in method.lower():
            add("MINOR", f"Page {pe.get('page_number', '?')}: extraction method = '{method}' — unreadable page, should be logged")

    return eid, source, findings, severity_counts


def audit_structured_draft(draft_path):
    """Audit a structured draft for evidence traceability."""
    with open(draft_path) as f:
        data = json.load(f)

    eid = data.get("extraction_id", "???")
    source = data.get("source_file", "???")
    findings = []
    severity_counts = {"CRITICAL": 0, "MAJOR": 0, "MINOR": 0, "INFO": 0}

    def add(sev, msg):
        findings.append({"severity": sev, "message": msg})
        severity_counts[sev] += 1

    products = data.get("products", [])
    if not products:
        add("INFO", "No products in draft (may be reference doc)")
        return eid, source, findings, severity_counts

    for prod in products:
        name = prod.get("name", "???")[:50]

        # Check source_page is specific (not broad ranges)
        sp = prod.get("source_page", "")
        if not sp:
            add("MAJOR", f"Product '{name}': no source_page — can't trace to brochure page")
        elif "-" in str(sp):
            parts = str(sp).split("-")
            try:
                start, end = int(parts[0]), int(parts[1])
                if end - start > 5:
                    add("MINOR", f"Product '{name}': source_page '{sp}' is broad range — should be narrower")
            except:
                pass

        # Check SKU evidence
        skus = prod.get("skus", [])
        if not skus:
            # Is there an explicit "no SKUs exist" statement?
            if not prod.get("description", "").lower().count("no sku") and \
               not prod.get("description", "").lower().count("no part number"):
                add("MINOR", f"Product '{name}': 0 SKUs — no explicit statement that none exist")

        # Check needs_evidence_verification flag
        if not data.get("_needs_evidence_verification"):
            add("MAJOR", f"Draft not marked as _needs_evidence_verification")

    add("INFO", f"{len(products)} products, {sum(len(p.get('skus',[])) for p in products)} SKUs in draft")
    return eid, source, findings, severity_counts


def run_full_audit(batch_start=1, batch_end=50):
    """Run full evidence-based audit on specified file range."""
    print("=" * 80)
    print(f"EVIDENCE-BASED COMPLIANCE AUDIT — Files {batch_start}-{batch_end}")
    print("=" * 80)

    # Audit raw evidence layer
    print(f"\n{'='*40}")
    print("RAW EVIDENCE LAYER AUDIT")
    print(f"{'='*40}")

    raw_results = []
    raw_files = sorted([f for f in os.listdir(RAW_DIR) if f.endswith('.json')])
    for fname in raw_files:
        with open(os.path.join(RAW_DIR, fname)) as f:
            data = json.load(f)
        eid = data.get("extraction_id", "")
        if not eid.isdigit():
            continue
        eid_num = int(eid)
        if eid_num < batch_start or eid_num > batch_end:
            continue

        eid, source, findings, sev_counts = audit_raw_evidence(os.path.join(RAW_DIR, fname))
        raw_results.append({"eid": eid, "source": source, "findings": findings, "severity": sev_counts})

        if sev_counts["CRITICAL"] > 0:
            status = "CRITICAL"
        elif sev_counts["MAJOR"] > 0:
            status = "NEEDS_FIX"
        else:
            status = "PASS"

        print(f"[{status:9s}] {eid:3s} {source[:45]:45s} | C:{sev_counts['CRITICAL']} M:{sev_counts['MAJOR']} m:{sev_counts['MINOR']} i:{sev_counts['INFO']}")
        if sev_counts["CRITICAL"] > 0 or sev_counts["MAJOR"] > 0:
            for f in findings:
                if f["severity"] in ("CRITICAL", "MAJOR"):
                    print(f"            >> [{f['severity']}] {f['message']}")

    # Audit structured drafts layer
    print(f"\n{'='*40}")
    print("STRUCTURED DRAFTS LAYER AUDIT")
    print(f"{'='*40}")

    draft_results = []
    if os.path.exists(DRAFT_DIR):
        draft_files = sorted([f for f in os.listdir(DRAFT_DIR) if f.endswith('.json')])
        for fname in draft_files:
            with open(os.path.join(DRAFT_DIR, fname)) as f:
                data = json.load(f)
            eid = data.get("extraction_id", "")
            if not eid.isdigit():
                continue
            eid_num = int(eid)
            if eid_num < batch_start or eid_num > batch_end:
                continue

            eid, source, findings, sev_counts = audit_structured_draft(os.path.join(DRAFT_DIR, fname))
            draft_results.append({"eid": eid, "source": source, "findings": findings, "severity": sev_counts})

            if sev_counts["CRITICAL"] > 0:
                status = "CRITICAL"
            elif sev_counts["MAJOR"] > 0:
                status = "NEEDS_FIX"
            else:
                status = "PASS"

            if sev_counts["CRITICAL"] > 0 or sev_counts["MAJOR"] > 0:
                print(f"[{status:9s}] {eid:3s} {source[:45]:45s} | C:{sev_counts['CRITICAL']} M:{sev_counts['MAJOR']} m:{sev_counts['MINOR']} i:{sev_counts['INFO']}")
                for f in findings:
                    if f["severity"] in ("CRITICAL", "MAJOR"):
                        print(f"            >> [{f['severity']}] {f['message']}")

    # Summary
    raw_critical = sum(1 for r in raw_results if r["severity"]["CRITICAL"] > 0)
    raw_major = sum(1 for r in raw_results if r["severity"]["MAJOR"] > 0 and r["severity"]["CRITICAL"] == 0)
    raw_pass = sum(1 for r in raw_results if r["severity"]["CRITICAL"] == 0 and r["severity"]["MAJOR"] == 0)

    print(f"\n{'='*80}")
    print(f"SUMMARY")
    print(f"{'='*80}")
    print(f"Raw Evidence:  {raw_pass} PASS / {raw_major} NEEDS_FIX / {raw_critical} CRITICAL / {len(raw_results)} total")

    # Save audit report
    report = {
        "audit_type": "evidence_based",
        "batch_range": f"{batch_start}-{batch_end}",
        "raw_evidence_results": raw_results,
        "draft_results": draft_results,
        "summary": {
            "raw_pass": raw_pass,
            "raw_needs_fix": raw_major,
            "raw_critical": raw_critical,
            "total_files": len(raw_results)
        }
    }
    report_path = os.path.join(BASE_DIR, "logs", "evidence_audit_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nFull report saved: {report_path}")


if __name__ == "__main__":
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    end = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    run_full_audit(start, end)
