#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime
from pathlib import Path

class OrthoConnectAPITester:
    def __init__(self, base_url="https://ortho-connect-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.test_surgeon_id = None
        self.test_upload_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def test_health_check(self):
        """Test basic API health"""
        try:
            response = requests.get(f"{self.base_url}/api/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'N/A')}"
            self.log_test("API Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("API Health Check", False, str(e))
            return False

    def test_get_subspecialties(self):
        """Test subspecialties endpoint"""
        try:
            response = requests.get(f"{self.base_url}/api/meta/subspecialties", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                subspecialties = data.get('subspecialties', [])
                details += f", Count: {len(subspecialties)}"
                expected = ["Shoulder", "Elbow", "Hand", "Hip", "Knee", "Oncology", "Paediatrics"]
                if set(expected).issubset(set(subspecialties)):
                    details += " (All expected subspecialties found)"
                else:
                    success = False
                    details += " (Missing expected subspecialties)"
            self.log_test("Get Subspecialties", success, details)
            return success
        except Exception as e:
            self.log_test("Get Subspecialties", False, str(e))
            return False

    def test_admin_login(self):
        """Test admin login"""
        try:
            payload = {"password": "admin"}
            response = requests.post(f"{self.base_url}/api/admin/login", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                self.admin_token = data.get('token')
                details += " (Token received)"
            self.log_test("Admin Login", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Login", False, str(e))
            return False

    def test_create_surgeon_profile(self):
        """Test surgeon profile creation using legacy endpoint"""
        try:
            # Create a test surgeon profile using the legacy endpoint
            form_data = {
                "name": "Dr. Test Surgeon",
                "qualifications": "MS Ortho, DNB",
                "registration_number": "TEST123456",
                "subspecialties": "Knee,Hip",
                "about": "Test surgeon for API testing",
                "conditions_treated": "knee arthritis,hip replacement",
                "procedures_performed": "arthroscopy,joint replacement",
                "clinic_address": "Test Hospital, Test Street",
                "clinic_city": "Mumbai",
                "clinic_pincode": "400001",
                "clinic_opd_timings": "Mon-Fri 6-8pm",
                "clinic_phone": "022-12345678"
            }
            
            response = requests.post(f"{self.base_url}/api/surgeons/join", data=form_data, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.test_surgeon_id = data.get('id')
                self.test_upload_token = data.get('upload_token')
                details += f" (ID: {self.test_surgeon_id[:8]}...)"
            
            self.log_test("Create Surgeon Profile", success, details)
            return success
        except Exception as e:
            self.log_test("Create Surgeon Profile", False, str(e))
            return False

    def test_upload_document(self):
        """Test document upload"""
        if not self.test_surgeon_id or not self.test_upload_token:
            self.log_test("Upload Document", False, "No surgeon ID or upload token")
            return False
            
        try:
            # Create a small dummy file
            dummy_content = b"This is a test document for API testing"
            files = {'files': ('test_document.txt', dummy_content, 'text/plain')}
            data = {'doc_type': 'registration'}
            headers = {'X-Upload-Token': self.test_upload_token}
            
            response = requests.post(
                f"{self.base_url}/api/surgeons/{self.test_surgeon_id}/documents",
                files=files,
                data=data,
                headers=headers,
                timeout=15
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                uploaded_count = data.get('uploaded', 0)
                details += f" (Uploaded: {uploaded_count})"
            
            self.log_test("Upload Document", success, details)
            return success
        except Exception as e:
            self.log_test("Upload Document", False, str(e))
            return False

    def test_admin_list_surgeons(self):
        """Test admin list surgeons"""
        if not self.admin_token:
            self.log_test("Admin List Surgeons", False, "No admin token")
            return False
            
        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            response = requests.get(
                f"{self.base_url}/api/admin/surgeons",
                params={'status': 'pending'},
                headers=headers,
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f" (Found: {len(data)} pending profiles)"
            
            self.log_test("Admin List Surgeons", success, details)
            return success
        except Exception as e:
            self.log_test("Admin List Surgeons", False, str(e))
            return False

    def test_admin_approve_surgeon(self):
        """Test admin approve surgeon"""
        if not self.admin_token or not self.test_surgeon_id:
            self.log_test("Admin Approve Surgeon", False, "No admin token or surgeon ID")
            return False
            
        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            payload = {
                "status": "approved",
                "subspecialties": ["Knee", "Hip"]
            }
            
            response = requests.patch(
                f"{self.base_url}/api/admin/surgeons/{self.test_surgeon_id}",
                json=payload,
                headers=headers,
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            self.log_test("Admin Approve Surgeon", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Approve Surgeon", False, str(e))
            return False

    def test_search_surgeons(self):
        """Test surgeon search"""
        try:
            # Wait a moment for the approval to take effect
            time.sleep(2)
            
            params = {
                "location": "400001",  # Mumbai pincode
                "radius_km": 10,
                "subspecialty": "Knee"
            }
            
            response = requests.get(
                f"{self.base_url}/api/surgeons/search",
                params=params,
                timeout=15
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f" (Found: {len(data)} surgeons)"
                # Check if our test surgeon is in results
                test_found = any(s.get('id') == self.test_surgeon_id for s in data)
                if test_found:
                    details += " (Test surgeon found in results)"
                else:
                    details += " (Test surgeon not found - may need more time for indexing)"
            
            self.log_test("Search Surgeons", success, details)
            return success
        except Exception as e:
            self.log_test("Search Surgeons", False, str(e))
            return False

    def test_get_surgeon_by_slug(self):
        """Test get surgeon by slug"""
        if not self.test_surgeon_id:
            self.log_test("Get Surgeon by Slug", False, "No test surgeon ID")
            return False
            
        try:
            # First get the surgeon details to find the slug
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            response = requests.get(
                f"{self.base_url}/api/admin/surgeons",
                headers=headers,
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_test("Get Surgeon by Slug", False, "Could not fetch surgeon details")
                return False
                
            surgeons = response.json()
            test_surgeon = next((s for s in surgeons if s.get('id') == self.test_surgeon_id), None)
            
            if not test_surgeon:
                self.log_test("Get Surgeon by Slug", False, "Test surgeon not found in admin list")
                return False
                
            slug = test_surgeon.get('slug')
            if not slug:
                self.log_test("Get Surgeon by Slug", False, "No slug found for test surgeon")
                return False
            
            # Now test the public endpoint
            response = requests.get(f"{self.base_url}/api/surgeons/by-slug/{slug}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Slug: {slug}"
            
            if success:
                data = response.json()
                details += f" (Name: {data.get('name', 'N/A')})"
            
            self.log_test("Get Surgeon by Slug", success, details)
            return success
        except Exception as e:
            self.log_test("Get Surgeon by Slug", False, str(e))
            return False

    def test_invalid_endpoints(self):
        """Test error handling for invalid requests"""
        try:
            # Test invalid surgeon search (no location)
            response = requests.get(f"{self.base_url}/api/surgeons/search", timeout=10)
            success = response.status_code == 400  # Should return bad request
            details = f"Invalid search status: {response.status_code}"
            self.log_test("Invalid Search Handling", success, details)
            
            # Test invalid slug
            response = requests.get(f"{self.base_url}/api/surgeons/by-slug/nonexistent", timeout=10)
            success = response.status_code == 404  # Should return not found
            details = f"Invalid slug status: {response.status_code}"
            self.log_test("Invalid Slug Handling", success, details)
            
            return True
        except Exception as e:
            self.log_test("Invalid Endpoints Test", False, str(e))
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting OrthoConnect API Tests")
        print(f"Base URL: {self.base_url}")
        print("-" * 50)
        
        # Basic connectivity tests
        if not self.test_health_check():
            print("❌ Basic connectivity failed. Stopping tests.")
            return False
            
        self.test_get_subspecialties()
        
        # Admin functionality tests
        if self.test_admin_login():
            self.test_admin_list_surgeons()
        
        # Surgeon creation and approval flow
        if self.test_create_surgeon_profile():
            self.test_upload_document()
            if self.admin_token:
                self.test_admin_approve_surgeon()
        
        # Search functionality
        self.test_search_surgeons()
        self.test_get_surgeon_by_slug()
        
        # Error handling
        self.test_invalid_endpoints()
        
        # Print summary
        print("-" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

    def get_test_summary(self):
        """Get test summary for reporting"""
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "test_results": self.test_results
        }

def main():
    tester = OrthoConnectAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    summary = tester.get_test_summary()
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())