from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os
import jwt
import hashlib
import motor.motor_asyncio
import uuid
import math
import json
import asyncio
import pdfplumber
import tempfile

app = FastAPI(title="MedDevice Pro API")

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if CORS_ORIGINS == "*" else CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
JWT_SECRET = os.environ.get("JWT_SECRET")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections
products_col = db["products"]
leads_col = db["leads"]
conversations_col = db["conversations"]
admins_col = db["admins"]
imports_col = db["pdf_imports"]


# --- Pydantic Models ---

class AdminLogin(BaseModel):
    username: str = "admin"
    password: str

class LeadCreate(BaseModel):
    name: str
    hospital_clinic: str = ""
    phone_whatsapp: str
    email: str = ""
    district: str = ""
    inquiry_type: str = "General"
    source: str = "website"
    product_interest: str = ""
    message: str = ""

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    hospital_clinic: Optional[str] = None
    phone_whatsapp: Optional[str] = None
    email: Optional[str] = None
    district: Optional[str] = None
    inquiry_type: Optional[str] = None
    score: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

class ProductCreate(BaseModel):
    product_name: str
    sku_code: str = ""
    division: str
    category: str = ""
    technical_specifications: dict = {}
    size_variables: list = []
    pack_size: str = ""
    material: str = ""
    description: str = ""
    seo_meta_title: str = ""
    seo_meta_description: str = ""
    brochure_url: str = ""
    images: list = []
    manufacturer: str = "Meril Life Sciences"
    status: str = "published"

class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    sku_code: Optional[str] = None
    division: Optional[str] = None
    category: Optional[str] = None
    technical_specifications: Optional[dict] = None
    size_variables: Optional[list] = None
    pack_size: Optional[str] = None
    material: Optional[str] = None
    description: Optional[str] = None
    seo_meta_title: Optional[str] = None
    seo_meta_description: Optional[str] = None
    brochure_url: Optional[str] = None
    images: Optional[list] = None
    manufacturer: Optional[str] = None
    status: Optional[str] = None


# --- Auth Helpers ---

def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def create_token(data: dict) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=720)
    return jwt.encode({**data, "exp": exp}, JWT_SECRET, algorithm="HS256")

def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

async def get_current_admin(authorization: str = None):
    if not authorization:
        raise HTTPException(401, "Missing authorization")
    from fastapi import Header
    return verify_token(authorization.replace("Bearer ", ""))

from fastapi import Header

async def admin_required(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(401, "Missing authorization header")
    token = authorization.replace("Bearer ", "")
    return verify_token(token)


# --- Helper to serialize MongoDB docs ---

def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc

def serialize_docs(docs):
    return [serialize_doc(d) for d in docs]


# --- Lead Scoring Engine ---

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


# --- Public API ---

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "MedDevice Pro API"}

