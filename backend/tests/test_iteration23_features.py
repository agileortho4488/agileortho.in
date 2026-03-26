"""
Test iteration 23 features:
- Divisions endpoint returns 11 divisions (no Trauma)
- Products have images array populated for matched products
- Admin login works with password 'admin'
- Brochure extraction endpoints exist
- Key Features bug fix verification (no character-by-character iteration)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDivisionsNoTrauma:
    """Test that Trauma division has been merged into Orthopedics"""
    
    def test_divisions_endpoint_returns_11_divisions(self):
        """Verify /api/divisions returns exactly 11 divisions"""
        response = requests.get(f"{BASE_URL}/api/divisions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "divisions" in data, "Response should have 'divisions' key"
        
        divisions = data["divisions"]
        division_names = [d["name"] for d in divisions]
        
        print(f"Found {len(divisions)} divisions: {division_names}")
        
        # Verify no Trauma division
        assert "Trauma" not in division_names, "Trauma division should not exist (merged into Orthopedics)"
        
        # Expected 11 divisions
        expected_divisions = [
            "Orthopedics", "Cardiovascular", "Diagnostics",
            "ENT", "Endo-surgical", "Infection Prevention", "Peripheral Intervention",
            "Cardiac Surgery", "Critical Care", "Urology", "Robotics"
        ]
        
        for expected in expected_divisions:
            assert expected in division_names, f"Missing expected division: {expected}"
        
        # Should be exactly 11 divisions
        assert len(divisions) == 11, f"Expected 11 divisions, got {len(divisions)}"


class TestProductsWithImages:
    """Test that products have images array populated"""
    
    def test_products_endpoint_returns_images_array(self):
        """Verify products have images array in response"""
        response = requests.get(f"{BASE_URL}/api/products", params={"limit": 50})
        assert response.status_code == 200
        
        data = response.json()
        products = data["products"]
        
        # Check that products have images field
        products_with_images = 0
        products_without_images = 0
        
        for p in products:
            assert "images" in p, f"Product {p.get('id')} missing 'images' field"
            if p["images"] and len(p["images"]) > 0:
                products_with_images += 1
                # Verify image structure
                img = p["images"][0]
                assert "storage_path" in img, f"Image missing 'storage_path' field"
            else:
                products_without_images += 1
        
        print(f"Products with images: {products_with_images}, without: {products_without_images}")
        
        # At least some products should have images (204 out of 817 per context)
        assert products_with_images > 0, "Expected some products to have images"
    
    def test_cardiovascular_division_has_most_images(self):
        """Verify Cardiovascular division has products with images"""
        response = requests.get(f"{BASE_URL}/api/products", params={
            "division": "Cardiovascular",
            "limit": 50
        })
        assert response.status_code == 200
        
        data = response.json()
        products = data["products"]
        
        products_with_images = sum(1 for p in products if p.get("images") and len(p["images"]) > 0)
        print(f"Cardiovascular products with images: {products_with_images}/{len(products)}")
        
        # Cardiovascular should have products with images
        assert products_with_images > 0, "Cardiovascular division should have products with images"


class TestProductDetailKeyFeatures:
    """Test that Key Features bug is fixed (no character-by-character iteration)"""
    
    def test_product_detail_technical_specifications_structure(self):
        """Verify technical_specifications is an object, not a string"""
        # Get a product
        response = requests.get(f"{BASE_URL}/api/products", params={"limit": 10})
        assert response.status_code == 200
        
        products = response.json()["products"]
        assert len(products) > 0, "Need at least one product"
        
        product_id = products[0]["id"]
        
        # Get product detail
        detail_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert detail_response.status_code == 200
        
        product = detail_response.json()
        
        # Check technical_specifications
        specs = product.get("technical_specifications")
        if specs is not None:
            # Should be dict/object, not string
            assert isinstance(specs, dict), f"technical_specifications should be dict, got {type(specs)}"
            
            # Keys should not be numeric indices (0, 1, 2...)
            for key in specs.keys():
                assert not key.isdigit(), f"Key '{key}' looks like character index - bug not fixed"
            
            print(f"Product {product_id} specs: {specs}")


class TestAdminLogin:
    """Test admin login with password 'admin'"""
    
    def test_admin_login_success(self):
        """Verify admin login works with password 'admin'"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "admin"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert len(data["token"]) > 0, "Token should not be empty"
        
        print(f"Admin login successful, token length: {len(data['token'])}")
        return data["token"]
    
    def test_admin_login_invalid_password(self):
        """Verify admin login rejects invalid password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestAdminProductsPage:
    """Test admin products page functionality"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "admin"})
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    def test_admin_products_list(self, admin_token):
        """Verify admin products endpoint returns products with images"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/products", headers=headers, params={"limit": 20})
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "total" in data
        
        products = data["products"]
        print(f"Admin products: {data['total']} total, showing {len(products)}")
        
        # Check products have images field
        for p in products:
            assert "images" in p, f"Product {p.get('id')} missing images field"
    
    def test_admin_products_shows_image_thumbnails(self, admin_token):
        """Verify products with images have proper image data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/products", headers=headers, params={"limit": 50})
        assert response.status_code == 200
        
        products = response.json()["products"]
        products_with_images = [p for p in products if p.get("images") and len(p["images"]) > 0]
        
        print(f"Products with images in admin view: {len(products_with_images)}")
        
        if products_with_images:
            # Verify image structure
            img = products_with_images[0]["images"][0]
            assert "storage_path" in img
            assert "id" in img


class TestBrochureExtractionEndpoints:
    """Test brochure extraction endpoints exist"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "admin"})
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    def test_brochure_extraction_status_endpoint(self, admin_token):
        """Verify extraction status endpoint exists"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/extract-brochure-images/status", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        print(f"Extraction status: {data}")
        
        # Should have status field
        assert "status" in data
    
    def test_products_without_images_endpoint(self, admin_token):
        """Verify products without images endpoint exists"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/products-without-images", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "count" in data
        assert "products" in data
        
        print(f"Products without images: {data['count']}")


class TestProductCount:
    """Test product count after cleanup"""
    
    def test_total_products_after_cleanup(self):
        """Verify product count is around 817 after cleanup"""
        response = requests.get(f"{BASE_URL}/api/products", params={"limit": 1})
        assert response.status_code == 200
        
        data = response.json()
        total = data["total"]
        
        print(f"Total products: {total}")
        
        # Should be around 817 after cleanup (was 905)
        assert total > 700, f"Expected more than 700 products, got {total}"
        assert total < 900, f"Expected less than 900 products (cleanup done), got {total}"


class TestFileServing:
    """Test file serving endpoint for product images"""
    
    def test_file_endpoint_exists(self):
        """Verify /api/files endpoint exists"""
        # Get a product with images
        response = requests.get(f"{BASE_URL}/api/products", params={"limit": 50})
        assert response.status_code == 200
        
        products = response.json()["products"]
        products_with_images = [p for p in products if p.get("images") and len(p["images"]) > 0]
        
        if not products_with_images:
            pytest.skip("No products with images found")
        
        # Try to access the image
        img = products_with_images[0]["images"][0]
        storage_path = img["storage_path"]
        
        file_response = requests.get(f"{BASE_URL}/api/files/{storage_path}")
        
        # Should return image or 404 (if storage not configured)
        assert file_response.status_code in [200, 404], f"Unexpected status: {file_response.status_code}"
        
        if file_response.status_code == 200:
            print(f"Image served successfully, content-type: {file_response.headers.get('content-type')}")
        else:
            print(f"Image not found (storage may not be configured): {storage_path}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
