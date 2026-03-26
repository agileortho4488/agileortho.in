"""
Strict Evidence-Based Compliance Audit for raw_extractions/ layer.
Validates that raw_extractions contains ONLY raw evidence — no interpreted product data.
Checks actual evidence quality, not just field presence.
"""
import json
import os
import sys
from pathlib import Path

BASE_DIR = Path("/app/backend/brochure_intelligence")
RAW_DIR = BASE_DIR / "raw_extractions"
DRAFT_DIR = BASE_DIR / "structured_drafts"
LOG_DIR = BASE_DIR / "logs"

FORBIDDEN_KEYS = ["products", "key_insights", "brand_intelligence"]
REQUIRED_IDENTITY = ["extraction_id", "file_id", "source_file"]
REQUIRED_EVIDENCE = ["_raw_text_by_page"]


def audit_raw_file(fp):
    """Strict audit of a single raw_extraction file."""
    with open(fp) as f:
        data = json.load(f)

    eid = str(data.get("extraction_id", "???")).strip()
    source = data.get("source_file", "???")
    findings = []
    sev = {"CRITICAL": 0, "MAJOR": 0, "MINOR": 0, "INFO": 0}

    def add(severity, msg):
        findings.append({"severity": severity, "message": msg})
        sev[severity] += 1

    # ---- CRITICAL: Forbidden interpreted keys still in raw ----
    for k in FORBIDDEN_KEYS:
        if k in data:
            add("CRITICAL", f"Forbidden key '{k}' found in raw_extractions — interpreted data mixed with evidence")

    # ---- CRITICAL: Missing identity ----
    for k in REQUIRED_IDENTITY:
        if not data.get(k):
            add("CRITICAL", f"Missing required identity field: {k}")

    if not data.get("file_type"):
        add("MAJOR", "Missing file_type")

    if not data.get("parser_used"):
        add("MAJOR", "Missing parser_used — extraction method unknown")

    # ---- Handle unreadable/corrupt files ----
    evidence_status = data.get("_raw_evidence_status", "MISSING")
    if evidence_status == "UNREADABLE":
        if not data.get("unreadable_log"):
            add("CRITICAL", "Marked UNREADABLE but no unreadable_log explaining why")
        else:
            add("INFO", f"Correctly logged as UNREADABLE: {data['unreadable_log'].get('reason', '?')}")
        return eid, source, findings, sev

    # ---- CRITICAL: No raw evidence at all ----
    if evidence_status != "PRESENT":
        add("CRITICAL", f"_raw_evidence_status={evidence_status} — raw page text not stored")
        return eid, source, findings, sev

    raw_text = data.get("_raw_text_by_page", {})
    tables = data.get("_tables_by_page", {})

    if not raw_text and not tables:
        add("CRITICAL", "No _raw_text_by_page AND no _tables_by_page — zero preserved evidence")
        return eid, source, findings, sev

    # ---- CRITICAL: total_pages > 0 but zero page evidence ----
    total_pages = data.get("total_pages", 0)
    pages_with_text = len(raw_text)
    pages_with_tables = len(tables)

    if total_pages == 0:
        add("MAJOR", "total_pages is 0 — cannot verify completeness")
    elif pages_with_text == 0 and pages_with_tables == 0:
        add("CRITICAL", f"total_pages={total_pages} but zero pages have any evidence")
    elif pages_with_text < total_pages:
        missing = total_pages - pages_with_text
        if missing > total_pages * 0.5:
            add("MAJOR", f"{missing}/{total_pages} pages missing text — over 50% gap")
        else:
            add("MINOR", f"{missing}/{total_pages} pages missing text (may be blank/image-only)")

    # ---- MAJOR: OCR/direct parse method not logged per page ----
    page_extractions = data.get("page_extractions", [])
    if not page_extractions:
        add("MAJOR", "No page_extractions metadata — parser method per page not logged")
    else:
        for pe in page_extractions:
            pn = pe.get("page_number", "?")
            if not pe.get("parser_used") and not pe.get("extraction_method"):
                add("MAJOR", f"Page {pn}: parser/extraction method not logged")
            if not pe.get("source_file"):
                add("MAJOR", f"Page {pn}: source_file not logged in page metadata")

    # ---- MAJOR: Evidence text suspiciously thin ----
    total_text_len = sum(len(str(v)) for v in raw_text.values())
    if total_text_len < 50 and total_pages > 1:
        add("MAJOR", f"Total raw text only {total_text_len} chars for {total_pages} pages — suspiciously low")
    elif total_text_len < 200 and total_pages > 2:
        add("MINOR", f"Total raw text {total_text_len} chars for {total_pages} pages — may be incomplete")

    # ---- MINOR: Page numbering inconsistency ----
    if page_extractions and total_pages > 0:
        logged_pages = set(pe.get("page_number") for pe in page_extractions if pe.get("page_number"))
        expected_pages = set(range(1, total_pages + 1))
        missing_in_meta = expected_pages - logged_pages
        if missing_in_meta and len(missing_in_meta) > total_pages * 0.3:
            add("MAJOR", f"Page metadata missing for pages: {sorted(missing_in_meta)[:10]}{'...' if len(missing_in_meta) > 10 else ''}")

    # ---- INFO: Tables captured ----
    if pages_with_tables > 0:
        add("INFO", f"{pages_with_tables} pages have table data captured")

    # ---- INFO: Evidence summary ----
    add("INFO", f"Raw text: {total_text_len} chars across {pages_with_text}/{total_pages} pages")

    return eid, source, findings, sev