@app.get("/api/divisions")
async def get_divisions():
    pipeline = [
        {"$match": {"status": "published"}},
        {"$group": {
            "_id": "$division",
            "categories": {"$addToSet": "$category"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    results = await products_col.aggregate(pipeline).to_list(100)
    divisions = []
    for r in results:
        cats = sorted([c for c in r["categories"] if c])
        divisions.append({
            "name": r["_id"],
            "categories": cats,
            "product_count": r["count"]
        })
    return {"divisions": divisions}

@app.get("/api/products")
async def list_products(
    division: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    status: str = "published",
    page: int = 1,
    limit: int = 20
):
    query = {"status": status}
    if division:
        query["division"] = division
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"product_name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}},
            {"sku_code": {"$regex": search, "$options": "i"}},
        ]

    total = await products_col.count_documents(query)
    skip = (page - 1) * limit
    cursor = products_col.find(query).sort("product_name", 1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)

    return {
        "products": serialize_docs(docs),
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if total > 0 else 1
    }

@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    try:
        doc = await products_col.find_one({"_id": ObjectId(product_id)})
    except Exception:
        raise HTTPException(400, "Invalid product ID")
    if not doc:
        raise HTTPException(404, "Product not found")
    return serialize_doc(doc)

@app.get("/api/products/by-slug/{slug}")
async def get_product_by_slug(slug: str):
    doc = await products_col.find_one({"slug": slug, "status": "published"})
    if not doc:
        raise HTTPException(404, "Product not found")
    return serialize_doc(doc)


# --- Lead Capture (Public) ---

@app.post("/api/leads")
async def create_lead(lead: LeadCreate):
    score_label, score_value = calculate_lead_score(lead.model_dump())
    doc = {
        **lead.model_dump(),
        "score": score_label,
        "score_value": score_value,
        "status": "new",
        "assigned_to": "",
        "notes": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await leads_col.insert_one(doc)
    doc.pop("_id", None)
    doc["id"] = str(result.inserted_id)
    return {"message": "Lead captured successfully", "lead": doc}


# --- Admin Auth ---

@app.post("/api/admin/login")
async def admin_login(body: AdminLogin):
    if body.password == ADMIN_PASSWORD:
        token = create_token({"sub": "admin", "role": "super_admin"})
        return {"token": token, "role": "super_admin"}
    raise HTTPException(401, "Invalid credentials")


# --- Admin Dashboard ---

@app.get("/api/admin/stats")
async def admin_stats(_=Depends(admin_required)):
    total_products = await products_col.count_documents({"status": "published"})
    total_leads = await leads_col.count_documents({})
    hot_leads = await leads_col.count_documents({"score": "Hot"})
    warm_leads = await leads_col.count_documents({"score": "Warm"})
    cold_leads = await leads_col.count_documents({"score": "Cold"})
    new_leads = await leads_col.count_documents({"status": "new"})

    pipeline = [
        {"$group": {"_id": "$division", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    division_counts = await products_col.aggregate(pipeline).to_list(20)

    pipeline2 = [
        {"$group": {"_id": "$inquiry_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    inquiry_counts = await leads_col.aggregate(pipeline2).to_list(20)

    pipeline3 = [
        {"$group": {"_id": "$district", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    district_counts = await leads_col.aggregate(pipeline3).to_list(10)

    return {
        "total_products": total_products,
        "total_leads": total_leads,
        "hot_leads": hot_leads,
        "warm_leads": warm_leads,
        "cold_leads": cold_leads,
        "new_leads": new_leads,
        "products_by_division": [{"division": d["_id"], "count": d["count"]} for d in division_counts],
        "leads_by_inquiry": [{"type": d["_id"], "count": d["count"]} for d in inquiry_counts],
        "leads_by_district": [{"district": d["_id"] or "Unknown", "count": d["count"]} for d in district_counts],
    }


# --- Pipeline / Analytics ---

@app.get("/api/admin/pipeline")
async def admin_pipeline(_=Depends(admin_required)):
    statuses = ["new", "contacted", "qualified", "negotiation", "won", "lost"]
    pipeline_data = {}
    for s in statuses:
        cursor = leads_col.find({"status": s}).sort("score_value", -1)
        docs = await cursor.to_list(100)
        pipeline_data[s] = serialize_docs(docs)
    return {"pipeline": pipeline_data}

@app.get("/api/admin/analytics")
async def admin_analytics(_=Depends(admin_required)):
    total = await leads_col.count_documents({})

    # By source
    src_pipeline = [{"$group": {"_id": "$source", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    by_source = await leads_col.aggregate(src_pipeline).to_list(20)

    # By score
    score_pipeline = [{"$group": {"_id": "$score", "count": {"$sum": 1}}}]
    by_score = await leads_col.aggregate(score_pipeline).to_list(10)

    # By status (funnel)
    status_pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    by_status = await leads_col.aggregate(status_pipeline).to_list(10)

    # By district
    district_pipeline = [
        {"$match": {"district": {"$ne": ""}}},
        {"$group": {"_id": "$district", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15}
    ]
    by_district = await leads_col.aggregate(district_pipeline).to_list(15)

    # By inquiry type
    inquiry_pipeline = [{"$group": {"_id": "$inquiry_type", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    by_inquiry = await leads_col.aggregate(inquiry_pipeline).to_list(10)

    # Recent leads
    recent = await leads_col.find().sort("created_at", -1).to_list(10)

    # Conversion rate
    won = await leads_col.count_documents({"status": "won"})
    conversion_rate = round((won / total * 100), 1) if total > 0 else 0

    return {
        "total_leads": total,
        "conversion_rate": conversion_rate,
        "by_source": [{"source": d["_id"] or "Unknown", "count": d["count"]} for d in by_source],
        "by_score": [{"score": d["_id"], "count": d["count"]} for d in by_score],
        "by_status": [{"status": d["_id"], "count": d["count"]} for d in by_status],
        "by_district": [{"district": d["_id"], "count": d["count"]} for d in by_district],
        "by_inquiry": [{"type": d["_id"], "count": d["count"]} for d in by_inquiry],
        "recent_leads": serialize_docs(recent),
    }


# --- Admin Leads CRUD ---

@app.get("/api/admin/leads")
async def admin_list_leads(
    _=Depends(admin_required),
    score: Optional[str] = None,
    status: Optional[str] = None,
    district: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: int = -1,
    page: int = 1,
    limit: int = 20
):
    query = {}
    if score:
        query["score"] = score
    if status:
        query["status"] = status
    if district:
        query["district"] = district
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"hospital_clinic": {"$regex": search, "$options": "i"}},
            {"phone_whatsapp": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    total = await leads_col.count_documents(query)
    skip = (page - 1) * limit
    cursor = leads_col.find(query).sort(sort_by, sort_order).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)

    return {
        "leads": serialize_docs(docs),
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if total > 0 else 1
    }

@app.get("/api/admin/leads/{lead_id}")
async def admin_get_lead(lead_id: str, _=Depends(admin_required)):
    try:
        doc = await leads_col.find_one({"_id": ObjectId(lead_id)})
    except Exception:
        raise HTTPException(400, "Invalid lead ID")
    if not doc:
        raise HTTPException(404, "Lead not found")
    return serialize_doc(doc)

@app.put("/api/admin/leads/{lead_id}")
async def admin_update_lead(lead_id: str, update: LeadUpdate, _=Depends(admin_required)):
    try:
        oid = ObjectId(lead_id)
    except Exception:
        raise HTTPException(400, "Invalid lead ID")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}

    if "notes" in update_data and update_data["notes"]:
        existing = await leads_col.find_one({"_id": oid})
        if existing:
            notes_list = existing.get("notes", [])
            notes_list.append({
                "text": update_data.pop("notes"),
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            update_data["notes"] = notes_list

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await leads_col.update_one({"_id": oid}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(404, "Lead not found")

    doc = await leads_col.find_one({"_id": oid})
    return serialize_doc(doc)

@app.delete("/api/admin/leads/{lead_id}")
async def admin_delete_lead(lead_id: str, _=Depends(admin_required)):
    try:
        result = await leads_col.delete_one({"_id": ObjectId(lead_id)})
    except Exception:
        raise HTTPException(400, "Invalid lead ID")
    if result.deleted_count == 0:
        raise HTTPException(404, "Lead not found")
    return {"message": "Lead deleted"}


# --- Admin Products CRUD ---

@app.post("/api/admin/products")
async def admin_create_product(product: ProductCreate, _=Depends(admin_required)):
    doc = {
        **product.model_dump(),
        "slug": product.product_name.lower().replace(" ", "-").replace("/", "-"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await products_col.insert_one(doc)
    doc.pop("_id", None)
    doc["id"] = str(result.inserted_id)
    return doc

@app.put("/api/admin/products/{product_id}")
async def admin_update_product(product_id: str, update: ProductUpdate, _=Depends(admin_required)):
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(400, "Invalid product ID")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    if "product_name" in update_data:
        update_data["slug"] = update_data["product_name"].lower().replace(" ", "-").replace("/", "-")

    result = await products_col.update_one({"_id": oid}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(404, "Product not found")
    doc = await products_col.find_one({"_id": oid})
    return serialize_doc(doc)

@app.delete("/api/admin/products/{product_id}")
async def admin_delete_product(product_id: str, _=Depends(admin_required)):
    try:
        result = await products_col.delete_one({"_id": ObjectId(product_id)})
    except Exception:
        raise HTTPException(400, "Invalid product ID")
    if result.deleted_count == 0:
        raise HTTPException(404, "Product not found")
    return {"message": "Product deleted"}

@app.get("/api/admin/products")
async def admin_list_products(
    _=Depends(admin_required),
    division: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    query = {}
    if division:
        query["division"] = division
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"product_name": {"$regex": search, "$options": "i"}},
            {"sku_code": {"$regex": search, "$options": "i"}},
        ]

    total = await products_col.count_documents(query)
    skip = (page - 1) * limit
    cursor = products_col.find(query).sort("product_name", 1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)

    return {
        "products": serialize_docs(docs),
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if total > 0 else 1
    }


# --- PDF Import & Claude Extraction ---

def extract_pdf_text(file_path: str) -> str:
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n\n"
    return text.strip()

async def claude_extract_products(pdf_text: str) -> list:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"pdf-extract-{uuid.uuid4().hex[:8]}",
        system_message="""You are a medical device product data extraction specialist. 
Extract structured product information from the given text. For each product found, return a JSON array of objects with these fields:
- product_name: Full product name
- sku_code: SKU or product code (generate one like MRL-XXX-NNN if not found)
- division: One of: Orthopedics, Trauma, Cardiovascular, Diagnostics, ENT, Endo-surgical, Infection Prevention, Peripheral Intervention
- category: Sub-category within the division
- description: 2-3 sentence description of the product
- technical_specifications: Object with key technical specs
- material: Primary material
- manufacturer: Manufacturer name (default: Meril Life Sciences)
- size_variables: Array of available sizes if mentioned
- pack_size: Pack size if mentioned

Return ONLY a valid JSON array. No markdown, no explanation, just the JSON array."""
    ).with_model("anthropic", "claude-sonnet-4-20250514")

    prompt = f"""Extract all medical device products from this catalog text and return as a JSON array:

---
{pdf_text[:15000]}
---

Return ONLY a valid JSON array of product objects."""

    response = await chat.send_message(UserMessage(text=prompt))
    
    try:
        # Try to parse the response as JSON
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()
        products = json.loads(response_text)
        if isinstance(products, list):
            return products
        return []
    except json.JSONDecodeError:
        return []

async def claude_generate_seo(product: dict) -> dict:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"seo-gen-{uuid.uuid4().hex[:8]}",
        system_message="""You are an SEO content specialist for B2B medical devices in India. 
Generate SEO-optimized content for medical device product pages targeting hospital procurement managers in Telangana, India.
Return ONLY a valid JSON object with these fields:
- description: SEO-optimized 3-4 sentence product description (include medical terms, benefits, specifications)
- seo_meta_title: 50-60 char title with product name, division, and "Telangana Distributor"
- seo_meta_description: 150-160 char meta description for Google search results
No markdown, no explanation, just the JSON object."""
    ).with_model("anthropic", "claude-sonnet-4-20250514")

    prompt = f"""Generate SEO content for this medical device product:
Name: {product.get('product_name', '')}
Division: {product.get('division', '')}
Category: {product.get('category', '')}
Material: {product.get('material', '')}
Specs: {json.dumps(product.get('technical_specifications', {}))}

Return ONLY a valid JSON object with description, seo_meta_title, seo_meta_description."""

    response = await chat.send_message(UserMessage(text=prompt))
    
    try:
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()
        return json.loads(response_text)
    except json.JSONDecodeError:
        return {}


@app.post("/api/admin/import/pdf")
async def upload_pdf(file: UploadFile = File(...), _=Depends(admin_required)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted")
    
    # Save uploaded file
    os.makedirs("/app/backend/uploads", exist_ok=True)
    file_path = f"/app/backend/uploads/{uuid.uuid4().hex}_{file.filename}"
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create import record
    import_doc = {
        "filename": file.filename,
        "file_path": file_path,
        "upload_date": datetime.now(timezone.utc).isoformat(),
        "status": "processing",
        "extracted_products": [],
        "approved_count": 0,
        "total_count": 0,
        "error": None,
    }
    result = await imports_col.insert_one(import_doc)
    import_id = str(result.inserted_id)
    
    # Start extraction in background
    asyncio.create_task(process_pdf_import(import_id, file_path))
    
    return {"import_id": import_id, "status": "processing", "filename": file.filename}


import re

def _escape_regex(text):
    return re.escape(text)


async def process_pdf_import(import_id: str, file_path: str):
    try:
        # Extract text
        pdf_text = extract_pdf_text(file_path)
        if not pdf_text or len(pdf_text) < 50:
            await imports_col.update_one(
                {"_id": ObjectId(import_id)},
                {"$set": {"status": "failed", "error": "Could not extract text from PDF"}}
            )
            return
        
        # Claude extraction
        products = await claude_extract_products(pdf_text)
        
        if not products:
            await imports_col.update_one(
                {"_id": ObjectId(import_id)},
                {"$set": {"status": "failed", "error": "Claude could not extract product data from the PDF"}}
            )
            return
        
        # Generate SEO for each product
        enriched = []
        for p in products:
            try:
                seo = await claude_generate_seo(p)
                if seo:
                    p["description"] = seo.get("description", p.get("description", ""))
                    p["seo_meta_title"] = seo.get("seo_meta_title", "")
                    p["seo_meta_description"] = seo.get("seo_meta_description", "")
            except Exception:
                pass
            p["approved"] = False
            p["_temp_id"] = uuid.uuid4().hex[:8]
            
            # --- Deduplication check ---
            sku = p.get("sku_code", "").strip()
            name = p.get("product_name", "").strip()
            p["_dup_status"] = "new"  # new | duplicate | possible_duplicate
            p["_dup_match"] = None    # existing product name if matched

            # 1. Exact SKU match
            if sku:
                existing_sku = await products_col.find_one(
                    {"sku_code": sku, "status": "published"},
                    {"_id": 0, "product_name": 1, "sku_code": 1}
                )
                if existing_sku:
                    p["_dup_status"] = "duplicate"
                    p["_dup_match"] = f"{existing_sku['product_name']} (SKU: {existing_sku['sku_code']})"
                    enriched.append(p)
                    continue

            # 2. Name similarity check (case-insensitive exact or substring)
            if name:
                name_lower = name.lower()
                existing_name = await products_col.find_one(
                    {"$or": [
                        {"product_name": {"$regex": f"^{_escape_regex(name)}$", "$options": "i"}},
                        {"product_name": {"$regex": _escape_regex(name_lower), "$options": "i"}},
                    ], "status": "published"},
                    {"_id": 0, "product_name": 1, "sku_code": 1}
                )
                if existing_name:
                    if existing_name["product_name"].lower() == name_lower:
                        p["_dup_status"] = "duplicate"
                    else:
                        p["_dup_status"] = "possible_duplicate"
                    p["_dup_match"] = f"{existing_name['product_name']} (SKU: {existing_name.get('sku_code', 'N/A')})"
            
            enriched.append(p)
        
        await imports_col.update_one(
            {"_id": ObjectId(import_id)},
            {"$set": {
                "status": "completed",
                "extracted_products": enriched,
                "total_count": len(enriched),
            }}
        )
    except Exception as e:
        await imports_col.update_one(
            {"_id": ObjectId(import_id)},
            {"$set": {"status": "failed", "error": str(e)}}
        )


@app.get("/api/admin/imports")
async def list_imports(_=Depends(admin_required)):
    cursor = imports_col.find().sort("upload_date", -1)
    docs = await cursor.to_list(50)
    return {"imports": serialize_docs(docs)}


@app.get("/api/admin/imports/{import_id}")
async def get_import(import_id: str, _=Depends(admin_required)):
    try:
        doc = await imports_col.find_one({"_id": ObjectId(import_id)})
    except Exception:
        raise HTTPException(400, "Invalid import ID")
    if not doc:
        raise HTTPException(404, "Import not found")
    return serialize_doc(doc)


@app.post("/api/admin/imports/{import_id}/approve")
async def approve_import_products(import_id: str, body: dict = {}, _=Depends(admin_required)):
    try:
        doc = await imports_col.find_one({"_id": ObjectId(import_id)})
    except Exception:
        raise HTTPException(400, "Invalid import ID")
    if not doc:
        raise HTTPException(404, "Import not found")
    
    # Get list of temp_ids to approve (or approve all if empty)
    approve_ids = body.get("approve_ids", [])
    products_to_add = []
    skipped_dupes = 0
    
    for p in doc.get("extracted_products", []):
        if approve_ids and p.get("_temp_id") not in approve_ids:
            continue
        if p.get("approved"):
            continue
        # Skip confirmed duplicates
        if p.get("_dup_status") == "duplicate":
            skipped_dupes += 1
            continue
        
        # Final dedup check at approval time (SKU uniqueness)
        sku = p.get("sku_code", "").strip()
        if sku:
            exists = await products_col.find_one({"sku_code": sku, "status": "published"})
            if exists:
                skipped_dupes += 1
                continue
        
        product_doc = {
            "product_name": p.get("product_name", "Unknown"),
            "sku_code": p.get("sku_code", f"IMP-{uuid.uuid4().hex[:6].upper()}"),
            "division": p.get("division", ""),
            "category": p.get("category", ""),
            "description": p.get("description", ""),
            "technical_specifications": p.get("technical_specifications", {}),
            "material": p.get("material", ""),
            "manufacturer": p.get("manufacturer", "Meril Life Sciences"),
            "size_variables": p.get("size_variables", []),
            "pack_size": p.get("pack_size", ""),
            "seo_meta_title": p.get("seo_meta_title", ""),
            "seo_meta_description": p.get("seo_meta_description", ""),
            "brochure_url": "",
            "images": [],
            "slug": p.get("product_name", "").lower().replace(" ", "-").replace("/", "-"),
            "status": "published",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        products_to_add.append((p.get("_temp_id"), product_doc))
    
    added = 0
    added_ids = set()
    if products_to_add:
        docs_to_insert = [doc for _, doc in products_to_add]
        await products_col.insert_many(docs_to_insert)
        added = len(docs_to_insert)
        added_ids = {tid for tid, _ in products_to_add}
    
    # Mark products as approved in the import record
    updated_products = []
    for p in doc.get("extracted_products", []):
        tid = p.get("_temp_id")
        if tid in added_ids:
            p["approved"] = True
        elif not approve_ids and p.get("_dup_status") == "duplicate":
            p["approved"] = True  # Mark dupes as "handled"
            p["_dup_skipped"] = True
        elif approve_ids and tid in approve_ids and p.get("_dup_status") == "duplicate":
            p["approved"] = True
            p["_dup_skipped"] = True
        updated_products.append(p)
    
    await imports_col.update_one(
        {"_id": ObjectId(import_id)},
        {"$set": {
            "extracted_products": updated_products,
            "approved_count": sum(1 for p in updated_products if p.get("approved")),
        }}
    )
    
    msg = f"{added} products published to catalog"
    if skipped_dupes > 0:
        msg += f", {skipped_dupes} duplicates skipped"
    return {"message": msg, "added": added, "skipped_duplicates": skipped_dupes}


@app.put("/api/admin/imports/{import_id}/product/{temp_id}")
async def update_import_product(import_id: str, temp_id: str, body: dict = {}, _=Depends(admin_required)):
    try:
        doc = await imports_col.find_one({"_id": ObjectId(import_id)})
    except Exception:
        raise HTTPException(400, "Invalid import ID")
    if not doc:
        raise HTTPException(404, "Import not found")
    
    updated = []
    found = False
    for p in doc.get("extracted_products", []):
        if p.get("_temp_id") == temp_id:
            for k, v in body.items():
                if k != "_temp_id" and k != "approved":
                    p[k] = v
            found = True
        updated.append(p)
    
    if not found:
        raise HTTPException(404, "Product not found in import")
    
    await imports_col.update_one(
        {"_id": ObjectId(import_id)},
        {"$set": {"extracted_products": updated}}
    )
    return {"message": "Product updated"}


@app.delete("/api/admin/imports/{import_id}/product/{temp_id}")
async def delete_import_product(import_id: str, temp_id: str, _=Depends(admin_required)):
    try:
        doc = await imports_col.find_one({"_id": ObjectId(import_id)})
    except Exception:
        raise HTTPException(400, "Invalid import ID")
    if not doc:
        raise HTTPException(404, "Import not found")
    
    updated = [p for p in doc.get("extracted_products", []) if p.get("_temp_id") != temp_id]
    
    await imports_col.update_one(
        {"_id": ObjectId(import_id)},
        {"$set": {
            "extracted_products": updated,
            "total_count": len(updated),
        }}
    )
    return {"message": "Product removed from import"}


# --- Seed Data ---

SEED_PRODUCTS = [
    # Orthopedics
    {"product_name": "Destiknee Total Knee System", "sku_code": "MRL-ORTHO-001", "division": "Orthopedics", "category": "Knee Arthroplasty", "description": "Made in India total knee replacement system with CE & USFDA certification. Delivers excellent anatomical fit and high-flex motion for Indian patients.", "technical_specifications": {"certification": "CE & USFDA", "motion": "High-flex", "origin": "Made in India"}, "material": "Cobalt-Chromium Alloy", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Freedom Knee System", "sku_code": "MRL-ORTHO-002", "division": "Orthopedics", "category": "Knee Arthroplasty", "description": "High precision 7 radii design knee replacement system with proven long-term survivorship (~98% at 10 years). Advanced bone preservation technology.", "technical_specifications": {"design": "7 Radii", "survivorship": "~98% at 10 years", "feature": "Bone Preservation"}, "material": "Cobalt-Chromium Alloy", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Opulent Knee System", "sku_code": "MRL-ORTHO-003", "division": "Orthopedics", "category": "Knee Arthroplasty", "description": "Premium TKR with advanced TiNbN coating for greater strength and longevity (18-20 years). Global sizing matrix, hypoallergenic, and lowest wear rate.", "technical_specifications": {"coating": "TiNbN", "longevity": "18-20 years", "features": ["Hypoallergenic", "Lowest Wear", "Global Sizing"]}, "material": "TiNbN Coated Alloy", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Latitude Hip System", "sku_code": "MRL-ORTHO-004", "division": "Orthopedics", "category": "Hip Arthroplasty", "description": "Total hip replacement system with proximal porous coating for strong bone ingrowth. Triple tapered stem with reduced distal cross section for optimal fit.", "technical_specifications": {"coating": "Proximal Porous", "stem": "Triple Tapered", "feature": "Reduced Distal Cross Section"}, "material": "Titanium Alloy", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Bipolar Cup System", "sku_code": "MRL-ORTHO-005", "division": "Orthopedics", "category": "Hip Arthroplasty", "description": "Dual articulation hip system that reduces acetabular wear. Lightweight design ideal for elderly patients. UHMWPE liner with polished steel shell.", "technical_specifications": {"articulation": "Dual", "liner": "UHMWPE", "shell": "Polished Steel"}, "material": "UHMWPE + Steel", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Monomod Revision Stem", "sku_code": "MRL-ORTHO-006", "division": "Orthopedics", "category": "Hip Arthroplasty", "description": "Monobloc revision stem design that avoids modular junction failure. Optional proximal fixation with polished distal tip. Ideal for poor bone stock and complex revisions.", "technical_specifications": {"design": "Monobloc", "tip": "Polished Distal", "indication": "Complex Revisions"}, "material": "Titanium Alloy", "manufacturer": "Meril Life Sciences"},
    # Trauma
    {"product_name": "KET Plating System", "sku_code": "MRL-TRMA-001", "division": "Trauma", "category": "Plating Systems", "description": "LVM316 stainless steel trauma plating system with high strength and low carbon molecule composition. Anatomic contour for better fit, MRI safe up to 3 Tesla.", "technical_specifications": {"material_grade": "LVM316", "mri_safe": "Up to 3 Tesla", "contour": "Anatomic"}, "material": "LVM316 Stainless Steel", "manufacturer": "Meril Life Sciences"},
    {"product_name": "ARMAR Titanium Plating System", "sku_code": "MRL-TRMA-002", "division": "Trauma", "category": "Plating Systems", "description": "Titanium trauma plating system offering excellent biocompatibility, corrosion resistance, and high strength-to-weight ratio for superior fixation.", "technical_specifications": {"biocompatibility": "Excellent", "corrosion_resistance": "High", "strength": "High strength-to-weight ratio"}, "material": "Titanium", "manufacturer": "Meril Life Sciences"},
    {"product_name": "AURIC Gold-Coated Plating System", "sku_code": "MRL-TRMA-003", "division": "Trauma", "category": "Plating Systems", "description": "Premium gold-coated trauma plates with outstanding biocompatibility and allergy prevention. Better resistance to bacterial adhesion with hardness superior to TiNbN alloys.", "technical_specifications": {"coating": "Gold", "antibacterial": "Superior resistance", "hardness": "Better than TiNbN"}, "material": "Gold-Coated Plates", "manufacturer": "Meril Life Sciences"},
    {"product_name": "PFIN/PFRN Nailing System", "sku_code": "MRL-TRMA-004", "division": "Trauma", "category": "Nailing Systems", "description": "Proximal femoral intramedullary nail system with multi-lock options for better stability. Compatible instrumentation for faster surgery with anatomical design.", "technical_specifications": {"locking": "Multi-lock Options", "design": "Anatomical", "surgery_time": "Faster"}, "material": "Titanium", "manufacturer": "Meril Life Sciences"},
    {"product_name": "MBOSS Screw System", "sku_code": "MRL-TRMA-005", "division": "Trauma", "category": "Screw Systems", "description": "Precision-engineered screw system with self-tapping and self-drilling designs. Available in multiple diameters and lengths for versatile fixation options.", "technical_specifications": {"threading": "Precision", "self_tapping": True, "self_drilling": True}, "material": "Stainless Steel / Titanium", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Trent Bipolar Stem", "sku_code": "MRL-TRMA-006", "division": "Trauma", "category": "Bipolar Stems", "description": "Partial hip replacement system available in cemented, uncemented, and revision stem configurations for comprehensive trauma management.", "technical_specifications": {"variants": ["Cemented", "Uncemented", "Revision"], "type": "Partial Hip Replacement"}, "material": "Titanium Alloy", "manufacturer": "Meril Life Sciences"},
    # Cardiovascular
    {"product_name": "Myval Transcatheter Aortic Valve", "sku_code": "MRL-CARD-001", "division": "Cardiovascular", "category": "Heart Valves", "description": "Balloon-expandable transcatheter heart valve (THV) with wide size matrix including intermediate sizes. CE marked and globally approved TAVR system.", "technical_specifications": {"type": "Balloon-expandable THV", "approval": "CE Marked, Global", "feature": "Intermediate Sizes Available"}, "material": "Nitinol Frame + Bovine Pericardium", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Myval Octacor Surgical Heart Valve", "sku_code": "MRL-CARD-002", "division": "Cardiovascular", "category": "Heart Valves", "description": "Advanced surgical heart valve with Octacor design for optimal hemodynamics and durability in aortic valve replacement procedures.", "technical_specifications": {"design": "Octacor", "application": "Surgical AVR"}, "material": "Pyrolytic Carbon", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Evermine50 Drug Eluting Stent", "sku_code": "MRL-CARD-003", "division": "Cardiovascular", "category": "Coronary Stents", "description": "Cobalt-Chromium coronary drug eluting stent with ultra-thin strut design for superior deliverability. Durable polymer ensures controlled drug release.", "technical_specifications": {"platform": "Cobalt-Chromium", "strut": "Ultra-thin", "polymer": "Durable"}, "material": "Cobalt-Chromium", "manufacturer": "Meril Life Sciences"},
    {"product_name": "BioMime Drug Eluting Stent", "sku_code": "MRL-CARD-004", "division": "Cardiovascular", "category": "Coronary Stents", "description": "Next-generation sirolimus-eluting coronary stent system on Cobalt-Chromium platform. Proven clinical outcomes with extensive global data.", "technical_specifications": {"drug": "Sirolimus", "platform": "Cobalt-Chromium", "data": "Extensive Global Clinical"}, "material": "Cobalt-Chromium", "manufacturer": "Meril Life Sciences"},
    {"product_name": "MeRes100 Bioresorbable Scaffold", "sku_code": "MRL-CARD-005", "division": "Cardiovascular", "category": "Bioresorbable Scaffolds", "description": "PLLA-based bioresorbable vascular scaffold with thin 100-micron struts. Fully bioresorbable design supports vessel healing and restores vasomotion.", "technical_specifications": {"material_base": "PLLA", "strut_thickness": "100 microns", "feature": "Fully Bioresorbable"}, "material": "PLLA", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Mozec PTCA Balloon Catheter", "sku_code": "MRL-CARD-006", "division": "Cardiovascular", "category": "Balloon Catheters", "description": "Over-the-wire PTCA balloon dilatation catheter with PEBA balloon material. Available up to 120mm length for complex coronary interventions.", "technical_specifications": {"design": "Over-the-wire", "max_length": "120mm", "balloon": "PEBA"}, "material": "PEBA", "manufacturer": "Meril Life Sciences"},
    # Diagnostics
    {"product_name": "Meriscreen HIV Rapid Test Kit", "sku_code": "MRL-DIAG-001", "division": "Diagnostics", "category": "Rapid Tests", "description": "WHO-prequalified HIV rapid diagnostic kit with high sensitivity and specificity. Easy-to-use format with room temperature storage for field deployment.", "technical_specifications": {"prequalification": "WHO", "storage": "Room Temperature", "format": "Rapid Test"}, "material": "Diagnostic Reagents", "manufacturer": "Meril Life Sciences"},
    {"product_name": "AutoQuant 400 Clinical Chemistry Analyzer", "sku_code": "MRL-DIAG-002", "division": "Diagnostics", "category": "Clinical Chemistry", "description": "Fully automated clinical chemistry analyzer with high throughput capability. Saves time by completing work in minimum number of batches.", "technical_specifications": {"type": "Fully Automated", "throughput": "400 tests/hour", "automation": "Complete"}, "material": "Analytical Instrument", "manufacturer": "Meril Life Sciences"},
    {"product_name": "CelQuant 5 Plus Hematology Analyzer", "sku_code": "MRL-DIAG-003", "division": "Diagnostics", "category": "Hematology", "description": "5-Part differential hematology analyzer based on tri-angle laser scatter, flow cytometry, and cytochemical staining. Available with autoloader option.", "technical_specifications": {"type": "5-Part Differential", "technology": ["Tri-angle Laser Scatter", "Flow Cytometry", "Cytochemical Staining"], "autoloader": "Optional"}, "material": "Analytical Instrument", "manufacturer": "Meril Life Sciences"},
    {"product_name": "ClotQuant 4-Channel Coagulation Analyzer", "sku_code": "MRL-DIAG-004", "division": "Diagnostics", "category": "Coagulation", "description": "4-channel coagulation analyzer with 24 sample positions and 6 reagent positions for comprehensive coagulation testing in clinical laboratories.", "technical_specifications": {"channels": 4, "sample_positions": 24, "reagent_positions": 6}, "material": "Analytical Instrument", "manufacturer": "Meril Life Sciences"},
    {"product_name": "LumiQuant e-CLIA Analyzer", "sku_code": "MRL-DIAG-005", "division": "Diagnostics", "category": "Immunoassay", "description": "Electro-chemiluminescence immunoassay analyzer with 86 tests per hour throughput. Advanced e-CLIA technology for sensitive immunodiagnostics.", "technical_specifications": {"technology": "Electro-chemiluminescence", "throughput": "86 tests/hour", "type": "Immunoassay"}, "material": "Analytical Instrument", "manufacturer": "Meril Life Sciences"},
    {"product_name": "MERILISA HIV Gen 4 ELISA Kit", "sku_code": "MRL-DIAG-006", "division": "Diagnostics", "category": "ELISA", "description": "4th generation HIV ELISA diagnostic kit compatible with wide range of automated ELISA systems. Accurate optical density measurement for reliable results.", "technical_specifications": {"generation": "4th Gen", "type": "ELISA", "compatibility": "Wide Range Analyzers"}, "material": "Diagnostic Reagents", "manufacturer": "Meril Life Sciences"},
    # ENT
    {"product_name": "Mesire Sinus Balloon Catheter", "sku_code": "MRL-ENT-001", "division": "ENT", "category": "Sinus Care", "description": "Non-compliant balloon catheter for controlled sinus ostia dilation. Guide catheters with multiple angles and light wire for accurate sinus localization in chronic sinusitis.", "technical_specifications": {"balloon": "Non-compliant", "guidance": "Multiple Angle Catheters", "localization": "Light Wire"}, "material": "Medical Grade Polymer", "manufacturer": "Meril Life Sciences"},
    {"product_name": "MYRAC RF Plasma Generator", "sku_code": "MRL-ENT-002", "division": "ENT", "category": "RF Devices", "description": "Low-temperature plasma generator for precise tissue ablation with dual modes (Ablation & Coagulation). Integrated saline irrigation and suction for ENT procedures.", "technical_specifications": {"technology": "Low-temperature Plasma", "modes": ["Ablation", "Coagulation"], "features": ["Saline Irrigation", "Suction"]}, "material": "Surgical Instrument", "manufacturer": "Meril Life Sciences"},
    {"product_name": "MESIC ENT Diode Laser", "sku_code": "MRL-ENT-003", "division": "ENT", "category": "Laser Systems", "description": "980nm radial fibre ENT diode laser system offering excellent cutting, coagulation, and vaporization. Compact and portable for otology, rhinology, and laryngology.", "technical_specifications": {"wavelength": "980nm", "fibre": "Radial", "functions": ["Cutting", "Coagulation", "Vaporization"]}, "material": "Laser System", "manufacturer": "Meril Life Sciences"},
    {"product_name": "OTSIKO Video Otoscope", "sku_code": "MRL-ENT-004", "division": "ENT", "category": "Diagnostic Devices", "description": "HD video otoscope for visualization of ear canal and tympanic membrane. Portable and recordable with 32GB memory card and 5 probe tips included.", "technical_specifications": {"resolution": "HD", "memory": "32GB", "probes": 5, "recording": True}, "material": "Medical Device", "manufacturer": "Meril Life Sciences"},
    {"product_name": "MUKICT Shaver Blades", "sku_code": "MRL-ENT-005", "division": "ENT", "category": "Surgical Consumables", "description": "Endoscopic shaver blades with wide angle range (0 to 120 degrees). M2 compatible for use with Medtronic debrider systems for precise tissue removal.", "technical_specifications": {"angle_range": "0-120 degrees", "compatibility": "M2 (Medtronic IPC)", "type": "Endoscopic Shaver"}, "material": "Surgical Steel", "manufacturer": "Meril Life Sciences"},
    # Endo-surgical
    {"product_name": "Mitsu Absorbable Sutures", "sku_code": "MRL-ENDO-001", "division": "Endo-surgical", "category": "Sutures", "description": "Synthetic absorbable sutures providing reliable wound closure with predictable absorption profile. Available in multiple gauges and needle configurations.", "technical_specifications": {"type": "Synthetic Absorbable", "absorption": "Predictable Profile"}, "material": "Polyglactin", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Filamide Non-Absorbable Sutures", "sku_code": "MRL-ENDO-002", "division": "Endo-surgical", "category": "Sutures", "description": "High-quality synthetic non-absorbable sutures for permanent tissue approximation. Excellent knot security and handling characteristics.", "technical_specifications": {"type": "Synthetic Non-Absorbable", "knot_security": "Excellent"}, "material": "Nylon", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Mirus Powered Endocutter", "sku_code": "MRL-ENDO-003", "division": "Endo-surgical", "category": "Staplers", "description": "Powered endoscopic linear cutting stapler for precise tissue transection and stapling in minimally invasive procedures. Consistent staple formation.", "technical_specifications": {"type": "Powered Linear Endocutter", "stapling": "Consistent Formation", "approach": "Minimally Invasive"}, "material": "Surgical Steel + Polymer", "manufacturer": "Meril Life Sciences"},
    {"product_name": "HandX Handheld Robotic System", "sku_code": "MRL-ENDO-004", "division": "Endo-surgical", "category": "Robotics", "description": "Revolutionary 5mm handheld robotic system for laparoscopic surgery. Provides robotic precision in a handheld form factor for enhanced surgical dexterity.", "technical_specifications": {"size": "5mm", "type": "Handheld Robotic", "application": "Laparoscopic Surgery"}, "material": "Surgical Instrument", "manufacturer": "Meril Life Sciences"},
    {"product_name": "MISSO Orthopedic Robotic System", "sku_code": "MRL-ENDO-005", "division": "Endo-surgical", "category": "Robotics", "description": "Indigenous AI-driven orthopedic robotic system for knee replacement surgery. Combines artificial intelligence with robotic precision for optimal outcomes.", "technical_specifications": {"ai": "AI-driven", "application": "Knee Replacement", "origin": "Indigenous"}, "material": "Robotic System", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Merineum Hernia Mesh", "sku_code": "MRL-ENDO-006", "division": "Endo-surgical", "category": "Hernia Repair", "description": "Lightweight polypropylene mesh for hernia repair procedures. Available in flat and 3D configurations for inguinal, ventral, and incisional hernia repairs.", "technical_specifications": {"type": "Lightweight Mesh", "configurations": ["Flat", "3D"], "indications": ["Inguinal", "Ventral", "Incisional"]}, "material": "Polypropylene", "manufacturer": "Meril Life Sciences"},
    # Infection Prevention
    {"product_name": "Maira Surgical Gowns", "sku_code": "MRL-IPC-001", "division": "Infection Prevention", "category": "Surgical Apparels", "description": "Sterile, water-repellent surgical gowns providing a perfect barrier for comfort and protection during surgical procedures. Single-use disposable design.", "technical_specifications": {"sterile": True, "water_repellent": True, "type": "Single-use Disposable"}, "material": "Non-woven Fabric", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Maira Surgical Drapes", "sku_code": "MRL-IPC-002", "division": "Infection Prevention", "category": "Surgical Apparels", "description": "Sterile surgical drapes that are highly absorbent yet impervious to fluids. Provides effective barrier protection for the surgical field.", "technical_specifications": {"sterile": True, "absorbency": "High", "fluid_barrier": "Impervious"}, "material": "Non-woven Fabric", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Myscan OPA Instrument Disinfectant", "sku_code": "MRL-IPC-003", "division": "Infection Prevention", "category": "Disinfection & Sterilization", "description": "Proven OPA (Ortho-Phthalaldehyde) efficacy for high-level instrument and endoscope disinfection. Fast-acting with broad-spectrum antimicrobial activity.", "technical_specifications": {"active_agent": "OPA", "level": "High-Level Disinfection", "spectrum": "Broad"}, "material": "Chemical Solution", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Baktio Hand Hygiene Solution", "sku_code": "MRL-IPC-004", "division": "Infection Prevention", "category": "Hand Hygiene", "description": "Dual-action hand hygiene formula combining CHG and 70% alcohol for effective hand sanitization. Skin-friendly with glycerol-based moisturization system.", "technical_specifications": {"active_agents": ["CHG", "70% Alcohol"], "moisturizer": "Glycerol-based", "action": "Dual"}, "material": "Antiseptic Solution", "manufacturer": "Meril Life Sciences"},
    {"product_name": "IV Dressing with CHG", "sku_code": "MRL-IPC-005", "division": "Infection Prevention", "category": "Wound Care", "description": "Transparent CHG-impregnated IV dressing for catheter site protection and infection prevention. Clear window allows continuous site monitoring.", "technical_specifications": {"type": "Transparent", "antimicrobial": "CHG-impregnated", "monitoring": "Clear Window"}, "material": "Polyurethane Film", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Sterile Gauze Swabs", "sku_code": "MRL-IPC-006", "division": "Infection Prevention", "category": "Wound Care", "description": "Pre-sterilized gauze swabs for sterile wound dressing applications. High absorbency cotton gauze with consistent quality for clinical use.", "technical_specifications": {"sterile": True, "absorbency": "High", "type": "Pre-sterilized"}, "material": "Cotton Gauze", "manufacturer": "Meril Life Sciences"},
    # Peripheral Intervention
    {"product_name": "Promesa Self-Expanding Peripheral Stent", "sku_code": "MRL-PERI-001", "division": "Peripheral Intervention", "category": "Peripheral Stents", "description": "Nickel-Titanium alloy self-expanding peripheral stent with 170-micron strut thickness. High flexibility for navigating tortuous peripheral anatomy.", "technical_specifications": {"expansion": "Self-Expanding", "strut": "170 microns", "flexibility": "High"}, "material": "Nickel-Titanium (Nitinol)", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Cogent Balloon-Expandable Peripheral Stent", "sku_code": "MRL-PERI-002", "division": "Peripheral Intervention", "category": "Peripheral Stents", "description": "Cobalt-Chromium balloon-expandable peripheral stent with 120-micron strut thickness. Optimized radial strength for iliac and renal interventions.", "technical_specifications": {"expansion": "Balloon-Expandable", "strut": "120 microns", "radial_strength": "Optimized"}, "material": "Cobalt-Chromium L605", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Mozec PTA Balloon Catheter", "sku_code": "MRL-PERI-003", "division": "Peripheral Intervention", "category": "Balloon Catheters", "description": "Over-the-wire PTA balloon dilatation catheter with PEBA balloon material. Available up to 120mm length with optional Paclitaxel coating for drug delivery.", "technical_specifications": {"design": "Over-the-wire", "max_length": "120mm", "drug_coating": "Optional Paclitaxel"}, "material": "PEBA", "manufacturer": "Meril Life Sciences"},
    {"product_name": "Obtura Vascular Closure Device", "sku_code": "MRL-PERI-004", "division": "Peripheral Intervention", "category": "Vascular Closure", "description": "Effective femoral artery puncture closure device using bioresorbable materials for long-term safety. Quick hemostasis post catheterization procedures.", "technical_specifications": {"type": "Vascular Closure", "material_type": "Bioresorbable", "hemostasis": "Quick"}, "material": "Bioresorbable Polymer", "manufacturer": "Meril Life Sciences"},
]

async def seed_database():
    count = await products_col.count_documents({})
    if count == 0:
        for p in SEED_PRODUCTS:
            p["slug"] = p["product_name"].lower().replace(" ", "-").replace("/", "-")
            p["status"] = "published"
            p["images"] = []
            p["size_variables"] = p.get("size_variables", [])
            p["pack_size"] = p.get("pack_size", "")
            p["brochure_url"] = ""
            p["seo_meta_title"] = f"{p['product_name']} | Meril {p['division']} - MedDevice Pro Telangana"
            p["seo_meta_description"] = p["description"][:160]
            p["created_at"] = datetime.now(timezone.utc).isoformat()
            p["updated_at"] = datetime.now(timezone.utc).isoformat()
        await products_col.insert_many(SEED_PRODUCTS)
        print(f"Seeded {len(SEED_PRODUCTS)} products")
    else:
        print(f"Database already has {count} products, skipping seed")

SEED_LEADS = [
    {"name": "Dr. Rajesh Sharma", "hospital_clinic": "Apollo Hospital", "phone_whatsapp": "+919876543001", "email": "rajesh@apollo.in", "district": "Hyderabad", "inquiry_type": "Bulk Quote", "source": "website", "product_interest": "Destiknee Total Knee System, Opulent Knee System", "message": "Need pricing for 50 units TKR implants for our joint replacement center.", "status": "qualified", "score": "Hot", "score_value": 90},
    {"name": "Dr. Priya Reddy", "hospital_clinic": "Yashoda Hospital", "phone_whatsapp": "+919876543002", "email": "priya@yashoda.in", "district": "Hyderabad", "inquiry_type": "Bulk Quote", "source": "website", "product_interest": "BioMime Drug Eluting Stent, Evermine50", "message": "Require coronary stent pricing for our cath lab.", "status": "negotiation", "score": "Hot", "score_value": 90},
    {"name": "Mr. Venkat Rao", "hospital_clinic": "District General Hospital", "phone_whatsapp": "+919876543003", "email": "venkat@dgh.gov.in", "district": "Warangal", "inquiry_type": "Bulk Quote", "source": "website", "product_interest": "Maira Surgical Gowns, Sterile Gauze", "message": "Government tender for infection prevention supplies.", "status": "new", "score": "Hot", "score_value": 90},
    {"name": "Dr. Sunil Kumar", "hospital_clinic": "KIMS Hospital", "phone_whatsapp": "+919876543004", "email": "sunil@kims.in", "district": "Rangareddy", "inquiry_type": "Product Info", "source": "website", "product_interest": "MISSO Orthopedic Robotic System", "message": "Interested in robotic knee replacement system demo.", "status": "contacted", "score": "Warm", "score_value": 55},
    {"name": "Dr. Meena Devi", "hospital_clinic": "Care Hospital", "phone_whatsapp": "+919876543005", "email": "meena@care.in", "district": "Hyderabad", "inquiry_type": "Product Info", "source": "whatsapp", "product_interest": "AutoQuant 400 Analyzer", "message": "Need specifications for clinical chemistry analyzer.", "status": "contacted", "score": "Warm", "score_value": 55},
    {"name": "Mr. Ravi Teja", "hospital_clinic": "Sunshine Hospital", "phone_whatsapp": "+919876543006", "email": "", "district": "Karimnagar", "inquiry_type": "Brochure Download", "source": "website", "product_interest": "KET Plating System", "message": "", "status": "new", "score": "Warm", "score_value": 40},
    {"name": "Dr. Lakshmi Prasad", "hospital_clinic": "Government ENT Hospital", "phone_whatsapp": "+919876543007", "email": "lakshmi@govhosp.in", "district": "Nizamabad", "inquiry_type": "Bulk Quote", "source": "website", "product_interest": "MYRAC RF Plasma Generator, MESIC ENT Diode Laser", "message": "Setting up new ENT OT. Need complete equipment list and pricing.", "status": "qualified", "score": "Hot", "score_value": 90},
    {"name": "Mr. Satish Babu", "hospital_clinic": "City Clinic", "phone_whatsapp": "+919876543008", "email": "", "district": "Khammam", "inquiry_type": "General", "source": "website", "product_interest": "", "message": "Looking for medical supplies distributor.", "status": "new", "score": "Cold", "score_value": 25},
    {"name": "Dr. Anitha Kumari", "hospital_clinic": "Continental Hospital", "phone_whatsapp": "+919876543009", "email": "anitha@continental.in", "district": "Hyderabad", "inquiry_type": "Bulk Quote", "source": "whatsapp", "product_interest": "Myval TAVR, Myclip TEER", "message": "Our cardiac surgery dept needs TAVR valves. Please share pricing for 20 units.", "status": "won", "score": "Hot", "score_value": 90},
    {"name": "Dr. Naveen Reddy", "hospital_clinic": "Global Hospital", "phone_whatsapp": "+919876543010", "email": "naveen@global.in", "district": "Medchal-Malkajgiri", "inquiry_type": "Product Info", "source": "website", "product_interest": "Latitude Hip System, Bipolar Cup", "message": "Need hip replacement implant catalog.", "status": "contacted", "score": "Warm", "score_value": 55},
    {"name": "Mr. Mahesh Kumar", "hospital_clinic": "Rural Health Center", "phone_whatsapp": "+919876543011", "email": "", "district": "Adilabad", "inquiry_type": "Brochure Download", "source": "website", "product_interest": "Baktio Hand Hygiene", "message": "", "status": "lost", "score": "Cold", "score_value": 30},
    {"name": "Dr. Swathi Reddy", "hospital_clinic": "Star Hospital", "phone_whatsapp": "+919876543012", "email": "swathi@star.in", "district": "Hyderabad", "inquiry_type": "Bulk Quote", "source": "website", "product_interest": "Mirus Powered Endocutter, Mitsu Sutures", "message": "Need surgical consumables for our general surgery dept. Monthly requirement.", "status": "negotiation", "score": "Hot", "score_value": 90},
]

async def seed_leads():
    count = await leads_col.count_documents({})
    if count < 5:
        for lead in SEED_LEADS:
            lead["notes"] = []
            lead["assigned_to"] = ""
            lead["created_at"] = datetime.now(timezone.utc).isoformat()
            lead["updated_at"] = datetime.now(timezone.utc).isoformat()
        await leads_col.insert_many(SEED_LEADS)
        print(f"Seeded {len(SEED_LEADS)} demo leads")
    else:
        print(f"Database already has {count} leads, skipping seed")

@app.on_event("startup")
async def startup():
    await seed_database()
    await seed_leads()
    await products_col.create_index("division")
    await products_col.create_index("category")
    await products_col.create_index("slug")
    await products_col.create_index("status")
    await products_col.create_index("sku_code", unique=True, sparse=True)
    await leads_col.create_index("score")
    await leads_col.create_index("status")
    await leads_col.create_index("created_at")
    print("MedDevice Pro API started")
