"""
Iteration 65 — Admin enhancements tests.

Coverage:
1. Admin login
2. /api/admin/stats enhanced payload (leads_today/7d/30d, knowledge_graph block)
3. /api/admin/knowledge-graph/stats (auth required)
4. /api/admin/knowledge-graph/top (auth required)
5. /api/admin/knowledge-graph/rebuild reachability (auth check only; NOT executed)
6. /api/admin/leads — score_reasoning present on each lead
7. /api/admin/leads/{id} — score_reasoning present on GET and PUT
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://buyer-prospect-map.preview.emergentagent.com").rstrip("/")
ADMIN_PASSWORD = "AgileHealth2026admin"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --- Admin Stats ---

class TestAdminStats:
    def test_stats_endpoint_returns_new_kpi_fields(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()

        # New KPI fields
        for key in ("leads_today", "leads_7d", "leads_30d", "review_pending"):
            assert key in data, f"missing key: {key}"
            assert isinstance(data[key], int), f"{key} not int: {type(data[key])}"

        # Hierarchy: today <= 7d <= 30d (sanity)
        assert data["leads_today"] <= data["leads_7d"], "leads_today should be <= leads_7d"
        assert data["leads_7d"] <= data["leads_30d"], "leads_7d should be <= leads_30d"

    def test_stats_has_knowledge_graph_block(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()

        assert "knowledge_graph" in data
        kg = data["knowledge_graph"]
        assert isinstance(kg, dict)
        # Accept error block but prefer full stats
        if "error" in kg:
            pytest.fail(f"knowledge_graph block returned error: {kg['error']}")

        for key in ("total_relationships", "requires_edges", "bundle_edges",
                    "products_covered", "total_products", "coverage_pct"):
            assert key in kg, f"KG block missing {key}: got {list(kg.keys())}"

        assert kg["total_relationships"] >= 0
        assert kg["requires_edges"] + kg["bundle_edges"] == kg["total_relationships"]
        assert 0 <= kg["coverage_pct"] <= 100

    def test_stats_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/stats", timeout=30)
        assert r.status_code == 401


# --- Knowledge Graph endpoints ---

class TestKnowledgeGraph:
    def test_kg_stats_auth_required(self):
        r = requests.get(f"{BASE_URL}/api/admin/knowledge-graph/stats", timeout=30)
        assert r.status_code == 401

    def test_kg_stats_returns_object(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/knowledge-graph/stats", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ("total_relationships", "requires_edges", "bundle_edges",
                    "products_covered", "total_products", "coverage_pct"):
            assert key in data, f"missing {key}"

    def test_kg_top_auth_required(self):
        r = requests.get(f"{BASE_URL}/api/admin/knowledge-graph/top?limit=5", timeout=30)
        assert r.status_code == 401

    def test_kg_top_returns_products(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/knowledge-graph/top?limit=5",
                         headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "top" in data
        assert isinstance(data["top"], list)
        assert len(data["top"]) <= 5
        if data["top"]:
            item = data["top"][0]
            for key in ("slug", "product_name", "division", "brand", "recommendation_count"):
                assert key in item, f"top item missing {key}: {item}"
            assert isinstance(item["recommendation_count"], int)
            assert item["recommendation_count"] >= 1

    def test_kg_rebuild_auth_required(self):
        """Do NOT execute rebuild. Just verify endpoint exists and enforces auth (401 when unauthed)."""
        r = requests.post(f"{BASE_URL}/api/admin/knowledge-graph/rebuild", timeout=30)
        # Should be 401 unauthorized (not 404) — proving route is registered
        assert r.status_code == 401, f"rebuild endpoint not reachable / not guarded: {r.status_code}"


# --- Leads score_reasoning ---

class TestLeadsScoreReasoning:
    def test_list_leads_includes_score_reasoning(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/leads?limit=3", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "leads" in data
        leads = data["leads"]
        if not leads:
            pytest.skip("No leads in DB to validate score_reasoning")
        for lead in leads:
            assert "score_reasoning" in lead, f"lead missing score_reasoning: id={lead.get('id')}"
            assert isinstance(lead["score_reasoning"], list)
            assert len(lead["score_reasoning"]) >= 1
            item = lead["score_reasoning"][0]
            assert "points" in item and "label" in item
            assert isinstance(item["points"], int)
            assert isinstance(item["label"], str)

    def test_get_single_lead_includes_score_reasoning(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/leads?limit=1", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        leads = r.json().get("leads", [])
        if not leads:
            pytest.skip("No leads in DB")
        lead_id = leads[0]["id"]

        r2 = requests.get(f"{BASE_URL}/api/admin/leads/{lead_id}", headers=auth_headers, timeout=30)
        assert r2.status_code == 200, r2.text
        lead = r2.json()
        assert "score_reasoning" in lead
        assert isinstance(lead["score_reasoning"], list)
        assert len(lead["score_reasoning"]) >= 1

    def test_put_lead_response_includes_score_reasoning(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/leads?limit=1", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        leads = r.json().get("leads", [])
        if not leads:
            pytest.skip("No leads in DB")
        lead_id = leads[0]["id"]
        existing_status = leads[0].get("status", "new")

        # No-op update (same status) to keep DB clean
        r2 = requests.put(
            f"{BASE_URL}/api/admin/leads/{lead_id}",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"status": existing_status},
            timeout=30,
        )
        assert r2.status_code == 200, r2.text
        lead = r2.json()
        assert "score_reasoning" in lead
        assert isinstance(lead["score_reasoning"], list)
        assert len(lead["score_reasoning"]) >= 1
        item = lead["score_reasoning"][0]
        assert "points" in item and "label" in item
