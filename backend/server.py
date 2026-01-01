from __future__ import annotations

import os
import re
import uuid
import math
import csv
import io
import ssl
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Literal, Optional, Tuple

import jwt
import requests
from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse, StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, Field
from slugify import slugify
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# App
app = FastAPI(title="OrthoConnect API")
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("orthoconnect")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security / config
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin")
JWT_ALG = "HS256"
JWT_EXP_MINUTES = int(os.environ.get("JWT_EXP_MINUTES", "720"))

UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Zoho Desk Config
ZOHO_CLIENT_ID = os.environ.get("ZOHO_CLIENT_ID", "")
ZOHO_CLIENT_SECRET = os.environ.get("ZOHO_CLIENT_SECRET", "")
ZOHO_DESK_ORG_ID = os.environ.get("ZOHO_DESK_ORG_ID", "")
ZOHO_DESK_REFRESH_TOKEN = os.environ.get("ZOHO_DESK_REFRESH_TOKEN", "")
ZOHO_API_DOMAIN = os.environ.get("ZOHO_API_DOMAIN", "https://www.zohoapis.in")

# In-memory token cache
_zoho_access_token = {"token": None, "expires_at": 0}


# -----------------------------
# Zoho Desk API Helper
# -----------------------------

def get_zoho_access_token() -> str:
    """Get or refresh Zoho access token"""
    global _zoho_access_token
    
    # Check if token is still valid (with 5 min buffer)
    if _zoho_access_token["token"] and _zoho_access_token["expires_at"] > datetime.now(timezone.utc).timestamp() + 300:
        return _zoho_access_token["token"]
    
    # Refresh the token
    try:
        resp = requests.post(
            "https://accounts.zoho.in/oauth/v2/token",
            data={
                "grant_type": "refresh_token",
                "client_id": ZOHO_CLIENT_ID,
                "client_secret": ZOHO_CLIENT_SECRET,
                "refresh_token": ZOHO_DESK_REFRESH_TOKEN,
            },
            timeout=10
        )
        data = resp.json()
        
        if "access_token" in data:
            _zoho_access_token["token"] = data["access_token"]
            _zoho_access_token["expires_at"] = datetime.now(timezone.utc).timestamp() + data.get("expires_in", 3600)
            logger.info("Zoho access token refreshed")
            return data["access_token"]
        else:
            logger.error("Failed to refresh Zoho token: %s", data)
            return ""
    except Exception as e:
        logger.error("Error refreshing Zoho token: %s", e)
        return ""


async def zoho_desk_request(method: str, endpoint: str, data: dict = None) -> dict:
    """Make authenticated request to Zoho Desk API"""
    token = get_zoho_access_token()
    if not token:
        return {"error": "Failed to get Zoho access token"}
    
    # Use Zoho Desk API domain (not the generic API domain)
    url = f"https://desk.zoho.in/api/v1{endpoint}"
    headers = {
        "Authorization": f"Zoho-oauthtoken {token}",
        "orgId": ZOHO_DESK_ORG_ID,
        "Content-Type": "application/json",
    }
    
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, timeout=15)
        elif method == "POST":
            resp = requests.post(url, headers=headers, json=data, timeout=15)
        elif method == "PATCH":
            resp = requests.patch(url, headers=headers, json=data, timeout=15)
        elif method == "DELETE":
            resp = requests.delete(url, headers=headers, timeout=15)
        else:
            return {"error": f"Unknown method: {method}"}
        
        if resp.status_code in [200, 201]:
            return resp.json() if resp.text else {"ok": True}
        else:
            logger.error("Zoho Desk API error: %s - %s", resp.status_code, resp.text)
            return {"error": resp.text, "status_code": resp.status_code}
    except Exception as e:
        logger.error("Zoho Desk request failed: %s", e)
        return {"error": str(e)}


# -----------------------------
# Utilities
# -----------------------------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_subspecialty(value: str) -> str:
    v = (value or "").strip()
    if not v:
        return ""
    return v.title()


def is_pincode(value: str) -> bool:
    return bool(re.fullmatch(r"\d{6}", (value or "").strip()))


def make_slug(name: str, primary_sub: Optional[str], city: Optional[str]) -> str:
    base_parts = [name, primary_sub or None, city or None]
    base = " ".join([p for p in base_parts if p and p.strip()])
    base = slugify(base)[:60] or "surgeon"
    return f"{base}-{str(uuid.uuid4())[:4]}"


def encode_token(sub: str, role: str) -> str:
    payload = {
        "sub": sub,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXP_MINUTES),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(status_code=401, detail="Session expired") from e
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token") from e


# Dependency wrapper to access headers
from fastapi import Header  # noqa: E402


def require_bearer(authorization: Optional[str]) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1].strip()
    return decode_token(token)


async def admin_dep(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    payload = require_bearer(authorization)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=401, detail="Admin access required")
    return payload


