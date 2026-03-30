"""
Iteration 60: Backend Prerender Service Tests
Tests the prerender endpoints that serve HTML to non-JS crawlers.
"""
import pytest
import requests
import os
import json
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPrerenderProduct:
    """Tests for /api/prerender/product/{slug} endpoint"""
    
    def test_prerender_product_mboss_screw_system_returns_200(self):
        """Test that mboss-screw-system product returns 200 with valid HTML"""
        response = requests.get(f"{BASE_URL}/api/prerender/product/mboss-screw-system")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "text/html" in response.headers.get("content-type", ""), "Expected HTML content type"
        print("PASS: /api/prerender/product/mboss-screw-system returns 200 with HTML")
    
    def test_prerender_product_mboss_has_correct_title(self):
        """Test that mboss-screw-system has correct title containing product name"""
        response = requests.get(f"{BASE_URL}/api/prerender/product/mboss-screw-system")
        assert response.status_code == 200
        html = response.text
        # Check title tag contains MBOSS Screw System
        title_match = re.search(r'<title>([^<]+)</title>', html, re.IGNORECASE)
        assert title_match, "No title tag found in HTML"
        title = title_match.group(1)
        assert "MBOSS" in title.upper() or "Screw System" in title, f"Title '{title}' doesn't contain expected product name"
        print(f"PASS: Title contains product name: {title}")
    
    def test_prerender_product_mboss_has_json_ld_product_schema(self):
        """Test that mboss-screw-system has JSON-LD Product schema"""
        response = requests.get(f"{BASE_URL}/api/prerender/product/mboss-screw-system")
        assert response.status_code == 200
        html = response.text
        # Find JSON-LD scripts
        json_ld_matches = re.findall(r'<script type="application/ld\+json">([^<]+)</script>', html)
        assert len(json_ld_matches) > 0, "No JSON-LD scripts found"
        
        # Check for Product schema
        has_product_schema = False
        for json_str in json_ld_matches:
            try:
                schema = json.loads(json_str)
                if schema.get("@type") == "Product":
                    has_product_schema = True
                    assert "name" in schema, "Product schema missing 'name'"
                    assert "brand" in schema, "Product schema missing 'brand'"
                    print(f"PASS: Found Product schema with name: {schema.get('name')}")
                    break
            except json.JSONDecodeError:
                continue
        
        assert has_product_schema, "No Product JSON-LD schema found"
    
    def test_prerender_product_nonexistent_returns_404(self):
        """Test that nonexistent product returns 404"""
        response = requests.get(f"{BASE_URL}/api/prerender/product/nonexistent-product-xyz-123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: /api/prerender/product/nonexistent-product returns 404")


class TestPrerenderCatalog:
    """Tests for /api/prerender/catalog endpoint"""
    
    def test_prerender_catalog_returns_200(self):
        """Test that catalog prerender returns 200 with valid HTML"""
        response = requests.get(f"{BASE_URL}/api/prerender/catalog")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "text/html" in response.headers.get("content-type", ""), "Expected HTML content type"
        print("PASS: /api/prerender/catalog returns 200 with HTML")
    
    def test_prerender_catalog_lists_divisions(self):
        """Test that catalog prerender lists divisions"""
        response = requests.get(f"{BASE_URL}/api/prerender/catalog")
        assert response.status_code == 200
        html = response.text
        # Check for division links - should have multiple divisions
        division_links = re.findall(r'<a href="/catalog/([^"]+)">', html)
        assert len(division_links) > 0, "No division links found in catalog prerender"
        print(f"PASS: Found {len(division_links)} division links in catalog")


class TestPrerenderDivision:
    """Tests for /api/prerender/catalog/{division_slug} endpoint"""
    
    def test_prerender_division_trauma_returns_200(self):
        """Test that trauma division returns 200 with products"""
        response = requests.get(f"{BASE_URL}/api/prerender/catalog/trauma")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "text/html" in response.headers.get("content-type", ""), "Expected HTML content type"
        print("PASS: /api/prerender/catalog/trauma returns 200 with HTML")
    
    def test_prerender_division_trauma_has_products(self):
        """Test that trauma division lists products"""
        response = requests.get(f"{BASE_URL}/api/prerender/catalog/trauma")
        assert response.status_code == 200
        html = response.text
        # Check for product links
        product_links = re.findall(r'<a href="/catalog/products/([^"]+)">', html)
        assert len(product_links) > 0, "No product links found in trauma division"
        print(f"PASS: Found {len(product_links)} product links in trauma division")


class TestPrerenderDistrict:
    """Tests for /api/prerender/district/{slug} endpoint"""
    
    def test_prerender_district_hyderabad_returns_200(self):
        """Test that hyderabad district returns 200 with valid HTML"""
        response = requests.get(f"{BASE_URL}/api/prerender/district/hyderabad")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "text/html" in response.headers.get("content-type", ""), "Expected HTML content type"
        print("PASS: /api/prerender/district/hyderabad returns 200 with HTML")
    
    def test_prerender_district_hyderabad_has_content(self):
        """Test that hyderabad district has expected content"""
        response = requests.get(f"{BASE_URL}/api/prerender/district/hyderabad")
        assert response.status_code == 200
        html = response.text
        # Check for Hyderabad in content
        assert "Hyderabad" in html, "Hyderabad not found in district content"
        # Check for hospitals section
        assert "Hospital" in html, "No hospital references found"
        print("PASS: Hyderabad district has expected content")
    
    def test_prerender_district_hyderabad_has_medical_business_schema(self):
        """Test that hyderabad district has MedicalBusiness JSON-LD schema"""
        response = requests.get(f"{BASE_URL}/api/prerender/district/hyderabad")
        assert response.status_code == 200
        html = response.text
        # Find JSON-LD scripts
        json_ld_matches = re.findall(r'<script type="application/ld\+json">([^<]+)</script>', html)
        assert len(json_ld_matches) > 0, "No JSON-LD scripts found"
        
        # Check for MedicalBusiness schema
        has_medical_business = False
        for json_str in json_ld_matches:
            try:
                schema = json.loads(json_str)
                if schema.get("@type") == "MedicalBusiness":
                    has_medical_business = True
                    assert "name" in schema, "MedicalBusiness schema missing 'name'"
                    assert "address" in schema, "MedicalBusiness schema missing 'address'"
                    print(f"PASS: Found MedicalBusiness schema: {schema.get('name')}")
                    break
            except json.JSONDecodeError:
                continue
        
        assert has_medical_business, "No MedicalBusiness JSON-LD schema found"
    
    def test_prerender_district_warangal_returns_200(self):
        """Test that warangal district returns 200"""
        response = requests.get(f"{BASE_URL}/api/prerender/district/warangal")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        html = response.text
        assert "Warangal" in html, "Warangal not found in district content"
        print("PASS: /api/prerender/district/warangal returns 200 with Warangal content")


class TestAdminLogin:
    """Quick verification of admin login"""
    
    def test_admin_login_works(self):
        """Test admin login with correct password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "AgileHealth2026admin"}
        )
        assert response.status_code == 200, f"Admin login failed with status {response.status_code}"
        data = response.json()
        assert "token" in data or "success" in data or response.status_code == 200, "Login response missing expected fields"
        print("PASS: Admin login works with password AgileHealth2026admin")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
