"""Tests for WhatsApp Conversational Funnel — iteration 66."""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://buyer-prospect-map.preview.emergentagent.com").rstrip("/")
ADMIN_PASSWORD = "AgileHealth2026admin"


@pytest.fixture(scope="module")
def admin_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    token = r.json().get("token") or r.json().get("access_token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


def _phone(suffix: str) -> str:
    # unique per test run to avoid state collisions
    return f"9{int(time.time()) % 100000000}{suffix}"[:12]


def _simulate(client, phone, msg):
    r = client.post(f"{BASE_URL}/api/admin/whatsapp/funnel-simulate",
                    json={"phone": phone, "message": msg}, timeout=20)
    assert r.status_code == 200, f"{r.status_code}: {r.text}"
    return r.json()


def _reset(client, phone):
    r = client.post(f"{BASE_URL}/api/admin/whatsapp/funnel-reset",
                    json={"phone": phone}, timeout=10)
    assert r.status_code == 200
    return r.json()


# --- Welcome menu / division picker ---
def test_welcome_menu_shows_13_divisions(admin_client):
    p = _phone("01")
    _reset(admin_client, p)
    data = _simulate(admin_client, p, "hi")
    assert data["handled"] is True
    assert data["state"]["node"] == "division_picker"
    reply = data["replies"][0]
    assert "Agile Ortho" in reply
    # 13 numbered divisions
    for i in range(1, 14):
        assert f"{i}." in reply
    assert "Trauma" in reply and "Instruments" in reply


# --- Division picker → product picker ---
def test_pick_division_1_trauma_shows_products(admin_client):
    p = _phone("02")
    _reset(admin_client, p)
    _simulate(admin_client, p, "hi")
    data = _simulate(admin_client, p, "1")
    assert data["handled"] is True
    assert data["state"]["node"] == "product_picker"
    assert data["state"].get("division") == "Trauma"
    reply = data["replies"][0]
    # Either real products w/ A./B./C. or empty fallback
    assert ("Trauma" in reply)


# --- Product picker → product detail ---
def test_pick_product_a_shows_detail_and_ctas(admin_client):
    p = _phone("03")
    _reset(admin_client, p)
    _simulate(admin_client, p, "hi")
    div_resp = _simulate(admin_client, p, "1")
    if not div_resp["state"].get("products"):
        pytest.skip("No live trauma products available")
    data = _simulate(admin_client, p, "A")
    assert data["handled"] is True
    assert data["state"]["node"] == "product_detail"
    reply = data["replies"][0]
    assert "1. Request bulk quote" in reply
    assert "2. Get brochure" in reply
    assert "3. Talk to our ortho specialist" in reply


# --- Quote request creates Hot lead ---
def test_quote_request_creates_hot_lead(admin_client):
    p = _phone("04")
    _reset(admin_client, p)
    _simulate(admin_client, p, "hi")
    div_resp = _simulate(admin_client, p, "1")
    if not div_resp["state"].get("products"):
        pytest.skip("No live trauma products available")
    _simulate(admin_client, p, "A")
    data = _simulate(admin_client, p, "1")
    assert data["handled"] is True
    assert data["state"]["node"] == "quote_requested"
    assert "logged your quote request" in data["replies"][0].lower() or "quote" in data["replies"][0].lower()

    # Verify lead in CRM
    r = admin_client.get(f"{BASE_URL}/api/admin/leads", timeout=15)
    assert r.status_code == 200
    leads = r.json() if isinstance(r.json(), list) else r.json().get("leads", [])
    match = next((l for l in leads if l.get("phone_whatsapp") == p), None)
    assert match is not None, f"Lead not found for {p}"
    assert match.get("score") == "Hot"
    assert match.get("source") == "whatsapp_funnel"
    assert match.get("inquiry_type") == "Bulk Quote"


# --- Brochure path ---
def test_brochure_reply_contains_agileortho_url(admin_client):
    p = _phone("05")
    _reset(admin_client, p)
    _simulate(admin_client, p, "hi")
    div_resp = _simulate(admin_client, p, "1")
    if not div_resp["state"].get("products"):
        pytest.skip("No live trauma products available")
    _simulate(admin_client, p, "A")
    data = _simulate(admin_client, p, "2")
    assert data["handled"] is True
    assert "agileortho.in" in data["replies"][0]


# --- Keyword shortcut ---
def test_keyword_trauma_plate_jumps_to_trauma_products(admin_client):
    p = _phone("06")
    _reset(admin_client, p)
    data = _simulate(admin_client, p, "i need a trauma plate")
    assert data["handled"] is True
    assert data["state"]["node"] == "product_picker"
    assert data["state"].get("division") == "Trauma"


# --- Reset endpoint ---
def test_funnel_reset_clears_state(admin_client):
    p = _phone("07")
    _simulate(admin_client, p, "hi")
    r = admin_client.post(f"{BASE_URL}/api/admin/whatsapp/funnel-reset",
                          json={"phone": p}, timeout=10)
    assert r.status_code == 200
    j = r.json()
    assert j.get("reset") is True
    # Next message should show welcome again (root -> division_picker)
    data = _simulate(admin_client, p, "hello")
    assert data["state"]["node"] == "division_picker"


# --- Analytics ---
def test_funnel_analytics_shape(admin_client):
    r = admin_client.get(f"{BASE_URL}/api/admin/whatsapp/funnel-analytics", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "stages" in data and isinstance(data["stages"], list) and len(data["stages"]) >= 4
    assert "distinct_phones" in data
    for k in ("started", "division_picked", "product_picked", "quote_requested"):
        assert k in data["distinct_phones"]
    assert "per_division" in data and isinstance(data["per_division"], list)
    assert "recent" in data and isinstance(data["recent"], list)


# --- Fallback: unrecognised input at division_picker returns handled=False ---
def test_unrecognised_input_returns_handled_false(admin_client):
    p = _phone("08")
    _reset(admin_client, p)
    _simulate(admin_client, p, "hi")  # now at division_picker
    data = _simulate(admin_client, p, "random gibberish xyz")
    assert data["handled"] is False
    assert data["replies"] == []


# --- Auth guard ---
def test_funnel_endpoints_require_admin():
    r = requests.post(f"{BASE_URL}/api/admin/whatsapp/funnel-simulate",
                      json={"phone": "9999", "message": "hi"}, timeout=10)
    assert r.status_code in (401, 403)
    r2 = requests.get(f"{BASE_URL}/api/admin/whatsapp/funnel-analytics", timeout=10)
    assert r2.status_code in (401, 403)
