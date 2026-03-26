"""
Test suite for Category Stats and Product Families APIs - Iteration 30
Tests the 3-level drill-down: Division → Category → Product Systems → Variant Table
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestHealthCheck:
    """Basic health check to ensure API is running"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✓ Health check passed")


class TestCategoryStatsAPI:
    """Tests for GET /api/category-stats endpoint"""
    
    def test_category_stats_trauma_division(self):
        """GET /api/category-stats?division=Trauma returns categories with system_count and sku_count"""
        response = requests.get(f"{BASE_URL}/api/category-stats", params={"division": "Trauma"})
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "categories" in data
        assert "total" in data
        categories = data["categories"]
        
        print(f"✓ Trauma division has {len(categories)} categories")
        
        # Verify each category has required fields
        for cat in categories:
            assert "division" in cat
            assert "category" in cat
            assert "system_count" in cat
            assert "sku_count" in cat
            assert cat["division"] == "Trauma"
            
        # Verify we have categories (should be around 20 based on requirements)
        assert len(categories) > 0, "Expected at least some categories for Trauma"
        print(f"✓ All {len(categories)} categories have required fields (division, category, system_count, sku_count)")
        
        # Print sample categories for verification
        for cat in categories[:5]:
            print(f"  - {cat['category']}: {cat['system_count']} systems, {cat['sku_count']} SKUs")
    
    def test_category_stats_joint_replacement_division(self):
        """GET /api/category-stats?division=Joint+Replacement returns categories"""
        response = requests.get(f"{BASE_URL}/api/category-stats", params={"division": "Joint Replacement"})
        assert response.status_code == 200
        data = response.json()
        
        categories = data["categories"]
        assert len(categories) > 0, "Expected categories for Joint Replacement"
        
        # Verify all categories belong to Joint Replacement
        for cat in categories:
            assert cat["division"] == "Joint Replacement"
            assert cat["system_count"] >= 0
            assert cat["sku_count"] >= 0
            
        print(f"✓ Joint Replacement has {len(categories)} categories")
        for cat in categories[:3]:
            print(f"  - {cat['category']}: {cat['system_count']} systems, {cat['sku_count']} SKUs")
    
    def test_category_stats_all_divisions(self):
        """GET /api/category-stats without division returns all categories"""
        response = requests.get(f"{BASE_URL}/api/category-stats")
        assert response.status_code == 200
        data = response.json()
        
        categories = data["categories"]
        total = data["total"]
        
        assert total == len(categories)
        print(f"✓ All divisions have {total} total categories")
        
        # Verify we have multiple divisions
        divisions = set(cat["division"] for cat in categories)
        print(f"✓ Categories span {len(divisions)} divisions: {', '.join(sorted(divisions))}")


class TestProductFamiliesAPI:
    """Tests for GET /api/product-families endpoint"""
    
    def test_product_families_trauma_distal_radial(self):
        """GET /api/product-families?division=Trauma&category=Distal+Radial+Plates returns families"""
        response = requests.get(f"{BASE_URL}/api/product-families", params={
            "division": "Trauma",
            "category": "Distal Radial Plates"
        })
        assert response.status_code == 200
        data = response.json()
        
        families = data["families"]
        total = data["total"]
        
        print(f"✓ Trauma > Distal Radial Plates has {total} product families")
        
        # Verify family structure
        for fam in families:
            assert "family_name" in fam
            assert "division" in fam
            assert "category" in fam
            assert "variant_count" in fam
            assert fam["division"] == "Trauma"
            
        # Print sample families
        for fam in families[:5]:
            print(f"  - {fam['family_name']}: {fam['variant_count']} variants")
    
    def test_product_families_search_variabilis(self):
        """GET /api/product-families?search=variabilis returns Variabilis families"""
        response = requests.get(f"{BASE_URL}/api/product-families", params={"search": "variabilis"})
        assert response.status_code == 200
        data = response.json()
        
        families = data["families"]
        total = data["total"]
        
        assert total > 0, "Expected Variabilis families to be found"
        print(f"✓ Search 'variabilis' found {total} product families")
        
        # Verify all results contain variabilis
        for fam in families:
            name_lower = (fam["family_name"] or "").lower()
            desc_lower = (fam.get("description") or "").lower()
            assert "variabilis" in name_lower or "variabilis" in desc_lower, \
                f"Family {fam['family_name']} doesn't match search"
        
        # Print sample families
        for fam in families[:5]:
            print(f"  - {fam['family_name']}: {fam['variant_count']} variants")
    
    def test_product_families_all_no_filter(self):
        """GET /api/product-families without filters returns all families (should be ~646)"""
        response = requests.get(f"{BASE_URL}/api/product-families", params={"limit": 1000})
        assert response.status_code == 200
        data = response.json()
        
        total = data["total"]
        print(f"✓ Total product families: {total}")
        
        # Verify pagination info
        assert "page" in data
        assert "pages" in data
    
    def test_product_families_pagination(self):
        """Test pagination works correctly"""
        # Get first page
        response1 = requests.get(f"{BASE_URL}/api/product-families", params={"page": 1, "limit": 10})
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Get second page
        response2 = requests.get(f"{BASE_URL}/api/product-families", params={"page": 2, "limit": 10})
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Verify different results
        if data1["total"] > 10:
            names1 = [f["family_name"] for f in data1["families"]]
            names2 = [f["family_name"] for f in data2["families"]]
            assert names1 != names2, "Page 1 and 2 should have different families"
            print(f"✓ Pagination working: Page 1 and 2 have different families")


