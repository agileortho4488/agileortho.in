"""
Test suite for Phase 4: RAG AI Chatbot API endpoints
Tests: POST /api/chat, POST /api/chat/lead, GET /api/chat/history, GET /api/chat/suggestions
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def test_session_id():
    """Generate a unique session ID for testing"""
    return f"test-{uuid.uuid4().hex[:12]}"


class TestChatSuggestions:
    """Test GET /api/chat/suggestions endpoint"""
    
    def test_suggestions_returns_5_items(self, api_client):
        """GET /api/chat/suggestions returns 5 suggestions"""
        response = api_client.get(f"{BASE_URL}/api/chat/suggestions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "suggestions" in data, "Response should contain 'suggestions' key"
        assert isinstance(data["suggestions"], list), "Suggestions should be a list"
        assert len(data["suggestions"]) == 5, f"Expected 5 suggestions, got {len(data['suggestions'])}"
        
        # Verify suggestions are non-empty strings
        for s in data["suggestions"]:
            assert isinstance(s, str), "Each suggestion should be a string"
            assert len(s) > 0, "Suggestions should not be empty"
        
        print(f"PASS: GET /api/chat/suggestions returns {len(data['suggestions'])} suggestions")


class TestChatAPI:
    """Test POST /api/chat endpoint"""
    
    def test_chat_with_message_returns_response(self, api_client, test_session_id):
        """POST /api/chat with message and session_id returns AI response"""
        payload = {
            "message": "What orthopedic implants do you offer?",
            "session_id": test_session_id
        }
        
        # Claude may take 3-8 seconds to respond
        response = api_client.post(f"{BASE_URL}/api/chat", json=payload, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "response" in data, "Response should contain 'response' key"
        assert "session_id" in data, "Response should contain 'session_id' key"
        assert "products_referenced" in data, "Response should contain 'products_referenced' key"
        assert "lead_signal" in data, "Response should contain 'lead_signal' key"
        
        assert isinstance(data["response"], str), "Response should be a string"
        assert len(data["response"]) > 0, "Response should not be empty"
        assert data["session_id"] == test_session_id, "Session ID should match"
        
        print(f"PASS: POST /api/chat returns AI response with {data['products_referenced']} products referenced")
    
    def test_chat_product_search_titanium_plates(self, api_client):
        """POST /api/chat with 'titanium plates' query returns products_referenced > 0"""
        session_id = f"test-titanium-{uuid.uuid4().hex[:8]}"
        payload = {
            "message": "Tell me about titanium plates for trauma surgery",
            "session_id": session_id
        }
        
        response = api_client.post(f"{BASE_URL}/api/chat", json=payload, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["products_referenced"] > 0, f"Expected products_referenced > 0, got {data['products_referenced']}"
        
        print(f"PASS: Chat query 'titanium plates' found {data['products_referenced']} relevant products")
    
    def test_chat_multi_turn_conversation(self, api_client, test_session_id):
        """Multi-turn conversation maintains context (same session_id)"""
        # First message
        payload1 = {
            "message": "What knee replacement systems do you have?",
            "session_id": test_session_id
        }
        response1 = api_client.post(f"{BASE_URL}/api/chat", json=payload1, timeout=30)
        assert response1.status_code == 200
        
        # Wait a bit between messages
        time.sleep(1)
        
        # Second message referencing first
        payload2 = {
            "message": "What materials are they made of?",
            "session_id": test_session_id
        }
        response2 = api_client.post(f"{BASE_URL}/api/chat", json=payload2, timeout=30)
        assert response2.status_code == 200
        
        data2 = response2.json()
        assert data2["session_id"] == test_session_id, "Session ID should be maintained"
        
        print("PASS: Multi-turn conversation maintains context with same session_id")
    
    def test_chat_empty_message_returns_400(self, api_client):
        """POST /api/chat with empty message returns 400"""
        payload = {
            "message": "",
            "session_id": "test-empty"
        }
        
        response = api_client.post(f"{BASE_URL}/api/chat", json=payload)
        assert response.status_code == 400, f"Expected 400 for empty message, got {response.status_code}"
        
        print("PASS: Empty message returns 400 error")


class TestChatHistory:
    """Test GET /api/chat/history/{session_id} endpoint"""
    
    def test_chat_history_returns_messages(self, api_client, test_session_id):
        """GET /api/chat/history/{session_id} returns conversation messages"""
        # First send a message to create history
        payload = {
            "message": "Hello, I need information about cardiovascular stents",
            "session_id": test_session_id
        }
        chat_response = api_client.post(f"{BASE_URL}/api/chat", json=payload, timeout=30)
        assert chat_response.status_code == 200
        
        # Now get history
        response = api_client.get(f"{BASE_URL}/api/chat/history/{test_session_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "messages" in data, "Response should contain 'messages' key"
        assert "session_id" in data, "Response should contain 'session_id' key"
        assert isinstance(data["messages"], list), "Messages should be a list"
        assert len(data["messages"]) > 0, "Should have at least one message"
        
        # Verify message structure
        for msg in data["messages"]:
            assert "role" in msg, "Each message should have 'role'"
            assert "content" in msg, "Each message should have 'content'"
            assert msg["role"] in ["user", "assistant"], f"Role should be user or assistant, got {msg['role']}"
        
        print(f"PASS: GET /api/chat/history returns {len(data['messages'])} messages")
    
    def test_chat_history_nonexistent_session(self, api_client):
        """GET /api/chat/history with non-existent session returns empty messages"""
        fake_session = f"nonexistent-{uuid.uuid4().hex}"
        response = api_client.get(f"{BASE_URL}/api/chat/history/{fake_session}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["messages"] == [], "Non-existent session should return empty messages"
        
        print("PASS: Non-existent session returns empty messages array")


class TestChatLeadCapture:
    """Test POST /api/chat/lead endpoint"""
    
    def test_lead_capture_with_valid_data(self, api_client):
        """POST /api/chat/lead with name+phone creates a lead"""
        session_id = f"test-lead-{uuid.uuid4().hex[:8]}"
        payload = {
            "session_id": session_id,
            "name": "TEST_Dr. Chat Lead",
            "hospital_clinic": "Test Hospital",
            "phone_whatsapp": "+919876500001",
            "email": "testlead@test.com",
            "district": "Hyderabad"
        }
        
        response = api_client.post(f"{BASE_URL}/api/chat/lead", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        assert "lead_id" in data, "Response should contain 'lead_id'"
        assert data["message"] == "Lead captured successfully"
        assert len(data["lead_id"]) > 0, "Lead ID should not be empty"
        
        print(f"PASS: Lead captured successfully with ID: {data['lead_id']}")
    
    def test_lead_capture_minimal_data(self, api_client):
        """POST /api/chat/lead with only name and phone succeeds"""
        session_id = f"test-lead-min-{uuid.uuid4().hex[:8]}"
        payload = {
            "session_id": session_id,
            "name": "TEST_Minimal Lead",
            "phone_whatsapp": "+919876500002"
        }
        
        response = api_client.post(f"{BASE_URL}/api/chat/lead", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["message"] == "Lead captured successfully"
        
        print("PASS: Lead capture with minimal data (name + phone) succeeds")
    
    def test_lead_capture_missing_name_returns_400(self, api_client):
        """POST /api/chat/lead without name returns 400"""
        payload = {
            "session_id": "test-no-name",
            "phone_whatsapp": "+919876500003"
        }
        
        response = api_client.post(f"{BASE_URL}/api/chat/lead", json=payload)
        assert response.status_code == 400, f"Expected 400 for missing name, got {response.status_code}"
        
        print("PASS: Missing name returns 400 error")
    
    def test_lead_capture_missing_phone_returns_400(self, api_client):
        """POST /api/chat/lead without phone returns 400"""
        payload = {
            "session_id": "test-no-phone",
            "name": "TEST_No Phone Lead"
        }
        
        response = api_client.post(f"{BASE_URL}/api/chat/lead", json=payload)
        assert response.status_code == 400, f"Expected 400 for missing phone, got {response.status_code}"
        
        print("PASS: Missing phone returns 400 error")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_leads(self, api_client):
        """Cleanup TEST_ prefixed leads created during testing"""
        # Login as admin
        login_response = api_client.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            headers = {"Authorization": f"Bearer {token}"}
            
            # Get all leads
            leads_response = api_client.get(f"{BASE_URL}/api/admin/leads?limit=100", headers=headers)
            if leads_response.status_code == 200:
                leads = leads_response.json().get("leads", [])
                deleted = 0
                for lead in leads:
                    if lead.get("name", "").startswith("TEST_"):
                        del_response = api_client.delete(
                            f"{BASE_URL}/api/admin/leads/{lead['id']}", 
                            headers=headers
                        )
                        if del_response.status_code == 200:
                            deleted += 1
                print(f"PASS: Cleaned up {deleted} test leads")
            else:
                print("SKIP: Could not fetch leads for cleanup")
        else:
            print("SKIP: Could not login for cleanup")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
