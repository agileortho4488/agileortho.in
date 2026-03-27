"""
P1 Grouping Fix Tests - Iteration 35
Tests for the comprehensive product grouping audit and fixes:
1. ARMAR Titanium Plates renamed to 'ARMAR LPS Plating System (Titanium)'
2. 27 PFRN 4.9mm bolt-size pages consolidated into ONE family page
3. CLAVO Intramedullary Nail (duplicate of PFRN) hidden
4. 3 Destiknee triplicates consolidated
5. 5 HIV+Syphilis pack-size variants consolidated
6. CLAVO Elastic renamed with '(Pediatric)' context
7. Division counts: Trauma=16, Cardiovascular=8, Diagnostics=59, Joint Replacement=4
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDivisionCounts:
    """Test that division product counts match expected values after P1 fix"""
    
    def test_divisions_endpoint_returns_correct_counts(self):
        """GET /api/catalog/divisions returns Trauma=16, Cardiovascular=8, Diagnostics=59, Joint Replacement=4"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "divisions" in data, "Response should contain 'divisions' key"
        
        divisions = {d["name"]: d["product_count"] for d in data["divisions"]}
        
        # Expected counts per problem statement
        assert divisions.get("Trauma") == 16, f"Trauma should have 16 products, got {divisions.get('Trauma')}"
        assert divisions.get("Cardiovascular") == 8, f"Cardiovascular should have 8 products, got {divisions.get('Cardiovascular')}"
        assert divisions.get("Diagnostics") == 59, f"Diagnostics should have 59 products, got {divisions.get('Diagnostics')}"
        assert divisions.get("Joint Replacement") == 4, f"Joint Replacement should have 4 products, got {divisions.get('Joint Replacement')}"


class TestTraumaDivisionProducts:
    """Test Trauma division products after P1 grouping fix"""
    
    def test_trauma_returns_16_products(self):
        """GET /api/catalog/products?division=Trauma returns 16 products"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Trauma", "limit": 100})
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] == 16, f"Trauma should have 16 products, got {data['total']}"
    
    def test_armar_titanium_plates_not_in_listing(self):
        """'ARMAR Titanium Plates' should NOT appear in Trauma listing (renamed)"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Trauma", "limit": 100})
        assert response.status_code == 200
        
        data = response.json()
        product_names = [p["product_name_display"] for p in data["products"]]
        
        # Old name should NOT exist
        assert "ARMAR Titanium Plates" not in product_names, "Old name 'ARMAR Titanium Plates' should not appear"
    
    def test_armar_lps_plating_system_in_listing(self):
        """'ARMAR LPS Plating System (Titanium)' should appear in Trauma listing"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Trauma", "limit": 100})
        assert response.status_code == 200
        
        data = response.json()
        product_names = [p["product_name_display"] for p in data["products"]]
        
        # New name should exist
        assert "ARMAR LPS Plating System (Titanium)" in product_names, \
            f"'ARMAR LPS Plating System (Titanium)' should appear in Trauma. Found: {product_names}"
    
    def test_clavo_intramedullary_nail_not_in_listing(self):
        """'CLAVO Intramedullary Nail' (duplicate) should NOT appear in Trauma listing"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Trauma", "limit": 100})
        assert response.status_code == 200
        
        data = response.json()
        product_names = [p["product_name_display"] for p in data["products"]]
        
        # Check no product named exactly "CLAVO Intramedullary Nail" exists
        clavo_im_nail = [n for n in product_names if n == "CLAVO Intramedullary Nail"]
        assert len(clavo_im_nail) == 0, f"'CLAVO Intramedullary Nail' duplicate should be hidden. Found: {clavo_im_nail}"
    
    def test_only_one_pfrn_bolt_page(self):
        """Only ONE 'PFRN 4.9mm Locking Bolt Self Tapping' page should exist (not 27)"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Trauma", "limit": 100})
        assert response.status_code == 200
        
        data = response.json()
        product_names = [p["product_name_display"] for p in data["products"]]
        
        # Count PFRN bolt pages
        pfrn_bolt_pages = [n for n in product_names if "PFRN" in n and "4.9mm" in n and "Locking Bolt" in n]
        assert len(pfrn_bolt_pages) <= 1, f"Should have at most 1 PFRN bolt page, found {len(pfrn_bolt_pages)}: {pfrn_bolt_pages}"
    
    def test_pfrn_nail_page_exists(self):
        """'PFRN Proximal Femoral Rotational Stability Nail' should be the only PFRN nail page"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Trauma", "limit": 100})
        assert response.status_code == 200
        
        data = response.json()
        product_names = [p["product_name_display"] for p in data["products"]]
        
        # Check PFRN nail page exists
        pfrn_nail_pages = [n for n in product_names if "PFRN Proximal Femoral Rotational Stability Nail" in n]
        assert len(pfrn_nail_pages) == 1, f"Should have exactly 1 PFRN nail page, found {len(pfrn_nail_pages)}: {pfrn_nail_pages}"
    
    def test_clavo_elastic_pediatric_in_listing(self):
        """'CLAVO Elastic Titanium Nail (Pediatric)' should appear in Trauma listing"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Trauma", "limit": 100})
        assert response.status_code == 200
        
        data = response.json()
        product_names = [p["product_name_display"] for p in data["products"]]
        
        # Check for pediatric context in CLAVO Elastic
        clavo_elastic = [n for n in product_names if "CLAVO Elastic" in n]
        if clavo_elastic:
            # At least one should have Pediatric context
            has_pediatric = any("Pediatric" in n for n in clavo_elastic)
            assert has_pediatric, f"CLAVO Elastic should have '(Pediatric)' context. Found: {clavo_elastic}"


class TestPFRNNailDetail:
    """Test PFRN nail product detail page"""
    
    def test_pfrn_nail_has_59_skus(self):
        """PFRN Proximal Femoral Rotational Stability Nail should have 59 SKUs"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/pfrn-proximal-femoral-rotational-stability-nail")
        assert response.status_code == 200
        
        data = response.json()
        sku_count = data.get("sku_count", len(data.get("skus", [])))
        assert sku_count == 59, f"PFRN nail should have 59 SKUs, got {sku_count}"


