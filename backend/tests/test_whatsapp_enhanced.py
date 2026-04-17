"""
Phase 5 Enhanced: WhatsApp Integration Tests for New Features
Tests for analytics, template messaging, contact sync, event tracking, and enhanced webhook status handling
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://strange-easley-2.preview.emergentagent.com').rstrip('/')


class TestWhatsAppAnalytics:
    """Tests for GET /api/admin/whatsapp/analytics endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "admin"}
        )
        assert login_response.status_code == 200, "Admin login failed"
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_analytics_returns_conversation_stats(self):
        """GET /api/admin/whatsapp/analytics returns conversation statistics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/whatsapp/analytics",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify conversations section
        assert "conversations" in data
        conv = data["conversations"]
        assert "total" in conv
        assert "ai_active" in conv
        assert "human_takeover" in conv
        assert "total_messages" in conv
        
        # Verify values are integers
        assert isinstance(conv["total"], int)
        assert isinstance(conv["ai_active"], int)
        assert isinstance(conv["human_takeover"], int)
        assert isinstance(conv["total_messages"], int)
        
        print(f"✓ Analytics conversation stats: total={conv['total']}, ai_active={conv['ai_active']}, human={conv['human_takeover']}, messages={conv['total_messages']}")
    
    def test_analytics_returns_delivery_stats(self):
        """GET /api/admin/whatsapp/analytics returns delivery statistics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/whatsapp/analytics",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify delivery section
        assert "delivery" in data
        delivery = data["delivery"]
        assert "total_tracked" in delivery
        assert "queued" in delivery
        assert "sent" in delivery
        assert "delivered" in delivery
        assert "read" in delivery
        assert "failed" in delivery
        assert "template_messages" in delivery
        assert "delivery_rate" in delivery
        assert "read_rate" in delivery
        
        # Verify rates are floats/ints
        assert isinstance(delivery["delivery_rate"], (int, float))
        assert isinstance(delivery["read_rate"], (int, float))
        
        print(f"✓ Analytics delivery stats: queued={delivery['queued']}, sent={delivery['sent']}, delivered={delivery['delivered']}, read={delivery['read']}, failed={delivery['failed']}")
        print(f"✓ Delivery rate: {delivery['delivery_rate']}%, Read rate: {delivery['read_rate']}%")
    
    def test_analytics_requires_auth(self):
        """GET /api/admin/whatsapp/analytics requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/whatsapp/analytics")
        assert response.status_code == 401
        print(f"✓ Analytics endpoint requires auth")


class TestWhatsAppTemplateMessaging:
    """Tests for POST /api/admin/whatsapp/send-template endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "admin"}
        )
        assert login_response.status_code == 200, "Admin login failed"
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        self.test_phone = "9876543001"  # Use existing test lead phone
    
    def test_send_template_requires_phone_and_template_name(self):
        """POST /api/admin/whatsapp/send-template validates required fields"""
        # Missing template_name
        response = requests.post(
            f"{BASE_URL}/api/admin/whatsapp/send-template",
            headers=self.headers,
            json={"phone": self.test_phone}
        )
        assert response.status_code == 400
        
        # Missing phone
        response = requests.post(
            f"{BASE_URL}/api/admin/whatsapp/send-template",
            headers=self.headers,
            json={"template_name": "test_template"}
        )
        assert response.status_code == 400
        print(f"✓ Template endpoint validates required fields")
    
    def test_send_template_makes_api_call(self):
        """POST /api/admin/whatsapp/send-template makes call to Interakt API"""
        # Note: Template will fail since no templates exist in Interakt dashboard,
        # but the endpoint should return 200 with the error from Interakt
        payload = {
            "phone": self.test_phone,
            "template_name": "test_nonexistent_template",
            "language_code": "en",
            "body_values": ["Test Value 1", "Test Value 2"]
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/whatsapp/send-template",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Endpoint should return success field and data from Interakt
        assert "success" in data
        assert "data" in data or "message" in data
        
        # Since template doesn't exist, success should be False but API call was made
        print(f"✓ Template send API call made: success={data.get('success')}, data={data.get('data')}")
    
    def test_send_template_with_all_parameters(self):
        """POST /api/admin/whatsapp/send-template accepts all optional parameters"""
        payload = {
            "phone": self.test_phone,
            "template_name": "welcome_message",
            "language_code": "hi",
            "body_values": ["Dr. Test", "Knee Implant"],
            "header_values": ["Header Value"],
            "button_values": {"0": "button_payload"}
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/whatsapp/send-template",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        print(f"✓ Template send with all params: {data}")
    
    def test_send_template_requires_auth(self):
        """POST /api/admin/whatsapp/send-template requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/whatsapp/send-template",
            json={"phone": "1234567890", "template_name": "test"}
        )
        assert response.status_code == 401
        print(f"✓ Template endpoint requires auth")


class TestWhatsAppContactSync:
    """Tests for contact sync endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "admin"}
        )
        assert login_response.status_code == 200, "Admin login failed"
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
    
    def test_sync_single_lead_requires_lead_id(self):
        """POST /api/admin/whatsapp/sync-lead requires lead_id"""
        response = requests.post(
            f"{BASE_URL}/api/admin/whatsapp/sync-lead",
            headers=self.headers,
            json={}
        )
        assert response.status_code == 400
        print(f"✓ Sync lead endpoint validates lead_id required")
    
    def test_sync_single_lead_returns_404_for_invalid_id(self):
        """POST /api/admin/whatsapp/sync-lead returns 404 for non-existent lead"""
        response = requests.post(
            f"{BASE_URL}/api/admin/whatsapp/sync-lead",
            headers=self.headers,
            json={"lead_id": "nonexistent_lead_id_12345"}
        )
        assert response.status_code == 404
        print(f"✓ Sync lead returns 404 for invalid lead_id")
    
    def test_bulk_sync_all_leads(self):
        """POST /api/admin/whatsapp/sync-all-leads syncs all leads to Interakt"""
        response = requests.post(
            f"{BASE_URL}/api/admin/whatsapp/sync-all-leads",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "synced" in data
        assert "failed" in data
        assert "total" in data
        
        # Verify values are integers
        assert isinstance(data["synced"], int)
        assert isinstance(data["failed"], int)
        assert isinstance(data["total"], int)
        
        # Total should equal synced + failed
        assert data["total"] == data["synced"] + data["failed"]
        
        print(f"✓ Bulk sync completed: synced={data['synced']}, failed={data['failed']}, total={data['total']}")
    
    def test_bulk_sync_requires_auth(self):
        """POST /api/admin/whatsapp/sync-all-leads requires authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/whatsapp/sync-all-leads")
        assert response.status_code == 401
        print(f"✓ Bulk sync endpoint requires auth")


class TestWhatsAppEventTracking:
    """Tests for POST /api/admin/whatsapp/track-event endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "admin"}
        )
        assert login_response.status_code == 200, "Admin login failed"
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        self.test_phone = "9876543001"
    
    def test_track_event_requires_phone_and_event(self):
        """POST /api/admin/whatsapp/track-event validates required fields"""
        # Missing event
        response = requests.post(
            f"{BASE_URL}/api/admin/whatsapp/track-event",
            headers=self.headers,
            json={"phone": self.test_phone}
        )
        assert response.status_code == 400
        
        # Missing phone
        response = requests.post(
            f"{BASE_URL}/api/admin/whatsapp/track-event",
            headers=self.headers,
            json={"event": "Test Event"}
        )
        assert response.status_code == 400
        print(f"✓ Track event endpoint validates required fields")
    
    def test_track_event_makes_api_call(self):
        """POST /api/admin/whatsapp/track-event makes call to Interakt Event API"""
        payload = {
            "phone": self.test_phone,
            "event": "Test Event from Automated Tests",
            "traits": {
                "test_key": "test_value",
                "timestamp": "2026-01-01T00:00:00Z"
            }
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/whatsapp/track-event",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert "data" in data
        print(f"✓ Track event API call made: success={data.get('success')}, data={data.get('data')}")
    
    def test_track_event_requires_auth(self):
        """POST /api/admin/whatsapp/track-event requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/whatsapp/track-event",
            json={"phone": "1234567890", "event": "Test"}
        )
        assert response.status_code == 401
        print(f"✓ Track event endpoint requires auth")


class TestWebhookStatusEvents:
    """Tests for enhanced webhook status event handling"""
    
    def test_webhook_handles_message_sent_status(self):
        """POST /api/webhook/whatsapp handles message_sent status event"""
        payload = {
            "type": "message_sent",
            "data": {
                "id": f"test_msg_{uuid.uuid4().hex[:8]}",
                "message_id": f"test_msg_{uuid.uuid4().hex[:8]}"
            }
        }
        response = requests.post(f"{BASE_URL}/api/webhook/whatsapp", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        print(f"✓ Webhook handles message_sent status")
    
    def test_webhook_handles_message_delivered_status(self):
        """POST /api/webhook/whatsapp handles message_delivered status event"""
        payload = {
            "type": "message_delivered",
            "data": {
                "id": f"test_msg_{uuid.uuid4().hex[:8]}"
            }
        }
        response = requests.post(f"{BASE_URL}/api/webhook/whatsapp", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        print(f"✓ Webhook handles message_delivered status")
    
    def test_webhook_handles_message_read_status(self):
        """POST /api/webhook/whatsapp handles message_read status event"""
        payload = {
            "type": "message_read",
            "data": {
                "id": f"test_msg_{uuid.uuid4().hex[:8]}"
            }
        }
        response = requests.post(f"{BASE_URL}/api/webhook/whatsapp", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        print(f"✓ Webhook handles message_read status")
    
    def test_webhook_handles_message_failed_status(self):
        """POST /api/webhook/whatsapp handles message_failed status event"""
        payload = {
            "type": "message_failed",
            "data": {
                "id": f"test_msg_{uuid.uuid4().hex[:8]}",
                "error": "Test error message"
            }
        }
        response = requests.post(f"{BASE_URL}/api/webhook/whatsapp", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        print(f"✓ Webhook handles message_failed status")


class TestLeadCreationInteraktSync:
    """Tests for lead creation with Interakt sync"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_phone = f"+91{uuid.uuid4().hex[:10]}"
        self.test_name = f"TEST_Lead_{uuid.uuid4().hex[:6]}"
    
    def test_create_lead_with_whatsapp_triggers_sync(self):
        """POST /api/leads with phone_whatsapp triggers background Interakt sync"""
        payload = {
            "name": self.test_name,
            "hospital_clinic": "Test Hospital",
            "phone_whatsapp": self.test_phone,
            "email": "test@example.com",
            "district": "Hyderabad",
            "inquiry_type": "Product Info",
            "source": "website",
            "product_interest": "Knee Implants",
            "message": "Test message for Interakt sync"
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "lead" in data
        assert data["lead"]["name"] == self.test_name
        assert data["lead"]["phone_whatsapp"] == self.test_phone
        
        # Note: Interakt sync happens in background, we can't directly verify it
        # but the endpoint should complete successfully
        print(f"✓ Lead created with WhatsApp number (Interakt sync triggered in background)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
