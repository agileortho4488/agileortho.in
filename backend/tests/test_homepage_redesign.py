"""
Test cases for Homepage Redesign - Iteration 25
Tests: Featured products API, divisions API, admin stats lead counts
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasics:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✓ Health endpoint working")


class TestDivisionsAPI:
    """Test /api/divisions endpoint"""
    
    def test_divisions_returns_10_divisions(self):
        """Test that divisions API returns 10 divisions"""
        response = requests.get(f"{BASE_URL}/api/divisions")
        assert response.status_code == 200
        data = response.json()
        assert "divisions" in data
        divisions = data["divisions"]
        assert len(divisions) == 10, f"Expected 10 divisions, got {len(divisions)}"
        print(f"✓ Divisions API returns {len(divisions)} divisions")
    
    def test_divisions_have_product_counts(self):
        """Test that each division has product_count"""
        response = requests.get(f"{BASE_URL}/api/divisions")
        assert response.status_code == 200
        data = response.json()
        for div in data["divisions"]:
            assert "name" in div
            assert "product_count" in div
            assert div["product_count"] > 0, f"Division {div['name']} has no products"
        print("✓ All divisions have product counts")
    
    def test_divisions_include_expected_names(self):
        """Test that expected divisions are present"""
        response = requests.get(f"{BASE_URL}/api/divisions")
        assert response.status_code == 200
        data = response.json()
        division_names = [d["name"] for d in data["divisions"]]
        expected = ["Orthopedics", "Cardiovascular", "Diagnostics", "ENT", 
                    "Endo-surgical", "Infection Prevention", "Critical Care",
                    "Peripheral Intervention", "Urology", "Robotics"]
        for exp in expected:
            assert exp in division_names, f"Missing division: {exp}"
        print("✓ All expected divisions present")


class TestFeaturedProductsAPI:
    """Test /api/products/featured/homepage endpoint"""
    
    def test_featured_products_endpoint_exists(self):
        """Test that featured products endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/products/featured/homepage")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        print("✓ Featured products endpoint exists")
    
    def test_featured_products_returns_diverse_divisions(self):
        """Test that featured products come from different divisions"""
        response = requests.get(f"{BASE_URL}/api/products/featured/homepage")
        assert response.status_code == 200
        data = response.json()
        products = data["products"]
        
        # Should have products
        assert len(products) > 0, "No featured products returned"
        
        # Get unique divisions
        divisions = set(p["division"] for p in products)
        
        # Should have products from multiple divisions (at least 5)
        assert len(divisions) >= 5, f"Expected products from at least 5 divisions, got {len(divisions)}: {divisions}"
        print(f"✓ Featured products from {len(divisions)} different divisions: {divisions}")
    
    def test_featured_products_have_images(self):
        """Test that featured products have images"""
        response = requests.get(f"{BASE_URL}/api/products/featured/homepage")
        assert response.status_code == 200
        data = response.json()
        products = data["products"]
        
        for p in products:
            assert "images" in p, f"Product {p['product_name']} missing images field"
            assert len(p["images"]) > 0, f"Product {p['product_name']} has no images"
        print("✓ All featured products have images")
    
    def test_featured_products_max_8(self):
        """Test that featured products returns max 8 products"""
        response = requests.get(f"{BASE_URL}/api/products/featured/homepage")
        assert response.status_code == 200
        data = response.json()
        products = data["products"]
        assert len(products) <= 8, f"Expected max 8 products, got {len(products)}"
        print(f"✓ Featured products returns {len(products)} products (max 8)")


class TestProductsAPI:
    """Test /api/products endpoint"""
    
    def test_products_list(self):
        """Test products list endpoint"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert "total" in data
        assert data["total"] > 0
        print(f"✓ Products API returns {data['total']} total products")
    
    def test_products_filter_by_division(self):
        """Test products can be filtered by division"""
        response = requests.get(f"{BASE_URL}/api/products?division=Orthopedics")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        # All products should be from Orthopedics
        for p in data["products"]:
            assert p["division"] == "Orthopedics"
        print(f"✓ Products filter by division works ({len(data['products'])} Orthopedics products)")


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Test admin login with correct password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "admin"})
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["role"] == "super_admin"
        print("✓ Admin login successful")
    
    def test_admin_login_failure(self):
        """Test admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "wrongpassword"})
        assert response.status_code == 401
        print("✓ Admin login rejects wrong password")


class TestAdminStats:
    """Test admin stats endpoint - lead counts"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "admin"})
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    def test_admin_stats_requires_auth(self):
        """Test that admin stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code in [401, 403]
        print("✓ Admin stats requires authentication")
    
    def test_admin_stats_returns_lead_counts(self, auth_token):
        """Test admin stats returns hot/warm/cold lead counts"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "total_leads" in data
        assert "hot_leads" in data
        assert "warm_leads" in data
        assert "cold_leads" in data
        assert "total_products" in data
        
        print(f"✓ Admin stats: {data['total_leads']} total, {data['hot_leads']} hot, {data['warm_leads']} warm, {data['cold_leads']} cold")
    
    def test_admin_stats_lead_counts_sum_correctly(self, auth_token):
        """Test that hot+warm+cold <= total leads"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        scored_leads = data["hot_leads"] + data["warm_leads"] + data["cold_leads"]
        # Scored leads should be <= total (some may not have scores)
        assert scored_leads <= data["total_leads"], f"Scored leads ({scored_leads}) > total ({data['total_leads']})"
        print(f"✓ Lead counts sum correctly: {scored_leads} scored <= {data['total_leads']} total")
    
    def test_admin_stats_products_by_division(self, auth_token):
        """Test admin stats returns products by division"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "products_by_division" in data
        divisions = data["products_by_division"]
        assert len(divisions) == 10, f"Expected 10 divisions, got {len(divisions)}"
        
        # Check structure
        for div in divisions:
            assert "division" in div
            assert "count" in div
        
        print(f"✓ Admin stats returns {len(divisions)} divisions with product counts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
