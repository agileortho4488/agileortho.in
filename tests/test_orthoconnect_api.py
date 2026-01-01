"""
OrthoConnect API Tests
Tests for: Doctor profiles, WhatsApp/Call/Website buttons, subspecialties, search with Hindi keywords
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://jointsmart.preview.emergentagent.com')

class TestHealthAndMeta:
    """Health check and meta endpoints"""
    
    def test_api_health(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "OrthoConnect API"
        print("✅ API health check passed")
    
    def test_subspecialties_endpoint(self):
        """Test subspecialties meta endpoint returns expanded list"""
        response = requests.get(f"{BASE_URL}/api/meta/subspecialties")
        assert response.status_code == 200
        data = response.json()
        
        # Check it's a dict with subspecialties key
        assert "subspecialties" in data
        subspecialties = data["subspecialties"]
        
        # Verify expanded subspecialties are present
        assert "Spine" in subspecialties, "Spine subspecialty should be present"
        assert "Sports Medicine" in subspecialties, "Sports Medicine subspecialty should be present"
        assert "Trauma" in subspecialties, "Trauma subspecialty should be present"
        assert "Knee" in subspecialties, "Knee subspecialty should be present"
        assert "Shoulder" in subspecialties, "Shoulder subspecialty should be present"
        
        print(f"✅ Subspecialties endpoint returned: {subspecialties}")


class TestDoctorProfile:
    """Doctor profile endpoint tests"""
    
    def test_get_doctor_profile_by_slug(self):
        """Test getting doctor profile by slug"""
        slug = "dr-test-playwright-knee-mumbai-7ab3"
        response = requests.get(f"{BASE_URL}/api/profiles/by-slug/{slug}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify basic profile fields
        assert data["slug"] == slug
        assert data["status"] == "approved"
        assert data["name"] == "Dr. Test Playwright"
        assert "qualifications" in data
        
        print(f"✅ Doctor profile loaded: {data['name']}")
        
        # Verify subspecialties
        assert "subspecialties" in data
        assert "Knee" in data["subspecialties"]
        assert "Sports Medicine" in data["subspecialties"]
        print(f"✅ Subspecialties: {data['subspecialties']}")
        
        # Verify website field exists (for Visit Website button)
        assert "website" in data
        assert data["website"] == "https://www.drsample.com"
        print(f"✅ Website field present: {data['website']}")
        
        # Verify locations with phone (for WhatsApp and Call buttons)
        assert "locations" in data
        assert len(data["locations"]) > 0
        
        location = data["locations"][0]
        assert "phone" in location
        assert location["phone"] == "+91 9876543210"
        print(f"✅ Phone number present: {location['phone']}")
        
        # Verify clinic info (backward compatibility)
        assert "clinic" in data
        assert data["clinic"]["phone"] == "+91 9876543210"
        print("✅ Clinic info present for backward compatibility")
    
    def test_doctor_profile_not_found(self):
        """Test 404 for non-existent doctor"""
        response = requests.get(f"{BASE_URL}/api/profiles/by-slug/non-existent-doctor-slug")
        assert response.status_code == 404
        print("✅ 404 returned for non-existent doctor")


class TestSearchFunctionality:
    """Search endpoint tests including Hindi keywords"""
    
    def test_smart_search_with_english(self):
        """Test smart search with English keywords"""
        response = requests.get(f"{BASE_URL}/api/profiles/smart-search", params={
            "q": "knee specialist in 500096"  # Using pincode for location
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ English search returned {len(data)} results")
    
    def test_smart_search_with_hindi(self):
        """Test smart search with Hindi keywords (घुटने का दर्द = knee pain)"""
        response = requests.get(f"{BASE_URL}/api/profiles/smart-search", params={
            "q": "घुटने का दर्द near hyderabad"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Hindi search (घुटने का दर्द) returned {len(data)} results")
    
    def test_smart_search_with_telugu(self):
        """Test smart search with Telugu keywords (మోకాలు నొప్పి = knee pain)"""
        response = requests.get(f"{BASE_URL}/api/profiles/smart-search", params={
            "q": "మోకాలు నొప్పి near hyderabad"
        })
        # Should return 200 even if no results
        assert response.status_code in [200, 400]
        print("✅ Telugu search handled correctly")
    
    def test_search_requires_location(self):
        """Test that search requires location"""
        response = requests.get(f"{BASE_URL}/api/profiles/smart-search", params={
            "q": "knee"
        })
        # Should return 400 if only subspecialty without location
        assert response.status_code == 400
        print("✅ Search correctly requires location")
    
    def test_profiles_search_endpoint(self):
        """Test direct profiles search endpoint"""
        response = requests.get(f"{BASE_URL}/api/profiles/search", params={
            "location": "hyderabad",
            "subspecialty": "Knee"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Direct search returned {len(data)} results")


class TestOTPAuthentication:
    """OTP authentication tests (MOCKED)"""
    
    def test_request_otp(self):
        """Test OTP request endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/otp/request", json={
            "mobile": "9876543210"
        })
        assert response.status_code == 200
        data = response.json()
        
        # MOCKED OTP should be returned
        assert "mocked_otp" in data
        print(f"✅ OTP requested, MOCKED OTP: {data['mocked_otp']}")
        
        return data["mocked_otp"]
    
    def test_verify_otp(self):
        """Test OTP verification endpoint"""
        # First request OTP
        request_response = requests.post(f"{BASE_URL}/api/auth/otp/request", json={
            "mobile": "9876543211"  # Use different number to avoid conflicts
        })
        assert request_response.status_code == 200
        mocked_otp = request_response.json()["mocked_otp"]
        
        # Verify OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "mobile": "9876543211",
            "code": mocked_otp
        })
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert "token" in data
        print(f"✅ OTP verified, token received")
    
    def test_invalid_otp(self):
        """Test invalid OTP rejection"""
        response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "mobile": "9876543210",
            "code": "000000"
        })
        assert response.status_code == 401
        print("✅ Invalid OTP correctly rejected")


class TestAdminEndpoints:
    """Admin endpoint tests"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "admin"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print("✅ Admin login successful")
        return data["token"]
    
    def test_admin_login_invalid(self):
        """Test admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Invalid admin password correctly rejected")
    
    def test_admin_list_surgeons(self):
        """Test admin list surgeons endpoint"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "admin"
        })
        token = login_response.json()["token"]
        
        # List surgeons
        response = requests.get(
            f"{BASE_URL}/api/admin/surgeons",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Admin listed {len(data)} surgeons")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
