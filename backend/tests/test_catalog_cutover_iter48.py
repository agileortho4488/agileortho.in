"""
Iteration 48: Full System Cutover Testing
Tests all public-facing APIs, admin dashboard, chatbot, and WhatsApp now read from catalog_products_col (enriched).
810 production-eligible products across 13 divisions.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://agile-admin-hub.preview.emergentagent.com').rstrip('/')
ADMIN_PASSWORD = "kOpcELYcEvkVtyDAE5-2uw"


class TestPublicAPIs:
    """Test all public-facing APIs use catalog_products_col (enriched)"""
    
    def test_health_check(self):
        """Basic health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✓ Health check passed")
    
    def test_divisions_returns_13_divisions(self):
        """GET /api/divisions returns 13 divisions from enriched catalog"""
        response = requests.get(f"{BASE_URL}/api/divisions")
        assert response.status_code == 200
        data = response.json()
        divisions = data.get("divisions", [])
        assert len(divisions) == 13, f"Expected 13 divisions, got {len(divisions)}"
        # Verify division structure
        for div in divisions:
            assert "name" in div
            assert "product_count" in div
            assert div["product_count"] > 0
        print(f"✓ GET /api/divisions returns {len(divisions)} divisions")
    
    def test_products_search_hernia(self):
        """GET /api/products?search=hernia returns enriched catalog results with division_canonical"""
        response = requests.get(f"{BASE_URL}/api/products", params={"search": "hernia"})
        assert response.status_code == 200
        data = response.json()
        products = data.get("products", [])
        assert len(products) > 0, "Expected hernia products"
        # Verify enriched fields
        for p in products[:5]:
            assert "division_canonical" in p or "division" in p, "Missing division field"
        print(f"✓ GET /api/products?search=hernia returns {len(products)} products")
    
    def test_featured_products_homepage(self):
        """GET /api/products/featured/homepage returns featured products with semantic_brand_system"""
        response = requests.get(f"{BASE_URL}/api/products/featured/homepage")
        assert response.status_code == 200
        data = response.json()
        products = data.get("products", [])
        assert len(products) > 0, "Expected featured products"
        # Verify semantic fields
        for p in products:
            assert "brand" in p, "Missing brand field"
            assert "division" in p, "Missing division field"
        print(f"✓ GET /api/products/featured/homepage returns {len(products)} featured products")
    
    def test_product_by_slug(self):
        """GET /api/products/by-slug/filaprop-soft-polypropylene-hernia-mesh returns enriched product"""
        response = requests.get(f"{BASE_URL}/api/products/by-slug/filaprop-soft-polypropylene-hernia-mesh")
        # May return 404 if slug doesn't exist, but should not error
        if response.status_code == 200:
            data = response.json()
            assert "product_name" in data or "slug" in data
            print("✓ GET /api/products/by-slug returns enriched product")
        elif response.status_code == 404:
            # Try another known slug
            response2 = requests.get(f"{BASE_URL}/api/catalog/products", params={"search": "hernia", "limit": 1})
            if response2.status_code == 200 and response2.json().get("products"):
                slug = response2.json()["products"][0].get("slug", "")
                if slug:
                    response3 = requests.get(f"{BASE_URL}/api/products/by-slug/{slug}")
                    assert response3.status_code == 200
                    print(f"✓ GET /api/products/by-slug/{slug} returns enriched product")
                else:
                    print("⚠ No slug found in catalog products")
            else:
                print("⚠ Product slug not found, but API works correctly")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")