def run_audit(batch_start=1, batch_end=50):
    """Run strict evidence audit on specified file range."""
    print("=" * 80)
    print(f"STRICT EVIDENCE COMPLIANCE AUDIT — Files {batch_start}-{batch_end}")
    print("=" * 80)

    results = []
    raw_files = sorted(RAW_DIR.glob("*.json"))

    for fp in raw_files:
        with open(fp) as f:
            data = json.load(f)
        eid = str(data.get("extraction_id", "")).strip()
        if not eid.isdigit():
            continue
        eid_num = int(eid)
        if eid_num < batch_start or eid_num > batch_end:
            continue

        eid, source, findings, sev_counts = audit_raw_file(fp)
        results.append({
            "eid": eid,
            "source": source,
            "file": fp.name,
            "findings": findings,
            "severity": sev_counts
        })

        if sev_counts["CRITICAL"] > 0:
            status = "CRITICAL"
        elif sev_counts["MAJOR"] > 0:
            status = "NEEDS_FIX"
        else:
            status = "PASS"

        print(f"[{status:9s}] {eid:>3s} {source[:50]:50s} C:{sev_counts['CRITICAL']} M:{sev_counts['MAJOR']} m:{sev_counts['MINOR']} i:{sev_counts['INFO']}")
        if sev_counts["CRITICAL"] > 0 or sev_counts["MAJOR"] > 0:
            for f in findings:
                if f["severity"] in ("CRITICAL", "MAJOR"):
                    print(f"           >> [{f['severity']}] {f['message']}")

    # Summary
    critical_files = [r for r in results if r["severity"]["CRITICAL"] > 0]
    major_files = [r for r in results if r["severity"]["MAJOR"] > 0 and r["severity"]["CRITICAL"] == 0]
    pass_files = [r for r in results if r["severity"]["CRITICAL"] == 0 and r["severity"]["MAJOR"] == 0]

    print(f"\n{'=' * 80}")
    print("SUMMARY")
    print(f"{'=' * 80}")
    print(f"  PASS:      {len(pass_files)}")
    print(f"  NEEDS_FIX: {len(major_files)}")
    print(f"  CRITICAL:  {len(critical_files)}")
    print(f"  TOTAL:     {len(results)}")

    if critical_files:
        print(f"\nCRITICAL files ({len(critical_files)}):")
        for r in critical_files:
            crits = [f["message"] for f in r["findings"] if f["severity"] == "CRITICAL"]
            print(f"  {r['eid']}: {', '.join(crits)}")

    if major_files:
        print(f"\nNEEDS_FIX files ({len(major_files)}):")
        for r in major_files:
            majs = [f["message"] for f in r["findings"] if f["severity"] == "MAJOR"]
            print(f"  {r['eid']}: {', '.join(majs)}")

    # Save report
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    report = {
        "audit_type": "strict_evidence_compliance",
        "batch_range": f"{batch_start}-{batch_end}",
        "results": results,
        "summary": {
            "pass": len(pass_files),
            "needs_fix": len(major_files),
            "critical": len(critical_files),
            "total": len(results)
        }
    }
    report_path = LOG_DIR / "evidence_audit_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nFull report saved: {report_path}")

    return results


if __name__ == "__main__":
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    end = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    run_audit(start, end)
