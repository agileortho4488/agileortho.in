"""
Google Search Console (GSC) OAuth + API integration.

One-time admin setup (in Google Cloud Console, 3 minutes):
  1. Enable Search Console API on a GCP project
  2. OAuth consent screen → Internal → add admin email as Test User
  3. Credentials → Create OAuth 2.0 Client ID (Web app) → set redirect URI to:
       {REACT_APP_BACKEND_URL}/api/admin/gsc/callback
  4. Paste Client ID + Secret into backend/.env as GOOGLE_OAUTH_CLIENT_ID
     and GOOGLE_OAUTH_CLIENT_SECRET, then restart backend

Runtime: admin clicks "Connect Search Console" in the Leads page → OAuth flow
→ refresh token stored in `app_config`. Daily/on-demand import pulls top
queries and inserts them into `leads_col` with source="gsc_warm".

PKCE NOTE: Google's newly-created OAuth clients default to requiring PKCE
(a code_verifier sent with the token exchange). Because our authorization_url
and callback live in two separate HTTP requests, we must persist the
code_verifier between them. We key it by the OAuth `state` parameter.
"""
from __future__ import annotations

import os
import secrets
import hashlib
import base64
from datetime import datetime, timezone, timedelta
from typing import Optional

from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from db import db as mongo_db

SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
CLIENT_ID = os.environ.get("GOOGLE_OAUTH_CLIENT_ID") or ""
CLIENT_SECRET = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET") or ""

app_config_col = mongo_db["app_config"]
oauth_state_col = mongo_db["oauth_state"]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _redirect_uri() -> str:
    backend = os.environ.get("REACT_APP_BACKEND_URL") or ""
    if not backend:
        backend = os.environ.get("BACKEND_URL") or ""
    return f"{backend.rstrip('/')}/api/admin/gsc/callback"


def is_configured() -> bool:
    return bool(CLIENT_ID and CLIENT_SECRET)


def _client_config() -> dict:
    return {
        "web": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [_redirect_uri()],
        }
    }


def _gen_pkce_pair() -> tuple:
    """Return (code_verifier, code_challenge) for Google OAuth PKCE flow."""
    # Per RFC 7636: 43-128 char URL-safe string
    verifier = secrets.token_urlsafe(64)[:96]
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return verifier, challenge


async def build_auth_url() -> tuple:
    """Return (auth_url, state) for redirecting the admin to Google."""
    if not is_configured():
        raise RuntimeError("Google OAuth client not configured (see GOOGLE_OAUTH_CLIENT_ID)")

    code_verifier, code_challenge = _gen_pkce_pair()
    flow = Flow.from_client_config(_client_config(), scopes=SCOPES)
    flow.redirect_uri = _redirect_uri()
    url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
        code_challenge=code_challenge,
        code_challenge_method="S256",
    )
    # Persist the verifier so /callback can retrieve it
    await oauth_state_col.update_one(
        {"state": state},
        {"$set": {
            "state": state,
            "code_verifier": code_verifier,
            "provider": "gsc",
            "created_at": _iso(_now()),
        }},
        upsert=True,
    )
    return url, state


async def handle_callback(code: str, state: str) -> dict:
    """Exchange auth code for tokens using the state-mapped code_verifier."""
    st_doc = await oauth_state_col.find_one({"state": state, "provider": "gsc"})
    if not st_doc:
        raise RuntimeError("OAuth state not found or already used — please restart the flow")
    code_verifier = st_doc.get("code_verifier")

    flow = Flow.from_client_config(_client_config(), scopes=SCOPES)
    flow.redirect_uri = _redirect_uri()
    if code_verifier:
        flow.code_verifier = code_verifier
    flow.fetch_token(code=code)
    creds = flow.credentials

    doc = {
        "type": "gsc_oauth",
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_expiry": creds.expiry.isoformat() if creds.expiry else None,
        "scope": " ".join(creds.scopes or []),
        "connected_at": _iso(_now()),
    }
    await app_config_col.update_one(
        {"type": "gsc_oauth"}, {"$set": doc}, upsert=True
    )
    # Cleanup state (single-use)
    await oauth_state_col.delete_one({"state": state})
    return {"connected": True, "scope": doc["scope"]}