class TestProductFamilyDetailAPI:
    """Tests for GET /api/product-families/{family_name} endpoint"""
    
    def test_product_family_detail_variabilis(self):
        """GET /api/product-families/Variabilis... returns family detail with variants"""
        # First find a Variabilis family
        search_response = requests.get(f"{BASE_URL}/api/product-families", params={"search": "variabilis", "limit": 1})
        assert search_response.status_code == 200
        families = search_response.json()["families"]
        
        if not families:
            pytest.skip("No Variabilis families found")
        
        family_name = families[0]["family_name"]
        
        # Get family detail
        response = requests.get(f"{BASE_URL}/api/product-families/{requests.utils.quote(family_name, safe='')}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "family" in data
        assert "variants" in data
        
        family = data["family"]
        variants = data["variants"]
        
        assert family["family_name"] == family_name
        assert "division" in family
        assert "category" in family
        assert "description" in family
        assert "variant_count" in family
        
        print(f"✓ Family detail for '{family_name}':")
        print(f"  - Division: {family['division']}")
        print(f"  - Category: {family['category']}")
        print(f"  - Variants: {len(variants)}")
        
        # Verify variants have required fields
        for v in variants[:3]:
            assert "id" in v
            assert "product_name" in v
            assert "sku_code" in v
            print(f"  - Variant: {v['product_name']} (SKU: {v['sku_code']})")
    
    def test_product_family_detail_not_found(self):
        """GET /api/product-families/NonExistent returns 404"""
        response = requests.get(f"{BASE_URL}/api/product-families/NonExistentFamilyXYZ123")
        assert response.status_code == 404
        print("✓ Non-existent family returns 404")


class TestDivisionsAPI:
    """Tests for GET /api/divisions endpoint"""
    
    def test_divisions_returns_categories(self):
        """GET /api/divisions returns divisions with categories list"""
        response = requests.get(f"{BASE_URL}/api/divisions")
        assert response.status_code == 200
        data = response.json()
        
        divisions = data["divisions"]
        assert len(divisions) > 0
        
        # Find Trauma division
        trauma = next((d for d in divisions if d["name"] == "Trauma"), None)
        assert trauma is not None, "Trauma division should exist"
        assert "categories" in trauma
        assert len(trauma["categories"]) > 0
        
        print(f"✓ Found {len(divisions)} divisions")
        print(f"✓ Trauma has {len(trauma['categories'])} categories: {', '.join(trauma['categories'][:5])}...")


class TestIntegrationFlow:
    """Test the complete 3-level drill-down flow"""
    
    def test_full_drill_down_flow(self):
        """Test Division → Category → Product Systems → Variant flow"""
        # Step 1: Get divisions
        div_response = requests.get(f"{BASE_URL}/api/divisions")
        assert div_response.status_code == 200
        divisions = div_response.json()["divisions"]
        
        # Find Trauma
        trauma = next((d for d in divisions if d["name"] == "Trauma"), None)
        assert trauma is not None
        print(f"✓ Step 1: Found Trauma division with {trauma['product_count']} products")
        
        # Step 2: Get category stats for Trauma
        cat_response = requests.get(f"{BASE_URL}/api/category-stats", params={"division": "Trauma"})
        assert cat_response.status_code == 200
        categories = cat_response.json()["categories"]
        print(f"✓ Step 2: Trauma has {len(categories)} categories")
        
        # Find a category with products
        category = next((c for c in categories if c["sku_count"] > 0), None)
        if not category:
            pytest.skip("No categories with products found")
        
        print(f"✓ Step 3: Selected category '{category['category']}' with {category['system_count']} systems")
        
        # Step 3: Get product families for that category
        fam_response = requests.get(f"{BASE_URL}/api/product-families", params={
            "division": "Trauma",
            "category": category["category"]
        })
        assert fam_response.status_code == 200
        families = fam_response.json()["families"]
        print(f"✓ Step 4: Found {len(families)} product families in '{category['category']}'")
        
        # Step 4: Get family detail
        if families:
            family = families[0]
            detail_response = requests.get(
                f"{BASE_URL}/api/product-families/{requests.utils.quote(family['family_name'], safe='')}"
            )
            assert detail_response.status_code == 200
            detail = detail_response.json()
            print(f"✓ Step 5: Family '{family['family_name']}' has {len(detail['variants'])} variants")
        
        print("✓ Full drill-down flow completed successfully!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
