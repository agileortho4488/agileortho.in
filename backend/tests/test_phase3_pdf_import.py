"""
MedDevice Pro API Tests - Phase 3 (Iteration 15)
Tests for Claude AI PDF Catalog Importer
Covers: PDF Upload, Import List, Import Detail, Product Approve/Edit/Delete
Note: Claude AI integration is REAL (not mocked) using Emergent LLM key
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefix for cleanup
TEST_PREFIX = "TEST_PHASE3_"


class TestPDFImportEndpoints:
    """PDF Import endpoint tests - Claude AI extraction"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_imports_requires_auth(self):
        """GET /api/admin/imports without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/imports")
        assert response.status_code == 401
        print("✓ List imports requires authentication")
    
    def test_list_imports_returns_imports(self):
        """GET /api/admin/imports returns list of imports"""
        response = requests.get(f"{BASE_URL}/api/admin/imports", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "imports" in data
        assert isinstance(data["imports"], list)
        
        # Should have at least the 2 existing imports mentioned in context
        print(f"✓ List imports: {len(data['imports'])} imports found")
        
        # Verify import structure
        if data["imports"]:
            imp = data["imports"][0]
            required_fields = ["id", "filename", "status", "upload_date"]
            for field in required_fields:
                assert field in imp, f"Import missing field: {field}"
            print(f"  First import: {imp['filename']} - {imp['status']}")
    
    def test_get_import_detail_requires_auth(self):
        """GET /api/admin/imports/:id without token returns 401"""
        # First get an import ID
        list_response = requests.get(f"{BASE_URL}/api/admin/imports", headers=self.headers)
        imports = list_response.json()["imports"]
        if imports:
            import_id = imports[0]["id"]
            response = requests.get(f"{BASE_URL}/api/admin/imports/{import_id}")
            assert response.status_code == 401
            print("✓ Get import detail requires authentication")
        else:
            pytest.skip("No imports available to test")
    
    def test_get_import_detail_returns_full_data(self):
        """GET /api/admin/imports/:id returns full import detail with extracted products"""
        # Get list of imports
        list_response = requests.get(f"{BASE_URL}/api/admin/imports", headers=self.headers)
        imports = list_response.json()["imports"]
        
        if not imports:
            pytest.skip("No imports available to test")
        
        # Find a completed import
        completed_import = None
        for imp in imports:
            if imp["status"] == "completed":
                completed_import = imp
                break
        
        if not completed_import:
            pytest.skip("No completed imports available")
        
        # Get detail
        response = requests.get(f"{BASE_URL}/api/admin/imports/{completed_import['id']}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all fields
        required_fields = ["id", "filename", "status", "upload_date", "extracted_products", "total_count", "approved_count"]
        for field in required_fields:
            assert field in data, f"Import detail missing field: {field}"
        
        assert isinstance(data["extracted_products"], list)
        print(f"✓ Import detail: {data['filename']} - {data['total_count']} products, {data['approved_count']} approved")
        
        # Verify extracted product structure
        if data["extracted_products"]:
            product = data["extracted_products"][0]
            product_fields = ["product_name", "_temp_id", "approved"]
            for field in product_fields:
                assert field in product, f"Extracted product missing field: {field}"
            print(f"  First product: {product['product_name']}")
    
    def test_get_import_invalid_id(self):
        """GET /api/admin/imports/:id with invalid ID returns 400"""
        response = requests.get(f"{BASE_URL}/api/admin/imports/invalid-id", headers=self.headers)
        assert response.status_code == 400
        print("✓ Invalid import ID returns 400")
    
    def test_get_import_not_found(self):
        """GET /api/admin/imports/:id with non-existent ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/admin/imports/000000000000000000000000", headers=self.headers)
        assert response.status_code == 404
        print("✓ Non-existent import returns 404")