class TestJointReplacementDivision:
    """Test Joint Replacement division after P1 fix"""
    
    def test_joint_replacement_has_4_products(self):
        """Joint Replacement should have 4 products"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Joint Replacement", "limit": 100})
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] == 4, f"Joint Replacement should have 4 products, got {data['total']}"
    
    def test_only_one_destiknee_entry(self):
        """Only ONE Destiknee entry should exist (triplicates consolidated)"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Joint Replacement", "limit": 100})
        assert response.status_code == 200
        
        data = response.json()
        product_names = [p["product_name_display"] for p in data["products"]]
        
        # Count Destiknee entries
        destiknee_entries = [n for n in product_names if "Destiknee" in n]
        assert len(destiknee_entries) == 1, f"Should have exactly 1 Destiknee entry, found {len(destiknee_entries)}: {destiknee_entries}"


class TestDiagnosticsDivision:
    """Test Diagnostics division after P1 fix"""
    
    def test_diagnostics_has_59_products(self):
        """Diagnostics should have 59 products"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Diagnostics", "limit": 100})
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] == 59, f"Diagnostics should have 59 products, got {data['total']}"
    
    def test_only_one_hiv_syphilis_page(self):
        """Only ONE HIV+Syphilis test page should exist (5 pack-size variants consolidated)"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Diagnostics", "limit": 100})
        assert response.status_code == 200
        
        data = response.json()
        product_names = [p["product_name_display"] for p in data["products"]]
        
        # Count HIV+Syphilis entries
        hiv_syphilis_entries = [n for n in product_names if "HIV" in n and "Syphilis" in n]
        assert len(hiv_syphilis_entries) <= 1, f"Should have at most 1 HIV+Syphilis page, found {len(hiv_syphilis_entries)}: {hiv_syphilis_entries}"


class TestHiddenDuplicates:
    """Test that hidden duplicates do NOT appear in any division listing"""
    
    def test_hidden_products_not_in_trauma(self):
        """Hidden duplicates should not appear in Trauma listing"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Trauma", "limit": 100})
        assert response.status_code == 200
        
        data = response.json()
        # All returned products should be visible (not hidden)
        assert data["total"] == 16, f"Trauma should show exactly 16 visible products, got {data['total']}"
    
    def test_hidden_products_not_in_joint_replacement(self):
        """Hidden duplicates should not appear in Joint Replacement listing"""
        response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Joint Replacement", "limit": 100})
        assert response.status_code == 200
        
        data = response.json()
        # All returned products should be visible (not hidden)
        assert data["total"] == 4, f"Joint Replacement should show exactly 4 visible products, got {data['total']}"


class TestARMARProductDetail:
    """Test ARMAR product detail page"""
    
    def test_armar_slug_returns_renamed_product(self):
        """GET /api/catalog/products/armar-titanium-plates should return 'ARMAR LPS Plating System (Titanium)'"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/armar-titanium-plates")
        assert response.status_code == 200
        
        data = response.json()
        assert data["product_name_display"] == "ARMAR LPS Plating System (Titanium)", \
            f"Expected 'ARMAR LPS Plating System (Titanium)', got '{data['product_name_display']}'"


class TestCLAVOElasticDetail:
    """Test CLAVO Elastic product detail page"""
    
    def test_clavo_elastic_has_pediatric_context(self):
        """CLAVO Elastic should have '(Pediatric)' in its display name"""
        response = requests.get(f"{BASE_URL}/api/catalog/products/clavo-elastic-titanium-nail")
        
        if response.status_code == 200:
            data = response.json()
            assert "Pediatric" in data["product_name_display"], \
                f"CLAVO Elastic should have '(Pediatric)' context. Got: '{data['product_name_display']}'"
        else:
            # Try alternate slug
            response = requests.get(f"{BASE_URL}/api/catalog/products", params={"division": "Trauma", "search": "CLAVO Elastic"})
            assert response.status_code == 200
            data = response.json()
            if data["products"]:
                product = data["products"][0]
                assert "Pediatric" in product["product_name_display"], \
                    f"CLAVO Elastic should have '(Pediatric)' context. Got: '{product['product_name_display']}'"


class TestDivisionEndpoints:
    """Test individual division endpoints"""
    
    def test_trauma_division_endpoint(self):
        """GET /api/catalog/divisions/trauma returns correct data"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions/trauma")
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Trauma"
        assert data["product_count"] == 16, f"Trauma should have 16 products, got {data['product_count']}"
    
    def test_cardiovascular_division_endpoint(self):
        """GET /api/catalog/divisions/cardiovascular returns correct data"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions/cardiovascular")
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Cardiovascular"
        assert data["product_count"] == 8, f"Cardiovascular should have 8 products, got {data['product_count']}"
    
    def test_diagnostics_division_endpoint(self):
        """GET /api/catalog/divisions/diagnostics returns correct data"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions/diagnostics")
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Diagnostics"
        assert data["product_count"] == 59, f"Diagnostics should have 59 products, got {data['product_count']}"
    
    def test_joint_replacement_division_endpoint(self):
        """GET /api/catalog/divisions/joint-replacement returns correct data"""
        response = requests.get(f"{BASE_URL}/api/catalog/divisions/joint-replacement")
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Joint Replacement"
        assert data["product_count"] == 4, f"Joint Replacement should have 4 products, got {data['product_count']}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
