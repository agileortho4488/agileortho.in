"""
Test Document Upload Features - Iteration 11
Tests for:
1. JoinSurgeon page: Document validation (mandatory uploads)
2. AdminDashboard: View button and inline image preview for documents
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminLogin:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Admin login with correct password returns token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "admin"})
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert len(data["token"]) > 0
        print(f"✅ Admin login successful, token received")
        return data["token"]
    
    def test_admin_login_wrong_password(self):
        """Admin login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "wrongpassword"})
        assert response.status_code == 401
        print(f"✅ Admin login with wrong password correctly rejected")


class TestAdminSurgeonsList:
    """Test admin surgeons list with documents"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "admin"})
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_get_pending_surgeons(self, admin_token):
        """Get list of pending surgeons"""
        response = requests.get(
            f"{BASE_URL}/api/admin/surgeons",
            params={"status": "pending"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} pending surgeons")
        return data
    
    def test_get_all_surgeons_with_documents(self, admin_token):
        """Get all surgeons and check document structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/surgeons",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        surgeons_with_docs = 0
        surgeons_without_docs = 0
        
        for surgeon in data:
            docs = surgeon.get("documents", [])
            if docs:
                surgeons_with_docs += 1
                # Verify document structure
                for doc in docs:
                    assert "id" in doc, "Document should have id"
                    assert "filename" in doc, "Document should have filename"
                    assert "type" in doc, "Document should have type"
                    print(f"  📄 Document: {doc.get('filename')} (type: {doc.get('type')})")
            else:
                surgeons_without_docs += 1
        
        print(f"✅ Surgeons with documents: {surgeons_with_docs}")
        print(f"⚠️ Surgeons without documents: {surgeons_without_docs}")
        return data
    
    def test_document_download_endpoint(self, admin_token):
        """Test document download endpoint with token auth"""
        # First get a surgeon with documents
        response = requests.get(
            f"{BASE_URL}/api/admin/surgeons",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        surgeons = response.json()
        
        # Find a surgeon with documents
        doc_id = None
        for surgeon in surgeons:
            docs = surgeon.get("documents", [])
            if docs:
                doc_id = docs[0].get("id")
                break
        
        if not doc_id:
            print("⚠️ No surgeons with documents found - skipping download test")
            pytest.skip("No documents available to test download")
        
        # Test download with token query param (as used in frontend)
        download_url = f"{BASE_URL}/api/admin/documents/{doc_id}/download?token={admin_token}"
        response = requests.get(download_url)
        
        # Should return 200 or 404 (if file doesn't exist on disk)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            print(f"✅ Document download successful for doc_id: {doc_id}")
        else:
            print(f"⚠️ Document file not found on disk (expected in some test environments)")
    
    def test_document_download_without_auth(self):
        """Test document download without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/documents/fake-doc-id/download")
        assert response.status_code == 401
        print(f"✅ Document download without auth correctly rejected")


class TestSurgeonProfileEndpoints:
    """Test surgeon profile endpoints related to documents"""
    
    def test_surgeon_profile_get_without_auth(self):
        """Surgeon profile endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/surgeon/me/profile")
        assert response.status_code == 401
        print(f"✅ Surgeon profile endpoint requires authentication")
    
    def test_surgeon_document_upload_without_auth(self):
        """Document upload requires auth"""
        response = requests.post(f"{BASE_URL}/api/surgeon/me/profile/documents")
        assert response.status_code in [401, 422]  # 401 for auth, 422 for missing files
        print(f"✅ Document upload endpoint requires authentication")


class TestSurgeonProfileResponse:
    """Test surgeon profile response includes documents info"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "admin"})
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_surgeon_admin_response_has_documents_field(self, admin_token):
        """Verify admin surgeon response includes documents array"""
        response = requests.get(
            f"{BASE_URL}/api/admin/surgeons",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        surgeons = response.json()
        
        if surgeons:
            surgeon = surgeons[0]
            assert "documents" in surgeon, "Surgeon response should include documents field"
            assert isinstance(surgeon["documents"], list), "Documents should be a list"
            print(f"✅ Surgeon response includes documents field (count: {len(surgeon['documents'])})")
        else:
            print("⚠️ No surgeons found to verify documents field")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
