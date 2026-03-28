"""
Test Catalog Live Push - Iteration 46
Tests for expanded catalog from 4 pilot divisions to 13 production-eligible divisions (810 products).
Verifies LIVE_FILTER, division counts, and product filtering.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCatalogDivisions:
    """Test /api/catalog/divisions endpoint - should return 13 divisions with 810 total products"""
    
    def test_divisions_endpoint_returns_13_divisions(self):
        """GET /api/catalog/divisions should return 13 divisions"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "divisions" in data, "Response should have 'divisions' key"
        assert "total_products" in data, "Response should have 'total_products' key"
        
        divisions = data["divisions"]
        total_products = data["total_products"]
        
        # Should have 13 divisions
        assert len(divisions) == 13, f"Expected 13 divisions, got {len(divisions)}"
        
        # Should have 810 total products
        assert total_products == 810, f"Expected 810 total products, got {total_products}"
        
        # Verify division structure
        for div in divisions:
            assert "name" in div, "Division should have 'name'"
            assert "slug" in div, "Division should have 'slug'"
            assert "product_count" in div, "Division should have 'product_count'"
            assert "categories" in div, "Division should have 'categories'"
            assert "brands" in div, "Division should have 'brands'"
        
        print(f"✓ Found {len(divisions)} divisions with {total_products} total products")
        for div in divisions:
            print(f"  - {div['name']}: {div['product_count']} products")


class TestDivisionDetails:
    """Test individual division detail endpoints"""
    
    def test_ent_division_has_38_products(self):
        """GET /api/catalog/divisions/ent should return ENT division with 38 products"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions/ent")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["name"] == "ENT", f"Expected 'ENT', got {data.get('name')}"
        assert data["slug"] == "ent", f"Expected 'ent', got {data.get('slug')}"
        assert data["product_count"] == 38, f"Expected 38 products, got {data.get('product_count')}"
        
        print(f"✓ ENT division: {data['product_count']} products, {len(data.get('categories', []))} categories")
    
    def test_endo_surgery_division_has_162_products(self):
        """GET /api/catalog/divisions/endo-surgery should return 162 products"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions/endo-surgery")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["name"] == "Endo Surgery", f"Expected 'Endo Surgery', got {data.get('name')}"
        assert data["slug"] == "endo-surgery", f"Expected 'endo-surgery', got {data.get('slug')}"
        assert data["product_count"] == 162, f"Expected 162 products, got {data.get('product_count')}"
        
        print(f"✓ Endo Surgery division: {data['product_count']} products")
    
    def test_infection_prevention_division_has_80_products(self):
        """GET /api/catalog/divisions/infection-prevention should return 80 products"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions/infection-prevention")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["name"] == "Infection Prevention", f"Expected 'Infection Prevention', got {data.get('name')}"
        assert data["product_count"] == 80, f"Expected 80 products, got {data.get('product_count')}"
        
        print(f"✓ Infection Prevention division: {data['product_count']} products")
    
    def test_sports_medicine_division_has_43_products(self):
        """GET /api/catalog/divisions/sports-medicine should return 43 products"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions/sports-medicine")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["name"] == "Sports Medicine", f"Expected 'Sports Medicine', got {data.get('name')}"
        assert data["product_count"] == 43, f"Expected 43 products, got {data.get('product_count')}"
        
        print(f"✓ Sports Medicine division: {data['product_count']} products")
    
    def test_trauma_division_exists(self):
        """GET /api/catalog/divisions/trauma should return Trauma division"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions/trauma")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["name"] == "Trauma", f"Expected 'Trauma', got {data.get('name')}"
        assert data["product_count"] > 0, "Trauma should have products"
        
        print(f"✓ Trauma division: {data['product_count']} products")
    
    def test_cardiovascular_division_exists(self):
        """GET /api/catalog/divisions/cardiovascular should return Cardiovascular division"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions/cardiovascular")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["name"] == "Cardiovascular", f"Expected 'Cardiovascular', got {data.get('name')}"
        assert data["product_count"] > 0, "Cardiovascular should have products"
        
        print(f"✓ Cardiovascular division: {data['product_count']} products")
    
    def test_diagnostics_division_exists(self):
        """GET /api/catalog/divisions/diagnostics should return Diagnostics division"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions/diagnostics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["name"] == "Diagnostics", f"Expected 'Diagnostics', got {data.get('name')}"
        assert data["product_count"] > 0, "Diagnostics should have products"
        
        print(f"✓ Diagnostics division: {data['product_count']} products")
    
    def test_joint_replacement_division_exists(self):
        """GET /api/catalog/divisions/joint-replacement should return Joint Replacement division"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions/joint-replacement")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["name"] == "Joint Replacement", f"Expected 'Joint Replacement', got {data.get('name')}"
        assert data["product_count"] > 0, "Joint Replacement should have products"
        
        print(f"✓ Joint Replacement division: {data['product_count']} products")


