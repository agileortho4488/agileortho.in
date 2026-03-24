"""
Test Product Detail Page Backend APIs
- GET /api/products/{id} - Product detail endpoint
- GET /api/products - Products list with division filter (for related products)
- POST /api/leads - Lead submission (quote form)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test product ID from context
TEST_PRODUCT_ID = "69c17bd504841ec9248cfac2"  # ARMAR Titanium Plating System


class TestProductDetailAPI:
    """Tests for Product Detail page backend APIs"""
    
    def test_health_check(self):
        """Verify API is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✓ Health check passed")
    
    def test_get_product_by_id(self):
        """GET /api/products/{id} - Fetch product details"""
        response = requests.get(f"{BASE_URL}/api/products/{TEST_PRODUCT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        # Verify required fields for Product Detail page
        assert "product_name" in data
        assert "sku_code" in data
        assert "division" in data
        assert "category" in data
        assert "description" in data
        assert "technical_specifications" in data
        assert "material" in data
        assert "manufacturer" in data
        assert "size_variables" in data
        assert "id" in data
        
        # Verify specific product data
        assert data["product_name"] == "ARMAR Titanium Plating System"
        assert data["division"] == "Trauma"
        assert data["category"] == "Plating Systems"
        assert data["material"] == "Titanium"
        assert data["manufacturer"] == "Meril Life Sciences"
        
        # Verify technical_specifications has 3 keys
        specs = data["technical_specifications"]
        assert isinstance(specs, dict)
        assert len(specs) == 3
        assert "biocompatibility" in specs
        assert "corrosion_resistance" in specs
        assert "strength" in specs
        
        # Verify size_variables is empty array for this product
        assert data["size_variables"] == []
        
        print(f"✓ Product detail fetched: {data['product_name']}")
    
    def test_get_product_invalid_id(self):
        """GET /api/products/{id} - Invalid ID returns 400"""
        response = requests.get(f"{BASE_URL}/api/products/invalid-id")
        assert response.status_code == 400
        print("✓ Invalid product ID returns 400")
    
    def test_get_product_not_found(self):
        """GET /api/products/{id} - Non-existent ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/products/000000000000000000000000")
        assert response.status_code == 404
        print("✓ Non-existent product ID returns 404")
    
    def test_get_related_products_by_division(self):
        """GET /api/products?division=Trauma&limit=5 - Fetch related products"""
        response = requests.get(f"{BASE_URL}/api/products", params={
            "division": "Trauma",
            "limit": 5
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "total" in data
        
        products = data["products"]
        assert len(products) <= 5
        assert len(products) >= 1  # At least the test product
        
        # All products should be from Trauma division
        for p in products:
            assert p["division"] == "Trauma"
            assert "id" in p
            assert "product_name" in p
            assert "category" in p
        
        print(f"✓ Related products fetched: {len(products)} products from Trauma division")


class TestLeadSubmissionAPI:
    """Tests for Quote Form lead submission"""
    
    def test_submit_lead_success(self):
        """POST /api/leads - Submit quote request with valid data"""
        lead_data = {
            "name": "TEST_Dr. Test User",
            "hospital_clinic": "Test Hospital",
            "phone_whatsapp": "+919876543999",
            "email": "test@example.com",
            "district": "Hyderabad",
            "inquiry_type": "Bulk Quote",
            "source": "website",
            "product_interest": "ARMAR Titanium Plating System",
            "message": "Test quote request from automated testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "lead" in data
        assert data["message"] == "Lead captured successfully"
        
        lead = data["lead"]
        assert lead["name"] == lead_data["name"]
        assert lead["phone_whatsapp"] == lead_data["phone_whatsapp"]
        assert lead["inquiry_type"] == "Bulk Quote"
        assert lead["product_interest"] == "ARMAR Titanium Plating System"
        assert "id" in lead
        assert "score" in lead  # Lead scoring should be applied
        assert "status" in lead
        assert lead["status"] == "new"
        
        # Bulk Quote with hospital and product interest should be Hot lead
        assert lead["score"] == "Hot"
        
        print(f"✓ Lead submitted successfully: {lead['id']} (Score: {lead['score']})")
        
        # Store lead ID for cleanup
        self.__class__.test_lead_id = lead["id"]
    
    def test_submit_lead_minimal_data(self):
        """POST /api/leads - Submit with minimal required fields"""
        lead_data = {
            "name": "TEST_Minimal User",
            "phone_whatsapp": "+919876543998",
            "inquiry_type": "General",
            "source": "website"
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert response.status_code == 200
        
        data = response.json()
        lead = data["lead"]
        assert lead["name"] == lead_data["name"]
        assert lead["phone_whatsapp"] == lead_data["phone_whatsapp"]
        # Minimal data should result in Cold lead
        assert lead["score"] in ["Cold", "Warm"]
        
        print(f"✓ Minimal lead submitted: {lead['id']} (Score: {lead['score']})")
    
    def test_submit_lead_missing_name(self):
        """POST /api/leads - Missing name should fail validation"""
        lead_data = {
            "phone_whatsapp": "+919876543997",
            "inquiry_type": "General",
            "source": "website"
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        # FastAPI Pydantic validation should return 422
        assert response.status_code == 422
        print("✓ Missing name returns 422 validation error")
    
    def test_submit_lead_missing_phone(self):
        """POST /api/leads - Missing phone should fail validation"""
        lead_data = {
            "name": "TEST_No Phone User",
            "inquiry_type": "General",
            "source": "website"
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        # FastAPI Pydantic validation should return 422
        assert response.status_code == 422
        print("✓ Missing phone returns 422 validation error")


class TestDivisionsAPI:
    """Tests for divisions endpoint (used in breadcrumb navigation)"""
    
    def test_get_divisions(self):
        """GET /api/divisions - Fetch all divisions"""
        response = requests.get(f"{BASE_URL}/api/divisions")
        assert response.status_code == 200
        
        data = response.json()
        assert "divisions" in data
        
        divisions = data["divisions"]
        assert len(divisions) >= 7  # Should have multiple divisions
        
        # Find Trauma division
        trauma_div = next((d for d in divisions if d["name"] == "Trauma"), None)
        assert trauma_div is not None
        assert "categories" in trauma_div
        assert "product_count" in trauma_div
        assert trauma_div["product_count"] >= 1
        
        print(f"✓ Divisions fetched: {len(divisions)} divisions")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_leads(self):
        """Delete TEST_ prefixed leads created during testing"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin"
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get all leads
        leads_response = requests.get(f"{BASE_URL}/api/admin/leads", headers=headers, params={"limit": 100})
        assert leads_response.status_code == 200
        
        leads = leads_response.json()["leads"]
        test_leads = [l for l in leads if l["name"].startswith("TEST_")]
        
        deleted_count = 0
        for lead in test_leads:
            del_response = requests.delete(f"{BASE_URL}/api/admin/leads/{lead['id']}", headers=headers)
            if del_response.status_code in [200, 204]:
                deleted_count += 1
        
        print(f"✓ Cleanup: Deleted {deleted_count} test leads")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