async def surgeon_dep(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    payload = require_bearer(authorization)
    if payload.get("role") != "surgeon":
        raise HTTPException(status_code=401, detail="Surgeon access required")
    return payload


# -----------------------------
# Models
# -----------------------------

SurgeonStatus = Literal["pending", "approved", "rejected", "needs_clarification"]


class Clinic(BaseModel):
    model_config = ConfigDict(extra="ignore")

    address: str = ""
    city: str = ""
    pincode: str = ""
    opd_timings: str = ""
    phone: str = ""
    geo: Optional[Dict[str, Any]] = None  # {type:'Point', coordinates:[lng,lat]}


class Location(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    facility_name: str = ""
    address: str = ""
    city: str = ""
    pincode: str = ""
    opd_timings: str = ""
    phone: str = ""
    geo: Optional[Dict[str, Any]] = None


class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str = "other"  # registration|degree|other
    filename: str
    path: str
    uploaded_at: str = Field(default_factory=now_iso)


class SurgeonPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    slug: str
    status: SurgeonStatus

    name: str
    qualifications: str
    registration_number: str

    subspecialties: List[str]
    about: str
    conditions_treated: List[str]
    procedures_performed: List[str]
    website: str = ""

    # Photo controls
    has_profile_photo: bool = False
    photo_visibility: Literal["admin_only", "public"] = "admin_only"
    public_photo_url: Optional[str] = None

    # Backward compat (first clinic) + multi locations
    clinic: Optional[Clinic] = None
    locations: List[Location] = Field(default_factory=list)


class SurgeonAdmin(SurgeonPublic):
    upload_token: str
    documents: List[Document] = Field(default_factory=list)
    created_at: str
    updated_at: str
    rejection_reason: Optional[str] = None
    user_id: Optional[str] = None


class SurgeonCreateResponse(BaseModel):
    id: str
    slug: str
    status: SurgeonStatus
    upload_token: str


class SurgeonSearchResult(BaseModel):
    id: str
    slug: str
    name: str
    qualifications: str
    subspecialties: List[str]
    clinic: Optional[Clinic] = None
    locations: List[Location] = Field(default_factory=list)
    distance_km: Optional[float] = None


class AdminLoginRequest(BaseModel):
    password: str


class AdminLoginResponse(BaseModel):
    token: str


class AdminSurgeonUpdate(BaseModel):
    status: Optional[SurgeonStatus] = None
    rejection_reason: Optional[str] = None

    subspecialties: Optional[List[str]] = None
    about: Optional[str] = None
    conditions_treated: Optional[List[str]] = None
    procedures_performed: Optional[List[str]] = None

    photo_visibility: Optional[Literal["admin_only", "public"]] = None


class SurgeonSignupRequest(BaseModel):
    name: str
    email: str
    mobile: str
    password: str


class SurgeonLoginRequest(BaseModel):
    email: str
    password: str


class OtpRequest(BaseModel):
    mobile: str


class OtpVerify(BaseModel):
    mobile: str
    code: str


class SurgeonAuthResponse(BaseModel):
    token: str


class SurgeonMeResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    mobile: str


class SurgeonProfileUpsert(BaseModel):
    name: str = ""
    email: str = ""
    qualifications: str
    registration_number: str
    subspecialties: List[str] = Field(default_factory=list)
    about: str = ""
    website: str = ""
    conditions_treated: List[str] = Field(default_factory=list)
    procedures_performed: List[str] = Field(default_factory=list)
    locations: List[Location] = Field(default_factory=list)


# -----------------------------
# Meta / constants
# -----------------------------

SUBSPECIALTIES = ["Shoulder", "Elbow", "Hand", "Hip", "Knee", "Spine", "Sports Medicine", "Trauma", "Oncology", "Paediatrics"]

# synonym phrases (comprehensive list for India)
SUBSPECIALTY_SYNONYMS: Dict[str, str] = {
    # English
    "shoulder": "Shoulder",
    "shoulder specialist": "Shoulder",
    "shoulder surgeon": "Shoulder",
    "rotator cuff": "Shoulder",
    "frozen shoulder": "Shoulder",
    "elbow": "Elbow",
    "elbow surgeon": "Elbow",
    "tennis elbow": "Elbow",
    "hand": "Hand",
    "hand & wrist": "Hand",
    "wrist": "Hand",
    "carpal tunnel": "Hand",
    "trigger finger": "Hand",
    "hip": "Hip",
    "hip replacement": "Hip",
    "hip surgeon": "Hip",
    "avascular necrosis": "Hip",
    "avn": "Hip",
    "knee": "Knee",
    "knee surgeon": "Knee",
    "knee replacement": "Knee",
    "acl": "Knee",
    "acl tear": "Knee",
    "meniscus": "Knee",
    "joint replacement": "Hip",
    "arthroplasty": "Hip",
    "oncology": "Oncology",
    "bone cancer": "Oncology",
    "tumor": "Oncology",
    "tumour": "Oncology",
    "kids ortho": "Paediatrics",
    "pediatric": "Paediatrics",
    "paediatric": "Paediatrics",
    "children": "Paediatrics",
    "child bone": "Paediatrics",
    "clubfoot": "Paediatrics",
    "spine": "Spine",
    "back pain": "Spine",
    "disc": "Spine",
    "slipped disc": "Spine",
    "sciatica": "Spine",
    "spinal": "Spine",
    "sports": "Sports Medicine",
    "sports injury": "Sports Medicine",
    "sports medicine": "Sports Medicine",
    "athlete": "Sports Medicine",
    "trauma": "Trauma",
    "fracture": "Trauma",
    "accident": "Trauma",
    "broken bone": "Trauma",
    # Hindi keywords
    "घुटने": "Knee",
    "घुटना": "Knee",
    "घुटने का दर्द": "Knee",
    "कमर": "Spine",
    "कमर दर्द": "Spine",
    "पीठ दर्द": "Spine",
    "पीठ": "Spine",
    "कंधा": "Shoulder",
    "कंधे": "Shoulder",
    "कंधे का दर्द": "Shoulder",
    "कूल्हा": "Hip",
    "कूल्हे": "Hip",
    "हड्डी": "Trauma",
    "हड्डी टूटना": "Trauma",
    "फ्रैक्चर": "Trauma",
    "हाथ": "Hand",
    "कलाई": "Hand",
    "बच्चों": "Paediatrics",
    # Telugu keywords
    "మోకాలు": "Knee",
    "మోకాళ్ల నొప్పి": "Knee",
    "నడుము": "Spine",
    "నడుము నొప్పి": "Spine",
    "భుజం": "Shoulder",
    "తుంటి": "Hip",
    "ఎముక": "Trauma",
    "చేయి": "Hand",
    # City synonyms
    "hyderabad": "Hyderabad",
    "hyd": "Hyderabad",
    "secunderabad": "Hyderabad",
    "nizamabad": "Nizamabad",
    "warangal": "Warangal",
    "mumbai": "Mumbai",
    "bombay": "Mumbai",
    "delhi": "Delhi",
    "new delhi": "Delhi",
    "ncr": "Delhi",
    "bangalore": "Bangalore",
    "bengaluru": "Bangalore",
    "chennai": "Chennai",
    "madras": "Chennai",
    "kolkata": "Kolkata",
    "calcutta": "Kolkata",
    "pune": "Pune",
    "ahmedabad": "Ahmedabad",
}


@api_router.get("/meta/subspecialties")
async def get_subspecialties():
    return {"subspecialties": SUBSPECIALTIES}


# -----------------------------
# Geocoding (Nominatim)
# -----------------------------

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


async def geocode_location(query: str) -> Optional[Dict[str, float]]:
    q = (query or "").strip()
    if not q:
        return None

    cached = await db.geo_cache.find_one({"query": q}, {"_id": 0})
    if cached and "lat" in cached and "lng" in cached:
        return {"lat": float(cached["lat"]), "lng": float(cached["lng"])}

    try:
        resp = requests.get(
            NOMINATIM_URL,
            params={"q": q, "format": "json", "limit": 1, "countrycodes": "in"},
            timeout=10,
            headers={"User-Agent": "OrthoConnect/1.0 (patient-first discovery platform)"},
        )

        if resp.status_code != 200:
            return None
        data = resp.json()
        if not data:
            return None
        lat = float(data[0]["lat"])
        lng = float(data[0]["lon"])
        await db.geo_cache.update_one(
            {"query": q},
            {"$set": {"query": q, "lat": lat, "lng": lng, "updated_at": now_iso()}},
            upsert=True,
        )
        return {"lat": lat, "lng": lng}
    except Exception as e:
        logger.warning("Geocoding failed for %s: %s", q, e)
        return None

# -----------------------------
# 2Factor.in OTP Integration
# -----------------------------

OTP_TTL_MINUTES = int(os.environ.get("OTP_TTL_MINUTES", "5"))
TWOFACTOR_API_KEY = os.environ.get("TWOFACTOR_API_KEY", "")
TWOFACTOR_SMS_URL = "https://2factor.in/API/V1/{api_key}/SMS/{mobile}/{otp}/OrthoConnect+OTP"

# SMTP Email Configuration
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_EMAIL = os.environ.get("SMTP_EMAIL", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "AgileOrtho Team")


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """Send email via Zoho SMTP"""
    if not all([SMTP_HOST, SMTP_EMAIL, SMTP_PASSWORD]):
        logger.warning("SMTP not configured, email not sent")
        return False
    
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_EMAIL}>"
        msg["To"] = to_email
        
        # Attach HTML content
        part = MIMEText(html_content, "html")
        msg.attach(part)
        
        # Connect with SSL
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        
        logger.info("Email sent successfully to %s", to_email[:5] + "***")
        return True
    except Exception as e:
        logger.error("Failed to send email: %s", e)
        return False


def send_status_notification(surgeon_email: str, surgeon_name: str, new_status: str, reason: str = None):
    """Send email notification when surgeon profile status changes"""
    if not surgeon_email:
        return
    
    status_messages = {
        "approved": {
            "subject": "🎉 Your OrthoConnect Profile is Live!",
            "color": "#059669",
            "message": f"""
                <p>Dear Dr. {surgeon_name},</p>
                <p>Great news! Your profile on OrthoConnect has been <strong style="color: #059669;">approved</strong> and is now live.</p>
                <p>Patients can now find and contact you through our platform.</p>
                <p>View your profile: <a href="https://orthoconnect.agileortho.in/surgeons">OrthoConnect Surgeons</a></p>
            """
        },
        "rejected": {
            "subject": "OrthoConnect Profile Update Required",
            "color": "#DC2626",
            "message": f"""
                <p>Dear Dr. {surgeon_name},</p>
                <p>Unfortunately, your profile submission could not be approved at this time.</p>
                {f'<p><strong>Reason:</strong> {reason}</p>' if reason else ''}
                <p>Please update your profile and resubmit for review.</p>
                <p><a href="https://orthoconnect.agileortho.in/join">Update Profile</a></p>
            """
        },
        "needs_clarification": {
            "subject": "Action Required: OrthoConnect Profile",
            "color": "#2563EB",
            "message": f"""
                <p>Dear Dr. {surgeon_name},</p>
                <p>We need some additional information to complete your profile verification.</p>
                {f'<p><strong>Details:</strong> {reason}</p>' if reason else ''}
                <p>Please update your profile with the requested information.</p>
                <p><a href="https://orthoconnect.agileortho.in/join">Update Profile</a></p>
            """
        },
        "pending": {
            "subject": "OrthoConnect Profile Received",
            "color": "#D97706",
            "message": f"""
                <p>Dear Dr. {surgeon_name},</p>
                <p>Thank you for submitting your profile on OrthoConnect.</p>
                <p>Your profile is currently <strong style="color: #D97706;">under review</strong>. We'll notify you once it's approved.</p>
            """
        }
    }
    
    status_info = status_messages.get(new_status)
    if not status_info:
        return
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e2e8f0;">
                <h1 style="color: #0d9488; margin: 0; font-size: 24px;">OrthoConnect</h1>
                <p style="color: #64748b; margin: 5px 0 0; font-size: 12px;">An initiative of AgileOrtho</p>
            </div>
            
            <div style="padding: 30px 0;">
                {status_info['message']}
            </div>
            
            <div style="border-top: 1px solid #e2e8f0; padding: 20px 0; text-align: center; color: #64748b; font-size: 12px;">
                <p>This is an automated message from OrthoConnect.</p>
                <p>For support, contact us at info@agileortho.in</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    send_email(surgeon_email, status_info["subject"], html)


# -----------------------------
# Outreach & Marketing Automation
# -----------------------------

class OutreachContact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    mobile: str = ""
    city: str = ""
    subspecialty: str = ""
    clinic_name: str = ""
    
    # Status tracking
    status: Literal["new", "invited", "opened", "clicked", "signed_up", "unsubscribed"] = "new"
    
    # Campaign tracking
    campaign_id: Optional[str] = None
    emails_sent: int = 0
    last_email_sent: Optional[str] = None
    email_opened_at: Optional[str] = None
    link_clicked_at: Optional[str] = None
    signed_up_at: Optional[str] = None
    
    # Metadata
    source: str = "csv_import"  # csv_import, manual, referral
    notes: str = ""
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class EmailCampaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    
    # Email sequence
    template_type: Literal["invitation", "followup_1", "followup_2", "reminder"] = "invitation"
    
    # Stats
    total_contacts: int = 0
    emails_sent: int = 0
    emails_opened: int = 0
    links_clicked: int = 0
    signups: int = 0
    
    # Status
    status: Literal["draft", "active", "paused", "completed"] = "draft"
    
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class ContactImport(BaseModel):
    contacts: List[Dict[str, str]]


class SendCampaignRequest(BaseModel):
    contact_ids: List[str]
    template_type: str = "invitation"


def get_email_template(template_type: str, contact: Dict[str, Any], tracking_id: str) -> Tuple[str, str]:
    """Generate email subject and HTML body for different template types"""
    
    name = contact.get("name", "Doctor")
    first_name = name.split()[0] if name else "Doctor"
    city = contact.get("city", "")
    
    base_url = "https://orthoconnect.agileortho.in"
    join_url = f"{base_url}/join?ref=email&tid={tracking_id}"
    track_pixel = f"{base_url}/api/outreach/track/open/{tracking_id}"
    
    templates = {
        "invitation": {
            "subject": f"Dr. {first_name}, Join India's Ethical Orthopaedic Directory",
            "body": f"""
                <p>Dear Dr. {name},</p>
                
                <p>We're building <strong>OrthoConnect</strong> — India's first <em>ethical, patient-first</em> orthopaedic surgeon directory.</p>
                
                <p><strong>What makes us different:</strong></p>
                <ul style="color: #334155;">
                    <li>✅ <strong>100% Free</strong> — No subscription, no hidden fees</li>
                    <li>✅ <strong>No Paid Rankings</strong> — Patients find you by location, not by who pays more</li>
                    <li>✅ <strong>No Advertisements</strong> — Clean, professional experience</li>
                    <li>✅ <strong>Verification Badges</strong> — Build trust with verified credentials</li>
                </ul>
                
                <p>{"We noticed you practice in <strong>" + city + "</strong>. " if city else ""}We would love to have you as a founding member of our platform.</p>
                
                <p style="margin: 30px 0;">
                    <a href="{join_url}" style="background-color: #0d9488; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                        Create Your Free Profile →
                    </a>
                </p>
                
                <p style="color: #64748b; font-size: 14px;">Takes less than 5 minutes. Your profile will be reviewed within 24 hours.</p>
            """
        },
        "followup_1": {
            "subject": f"Dr. {first_name}, Your Colleagues Are Already on OrthoConnect",
            "body": f"""
                <p>Dear Dr. {name},</p>
                
                <p>A few days ago, we invited you to join OrthoConnect. Since then, <strong>orthopaedic surgeons across India</strong> have created their profiles.</p>
                
                <p><strong>Why are they joining?</strong></p>
                <ul style="color: #334155;">
                    <li>🏥 Patients actively searching for orthopaedic care find them</li>
                    <li>📍 Location-based discovery brings local patients</li>
                    <li>🎖️ Verified badges build instant trust</li>
                    <li>📱 Mobile-friendly profiles with direct contact</li>
                </ul>
                
                <p>Your profile can be live in under 5 minutes:</p>
                
                <p style="margin: 30px 0;">
                    <a href="{join_url}" style="background-color: #0d9488; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                        Join Now — It's Free →
                    </a>
                </p>
                
                <p style="color: #64748b; font-size: 14px;">Questions? Reply to this email — we're happy to help.</p>
            """
        },
        "followup_2": {
            "subject": f"Last reminder: Claim your OrthoConnect profile, Dr. {first_name}",
            "body": f"""
                <p>Dear Dr. {name},</p>
                
                <p>This is our final reminder about OrthoConnect.</p>
                
                <p>We built this platform because we believe doctors shouldn't have to pay to be discovered. Patients deserve to find the right surgeon based on <em>expertise and location</em>, not advertising budgets.</p>
                
                <p><strong>OrthoConnect is and will always be:</strong></p>
                <ul style="color: #334155;">
                    <li>Free for surgeons</li>
                    <li>Free of advertisements</li>
                    <li>Free of paid rankings</li>
                </ul>
                
                <p>If you'd like to be part of this mission, we'd love to have you:</p>
                
                <p style="margin: 30px 0;">
                    <a href="{join_url}" style="background-color: #0d9488; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                        Create Free Profile →
                    </a>
                </p>
                
                <p style="color: #64748b; font-size: 14px;">If you're not interested, no problem — we won't email you again.</p>
            """
        },
        "reminder": {
            "subject": f"Dr. {first_name}, Complete Your OrthoConnect Profile",
            "body": f"""
                <p>Dear Dr. {name},</p>
                
                <p>We noticed you started creating your OrthoConnect profile but haven't completed it yet.</p>
                
                <p>Complete your profile to:</p>
                <ul style="color: #334155;">
                    <li>✅ Appear in patient searches</li>
                    <li>✅ Get verified badges</li>
                    <li>✅ Receive patient inquiries</li>
                </ul>
                
                <p style="margin: 30px 0;">
                    <a href="{join_url}" style="background-color: #0d9488; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                        Complete Your Profile →
                    </a>
                </p>
            """
        }
    }
    
    template = templates.get(template_type, templates["invitation"])
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.8; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">OrthoConnect</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">India's Ethical Orthopaedic Directory</p>
                </div>
                
                <!-- Body -->
                <div style="padding: 40px 30px;">
                    {template['body']}
                </div>
                
                <!-- Footer -->
                <div style="background: #f1f5f9; padding: 20px 30px; text-align: center; color: #64748b; font-size: 12px;">
                    <p style="margin: 0 0 10px;">OrthoConnect — An initiative of AgileOrtho</p>
                    <p style="margin: 0;">
                        <a href="{base_url}/unsubscribe?id={tracking_id}" style="color: #64748b;">Unsubscribe</a> · 
                        <a href="{base_url}" style="color: #64748b;">Visit Website</a>
                    </p>
                </div>
            </div>
        </div>
        <img src="{track_pixel}" width="1" height="1" style="display:none;" alt="" />
    </body>
    </html>
    """
    
    return template["subject"], html


def get_whatsapp_message(contact: Dict[str, Any]) -> str:
    """Generate WhatsApp invitation message"""
    name = contact.get("name", "Doctor")
    # Remove "Dr." or "DR." prefix if already present to avoid "Dr. Dr."
    if name.upper().startswith("DR."):
        name = name[3:].strip()
    elif name.upper().startswith("DR "):
        name = name[3:].strip()
    return f"""Dear Dr. {name},

We're inviting you to join *OrthoConnect* — India's ethical, patient-first orthopaedic surgeon directory.

✅ 100% Free — No fees ever
✅ No Paid Rankings — Fair discovery
✅ Verified Badges — Build trust

Create your free profile: https://orthoconnect.agileortho.in/join

— Team AgileOrtho"""


def normalize_mobile(mobile: str) -> str:
    m = re.sub(r"\D", "", mobile or "")
    # keep last 10 digits for India-style mobile
    if len(m) > 10:
        m = m[-10:]
    return m


def generate_otp() -> str:
    return f"{uuid.uuid4().int % 1000000:06d}"


async def send_otp_via_2factor(mobile: str, otp: str) -> bool:
    """Send OTP via 2Factor.in SMS API"""
    if not TWOFACTOR_API_KEY:
        logger.warning("2Factor API key not configured, OTP not sent")
        return False
    
    try:
        url = TWOFACTOR_SMS_URL.format(api_key=TWOFACTOR_API_KEY, mobile=mobile, otp=otp)
        resp = requests.get(url, timeout=10)
        data = resp.json()
        
        if data.get("Status") == "Success":
            logger.info("OTP sent successfully to %s via 2Factor.in", mobile[-4:].rjust(10, '*'))
            return True
        else:
            logger.error("2Factor.in OTP failed: %s", data.get("Details", "Unknown error"))
            return False
    except Exception as e:
        logger.error("2Factor.in API error: %s", e)
        return False


@api_router.post("/auth/otp/request")
async def otp_request(payload: OtpRequest):
    mobile = normalize_mobile(payload.mobile)
    if len(mobile) < 10:
        raise HTTPException(status_code=400, detail="Valid mobile number is required")

    code = generate_otp()
    doc = {
        "id": str(uuid.uuid4()),
        "mobile": mobile,
        "code": code,
        "created_at": now_iso(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)).isoformat(),
        "used": False,
    }
    await db.otp_codes.insert_one(doc)

    # Send OTP via 2Factor.in
    sms_sent = await send_otp_via_2factor(mobile, code)
    
    if sms_sent:
        return {"ok": True, "mobile": mobile, "sms_sent": True, "ttl_minutes": OTP_TTL_MINUTES}
    else:
        # Fallback: return OTP in response for development/testing
        logger.warning("SMS not sent, returning OTP in response (development mode)")
        return {"ok": True, "mobile": mobile, "sms_sent": False, "mocked_otp": code, "ttl_minutes": OTP_TTL_MINUTES}


@api_router.post("/auth/otp/verify", response_model=SurgeonAuthResponse)
async def otp_verify(payload: OtpVerify):
    mobile = normalize_mobile(payload.mobile)
    code = (payload.code or "").strip()
    if len(mobile) < 10 or not re.fullmatch(r"\d{6}", code):
        raise HTTPException(status_code=400, detail="Invalid mobile or OTP")

    rec = await db.otp_codes.find_one(
        {"mobile": mobile, "code": code, "used": False},
        sort=[("created_at", -1)],
        projection={"_id": 0},
    )
    if not rec:
        raise HTTPException(status_code=401, detail="Incorrect OTP")

    try:
        exp = datetime.fromisoformat(rec["expires_at"])
        if exp < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="OTP expired")
    except HTTPException:
        raise
    except Exception:
        # if parsing fails, treat as expired
        raise HTTPException(status_code=401, detail="OTP expired")

    await db.otp_codes.update_one({"id": rec["id"]}, {"$set": {"used": True}})

    # Create or load surgeon user
    user = await db.users.find_one({"mobile": mobile, "role": "surgeon"}, {"_id": 0})
    if not user:
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "role": "surgeon",
            "name": "",
            # IMPORTANT: omit email field entirely so unique+sparse index doesn't treat nulls as duplicates
            "mobile": mobile,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.users.insert_one(user)

    return SurgeonAuthResponse(token=encode_token(sub=user["id"], role="surgeon"))


# -----------------------------
# Smart search parsing
# -----------------------------


def extract_subspecialty(q: str) -> Optional[str]:
    text = (q or "").lower()
    # longest phrase match first
    for phrase in sorted(SUBSPECIALTY_SYNONYMS.keys(), key=len, reverse=True):
        if phrase in text:
            return SUBSPECIALTY_SYNONYMS[phrase]
    return None


def extract_location_hint(q: str) -> str:
    # Simple heuristic: take part after "near" or "in"
    text = (q or "").strip()
    m = re.search(r"\bnear\b\s+(.+)$", text, flags=re.IGNORECASE)
    if m:
        return m.group(1).strip()
    m = re.search(r"\bin\b\s+(.+)$", text, flags=re.IGNORECASE)
    if m:
        return m.group(1).strip()
    # fallback: if user typed only pincode/city
    return text


# -----------------------------
# Surgeon auth
# -----------------------------


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


@api_router.post("/auth/surgeon/signup", response_model=SurgeonAuthResponse)
async def surgeon_signup(payload: SurgeonSignupRequest):
    email = normalize_email(payload.email)
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email is required")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "role": "surgeon",
        "name": payload.name.strip(),
        "email": email,
        "mobile": payload.mobile.strip(),
        "password_hash": pwd_context.hash(payload.password),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.users.insert_one(doc)
    return SurgeonAuthResponse(token=encode_token(sub=user_id, role="surgeon"))


@api_router.post("/auth/surgeon/login", response_model=SurgeonAuthResponse)
async def surgeon_login(payload: SurgeonLoginRequest):
    email = normalize_email(payload.email)
    user = await db.users.find_one({"email": email, "role": "surgeon"}, {"_id": 0})
    if not user or not pwd_context.verify(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return SurgeonAuthResponse(token=encode_token(sub=user["id"], role="surgeon"))


@api_router.get("/surgeon/me", response_model=SurgeonMeResponse)
async def surgeon_me(payload: Dict[str, Any] = Depends(surgeon_dep)):
    user_id = payload["sub"]
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return SurgeonMeResponse(
        id=user["id"],
        name=user.get("name", ""),
        email=user.get("email"),
        mobile=user.get("mobile", ""),
    )


# -----------------------------
# Public search endpoints
# -----------------------------


def _clinic_from_locations(locs: List[Dict[str, Any]]) -> Optional[Clinic]:
    if not locs:
        return None
    return Clinic(
        address=(locs[0].get("address") or ""),
        city=(locs[0].get("city") or ""),
        pincode=(locs[0].get("pincode") or ""),
        opd_timings=(locs[0].get("opd_timings") or ""),
        phone=(locs[0].get("phone") or ""),
        geo=(locs[0].get("geo")),
    )


def _ensure_locations(doc: Dict[str, Any]) -> List[Dict[str, Any]]:
    # New schema stores locations[]. Legacy docs may have clinic.{...} or even clinic.geo.
    locs = doc.get("locations") or []
    if locs:
        return locs

    clinic = (doc.get("clinic") or {})
    if clinic:
        return [
            {
                "id": str(uuid.uuid4()),
                "facility_name": "",
                "address": clinic.get("address", ""),
                "city": clinic.get("city", ""),
                "pincode": clinic.get("pincode", ""),
                "opd_timings": clinic.get("opd_timings", ""),
                "phone": clinic.get("phone", ""),
                "geo": clinic.get("geo"),
            }
        ]

    return []


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


async def search_profiles(location: Optional[str], radius_km: float, subspecialty: Optional[str]) -> List[SurgeonSearchResult]:
    loc = (location or "").strip()
    if not loc:
        raise HTTPException(status_code=400, detail="location is required")

    subs = normalize_subspecialty(subspecialty or "")

    query: Dict[str, Any] = {"status": "approved"}
    if subs:
        query["subspecialties"] = {"$in": [subs]}

    geo = await geocode_location(loc)
    if geo:
        radius_km = max(1.0, min(float(radius_km), 100.0))
        radius_radians = radius_km / 6378.1

        # Search across any location geo
        query_geo = {
            **query,
            "$or": [
                {
                    "locations.geo": {
                        "$geoWithin": {
                            "$centerSphere": [[geo["lng"], geo["lat"]], radius_radians]
                        }
                    }
                },
                {
                    "clinic.geo": {
                        "$geoWithin": {
                            "$centerSphere": [[geo["lng"], geo["lat"]], radius_radians]
                        }
                    }
                },
            ],
        }

        docs = await db.surgeons.find(query_geo, {"_id": 0}).limit(200).to_list(200)
        results: List[SurgeonSearchResult] = []

        for d in docs:
            locs = _ensure_locations(d)
            # compute min distance to any location
            dist_km: Optional[float] = None
            for loc_item in locs:
                pt = (loc_item or {}).get("geo")
                if pt and pt.get("type") == "Point":
                    lng, lat = pt.get("coordinates", [None, None])
                    if lng is None or lat is None:
                        continue
                    km = haversine_km(geo["lat"], geo["lng"], float(lat), float(lng))
                    dist_km = km if dist_km is None else min(dist_km, km)

            results.append(
                SurgeonSearchResult(
                    id=d["id"],
                    slug=d["slug"],
                    name=d.get("name", ""),
                    qualifications=d.get("qualifications", ""),
                    subspecialties=d.get("subspecialties", []),
                    locations=[Location(**x) for x in locs],
                    clinic=_clinic_from_locations(locs),
                    distance_km=(round(dist_km, 1) if dist_km is not None else None),
                )
            )

        results.sort(key=lambda x: (x.distance_km is None, x.distance_km or 9999, x.name.lower()))
        return results

    # fallback text match
    safe = re.escape(loc)
    query_text = {
        **query,
        "$or": [
            {"locations.city": {"$regex": safe, "$options": "i"}},
            {"locations.address": {"$regex": safe, "$options": "i"}},
            {"locations.pincode": {"$regex": safe, "$options": "i"}},
        ],
    }
    docs = await db.surgeons.find(query_text, {"_id": 0}).limit(200).to_list(200)
    out: List[SurgeonSearchResult] = []
    for d in docs:
        locs = _ensure_locations(d)
        out.append(
            SurgeonSearchResult(
                id=d["id"],
                slug=d["slug"],
                name=d.get("name", ""),
                qualifications=d.get("qualifications", ""),
                subspecialties=d.get("subspecialties", []),
                locations=[Location(**x) for x in locs],
                clinic=_clinic_from_locations(locs),
                distance_km=None,
            )
        )
    return out


@api_router.get("/profiles/search", response_model=List[SurgeonSearchResult])
async def profiles_search(
    location: Optional[str] = None,
    radius_km: float = 10.0,
    subspecialty: Optional[str] = None,
):
    return await search_profiles(location=location, radius_km=radius_km, subspecialty=subspecialty)


@api_router.get("/profiles/all", response_model=List[SurgeonSearchResult])
async def profiles_all():
    """Get all approved surgeon profiles (for surgeons listing page)"""
    docs = await db.surgeons.find({"status": "approved"}, {"_id": 0}).limit(500).to_list(500)
    out: List[SurgeonSearchResult] = []
    for d in docs:
        locs = _ensure_locations(d)
        out.append(
            SurgeonSearchResult(
                id=d["id"],
                slug=d["slug"],
                name=d.get("name", ""),
                qualifications=d.get("qualifications", ""),
                subspecialties=d.get("subspecialties", []),
                locations=[Location(**x) for x in locs],
                clinic=_clinic_from_locations(locs),
                distance_km=None,
            )
        )
    return out


@api_router.get("/profiles/smart-search", response_model=List[SurgeonSearchResult])
async def profiles_smart_search(q: Optional[str] = None, radius_km: float = 10.0):
    query = (q or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="q is required")

    subs = extract_subspecialty(query)
    loc = extract_location_hint(query)

    # If query is only subspecialty words, require location
    if subs and (loc.lower() == subs.lower() or len(loc) <= 2):
        raise HTTPException(status_code=400, detail="Please include a location (city/area/pincode)")

    return await search_profiles(location=loc, radius_km=radius_km, subspecialty=subs)


def _public_photo_url(slug: str) -> str:
    return f"/api/public/surgeons/{slug}/photo"


@api_router.get("/profiles/by-slug/{slug}", response_model=SurgeonPublic)
async def get_profile_by_slug(slug: str):
    doc = await db.surgeons.find_one({"slug": slug, "status": "approved"}, {"_id": 0, "upload_token": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Surgeon not found")

    locs = _ensure_locations(doc)
    photo = doc.get("profile_photo") or None
    visibility = doc.get("photo_visibility") or "admin_only"

    return SurgeonPublic(
        id=doc["id"],
        slug=doc["slug"],
        status=doc["status"],
        name=doc.get("name", ""),
        qualifications=doc.get("qualifications", ""),
        registration_number=doc.get("registration_number", ""),
        subspecialties=doc.get("subspecialties", []),
        about=doc.get("about", ""),
        website=doc.get("website", ""),
        conditions_treated=doc.get("conditions_treated", []),
        procedures_performed=doc.get("procedures_performed", []),
        has_profile_photo=bool(photo),
        photo_visibility=visibility,
        public_photo_url=_public_photo_url(doc["slug"]) if (photo and visibility == "public") else None,
        clinic=_clinic_from_locations(locs),
        locations=[Location(**x) for x in locs],
    )


# -----------------------------
# Surgeon profile management (JWT)
# -----------------------------


@api_router.post("/surgeon/me/profile/photo")
async def surgeon_upload_profile_photo(
    file: UploadFile = File(...),
    auth: Dict[str, Any] = Depends(surgeon_dep),
):
    user_id = auth["sub"]
    profile = await db.surgeons.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Submit your profile details first.")

    surgeon_id = profile["id"]
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", file.filename or "photo")
    ext = (Path(safe_name).suffix or ".jpg").lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, or WEBP image")

    photo_id = str(uuid.uuid4())
    dest_dir = UPLOADS_DIR / surgeon_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / f"profile_{photo_id}{ext}"
    dest_path.write_bytes(await file.read())

    await db.surgeons.update_one(
        {"id": surgeon_id},
        {
            "$set": {
                "updated_at": now_iso(),
                "profile_photo": {
                    "id": photo_id,
                    "filename": safe_name,
                    "path": str(dest_path),
                    "uploaded_at": now_iso(),
                },
                # Default: admin-only until admin explicitly makes it public
                "photo_visibility": "admin_only",
            }
        },
    )

    return {"ok": True, "photo_visibility": "admin_only"}


@api_router.get("/public/surgeons/{slug}/photo")
async def public_profile_photo(slug: str):
    doc = await db.surgeons.find_one({"slug": slug, "status": "approved"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")

    if doc.get("photo_visibility") != "public":
        raise HTTPException(status_code=404, detail="Not found")

    photo = doc.get("profile_photo") or {}
    path = photo.get("path")
    filename = photo.get("filename") or "profile.jpg"
    if not path or not Path(path).exists():
        raise HTTPException(status_code=404, detail="Not found")

    return FileResponse(path=path, filename=filename)


@api_router.get("/admin/surgeons/{surgeon_id}/photo")
async def admin_profile_photo(
    surgeon_id: str,
    token: Optional[str] = None,
    authorization: Optional[str] = Header(default=None),
):
    # same auth scheme as admin document download
    if authorization:
        payload = require_bearer(authorization)
        if payload.get("role") != "admin":
            raise HTTPException(status_code=401, detail="Admin access required")
    elif token:
        payload = decode_token(token)
        if payload.get("role") != "admin":
            raise HTTPException(status_code=401, detail="Admin access required")
    else:
        raise HTTPException(status_code=401, detail="Missing admin token")

    doc = await db.surgeons.find_one({"id": surgeon_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")

    photo = doc.get("profile_photo") or {}
    path = photo.get("path")
    filename = photo.get("filename") or "profile.jpg"
    if not path or not Path(path).exists():
        raise HTTPException(status_code=404, detail="Not found")

    return FileResponse(path=path, filename=filename)



@api_router.get("/surgeon/me/profile")
async def surgeon_get_profile(auth: Dict[str, Any] = Depends(surgeon_dep)):
    user_id = auth["sub"]
    doc = await db.surgeons.find_one({"user_id": user_id}, {"_id": 0, "upload_token": 0})
    if not doc:
        return {"exists": False}

    locs = _ensure_locations(doc)
    return {
        "exists": True,
        "status": doc.get("status"),
        "slug": doc.get("slug"),
        "name": doc.get("name", ""),
        "email": doc.get("email", ""),
        "qualifications": doc.get("qualifications", ""),
        "registration_number": doc.get("registration_number", ""),
        "subspecialties": doc.get("subspecialties", []),
        "about": doc.get("about", ""),
        "website": doc.get("website", ""),
        "conditions_treated": doc.get("conditions_treated", []),
        "procedures_performed": doc.get("procedures_performed", []),
        "locations": locs,
        "documents_count": len(doc.get("documents", []) or []),
    }


@api_router.put("/surgeon/me/profile")
async def surgeon_upsert_profile(payload: SurgeonProfileUpsert, auth: Dict[str, Any] = Depends(surgeon_dep)):
    user_id = auth["sub"]
    user = await db.users.find_one({"id": user_id, "role": "surgeon"}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not payload.registration_number.strip():
        raise HTTPException(status_code=400, detail="Medical registration number is required")

    subs_list = [normalize_subspecialty(s) for s in payload.subspecialties if s.strip()]
    
    # Validate max 2 subspecialties
    if len(subs_list) > 2:
        raise HTTPException(status_code=400, detail="Maximum 2 subspecialties allowed")

    # Geocode each location
    locations: List[Dict[str, Any]] = []
    for loc in payload.locations:
        geo = None
        if is_pincode(loc.pincode):
            geo = await geocode_location(loc.pincode)
        elif (loc.city or "").strip() or (loc.address or "").strip():
            geo = await geocode_location(f"{loc.pincode}, {loc.city}" if loc.pincode else f"{loc.address}, {loc.city}")

        geo_point = None
        if geo:
            geo_point = {"type": "Point", "coordinates": [geo["lng"], geo["lat"]]}

        locations.append(
            {
                "id": loc.id or str(uuid.uuid4()),
                "facility_name": (loc.facility_name or "").strip(),
                "address": (loc.address or "").strip(),
                "city": (loc.city or "").strip(),
                "pincode": (loc.pincode or "").strip(),
                "opd_timings": (loc.opd_timings or "").strip(),
                "phone": (loc.phone or "").strip(),
                "geo": geo_point,
            }
        )

    if not locations:
        raise HTTPException(status_code=400, detail="At least one clinic/hospital location is required")

    # existing profile? (user_id)
    existing = await db.surgeons.find_one({"user_id": user_id}, {"_id": 0})
    
    # Use name from payload if provided, otherwise fall back to user record
    surgeon_name = payload.name.strip() if payload.name.strip() else user.get("name", "")

    if existing:
        await db.surgeons.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "updated_at": now_iso(),
                    "status": "pending",  # re-review on changes
                    "name": surgeon_name,
                    "email": payload.email.strip(),
                    "qualifications": payload.qualifications.strip(),
                    "registration_number": payload.registration_number.strip(),
                    "subspecialties": subs_list,
                    "about": payload.about.strip(),
                    "website": payload.website.strip(),
                    "conditions_treated": [c.strip() for c in payload.conditions_treated if c.strip()],
                    "procedures_performed": [p.strip() for p in payload.procedures_performed if p.strip()],
                    "locations": locations,
                }
            },
        )
        return {"ok": True, "id": existing["id"], "status": "pending"}

    surgeon_id = str(uuid.uuid4())
    upload_token = str(uuid.uuid4())
    slug = make_slug(name=surgeon_name, primary_sub=(subs_list[0] if subs_list else None), city=locations[0].get("city"))

    doc = {
        "id": surgeon_id,
        "user_id": user_id,
        "slug": slug,
        "status": "pending",
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "upload_token": upload_token,
        "rejection_reason": None,
        "name": surgeon_name,
        "email": payload.email.strip(),
        "qualifications": payload.qualifications.strip(),
        "registration_number": payload.registration_number.strip(),
        "subspecialties": subs_list,
        "about": payload.about.strip(),
        "website": payload.website.strip(),
        "conditions_treated": [c.strip() for c in payload.conditions_treated if c.strip()],
        "procedures_performed": [p.strip() for p in payload.procedures_performed if p.strip()],
        "locations": locations,
        "documents": [],
        "profile_photo": None,
    }

    await db.surgeons.insert_one(doc)
    return {"ok": True, "id": surgeon_id, "status": "pending"}


@api_router.post("/surgeon/me/profile/documents")
async def surgeon_upload_documents(
    doc_type: str = Form(default="other"),
    files: List[UploadFile] = File(...),
    auth: Dict[str, Any] = Depends(surgeon_dep),
):
    user_id = auth["sub"]
    profile = await db.surgeons.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    doc_type = (doc_type or "other").strip().lower()
    allowed = {"registration", "degree", "other"}
    if doc_type not in allowed:
        doc_type = "other"

    surgeon_id = profile["id"]

    saved_docs = []
    for f in files:
        safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", f.filename or "document")
        doc_id = str(uuid.uuid4())
        dest_dir = UPLOADS_DIR / surgeon_id
        dest_dir.mkdir(parents=True, exist_ok=True)

        # Migration safety: if older docs stored email as null, remove the field so unique+sparse works.
        await db.users.update_many({"email": None}, {"$unset": {"email": ""}})

        dest_path = dest_dir / f"{doc_id}_{safe_name}"
        content = await f.read()
        dest_path.write_bytes(content)
        saved_docs.append(
            {
                "id": doc_id,
                "type": doc_type,
                "filename": safe_name,
                "path": str(dest_path),
                "uploaded_at": now_iso(),
            }
        )

    await db.surgeons.update_one(
        {"id": surgeon_id},
        {"$push": {"documents": {"$each": saved_docs}}, "$set": {"updated_at": now_iso()}},
    )

    return {"ok": True, "uploaded": len(saved_docs)}


# -----------------------------
# Backward-compatible public join (no login) — kept for transition
# -----------------------------


@api_router.post("/surgeons/join", response_model=SurgeonCreateResponse)
async def join_as_surgeon_legacy(
    name: str = Form(...),
    qualifications: str = Form(...),
    registration_number: str = Form(...),
    subspecialties: str = Form(default=""),
    about: str = Form(default=""),
    conditions_treated: str = Form(default=""),
    procedures_performed: str = Form(default=""),
    clinic_address: str = Form(...),
    clinic_city: str = Form(default=""),
    clinic_pincode: str = Form(...),
    clinic_opd_timings: str = Form(default=""),
    clinic_phone: str = Form(default=""),
    profile_photo: Optional[UploadFile] = File(default=None),
):
    if not registration_number.strip():
        raise HTTPException(status_code=400, detail="Medical registration number is required")

    subs_list = [normalize_subspecialty(s) for s in subspecialties.split(",") if s.strip()]
    conds = [c.strip() for c in conditions_treated.split(",") if c.strip()]
    procs = [p.strip() for p in procedures_performed.split(",") if p.strip()]

    geo = await geocode_location(clinic_pincode) if is_pincode(clinic_pincode) else await geocode_location(
        f"{clinic_pincode}, {clinic_city}" if clinic_city else clinic_pincode
    )
    geo_point = None
    if geo:
        geo_point = {"type": "Point", "coordinates": [geo["lng"], geo["lat"]]}

    surgeon_id = str(uuid.uuid4())
    upload_token = str(uuid.uuid4())
    slug = make_slug(name=name, primary_sub=(subs_list[0] if subs_list else None), city=clinic_city)

    photo_ref: Optional[Dict[str, str]] = None
    if profile_photo is not None:
        safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", profile_photo.filename or "photo")
        dest_dir = UPLOADS_DIR / surgeon_id
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / f"profile_{safe_name}"
        dest_path.write_bytes(await profile_photo.read())
        photo_ref = {"path": str(dest_path), "filename": safe_name}

    locations = [
        {
            "id": str(uuid.uuid4()),
            "facility_name": "",
            "address": clinic_address.strip(),
            "city": clinic_city.strip(),
            "pincode": clinic_pincode.strip(),
            "opd_timings": clinic_opd_timings.strip(),
            "phone": clinic_phone.strip(),
            "geo": geo_point,
        }
    ]

    doc = {
        "id": surgeon_id,
        "slug": slug,
        "status": "pending",
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "upload_token": upload_token,
        "rejection_reason": None,
        "name": name.strip(),
        "qualifications": qualifications.strip(),
        "registration_number": registration_number.strip(),
        "subspecialties": subs_list,
        "about": about.strip(),
        "conditions_treated": conds,
        "procedures_performed": procs,
        "locations": locations,
        "profile_photo": photo_ref,
        "documents": [],
    }

    await db.surgeons.insert_one(doc)
    return SurgeonCreateResponse(id=surgeon_id, slug=slug, status="pending", upload_token=upload_token)


@api_router.post("/surgeons/{surgeon_id}/documents")
async def upload_surgeon_documents_legacy(
    surgeon_id: str,
    upload_token: str = Header(default="", alias="X-Upload-Token"),
    doc_type: str = Form(default="other"),
    files: List[UploadFile] = File(...),
):
    surgeon = await db.surgeons.find_one({"id": surgeon_id})
    if not surgeon:
        raise HTTPException(status_code=404, detail="Surgeon not found")
    if not upload_token or upload_token != surgeon.get("upload_token"):
        raise HTTPException(status_code=401, detail="Invalid upload token")

    doc_type = (doc_type or "other").strip().lower()
    allowed = {"registration", "degree", "other"}
    if doc_type not in allowed:
        doc_type = "other"

    saved_docs = []
    for f in files:
        safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", f.filename or "document")
        doc_id = str(uuid.uuid4())
        dest_dir = UPLOADS_DIR / surgeon_id
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / f"{doc_id}_{safe_name}"
        dest_path.write_bytes(await f.read())
        saved_docs.append(
            {
                "id": doc_id,
                "type": doc_type,
                "filename": safe_name,
                "path": str(dest_path),
                "uploaded_at": now_iso(),
            }
        )

    await db.surgeons.update_one(
        {"id": surgeon_id},
        {"$push": {"documents": {"$each": saved_docs}}, "$set": {"updated_at": now_iso()}},
    )
    return {"ok": True, "uploaded": len(saved_docs)}


# -----------------------------
# Admin endpoints
# -----------------------------


@api_router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login(payload: AdminLoginRequest):
    if payload.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Incorrect password")
    return AdminLoginResponse(token=encode_token(sub="admin", role="admin"))


@api_router.get("/admin/surgeons", response_model=List[SurgeonAdmin])
async def admin_list_surgeons(status: Optional[SurgeonStatus] = None, _: Dict[str, Any] = Depends(admin_dep)):
    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    docs = await db.surgeons.find(query, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)
    out: List[SurgeonAdmin] = []
    for d in docs:
        locs = d.get("locations") or []
        photo = d.get("profile_photo") or None
        visibility = d.get("photo_visibility") or "admin_only"

        out.append(
            SurgeonAdmin(
                id=d["id"],
                slug=d["slug"],
                status=d["status"],
                name=d.get("name", ""),
                qualifications=d.get("qualifications", ""),
                registration_number=d.get("registration_number", ""),
                subspecialties=d.get("subspecialties", []),
                about=d.get("about", ""),
                conditions_treated=d.get("conditions_treated", []),
                procedures_performed=d.get("procedures_performed", []),
                has_profile_photo=bool(photo),
                photo_visibility=visibility,
                public_photo_url=_public_photo_url(d["slug"]) if (photo and visibility == "public") else None,
                clinic=_clinic_from_locations(locs),
                locations=[Location(**x) for x in locs],
                upload_token=d.get("upload_token", ""),
                documents=[Document(**doc) for doc in d.get("documents", [])],
                created_at=d.get("created_at", ""),
                updated_at=d.get("updated_at", ""),
                rejection_reason=d.get("rejection_reason"),
                user_id=d.get("user_id"),
            )
        )
    return out


@api_router.patch("/admin/surgeons/{surgeon_id}")
async def admin_update_surgeon(
    surgeon_id: str,
    payload: AdminSurgeonUpdate,
    _: Dict[str, Any] = Depends(admin_dep),
):
    surgeon = await db.surgeons.find_one({"id": surgeon_id})
    if not surgeon:
        raise HTTPException(status_code=404, detail="Surgeon not found")

    update: Dict[str, Any] = {"updated_at": now_iso()}
    old_status = surgeon.get("status")

    if payload.status:
        update["status"] = payload.status
        if payload.status != "rejected":
            update["rejection_reason"] = None

    if payload.rejection_reason is not None:
        update["rejection_reason"] = payload.rejection_reason

    if payload.subspecialties is not None:
        update["subspecialties"] = [normalize_subspecialty(s) for s in payload.subspecialties if s.strip()]

    if payload.about is not None:
        update["about"] = payload.about
    if payload.conditions_treated is not None:
        update["conditions_treated"] = payload.conditions_treated
    if payload.procedures_performed is not None:
        update["procedures_performed"] = payload.procedures_performed

    if payload.photo_visibility is not None:
        update["photo_visibility"] = payload.photo_visibility

    await db.surgeons.update_one({"id": surgeon_id}, {"$set": update})
    
    # Send email notification if status changed
    if payload.status and payload.status != old_status:
        surgeon_email = surgeon.get("email")
        surgeon_name = surgeon.get("name", "Doctor")
        if surgeon_email:
            send_status_notification(
                surgeon_email=surgeon_email,
                surgeon_name=surgeon_name,
                new_status=payload.status,
                reason=payload.rejection_reason
            )
    
    return {"ok": True}


@api_router.get("/admin/documents/{doc_id}/download")
async def admin_download_document(
    doc_id: str,
    token: Optional[str] = None,
    authorization: Optional[str] = Header(default=None),
):
    if authorization:
        payload = require_bearer(authorization)
        if payload.get("role") != "admin":
            raise HTTPException(status_code=401, detail="Admin access required")
    elif token:
        payload = decode_token(token)
        if payload.get("role") != "admin":
            raise HTTPException(status_code=401, detail="Admin access required")
    else:
        raise HTTPException(status_code=401, detail="Missing admin token")

    surgeon = await db.surgeons.find_one({"documents.id": doc_id}, {"_id": 0})
    if not surgeon:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = None
    for d in surgeon.get("documents", []):
        if d.get("id") == doc_id:
            doc = d
            break
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    path = doc.get("path")
    filename = doc.get("filename") or "document"
    if not path or not Path(path).exists():
        raise HTTPException(status_code=404, detail="File missing")

    return FileResponse(path=path, filename=filename)


# -----------------------------
# Health
# -----------------------------


@api_router.get("/")
async def root():
    return {"message": "OrthoConnect API"}


# -----------------------------
# Profile Views Tracking
# -----------------------------

@api_router.post("/profiles/{slug}/view")
async def track_profile_view(slug: str):
    """Track a profile view (called when someone visits a doctor profile)"""
    doc = await db.surgeons.find_one({"slug": slug, "status": "approved"}, {"_id": 0, "id": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Increment view count
    await db.surgeons.update_one(
        {"slug": slug},
        {"$inc": {"view_count": 1}}
    )
    
    # Log the view with timestamp for analytics
    await db.profile_views.insert_one({
        "surgeon_id": doc["id"],
        "slug": slug,
        "viewed_at": now_iso(),
    })
    
    return {"ok": True}


@api_router.get("/profiles/{slug}/stats")
async def get_profile_stats(slug: str):
    """Get profile statistics (view count)"""
    doc = await db.surgeons.find_one({"slug": slug}, {"_id": 0, "view_count": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return {"view_count": doc.get("view_count", 0)}


# -----------------------------
# Admin Export & Analytics
# -----------------------------

@api_router.get("/admin/export/surgeons")
async def admin_export_surgeons(auth: Dict[str, Any] = Depends(admin_dep)):
    """Export all surgeons as CSV for conference organizers"""
    docs = await db.surgeons.find({}, {"_id": 0}).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row
    writer.writerow([
        "Name", "Email", "Mobile", "Qualifications", "Registration Number",
        "Subspecialties", "Status", "City", "Facility", "Phone",
        "Website", "Created At", "View Count"
    ])
    
    for d in docs:
        locs = d.get("locations") or []
        loc = locs[0] if locs else {}
        
        writer.writerow([
            d.get("name", ""),
            d.get("email", ""),
            d.get("mobile", ""),
            d.get("qualifications", ""),
            d.get("registration_number", ""),
            ", ".join(d.get("subspecialties", [])),
            d.get("status", ""),
            loc.get("city", ""),
            loc.get("facility_name", ""),
            loc.get("phone", ""),
            d.get("website", ""),
            d.get("created_at", ""),
            d.get("view_count", 0),
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=surgeons_export.csv"}
    )


@api_router.get("/admin/analytics")
async def admin_analytics(auth: Dict[str, Any] = Depends(admin_dep)):
    """Get platform analytics for admin dashboard"""
    # Total counts by status
    total = await db.surgeons.count_documents({})
    approved = await db.surgeons.count_documents({"status": "approved"})
    pending = await db.surgeons.count_documents({"status": "pending"})
    rejected = await db.surgeons.count_documents({"status": "rejected"})
    needs_clarification = await db.surgeons.count_documents({"status": "needs_clarification"})
    
    # City-wise distribution
    city_pipeline = [
        {"$match": {"status": "approved"}},
        {"$unwind": "$locations"},
        {"$group": {"_id": "$locations.city", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    city_stats = await db.surgeons.aggregate(city_pipeline).to_list(10)
    
    # Subspecialty distribution
    sub_pipeline = [
        {"$match": {"status": "approved"}},
        {"$unwind": "$subspecialties"},
        {"$group": {"_id": "$subspecialties", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    sub_stats = await db.surgeons.aggregate(sub_pipeline).to_list(20)
    
    # Recent signups (last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent_signups = await db.surgeons.count_documents({"created_at": {"$gte": thirty_days_ago}})
    
    # Total profile views
    total_views = await db.profile_views.count_documents({})
    
    return {
        "totals": {
            "total": total,
            "approved": approved,
            "pending": pending,
            "rejected": rejected,
            "needs_clarification": needs_clarification,
        },
        "city_distribution": [{"city": c["_id"] or "Unknown", "count": c["count"]} for c in city_stats],
        "subspecialty_distribution": [{"subspecialty": s["_id"], "count": s["count"]} for s in sub_stats],
        "recent_signups_30d": recent_signups,
        "total_profile_views": total_views,
    }


# -----------------------------
# Events/CME Endpoints
# -----------------------------

class EventCreate(BaseModel):
    title: str
    description: str
    event_type: Literal["conference", "cme", "workshop", "webinar"]
    start_date: str
    end_date: Optional[str] = None
    location: str
    city: str
    registration_url: Optional[str] = None
    organizer: str
    is_free: bool = False
    image_url: Optional[str] = None


@api_router.post("/admin/events")
async def create_event(event: EventCreate, auth: Dict[str, Any] = Depends(admin_dep)):
    """Create a new event (admin only)"""
    doc = {
        "id": str(uuid.uuid4()),
        "title": event.title,
        "description": event.description,
        "event_type": event.event_type,
        "start_date": event.start_date,
        "end_date": event.end_date,
        "location": event.location,
        "city": event.city,
        "registration_url": event.registration_url,
        "organizer": event.organizer,
        "is_free": event.is_free,
        "image_url": event.image_url,
        "created_at": now_iso(),
        "status": "active",
    }
    await db.events.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


@api_router.get("/events")
async def list_events():
    """List all upcoming events"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    docs = await db.events.find(
        {"status": "active", "start_date": {"$gte": today}},
        {"_id": 0}
    ).sort("start_date", 1).to_list(50)
    return docs