class TestCatalogProducts:
    """Test /api/catalog/products endpoint"""
    
    def test_products_endpoint_returns_all_divisions(self):
        """GET /api/catalog/products should return products from all divisions (not just 4 pilot)"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"limit": 100})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "products" in data, "Response should have 'products' key"
        assert "total" in data, "Response should have 'total' key"
        
        # Total should be 810
        assert data["total"] == 810, f"Expected 810 total products, got {data['total']}"
        
        # Check that products have required fields
        products = data["products"]
        assert len(products) > 0, "Should have products"
        
        for p in products[:5]:  # Check first 5
            assert "slug" in p, "Product should have 'slug'"
            assert "product_name" in p, "Product should have 'product_name'"
            assert "division" in p, "Product should have 'division'"
        
        print(f"✓ Products endpoint returns {data['total']} total products")
    
    def test_products_filter_by_endo_surgery(self):
        """GET /api/catalog/products?division=Endo Surgery should return endo surgery products"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Endo Surgery", "limit": 50})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["total"] == 162, f"Expected 162 Endo Surgery products, got {data['total']}"
        
        # Verify all returned products are from Endo Surgery
        for p in data["products"]:
            assert p["division"] == "Endo Surgery", f"Expected 'Endo Surgery', got {p['division']}"
        
        print(f"✓ Endo Surgery filter returns {data['total']} products")
    
    def test_products_filter_by_ent(self):
        """GET /api/catalog/products?division=ENT should return ENT products"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "ENT", "limit": 50})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["total"] == 38, f"Expected 38 ENT products, got {data['total']}"
        
        print(f"✓ ENT filter returns {data['total']} products")
    
    def test_products_filter_by_infection_prevention(self):
        """GET /api/catalog/products?division=Infection Prevention should return 80 products"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Infection Prevention", "limit": 50})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["total"] == 80, f"Expected 80 Infection Prevention products, got {data['total']}"
        
        print(f"✓ Infection Prevention filter returns {data['total']} products")
    
    def test_products_filter_by_sports_medicine(self):
        """GET /api/catalog/products?division=Sports Medicine should return 43 products"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Sports Medicine", "limit": 50})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["total"] == 43, f"Expected 43 Sports Medicine products, got {data['total']}"
        
        print(f"✓ Sports Medicine filter returns {data['total']} products")
    
    def test_products_search_functionality(self):
        """GET /api/catalog/products?search=... should filter by search term"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"search": "stent", "limit": 20})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "products" in data, "Response should have 'products' key"
        
        print(f"✓ Search 'stent' returns {data['total']} products")
    
    def test_products_pagination(self):
        """GET /api/catalog/products should support pagination"""
        # Get page 1
        response1 = requests.get(f"{BASE_URL}/api/catalog/products", params={"page": 1, "limit": 20})
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Get page 2
        response2 = requests.get(f"{BASE_URL}/api/catalog/products", params={"page": 2, "limit": 20})
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Pages should have different products
        slugs1 = {p["slug"] for p in data1["products"]}
        slugs2 = {p["slug"] for p in data2["products"]}
        assert slugs1 != slugs2, "Page 1 and Page 2 should have different products"
        
        # Verify pagination metadata
        assert data1["page"] == 1
        assert data2["page"] == 2
        assert data1["pages"] > 1, "Should have multiple pages"
        
        print(f"✓ Pagination works: {data1['pages']} total pages")


class TestDivisionCounts:
    """Verify all 13 divisions have correct product counts"""
    
    def test_all_division_counts_sum_to_810(self):
        """Sum of all division product counts should equal 810"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions")
        assert response.status_code == 200
        
        data = response.json()
        divisions = data["divisions"]
        
        total_from_divisions = sum(d["product_count"] for d in divisions)
        assert total_from_divisions == 810, f"Sum of division counts ({total_from_divisions}) should equal 810"
        
        print(f"✓ All division counts sum to {total_from_divisions}")
        
        # Print breakdown
        for div in sorted(divisions, key=lambda x: -x["product_count"]):
            print(f"  - {div['name']}: {div['product_count']}")


class TestAdminLogin:
    """Test admin login for review dashboard access"""
    
    def test_admin_login_success(self):
        """POST /api/admin/login should return token with correct password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "kOpcELYcEvkVtyDAE5-2uw"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "token" in data, "Response should have 'token'"
        assert len(data["token"]) > 0, "Token should not be empty"
        
        print(f"✓ Admin login successful, token received")
        return data["token"]
    
    def test_admin_login_failure(self):
        """POST /api/admin/login should return 401 with wrong password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "wrong-password"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print(f"✓ Admin login correctly rejects wrong password")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
