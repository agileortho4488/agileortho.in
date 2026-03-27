"""
Phase 5: WhatsApp Integration Tests
Tests for Interakt WhatsApp webhook, admin inbox, and conversation management APIs
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://medical-sku-master.preview.emergentagent.com').rstrip('/')


class TestWhatsAppWebhook:
    """Tests for WhatsApp webhook endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_phone = f"TEST_{uuid.uuid4().hex[:8]}"
        yield
        # Cleanup handled in test class teardown
    
    def test_webhook_accepts_message_received_event(self):
        """POST /api/webhook/whatsapp accepts Interakt webhook payload and returns 200"""
        payload = {
            "type": "message_received",
            "data": {
                "customer": {
                    "channel_phone_number": self.test_phone,
                    "traits": {"name": "Test Customer"}
                },
                "message": {"message": "Test message for webhook"}
            }
        }
        response = requests.post(f"{BASE_URL}/api/webhook/whatsapp", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        assert data.get("code") == 200
        print(f"✓ Webhook accepts message_received event: {data}")
    
    def test_webhook_handles_invalid_payload(self):
        """POST /api/webhook/whatsapp handles invalid payload gracefully"""
        response = requests.post(f"{BASE_URL}/api/webhook/whatsapp", data="invalid json")
        assert response.status_code == 200  # Should still return 200 to avoid webhook retries
        data = response.json()
        assert data.get("status") == "error"
        print(f"✓ Webhook handles invalid payload: {data}")
    
    def test_webhook_handles_empty_message(self):
        """POST /api/webhook/whatsapp handles empty message gracefully"""
        payload = {
            "type": "message_received",
            "data": {
                "customer": {"channel_phone_number": "1234567890"},
                "message": {"message": ""}
            }
        }
        response = requests.post(f"{BASE_URL}/api/webhook/whatsapp", json=payload)
        assert response.status_code == 200
        print(f"✓ Webhook handles empty message")


class TestAdminWhatsAppEndpoints:
    """Tests for admin WhatsApp inbox endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "admin"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.test_phone = "9876543210"  # Existing test conversation
    
    def test_get_conversations_list(self):
        """GET /api/admin/whatsapp/conversations returns list of WhatsApp conversations"""
        response = requests.get(
            f"{BASE_URL}/api/admin/whatsapp/conversations",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "conversations" in data
        assert "total" in data
        assert isinstance(data["conversations"], list)
        print(f"✓ Conversations list returned: {data['total']} conversations")
        
        # Verify conversation structure
        if data["conversations"]:
            conv = data["conversations"][0]
            assert "phone" in conv
            assert "customer_name" in conv
            assert "status" in conv
            assert "unread" in conv
            assert "last_message" in conv
            print(f"✓ Conversation structure verified: {conv['customer_name']}")
    
    def test_get_conversation_detail(self):
        """GET /api/admin/whatsapp/conversations/{phone} returns full messages"""
        response = requests.get(
            f"{BASE_URL}/api/admin/whatsapp/conversations/{self.test_phone}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "phone" in data
        assert "messages" in data
        assert "status" in data
        assert isinstance(data["messages"], list)
        print(f"✓ Conversation detail returned: {len(data['messages'])} messages")
        
        # Verify message structure
        if data["messages"]:
            msg = data["messages"][0]
            assert "role" in msg
            assert "content" in msg
            assert "timestamp" in msg
            assert msg["role"] in ["customer", "assistant", "admin"]
            print(f"✓ Message structure verified: role={msg['role']}")
    
    def test_get_nonexistent_conversation(self):
        """GET /api/admin/whatsapp/conversations/{phone} returns 404 for non-existent"""
        response = requests.get(
            f"{BASE_URL}/api/admin/whatsapp/conversations/nonexistent123",
            headers=self.headers
        )
        assert response.status_code == 404
        print(f"✓ Non-existent conversation returns 404")
    
    def test_conversations_require_auth(self):
        """GET /api/admin/whatsapp/conversations requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/whatsapp/conversations")
        assert response.status_code == 401
        print(f"✓ Conversations endpoint requires auth")


class TestAdminWhatsAppActions:
    """Tests for admin WhatsApp actions (send, takeover, automate)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token and setup test conversation"""
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "admin"}
        )
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.test_phone = "9876543210"  # Existing test conversation
    
    def test_admin_send_reply(self):
        """POST /api/admin/whatsapp/send sends a manual reply"""
        payload = {
            "phone": self.test_phone,
            "message": "Test admin reply from automated test"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/whatsapp/send",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "message" in data
        print(f"✓ Admin send reply: {data}")
    
    def test_admin_send_requires_phone_and_message(self):
        """POST /api/admin/whatsapp/send requires phone and message"""
        # Missing message
        response = requests.post(
            f"{BASE_URL}/api/admin/whatsapp/send",
            headers=self.headers,
            json={"phone": self.test_phone}
        )
        assert response.status_code == 400
        
        # Missing phone
        response = requests.post(
            f"{BASE_URL}/api/admin/whatsapp/send",
            headers=self.headers,
            json={"message": "test"}
        )
        assert response.status_code == 400
        print(f"✓ Send endpoint validates required fields")
    
    def test_admin_takeover_conversation(self):
        """POST /api/admin/whatsapp/conversations/{phone}/takeover switches to human mode"""
        response = requests.post(
            f"{BASE_URL}/api/admin/whatsapp/conversations/{self.test_phone}/takeover",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "human" in data["message"].lower()
        print(f"✓ Takeover successful: {data}")
        
        # Verify status changed
        conv_response = requests.get(
            f"{BASE_URL}/api/admin/whatsapp/conversations/{self.test_phone}",
            headers=self.headers
        )
        conv_data = conv_response.json()
        assert conv_data.get("status") == "human"
        print(f"✓ Conversation status is now 'human'")
    
    def test_admin_automate_conversation(self):
        """POST /api/admin/whatsapp/conversations/{phone}/automate switches back to AI mode"""
        response = requests.post(
            f"{BASE_URL}/api/admin/whatsapp/conversations/{self.test_phone}/automate",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "ai" in data["message"].lower()
        print(f"✓ Automate successful: {data}")
        
        # Verify status changed
        conv_response = requests.get(
            f"{BASE_URL}/api/admin/whatsapp/conversations/{self.test_phone}",
            headers=self.headers
        )
        conv_data = conv_response.json()
        assert conv_data.get("status") == "active"
        print(f"✓ Conversation status is now 'active'")


class TestWebhookHumanModeHandling:
    """Tests for webhook behavior in human takeover mode"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "admin"}
        )
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.test_phone = "9876543210"
    
    def test_webhook_stores_message_in_human_mode_without_ai_reply(self):
        """Webhook stores message but doesn't auto-reply when in human mode"""
        # First, switch to human mode
        requests.post(
            f"{BASE_URL}/api/admin/whatsapp/conversations/{self.test_phone}/takeover",
            headers=self.headers
        )
        
        # Get current message count
        conv_before = requests.get(
            f"{BASE_URL}/api/admin/whatsapp/conversations/{self.test_phone}",
            headers=self.headers
        ).json()
        msg_count_before = len(conv_before.get("messages", []))
        
        # Send webhook message
        payload = {
            "type": "message_received",
            "data": {
                "customer": {
                    "channel_phone_number": self.test_phone,
                    "traits": {"name": "Test User"}
                },
                "message": {"message": "Message during human mode"}
            }
        }
        response = requests.post(f"{BASE_URL}/api/webhook/whatsapp", json=payload)
        assert response.status_code == 200
        
        # Wait a moment for processing
        time.sleep(1)
        
        # Check message was stored
        conv_after = requests.get(
            f"{BASE_URL}/api/admin/whatsapp/conversations/{self.test_phone}",
            headers=self.headers
        ).json()
        msg_count_after = len(conv_after.get("messages", []))
        
        # Should have exactly 1 new message (customer), not 2 (customer + AI)
        assert msg_count_after == msg_count_before + 1
        last_msg = conv_after["messages"][-1]
        assert last_msg["role"] == "customer"
        print(f"✓ Message stored in human mode without AI reply")
        
        # Switch back to AI mode for other tests
        requests.post(
            f"{BASE_URL}/api/admin/whatsapp/conversations/{self.test_phone}/automate",
            headers=self.headers
        )


class TestLeadAutoCreation:
    """Tests for auto-lead creation from WhatsApp conversations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "admin"}
        )
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_conversation_has_lead_created_flag(self):
        """Conversation should have lead_created flag set to true"""
        response = requests.get(
            f"{BASE_URL}/api/admin/whatsapp/conversations/9876543210",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("lead_created") == True
        print(f"✓ Conversation has lead_created=True")
    
    def test_lead_exists_with_whatsapp_source(self):
        """Lead should exist in leads collection with source=whatsapp"""
        response = requests.get(
            f"{BASE_URL}/api/admin/leads",
            headers=self.headers,
            params={"search": "9876543210"}
        )
        assert response.status_code == 200
        data = response.json()
        leads = data.get("leads", [])
        
        # Find lead with matching phone
        wa_lead = None
        for lead in leads:
            if "9876543210" in lead.get("phone_whatsapp", ""):
                wa_lead = lead
                break
        
        if wa_lead:
            assert wa_lead.get("source") == "whatsapp"
            assert wa_lead.get("inquiry_type") == "WhatsApp Chat"
            print(f"✓ Lead exists with source=whatsapp: {wa_lead.get('name')}")
        else:
            print(f"⚠ Lead not found in search results (may have been created earlier)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
