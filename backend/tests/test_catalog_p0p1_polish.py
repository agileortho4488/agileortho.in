"""
Test Catalog P0+P1 Polish Features - Iteration 31
Tests for:
- P0: image_type field, parent_brand field, title-cased spec keys, unified coating terminology
- P1: brochure source clickable, dedicated brochure download section
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCatalogProductListP0P1:
    """Test /api/catalog/products returns P0+P1 fields"""
    
    def test_products_list_returns_image_type(self):
        """P0: Each product should have image_type field (brochure_cover or product_photo)"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Trauma", "limit": 10})
        assert response.status_code == 200
        data = response.json()
        products = data.get("products", [])
        assert len(products) > 0, "Should return at least one product"
        
        for product in products:
            assert "image_type" in product, f"Product {product.get('slug')} missing image_type"
            assert product["image_type"] in ["brochure_cover", "product_photo", "none"], \
                f"Invalid image_type: {product['image_type']}"
    
    def test_products_list_returns_parent_brand(self):
        """P1: Each product should have parent_brand field"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Trauma", "limit": 10})
        assert response.status_code == 200
        data = response.json()
        products = data.get("products", [])
        
        for product in products:
            assert "parent_brand" in product, f"Product {product.get('slug')} missing parent_brand"
            # parent_brand can be empty string but should exist
            assert isinstance(product["parent_brand"], str)


class TestCatalogProductDetailP0:
    """Test /api/catalog/products/{slug} returns P0 fixes"""
    
    def test_volar_rim_plate_has_image_type(self):
        """P0: Product detail should have image_type field"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/2.4mm-lps-volar-rim-distal-radial-plate")
        assert response.status_code == 200
        data = response.json()
        
        assert "image_type" in data
        assert data["image_type"] == "brochure_cover"
    
    def test_volar_rim_plate_has_parent_brand(self):
        """P1: Product detail should have parent_brand field"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/2.4mm-lps-volar-rim-distal-radial-plate")
        assert response.status_code == 200
        data = response.json()
        
        assert "parent_brand" in data
        assert data["parent_brand"] == "Meril"
        assert data["brand"] == "AURIC"
    
    def test_volar_rim_plate_title_cased_specs(self):
        """P0: Spec keys should be title-cased (Thickness, Coating, Design)"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/2.4mm-lps-volar-rim-distal-radial-plate")
        assert response.status_code == 200
        data = response.json()
        
        specs = data.get("technical_specifications", {})
        assert len(specs) > 0, "Should have technical specifications"
        
        # Check all keys are title-cased
        for key in specs.keys():
            assert key[0].isupper(), f"Spec key '{key}' should be title-cased"
            # Should not have underscores
            assert "_" not in key, f"Spec key '{key}' should not have underscores"
    
    def test_volar_rim_plate_unified_coating_term(self):
        """P0: Coating should use unified term 'Bionik Gold Surface (TiNbN Coating)'"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/2.4mm-lps-volar-rim-distal-radial-plate")
        assert response.status_code == 200
        data = response.json()
        
        specs = data.get("technical_specifications", {})
        coating = specs.get("Coating", "")
        
        assert coating == "Bionik Gold Surface (TiNbN Coating)", \
            f"Expected unified coating term, got: {coating}"
    
    def test_ortho_device_chat_returns_404(self):
        """Test that 'ortho-device-chat' slug returns 404"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/ortho-device-chat")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


class TestCatalogManyVariantProducts:
    """Test products with many SKU variants"""
    
    def test_clavo_nail_59_skus(self):
        """Test clavo-intramedullary-nail with 59 SKUs renders correctly"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/clavo-intramedullary-nail")
        assert response.status_code == 200
        data = response.json()
        
        assert data["sku_count"] == 59, f"Expected 59 SKUs, got {data['sku_count']}"
        assert len(data.get("skus", [])) == 59
        assert "image_type" in data
        assert "parent_brand" in data
    
    def test_humerus_plates_83_skus(self):
        """Test 2.7mm-3.5mm-lps-medial-distal-humerus-plates with 83 SKUs"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/2.7mm-3.5mm-lps-medial-distal-humerus-plates")
        assert response.status_code == 200
        data = response.json()
        
        assert data["sku_count"] == 83, f"Expected 83 SKUs, got {data['sku_count']}"
        assert len(data.get("skus", [])) == 83
        
        # Check unified coating term
        specs = data.get("technical_specifications", {})
        if "Coating" in specs:
            assert specs["Coating"] == "Bionik Gold Surface (TiNbN Coating)"
    
    def test_armar_titanium_plates_16_skus(self):
        """Test armar-titanium-plates with 16 SKUs"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/armar-titanium-plates")
        assert response.status_code == 200
        data = response.json()
        
        assert data["sku_count"] == 16, f"Expected 16 SKUs, got {data['sku_count']}"
        assert data["brand"] == "Armar"
        assert data["parent_brand"] == "Meril"
    
    def test_anti_rotation_screw_5_skus(self):
        """Test anti-rotation-screw with 5 SKUs"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/anti-rotation-screw")
        assert response.status_code == 200
        data = response.json()
        
        assert data["sku_count"] == 5, f"Expected 5 SKUs, got {data['sku_count']}"
        assert "image_type" in data
        assert "parent_brand" in data


class TestCatalogRelatedProducts:
    """Test related products have P0+P1 fields"""
    
    def test_related_products_have_image_type(self):
        """Related products should have image_type field"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/2.4mm-lps-volar-rim-distal-radial-plate")
        assert response.status_code == 200
        data = response.json()
        
        related = data.get("related_products", [])
        if len(related) > 0:
            for rp in related:
                assert "image_type" in rp, f"Related product {rp.get('slug')} missing image_type"


class TestCatalogSKUSourceField:
    """Test SKU source field for brochure clickability"""
    
    def test_skus_have_source_field(self):
        """SKUs should have source field (shadow or catalog)"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/2.4mm-lps-volar-rim-distal-radial-plate")
        assert response.status_code == 200
        data = response.json()
        
        skus = data.get("skus", [])
        for sku in skus:
            # source field should exist
            assert "source" in sku or "source_file" in sku, \
                f"SKU {sku.get('sku_code')} should have source or source_file field"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
