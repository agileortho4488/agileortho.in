from __future__ import annotations

import os
import re
import uuid
import math
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Literal, Optional

import jwt
import requests
from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    Depends,
    FastAPI,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
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
    # keep title-case but preserve known uppercase abbreviations if ever used
    return v.title()


def is_pincode(value: str) -> bool:
    return bool(re.fullmatch(r"\d{6}", (value or "").strip()))


def make_slug(name: str, primary_sub: Optional[str], city: Optional[str]) -> str:
    base_parts = [name, primary_sub or None, city or None]
    base = " ".join([p for p in base_parts if p and p.strip()])
    base = slugify(base)[:60] or "surgeon"
    return f"{base}-{str(uuid.uuid4())[:4]}"


def encode_admin_token() -> str:
    payload = {
        "sub": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXP_MINUTES),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_admin_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(status_code=401, detail="Admin session expired") from e
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid admin token") from e


def require_admin(authorization: Optional[str] = None) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing admin token")
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_admin_token(token)
    if payload.get("sub") != "admin":
        raise HTTPException(status_code=401, detail="Invalid admin token")
    return payload


# Dependency wrapper to access headers
from fastapi import Header  # noqa: E402


async def admin_dep(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    return require_admin(authorization)


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


class Document(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str = "other"  # registration|degree|other
    filename: str
    path: str
    uploaded_at: str = Field(default_factory=now_iso)


class FileRef(BaseModel):
    model_config = ConfigDict(extra="ignore")

    path: str
    filename: str


class SurgeonBase(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    qualifications: str
    registration_number: str

    subspecialties: List[str] = Field(default_factory=list)

    about: str = ""
    conditions_treated: List[str] = Field(default_factory=list)
    procedures_performed: List[str] = Field(default_factory=list)

    clinic: Clinic


class SurgeonCreate(SurgeonBase):
    profile_photo: Optional[UploadFile] = None  # handled separately via multipart


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

    clinic: Clinic
    profile_photo_url: Optional[str] = None


class SurgeonAdmin(SurgeonPublic):
    upload_token: str
    documents: List[Document] = Field(default_factory=list)
    created_at: str
    updated_at: str
    rejection_reason: Optional[str] = None


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
    clinic: Clinic
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

    clinic_address: Optional[str] = None
    clinic_city: Optional[str] = None
    clinic_pincode: Optional[str] = None
    clinic_opd_timings: Optional[str] = None
    clinic_phone: Optional[str] = None


# -----------------------------
# Meta / constants
# -----------------------------

SUBSPECIALTIES = [
    "Shoulder",
    "Elbow",
    "Hand",
    "Hip",
    "Knee",
    "Oncology",
    "Paediatrics",
]


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

    # Cache first
    cached = await db.geo_cache.find_one({"query": q}, {"_id": 0})
    if cached and "lat" in cached and "lng" in cached:
        return {"lat": float(cached["lat"]), "lng": float(cached["lng"])}

    try:
        # Nominatim usage policy: provide a User-Agent
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
# Public surgeon endpoints
# -----------------------------


@api_router.post("/surgeons", response_model=SurgeonCreateResponse)
async def create_surgeon(
    name: str = Field(..., alias="name"),
):
    # This endpoint is implemented as multipart in the actual join flow.
    # Keeping a JSON-friendly signature is hard with file uploads, so we accept multipart in a separate route.
    raise HTTPException(status_code=415, detail="Use /api/surgeons/join (multipart)")


@api_router.post("/surgeons/join", response_model=SurgeonCreateResponse)
async def join_as_surgeon(
    name: str = Field(...),
    qualifications: str = Field(...),
    registration_number: str = Field(...),
    subspecialties: str = Field(default=""),  # comma separated
    about: str = Field(default=""),
    conditions_treated: str = Field(default=""),  # comma separated
    procedures_performed: str = Field(default=""),  # comma separated
    clinic_address: str = Field(...),
    clinic_city: str = Field(default=""),
    clinic_pincode: str = Field(...),
    clinic_opd_timings: str = Field(default=""),
    clinic_phone: str = Field(default=""),
    profile_photo: Optional[UploadFile] = File(default=None),
):
    # Basic validation
    if not registration_number.strip():
        raise HTTPException(status_code=400, detail="Medical registration number is required")

    subs_list = [normalize_subspecialty(s) for s in subspecialties.split(",") if s.strip()]
    subs_list = [s for s in subs_list if s]
    if not subs_list:
        subs_list = []

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
        content = await profile_photo.read()
        dest_path.write_bytes(content)
        photo_ref = {"path": str(dest_path), "filename": safe_name}

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
        "clinic": {
            "address": clinic_address.strip(),
            "city": clinic_city.strip(),
            "pincode": clinic_pincode.strip(),
            "opd_timings": clinic_opd_timings.strip(),
            "phone": clinic_phone.strip(),
            "geo": geo_point,
        },
        "profile_photo": photo_ref,
        "documents": [],
    }

    await db.surgeons.insert_one(doc)
    return SurgeonCreateResponse(id=surgeon_id, slug=slug, status="pending", upload_token=upload_token)


@api_router.post("/surgeons/{surgeon_id}/documents")
async def upload_surgeon_documents(
    surgeon_id: str,
    upload_token: str = Header(default="", alias="X-Upload-Token"),
    doc_type: str = Field(default="other"),
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


@api_router.get("/surgeons/search", response_model=List[SurgeonSearchResult])
async def search_surgeons(
    location: str,
    radius_km: float = 10.0,
    subspecialty: Optional[str] = None,
):
    loc = (location or "").strip()
    if not loc:
        raise HTTPException(status_code=400, detail="location is required")

    subs = normalize_subspecialty(subspecialty or "")

    query: Dict[str, Any] = {"status": "approved"}
    if subs:
        query["subspecialties"] = {"$in": [subs]}

    # Geo search first (pincode best)
    geo = await geocode_location(loc)
    if geo:
        radius_km = max(1.0, min(float(radius_km), 100.0))
        radius_radians = radius_km / 6378.1
        query_geo = {
            **query,
            "clinic.geo": {
                "$geoWithin": {"$centerSphere": [[geo["lng"], geo["lat"]], radius_radians]}
            },
        }
        docs = await db.surgeons.find(query_geo, {"_id": 0}).limit(200).to_list(200)

        results: List[SurgeonSearchResult] = []
        for d in docs:
            dist_km = None
            try:
                pt = (d.get("clinic") or {}).get("geo")
                if pt and pt.get("type") == "Point":
                    lng, lat = pt.get("coordinates", [None, None])
                    if lng is not None and lat is not None:
                        # Haversine
                        r = 6371.0
                        phi1 = math.radians(geo["lat"])
                        phi2 = math.radians(float(lat))
                        dphi = math.radians(float(lat) - geo["lat"])
                        dlambda = math.radians(float(lng) - geo["lng"])
                        a = (
                            math.sin(dphi / 2) ** 2
                            + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
                        )
                        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                        dist_km = round(r * c, 1)
            except Exception:
                dist_km = None

            results.append(
                SurgeonSearchResult(
                    id=d["id"],
                    slug=d["slug"],
                    name=d.get("name", ""),
                    qualifications=d.get("qualifications", ""),
                    subspecialties=d.get("subspecialties", []),
                    clinic=Clinic(**(d.get("clinic") or {})),
                    distance_km=dist_km,
                )
            )

        # Distance sort if available
        results.sort(key=lambda x: (x.distance_km is None, x.distance_km or 9999, x.name.lower()))
        return results

    # Fallback to simple text match
    safe = re.escape(loc)
    query_text = {
        **query,
        "$or": [
            {"clinic.city": {"$regex": safe, "$options": "i"}},
            {"clinic.address": {"$regex": safe, "$options": "i"}},
            {"clinic.pincode": {"$regex": safe, "$options": "i"}},
        ],
    }
    docs = await db.surgeons.find(query_text, {"_id": 0}).limit(200).to_list(200)
    return [
        SurgeonSearchResult(
            id=d["id"],
            slug=d["slug"],
            name=d.get("name", ""),
            qualifications=d.get("qualifications", ""),
            subspecialties=d.get("subspecialties", []),
            clinic=Clinic(**(d.get("clinic") or {})),
            distance_km=None,
        )
        for d in docs
    ]


@api_router.get("/surgeons/by-slug/{slug}", response_model=SurgeonPublic)
async def get_surgeon_by_slug(slug: str):
    doc = await db.surgeons.find_one({"slug": slug, "status": "approved"}, {"_id": 0, "upload_token": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Surgeon not found")

    photo_url = None
    if doc.get("profile_photo") and doc["profile_photo"].get("path"):
        # served via admin download only in MVP; keep public photo hidden unless needed
        photo_url = None

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
        clinic=Clinic(**(doc.get("clinic") or {})),
        profile_photo_url=photo_url,
    )


# -----------------------------
# Admin endpoints
# -----------------------------


@api_router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login(payload: AdminLoginRequest):
    if payload.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Incorrect password")
    return AdminLoginResponse(token=encode_admin_token())


@api_router.get("/admin/surgeons", response_model=List[SurgeonAdmin])
async def admin_list_surgeons(status: Optional[SurgeonStatus] = None, _: Dict[str, Any] = Depends(admin_dep)):
    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    docs = await db.surgeons.find(query, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)
    out: List[SurgeonAdmin] = []
    for d in docs:
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
                clinic=Clinic(**(d.get("clinic") or {})),
                profile_photo_url=None,
                upload_token=d.get("upload_token", ""),
                documents=[Document(**doc) for doc in d.get("documents", [])],
                created_at=d.get("created_at", ""),
                updated_at=d.get("updated_at", ""),
                rejection_reason=d.get("rejection_reason"),
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

    # Clinic updates
    clinic_update: Dict[str, Any] = {}
    if payload.clinic_address is not None:
        clinic_update["clinic.address"] = payload.clinic_address
    if payload.clinic_city is not None:
        clinic_update["clinic.city"] = payload.clinic_city
    if payload.clinic_pincode is not None:
        clinic_update["clinic.pincode"] = payload.clinic_pincode
    if payload.clinic_opd_timings is not None:
        clinic_update["clinic.opd_timings"] = payload.clinic_opd_timings
    if payload.clinic_phone is not None:
        clinic_update["clinic.phone"] = payload.clinic_phone

    # If pincode changed, re-geocode
    if payload.clinic_pincode is not None and payload.clinic_pincode.strip():
        geo = await geocode_location(payload.clinic_pincode.strip())
        if geo:
            clinic_update["clinic.geo"] = {"type": "Point", "coordinates": [geo["lng"], geo["lat"]]}

    combined = {"$set": {**update, **clinic_update}}
    await db.surgeons.update_one({"id": surgeon_id}, combined)
    return {"ok": True}


@api_router.get("/admin/documents/{doc_id}/download")
async def admin_download_document(doc_id: str, _: Dict[str, Any] = Depends(admin_dep)):
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
        await db.surgeons.create_index("slug", unique=True)
        await db.surgeons.create_index("status")
        await db.surgeons.create_index("subspecialties")
        await db.surgeons.create_index([("clinic.geo", "2dsphere")])
        await db.geo_cache.create_index("query", unique=True)
    except Exception as e:
        logger.warning("Index creation warning: %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