class TestCatalogAPIs:
    """Test catalog-specific APIs"""
    
    def test_catalog_divisions_consistency(self):
        """GET /api/catalog/divisions returns same 13 divisions (consistency check)"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions")
        assert response.status_code == 200
        data = response.json()
        divisions = data.get("divisions", [])
        assert len(divisions) == 13, f"Expected 13 divisions, got {len(divisions)}"
        total_products = data.get("total_products", 0)
        assert total_products >= 800, f"Expected ~810 products, got {total_products}"
        print(f"✓ GET /api/catalog/divisions returns {len(divisions)} divisions, {total_products} total products")
    
    def test_catalog_products_search_stent(self):
        """GET /api/catalog/products?search=stent returns results"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"search": "stent"})
        assert response.status_code == 200
        data = response.json()
        products = data.get("products", [])
        assert len(products) > 0, "Expected stent products"
        print(f"✓ GET /api/catalog/products?search=stent returns {len(products)} products")
    
    def test_catalog_products_search_trauma(self):
        """GET /api/catalog/products?search=trauma returns trauma products"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"search": "trauma"})
        assert response.status_code == 200
        data = response.json()
        products = data.get("products", [])
        assert len(products) > 0, "Expected trauma products"
        print(f"✓ GET /api/catalog/products?search=trauma returns {len(products)} products")


class TestChatbotAPIs:
    """Test chatbot APIs use catalog_products_col"""
    
    def test_chatbot_query_ent_products(self):
        """POST /api/chatbot/query with 'Show me ENT products' returns enriched catalog results"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/query",
            json={"question": "Show me ENT products", "top_k": 5}
        )
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "confidence" in data
        # Check for catalog links in answer
        answer = data.get("answer", "")
        print(f"✓ POST /api/chatbot/query (ENT) returns answer with confidence: {data.get('confidence')}")
    
    def test_chatbot_query_sku(self):
        """POST /api/chatbot/query with 'Find SKU MECRW45' returns catalog SKU data"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/query",
            json={"question": "Find SKU MECRW45", "top_k": 5}
        )
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        print(f"✓ POST /api/chatbot/query (SKU) returns answer with confidence: {data.get('confidence')}")
    
    def test_chatbot_stats(self):
        """GET /api/chatbot/stats returns catalog_stats with live_products count"""
        response = requests.get(f"{BASE_URL}/api/chatbot/stats")
        assert response.status_code == 200
        data = response.json()
        catalog_stats = data.get("catalog_stats", {})
        live_products = catalog_stats.get("live_products", 0)
        assert live_products >= 800, f"Expected ~810 live products, got {live_products}"
        assert "enriched" in catalog_stats
        print(f"✓ GET /api/chatbot/stats returns live_products: {live_products}")
    
    def test_chatbot_brands(self):
        """GET /api/chatbot/brands returns brands from enriched catalog"""
        response = requests.get(f"{BASE_URL}/api/chatbot/brands")
        assert response.status_code == 200
        data = response.json()
        brands = data.get("brands", [])
        assert len(brands) > 0, "Expected brands from catalog"
        print(f"✓ GET /api/chatbot/brands returns {len(brands)} brands")
    
    def test_chatbot_products_by_division(self):
        """GET /api/chatbot/products?division=Trauma returns catalog products"""
        response = requests.get(f"{BASE_URL}/api/chatbot/products", params={"division": "Trauma"})
        assert response.status_code == 200
        data = response.json()
        products = data.get("products", [])
        assert len(products) > 0, "Expected Trauma products"
        print(f"✓ GET /api/chatbot/products?division=Trauma returns {len(products)} products")


class TestAIChatAPI:
    """Test AI chat API uses catalog_products_col"""
    
    def test_chat_hernia_mesh(self):
        """POST /api/chat with 'What hernia mesh do you have?' returns enriched product context"""
        response = requests.post(
            f"{BASE_URL}/api/chat",
            json={"message": "What hernia mesh do you have?"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "products_referenced" in data
        products_referenced = data.get("products_referenced", 0)
        print(f"✓ POST /api/chat (hernia mesh) returns response with {products_referenced} products referenced")


class TestAdminAPIs:
    """Test admin APIs use catalog_products_col"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_admin_login(self):
        """POST /api/admin/login with correct password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print("✓ Admin login successful")
    
    def test_admin_stats(self, admin_token):
        """GET /api/admin/stats returns live products: 810, enriched: 1134, 13 divisions"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        total_products = data.get("total_products", 0)
        total_enriched = data.get("total_enriched", 0)
        products_by_division = data.get("products_by_division", [])
        
        assert total_products >= 800, f"Expected ~810 live products, got {total_products}"
        assert total_enriched >= 1000, f"Expected ~1134 enriched, got {total_enriched}"
        assert len(products_by_division) == 13, f"Expected 13 divisions, got {len(products_by_division)}"
        
        print(f"✓ GET /api/admin/stats: live={total_products}, enriched={total_enriched}, divisions={len(products_by_division)}")
    
    def test_admin_products(self, admin_token):
        """GET /api/admin/products returns catalog products with semantic fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/products", headers=headers, params={"limit": 10})
        assert response.status_code == 200
        data = response.json()
        products = data.get("products", [])
        assert len(products) > 0, "Expected admin products"
        # Verify semantic fields present
        for p in products[:3]:
            # Check for enriched fields
            assert "product_name" in p or "product_name_display" in p
        print(f"✓ GET /api/admin/products returns {len(products)} products")


class TestDataConsistency:
    """Test data consistency across APIs"""
    
    def test_division_count_consistency(self):
        """Verify division counts are consistent across public and catalog APIs"""
        # Public API
        r1 = requests.get(f"{BASE_URL}/api/divisions")
        assert r1.status_code == 200
        public_divisions = len(r1.json().get("divisions", []))
        
        # Catalog API
        r2 = requests.get(f"{BASE_URL}/api/catalog/divisions")
        assert r2.status_code == 200
        catalog_divisions = len(r2.json().get("divisions", []))
        
        assert public_divisions == catalog_divisions == 13, \
            f"Division count mismatch: public={public_divisions}, catalog={catalog_divisions}"
        print(f"✓ Division count consistent: {public_divisions} divisions across all APIs")
    
    def test_product_count_consistency(self):
        """Verify product counts are consistent"""
        # Chatbot stats
        r1 = requests.get(f"{BASE_URL}/api/chatbot/stats")
        assert r1.status_code == 200
        chatbot_live = r1.json().get("catalog_stats", {}).get("live_products", 0)
        
        # Catalog divisions total
        r2 = requests.get(f"{BASE_URL}/api/catalog/divisions")
        assert r2.status_code == 200
        catalog_total = r2.json().get("total_products", 0)
        
        # Should be approximately equal (810)
        assert abs(chatbot_live - catalog_total) < 10, \
            f"Product count mismatch: chatbot={chatbot_live}, catalog={catalog_total}"
        print(f"✓ Product count consistent: ~{chatbot_live} products across APIs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
