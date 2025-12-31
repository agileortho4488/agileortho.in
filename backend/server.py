from __future__ import annotations

import os
import re
import uuid
import math
import logging
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
from fastapi.responses import FileResponse
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

SurgeonStatus = Literal["pending", "approved", "rejected"]


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
    qualifications: str
    registration_number: str
    subspecialties: List[str] = Field(default_factory=list)
    about: str = ""
    conditions_treated: List[str] = Field(default_factory=list)
    procedures_performed: List[str] = Field(default_factory=list)
    locations: List[Location] = Field(default_factory=list)


# -----------------------------
# Meta / constants
# -----------------------------

SUBSPECIALTIES = ["Shoulder", "Elbow", "Hand", "Hip", "Knee", "Oncology", "Paediatrics"]

# synonym phrases (very lightweight)
SUBSPECIALTY_SYNONYMS: Dict[str, str] = {
    "shoulder": "Shoulder",
    "shoulder specialist": "Shoulder",
    "elbow": "Elbow",
    "hand": "Hand",
    "hand & wrist": "Hand",
    "wrist": "Hand",
    "hip": "Hip",
    "knee": "Knee",
    "joint replacement": "Hip",
    "oncology": "Oncology",
    "bone cancer": "Oncology",
    "kids ortho": "Paediatrics",
    "pediatric": "Paediatrics",
    "paediatric": "Paediatrics",
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
# Mocked OTP auth (MVP)
# -----------------------------

OTP_TTL_MINUTES = int(os.environ.get("OTP_TTL_MINUTES", "5"))


def normalize_mobile(mobile: str) -> str:
    m = re.sub(r"\D", "", mobile or "")
    # keep last 10 digits for India-style mobile
    if len(m) > 10:
        m = m[-10:]
    return m


def generate_otp() -> str:
    return f"{uuid.uuid4().int % 1000000:06d}"


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

    # MVP: return OTP in response (MOCKED)
    return {"ok": True, "mobile": mobile, "mocked_otp": code, "ttl_minutes": OTP_TTL_MINUTES}


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
        "qualifications": doc.get("qualifications", ""),
        "registration_number": doc.get("registration_number", ""),
        "subspecialties": doc.get("subspecialties", []),
        "about": doc.get("about", ""),
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

    if existing:
        await db.surgeons.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "updated_at": now_iso(),
                    "status": "pending",  # re-review on changes
                    "name": user.get("name", ""),
                    "qualifications": payload.qualifications.strip(),
                    "registration_number": payload.registration_number.strip(),
                    "subspecialties": subs_list,
                    "about": payload.about.strip(),
                    "conditions_treated": [c.strip() for c in payload.conditions_treated if c.strip()],
                    "procedures_performed": [p.strip() for p in payload.procedures_performed if p.strip()],
                    "locations": locations,
                }
            },
        )
        return {"ok": True, "id": existing["id"], "status": "pending"}

    surgeon_id = str(uuid.uuid4())
    upload_token = str(uuid.uuid4())
    slug = make_slug(name=user.get("name", ""), primary_sub=(subs_list[0] if subs_list else None), city=locations[0].get("city"))

    doc = {
        "id": surgeon_id,
        "user_id": user_id,
        "slug": slug,
        "status": "pending",
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "upload_token": upload_token,
        "rejection_reason": None,
        "name": user.get("name", ""),
        "qualifications": payload.qualifications.strip(),
        "registration_number": payload.registration_number.strip(),
        "subspecialties": subs_list,
        "about": payload.about.strip(),
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


# Include router
app.include_router(api_router)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def ensure_indexes():
    try:
        await db.users.create_index("email", unique=True, sparse=True)
        await db.users.create_index("mobile", unique=True, sparse=True)
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
