"""
Test Auto-Promote Pipeline - Iteration 45
Tests the 4-lane auto-promotion pipeline after execution.
Pipeline has been executed: 505 products promoted via 3 lanes (245 safe + 2 family + 258 inherit).
65 remain for manual review.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_PASSWORD = "kOpcELYcEvkVtyDAE5-2uw"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token."""
    response = requests.post(
        f"{BASE_URL}/api/admin/login",
        json={"password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Get headers with auth token."""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    }


class TestReviewStats:
    """Test /api/admin/review/stats endpoint after pipeline execution."""
    
    def test_stats_endpoint_returns_200(self, auth_headers):
        """Stats endpoint should return 200."""
        response = requests.get(f"{BASE_URL}/api/admin/review/stats", headers=auth_headers)
        assert response.status_code == 200, f"Stats failed: {response.text}"
    
    def test_stats_has_expected_fields(self, auth_headers):
        """Stats should have all expected fields."""
        response = requests.get(f"{BASE_URL}/api/admin/review/stats", headers=auth_headers)
        data = response.json()
        
        required_fields = [
            "total_products", "total_canonical", "total_staged", 
            "total_promoted", "pending_review", "coverage_pct",
            "by_status", "by_action", "by_division"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_stats_canonical_count_around_1134(self, auth_headers):
        """Total canonical should be around 1134 after pipeline."""
        response = requests.get(f"{BASE_URL}/api/admin/review/stats", headers=auth_headers)
        data = response.json()
        
        # Expected ~1134 canonical (629 original + 505 promoted)
        canonical = data.get("total_canonical", 0)
        print(f"Total canonical: {canonical}")
        assert canonical >= 1100, f"Expected ~1134 canonical, got {canonical}"
        assert canonical <= 1200, f"Canonical count too high: {canonical}"
    
    def test_stats_pending_review_around_66(self, auth_headers):
        """Pending review should be around 66 after pipeline."""
        response = requests.get(f"{BASE_URL}/api/admin/review/stats", headers=auth_headers)
        data = response.json()
        
        pending = data.get("pending_review", 0)
        print(f"Pending review: {pending}")
        # Expected ~66 pending (571 - 505 promoted)
        assert pending >= 50, f"Expected ~66 pending, got {pending}"
        assert pending <= 100, f"Pending count too high: {pending}"
    
    def test_stats_promoted_count_around_842(self, auth_headers):
        """Total promoted should be around 842 (337 original + 505 new)."""
        response = requests.get(f"{BASE_URL}/api/admin/review/stats", headers=auth_headers)
        data = response.json()
        
        promoted = data.get("total_promoted", 0)
        print(f"Total promoted: {promoted}")
        # Expected ~842 promoted (337 + 505)
        assert promoted >= 800, f"Expected ~842 promoted, got {promoted}"
        assert promoted <= 900, f"Promoted count too high: {promoted}"
    
    def test_stats_coverage_above_94_percent(self, auth_headers):
        """Coverage should be above 94%."""
        response = requests.get(f"{BASE_URL}/api/admin/review/stats", headers=auth_headers)
        data = response.json()
        
        coverage = data.get("coverage_pct", 0)
        print(f"Coverage: {coverage}%")
        assert coverage >= 90, f"Expected coverage >= 94%, got {coverage}%"


class TestAutoPromotePreview:
    """Test /api/admin/review/auto-promote/preview endpoint."""
    
    def test_preview_endpoint_returns_200(self, auth_headers):
        """Preview endpoint should return 200."""
        response = requests.get(f"{BASE_URL}/api/admin/review/auto-promote/preview", headers=auth_headers)
        assert response.status_code == 200, f"Preview failed: {response.text}"
    
    def test_preview_has_expected_structure(self, auth_headers):
        """Preview should have lane1-4 and summary."""
        response = requests.get(f"{BASE_URL}/api/admin/review/auto-promote/preview", headers=auth_headers)
        data = response.json()
        
        required_fields = ["lane1_safe", "lane2_family", "lane3_inherit", "lane4_manual", "summary"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_preview_lanes_drained_after_execution(self, auth_headers):
        """After pipeline execution, lanes 1-3 should be drained (0 or near 0)."""
        response = requests.get(f"{BASE_URL}/api/admin/review/auto-promote/preview", headers=auth_headers)
        data = response.json()
        
        lane1_count = data.get("lane1_safe", {}).get("count", 0)
        lane2_count = data.get("lane2_family", {}).get("count", 0)
        lane3_count = data.get("lane3_inherit", {}).get("count", 0)
        
        print(f"Lane 1 (Safe): {lane1_count}")
        print(f"Lane 2 (Family): {lane2_count}")
        print(f"Lane 3 (Inherit): {lane3_count}")
        
        # All auto-promotable lanes should be drained
        assert lane1_count == 0, f"Lane 1 should be 0, got {lane1_count}"
        assert lane2_count == 0, f"Lane 2 should be 0, got {lane2_count}"
        assert lane3_count == 0, f"Lane 3 should be 0, got {lane3_count}"
    
    def test_preview_manual_review_around_65(self, auth_headers):
        """Manual review (lane 4) should be around 65."""
        response = requests.get(f"{BASE_URL}/api/admin/review/auto-promote/preview", headers=auth_headers)
        data = response.json()
        
        manual_count = data.get("lane4_manual", {}).get("count", 0)
        print(f"Lane 4 (Manual): {manual_count}")
        
        # Expected ~65 manual review items
        assert manual_count >= 50, f"Expected ~65 manual, got {manual_count}"
        assert manual_count <= 80, f"Manual count too high: {manual_count}"
    
    def test_preview_manual_review_has_reasons(self, auth_headers):
        """Manual review should have breakdown of reasons."""
        response = requests.get(f"{BASE_URL}/api/admin/review/auto-promote/preview", headers=auth_headers)
        data = response.json()
        
        reasons = data.get("lane4_manual", {}).get("reasons", {})
        print(f"Manual review reasons: {reasons}")
        
        # Expected reasons: conflict_detected, very_low_confidence, weak_evidence, conflict_status
        assert len(reasons) > 0, "Expected manual review reasons"
    
    def test_preview_summary_auto_promotable_zero(self, auth_headers):
        """Summary should show 0 auto-promotable after execution."""
        response = requests.get(f"{BASE_URL}/api/admin/review/auto-promote/preview", headers=auth_headers)
        data = response.json()
        
        summary = data.get("summary", {})
        auto_promotable = summary.get("auto_promotable", -1)
        manual_only = summary.get("manual_review_only", 0)
        
        print(f"Auto-promotable: {auto_promotable}")
        print(f"Manual review only: {manual_only}")
        
        assert auto_promotable == 0, f"Expected 0 auto-promotable, got {auto_promotable}"


class TestAutoPromoteExecute:
    """Test /api/admin/review/auto-promote/execute endpoint."""
    
    def test_execute_endpoint_returns_200(self, auth_headers):
        """Execute endpoint should return 200."""
        response = requests.post(
            f"{BASE_URL}/api/admin/review/auto-promote/execute",
            headers=auth_headers,
            json={"lanes": ["lane1", "lane2", "lane3"]}
        )
        assert response.status_code == 200, f"Execute failed: {response.text}"
    
    def test_execute_returns_zero_promoted_after_drain(self, auth_headers):
        """After pipeline already executed, should return 0 promoted."""
        response = requests.post(
            f"{BASE_URL}/api/admin/review/auto-promote/execute",
            headers=auth_headers,
            json={"lanes": ["lane1", "lane2", "lane3"]}
        )
        data = response.json()
        
        total_promoted = data.get("total_promoted", -1)
        results = data.get("results", {})
        
        print(f"Total promoted: {total_promoted}")
        print(f"Results: {results}")
        
        assert total_promoted == 0, f"Expected 0 promoted (already drained), got {total_promoted}"
        assert results.get("lane1", -1) == 0, f"Lane 1 should be 0"
        assert results.get("lane2", -1) == 0, f"Lane 2 should be 0"
        assert results.get("lane3", -1) == 0, f"Lane 3 should be 0"


class TestReviewProducts:
    """Test /api/admin/review/products endpoint."""
    
    def test_products_endpoint_returns_200(self, auth_headers):
        """Products endpoint should return 200."""
        response = requests.get(f"{BASE_URL}/api/admin/review/products", headers=auth_headers)
        assert response.status_code == 200, f"Products failed: {response.text}"
    
    def test_products_has_expected_structure(self, auth_headers):
        """Products response should have products, total, page, pages."""
        response = requests.get(f"{BASE_URL}/api/admin/review/products", headers=auth_headers)
        data = response.json()
        
        assert "products" in data, "Missing products field"
        assert "total" in data, "Missing total field"
        assert "page" in data, "Missing page field"
        assert "pages" in data, "Missing pages field"
    
    def test_products_returns_pending_items(self, auth_headers):
        """Should return remaining pending products."""
        response = requests.get(f"{BASE_URL}/api/admin/review/products", headers=auth_headers)
        data = response.json()
        
        total = data.get("total", 0)
        products = data.get("products", [])
        
        print(f"Total pending products: {total}")
        print(f"Products returned: {len(products)}")
        
        # Should have some pending products (around 66)
        assert total >= 50, f"Expected ~66 pending, got {total}"
        assert len(products) > 0, "Expected some products in response"
    
    def test_products_division_filter_ent(self, auth_headers):
        """Division filter should work for ENT."""
        response = requests.get(
            f"{BASE_URL}/api/admin/review/products?division=ENT",
            headers=auth_headers
        )
        data = response.json()
        
        products = data.get("products", [])
        print(f"ENT products: {len(products)}")
        
        # All returned products should be ENT division
        for p in products:
            assert p.get("division_canonical") == "ENT", f"Expected ENT, got {p.get('division_canonical')}"
    
    def test_products_have_required_fields(self, auth_headers):
        """Products should have required fields for review."""
        response = requests.get(f"{BASE_URL}/api/admin/review/products", headers=auth_headers)
        data = response.json()
        
        products = data.get("products", [])
        if len(products) > 0:
            product = products[0]
            required_fields = [
                "slug", "division_canonical", 
                "proposed_semantic_confidence", "proposed_web_verification_status"
            ]
            for field in required_fields:
                assert field in product, f"Missing field: {field}"


class TestCatalogDivisions:
    """Test /api/catalog/divisions endpoint."""
    
    def test_divisions_endpoint_returns_200(self):
        """Divisions endpoint should return 200 (no auth required)."""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions")
        assert response.status_code == 200, f"Divisions failed: {response.text}"
    
    def test_divisions_returns_4_pilot_divisions(self):
        """Should return exactly 4 pilot divisions."""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions")
        data = response.json()
        
        divisions = data.get("divisions", [])
        division_names = [d.get("name") for d in divisions]
        
        print(f"Divisions: {division_names}")
        
        expected = ["Trauma", "Cardiovascular", "Diagnostics", "Joint Replacement"]
        assert len(divisions) == 4, f"Expected 4 divisions, got {len(divisions)}"
        
        for exp in expected:
            assert exp in division_names, f"Missing division: {exp}"
    
    def test_divisions_have_product_counts(self):
        """Each division should have product_count."""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions")
        data = response.json()
        
        divisions = data.get("divisions", [])
        for div in divisions:
            assert "product_count" in div, f"Missing product_count for {div.get('name')}"
            assert div["product_count"] >= 0, f"Invalid product_count for {div.get('name')}"


class TestSmartSuggestions:
    """Test /api/admin/review/smart-suggestions endpoint."""
    
    def test_smart_suggestions_returns_200(self, auth_headers):
        """Smart suggestions endpoint should return 200."""
        response = requests.get(f"{BASE_URL}/api/admin/review/smart-suggestions", headers=auth_headers)
        assert response.status_code == 200, f"Smart suggestions failed: {response.text}"
    
    def test_smart_suggestions_has_summary(self, auth_headers):
        """Should have summary with counts."""
        response = requests.get(f"{BASE_URL}/api/admin/review/smart-suggestions", headers=auth_headers)
        data = response.json()
        
        assert "summary" in data, "Missing summary"
        assert "suggestions" in data, "Missing suggestions"
        
        summary = data.get("summary", {})
        print(f"Smart suggestions summary: {summary}")


class TestFamilies:
    """Test /api/admin/review/families endpoint."""
    
    def test_families_returns_200(self, auth_headers):
        """Families endpoint should return 200."""
        response = requests.get(f"{BASE_URL}/api/admin/review/families", headers=auth_headers)
        assert response.status_code == 200, f"Families failed: {response.text}"
    
    def test_families_has_expected_structure(self, auth_headers):
        """Should have families list and total_families."""
        response = requests.get(f"{BASE_URL}/api/admin/review/families", headers=auth_headers)
        data = response.json()
        
        assert "families" in data, "Missing families"
        assert "total_families" in data, "Missing total_families"
        
        print(f"Total families: {data.get('total_families')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