class TestPDFUpload:
    """PDF Upload endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_upload_pdf_requires_auth(self):
        """POST /api/admin/import/pdf without token returns 401"""
        # Create a minimal PDF-like file
        files = {"file": ("test.pdf", b"%PDF-1.4 test content", "application/pdf")}
        response = requests.post(f"{BASE_URL}/api/admin/import/pdf", files=files)
        assert response.status_code == 401
        print("✓ PDF upload requires authentication")
    
    def test_upload_non_pdf_rejected(self):
        """POST /api/admin/import/pdf rejects non-PDF files"""
        files = {"file": ("test.txt", b"This is not a PDF", "text/plain")}
        response = requests.post(
            f"{BASE_URL}/api/admin/import/pdf",
            headers={"Authorization": f"Bearer {self.token}"},
            files=files
        )
        assert response.status_code == 400
        print("✓ Non-PDF files rejected with 400")


class TestImportApproval:
    """Import approval endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_approve_requires_auth(self):
        """POST /api/admin/imports/:id/approve without token returns 401"""
        # Get an import ID
        list_response = requests.get(f"{BASE_URL}/api/admin/imports", headers=self.headers)
        imports = list_response.json()["imports"]
        if imports:
            import_id = imports[0]["id"]
            response = requests.post(f"{BASE_URL}/api/admin/imports/{import_id}/approve")
            assert response.status_code == 401
            print("✓ Approve requires authentication")
        else:
            pytest.skip("No imports available")
    
    def test_approve_single_product(self):
        """POST /api/admin/imports/:id/approve with approve_ids approves specific products"""
        # Get list of imports
        list_response = requests.get(f"{BASE_URL}/api/admin/imports", headers=self.headers)
        imports = list_response.json()["imports"]
        
        # Find an import with unapproved products
        target_import = None
        for imp in imports:
            if imp["status"] == "completed":
                detail_response = requests.get(f"{BASE_URL}/api/admin/imports/{imp['id']}", headers=self.headers)
                detail = detail_response.json()
                unapproved = [p for p in detail.get("extracted_products", []) if not p.get("approved")]
                if unapproved:
                    target_import = detail
                    break
        
        if not target_import:
            pytest.skip("No imports with unapproved products available")
        
        # Get first unapproved product
        unapproved_products = [p for p in target_import["extracted_products"] if not p.get("approved")]
        temp_id = unapproved_products[0]["_temp_id"]
        product_name = unapproved_products[0]["product_name"]
        
        # Approve single product
        response = requests.post(
            f"{BASE_URL}/api/admin/imports/{target_import['id']}/approve",
            headers={**self.headers, "Content-Type": "application/json"},
            json={"approve_ids": [temp_id]}
        )
        assert response.status_code == 200
        data = response.json()
        assert "added" in data
        assert data["added"] == 1
        
        print(f"✓ Single product approved: {product_name}")
        
        # Verify product is now in catalog
        products_response = requests.get(
            f"{BASE_URL}/api/products",
            params={"search": product_name[:20]}
        )
        products = products_response.json()["products"]
        found = any(p["product_name"] == product_name for p in products)
        assert found, f"Approved product '{product_name}' should be in catalog"
        print(f"  Product found in catalog: {product_name}")
    
    def test_approve_invalid_import_id(self):
        """POST /api/admin/imports/:id/approve with invalid ID returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/admin/imports/invalid-id/approve",
            headers={**self.headers, "Content-Type": "application/json"},
            json={}
        )
        assert response.status_code == 400
        print("✓ Approve with invalid import ID returns 400")
    
    def test_approve_not_found(self):
        """POST /api/admin/imports/:id/approve with non-existent ID returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/admin/imports/000000000000000000000000/approve",
            headers={**self.headers, "Content-Type": "application/json"},
            json={}
        )
        assert response.status_code == 404
        print("✓ Approve with non-existent import ID returns 404")


class TestImportProductEdit:
    """Import product edit endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_edit_product_requires_auth(self):
        """PUT /api/admin/imports/:id/product/:temp_id without token returns 401"""
        response = requests.put(
            f"{BASE_URL}/api/admin/imports/000000000000000000000000/product/test123",
            json={"product_name": "Test"}
        )
        assert response.status_code == 401
        print("✓ Edit product requires authentication")
    
    def test_edit_product_updates_fields(self):
        """PUT /api/admin/imports/:id/product/:temp_id updates product fields"""
        # Get list of imports
        list_response = requests.get(f"{BASE_URL}/api/admin/imports", headers=self.headers)
        imports = list_response.json()["imports"]
        
        # Find an import with unapproved products
        target_import = None
        for imp in imports:
            if imp["status"] == "completed":
                detail_response = requests.get(f"{BASE_URL}/api/admin/imports/{imp['id']}", headers=self.headers)
                detail = detail_response.json()
                unapproved = [p for p in detail.get("extracted_products", []) if not p.get("approved")]
                if unapproved:
                    target_import = detail
                    break
        
        if not target_import:
            pytest.skip("No imports with unapproved products available")
        
        # Get first unapproved product
        unapproved_products = [p for p in target_import["extracted_products"] if not p.get("approved")]
        temp_id = unapproved_products[0]["_temp_id"]
        original_name = unapproved_products[0]["product_name"]
        
        # Edit product
        new_name = f"{TEST_PREFIX}Edited Product"
        response = requests.put(
            f"{BASE_URL}/api/admin/imports/{target_import['id']}/product/{temp_id}",
            headers={**self.headers, "Content-Type": "application/json"},
            json={
                "product_name": new_name,
                "division": "Orthopedics",
                "category": "Test Category",
                "material": "Titanium"
            }
        )
        assert response.status_code == 200
        
        # Verify update
        detail_response = requests.get(f"{BASE_URL}/api/admin/imports/{target_import['id']}", headers=self.headers)
        detail = detail_response.json()
        updated_product = next((p for p in detail["extracted_products"] if p["_temp_id"] == temp_id), None)
        
        assert updated_product is not None
        assert updated_product["product_name"] == new_name
        assert updated_product["division"] == "Orthopedics"
        assert updated_product["material"] == "Titanium"
        
        print(f"✓ Product edited: {original_name} -> {new_name}")
        
        # Revert the change
        requests.put(
            f"{BASE_URL}/api/admin/imports/{target_import['id']}/product/{temp_id}",
            headers={**self.headers, "Content-Type": "application/json"},
            json={"product_name": original_name}
        )
    
    def test_edit_product_not_found(self):
        """PUT /api/admin/imports/:id/product/:temp_id with non-existent temp_id returns 404"""
        # Get an import
        list_response = requests.get(f"{BASE_URL}/api/admin/imports", headers=self.headers)
        imports = list_response.json()["imports"]
        
        if not imports:
            pytest.skip("No imports available")
        
        import_id = imports[0]["id"]
        response = requests.put(
            f"{BASE_URL}/api/admin/imports/{import_id}/product/nonexistent123",
            headers={**self.headers, "Content-Type": "application/json"},
            json={"product_name": "Test"}
        )
        assert response.status_code == 404
        print("✓ Edit non-existent product returns 404")


class TestImportProductDelete:
    """Import product delete endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_delete_product_requires_auth(self):
        """DELETE /api/admin/imports/:id/product/:temp_id without token returns 401"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/imports/000000000000000000000000/product/test123"
        )
        assert response.status_code == 401
        print("✓ Delete product requires authentication")
    
    def test_delete_product_not_found(self):
        """DELETE /api/admin/imports/:id/product/:temp_id with non-existent temp_id succeeds (idempotent)"""
        # Get an import
        list_response = requests.get(f"{BASE_URL}/api/admin/imports", headers=self.headers)
        imports = list_response.json()["imports"]
        
        if not imports:
            pytest.skip("No imports available")
        
        import_id = imports[0]["id"]
        response = requests.delete(
            f"{BASE_URL}/api/admin/imports/{import_id}/product/nonexistent123",
            headers=self.headers
        )
        # Delete is idempotent - should succeed even if product doesn't exist
        assert response.status_code == 200
        print("✓ Delete non-existent product is idempotent (returns 200)")


class TestAdminSidebarNavigation:
    """Test that admin sidebar has 6 nav items including PDF Import"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_all_admin_endpoints_accessible(self):
        """Verify all admin endpoints are accessible"""
        endpoints = [
            "/api/admin/stats",      # Dashboard
            "/api/admin/pipeline",   # Pipeline
            "/api/admin/leads",      # Leads
            "/api/admin/analytics",  # Analytics
            "/api/admin/products",   # Products
            "/api/admin/imports",    # PDF Import (Phase 3)
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=self.headers)
            assert response.status_code == 200, f"Endpoint {endpoint} failed with {response.status_code}"
            print(f"✓ {endpoint} accessible")
        
        print(f"✓ All 6 admin endpoints accessible")


