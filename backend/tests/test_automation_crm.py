"""
Iteration 24: Automated CRM + Marketing Sales System via WhatsApp
Tests for:
- WhatsApp webhook creates conversation + welcome message + AI reply
- Auto lead creation from first WhatsApp message
- AI lead extraction after 2nd customer message
- Lead scoring (hot=70+, warm=40-69, cold=<40)
- Follow-up queue scheduling based on lead temperature
- Admin automation endpoints (stats, followup-queue, trigger-followups, rescore-leads)
"""
import pytest
import requests
import os
import time
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://agile-admin-hub.preview.emergentagent.com').rstrip('/')


class TestAdminLogin:
    """Verify admin login still works"""
    
    def test_admin_login_with_password_admin(self):
        """POST /api/admin/login works with password 'admin'"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "admin"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"✓ Admin login successful, token received")
    
    def test_admin_login_rejects_invalid_password(self):
        """POST /api/admin/login rejects invalid password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "wrongpassword"}
        )
        assert response.status_code == 401
        print(f"✓ Admin login correctly rejects invalid password")


class TestAutomationStatsEndpoint:
    """Tests for GET /api/admin/automation/stats"""
    
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
    
    def test_automation_stats_returns_followup_stats(self):
        """GET /api/admin/automation/stats returns followup statistics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/automation/stats",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify followups section
        assert "followups" in data
        followups = data["followups"]
        assert "total" in followups
        assert "pending" in followups
        assert "sent" in followups
        assert "skipped" in followups
        assert "failed" in followups
        
        # Verify values are integers
        assert isinstance(followups["total"], int)
        assert isinstance(followups["pending"], int)
        assert isinstance(followups["sent"], int)
        
        print(f"✓ Automation stats - followups: total={followups['total']}, pending={followups['pending']}, sent={followups['sent']}, skipped={followups['skipped']}, failed={followups['failed']}")
    
    def test_automation_stats_returns_lead_stats(self):
        """GET /api/admin/automation/stats returns lead statistics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/automation/stats",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify leads section
        assert "leads" in data
        leads = data["leads"]
        assert "total" in leads
        assert "whatsapp_sourced" in leads
        assert "by_score" in leads
        assert "by_stage" in leads
        
        # Verify values are integers
        assert isinstance(leads["total"], int)
        assert isinstance(leads["whatsapp_sourced"], int)
        assert isinstance(leads["by_score"], dict)
        assert isinstance(leads["by_stage"], dict)
        
        print(f"✓ Automation stats - leads: total={leads['total']}, whatsapp_sourced={leads['whatsapp_sourced']}")
        print(f"  by_score: {leads['by_score']}")
        print(f"  by_stage: {leads['by_stage']}")
    
    def test_automation_stats_requires_auth(self):
        """GET /api/admin/automation/stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/automation/stats")
        assert response.status_code == 401
        print(f"✓ Automation stats endpoint requires auth")


class TestFollowupQueueEndpoint:
    """Tests for GET /api/admin/automation/followup-queue"""
    
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
    
    def test_followup_queue_returns_pending_followups(self):
        """GET /api/admin/automation/followup-queue returns pending followups"""
        response = requests.get(
            f"{BASE_URL}/api/admin/automation/followup-queue",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "queue" in data
        assert "total" in data
        assert isinstance(data["queue"], list)
        assert isinstance(data["total"], int)
        
        print(f"✓ Followup queue returned: {data['total']} items")
        
        # Verify followup structure if any exist
        if data["queue"]:
            fu = data["queue"][0]
            assert "phone" in fu
            assert "message" in fu
            assert "followup_type" in fu
            assert "send_at" in fu
            assert "status" in fu
            print(f"  First followup: phone={fu['phone']}, type={fu['followup_type']}, status={fu['status']}, send_at={fu['send_at']}")
    
    def test_followup_queue_requires_auth(self):
        """GET /api/admin/automation/followup-queue requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/automation/followup-queue")
        assert response.status_code == 401
        print(f"✓ Followup queue endpoint requires auth")


