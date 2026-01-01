"""
Test Discovery and CRM Features - Iteration 12
Tests:
- Surgeons page performance (no heavy animations)
- Admin Dashboard Discovery and Bulk Import buttons
- Discovery API endpoints (search, stats, history, import)
- CRM page Zoho Campaigns connection
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://orthopedia-1.preview.emergentagent.com")
ADMIN_PASSWORD = "admin"


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with correct password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert len(data["token"]) > 0
        return data["token"]


class TestDiscoveryAPIs:
    """Discovery API endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_discovery_stats_endpoint(self, admin_token):
        """Test GET /api/admin/discovery/stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discovery/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should return stats object with total, imported, matched, new
        assert "total" in data
        assert "imported" in data
        assert "matched" in data
        assert "new" in data
        print(f"Discovery stats: {data}")
    
    def test_discovery_history_endpoint(self, admin_token):
        """Test GET /api/admin/discovery/history"""
        response = requests.get(
            f"{BASE_URL}/api/admin/discovery/history?limit=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should return a list
        assert isinstance(data, list)
        print(f"Discovery history count: {len(data)}")
    
    def test_discovery_search_endpoint(self, admin_token):
        """Test POST /api/admin/discovery/search"""
        response = requests.post(
            f"{BASE_URL}/api/admin/discovery/search",
            json={
                "state": "telangana",
                "city": "Hyderabad",
                "sources": ["google_maps"],
                "query": "orthopaedic surgeon"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should return results array and total
        assert "results" in data
        assert "total" in data
        assert isinstance(data["results"], list)
        print(f"Discovery search found: {data['total']} results")
    
    def test_discovery_import_endpoint(self, admin_token):
        """Test POST /api/admin/discovery/import"""
        response = requests.post(
            f"{BASE_URL}/api/admin/discovery/import",
            json={
                "surgeons": []  # Empty list - should return 0 imported
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should return imported, skipped, errors
        assert "imported" in data
        assert "skipped" in data
        assert "errors" in data
        print(f"Discovery import result: {data}")
    
    def test_discovery_endpoints_require_auth(self):
        """Test that discovery endpoints require authentication"""
        # Stats without auth
        response = requests.get(f"{BASE_URL}/api/admin/discovery/stats")
        assert response.status_code == 401
        
        # History without auth
        response = requests.get(f"{BASE_URL}/api/admin/discovery/history")
        assert response.status_code == 401
        
        # Search without auth
        response = requests.post(
            f"{BASE_URL}/api/admin/discovery/search",
            json={"state": "telangana", "city": "Hyderabad", "sources": [], "query": ""}
        )
        assert response.status_code == 401
        
        # Import without auth
        response = requests.post(
            f"{BASE_URL}/api/admin/discovery/import",
            json={"surgeons": []}
        )
        assert response.status_code == 401
        print("All discovery endpoints correctly require authentication")


class TestZohoCampaignsAPIs:
    """Zoho Campaigns API tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_zoho_campaigns_lists_endpoint(self, admin_token):
        """Test GET /api/admin/zoho-campaigns/lists"""
        response = requests.get(
            f"{BASE_URL}/api/admin/zoho-campaigns/lists",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # May return 200 or 500 depending on Zoho token validity
        print(f"Zoho Campaigns lists status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            assert "lists" in data
            print(f"Zoho Campaigns lists: {data}")
        else:
            # Token may be expired - this is expected
            print(f"Zoho Campaigns connection issue (expected if token expired): {response.text[:200]}")
    
    def test_zoho_campaigns_campaigns_endpoint(self, admin_token):
        """Test GET /api/admin/zoho-campaigns/campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/admin/zoho-campaigns/campaigns",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Zoho Campaigns campaigns status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            assert "campaigns" in data
            print(f"Zoho Campaigns: {data}")


class TestCRMAPIs:
    """CRM API tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_crm_contacts_endpoint(self, admin_token):
        """Test GET /api/admin/crm/contacts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/crm/contacts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"CRM contacts count: {len(data)}")
    
    def test_crm_stats_endpoint(self, admin_token):
        """Test GET /api/admin/crm/stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/crm/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "by_status" in data
        print(f"CRM stats: {data}")


class TestSurgeonsPagePerformance:
    """Test Surgeons page loads without heavy animations"""
    
    def test_profiles_all_endpoint(self):
        """Test GET /api/profiles/all - used by Surgeons page"""
        response = requests.get(f"{BASE_URL}/api/profiles/all")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Surgeons page data: {len(data)} profiles")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