class TestPreviousPhasesStillWork:
    """Verify Phase 1+2 features still work"""
    
    def test_health_endpoint(self):
        """GET /api/health still works"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        print("✓ Health endpoint works")
    
    def test_divisions_endpoint(self):
        """GET /api/divisions still returns 8 divisions"""
        response = requests.get(f"{BASE_URL}/api/divisions")
        assert response.status_code == 200
        divisions = response.json()["divisions"]
        assert len(divisions) == 8
        print(f"✓ Divisions endpoint works: {len(divisions)} divisions")
    
    def test_products_endpoint(self):
        """GET /api/products still works with pagination"""
        response = requests.get(f"{BASE_URL}/api/products", params={"limit": 10})
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert "total" in data
        print(f"✓ Products endpoint works: {data['total']} total products")
    
    def test_lead_creation(self):
        """POST /api/leads still creates leads with scoring"""
        lead_data = {
            "name": f"{TEST_PREFIX}Phase Check Lead",
            "phone_whatsapp": "+919876543999",
            "inquiry_type": "Bulk Quote",
            "hospital_clinic": "Test Hospital"
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert response.status_code == 200
        lead = response.json()["lead"]
        assert lead["score"] in ["Hot", "Warm", "Cold"]
        print(f"✓ Lead creation works: score={lead['score']}")
        
        # Cleanup
        auth_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin"
        })
        token = auth_response.json()["token"]
        requests.delete(
            f"{BASE_URL}/api/admin/leads/{lead['id']}",
            headers={"Authorization": f"Bearer {token}"}
        )


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_data(self):
        """Remove test leads and products created during testing"""
        # Get auth token
        auth_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin"
        })
        token = auth_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Cleanup test leads
        leads_response = requests.get(f"{BASE_URL}/api/admin/leads", 
                                      headers=headers, 
                                      params={"limit": 100})
        leads = leads_response.json()["leads"]
        
        deleted_leads = 0
        for lead in leads:
            if lead["name"].startswith(TEST_PREFIX):
                requests.delete(f"{BASE_URL}/api/admin/leads/{lead['id']}", headers=headers)
                deleted_leads += 1
        
        # Cleanup test products
        products_response = requests.get(f"{BASE_URL}/api/admin/products", 
                                         headers=headers, 
                                         params={"limit": 100})
        products = products_response.json()["products"]
        
        deleted_products = 0
        for product in products:
            if product["product_name"].startswith(TEST_PREFIX):
                requests.delete(f"{BASE_URL}/api/admin/products/{product['id']}", headers=headers)
                deleted_products += 1
        
        print(f"✓ Cleaned up {deleted_leads} test leads and {deleted_products} test products")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
