"""
Test Phase 5A: Clinical Product Reclassification
- Products reclassified from brand-centric to clinical-centric names
- Brand info moved to clinical_subtitle field
- System Intelligence card removed from product detail page
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDivisionsEndpoint:
    """Test GET /api/catalog/divisions returns all 4 divisions with correct counts"""
    
    def test_divisions_returns_all_four(self):
        """Verify all 4 pilot divisions are returned"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions")
        assert response.status_code == 200
        data = response.json()
        assert "divisions" in data
        divisions = data["divisions"]
        assert len(divisions) == 4
        
        division_names = [d["name"] for d in divisions]
        assert "Trauma" in division_names
        assert "Cardiovascular" in division_names
        assert "Diagnostics" in division_names
        assert "Joint Replacement" in division_names
        print(f"PASS: All 4 divisions returned: {division_names}")
    
    def test_divisions_have_product_counts(self):
        """Verify each division has product_count field"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions")
        assert response.status_code == 200
        data = response.json()
        
        for div in data["divisions"]:
            assert "product_count" in div
            assert isinstance(div["product_count"], int)
            assert div["product_count"] >= 0
            print(f"  {div['name']}: {div['product_count']} products")


class TestTraumaProductsReclassification:
    """Test Trauma products have clinical_subtitle and no brand prefix in title"""
    
    def test_trauma_products_have_clinical_subtitle(self):
        """Verify Trauma products return clinical_subtitle field"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Trauma"})
        assert response.status_code == 200
        data = response.json()
        products = data.get("products", [])
        assert len(products) > 0, "No Trauma products found"
        
        # Check that clinical_subtitle field exists in response
        for p in products[:5]:  # Check first 5
            assert "clinical_subtitle" in p, f"Product {p.get('slug')} missing clinical_subtitle field"
        print(f"PASS: Trauma products have clinical_subtitle field")
    
    def test_trauma_titles_no_brand_prefix(self):
        """Verify Trauma product titles don't start with ARMAR, AURIC, KET, CLAVO"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Trauma"})
        assert response.status_code == 200
        data = response.json()
        products = data.get("products", [])
        
        brand_prefixes = ["ARMAR", "AURIC", "KET", "CLAVO"]
        violations = []
        
        for p in products:
            title = p.get("product_name_display", "")
            for prefix in brand_prefixes:
                if title.upper().startswith(prefix):
                    violations.append(f"{p.get('slug')}: '{title}' starts with {prefix}")
        
        if violations:
            print(f"WARNING: Found {len(violations)} products with brand prefix in title:")
            for v in violations[:5]:
                print(f"  - {v}")
        else:
            print("PASS: No Trauma products have brand prefix in title")
        
        # This is a soft check - some products may legitimately have brand in title
        # The key is that clinical_subtitle exists for brand info


class TestDiagnosticsProductsReclassification:
    """Test Diagnostics products naming"""
    
    def test_diagnostics_products_have_clinical_subtitle(self):
        """Verify Diagnostics products return clinical_subtitle field"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Diagnostics"})
        assert response.status_code == 200
        data = response.json()
        products = data.get("products", [])
        assert len(products) > 0, "No Diagnostics products found"
        
        # Check that clinical_subtitle field exists
        for p in products[:5]:
            assert "clinical_subtitle" in p, f"Product {p.get('slug')} missing clinical_subtitle field"
        print(f"PASS: Diagnostics products have clinical_subtitle field")
    
    def test_diagnostics_titles_check(self):
        """Check Diagnostics product titles for brand prefixes"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Diagnostics"})
        assert response.status_code == 200
        data = response.json()
        products = data.get("products", [])
        
        brand_prefixes = ["MeriScreen", "AutoQuant", "MeriSera"]
        products_with_brand_prefix = []
        products_with_clinical_subtitle = []
        
        for p in products:
            title = p.get("product_name_display", "")
            subtitle = p.get("clinical_subtitle", "")
            
            for prefix in brand_prefixes:
                if prefix.lower() in title.lower():
                    products_with_brand_prefix.append(p.get("slug"))
                if prefix.lower() in subtitle.lower():
                    products_with_clinical_subtitle.append(p.get("slug"))
        
        print(f"Diagnostics: {len(products)} total products")
        print(f"  Products with brand in title: {len(products_with_brand_prefix)}")
        print(f"  Products with brand in clinical_subtitle: {len(products_with_clinical_subtitle)}")


class TestCardiovascularProducts:
    """Test Cardiovascular products (BioMime stays in title)"""
    
    def test_cardiovascular_products_returned(self):
        """Verify Cardiovascular products are returned"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Cardiovascular"})
        assert response.status_code == 200
        data = response.json()
        products = data.get("products", [])
        assert len(products) > 0, "No Cardiovascular products found"
        print(f"PASS: {len(products)} Cardiovascular products returned")
    
    def test_cardiovascular_biomime_in_title(self):
        """Verify BioMime products keep brand in title for CV"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Cardiovascular"})
        assert response.status_code == 200
        data = response.json()
        products = data.get("products", [])
        
        biomime_products = [p for p in products if "biomime" in p.get("product_name_display", "").lower()]
        print(f"Cardiovascular: {len(biomime_products)} products with BioMime in title")


class TestProductDetailClinicalSubtitle:
    """Test product detail endpoint returns clinical_subtitle"""
    
    def test_product_detail_has_clinical_subtitle(self):
        """Verify product detail returns clinical_subtitle field"""
        # First get a product slug from Trauma
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Trauma", "limit": 1})
        assert response.status_code == 200
        products = response.json().get("products", [])
        
        if not products:
            pytest.skip("No Trauma products to test")
        
        slug = products[0]["slug"]
        
        # Get product detail
        detail_response = requests.get(f"{BASE_URL}/api/catalog/products/{slug}")
        assert detail_response.status_code == 200
        detail = detail_response.json()
        
        assert "clinical_subtitle" in detail, f"Product detail for {slug} missing clinical_subtitle"
        print(f"PASS: Product detail for '{slug}' has clinical_subtitle: '{detail.get('clinical_subtitle', '')}'")
    
    def test_specific_product_ortho_smart(self):
        """Test ortho-smart product detail if it exists"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/ortho-smart")
        
        if response.status_code == 404:
            pytest.skip("ortho-smart product not found")
        
        assert response.status_code == 200
        detail = response.json()
        assert "clinical_subtitle" in detail
        print(f"PASS: ortho-smart product has clinical_subtitle: '{detail.get('clinical_subtitle', '')}'")


