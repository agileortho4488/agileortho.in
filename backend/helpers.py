import os
import re
import hashlib
import uuid
import jwt
import requests
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Header

JWT_SECRET = os.environ.get("JWT_SECRET")
ADMIN_PASSWORD = (os.environ.get("ADMIN_PASSWORD") or "").strip('"').strip("'") or None
EMERGENT_LLM_KEY = (os.environ.get("EMERGENT_LLM_KEY") or "").strip('"').strip("'") or None

# Fallback JWT secret — loaded from env first, then uses deployment-safe default
HARDCODED_JWT_SECRET = os.environ.get("HARDCODED_JWT_SECRET", "QDThgViaGd3ErJegOmCw1FG824YVKUIJpWmHUQPOCCQ")

def _get_jwt_secret():
    """Return JWT secret, stripping quotes if the deployment platform injected them."""
    secret = JWT_SECRET
    if secret:
        secret = secret.strip('"').strip("'")
        if secret:
            return secret
    return HARDCODED_JWT_SECRET


# --- Auth ---

def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


def create_token(data: dict) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=720)
    return jwt.encode({**data, "exp": exp}, _get_jwt_secret(), algorithm="HS256")


def verify_token(token: str) -> dict:
    secret = _get_jwt_secret()
    try:
        return jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


async def admin_required(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(401, "Missing authorization header")
    token = authorization.replace("Bearer ", "")
    return verify_token(token)


# --- MongoDB Serialization ---

def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc


def serialize_docs(docs):
    return [serialize_doc(d) for d in docs]


# --- Lead Scoring ---

def calculate_lead_score(lead: dict) -> tuple:
    score_value = 0
    inquiry = lead.get("inquiry_type", "")
    if inquiry == "Bulk Quote":
        score_value += 40
    elif inquiry == "Product Info":
        score_value += 20
    elif inquiry == "Brochure Download":
        score_value += 15
    elif inquiry == "WhatsApp Chat":
        score_value += 25
    else:
        score_value += 10

    if lead.get("hospital_clinic"):
        score_value += 15
    if lead.get("email"):
        score_value += 10
    if lead.get("district"):
        score_value += 10
    if lead.get("product_interest"):
        score_value += 15

    if score_value >= 60:
        return "Hot", min(score_value, 100)
    elif score_value >= 35:
        return "Warm", score_value
    else:
        return "Cold", score_value


def explain_lead_score(lead: dict) -> list:
    """Return a list of human-readable reasons explaining a lead's score.

    Runs the same weight table as ``calculate_lead_score`` but emits a reason
    string for every rule that fired. Safe to call on any lead doc.
    """
    reasons = []
    inquiry = lead.get("inquiry_type", "")
    inquiry_weights = {
        "Bulk Quote": (40, "Bulk-quote inquiry (high commercial intent)"),
        "Product Info": (20, "Specific product inquiry"),
        "Brochure Download": (15, "Downloaded brochure"),
        "WhatsApp Chat": (25, "Started WhatsApp chat"),
    }
    if inquiry in inquiry_weights:
        pts, label = inquiry_weights[inquiry]
        reasons.append({"points": pts, "label": label})
    else:
        reasons.append({"points": 10, "label": "General inquiry"})

    if lead.get("hospital_clinic"):
        reasons.append({"points": 15, "label": f"Hospital identified: {lead['hospital_clinic']}"})
    if lead.get("email"):
        reasons.append({"points": 10, "label": "Email provided"})
    if lead.get("district"):
        reasons.append({"points": 10, "label": f"District captured: {lead['district']}"})
    if lead.get("product_interest"):
        reasons.append({"points": 15, "label": f"Product interest: {lead['product_interest']}"})
    return reasons


# --- Regex Escape ---

def escape_regex(text):
    return re.escape(text)


# --- Object Storage ---

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "agile-ortho"
_storage_key = None

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf",
    "json": "application/json", "csv": "text/csv", "txt": "text/plain",
}


def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(
        f"{STORAGE_URL}/init",
        json={"emergent_key": EMERGENT_LLM_KEY},
        timeout=30,
    )
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple:
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def get_mime_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return MIME_TYPES.get(ext, "application/octet-stream")
