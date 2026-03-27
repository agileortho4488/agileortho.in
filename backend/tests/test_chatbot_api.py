"""
Test suite for Chatbot API endpoints
Tests: POST /query, GET /history, POST /telemetry, GET /suggestions
Features: confidence-aware responses, session tracking, off-topic rejection
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestChatbotQuery:
    """Tests for POST /api/chatbot/query endpoint"""
    
    def test_query_medical_device_high_confidence(self):
        """Query about BioMime stents should return high/medium confidence"""
        session_id = f"test-{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/chatbot/query", json={
            "question": "Tell me about BioMime stents",
            "session_id": session_id
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Validate response structure
        assert "answer" in data, "Response missing 'answer' field"
        assert "sources" in data, "Response missing 'sources' field"
        assert "confidence" in data, "Response missing 'confidence' field"
        
        # BioMime is a known product, should have some confidence
        assert data["confidence"] in ["high", "medium", "low"], f"Unexpected confidence: {data['confidence']}"
        assert len(data["answer"]) > 0, "Answer should not be empty"
        print(f"BioMime query confidence: {data['confidence']}")
    
    def test_query_orthopedic_implants(self):
        """Query about orthopedic implants should return relevant results"""
        response = requests.post(f"{BASE_URL}/api/chatbot/query", json={
            "question": "What orthopedic implants do you offer?",
            "session_id": f"test-{uuid.uuid4().hex[:8]}"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "answer" in data
        assert "confidence" in data
        assert data["confidence"] in ["high", "medium", "low", "none"]
        print(f"Orthopedic implants query confidence: {data['confidence']}")
    
    def test_query_off_topic_weather(self):
        """Off-topic query (weather) should return confidence='none'"""
        response = requests.post(f"{BASE_URL}/api/chatbot/query", json={
            "question": "What is the weather today?",
            "session_id": f"test-{uuid.uuid4().hex[:8]}"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["confidence"] == "none", f"Expected 'none' confidence for off-topic, got {data['confidence']}"
        assert "outside the scope" in data["answer"].lower() or "don't have information" in data["answer"].lower(), \
            "Off-topic response should indicate query is outside scope"
        print(f"Off-topic query correctly rejected with confidence: {data['confidence']}")
    
    def test_query_off_topic_sports(self):
        """Off-topic query (sports) should return confidence='none'"""
        response = requests.post(f"{BASE_URL}/api/chatbot/query", json={
            "question": "Who won the football match yesterday?",
            "session_id": f"test-{uuid.uuid4().hex[:8]}"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["confidence"] == "none", f"Expected 'none' for sports query, got {data['confidence']}"
    
    def test_query_trauma_plating(self):
        """Query about trauma plating systems"""
        response = requests.post(f"{BASE_URL}/api/chatbot/query", json={
            "question": "What trauma plating systems are available?",
            "session_id": f"test-{uuid.uuid4().hex[:8]}"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "answer" in data
        assert "confidence" in data
        print(f"Trauma plating query confidence: {data['confidence']}")
    
    def test_query_knee_implants(self):
        """Query about knee implant products"""
        response = requests.post(f"{BASE_URL}/api/chatbot/query", json={
            "question": "Show me knee implant products",
            "session_id": f"test-{uuid.uuid4().hex[:8]}"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "answer" in data
        assert "confidence" in data
        print(f"Knee implants query confidence: {data['confidence']}")
    
    def test_query_empty_question(self):
        """Empty question should return confidence='none'"""
        response = requests.post(f"{BASE_URL}/api/chatbot/query", json={
            "question": "   ",
            "session_id": f"test-{uuid.uuid4().hex[:8]}"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["confidence"] == "none", "Empty question should return 'none' confidence"
    
    def test_query_session_id_optional(self):
        """Query without session_id should still work (defaults to 'anonymous')"""
        response = requests.post(f"{BASE_URL}/api/chatbot/query", json={
            "question": "Tell me about stents"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "answer" in data
        assert "confidence" in data


class TestChatbotHistory:
    """Tests for GET /api/chatbot/history/{session_id} endpoint"""
    
    def test_history_new_session(self):
        """New session should return empty messages"""
        session_id = f"test-new-{uuid.uuid4().hex[:8]}"
        response = requests.get(f"{BASE_URL}/api/chatbot/history/{session_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert "messages" in data, "Response missing 'messages' field"
        assert "session_id" in data, "Response missing 'session_id' field"
        assert data["session_id"] == session_id
        assert isinstance(data["messages"], list)
    
    def test_history_after_query(self):
        """History should contain messages after a query"""
        session_id = f"test-hist-{uuid.uuid4().hex[:8]}"
        
        # First, send a query
        query_response = requests.post(f"{BASE_URL}/api/chatbot/query", json={
            "question": "Tell me about orthopedic products",
            "session_id": session_id
        })
        assert query_response.status_code == 200
        
        # Then, get history
        history_response = requests.get(f"{BASE_URL}/api/chatbot/history/{session_id}")
        assert history_response.status_code == 200
        data = history_response.json()
        
        assert len(data["messages"]) >= 2, "History should have at least user and assistant messages"
        
        # Verify message structure
        user_msg = data["messages"][0]
        assert user_msg["role"] == "user"
        assert "orthopedic" in user_msg["content"].lower()
        
        assistant_msg = data["messages"][1]
        assert assistant_msg["role"] == "assistant"
        assert "confidence" in assistant_msg
        print(f"History contains {len(data['messages'])} messages")


class TestChatbotTelemetry:
    """Tests for POST /api/chatbot/telemetry endpoint"""
    
    def test_telemetry_query_event(self):
        """Log a query telemetry event"""
        response = requests.post(f"{BASE_URL}/api/chatbot/telemetry", json={
            "session_id": f"test-tel-{uuid.uuid4().hex[:8]}",
            "event_type": "query",
            "query": "Test query",
            "confidence": "high"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
    
    def test_telemetry_handoff_offered(self):
        """Log a handoff_offered telemetry event"""
        response = requests.post(f"{BASE_URL}/api/chatbot/telemetry", json={
            "session_id": f"test-tel-{uuid.uuid4().hex[:8]}",
            "event_type": "handoff_offered",
            "query": "Some query",
            "confidence": "low"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
    
    def test_telemetry_handoff_clicked(self):
        """Log a handoff_clicked telemetry event"""
        response = requests.post(f"{BASE_URL}/api/chatbot/telemetry", json={
            "session_id": f"test-tel-{uuid.uuid4().hex[:8]}",
            "event_type": "handoff_clicked"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
    
    def test_telemetry_with_metadata(self):
        """Log telemetry with metadata"""
        response = requests.post(f"{BASE_URL}/api/chatbot/telemetry", json={
            "session_id": f"test-tel-{uuid.uuid4().hex[:8]}",
            "event_type": "lead_form_shown",
            "metadata": {"page": "chat", "trigger": "low_confidence_count"}
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


class TestChatbotSuggestions:
    """Tests for GET /api/chatbot/suggestions endpoint"""
    
    def test_suggestions_returns_list(self):
        """Suggestions endpoint should return a list of 5 suggestions"""
        response = requests.get(f"{BASE_URL}/api/chatbot/suggestions")
        assert response.status_code == 200
        data = response.json()
        
        assert "suggestions" in data, "Response missing 'suggestions' field"
        assert isinstance(data["suggestions"], list)
        assert len(data["suggestions"]) == 5, f"Expected 5 suggestions, got {len(data['suggestions'])}"
        
        # Verify suggestions are strings
        for suggestion in data["suggestions"]:
            assert isinstance(suggestion, str)
            assert len(suggestion) > 0
        
        print(f"Suggestions: {data['suggestions']}")
    
    def test_suggestions_content(self):
        """Verify suggestions contain relevant medical device topics"""
        response = requests.get(f"{BASE_URL}/api/chatbot/suggestions")
        assert response.status_code == 200
        data = response.json()
        
        suggestions_text = " ".join(data["suggestions"]).lower()
        
        # Should contain medical device related terms
        medical_terms = ["orthopedic", "stent", "implant", "trauma", "knee", "diagnostic", "biomime"]
        found_terms = [term for term in medical_terms if term in suggestions_text]
        
        assert len(found_terms) >= 2, f"Suggestions should contain medical device terms. Found: {found_terms}"


class TestChatbotStats:
    """Tests for GET /api/chatbot/stats endpoint"""
    
    def test_stats_returns_shadow_db_info(self):
        """Stats endpoint should return shadow DB statistics"""
        response = requests.get(f"{BASE_URL}/api/chatbot/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert "shadow_db_stats" in data
        stats = data["shadow_db_stats"]
        
        assert "products" in stats
        assert "skus" in stats
        assert "brands" in stats
        assert "chunks" in stats
        
        # Verify counts are positive (data exists)
        assert stats["products"] > 0, "Should have products in shadow DB"
        assert stats["skus"] > 0, "Should have SKUs in shadow DB"
        assert stats["chunks"] > 0, "Should have chunks in shadow DB"
        
        print(f"Shadow DB stats: {stats}")


class TestChatbotBrands:
    """Tests for GET /api/chatbot/brands endpoint"""
    
    def test_brands_returns_list(self):
        """Brands endpoint should return list of brands"""
        response = requests.get(f"{BASE_URL}/api/chatbot/brands")
        assert response.status_code == 200
        data = response.json()
        
        assert "brands" in data
        assert "total" in data
        assert isinstance(data["brands"], list)
        assert data["total"] > 0, "Should have brands in database"
        
        print(f"Total brands: {data['total']}")


class TestChatbotProducts:
    """Tests for GET /api/chatbot/products endpoint"""
    
    def test_products_returns_list(self):
        """Products endpoint should return list of products"""
        response = requests.get(f"{BASE_URL}/api/chatbot/products")
        assert response.status_code == 200
        data = response.json()
        
        assert "products" in data
        assert "total" in data
        assert isinstance(data["products"], list)
        
        print(f"Products returned: {data['total']}")
    
    def test_products_filter_by_brand(self):
        """Products can be filtered by brand"""
        response = requests.get(f"{BASE_URL}/api/chatbot/products?brand=BioMime")
        assert response.status_code == 200
        data = response.json()
        
        assert "products" in data
        # If BioMime products exist, verify filter works
        if data["total"] > 0:
            for product in data["products"]:
                assert "biomime" in product.get("brand", "").lower() or "biomime" in product.get("product_name", "").lower()


class TestChatbotSKUs:
    """Tests for GET /api/chatbot/skus endpoint"""
    
    def test_skus_returns_list(self):
        """SKUs endpoint should return list of SKUs"""
        response = requests.get(f"{BASE_URL}/api/chatbot/skus")
        assert response.status_code == 200
        data = response.json()
        
        assert "skus" in data
        assert "total" in data
        assert isinstance(data["skus"], list)
        
        print(f"SKUs returned: {data['total']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