async def _get_credentials() -> Credentials:
    doc = await app_config_col.find_one({"type": "gsc_oauth"})
    if not doc or not doc.get("refresh_token"):
        raise RuntimeError("GSC not connected. Please connect Search Console first.")

    expiry = None
    if doc.get("token_expiry"):
        try:
            expiry = datetime.fromisoformat(doc["token_expiry"].replace("Z", "+00:00"))
        except Exception:
            expiry = None

    creds = Credentials(
        token=doc.get("access_token"),
        refresh_token=doc["refresh_token"],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        scopes=SCOPES,
        expiry=expiry,
    )
    # Auto-refresh if expired
    if not creds.valid and creds.refresh_token:
        creds.refresh(Request())
        await app_config_col.update_one(
            {"type": "gsc_oauth"},
            {"$set": {
                "access_token": creds.token,
                "token_expiry": creds.expiry.isoformat() if creds.expiry else None,
            }},
        )
    return creds


async def get_status() -> dict:
    doc = await app_config_col.find_one({"type": "gsc_oauth"}, {"_id": 0})
    if not doc:
        return {
            "connected": False,
            "configured": is_configured(),
            "redirect_uri": _redirect_uri(),
        }
    return {
        "connected": True,
        "configured": True,
        "connected_at": doc.get("connected_at"),
        "scope": doc.get("scope"),
    }


async def list_sites() -> list:
    creds = await _get_credentials()
    service = build("searchconsole", "v1", credentials=creds, cache_discovery=False)
    resp = service.sites().list().execute()
    return [s.get("siteUrl") for s in resp.get("siteEntry", [])]


async def query_search_analytics(
    site_url: str,
    days: int = 28,
    dimensions: Optional[list] = None,
    row_limit: int = 500,
) -> dict:
    creds = await _get_credentials()
    service = build("searchconsole", "v1", credentials=creds, cache_discovery=False)

    end = _now().date()
    start = end - timedelta(days=days)
    body = {
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "dimensions": dimensions or ["query", "country", "device", "page"],
        "rowLimit": min(row_limit, 25000),
        "startRow": 0,
    }
    resp = service.searchanalytics().query(siteUrl=site_url, body=body).execute()
    return resp


async def import_queries_as_leads(site_url: str, days: int = 28, top_n: int = 50) -> dict:
    """
    Pull top search queries and insert them as 'warm' leads.

    Each query → one lead record (deduped by slug). The lead is tagged with:
      - source: 'gsc_warm'
      - inquiry_type: 'Search (GSC)'
      - score_value: derived from clicks + position (higher clicks + lower
        position = warmer lead)
      - product_interest: the search query itself
      - notes: impressions/clicks/ctr/position
    """
    resp = await query_search_analytics(
        site_url=site_url,
        days=days,
        dimensions=["query", "country", "page"],
        row_limit=top_n,
    )
    rows = resp.get("rows", [])
    leads_col = mongo_db["leads"]

    inserted = 0
    updated = 0
    for r in rows:
        keys = r.get("keys") or []
        if not keys:
            continue
        query = keys[0]
        country = keys[1] if len(keys) > 1 else ""
        page = keys[2] if len(keys) > 2 else ""
        clicks = int(r.get("clicks", 0))
        impressions = int(r.get("impressions", 0))
        ctr = float(r.get("ctr", 0))
        position = float(r.get("position", 99))

        # Score model: clicks dominate, boost for strong position
        score_value = min(100, int(clicks * 8 + max(0, 30 - position) + ctr * 200))
        score = "Hot" if score_value >= 60 else ("Warm" if score_value >= 35 else "Cold")

        # Dedupe by (source + query) so re-runs update instead of duplicate
        filt = {"source": "gsc_warm", "product_interest": query}
        doc = {
            "name": f"Search: {query[:60]}",
            "phone_whatsapp": "",
            "email": "",
            "hospital_clinic": "",
            "district": "",
            "inquiry_type": "Search (GSC)",
            "product_interest": query,
            "source": "gsc_warm",
            "status": "new",
            "score": score,
            "score_value": score_value,
            "gsc_clicks": clicks,
            "gsc_impressions": impressions,
            "gsc_ctr": round(ctr, 4),
            "gsc_position": round(position, 1),
            "gsc_country": country,
            "gsc_landing_page": page,
            "updated_at": _iso(_now()),
        }
        existing = await leads_col.find_one(filt)
        if existing:
            await leads_col.update_one({"_id": existing["_id"]}, {"$set": doc})
            updated += 1
        else:
            doc["created_at"] = _iso(_now())
            await leads_col.insert_one(doc)
            inserted += 1

    return {
        "site_url": site_url,
        "days": days,
        "rows_returned": len(rows),
        "leads_inserted": inserted,
        "leads_updated": updated,
    }