@api_router.get("/events/{event_id}")
async def get_event(event_id: str):
    """Get event details"""
    doc = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Event not found")
    return doc


@api_router.delete("/admin/events/{event_id}")
async def delete_event(event_id: str, auth: Dict[str, Any] = Depends(admin_dep)):
    """Delete an event"""
    result = await db.events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"ok": True}


# -----------------------------
# Blog/Articles Endpoints
# -----------------------------

class ArticleCreate(BaseModel):
    title: str
    slug: str
    excerpt: str
    content: str
    category: str
    author: str
    image_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


@api_router.post("/admin/articles")
async def create_article(article: ArticleCreate, auth: Dict[str, Any] = Depends(admin_dep)):
    """Create a new article (admin only)"""
    # Check slug uniqueness
    existing = await db.articles.find_one({"slug": article.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    
    doc = {
        "id": str(uuid.uuid4()),
        "title": article.title,
        "slug": article.slug,
        "excerpt": article.excerpt,
        "content": article.content,
        "category": article.category,
        "author": article.author,
        "image_url": article.image_url,
        "tags": article.tags,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "status": "published",
        "view_count": 0,
    }
    await db.articles.insert_one(doc)
    return {"ok": True, "id": doc["id"], "slug": doc["slug"]}


@api_router.get("/articles")
async def list_articles(category: Optional[str] = None, limit: int = 20):
    """List published articles"""
    query = {"status": "published"}
    if category:
        query["category"] = category
    
    docs = await db.articles.find(query, {"_id": 0, "content": 0}).sort("created_at", -1).to_list(limit)
    return docs


@api_router.get("/articles/{slug}")
async def get_article(slug: str):
    """Get article by slug"""
    doc = await db.articles.find_one({"slug": slug, "status": "published"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Increment view count
    await db.articles.update_one({"slug": slug}, {"$inc": {"view_count": 1}})
    
    return doc


# -----------------------------
# Referral System
# -----------------------------

@api_router.post("/surgeon/me/referral-code")
async def generate_referral_code(auth: Dict[str, Any] = Depends(surgeon_dep)):
    """Generate a referral code for the surgeon"""
    user_id = auth["sub"]
    surgeon = await db.surgeons.find_one({"user_id": user_id}, {"_id": 0, "id": 1, "referral_code": 1, "name": 1})
    
    if not surgeon:
        raise HTTPException(status_code=404, detail="Surgeon profile not found")
    
    if surgeon.get("referral_code"):
        return {"referral_code": surgeon["referral_code"]}
    
    # Generate unique referral code
    name_part = "".join(surgeon.get("name", "DR").split()[:2]).upper()[:6]
    code = f"{name_part}{str(uuid.uuid4())[:4].upper()}"
    
    await db.surgeons.update_one(
        {"user_id": user_id},
        {"$set": {"referral_code": code}}
    )
    
    return {"referral_code": code}


@api_router.post("/surgeon/apply-referral")
async def apply_referral_code(referral_code: str, auth: Dict[str, Any] = Depends(surgeon_dep)):
    """Apply a referral code (for new surgeons)"""
    user_id = auth["sub"]
    
    # Check if user already used a referral
    surgeon = await db.surgeons.find_one({"user_id": user_id}, {"_id": 0, "referred_by": 1})
    if surgeon and surgeon.get("referred_by"):
        raise HTTPException(status_code=400, detail="You have already used a referral code")
    
    # Find referrer
    referrer = await db.surgeons.find_one({"referral_code": referral_code.upper()}, {"_id": 0, "id": 1, "name": 1})
    if not referrer:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    
    # Apply referral
    await db.surgeons.update_one(
        {"user_id": user_id},
        {"$set": {"referred_by": referrer["id"], "referred_by_name": referrer["name"]}}
    )
    
    # Increment referrer's count
    await db.surgeons.update_one(
        {"id": referrer["id"]},
        {"$inc": {"referral_count": 1}}
    )
    
    return {"ok": True, "referred_by": referrer["name"]}


@api_router.get("/surgeon/me/referrals")
async def get_my_referrals(auth: Dict[str, Any] = Depends(surgeon_dep)):
    """Get list of surgeons I referred"""
    user_id = auth["sub"]
    surgeon = await db.surgeons.find_one({"user_id": user_id}, {"_id": 0, "id": 1, "referral_code": 1, "referral_count": 1})
    
    if not surgeon:
        raise HTTPException(status_code=404, detail="Surgeon profile not found")
    
    # Get referred surgeons
    referred = await db.surgeons.find(
        {"referred_by": surgeon["id"]},
        {"_id": 0, "name": 1, "status": 1, "created_at": 1}
    ).to_list(100)
    
    return {
        "referral_code": surgeon.get("referral_code"),
        "referral_count": surgeon.get("referral_count", 0),
        "referrals": referred,
    }


# -----------------------------
# Outreach & Marketing Automation Endpoints
# -----------------------------

@api_router.get("/admin/outreach/contacts")
async def get_outreach_contacts(
    status: Optional[str] = None,
    auth: Dict[str, Any] = Depends(admin_dep)
):
    """Get all outreach contacts with optional status filter"""
    query = {}
    if status:
        query["status"] = status
    
    docs = await db.outreach_contacts.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    return docs


@api_router.post("/admin/outreach/contacts/import")
async def import_outreach_contacts(
    payload: ContactImport,
    auth: Dict[str, Any] = Depends(admin_dep)
):
    """Import contacts from CSV data"""
    imported = 0
    duplicates = 0
    
    for contact_data in payload.contacts:
        email = contact_data.get("email", "").strip().lower()
        if not email:
            continue
        
        # Check if already exists
        existing = await db.outreach_contacts.find_one({"email": email})
        if existing:
            duplicates += 1
            continue
        
        # Create contact
        contact = OutreachContact(
            name=contact_data.get("name", "").strip(),
            email=email,
            mobile=contact_data.get("mobile", "").strip(),
            city=contact_data.get("city", "").strip(),
            subspecialty=contact_data.get("subspecialty", "").strip(),
            clinic_name=contact_data.get("clinic_name", "").strip(),
            notes=contact_data.get("notes", "").strip(),
        )
        
        await db.outreach_contacts.insert_one(contact.model_dump())
        imported += 1
    
    return {"imported": imported, "duplicates": duplicates}


@api_router.post("/admin/outreach/contacts")
async def add_single_contact(
    name: str,
    email: str,
    mobile: str = "",
    city: str = "",
    subspecialty: str = "",
    clinic_name: str = "",
    notes: str = "",
    auth: Dict[str, Any] = Depends(admin_dep)
):
    """Add a single contact manually"""
    email = email.strip().lower()
    
    # Check if already exists
    existing = await db.outreach_contacts.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Contact with this email already exists")
    
    contact = OutreachContact(
        name=name.strip(),
        email=email,
        mobile=mobile.strip(),
        city=city.strip(),
        subspecialty=subspecialty.strip(),
        clinic_name=clinic_name.strip(),
        notes=notes.strip(),
        source="manual",
    )
    
    await db.outreach_contacts.insert_one(contact.model_dump())
    return {"ok": True, "id": contact.id}


@api_router.delete("/admin/outreach/contacts/{contact_id}")
async def delete_outreach_contact(
    contact_id: str,
    auth: Dict[str, Any] = Depends(admin_dep)
):
    """Delete an outreach contact"""
    result = await db.outreach_contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"ok": True}


@api_router.post("/admin/outreach/send")
async def send_outreach_emails(
    payload: SendCampaignRequest,
    auth: Dict[str, Any] = Depends(admin_dep)
):
    """Send marketing emails to selected contacts"""
    sent = 0
    failed = 0
    bounced = 0
    
    for contact_id in payload.contact_ids:
        contact = await db.outreach_contacts.find_one({"id": contact_id})
        if not contact or not contact.get("email"):
            failed += 1
            continue
        
        # Generate tracking ID
        tracking_id = str(uuid.uuid4())
        
        # Get email template
        subject, html = get_email_template(payload.template_type, contact, tracking_id)
        
        # Send email - returns (success, error_code)
        success, error_code = send_email_with_bounce_detection(contact["email"], subject, html)
        
        if success:
            # Update contact status
            await db.outreach_contacts.update_one(
                {"id": contact_id},
                {
                    "$set": {
                        "status": "invited",
                        "last_email_sent": now_iso(),
                        "updated_at": now_iso(),
                    },
                    "$inc": {"emails_sent": 1}
                }
            )
            
            # Store tracking record
            await db.email_tracking.insert_one({
                "id": tracking_id,
                "contact_id": contact_id,
                "email": contact["email"],
                "template_type": payload.template_type,
                "sent_at": now_iso(),
                "opened": False,
                "clicked": False,
            })
            
            sent += 1
        elif error_code in [550, 551, 552, 553, 554]:
            # Hard bounce - delete the contact automatically
            await db.outreach_contacts.delete_one({"id": contact_id})
            await db.crm_contacts.delete_one({"email": contact["email"]})
            bounced += 1
            logger.info(f"Bounced email removed: {contact['email']} (error {error_code})")
        else:
            failed += 1
    
    return {"sent": sent, "failed": failed, "bounced_removed": bounced}


@api_router.get("/outreach/track/open/{tracking_id}")
async def track_email_open(tracking_id: str):
    """Track email opens (1x1 pixel)"""
    # Update tracking record
    await db.email_tracking.update_one(
        {"id": tracking_id, "opened": False},
        {"$set": {"opened": True, "opened_at": now_iso()}}
    )
    
    # Update contact status
    track_record = await db.email_tracking.find_one({"id": tracking_id})
    if track_record:
        await db.outreach_contacts.update_one(
            {"id": track_record["contact_id"], "status": {"$nin": ["clicked", "signed_up"]}},
            {"$set": {"status": "opened", "email_opened_at": now_iso()}}
        )
    
    # Return 1x1 transparent GIF
    gif_bytes = b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;'
    return StreamingResponse(io.BytesIO(gif_bytes), media_type="image/gif")


@api_router.get("/outreach/track/click/{tracking_id}")
async def track_email_click(tracking_id: str):
    """Track link clicks and redirect to join page"""
    # Update tracking record
    await db.email_tracking.update_one(
        {"id": tracking_id},
        {"$set": {"clicked": True, "clicked_at": now_iso()}}
    )
    
    # Update contact status
    track_record = await db.email_tracking.find_one({"id": tracking_id})
    if track_record:
        await db.outreach_contacts.update_one(
            {"id": track_record["contact_id"], "status": {"$nin": ["signed_up"]}},
            {"$set": {"status": "clicked", "link_clicked_at": now_iso()}}
        )
    
    # Redirect to join page
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="https://orthoconnect.agileortho.in/join?ref=email")


@api_router.get("/admin/outreach/stats")
async def get_outreach_stats(auth: Dict[str, Any] = Depends(admin_dep)):
    """Get outreach campaign statistics"""
    total = await db.outreach_contacts.count_documents({})
    new = await db.outreach_contacts.count_documents({"status": "new"})
    invited = await db.outreach_contacts.count_documents({"status": "invited"})
    opened = await db.outreach_contacts.count_documents({"status": "opened"})
    clicked = await db.outreach_contacts.count_documents({"status": "clicked"})
    signed_up = await db.outreach_contacts.count_documents({"status": "signed_up"})
    unsubscribed = await db.outreach_contacts.count_documents({"status": "unsubscribed"})
    
    # Calculate rates
    open_rate = (opened / invited * 100) if invited > 0 else 0
    click_rate = (clicked / opened * 100) if opened > 0 else 0
    conversion_rate = (signed_up / total * 100) if total > 0 else 0
    
    return {
        "total_contacts": total,
        "by_status": {
            "new": new,
            "invited": invited,
            "opened": opened,
            "clicked": clicked,
            "signed_up": signed_up,
            "unsubscribed": unsubscribed,
        },
        "rates": {
            "open_rate": round(open_rate, 1),
            "click_rate": round(click_rate, 1),
            "conversion_rate": round(conversion_rate, 1),
        }
    }


@api_router.get("/admin/outreach/whatsapp/{contact_id}")
async def get_whatsapp_link(contact_id: str, auth: Dict[str, Any] = Depends(admin_dep)):
    """Generate WhatsApp link for a contact"""
    contact = await db.outreach_contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    mobile = contact.get("mobile", "")
    if not mobile:
        raise HTTPException(status_code=400, detail="Contact has no mobile number")
    
    # Ensure mobile has country code
    mobile_clean = re.sub(r"\D", "", mobile)
    if len(mobile_clean) == 10:
        mobile_clean = "91" + mobile_clean
    
    message = get_whatsapp_message(contact)
    encoded_message = requests.utils.quote(message)
    
    whatsapp_url = f"https://api.whatsapp.com/send?phone={mobile_clean}&text={encoded_message}"
    
    return {"whatsapp_url": whatsapp_url, "message": message}


@api_router.get("/admin/outreach/export")
async def export_outreach_contacts(auth: Dict[str, Any] = Depends(admin_dep)):
    """Export outreach contacts as CSV"""
    docs = await db.outreach_contacts.find({}, {"_id": 0}).to_list(50000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Name", "Email", "Mobile", "City", "Subspecialty", "Clinic Name",
        "Status", "Emails Sent", "Last Email Sent", "Opened At", "Clicked At",
        "Source", "Notes", "Created At"
    ])
    
    for d in docs:
        writer.writerow([
            d.get("name", ""),
            d.get("email", ""),
            d.get("mobile", ""),
            d.get("city", ""),
            d.get("subspecialty", ""),
            d.get("clinic_name", ""),
            d.get("status", ""),
            d.get("emails_sent", 0),
            d.get("last_email_sent", ""),
            d.get("email_opened_at", ""),
            d.get("link_clicked_at", ""),
            d.get("source", ""),
            d.get("notes", ""),
            d.get("created_at", ""),
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=outreach_contacts_{datetime.now().strftime('%Y%m%d')}.csv"}
    )


# -----------------------------
# Surgeon CRM & Zoho Desk Integration
# -----------------------------

class CRMContact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Basic Info
    name: str
    email: str = ""
    mobile: str
    city: str = ""
    subspecialty: str = ""
    clinic_name: str = ""
    
    # CRM Status
    crm_status: Literal["lead", "contacted", "interested", "registered", "active", "inactive"] = "lead"
    
    # Linking
    surgeon_id: Optional[str] = None  # Linked to registered surgeon
    zoho_contact_id: Optional[str] = None  # Zoho Desk contact ID
    zoho_ticket_ids: List[str] = Field(default_factory=list)
    
    # Communication
    last_contacted: Optional[str] = None
    last_response: Optional[str] = None
    preferred_channel: Literal["whatsapp", "email", "phone"] = "whatsapp"
    
    # Tags and Notes
    tags: List[str] = Field(default_factory=list)
    notes: str = ""
    
    # Activity Log
    activities: List[Dict[str, Any]] = Field(default_factory=list)
    
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class BroadcastMessage(BaseModel):
    contact_ids: List[str]
    channel: Literal["whatsapp", "email", "both"] = "whatsapp"
    message_type: Literal["promotion", "cme_update", "conference", "general"] = "general"
    subject: str = ""  # For email
    message: str


@api_router.get("/admin/crm/contacts")
async def get_crm_contacts(
    status: Optional[str] = None,
    tag: Optional[str] = None,
    auth: Dict[str, Any] = Depends(admin_dep)
):
    """Get all CRM contacts with filters"""
    query = {}
    if status:
        query["crm_status"] = status
    if tag:
        query["tags"] = tag
    
    docs = await db.crm_contacts.find(query, {"_id": 0}).sort("updated_at", -1).to_list(10000)
    return docs


@api_router.post("/admin/crm/contacts")
async def create_crm_contact(
    name: str,
    mobile: str,
    email: str = "",
    city: str = "",
    subspecialty: str = "",
    clinic_name: str = "",
    tags: str = "",
    notes: str = "",
    auth: Dict[str, Any] = Depends(admin_dep)
):
    """Create a new CRM contact"""
    mobile_clean = re.sub(r"\D", "", mobile)[-10:]
    
    # Check if already exists
    existing = await db.crm_contacts.find_one({"mobile": mobile_clean})
    if existing:
        raise HTTPException(status_code=400, detail="Contact with this mobile already exists")
    
    # Check if registered surgeon
    surgeon = await db.surgeons.find_one({"mobile": mobile_clean}, {"_id": 0, "id": 1, "name": 1, "status": 1})
    
    contact = CRMContact(
        name=name.strip(),
        email=email.strip().lower() if email else "",
        mobile=mobile_clean,
        city=city.strip(),
        subspecialty=subspecialty.strip(),
        clinic_name=clinic_name.strip(),
        tags=[t.strip() for t in tags.split(",") if t.strip()] if tags else [],
        notes=notes.strip(),
        surgeon_id=surgeon["id"] if surgeon else None,
        crm_status="registered" if surgeon else "lead",
    )
    
    # Add creation activity
    contact.activities.append({
        "type": "created",
        "timestamp": now_iso(),
        "details": "Contact added to CRM"
    })
    
    await db.crm_contacts.insert_one(contact.model_dump())
    
    return {"ok": True, "id": contact.id, "linked_surgeon": surgeon is not None}


@api_router.patch("/admin/crm/contacts/{contact_id}")
async def update_crm_contact(
    contact_id: str,
    crm_status: Optional[str] = None,
    tags: Optional[str] = None,
    notes: Optional[str] = None,
    auth: Dict[str, Any] = Depends(admin_dep)
):
    """Update CRM contact"""
    update = {"updated_at": now_iso()}
    
    if crm_status:
        update["crm_status"] = crm_status
    if tags is not None:
        update["tags"] = [t.strip() for t in tags.split(",") if t.strip()]
    if notes is not None:
        update["notes"] = notes
    
    result = await db.crm_contacts.update_one({"id": contact_id}, {"$set": update})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    return {"ok": True}


@api_router.post("/admin/crm/contacts/{contact_id}/activity")
async def add_crm_activity(
    contact_id: str,
    activity_type: str,
    details: str,
    auth: Dict[str, Any] = Depends(admin_dep)
):
    """Add activity to contact"""
    activity = {
        "type": activity_type,
        "timestamp": now_iso(),
        "details": details,
    }
    
    result = await db.crm_contacts.update_one(
        {"id": contact_id},
        {
            "$push": {"activities": activity},
            "$set": {"updated_at": now_iso()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    return {"ok": True}


@api_router.get("/admin/crm/zoho/channels")
async def get_zoho_channels(auth: Dict[str, Any] = Depends(admin_dep)):
    """Get available Zoho Desk channels including WhatsApp"""
    result = await zoho_desk_request("GET", "/channels")
    if "error" in result:
        return {"ok": False, "error": result.get("error")}
    
    channels = result.get("data", [])
    whatsapp_channels = [c for c in channels if c.get("mappedIntegration") == "WHATSAPP"]
    
    return {
        "ok": True,
        "all_channels": channels,
        "whatsapp_channels": whatsapp_channels,
    }


@api_router.post("/admin/crm/zoho/send-whatsapp")
async def send_whatsapp_via_zoho(
    contact_id: str,
    message: str,
    auth: Dict[str, Any] = Depends(admin_dep)
):
    """Send WhatsApp message via Zoho Desk"""
    contact = await db.crm_contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    mobile = contact.get("mobile", "")
    if not mobile:
        raise HTTPException(status_code=400, detail="Contact has no mobile number")
    
    # Ensure country code
    mobile_clean = re.sub(r"\D", "", mobile)
    if len(mobile_clean) == 10:
        mobile_clean = "91" + mobile_clean
    
    # Personalize message
    name = contact.get("name", "Doctor")
    if name.lower().startswith("dr."):
        name = name[3:].strip()
    personalized_message = message.replace("{name}", name).replace("{doctor_name}", f"Dr. {name}")
    
    # First, ensure contact exists in Zoho Desk
    zoho_contact_id = contact.get("zoho_contact_id")
    if not zoho_contact_id:
        # Create contact in Zoho
        zoho_data = {
            "lastName": contact["name"],
            "email": contact.get("email"),
            "phone": mobile_clean,
        }
        create_result = await zoho_desk_request("POST", "/contacts", zoho_data)
        if "error" not in create_result:
            zoho_contact_id = create_result.get("id")
            await db.crm_contacts.update_one(
                {"id": contact_id},
                {"$set": {"zoho_contact_id": zoho_contact_id}}
            )
    
    # Create a ticket with WhatsApp channel for outbound message
    # Note: Zoho Desk WhatsApp requires the contact to have initiated conversation first
    # For outbound, we'll create a ticket that can be followed up
    ticket_data = {
        "subject": f"WhatsApp Outreach: {contact['name']}",
        "description": personalized_message,
        "departmentId": "62982000000010772",  # agileorthopedicspvtltd
        "contactId": zoho_contact_id,
        "phone": mobile_clean,
        "channel": "SANDBOX",  # WhatsApp channel code
        "status": "Open",
    }
    
    result = await zoho_desk_request("POST", "/tickets", ticket_data)
    
    if "error" in result:
        # If ticket creation fails, return WhatsApp web link as fallback
        encoded_msg = requests.utils.quote(personalized_message)
        return {
            "ok": False, 
            "error": result.get("error"),
            "fallback_url": f"https://api.whatsapp.com/send?phone={mobile_clean}&text={encoded_msg}"
        }
    
    # Log activity
    await db.crm_contacts.update_one(
        {"id": contact_id},
        {
            "$push": {
                "activities": {
                    "type": "whatsapp_sent",
                    "timestamp": now_iso(),
                    "details": personalized_message[:100] + "..." if len(personalized_message) > 100 else personalized_message,
                    "ticket_id": result.get("id"),
                }
            },
            "$set": {"last_contacted": now_iso(), "updated_at": now_iso()}
        }
    )
    
    return {"ok": True, "ticket_id": result.get("id"), "ticket_number": result.get("ticketNumber")}


@api_router.post("/admin/crm/zoho/bulk-whatsapp")
async def send_bulk_whatsapp_via_zoho(
    contact_ids: List[str],
    message: str,
    auth: Dict[str, Any] = Depends(admin_dep)
):
    """Send WhatsApp message to multiple contacts via Zoho Desk"""
    results = {"sent": 0, "failed": 0, "fallback_links": []}
    
    for contact_id in contact_ids:
        contact = await db.crm_contacts.find_one({"id": contact_id}, {"_id": 0})
        if not contact or not contact.get("mobile"):
            results["failed"] += 1
            continue
        
        mobile = contact.get("mobile", "")
        mobile_clean = re.sub(r"\D", "", mobile)
        if len(mobile_clean) == 10:
            mobile_clean = "91" + mobile_clean
        
        # Personalize
        name = contact.get("name", "Doctor")
        if name.lower().startswith("dr."):
            name = name[3:].strip()
        personalized = message.replace("{name}", name).replace("{doctor_name}", f"Dr. {name}")
        
        # Generate WhatsApp link (since Zoho WhatsApp requires prior conversation)
        encoded = requests.utils.quote(personalized)
        results["fallback_links"].append({
            "contact_id": contact_id,
            "name": contact.get("name"),
            "mobile": mobile_clean,
            "whatsapp_url": f"https://api.whatsapp.com/send?phone={mobile_clean}&text={encoded}"
        })
        
        # Log activity
        await db.crm_contacts.update_one(
            {"id": contact_id},
            {
                "$push": {
                    "activities": {
                        "type": "whatsapp_link_generated",
                        "timestamp": now_iso(),
                        "details": "WhatsApp link generated for bulk send",
                    }
                },
                "$set": {"updated_at": now_iso()}
            }
        )
        results["sent"] += 1
    
    return results


@api_router.post("/admin/crm/import-surgeons")
async def import_surgeons_to_crm(auth: Dict[str, Any] = Depends(admin_dep)):
    """Import all registered surgeons into CRM"""
    surgeons = await db.surgeons.find({}, {"_id": 0}).to_list(10000)
    
    imported = 0
    skipped = 0
    
    for s in surgeons:
        mobile = s.get("mobile", "")
        if not mobile:
            skipped += 1
            continue
        
        # Check if already in CRM
        existing = await db.crm_contacts.find_one({"mobile": mobile})
        if existing:
            # Update link if needed
            if not existing.get("surgeon_id"):
                await db.crm_contacts.update_one(
                    {"mobile": mobile},
                    {"$set": {"surgeon_id": s["id"], "crm_status": "registered"}}
                )
            skipped += 1
            continue
        
        # Get location info
        locs = s.get("locations", [])
        loc = locs[0] if locs else {}
        
        contact = CRMContact(
            name=s.get("name", "Unknown"),
            email=s.get("email", ""),
            mobile=mobile,
            city=loc.get("city", ""),
            subspecialty=", ".join(s.get("subspecialties", [])),
            clinic_name=loc.get("facility_name", ""),
            surgeon_id=s["id"],
            crm_status="active" if s.get("status") == "approved" else "registered",
            tags=["imported", s.get("status", "")],
        )
        
        contact.activities.append({
            "type": "imported",
            "timestamp": now_iso(),
            "details": f"Imported from surgeons database (status: {s.get('status')})"
        })
        
        await db.crm_contacts.insert_one(contact.model_dump())
        imported += 1
    
    return {"imported": imported, "skipped": skipped}


@api_router.get("/admin/crm/stats")
async def get_crm_stats(auth: Dict[str, Any] = Depends(admin_dep)):
    """Get CRM statistics"""
    total = await db.crm_contacts.count_documents({})
    
    by_status = {}
    for status in ["lead", "contacted", "interested", "registered", "active", "inactive"]:
        by_status[status] = await db.crm_contacts.count_documents({"crm_status": status})
    
    # Get top tags
    pipeline = [
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    tags_result = await db.crm_contacts.aggregate(pipeline).to_list(10)
    top_tags = [{"tag": t["_id"], "count": t["count"]} for t in tags_result]
    
    # Get top cities
    pipeline = [
        {"$match": {"city": {"$ne": ""}}},
        {"$group": {"_id": "$city", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    cities_result = await db.crm_contacts.aggregate(pipeline).to_list(10)
    top_cities = [{"city": c["_id"], "count": c["count"]} for c in cities_result]
    
    return {
        "total": total,
        "by_status": by_status,
        "top_tags": top_tags,
        "top_cities": top_cities,
    }


# Zoho Desk Integration Endpoints

@api_router.get("/admin/crm/zoho/test")
async def test_zoho_connection(auth: Dict[str, Any] = Depends(admin_dep)):
    """Test Zoho Desk API connection"""
    result = await zoho_desk_request("GET", "/departments")
    if "error" in result:
        return {"connected": False, "error": result.get("error")}
    return {"connected": True, "departments": result.get("data", [])}


@api_router.post("/admin/crm/zoho/sync-contact/{contact_id}")
async def sync_contact_to_zoho(contact_id: str, auth: Dict[str, Any] = Depends(admin_dep)):
    """Create or update contact in Zoho Desk"""
    contact = await db.crm_contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Parse name into first/last
    name = contact.get("name", "Unknown")
    name_parts = name.replace("Dr.", "").replace("DR.", "").strip().split()
    first_name = name_parts[0] if name_parts else "Doctor"
    last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else name
    
    # Ensure phone has country code
    mobile = contact.get("mobile", "")
    if mobile and len(mobile) == 10:
        mobile = "91" + mobile
    
    # Prepare Zoho contact data
    zoho_data = {
        "firstName": first_name,
        "lastName": last_name,
        "email": contact.get("email") or None,
        "phone": mobile or None,
        "mobile": mobile or None,
        "city": contact.get("city", ""),
        "description": f"Subspecialty: {contact.get('subspecialty', '')}. {contact.get('notes', '')}".strip(),
    }
    
    # Remove None values
    zoho_data = {k: v for k, v in zoho_data.items() if v}
    
    # Check if already synced
    if contact.get("zoho_contact_id"):
        # Update existing
        result = await zoho_desk_request("PATCH", f"/contacts/{contact['zoho_contact_id']}", zoho_data)
    else:
        # Create new
        result = await zoho_desk_request("POST", "/contacts", zoho_data)
    
    if "error" in result:
        return {"ok": False, "error": result.get("error")}
    
    # Save Zoho contact ID and web URL
    zoho_id = result.get("id") or contact.get("zoho_contact_id")
    zoho_web_url = result.get("webUrl", "")
    
    if zoho_id:
        await db.crm_contacts.update_one(
            {"id": contact_id},
            {"$set": {
                "zoho_contact_id": zoho_id, 
                "zoho_web_url": zoho_web_url,
                "updated_at": now_iso()
            }}
        )
    
    return {
        "ok": True, 
        "zoho_contact_id": zoho_id,
        "zoho_web_url": zoho_web_url,
        "desk_url": f"https://desk.zoho.in/support/agileortho/ShowHomePage.do#Contacts/dv/{zoho_id}"
    }


@api_router.post("/admin/crm/zoho/create-ticket/{contact_id}")
async def create_zoho_ticket(
    contact_id: str,
    subject: str,
    description: str,
    department_id: Optional[str] = None,
    auth: Dict[str, Any] = Depends(admin_dep)
):
    """Create a ticket in Zoho Desk for a contact"""
    contact = await db.crm_contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Get departments if not provided
    if not department_id:
        depts = await zoho_desk_request("GET", "/departments")
        if depts.get("data"):
            department_id = depts["data"][0]["id"]
    
    ticket_data = {
        "subject": subject,
        "description": description,
        "departmentId": department_id,
        "contactId": contact.get("zoho_contact_id"),
        "email": contact.get("email"),
        "phone": contact.get("mobile"),
    }
    
    result = await zoho_desk_request("POST", "/tickets", ticket_data)
    
    if "error" in result:
        return {"ok": False, "error": result.get("error")}
    
    # Save ticket ID to contact
    ticket_id = result.get("id")
    if ticket_id:
        await db.crm_contacts.update_one(
            {"id": contact_id},
            {
                "$push": {"zoho_ticket_ids": ticket_id},
                "$set": {"updated_at": now_iso()}
            }
        )
    
    return {"ok": True, "ticket_id": ticket_id}


@api_router.post("/admin/crm/zoho/bulk-sync")
async def bulk_sync_to_zoho(
    limit: int = 50,
    auth: Dict[str, Any] = Depends(admin_dep)
):
    """Bulk sync contacts to Zoho Desk"""
    # Get unsynced contacts with mobile numbers (zoho_contact_id is None or doesn't exist)
    contacts = await db.crm_contacts.find(
        {
            "$or": [
                {"zoho_contact_id": {"$exists": False}},
                {"zoho_contact_id": None}
            ],
            "mobile": {"$ne": ""}
        },
        {"_id": 0}
    ).limit(limit).to_list(limit)
    
    synced = 0
    failed = 0
    results = []
    
    for contact in contacts:
        # Parse name
        name = contact.get("name", "Unknown")
        name_parts = name.replace("Dr.", "").replace("DR.", "").strip().split()
        first_name = name_parts[0] if name_parts else "Doctor"
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else name
        
        # Ensure phone has country code
        mobile = contact.get("mobile", "")
        if mobile and len(mobile) == 10:
            mobile = "91" + mobile
        
        # Validate email
        email = contact.get("email", "")
        if email and ("@" not in email or "." not in email.split("@")[-1]):
            email = None  # Invalid email, skip it
        
        zoho_data = {
            "firstName": first_name,
            "lastName": last_name,
            "phone": mobile or None,
            "mobile": mobile or None,
            "city": contact.get("city", ""),
        }
        
        # Only add email if valid
        if email:
            zoho_data["email"] = email
            
        zoho_data = {k: v for k, v in zoho_data.items() if v}
        
        result = await zoho_desk_request("POST", "/contacts", zoho_data)
        
        if "error" not in result and result.get("id"):
            zoho_id = result["id"]
            zoho_url = result.get("webUrl", f"https://desk.zoho.in/support/agileortho/ShowHomePage.do#Contacts/dv/{zoho_id}")
            
            await db.crm_contacts.update_one(
                {"id": contact["id"]},
                {"$set": {
                    "zoho_contact_id": zoho_id,
                    "zoho_web_url": zoho_url,
                    "updated_at": now_iso()
                }}
            )
            synced += 1
            results.append({"name": contact.get("name"), "zoho_id": zoho_id, "status": "synced"})
        else:
            failed += 1
            results.append({"name": contact.get("name"), "status": "failed", "error": result.get("error", "Unknown")})
    
    return {"synced": synced, "failed": failed, "total": len(contacts), "results": results[:10]}


@api_router.get("/admin/crm/zoho/whatsapp-url/{contact_id}")
async def get_zoho_whatsapp_url(contact_id: str, auth: Dict[str, Any] = Depends(admin_dep)):
    """Get Zoho Desk URL to send WhatsApp to this contact"""
    contact = await db.crm_contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    zoho_id = contact.get("zoho_contact_id")
    if not zoho_id:
        return {"ok": False, "error": "Contact not synced to Zoho Desk. Sync first."}
    
    # Zoho Desk IM send URL
    desk_url = f"https://desk.zoho.in/support/agileortho/ShowHomePage.do#Contacts/dv/{zoho_id}"
    im_url = f"https://desk.zoho.in/support/agileortho/im?action=sendWhatsApp&contactId={zoho_id}"
    
    return {
        "ok": True,
        "contact_name": contact.get("name"),
        "zoho_contact_id": zoho_id,
        "desk_url": desk_url,
        "whatsapp_send_url": im_url,
    }


@api_router.post("/admin/crm/broadcast")
async def send_broadcast(payload: BroadcastMessage, auth: Dict[str, Any] = Depends(admin_dep)):
    """Send broadcast message to multiple contacts"""
    results = {"sent": 0, "failed": 0, "details": []}
    
    for contact_id in payload.contact_ids:
        contact = await db.crm_contacts.find_one({"id": contact_id}, {"_id": 0})
        if not contact:
            results["failed"] += 1
            continue
        
        success = False
        
        # Send via email
        if payload.channel in ["email", "both"] and contact.get("email"):
            subject = payload.subject or f"Update from OrthoConnect: {payload.message_type.replace('_', ' ').title()}"
            html = generate_broadcast_email(contact, payload.message, payload.message_type)
            success = send_email(contact["email"], subject, html)
        
        # Log activity
        if success or payload.channel == "whatsapp":
            await db.crm_contacts.update_one(
                {"id": contact_id},
                {
                    "$push": {
                        "activities": {
                            "type": f"broadcast_{payload.message_type}",
                            "timestamp": now_iso(),
                            "channel": payload.channel,
                            "details": payload.message[:100],
                        }
                    },
                    "$set": {"last_contacted": now_iso(), "updated_at": now_iso()}
                }
            )
            results["sent"] += 1
        else:
            results["failed"] += 1
    
    return results


def generate_broadcast_email(contact: dict, message: str, message_type: str) -> str:
    """Generate broadcast email HTML"""
    name = contact.get("name", "Doctor")
    
    type_titles = {
        "promotion": "Special Update",
        "cme_update": "CME/Conference Update",
        "conference": "Conference Announcement",
        "general": "Update from OrthoConnect",
    }
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.8; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">OrthoConnect</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">{type_titles.get(message_type, 'Update')}</p>
                </div>
                
                <div style="padding: 40px 30px;">
                    <p>Dear Dr. {name},</p>
                    <div style="white-space: pre-wrap;">{message}</div>
                    <p style="margin-top: 30px;">Best regards,<br>Team OrthoConnect</p>
                </div>
                
                <div style="background: #f1f5f9; padding: 20px 30px; text-align: center; color: #64748b; font-size: 12px;">
                    <p style="margin: 0;">OrthoConnect — An initiative of AgileOrtho</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """


@api_router.get("/admin/crm/whatsapp-broadcast-links")
async def get_whatsapp_broadcast_links(
    contact_ids: str,
    message: str,
    auth: Dict[str, Any] = Depends(admin_dep)
):
    """Generate WhatsApp broadcast links for multiple contacts"""
    ids = [i.strip() for i in contact_ids.split(",")]
    links = []
    
    for contact_id in ids:
        contact = await db.crm_contacts.find_one({"id": contact_id}, {"_id": 0, "name": 1, "mobile": 1})
        if not contact or not contact.get("mobile"):
            continue
        
        mobile = contact["mobile"]
        if len(mobile) == 10:
            mobile = "91" + mobile
        
        # Personalize message
        name = contact.get("name", "Doctor")
        if name.lower().startswith("dr."):
            name = name[3:].strip()
        
        personalized = message.replace("{name}", name).replace("{doctor_name}", f"Dr. {name}")
        encoded = requests.utils.quote(personalized)
        
        links.append({
            "contact_id": contact_id,
            "name": contact.get("name"),
            "mobile": contact.get("mobile"),
            "whatsapp_url": f"https://api.whatsapp.com/send?phone={mobile}&text={encoded}"
        })
    
    return {"links": links}


@app.on_event("startup")
async def ensure_indexes():
    try:
        # Migration safety: if older docs stored email as null, remove the field
        await db.users.update_many({"email": None}, {"$unset": {"email": ""}})

        # If an older non-sparse unique index exists, drop it and recreate with a safe partial filter.
        try:
            idx = await db.users.index_information()
            if "email_1" in idx:
                await db.users.drop_index("email_1")
        except Exception:
            pass

        await db.users.create_index(
            "email",
            unique=True,
            partialFilterExpression={"email": {"$type": "string"}},
        )
        await db.users.create_index(
            "mobile",
            unique=True,
            partialFilterExpression={"mobile": {"$type": "string"}},
        )

        await db.otp_codes.create_index([("mobile", 1), ("created_at", -1)])
        await db.otp_codes.create_index("expires_at")

        await db.geo_cache.create_index("query", unique=True)

        await db.surgeons.create_index("slug", unique=True)
        await db.surgeons.create_index("status")
        await db.surgeons.create_index("subspecialties")
        await db.surgeons.create_index([("locations.geo", "2dsphere")])
        await db.surgeons.create_index([("clinic.geo", "2dsphere")])
        await db.surgeons.create_index("user_id")
    except Exception as e:
        logger.warning("Index creation warning: %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# -----------------------------
# Include Router and Middleware (MUST BE AT END after all routes are defined)
# -----------------------------

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