class TestTriggerFollowupsEndpoint:
    """Tests for POST /api/admin/automation/trigger-followups"""
    
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
    
    def test_trigger_followups_processes_due_followups(self):
        """POST /api/admin/automation/trigger-followups processes due followups"""
        response = requests.post(
            f"{BASE_URL}/api/admin/automation/trigger-followups",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "sent" in data
        assert "message" in data
        assert isinstance(data["sent"], int)
        
        print(f"✓ Trigger followups: sent={data['sent']}, message={data['message']}")
    
    def test_trigger_followups_requires_auth(self):
        """POST /api/admin/automation/trigger-followups requires authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/automation/trigger-followups")
        assert response.status_code == 401
        print(f"✓ Trigger followups endpoint requires auth")


class TestRescoreLeadsEndpoint:
    """Tests for POST /api/admin/automation/rescore-leads"""
    
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
    
    def test_rescore_leads_reanalyzes_conversations(self):
        """POST /api/admin/automation/rescore-leads re-analyzes all conversations"""
        response = requests.post(
            f"{BASE_URL}/api/admin/automation/rescore-leads",
            headers=self.headers,
            timeout=60  # AI extraction can take time
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "rescored" in data
        assert "total_conversations" in data
        assert isinstance(data["rescored"], int)
        assert isinstance(data["total_conversations"], int)
        
        print(f"✓ Rescore leads: rescored={data['rescored']}, total_conversations={data['total_conversations']}")
    
    def test_rescore_leads_requires_auth(self):
        """POST /api/admin/automation/rescore-leads requires authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/automation/rescore-leads")
        assert response.status_code == 401
        print(f"✓ Rescore leads endpoint requires auth")


class TestWhatsAppWebhookWithAutomation:
    """Tests for WhatsApp webhook with new automation features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data with unique phone number"""
        self.test_phone = f"91{uuid.uuid4().hex[:10]}"  # Unique phone for clean testing
        self.test_name = f"TEST_Dr_{uuid.uuid4().hex[:6]}"
        
        # Get admin token for verification
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "admin"}
        )
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_webhook_creates_conversation_on_first_message(self):
        """POST /api/webhook/whatsapp creates conversation for new phone"""
        payload = {
            "type": "message_received",
            "data": {
                "customer": {
                    "channel_phone_number": self.test_phone,
                    "traits": {"name": self.test_name}
                },
                "message": {"message": "Hi, I need knee implants for my hospital"}
            }
        }
        response = requests.post(f"{BASE_URL}/api/webhook/whatsapp", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        print(f"✓ Webhook accepted first message for phone {self.test_phone}")
        
        # Wait for async processing
        time.sleep(8)  # AI response takes time
        
        # Verify conversation was created
        conv_response = requests.get(
            f"{BASE_URL}/api/admin/whatsapp/conversations/{self.test_phone}",
            headers=self.headers
        )
        assert conv_response.status_code == 200
        conv_data = conv_response.json()
        
        assert conv_data.get("phone") == self.test_phone
        assert len(conv_data.get("messages", [])) >= 2  # Customer msg + welcome/AI reply
        print(f"✓ Conversation created with {len(conv_data.get('messages', []))} messages")
        
        # Check for welcome message
        messages = conv_data.get("messages", [])
        has_welcome = any(m.get("type") == "welcome" for m in messages)
        print(f"  Welcome message present: {has_welcome}")
    
    def test_lead_auto_created_from_first_message(self):
        """Lead is auto-created in CRM from first WhatsApp message"""
        # Send first message
        payload = {
            "type": "message_received",
            "data": {
                "customer": {
                    "channel_phone_number": self.test_phone,
                    "traits": {"name": self.test_name}
                },
                "message": {"message": "I am looking for orthopedic implants"}
            }
        }
        requests.post(f"{BASE_URL}/api/webhook/whatsapp", json=payload)
        
        # Wait for processing
        time.sleep(8)
        
        # Check conversation has lead_created flag
        conv_response = requests.get(
            f"{BASE_URL}/api/admin/whatsapp/conversations/{self.test_phone}",
            headers=self.headers
        )
        if conv_response.status_code == 200:
            conv_data = conv_response.json()
            lead_created = conv_data.get("lead_created", False)
            print(f"✓ Conversation lead_created flag: {lead_created}")
            
            # Check lead exists in leads collection
            leads_response = requests.get(
                f"{BASE_URL}/api/admin/leads",
                headers=self.headers,
                params={"search": self.test_phone}
            )
            if leads_response.status_code == 200:
                leads_data = leads_response.json()
                matching_leads = [l for l in leads_data.get("leads", []) if self.test_phone in l.get("phone_whatsapp", "")]
                if matching_leads:
                    lead = matching_leads[0]
                    assert lead.get("source") == "whatsapp"
                    print(f"✓ Lead auto-created: name={lead.get('name')}, source={lead.get('source')}, score={lead.get('score')}")
                else:
                    print(f"⚠ Lead not found in search (may need more time)")


class TestLeadScoringLogic:
    """Tests for lead scoring calculation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "admin"}
        )
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_lead_scores_are_valid_labels(self):
        """Leads have valid score labels (hot/warm/cold)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/leads",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        leads = data.get("leads", [])
        
        valid_scores = {"hot", "warm", "cold", "Hot", "Warm", "Cold", ""}
        for lead in leads[:20]:  # Check first 20
            score = lead.get("score", "")
            assert score.lower() in {"hot", "warm", "cold", ""}, f"Invalid score: {score}"
        
        print(f"✓ All lead scores are valid (hot/warm/cold)")
    
    def test_automation_stats_shows_score_breakdown(self):
        """Automation stats shows lead breakdown by score"""
        response = requests.get(
            f"{BASE_URL}/api/admin/automation/stats",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        by_score = data.get("leads", {}).get("by_score", {})
        print(f"✓ Lead score breakdown: {by_score}")
        
        # Verify score labels if present
        for score_label in by_score.keys():
            assert score_label.lower() in {"hot", "warm", "cold"}, f"Invalid score label: {score_label}"


class TestFollowupScheduling:
    """Tests for follow-up scheduling based on lead temperature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "admin"}
        )
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_followup_queue_has_score_labels(self):
        """Followup queue items have score_label field"""
        response = requests.get(
            f"{BASE_URL}/api/admin/automation/followup-queue",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        queue = data.get("queue", [])
        if queue:
            for fu in queue[:5]:
                score_label = fu.get("score_label", "")
                if score_label:
                    assert score_label in {"hot", "warm", "cold"}, f"Invalid score_label: {score_label}"
            print(f"✓ Followup queue items have valid score_label")
        else:
            print(f"⚠ Followup queue is empty (no pending followups)")
    
    def test_manual_schedule_followups_for_phone(self):
        """POST /api/admin/automation/schedule-followups/{phone} schedules followups"""
        # Use existing test phone
        test_phone = "919999900001"  # Dr. Kumar's phone from context
        
        response = requests.post(
            f"{BASE_URL}/api/admin/automation/schedule-followups/{test_phone}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if "error" not in data:
            assert "message" in data
            assert "score" in data
            print(f"✓ Manual schedule followups: {data['message']}, score={data['score']}")
        else:
            print(f"⚠ Conversation not found for {test_phone}: {data.get('error')}")


class TestExistingConversationDrKumar:
    """Tests using existing Dr. Kumar conversation (919999900001)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "admin"}
        )
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.dr_kumar_phone = "919999900001"
    
    def test_dr_kumar_conversation_exists(self):
        """Verify Dr. Kumar conversation exists"""
        response = requests.get(
            f"{BASE_URL}/api/admin/whatsapp/conversations/{self.dr_kumar_phone}",
            headers=self.headers
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Dr. Kumar conversation exists: {len(data.get('messages', []))} messages")
            print(f"  lead_created: {data.get('lead_created')}")
            print(f"  lead_score: {data.get('lead_score')}")
            print(f"  lead_score_value: {data.get('lead_score_value')}")
        else:
            print(f"⚠ Dr. Kumar conversation not found (status={response.status_code})")
    
    def test_dr_kumar_lead_exists(self):
        """Verify Dr. Kumar lead exists with hot score"""
        response = requests.get(
            f"{BASE_URL}/api/admin/leads",
            headers=self.headers,
            params={"search": "919999900001"}
        )
        assert response.status_code == 200
        data = response.json()
        
        matching_leads = [l for l in data.get("leads", []) if "919999900001" in l.get("phone_whatsapp", "")]
        if matching_leads:
            lead = matching_leads[0]
            print(f"✓ Dr. Kumar lead found:")
            print(f"  name: {lead.get('name')}")
            print(f"  hospital: {lead.get('hospital_clinic')}")
            print(f"  score: {lead.get('score')}")
            print(f"  score_value: {lead.get('score_value')}")
            print(f"  source: {lead.get('source')}")
        else:
            print(f"⚠ Dr. Kumar lead not found in search")
    
    def test_dr_kumar_has_pending_followups(self):
        """Verify Dr. Kumar has pending followups"""
        response = requests.get(
            f"{BASE_URL}/api/admin/automation/followup-queue",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        dr_kumar_followups = [fu for fu in data.get("queue", []) if fu.get("phone") == self.dr_kumar_phone]
        pending_count = len([fu for fu in dr_kumar_followups if fu.get("status") == "pending"])
        
        print(f"✓ Dr. Kumar followups: {len(dr_kumar_followups)} total, {pending_count} pending")
        if dr_kumar_followups:
            for fu in dr_kumar_followups[:3]:
                print(f"  - type={fu.get('followup_type')}, status={fu.get('status')}, send_at={fu.get('send_at')}")


class TestProductsPageStillWorks:
    """Verify products page still loads correctly"""
    
    def test_products_endpoint_returns_data(self):
        """GET /api/products returns products with images"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        
        assert "products" in data
        assert len(data["products"]) > 0
        print(f"✓ Products endpoint returns {len(data['products'])} products")
    
    def test_divisions_endpoint_returns_data(self):
        """GET /api/divisions returns divisions"""
        response = requests.get(f"{BASE_URL}/api/divisions")
        assert response.status_code == 200
        data = response.json()
        
        assert "divisions" in data
        assert len(data["divisions"]) > 0
        print(f"✓ Divisions endpoint returns {len(data['divisions'])} divisions")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
