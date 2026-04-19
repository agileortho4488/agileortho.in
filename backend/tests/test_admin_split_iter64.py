"""
Iteration 64: Admin Split Testing
Tests for:
1. Chatbot endpoints (POST /api/chatbot/query, GET /api/chatbot/suggestions, GET /api/chatbot/history/{session_id})
2. Admin endpoints (GET /api/admin/stats, /api/admin/pipeline, /api/admin/analytics) - requires JWT
3. Admin login (POST /api/admin/login)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestChatbotEndpoints:
    """Chatbot API tests - public endpoints for Next.js ChatWidget"""
    
    def test_chatbot_suggestions_returns_array(self):
        """GET /api/chatbot/suggestions returns {suggestions: [...]}"""
        response = requests.get(f"{BASE_URL}/api/chatbot/suggestions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "suggestions" in data, "Response missing 'suggestions' key"
        assert isinstance(data["suggestions"], list), "suggestions should be a list"
        assert len(data["suggestions"]) > 0, "suggestions should not be empty"
        print(f"✓ Chatbot suggestions: {len(data['suggestions'])} items")
    
    def test_chatbot_query_returns_correct_shape(self):
        """POST /api/chatbot/query with {question, session_id} returns {answer, sources, confidence}"""
        payload = {
            "question": "What orthopedic implants do you offer?",
            "session_id": "test_iter64_session"
        }
        response = requests.post(
            f"{BASE_URL}/api/chatbot/query",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "answer" in data, "Response missing 'answer' key"
        assert "sources" in data, "Response missing 'sources' key"
        assert "confidence" in data, "Response missing 'confidence' key"
        assert isinstance(data["answer"], str), "answer should be a string"
        assert isinstance(data["sources"], list), "sources should be a list"
        assert data["confidence"] in ["high", "medium", "low", "none"], f"Invalid confidence: {data['confidence']}"
        print(f"✓ Chatbot query response: confidence={data['confidence']}, sources={len(data['sources'])}")
    
    def test_chatbot_query_requires_question(self):
        """POST /api/chatbot/query without question returns 422"""
        payload = {"session_id": "test_session"}
        response = requests.post(
            f"{BASE_URL}/api/chatbot/query",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422, f"Expected 422 for missing question, got {response.status_code}"
        print("✓ Chatbot query validation: rejects missing question")
    
    def test_chatbot_history_new_session(self):
        """GET /api/chatbot/history/{session_id} works for new sessions"""
        response = requests.get(f"{BASE_URL}/api/chatbot/history/brand_new_session_xyz")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "messages" in data, "Response missing 'messages' key"
        assert "session_id" in data, "Response missing 'session_id' key"
        assert isinstance(data["messages"], list), "messages should be a list"
        assert data["session_id"] == "brand_new_session_xyz", "session_id mismatch"
        print(f"✓ Chatbot history for new session: {len(data['messages'])} messages")
    
    def test_chatbot_history_existing_session(self):
        """GET /api/chatbot/history/{session_id} returns messages for existing session"""
        # First create a conversation
        session_id = "test_iter64_history_check"
        requests.post(
            f"{BASE_URL}/api/chatbot/query",
            json={"question": "Hello", "session_id": session_id}
        )
        
        # Then fetch history
        response = requests.get(f"{BASE_URL}/api/chatbot/history/{session_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "messages" in data
        # Should have at least 2 messages (user + assistant)
        assert len(data["messages"]) >= 2, f"Expected at least 2 messages, got {len(data['messages'])}"
        print(f"✓ Chatbot history for existing session: {len(data['messages'])} messages")


class TestAdminLogin:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """POST /api/admin/login with correct password returns JWT token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "AgileHealth2026admin"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response missing 'token' key"
        assert isinstance(data["token"], str), "token should be a string"
        assert len(data["token"]) > 50, "token seems too short"
        print(f"✓ Admin login success: token length={len(data['token'])}")
        return data["token"]
    
    def test_admin_login_wrong_password(self):
        """POST /api/admin/login with wrong password returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "wrongpassword"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin login rejects wrong password")


class TestAdminEndpoints:
    """Admin protected endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "AgileHealth2026admin"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_admin_stats_requires_auth(self):
        """GET /api/admin/stats without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin stats requires authentication")
    
    def test_admin_stats_with_auth(self, auth_token):
        """GET /api/admin/stats with auth returns stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_products" in data, "Missing total_products"
        assert "total_leads" in data, "Missing total_leads"
        print(f"✓ Admin stats: {data['total_products']} products, {data['total_leads']} leads")
    
    def test_admin_pipeline_requires_auth(self):
        """GET /api/admin/pipeline without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/pipeline")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin pipeline requires authentication")
    
    def test_admin_pipeline_with_auth(self, auth_token):
        """GET /api/admin/pipeline with auth returns pipeline data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/pipeline",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "pipeline" in data, "Missing pipeline key"
        print(f"✓ Admin pipeline: {len(data['pipeline'])} stages")
    
    def test_admin_analytics_requires_auth(self):
        """GET /api/admin/analytics without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin analytics requires authentication")
    
    def test_admin_analytics_with_auth(self, auth_token):
        """GET /api/admin/analytics with auth returns analytics data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_leads" in data, "Missing total_leads"
        print(f"✓ Admin analytics: {data['total_leads']} total leads")


class TestCatalogRegression:
    """Regression tests for catalog endpoints (should still work)"""
    
    def test_catalog_products_endpoint(self):
        """GET /api/catalog/products returns 200"""
        response = requests.get(f"{BASE_URL}/api/catalog/products?page=1&limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "products" in data, "Missing products key"
        print(f"✓ Catalog products: {len(data['products'])} items returned")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
