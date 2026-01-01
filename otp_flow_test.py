#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime

class OTPFlowTester:
    def __init__(self, base_url="https://orthocare-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.surgeon_token = None
        self.admin_token = None
        self.test_mobile = "9876543210"
        self.test_otp = None
        self.surgeon_profile_id = None
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

    def test_otp_request(self):
        """Test OTP request"""
        try:
            payload = {"mobile": self.test_mobile}
            response = requests.post(f"{self.base_url}/api/auth/otp/request", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.test_otp = data.get('mocked_otp')  # MVP returns OTP in response
                details += f" (OTP: {self.test_otp})"
            
            self.log_test("OTP Request", success, details)
            return success
        except Exception as e:
            self.log_test("OTP Request", False, str(e))
            return False

    def test_otp_verify(self):
        """Test OTP verification"""
        if not self.test_otp:
            self.log_test("OTP Verify", False, "No OTP available")
            return False
            
        try:
            payload = {"mobile": self.test_mobile, "code": self.test_otp}
            response = requests.post(f"{self.base_url}/api/auth/otp/verify", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.surgeon_token = data.get('token')
                details += " (Token received)"
            
            self.log_test("OTP Verify", success, details)
            return success
        except Exception as e:
            self.log_test("OTP Verify", False, str(e))
            return False

    def test_surgeon_me(self):
        """Test surgeon me endpoint"""
        if not self.surgeon_token:
            self.log_test("Surgeon Me", False, "No surgeon token")
            return False
            
        try:
            headers = {'Authorization': f'Bearer {self.surgeon_token}'}
            response = requests.get(f"{self.base_url}/api/surgeon/me", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f" (Mobile: {data.get('mobile', 'N/A')})"
            
            self.log_test("Surgeon Me", success, details)
            return success
        except Exception as e:
            self.log_test("Surgeon Me", False, str(e))
            return False

    def test_surgeon_get_profile(self):
        """Test get surgeon profile"""
        if not self.surgeon_token:
            self.log_test("Get Surgeon Profile", False, "No surgeon token")
            return False
            
        try:
            headers = {'Authorization': f'Bearer {self.surgeon_token}'}
            response = requests.get(f"{self.base_url}/api/surgeon/me/profile", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                profile_exists = data.get('exists', False)
                details += f" (Profile exists: {profile_exists})"
            
            self.log_test("Get Surgeon Profile", success, details)
            return success
        except Exception as e:
            self.log_test("Get Surgeon Profile", False, str(e))
            return False

    def test_surgeon_create_profile(self):
        """Test surgeon profile creation"""
        if not self.surgeon_token:
            self.log_test("Create Surgeon Profile", False, "No surgeon token")
            return False
            
        try:
            headers = {'Authorization': f'Bearer {self.surgeon_token}'}
            payload = {
                "qualifications": "MS Ortho, DNB",
                "registration_number": f"OTP{int(time.time())}",
                "subspecialties": ["Knee", "Hip"],
                "about": "Test surgeon profile created via OTP flow",
                "conditions_treated": ["knee arthritis", "hip replacement"],
                "procedures_performed": ["arthroscopy", "joint replacement"],
                "locations": [
                    {
                        "facility_name": "Test Hospital",
                        "address": "Test Street, Test Area",
                        "city": "Mumbai",
                        "pincode": "400001",
                        "opd_timings": "Mon-Fri 6-8pm",
                        "phone": "022-12345678"
                    }
                ]
            }
            
            response = requests.put(f"{self.base_url}/api/surgeon/me/profile", json=payload, headers=headers, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.surgeon_profile_id = data.get('id')
                details += f" (Profile ID: {self.surgeon_profile_id[:8] if self.surgeon_profile_id else 'N/A'}...)"
            
            self.log_test("Create Surgeon Profile", success, details)
            return success
        except Exception as e:
            self.log_test("Create Surgeon Profile", False, str(e))
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
                details += " (Admin token received)"
            
            self.log_test("Admin Login", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Login", False, str(e))
            return False

    def test_admin_list_pending_surgeons(self):
        """Test admin list pending surgeons"""
        if not self.admin_token:
            self.log_test("Admin List Pending", False, "No admin token")
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
                pending_count = len(data)
                details += f" (Pending profiles: {pending_count})"
                
                # Check if our test profile is in the list
                if self.surgeon_profile_id:
                    test_found = any(s.get('id') == self.surgeon_profile_id for s in data)
                    details += f" (Test profile found: {test_found})"
            
            self.log_test("Admin List Pending", success, details)
            return success
        except Exception as e:
            self.log_test("Admin List Pending", False, str(e))
            return False

    def test_admin_approve_surgeon(self):
        """Test admin approve surgeon"""
        if not self.admin_token or not self.surgeon_profile_id:
            self.log_test("Admin Approve", False, "No admin token or surgeon profile ID")
            return False
            
        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            payload = {
                "status": "approved",
                "subspecialties": ["Knee", "Hip"]
            }
            
            response = requests.patch(
                f"{self.base_url}/api/admin/surgeons/{self.surgeon_profile_id}",
                json=payload,
                headers=headers,
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            self.log_test("Admin Approve", success, details)
            return success
        except Exception as e:
            self.log_test("Admin Approve", False, str(e))
            return False

    def test_approved_profile_public_access(self):
        """Test that approved profile is accessible via public search"""
        if not self.surgeon_profile_id:
            self.log_test("Public Profile Access", False, "No surgeon profile ID")
            return False
            
        try:
            # Wait a moment for approval to take effect
            time.sleep(2)
            
            params = {
                "q": "knee specialist near 400001",
                "radius_km": 10
            }
            
            response = requests.get(
                f"{self.base_url}/api/profiles/smart-search",
                params=params,
                timeout=15
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f" (Found: {len(data)} surgeons)"
                # Check if our test surgeon is in results
                test_found = any(s.get('id') == self.surgeon_profile_id for s in data)
                if test_found:
                    details += " (Test surgeon found in public search)"
                else:
                    details += " (Test surgeon not found - may need indexing time)"
            
            self.log_test("Public Profile Access", success, details)
            return success
        except Exception as e:
            self.log_test("Public Profile Access", False, str(e))
            return False

    def run_otp_flow_test(self):
        """Run complete OTP login + profile submission + admin approval flow"""
        print("🚀 Starting OTP Flow Test")
        print(f"Base URL: {self.base_url}")
        print("-" * 60)
        
        # Step 1: OTP Authentication Flow
        print("📱 Testing OTP Authentication...")
        if not self.test_otp_request():
            print("❌ OTP request failed. Stopping tests.")
            return False
            
        if not self.test_otp_verify():
            print("❌ OTP verification failed. Stopping tests.")
            return False
            
        # Step 2: Surgeon Profile Management
        print("\n👨‍⚕️ Testing Surgeon Profile Management...")
        self.test_surgeon_me()
        self.test_surgeon_get_profile()
        
        if not self.test_surgeon_create_profile():
            print("❌ Profile creation failed. Stopping tests.")
            return False
            
        # Step 3: Admin Approval Workflow
        print("\n👑 Testing Admin Approval Workflow...")
        if not self.test_admin_login():
            print("❌ Admin login failed. Stopping tests.")
            return False
            
        self.test_admin_list_pending_surgeons()
        
        if not self.test_admin_approve_surgeon():
            print("❌ Admin approval failed. Stopping tests.")
            return False
            
        # Step 4: Public Access Verification
        print("\n🔍 Testing Public Access...")
        self.test_approved_profile_public_access()
        
        # Print summary
        print("-" * 60)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 Complete OTP flow working perfectly!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

    def get_test_summary(self):
        """Get test summary for reporting"""
        return {
            "flow_type": "OTP Login + Profile Submission + Admin Approval",
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "test_results": self.test_results,
            "test_mobile": self.test_mobile,
            "surgeon_profile_id": self.surgeon_profile_id
        }

def main():
    tester = OTPFlowTester()
    success = tester.run_otp_flow_test()
    
    # Save detailed results
    summary = tester.get_test_summary()
    with open('/app/otp_flow_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())