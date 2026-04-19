"""Iteration 67: WhatsApp Interactive Funnel tests (admin-guarded)."""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend/.env read
    try:
        with open("/app/frontend/.env") as f:
            for ln in f:
                if ln.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = ln.split("=", 1)[1].strip().strip('"').rstrip("/")
    except Exception:
        pass

ADMIN_PASSWORD = "AgileHealth2026admin"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    token = r.json().get("token") or r.json().get("access_token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def phone():
    return "9" + str(int(time.time()))[-9:]


def _reset(client, ph):
    client.post(f"{BASE_URL}/api/admin/whatsapp/funnel-reset", json={"phone": ph}, timeout=15)


# --- /funnel-config ---

def test_get_funnel_config(client):
    r = client.get(f"{BASE_URL}/api/admin/whatsapp/funnel-config", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["mode"] in ("text", "interactive")
    assert d["allowed_modes"] == ["text", "interactive"]
    assert "business_number" in d
    assert "interakt_configured" in d


def test_set_funnel_config_invalid(client):
    r = client.post(f"{BASE_URL}/api/admin/whatsapp/funnel-config", json={"mode": "bogus"}, timeout=15)
    assert r.status_code == 400


def test_set_funnel_config_interactive_then_text(client):
    r = client.post(f"{BASE_URL}/api/admin/whatsapp/funnel-config", json={"mode": "interactive"}, timeout=15)
    assert r.status_code == 200
    assert r.json()["mode"] == "interactive"
    # Verify GET reflects it
    r2 = client.get(f"{BASE_URL}/api/admin/whatsapp/funnel-config", timeout=15)
    assert r2.json()["mode"] == "interactive"
    # Reset back to text to avoid polluting prod
    r3 = client.post(f"{BASE_URL}/api/admin/whatsapp/funnel-config", json={"mode": "text"}, timeout=15)
    assert r3.status_code == 200
    assert r3.json()["mode"] == "text"


# --- /funnel-simulate interactive flow ---

def test_simulate_welcome_interactive(client, phone):
    _reset(client, phone)
    r = client.post(f"{BASE_URL}/api/admin/whatsapp/funnel-simulate",
                    json={"phone": phone, "message": "hi", "mode": "interactive"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["handled"] is True
    assert d["mode"] == "interactive"
    replies = d["replies"]
    assert len(replies) >= 1
    first = replies[0]
    assert first["type"] == "interactive_list"
    rows = [row for sec in first.get("sections", []) for row in sec.get("rows", [])]
    row_ids = [r["id"] for r in rows]
    assert "div:Trauma" in row_ids
    assert "div:Joint Replacement" in row_ids
    assert "div:_AGENT" in row_ids
    # exactly 10 rows (9 divs + agent)
    assert len(rows) == 10


def test_simulate_division_to_product_picker_interactive(client, phone):
    # state should now be division_picker — tap div:Trauma
    r = client.post(f"{BASE_URL}/api/admin/whatsapp/funnel-simulate",
                    json={"phone": phone, "message": "div:Trauma", "mode": "interactive"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["state"]["node"] == "product_picker"
    assert d["state"].get("division") == "Trauma"
    reply = d["replies"][0]
    assert reply["type"] == "interactive_list"
    rows = [row for sec in reply.get("sections", []) for row in sec.get("rows", [])]
    assert len(rows) >= 1
    assert all(r["id"].startswith("prod:") for r in rows)
    # stash first slug for next test on module via env
    os.environ["_ITER67_SLUG"] = rows[0]["id"].split(":", 1)[1]


def test_simulate_product_to_detail_buttons(client, phone):
    slug = os.environ.get("_ITER67_SLUG", "")
    assert slug, "previous test must have set slug"
    r = client.post(f"{BASE_URL}/api/admin/whatsapp/funnel-simulate",
                    json={"phone": phone, "message": f"prod:{slug}", "mode": "interactive"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["state"]["node"] == "product_detail"
    reply = d["replies"][0]
    assert reply["type"] == "interactive_buttons"
    btn_ids = [b["id"] for b in reply.get("buttons", [])]
    assert btn_ids == ["act:quote", "act:brochure", "act:agent"]


def test_simulate_act_quote_creates_hot_lead(client, phone):
    r = client.post(f"{BASE_URL}/api/admin/whatsapp/funnel-simulate",
                    json={"phone": phone, "message": "act:quote", "mode": "interactive"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["state"]["node"] == "quote_requested"
    # Verify lead was created as Hot/Bulk Quote
    # leads API: /api/admin/leads
    lr = client.get(f"{BASE_URL}/api/admin/leads", timeout=15)
    assert lr.status_code == 200
    leads = lr.json() if isinstance(lr.json(), list) else lr.json().get("leads", [])
    match = [l for l in leads if l.get("phone_whatsapp") == phone]
    assert match, f"no lead for {phone}"
    lead = match[0]
    assert lead.get("inquiry_type") == "Bulk Quote"
    assert (lead.get("score") or "").lower() == "hot"


def test_simulate_agent_handoff_text(client):
    ph = "9" + str(int(time.time() * 10))[-9:]
    _reset(client, ph)
    # first send hi to enter division_picker
    client.post(f"{BASE_URL}/api/admin/whatsapp/funnel-simulate",
                json={"phone": ph, "message": "hi", "mode": "interactive"}, timeout=15)
    r = client.post(f"{BASE_URL}/api/admin/whatsapp/funnel-simulate",
                    json={"phone": ph, "message": "div:_AGENT", "mode": "interactive"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["replies"][0]["type"] == "text"
    assert "specialist" in d["replies"][0]["text"].lower() or "ortho" in d["replies"][0]["text"].lower()


# --- text mode regression ---

def test_simulate_text_mode_welcome(client):
    ph = "9" + str(int(time.time() * 100))[-9:]
    _reset(client, ph)
    r = client.post(f"{BASE_URL}/api/admin/whatsapp/funnel-simulate",
                    json={"phone": ph, "message": "hi", "mode": "text"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    first = d["replies"][0]
    assert first["type"] == "text"
    assert "1." in first["text"] and "Trauma" in first["text"]


def test_simulate_text_mode_division_to_products(client):
    ph = "9" + str(int(time.time() * 1000))[-9:]
    _reset(client, ph)
    client.post(f"{BASE_URL}/api/admin/whatsapp/funnel-simulate",
                json={"phone": ph, "message": "hi", "mode": "text"}, timeout=15)
    r = client.post(f"{BASE_URL}/api/admin/whatsapp/funnel-simulate",
                    json={"phone": ph, "message": "1", "mode": "text"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["state"]["node"] in ("product_picker",)
    first = d["replies"][0]
    assert first["type"] == "text"
    # Text product menu uses A. / B. letters (may not always have B/C if catalog small)
    assert "*A.*" in first["text"] or "A." in first["text"]


# --- live interactive test endpoint — expect graceful non-500 response ---

def test_funnel_test_interactive_graceful(client):
    # Expect real call to Interakt; likely 400/403 from their API since session not open
    # Endpoint should NOT return 500 — it should bubble Interakt response back
    r = client.post(f"{BASE_URL}/api/admin/whatsapp/funnel-test-interactive",
                    json={"phone": "9199999999", "flavor": "list"}, timeout=30)
    # Accept 200 (relayed) or 400; must NOT be 500
    assert r.status_code in (200, 400), f"unexpected status {r.status_code}: {r.text[:200]}"
    d = r.json()
    # Body should at least contain 'success' key
    assert "success" in d or "status_code" in d or "data" in d or "error" in d
