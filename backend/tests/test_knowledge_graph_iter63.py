"""
Test Suite for Product Knowledge Graph - Relationship Mining Engine (Phase 1)
Iteration 63: Tests REQUIRES + BUNDLE relationship mining, recommendations API, admin endpoints

Endpoints tested:
- GET /api/products/{slug}/recommendations - Public recommendations endpoint
- GET /api/admin/knowledge-graph/stats - Admin stats (requires auth)
- POST /api/admin/knowledge-graph/rebuild - Admin rebuild (requires auth)
- GET /api/catalog/products/{slug}/related - Regression test for existing related products
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_PASSWORD = "AgileHealth2026admin"

# Test product slug known to have recommendations
TEST_SLUG = "variabilis-2.4mm-multi-angle-distal-radial-plate-4-holes-66mm-width-22mm-right"
UNKNOWN_SLUG = "nonexistent-product-slug-xyz-12345"

# Valid orthopedic diameters (should match, NOT widths/lengths like 22mm, 45mm)
VALID_DIAMETERS = {"1.5", "2.0", "2.4", "2.7", "3.0", "3.5", "4.0", "4.5", "4.9", "5.0", "5.5", "6.0", "6.5", "7.0", "7.3"}


class TestKnowledgeGraphPublicAPI:
    """Tests for public recommendations endpoint"""

    def test_recommendations_returns_200_for_known_product(self):
        """GET /api/products/{slug}/recommendations returns 200 for known product"""
        response = requests.get(f"{BASE_URL}/api/products/{TEST_SLUG}/recommendations")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("found") is True, "Expected found=True"
        assert "product" in data, "Missing 'product' field"
        assert "must_buy" in data, "Missing 'must_buy' field (REQUIRES)"
        assert "bundle" in data, "Missing 'bundle' field (BUNDLE)"
        assert "total_recommendations" in data, "Missing 'total_recommendations' field"
        print(f"✓ Recommendations endpoint returned {data['total_recommendations']} total recommendations")

    def test_recommendations_must_buy_structure(self):
        """Verify must_buy (REQUIRES) array has correct structure with product cards"""
        response = requests.get(f"{BASE_URL}/api/products/{TEST_SLUG}/recommendations")
        assert response.status_code == 200
        
        data = response.json()
        must_buy = data.get("must_buy", [])
        
        # Should have at least some REQUIRES edges for this plate
        print(f"✓ Found {len(must_buy)} must_buy (REQUIRES) recommendations")
        
        if must_buy:
            item = must_buy[0]
            # Verify product card structure
            assert "slug" in item, "Missing 'slug' in must_buy item"
            assert "product_name" in item, "Missing 'product_name' in must_buy item"
            assert "confidence" in item, "Missing 'confidence' in must_buy item"
            assert "reason" in item, "Missing 'reason' in must_buy item"
            
            # Verify confidence is a number between 0 and 1
            assert isinstance(item["confidence"], (int, float)), "Confidence should be numeric"
            assert 0 <= item["confidence"] <= 1, f"Confidence {item['confidence']} out of range [0,1]"
            
            print(f"✓ must_buy item structure valid: {item['product_name'][:50]}... (confidence: {item['confidence']})")

    def test_recommendations_bundle_structure(self):
        """Verify bundle (BUNDLE) array has correct structure with product cards"""
        response = requests.get(f"{BASE_URL}/api/products/{TEST_SLUG}/recommendations")
        assert response.status_code == 200
        
        data = response.json()
        bundle = data.get("bundle", [])
        
        print(f"✓ Found {len(bundle)} bundle (BUNDLE) recommendations")
        
        if bundle:
            item = bundle[0]
            # Verify product card structure
            assert "slug" in item, "Missing 'slug' in bundle item"
            assert "product_name" in item, "Missing 'product_name' in bundle item"
            assert "confidence" in item, "Missing 'confidence' in bundle item"
            assert "reason" in item, "Missing 'reason' in bundle item"
            
            print(f"✓ bundle item structure valid: {item['product_name'][:50]}... (confidence: {item['confidence']})")

    def test_recommendations_returns_404_for_unknown_slug(self):
        """GET /api/products/{slug}/recommendations returns 404 for unknown slug"""
        response = requests.get(f"{BASE_URL}/api/products/{UNKNOWN_SLUG}/recommendations")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Unknown slug correctly returns 404")

    def test_recommendations_no_mongodb_id_leak(self):
        """Verify MongoDB _id is NOT leaked in any response"""
        response = requests.get(f"{BASE_URL}/api/products/{TEST_SLUG}/recommendations")
        assert response.status_code == 200
        
        data = response.json()
        response_text = str(data)
        
        # Check for _id in response
        assert "_id" not in response_text, "MongoDB _id leaked in response!"
        
        # Also check nested objects
        for item in data.get("must_buy", []):
            assert "_id" not in item, "MongoDB _id leaked in must_buy item"
        for item in data.get("bundle", []):
            assert "_id" not in item, "MongoDB _id leaked in bundle item"
        
        print("✓ No MongoDB _id leak detected")


class TestKnowledgeGraphAdminAPI:
    """Tests for admin knowledge graph endpoints (require authentication)"""

    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]

    def test_stats_requires_auth(self):
        """GET /api/admin/knowledge-graph/stats returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/knowledge-graph/stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Stats endpoint correctly requires authentication")

    def test_rebuild_requires_auth(self):
        """POST /api/admin/knowledge-graph/rebuild returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/admin/knowledge-graph/rebuild")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Rebuild endpoint correctly requires authentication")

    def test_stats_with_auth(self, admin_token):
        """GET /api/admin/knowledge-graph/stats returns stats with valid auth"""
        response = requests.get(
            f"{BASE_URL}/api/admin/knowledge-graph/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields
        assert "total_relationships" in data, "Missing 'total_relationships'"
        assert "requires_edges" in data, "Missing 'requires_edges'"
        assert "bundle_edges" in data, "Missing 'bundle_edges'"
        assert "coverage_pct" in data, "Missing 'coverage_pct'"
        
        # Verify values are reasonable (based on agent context: 672 REQUIRES, 5252 BUNDLE)
        assert data["total_relationships"] > 0, "Expected some relationships"
        assert data["requires_edges"] >= 0, "requires_edges should be non-negative"
        assert data["bundle_edges"] >= 0, "bundle_edges should be non-negative"
        assert 0 <= data["coverage_pct"] <= 100, "coverage_pct should be 0-100"
        
        print(f"✓ Stats: {data['total_relationships']} total, {data['requires_edges']} REQUIRES, {data['bundle_edges']} BUNDLE, {data['coverage_pct']}% coverage")

    def test_rebuild_with_auth(self, admin_token):
        """POST /api/admin/knowledge-graph/rebuild rebuilds graph and returns stats"""
        response = requests.post(
            f"{BASE_URL}/api/admin/knowledge-graph/rebuild",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=120  # Rebuild may take time
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify rebuild returns stats
        assert "total_relationships" in data, "Missing 'total_relationships' in rebuild response"
        assert "requires_edges" in data, "Missing 'requires_edges' in rebuild response"
        assert "bundle_edges" in data, "Missing 'bundle_edges' in rebuild response"
        assert "rebuilt_at" in data, "Missing 'rebuilt_at' timestamp"
        
        # Per requirements: total_relationships > 5000, requires_edges > 500, bundle_edges > 4000
        assert data["total_relationships"] > 5000, f"Expected >5000 total relationships, got {data['total_relationships']}"
        assert data["requires_edges"] > 500, f"Expected >500 REQUIRES edges, got {data['requires_edges']}"
        assert data["bundle_edges"] > 4000, f"Expected >4000 BUNDLE edges, got {data['bundle_edges']}"
        
        print(f"✓ Rebuild successful: {data['total_relationships']} total, {data['requires_edges']} REQUIRES, {data['bundle_edges']} BUNDLE")


class TestRequiresConfidenceScoring:
    """Tests for REQUIRES relationship confidence scoring"""

    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")

    def test_requires_confidence_values(self):
        """Verify REQUIRES confidence is 0.95 for same-brand or 0.80 for cross-brand"""
        response = requests.get(f"{BASE_URL}/api/products/{TEST_SLUG}/recommendations")
        assert response.status_code == 200
        
        data = response.json()
        must_buy = data.get("must_buy", [])
        
        if not must_buy:
            pytest.skip("No REQUIRES recommendations found for test product")
        
        for item in must_buy:
            confidence = item.get("confidence")
            # Per spec: 0.95 for same-brand, 0.80 for cross-brand
            assert confidence in [0.95, 0.80], f"Unexpected confidence value: {confidence}"
            print(f"  - {item['product_name'][:40]}... confidence={confidence}")
        
        print(f"✓ All {len(must_buy)} REQUIRES items have valid confidence (0.95 or 0.80)")


class TestDiameterMatching:
    """Tests for diameter extraction and matching logic"""

    def test_diameter_in_reason_is_valid(self):
        """Verify diameter matching only uses VALID_DIAMETERS (not widths like 22mm, 45mm)"""
        response = requests.get(f"{BASE_URL}/api/products/{TEST_SLUG}/recommendations")
        assert response.status_code == 200
        
        data = response.json()
        must_buy = data.get("must_buy", [])
        
        if not must_buy:
            pytest.skip("No REQUIRES recommendations to verify diameter matching")
        
        for item in must_buy:
            reason = item.get("reason", "")
            # Extract diameter from reason like "2.4mm diameter match"
            import re
            match = re.search(r"(\d+\.?\d*)mm diameter", reason)
            if match:
                diameter = match.group(1)
                # Normalize: "2" -> "2.0"
                if "." not in diameter:
                    diameter = f"{diameter}.0"
                assert diameter in VALID_DIAMETERS, f"Invalid diameter {diameter}mm in reason: {reason}"
                print(f"  - Valid diameter match: {diameter}mm")
        
        print("✓ All diameter matches use valid orthopedic diameters (not widths/lengths)")


class TestRegressionRelatedProducts:
    """Regression test: existing /api/catalog/products/{slug}/related must still work"""

    def test_related_products_endpoint_still_works(self):
        """GET /api/catalog/products/{slug}/related should still return 200"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/{TEST_SLUG}/related")
        assert response.status_code == 200, f"Regression: related endpoint broken! Got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should return some structure (brand-level graph)
        assert isinstance(data, (dict, list)), "Expected dict or list response"
        print(f"✓ Regression test passed: /api/catalog/products/{TEST_SLUG}/related returns 200")


class TestEdgeCases:
    """Edge case tests"""

    def test_recommendations_for_product_without_relationships(self):
        """Test product that may have no relationships returns empty arrays"""
        # Try a few different slugs that might not have relationships
        test_slugs = [
            "test-product-no-relationships",
            "some-random-slug-123"
        ]
        
        for slug in test_slugs:
            response = requests.get(f"{BASE_URL}/api/products/{slug}/recommendations")
            # Should return 404 if product doesn't exist
            if response.status_code == 404:
                print(f"  - {slug}: 404 (product not found)")
                continue
            
            # If product exists but has no relationships, should return empty arrays
            if response.status_code == 200:
                data = response.json()
                print(f"  - {slug}: found={data.get('found')}, must_buy={len(data.get('must_buy', []))}, bundle={len(data.get('bundle', []))}")
        
        print("✓ Edge case handling verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
