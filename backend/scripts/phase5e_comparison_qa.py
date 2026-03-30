"""Phase 5E QA: Test comparison guardrails with specific pairs."""
import asyncio, os, json, aiohttp
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

API_URL = "https://territory-lead-hub.preview.emergentagent.com"

TEST_PAIRS = [
    # 1. ARMAR vs AURIC for same plate family (should pass — same implant_class=plates)
    {
        "name": "ARMAR vs AURIC plate (same clinical family)",
        "slugs": ["armar-titanium-plates", "2.4mm-lps-distal-radial-volar-buttress-plate"],
        "expect": "pass",
        "expected_basis": "same_clinical_class",
    },
    # 2. PFRN vs (another nail if exists) — same system_type=nail_system
    {
        "name": "PFRN nail vs Elastic Nail (both nails)",
        "slugs": ["pfrn-proximal-femoral-rotational-stability-nail", "elastic-titanium-nail"],
        "expect": "pass",
        "expected_basis": "same_system_type",
    },
    # 3. BioMime vs MOZEC (both CV stents/devices)
    {
        "name": "BioMime vs MOZEC (CV devices)",
        "slugs": ["biomime-aura-sirolimus-eluting-coronary-stent-system", "mozec-rx-ptca-balloon-catheter"],
        "expect": "pass_or_block",  # May block if different implant_class
    },
    # 4. Diagnostics rapid test vs same analyte
    {
        "name": "HIV Rapid Test vs Dengue Test (both rapid tests)",
        "slugs": ["hiv-1-2-rapid-test-kit", "vircell-dengue-igm"],
        "expect": "pass",
    },
    # 5. ELISA vs same analyte ELISA
    {
        "name": "Albumin Reagent vs ALAT Reagent (both reagents)",
        "slugs": ["albumin-reagent", "alat-(gpt)-reagent"],
        "expect": "pass",
        "expected_basis": "same_clinical_class",
    },
    # 6. Invalid: plate vs screw (should be blocked)
    {
        "name": "AURIC Plate vs MBOSS Screw (MUST BLOCK — different clinical class)",
        "slugs": ["2.4mm-lps-distal-radial-volar-buttress-plate", "mboss-screw-system"],
        "expect": "block",
    },
    # 7. Cross-division (should be blocked)
    {
        "name": "Trauma plate vs CV stent (MUST BLOCK — cross-division)",
        "slugs": ["armar-titanium-plates", "biomime-aura-sirolimus-eluting-coronary-stent-system"],
        "expect": "block",
    },
    # 8. Component vs implant: screw vs nail (should be blocked)
    {
        "name": "MBOSS Screw vs PFRN Nail (MUST BLOCK — component vs implant)",
        "slugs": ["mboss-screw-system", "pfrn-proximal-femoral-rotational-stability-nail"],
        "expect": "block",
    },
    # 9. Reagent vs rapid test (should block — different implant class)
    {
        "name": "Albumin Reagent vs HIV Rapid Test (MUST BLOCK — different clinical class)",
        "slugs": ["albumin-reagent", "hiv-1-2-rapid-test-kit"],
        "expect": "block",
    },
]

async def run_tests():
    async with aiohttp.ClientSession() as session:
        print("=" * 70)
        print("COMPARISON QA — Testing 9 pairs")
        print("=" * 70)
        
        passed = 0
        failed = 0
        
        for test in TEST_PAIRS:
            try:
                async with session.post(
                    f"{API_URL}/api/catalog/compare",
                    json={"slugs": test["slugs"]},
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    data = await resp.json()
                    status = resp.status
                    
                    if test["expect"] == "block":
                        if status >= 400:
                            print(f"  PASS: {test['name']}")
                            print(f"        → Correctly blocked: {data.get('detail','')[:80]}")
                            passed += 1
                        else:
                            print(f"  FAIL: {test['name']}")
                            print(f"        → Should be blocked but got {status}: basis={data.get('comparison_basis')}")
                            failed += 1
                    elif test["expect"] in ("pass", "pass_or_block"):
                        if status == 200:
                            basis = data.get("comparison_basis", "")
                            conf = data.get("comparison_confidence", "")
                            reason = data.get("comparison_guardrail_reason", "")
                            print(f"  PASS: {test['name']}")
                            print(f"        → basis={basis}, confidence={conf}")
                            print(f"        → reason: {reason}")
                            if test.get("expected_basis") and basis != test["expected_basis"]:
                                print(f"        ⚠️ Expected basis {test['expected_basis']}, got {basis}")
                            passed += 1
                        elif test["expect"] == "pass_or_block" and status >= 400:
                            print(f"  OK: {test['name']}")
                            print(f"        → Blocked (acceptable): {data.get('detail','')[:80]}")
                            passed += 1
                        else:
                            print(f"  FAIL: {test['name']}")
                            print(f"        → Expected pass but got {status}: {data.get('detail','')[:80]}")
                            failed += 1
            except Exception as e:
                print(f"  ERROR: {test['name']} — {e}")
                failed += 1
        
        print(f"\n{'=' * 70}")
        print(f"RESULTS: {passed}/{passed+failed} tests passed")
        print(f"{'=' * 70}")

asyncio.run(run_tests())