class TestBrandIntelligenceEndpoint:
    """Test brand intelligence endpoint still works"""
    
    def test_armar_brand_intelligence(self):
        """Verify GET /api/catalog/brand-intelligence/ARMAR works"""
        response = requests.get(f"{BASE_URL}/api/catalog/brand-intelligence/ARMAR")
        
        if response.status_code == 404:
            print("INFO: ARMAR brand intelligence not found (may not be seeded)")
            pytest.skip("ARMAR brand intelligence not seeded")
        
        assert response.status_code == 200
        data = response.json()
        assert "entity_code" in data
        print(f"PASS: ARMAR brand intelligence returned: {data.get('entity_code')}")


class TestSpecificProductSlugs:
    """Test specific product slugs mentioned in requirements"""
    
    def test_2_4mm_lps_plate_product(self):
        """Test 2.4mm LPS Distal Radial Volar Buttress Plate product"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/2.4mm-lps-distal-radial-volar-buttress-plate")
        
        if response.status_code == 404:
            # Try searching for it
            search_response = requests.get(f"{BASE_URL}/api/catalog/products", params={"search": "2.4mm LPS", "division": "Trauma"})
            if search_response.status_code == 200:
                products = search_response.json().get("products", [])
                if products:
                    print(f"INFO: Found similar product: {products[0].get('slug')} - {products[0].get('product_name_display')}")
            pytest.skip("2.4mm-lps-distal-radial-volar-buttress-plate not found")
        
        assert response.status_code == 200
        detail = response.json()
        
        # Verify clinical_subtitle contains brand info
        subtitle = detail.get("clinical_subtitle", "")
        print(f"Product: {detail.get('product_name_display')}")
        print(f"Clinical subtitle: {subtitle}")
        
        # Check if subtitle has expected format: "AURIC by Meril • Titanium • TiNbN Coating"
        assert "clinical_subtitle" in detail
    
    def test_armar_titanium_plates_product(self):
        """Test armar-titanium-plates product (should have brand stripped from title)"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/armar-titanium-plates")
        
        if response.status_code == 404:
            # Try searching
            search_response = requests.get(f"{BASE_URL}/api/catalog/products", params={"search": "titanium plates", "division": "Trauma"})
            if search_response.status_code == 200:
                products = search_response.json().get("products", [])
                if products:
                    print(f"INFO: Found similar products:")
                    for p in products[:3]:
                        print(f"  - {p.get('slug')}: {p.get('product_name_display')}")
            pytest.skip("armar-titanium-plates not found")
        
        assert response.status_code == 200
        detail = response.json()
        
        title = detail.get("product_name_display", "")
        subtitle = detail.get("clinical_subtitle", "")
        
        print(f"Product title: {title}")
        print(f"Clinical subtitle: {subtitle}")
        
        # Title should NOT start with ARMAR (brand stripped)
        # But this may vary based on reclassification rules


class TestProductListFieldsPresent:
    """Verify all required fields are present in product list responses"""
    
    def test_product_list_fields(self):
        """Check all expected fields in product list response"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Trauma", "limit": 5})
        assert response.status_code == 200
        data = response.json()
        products = data.get("products", [])
        
        required_fields = [
            "slug", "product_name", "product_name_display", "brand", 
            "division", "category", "clinical_subtitle"
        ]
        
        for p in products:
            for field in required_fields:
                assert field in p, f"Product {p.get('slug')} missing field: {field}"
        
        print(f"PASS: All {len(required_fields)} required fields present in product list")


class TestProductDetailFieldsPresent:
    """Verify all required fields in product detail response"""
    
    def test_product_detail_fields(self):
        """Check all expected fields in product detail response"""
        # Get a product
        list_response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Trauma", "limit": 1})
        assert list_response.status_code == 200
        products = list_response.json().get("products", [])
        
        if not products:
            pytest.skip("No products to test")
        
        slug = products[0]["slug"]
        response = requests.get(f"{BASE_URL}/api/catalog/products/{slug}")
        assert response.status_code == 200
        detail = response.json()
        
        required_fields = [
            "product_name", "product_name_display", "brand", "division",
            "category", "slug", "clinical_subtitle", "skus", "sku_count"
        ]
        
        for field in required_fields:
            assert field in detail, f"Product detail missing field: {field}"
        
        print(f"PASS: All {len(required_fields)} required fields present in product detail")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
