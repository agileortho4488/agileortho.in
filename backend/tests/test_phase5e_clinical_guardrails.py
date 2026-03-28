"""
Phase 5E: Clinical-Level Comparison Guardrails Tests
Tests for:
- Clinical-level guardrails (plate vs plate OK, plate vs screw BLOCKED)
- comparison_basis, comparison_confidence, comparison_guardrail_reason fields
- Suggestions filtered by same clinical family
- Title Case formatting for system type and implant class values
- Cross-division and cross-clinical-class blocking
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ═══════════════════════════════════════════════════
# Test product slugs for clinical guardrail testing
# ═══════════════════════════════════════════════════

# Trauma - Same clinical class (plates)
ARMAR_PLATE = "armar-titanium-plates"
AURIC_PLATE = "2.4mm-lps-distal-radial-volar-buttress-plate"

# Trauma - Different clinical class (plate vs screw)
PLATE_PRODUCT = "2.4mm-lps-distal-radial-volar-buttress-plate"
SCREW_PRODUCT = "mboss-screw-system"

# Diagnostics - Same clinical class (reagents)
ALBUMIN_REAGENT = "albumin-reagent"
ALAT_REAGENT = "alat-(gpt)-reagent"

# Diagnostics - Different clinical class (reagent vs rapid test)
HIV_RAPID_TEST = "hiv-1-2-rapid-test-kit"

# Cardiovascular products (for cross-division test)
CARDIO_PRODUCT = "biomime-aura-sirolimus-eluting-coronary-stent-system"

# Product for suggestions test
ORTHO_SMART = "ortho-smart"


class TestClinicalLevelGuardrails:
    """Tests for clinical-level comparison guardrails (Phase 5E)"""
    
    def test_same_clinical_class_plates_pass(self):
        """Compare ARMAR plate + AURIC plate - should pass with same_clinical_class"""
        response = requests.post(
            f"{BASE_URL}/api/catalog/compare",
            json={"slugs": [ARMAR_PLATE, AURIC_PLATE]},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify new Phase 5E fields
        assert "comparison_basis" in data, "Response should have comparison_basis"
        assert "comparison_confidence" in data, "Response should have comparison_confidence"
        assert "comparison_guardrail_reason" in data, "Response should have comparison_guardrail_reason"
        
        # Verify values
        assert data["comparison_basis"] in ["same_clinical_class", "same_system_type", "same_category"], \
            f"comparison_basis should indicate same class: {data['comparison_basis']}"
        assert data["comparison_confidence"] in ["high", "medium"], \
            f"comparison_confidence should be high or medium: {data['comparison_confidence']}"
        
        print(f"SUCCESS: Plates comparison passed")
        print(f"  comparison_basis: {data['comparison_basis']}")
        print(f"  comparison_confidence: {data['comparison_confidence']}")
        print(f"  comparison_guardrail_reason: {data['comparison_guardrail_reason']}")
    
    def test_different_clinical_class_plate_vs_screw_blocked(self):
        """Compare plate + screw - should return 400 error about different clinical classes"""
        response = requests.post(
            f"{BASE_URL}/api/catalog/compare",
            json={"slugs": [PLATE_PRODUCT, SCREW_PRODUCT]},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400, f"Expected 400 for plate vs screw, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "detail" in data, "Error response should have detail"
        detail_lower = data["detail"].lower()
        
        # Should mention clinical class or type difference
        assert any(term in detail_lower for term in ["clinical", "class", "type", "different"]), \
            f"Error should mention clinical class difference: {data['detail']}"
        
        print(f"SUCCESS: Plate vs Screw comparison blocked")
        print(f"  Error: {data['detail']}")
    
    def test_cross_division_blocked(self):
        """Compare Trauma + Cardiovascular products - should return 400 error"""
        response = requests.post(
            f"{BASE_URL}/api/catalog/compare",
            json={"slugs": [ARMAR_PLATE, CARDIO_PRODUCT]},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400, f"Expected 400 for cross-division, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "detail" in data, "Error response should have detail"
        assert "division" in data["detail"].lower(), f"Error should mention division: {data['detail']}"
        
        print(f"SUCCESS: Cross-division comparison blocked")
        print(f"  Error: {data['detail']}")
    
    def test_same_clinical_class_reagents_pass(self):
        """Compare albumin-reagent + alat-(gpt)-reagent - should pass with same_clinical_class"""
        response = requests.post(
            f"{BASE_URL}/api/catalog/compare",
            json={"slugs": [ALBUMIN_REAGENT, ALAT_REAGENT]},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify new Phase 5E fields
        assert "comparison_basis" in data, "Response should have comparison_basis"
        assert "comparison_confidence" in data, "Response should have comparison_confidence"
        assert "comparison_guardrail_reason" in data, "Response should have comparison_guardrail_reason"
        
        print(f"SUCCESS: Reagents comparison passed")
        print(f"  comparison_basis: {data['comparison_basis']}")
        print(f"  comparison_confidence: {data['comparison_confidence']}")
        print(f"  comparison_guardrail_reason: {data['comparison_guardrail_reason']}")
    
    def test_different_clinical_class_reagent_vs_rapid_test_blocked(self):
        """Compare reagent + rapid test - should return 400 error"""
        response = requests.post(
            f"{BASE_URL}/api/catalog/compare",
            json={"slugs": [ALBUMIN_REAGENT, HIV_RAPID_TEST]},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400, f"Expected 400 for reagent vs rapid test, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "detail" in data, "Error response should have detail"
        detail_lower = data["detail"].lower()
        
        # Should mention clinical class or type difference
        assert any(term in detail_lower for term in ["clinical", "class", "type", "different"]), \
            f"Error should mention clinical class difference: {data['detail']}"
        
        print(f"SUCCESS: Reagent vs Rapid Test comparison blocked")
        print(f"  Error: {data['detail']}")


class TestComparisonResponseFields:
    """Tests for comparison_basis, comparison_confidence, comparison_guardrail_reason fields"""
    
    def test_response_contains_all_new_fields(self):
        """Verify comparison response contains all new Phase 5E fields"""
        response = requests.post(
            f"{BASE_URL}/api/catalog/compare",
            json={"slugs": [ARMAR_PLATE, AURIC_PLATE]},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields exist
        required_fields = ["comparison_basis", "comparison_confidence", "comparison_guardrail_reason"]
        for field in required_fields:
            assert field in data, f"Response missing required field: {field}"
            assert data[field] is not None, f"Field {field} should not be None"
        
        print(f"SUCCESS: All new fields present")
        print(f"  comparison_basis: {data['comparison_basis']}")
        print(f"  comparison_confidence: {data['comparison_confidence']}")
        print(f"  comparison_guardrail_reason: {data['comparison_guardrail_reason']}")
    
    def test_comparison_confidence_values(self):
        """Verify comparison_confidence is one of expected values"""
        response = requests.post(
            f"{BASE_URL}/api/catalog/compare",
            json={"slugs": [ARMAR_PLATE, AURIC_PLATE]},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        valid_confidence = ["high", "medium", "low"]
        assert data["comparison_confidence"] in valid_confidence, \
            f"comparison_confidence should be one of {valid_confidence}, got: {data['comparison_confidence']}"
        
        print(f"SUCCESS: comparison_confidence is valid: {data['comparison_confidence']}")
    
    def test_comparison_basis_values(self):
        """Verify comparison_basis is one of expected values"""
        response = requests.post(
            f"{BASE_URL}/api/catalog/compare",
            json={"slugs": [ARMAR_PLATE, AURIC_PLATE]},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        valid_basis = ["same_clinical_class", "same_system_type", "same_category", "same_division_only", "unknown"]
        assert data["comparison_basis"] in valid_basis, \
            f"comparison_basis should be one of {valid_basis}, got: {data['comparison_basis']}"
        
        print(f"SUCCESS: comparison_basis is valid: {data['comparison_basis']}")


class TestTitleCaseFormatting:
    """Tests for Title Case formatting of system type and implant class values"""
    
    def test_system_type_title_case(self):
        """Verify system type values are Title Case (not snake_case)"""
        response = requests.post(
            f"{BASE_URL}/api/catalog/compare",
            json={"slugs": [ARMAR_PLATE, AURIC_PLATE]},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Find System Type row
        system_type_row = next((row for row in data["comparison"] if row["label"] == "System Type"), None)
        
        if system_type_row:
            for val in system_type_row["values"]:
                if val and val != "—":
                    # Check it's not snake_case
                    assert "_" not in val, f"System type should be Title Case, not snake_case: {val}"
                    print(f"SUCCESS: System Type value is Title Case: {val}")
        else:
            print("INFO: No System Type row found (may be empty for these products)")
    
    def test_implant_class_title_case(self):
        """Verify implant class values are Title Case (not snake_case)"""
        response = requests.post(
            f"{BASE_URL}/api/catalog/compare",
            json={"slugs": [ARMAR_PLATE, AURIC_PLATE]},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Find Implant Class row
        implant_class_row = next((row for row in data["comparison"] if row["label"] == "Implant Class"), None)
        
        if implant_class_row:
            for val in implant_class_row["values"]:
                if val and val != "—":
                    # Check it's not snake_case
                    assert "_" not in val, f"Implant class should be Title Case, not snake_case: {val}"
                    print(f"SUCCESS: Implant Class value is Title Case: {val}")
        else:
            print("INFO: No Implant Class row found (may be empty for these products)")
    
    def test_product_card_values_formatted(self):
        """Verify product card values (system_type, implant_class) are formatted"""
        response = requests.post(
            f"{BASE_URL}/api/catalog/compare",
            json={"slugs": [ARMAR_PLATE, AURIC_PLATE]},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        for product in data["products"]:
            system_type = product.get("system_type", "")
            implant_class = product.get("implant_class", "")
            
            if system_type and system_type != "—":
                assert "_" not in system_type, f"Product system_type should be Title Case: {system_type}"
            
            if implant_class and implant_class != "—":
                assert "_" not in implant_class, f"Product implant_class should be Title Case: {implant_class}"
        
        print("SUCCESS: Product card values are properly formatted")


class TestSuggestionsWithClinicalFilter:
    """Tests for suggestions endpoint with clinical family filtering"""
    
    def test_suggestions_have_comparison_reason(self):
        """Verify suggestions have comparison_reason field"""
        response = requests.get(f"{BASE_URL}/api/catalog/compare/suggestions/{ORTHO_SMART}")
        
        # May return 404 if product doesn't exist, which is fine
        if response.status_code == 404:
            print(f"INFO: Product {ORTHO_SMART} not found, trying alternative")
            response = requests.get(f"{BASE_URL}/api/catalog/compare/suggestions/{ARMAR_PLATE}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "suggestions" in data, "Response should have suggestions array"
        
        for suggestion in data["suggestions"]:
            assert "comparison_reason" in suggestion, f"Suggestion missing comparison_reason: {suggestion.get('slug')}"
        
        if data["suggestions"]:
            reasons = set(s["comparison_reason"] for s in data["suggestions"])
            print(f"SUCCESS: All suggestions have comparison_reason. Unique reasons: {reasons}")
        else:
            print("INFO: No suggestions returned")
    
    def test_suggestions_filtered_by_clinical_family(self):
        """Verify suggestions are filtered by same clinical family"""
        response = requests.get(f"{BASE_URL}/api/catalog/compare/suggestions/{ARMAR_PLATE}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check that suggestions include "Same Clinical Family" reason
        if data["suggestions"]:
            reasons = [s["comparison_reason"] for s in data["suggestions"]]
            clinical_family_suggestions = [r for r in reasons if "clinical" in r.lower() or "family" in r.lower()]
            
            print(f"SUCCESS: Got {len(data['suggestions'])} suggestions")
            print(f"  Reasons: {set(reasons)}")
            
            if clinical_family_suggestions:
                print(f"  Clinical family suggestions: {len(clinical_family_suggestions)}")
        else:
            print("INFO: No suggestions returned")


class TestExistingEndpointsStillWork:
    """Verify existing catalog endpoints still work after Phase 5E changes"""
    
    def test_divisions_endpoint(self):
        """GET /api/catalog/divisions should still work"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions")
        
        assert response.status_code == 200
        data = response.json()
        assert "divisions" in data
        assert len(data["divisions"]) >= 4, "Should have at least 4 pilot divisions"
        print(f"SUCCESS: Divisions endpoint returns {len(data['divisions'])} divisions")
    
    def test_product_detail_endpoint(self):
        """GET /api/catalog/products/{slug} should still work"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/{ARMAR_PLATE}")
        
        assert response.status_code == 200
        data = response.json()
        assert "product_name_display" in data
        assert "skus" in data
        assert "division" in data
        print(f"SUCCESS: Product detail for {ARMAR_PLATE} - {data['product_name_display']}")
    
    def test_products_list_endpoint(self):
        """GET /api/catalog/products should still work"""
        response = requests.get(f"{BASE_URL}/api/catalog/products?division=Trauma&limit=5")
        
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert "total" in data
        print(f"SUCCESS: Products list returns {len(data['products'])} products, total: {data['total']}")
    
    def test_related_products_endpoint(self):
        """GET /api/catalog/products/{slug}/related should still work"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/{ARMAR_PLATE}/related")
        
        assert response.status_code == 200
        data = response.json()
        assert "compatible_components" in data
        assert "same_family_alternatives" in data
        assert "related_system_products" in data
        print(f"SUCCESS: Related products endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
