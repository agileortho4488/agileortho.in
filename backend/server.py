from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Query, Form, Request
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

app = FastAPI(title="Agile Ortho API")

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
    return {"status": "ok", "service": "Agile Ortho API"}

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

    # Sync new lead to Interakt in background
    if lead.phone_whatsapp:
        asyncio.create_task(track_user_in_interakt(
            lead.phone_whatsapp, name=lead.name, email=lead.email or "",
            traits={"hospital": lead.hospital_clinic or "", "district": lead.district or "",
                    "inquiry_type": lead.inquiry_type or "", "product_interest": lead.product_interest or ""},
            tags=["website-lead", f"score-{score_label.lower()}"]
        ))
        asyncio.create_task(track_event_in_interakt(
            lead.phone_whatsapp, "Lead Created",
            {"source": lead.source or "website", "inquiry_type": lead.inquiry_type or "",
             "product_interest": lead.product_interest or ""}
        ))

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


def extract_pdf_text_ocr(file_path: str) -> str:
    """Fallback: convert PDF pages to images and run OCR."""
    try:
        from pdf2image import convert_from_path
        import pytesseract
        images = convert_from_path(file_path, dpi=250, first_page=1, last_page=20)
        text = ""
        for img in images:
            page_text = pytesseract.image_to_string(img)
            if page_text:
                text += page_text + "\n\n"
        return text.strip()
    except Exception:
        return ""


def pdf_pages_to_base64(file_path: str, max_pages: int = 8) -> list:
    """Convert PDF pages to base64-encoded JPEG images for Claude Vision."""
    try:
        from pdf2image import convert_from_path
        import base64
        from io import BytesIO
        images = convert_from_path(file_path, dpi=200, first_page=1, last_page=max_pages)
        result = []
        for img in images:
            buf = BytesIO()
            img.save(buf, format="JPEG", quality=75)
            b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            result.append(b64)
        return result
    except Exception:
        return []


async def claude_extract_products_vision(page_images_b64: list) -> list:
    """Use Claude Vision to extract product data from PDF page images."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"pdf-vision-{uuid.uuid4().hex[:8]}",
                system_message="""You are a medical device product data extraction specialist.
You will receive images of pages from a medical device catalog/brochure.
Extract structured product information from these images. For each distinct product found, return a JSON array of objects with these fields:
- product_name: Full product name
- sku_code: SKU or product code (generate one like MRL-XXX-NNN if not found)
- division: One of: Orthopedics, Trauma, Cardiovascular, Diagnostics, ENT, Endo-surgical, Infection Prevention, Peripheral Intervention
- category: Sub-category within the division
- description: 2-3 sentence description of the product
- technical_specifications: Object with key technical specs (material, dimensions, features)
- material: Primary material (e.g., Titanium, Stainless Steel)
- manufacturer: Manufacturer name (default: Meril Life Sciences)
- size_variables: Array of available sizes if mentioned
- pack_size: Pack size if mentioned

IMPORTANT: Group related items. For example, multiple sizes of the same plate should be ONE product with sizes in size_variables.
Return ONLY a valid JSON array. No markdown, no explanation, just the JSON array."""
            ).with_model("anthropic", "claude-sonnet-4-20250514")

            file_contents = [ImageContent(image_base64=img) for img in page_images_b64]
            prompt = "Extract all medical device products from these catalog/brochure pages. Return ONLY a valid JSON array of product objects."
            response = await chat.send_message(UserMessage(text=prompt, file_contents=file_contents))

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
        except Exception as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(5 * (attempt + 1))
                continue
            raise e
    return []


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
        # Step 1: Try text extraction
        pdf_text = extract_pdf_text(file_path)
        use_vision = False

        if not pdf_text or len(pdf_text) < 50:
            # Step 2: Try OCR fallback
            pdf_text = extract_pdf_text_ocr(file_path)

        if not pdf_text or len(pdf_text) < 50:
            # Step 3: Use Claude Vision (image-based PDF)
            use_vision = True
            page_images = pdf_pages_to_base64(file_path, max_pages=10)
            if not page_images:
                await imports_col.update_one(
                    {"_id": ObjectId(import_id)},
                    {"$set": {"status": "failed", "error": "Could not extract text or images from PDF"}}
                )
                return

        # Claude extraction
        if use_vision:
            # Process in batches of 3 pages to stay within limits
            all_products = []
            for i in range(0, len(page_images), 3):
                batch = page_images[i:i+3]
                batch_products = await claude_extract_products_vision(batch)
                all_products.extend(batch_products)
            products = all_products
        else:
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


@app.post("/api/admin/imports/{import_id}/reprocess")
async def reprocess_import(import_id: str, _=Depends(admin_required)):
    try:
        doc = await imports_col.find_one({"_id": ObjectId(import_id)})
    except Exception:
        raise HTTPException(400, "Invalid import ID")
    if not doc:
        raise HTTPException(404, "Import not found")
    if doc.get("status") != "failed":
        raise HTTPException(400, "Only failed imports can be reprocessed")
    file_path = doc.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(400, "Original PDF file not found on server")
    await imports_col.update_one(
        {"_id": ObjectId(import_id)},
        {"$set": {"status": "processing", "error": None, "extracted_products": [], "total_count": 0}}
    )
    asyncio.create_task(process_pdf_import(import_id, file_path))
    return {"status": "processing", "message": "Reprocessing started"}




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
            p["seo_meta_title"] = f"{p['product_name']} | Meril {p['division']} - Agile Ortho Telangana"
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
    await conversations_col.create_index("session_id")
    await conversations_col.create_index("updated_at")
    # Text index for product search (RAG)
    try:
        await products_col.create_index([
            ("product_name", "text"),
            ("description", "text"),
            ("category", "text"),
            ("division", "text"),
            ("material", "text"),
        ])
    except Exception:
        pass
    print("Agile Ortho API started")


# ============================================================
#  PHASE 4: RAG AI CHATBOT
# ============================================================

CHATBOT_SYSTEM_PROMPT = """You are the AI Sales Assistant for Agile Ortho, an authorized master distributor of Meril Life Sciences medical devices in Telangana, India.

IDENTITY & PERSONALITY:
- You are professional, knowledgeable, and helpful
- You represent Agile Ortho — a premier B2B medical device distributor
- You speak with authority about medical device products but never give medical advice
- You are warm and approachable, using a consultative sales approach
- You address users as "Doctor" or "Sir/Madam" unless they specify otherwise

YOUR CAPABILITIES:
1. PRODUCT EXPERT: Answer questions about Meril medical devices — specifications, materials, sizes, categories, applications
2. LEAD CAPTURE: When a user shows buying interest, naturally collect their Name, Hospital/Clinic, WhatsApp number, and District
3. QUOTE ASSISTANCE: Guide users to request bulk pricing quotes
4. WHATSAPP ROUTING: When users want to speak with a human, provide the WhatsApp link

RULES:
- NEVER disclose pricing. Always say "We provide competitive bulk pricing tailored to your hospital's needs. Let me connect you with our sales team."
- NEVER give medical advice or treatment recommendations
- When asked about products not in your knowledge base, say "I don't have information on that specific product. Let me connect you with our product specialist."
- Always recommend products from the PRODUCT CONTEXT provided
- If the user gives their contact details (name, phone, hospital), acknowledge them warmly and confirm you'll have the team follow up
- Keep responses concise — 2-4 sentences max unless the user asks for detailed specs
- Use bullet points for listing multiple products or specs
- When the user wants human support: "You can reach our sales team directly on WhatsApp: https://wa.me/917416521222"

ABOUT AGILE ORTHO:
- Authorized Meril Life Sciences Master Distributor for Telangana
- Serves hospitals, clinics, and diagnostic centers across all 33 districts of Telangana
- Specializes in Orthopedics, Trauma, Cardiovascular, Diagnostics, ENT, Endo-surgical, and Infection Prevention devices
- ISO 13485 certified supply chain
- Offers bulk pricing, quick delivery, and after-sales support

PRODUCT CONTEXT (from catalog):
{product_context}
"""


class ChatMessage(BaseModel):
    message: str
    session_id: str = ""


class ChatLeadCapture(BaseModel):
    session_id: str
    name: str = ""
    hospital_clinic: str = ""
    phone_whatsapp: str = ""
    email: str = ""
    district: str = ""


async def search_relevant_products(query: str, limit: int = 8) -> list:
    """Search products relevant to user query using text search + keyword matching."""
    results = []

    # 1. MongoDB text search
    try:
        cursor = products_col.find(
            {"$text": {"$search": query}, "status": "published"},
            {"score": {"$meta": "textScore"}, "_id": 0, "slug": 0}
        ).sort([("score", {"$meta": "textScore"})]).limit(limit)
        async for doc in cursor:
            doc.pop("score", None)
            results.append(doc)
    except Exception:
        pass

    # 2. If text search yields few results, try keyword matching
    if len(results) < 3:
        keywords = [w.lower() for w in query.split() if len(w) > 2]
        for kw in keywords[:3]:
            regex = {"$regex": kw, "$options": "i"}
            cursor = products_col.find(
                {"$or": [
                    {"product_name": regex},
                    {"division": regex},
                    {"category": regex},
                    {"material": regex},
                    {"description": regex},
                ], "status": "published"},
                {"_id": 0, "slug": 0}
            ).limit(4)
            async for doc in cursor:
                if not any(r.get("sku_code") == doc.get("sku_code") for r in results):
                    results.append(doc)

    return results[:limit]


def format_product_context(products: list) -> str:
    """Format product list into a concise context string for the LLM."""
    if not products:
        return "No specific products found matching the query. Suggest the user browse the full catalog at /products or contact sales."

    lines = []
    for p in products:
        specs = p.get("technical_specifications", {})
        spec_str = ", ".join(f"{k}: {v}" for k, v in specs.items()) if specs else "N/A"
        sizes = ", ".join(p.get("size_variables", [])) if p.get("size_variables") else "N/A"
        lines.append(
            f"- **{p.get('product_name', 'Unknown')}** (SKU: {p.get('sku_code', 'N/A')})\n"
            f"  Division: {p.get('division', '')} | Category: {p.get('category', '')}\n"
            f"  Material: {p.get('material', 'N/A')} | Manufacturer: {p.get('manufacturer', 'Meril')}\n"
            f"  Description: {p.get('description', '')[:200]}\n"
            f"  Specs: {spec_str}\n"
            f"  Sizes: {sizes}\n"
            f"  Pack: {p.get('pack_size', 'N/A')}"
        )
    return "\n".join(lines)


@app.post("/api/chat")
async def chat_endpoint(msg: ChatMessage):
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    session_id = msg.session_id or uuid.uuid4().hex
    user_text = msg.message.strip()
    if not user_text:
        raise HTTPException(400, "Message cannot be empty")

    # Search relevant products
    relevant_products = await search_relevant_products(user_text)
    product_context = format_product_context(relevant_products)

    # Build system prompt with product context
    system_prompt = CHATBOT_SYSTEM_PROMPT.replace("{product_context}", product_context)

    # Load conversation history
    conv = await conversations_col.find_one({"session_id": session_id})
    history = conv.get("messages", []) if conv else []

    # Build initial messages with history
    initial_msgs = [{"role": "system", "content": system_prompt}]
    for h in history[-10:]:  # Last 10 messages for context
        initial_msgs.append({"role": h["role"], "content": h["content"]})

    # Build chat with Claude
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"chat-{session_id}",
        system_message=system_prompt,
        initial_messages=initial_msgs,
    ).with_model("anthropic", "claude-sonnet-4-20250514")

    # Send new message
    try:
        response = await chat.send_message(UserMessage(text=user_text))
    except Exception as e:
        response = "I'm having trouble connecting right now. Please try again in a moment, or reach our team directly on WhatsApp: https://wa.me/917416521222"

    # Save conversation
    new_messages = history + [
        {"role": "user", "content": user_text, "timestamp": datetime.now(timezone.utc).isoformat()},
        {"role": "assistant", "content": response, "timestamp": datetime.now(timezone.utc).isoformat()},
    ]

    await conversations_col.update_one(
        {"session_id": session_id},
        {"$set": {
            "session_id": session_id,
            "messages": new_messages,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "message_count": len(new_messages),
        },
         "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )

    # Check if lead info was shared — auto-capture
    lead_captured = False
    lower_text = user_text.lower()
    if any(kw in lower_text for kw in ["my name is", "i am dr", "hospital", "clinic", "my number", "my phone", "whatsapp"]):
        lead_captured = True

    return {
        "response": response,
        "session_id": session_id,
        "products_referenced": len(relevant_products),
        "lead_signal": lead_captured,
    }


@app.post("/api/chat/lead")
async def chat_capture_lead(data: ChatLeadCapture):
    """Capture lead information from chat conversation."""
    if not data.name or not data.phone_whatsapp:
        raise HTTPException(400, "Name and phone number are required")

    # Calculate lead score
    score = 20  # Base score for chat engagement
    if data.hospital_clinic:
        score += 15
    if data.email:
        score += 10
    if data.district:
        score += 10

    score_label = "hot" if score >= 60 else "warm" if score >= 35 else "cold"

    lead = {
        "name": data.name,
        "hospital_clinic": data.hospital_clinic,
        "phone_whatsapp": data.phone_whatsapp,
        "email": data.email,
        "district": data.district,
        "inquiry_type": "AI Chat",
        "product_interest": "",
        "source": "chatbot",
        "score": score_label,
        "score_value": score,
        "status": "new",
        "notes": f"Lead captured via AI chatbot. Session: {data.session_id}",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await leads_col.insert_one(lead)
    lead.pop("_id", None)

    # Link lead to conversation
    await conversations_col.update_one(
        {"session_id": data.session_id},
        {"$set": {"lead_captured": True, "lead_name": data.name}}
    )

    return {"message": "Lead captured successfully", "lead_id": str(result.inserted_id)}


@app.get("/api/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    conv = await conversations_col.find_one({"session_id": session_id}, {"_id": 0})
    if not conv:
        return {"messages": [], "session_id": session_id}
    return {"messages": conv.get("messages", []), "session_id": session_id}


@app.get("/api/chat/suggestions")
async def chat_suggestions():
    """Return quick-start suggestions for the chat widget."""
    return {
        "suggestions": [
            "What orthopedic implants do you offer?",
            "Tell me about trauma plating systems",
            "Do you have locking plates for distal radius?",
            "What titanium screws are available?",
            "I need devices for my hospital in Hyderabad",
        ]
    }



# ============================================================
#  PHASE 5: INTERAKT WHATSAPP INTEGRATION (ENHANCED)
# ============================================================

INTERAKT_API_KEY = os.environ.get("INTERAKT_API_KEY", "")
INTERAKT_API_URL = "https://api.interakt.ai/v1/public/message/"
INTERAKT_TRACK_URL = "https://api.interakt.ai/v1/public/track/users/"
INTERAKT_EVENT_URL = "https://api.interakt.ai/v1/public/track/events/"
INTERAKT_WEBHOOK_SECRET = os.environ.get("INTERAKT_WEBHOOK_SECRET", "")
WHATSAPP_NUMBER = os.environ.get("WHATSAPP_BUSINESS_NUMBER", "+917416521222")

wa_conversations_col = db["wa_conversations"]
wa_message_status_col = db["wa_message_status"]
wa_webhook_logs_col = db["wa_webhook_logs"]


def interakt_auth_header():
    return f"Basic {INTERAKT_API_KEY}"


def clean_phone_number(phone: str):
    """Clean phone number — strip country code, spaces, dashes."""
    clean = phone.replace("+", "").replace(" ", "").replace("-", "")
    if clean.startswith("91") and len(clean) > 10:
        clean = clean[2:]
    return clean


async def send_whatsapp_message(phone: str, text: str, country_code: str = "+91", callback_data: str = "wa_bot_reply"):
    """Send a text message via Interakt WhatsApp API (session message)."""
    import requests as req
    headers = {
        "Authorization": interakt_auth_header(),
        "Content-Type": "application/json",
    }
    clean_phone = clean_phone_number(phone)
    payload = {
        "countryCode": country_code,
        "phoneNumber": clean_phone,
        "callbackData": callback_data,
        "type": "Text",
        "data": {
            "message": text
        }
    }
    try:
        resp = req.post(INTERAKT_API_URL, json=payload, headers=headers, timeout=15)
        result = resp.json()
        msg_id = result.get("id", "")
        if msg_id:
            await wa_message_status_col.insert_one({
                "message_id": msg_id,
                "phone": clean_phone,
                "type": "text",
                "status": "queued",
                "callback_data": callback_data,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        return {"success": resp.status_code in (200, 201), "data": result, "message_id": msg_id}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def send_whatsapp_template(phone: str, template_name: str, language_code: str = "en",
                                  body_values: list = None, header_values: list = None,
                                  button_values: dict = None, country_code: str = "+91",
                                  callback_data: str = "wa_template"):
    """Send a template message via Interakt WhatsApp API."""
    import requests as req
    headers = {
        "Authorization": interakt_auth_header(),
        "Content-Type": "application/json",
    }
    clean_phone = clean_phone_number(phone)
    template = {
        "name": template_name,
        "languageCode": language_code,
    }
    if body_values:
        template["bodyValues"] = body_values
    if header_values:
        template["headerValues"] = header_values
    if button_values:
        template["buttonValues"] = button_values

    payload = {
        "countryCode": country_code,
        "phoneNumber": clean_phone,
        "callbackData": callback_data,
        "type": "Template",
        "template": template,
    }
    try:
        resp = req.post(INTERAKT_API_URL, json=payload, headers=headers, timeout=15)
        result = resp.json()
        msg_id = result.get("id", "")
        if msg_id:
            await wa_message_status_col.insert_one({
                "message_id": msg_id,
                "phone": clean_phone,
                "type": "template",
                "template_name": template_name,
                "status": "queued",
                "callback_data": callback_data,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        return {"success": resp.status_code in (200, 201), "data": result, "message_id": msg_id}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def track_user_in_interakt(phone: str, name: str = "", email: str = "",
                                  traits: dict = None, tags: list = None):
    """Sync a user/lead to Interakt via User Track API."""
    import requests as req
    headers = {
        "Authorization": interakt_auth_header(),
        "Content-Type": "application/json",
    }
    clean_phone = clean_phone_number(phone)
    user_traits = {"name": name} if name else {}
    if email:
        user_traits["email"] = email
    if traits:
        user_traits.update(traits)

    payload = {
        "phoneNumber": clean_phone,
        "countryCode": "+91",
        "traits": user_traits,
    }
    if tags:
        payload["tags"] = tags

    try:
        resp = req.post(INTERAKT_TRACK_URL, json=payload, headers=headers, timeout=15)
        return {"success": resp.status_code in (200, 201, 202), "data": resp.json()}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def track_event_in_interakt(phone: str, event_name: str, event_traits: dict = None):
    """Track a business event for a user in Interakt via Event Track API."""
    import requests as req
    headers = {
        "Authorization": interakt_auth_header(),
        "Content-Type": "application/json",
    }
    clean_phone = clean_phone_number(phone)
    payload = {
        "phoneNumber": clean_phone,
        "countryCode": "+91",
        "event": event_name,
    }
    if event_traits:
        payload["traits"] = event_traits

    try:
        resp = req.post(INTERAKT_EVENT_URL, json=payload, headers=headers, timeout=15)
        return {"success": resp.status_code in (200, 201), "data": resp.json()}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def handle_wa_incoming(phone: str, message_text: str, customer_name: str = ""):
    """Process incoming WhatsApp message through RAG AI and send reply."""
    # Create/get WhatsApp conversation session
    session_id = f"wa-{phone}"
    conv = await wa_conversations_col.find_one({"phone": phone})

    if not conv:
        # New WhatsApp contact — create conversation and auto-create lead
        await wa_conversations_col.insert_one({
            "phone": phone,
            "session_id": session_id,
            "customer_name": customer_name or phone,
            "messages": [],
            "status": "active",
            "unread": 0,
            "lead_created": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        conv = await wa_conversations_col.find_one({"phone": phone})

    # Save incoming message
    incoming_msg = {
        "role": "customer",
        "content": message_text,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "channel": "whatsapp",
    }

    # Use RAG AI to generate response
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    relevant_products = await search_relevant_products(message_text)
    product_context = format_product_context(relevant_products)
    system_prompt = CHATBOT_SYSTEM_PROMPT.replace("{product_context}", product_context)

    # Build history from conversation
    history = conv.get("messages", [])
    initial_msgs = [{"role": "system", "content": system_prompt}]
    for h in history[-8:]:
        role = "user" if h["role"] == "customer" else "assistant"
        initial_msgs.append({"role": role, "content": h["content"]})

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"wa-chat-{phone}",
        system_message=system_prompt,
        initial_messages=initial_msgs,
    ).with_model("anthropic", "claude-sonnet-4-20250514")

    try:
        ai_response = await chat.send_message(UserMessage(text=message_text))
    except Exception:
        ai_response = "Thank you for your message. Our team will get back to you shortly. For urgent queries, call us at +917416521222."

    # Save both messages
    outgoing_msg = {
        "role": "assistant",
        "content": ai_response,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "channel": "whatsapp",
    }

    await wa_conversations_col.update_one(
        {"phone": phone},
        {
            "$push": {"messages": {"$each": [incoming_msg, outgoing_msg]}},
            "$set": {
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "customer_name": customer_name or conv.get("customer_name", phone),
            },
            "$inc": {"unread": 1},
        }
    )

    # Auto-create lead if not already created
    if not conv.get("lead_created"):
        lead = {
            "name": customer_name or f"WhatsApp {phone}",
            "phone_whatsapp": phone,
            "hospital_clinic": "",
            "email": "",
            "district": "",
            "inquiry_type": "WhatsApp Chat",
            "product_interest": "",
            "source": "whatsapp",
            "score": "warm",
            "score_value": 30,
            "status": "new",
            "notes": f"Auto-created from WhatsApp conversation",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await leads_col.insert_one(lead)
        await wa_conversations_col.update_one(
            {"phone": phone},
            {"$set": {"lead_created": True}}
        )
        # Sync new contact to Interakt
        asyncio.create_task(track_user_in_interakt(
            phone, name=customer_name or f"WhatsApp {phone}",
            tags=["whatsapp-lead", "auto-created"]
        ))
        asyncio.create_task(track_event_in_interakt(
            phone, "WhatsApp Conversation Started",
            {"source": "whatsapp", "first_message": message_text[:100]}
        ))

    # Send reply via Interakt
    await send_whatsapp_message(phone, ai_response)

    return ai_response


# --- Webhook endpoint for Interakt ---
def verify_interakt_signature(raw_body: bytes, signature: str) -> bool:
    """Verify HMAC SHA256 signature from Interakt webhook."""
    if not INTERAKT_WEBHOOK_SECRET or not signature:
        return not INTERAKT_WEBHOOK_SECRET  # Skip if no secret configured
    import hmac as hmac_mod
    from hashlib import sha256
    expected = "sha256=" + hmac_mod.new(
        INTERAKT_WEBHOOK_SECRET.encode("utf-8"), raw_body, sha256
    ).hexdigest()
    return hmac_mod.compare_digest(expected, signature)


@app.post("/api/webhook/whatsapp")
async def whatsapp_webhook(request: Request):
    """Receive incoming WhatsApp messages and status updates from Interakt."""
    try:
        raw_body = await request.body()
        payload = json.loads(raw_body)
    except Exception:
        return {"status": "error", "message": "Invalid payload"}

    # Verify HMAC signature — log mismatch but don't block (Interakt signing may vary)
    signature = request.headers.get("Interakt-Signature", "")
    sig_valid = verify_interakt_signature(raw_body, signature)
    if INTERAKT_WEBHOOK_SECRET and not sig_valid:
        print(f"[WEBHOOK] Signature mismatch — event={payload.get('type','?')}, has_sig={bool(signature)}")

    event_type = payload.get("type", "")
    data = payload.get("data", {})

    # Log all webhook events for debugging/analytics
    print(f"[WEBHOOK] Received: type={event_type}, phone={data.get('customer', {}).get('channel_phone_number', '')}")
    await wa_webhook_logs_col.insert_one({
        "event_type": event_type,
        "timestamp": payload.get("timestamp", datetime.now(timezone.utc).isoformat()),
        "received_at": datetime.now(timezone.utc).isoformat(),
        "signature_valid": sig_valid,
        "has_signature": bool(signature),
        "data_summary": {
            "phone": data.get("customer", {}).get("channel_phone_number", ""),
            "message_id": data.get("message", {}).get("id", ""),
        },
        "raw_keys": list(payload.keys()),
    })

    # --- Incoming customer message ---
    if event_type == "message_received":
        customer = data.get("customer", {})
        message = data.get("message", {})
        phone = customer.get("channel_phone_number", "")
        customer_name = customer.get("traits", {}).get("name", "")
        message_text = message.get("message", "")

        if phone and message_text:
            conv = await wa_conversations_col.find_one({"phone": phone})
            if conv and conv.get("status") == "human":
                incoming_msg = {
                    "role": "customer",
                    "content": message_text,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "channel": "whatsapp",
                }
                await wa_conversations_col.update_one(
                    {"phone": phone},
                    {
                        "$push": {"messages": incoming_msg},
                        "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
                        "$inc": {"unread": 1},
                    }
                )
            else:
                asyncio.create_task(handle_wa_incoming(phone, message_text, customer_name))

    # --- API message delivery statuses ---
    elif event_type in ("message_api_sent", "message_api_delivered", "message_api_read",
                        "message_api_failed", "message_api_clicked"):
        message = data.get("message", {})
        msg_id = message.get("id", "")
        status_map = {
            "message_api_sent": "sent",
            "message_api_delivered": "delivered",
            "message_api_read": "read",
            "message_api_failed": "failed",
            "message_api_clicked": "clicked",
        }
        new_status = status_map.get(event_type, event_type)
        update_fields = {
            "status": new_status,
            f"{new_status}_at": datetime.now(timezone.utc).isoformat(),
            "phone": data.get("customer", {}).get("channel_phone_number", ""),
        }
        if event_type == "message_api_failed":
            update_fields["failure_reason"] = message.get("channel_failure_reason", "")
            update_fields["error_code"] = message.get("channel_error_code", "")
        if event_type == "message_api_clicked":
            update_fields["click_type"] = data.get("event", {}).get("click_type", "")
            update_fields["button_text"] = data.get("event", {}).get("button_text", "")
        if msg_id:
            await wa_message_status_col.update_one(
                {"message_id": msg_id},
                {"$set": update_fields},
                upsert=True,
            )

    # --- Campaign message delivery statuses ---
    elif event_type in ("message_campaign_sent", "message_campaign_delivered",
                        "message_campaign_read", "message_campaign_failed"):
        message = data.get("message", {})
        msg_id = message.get("id", "")
        status_map = {
            "message_campaign_sent": "sent",
            "message_campaign_delivered": "delivered",
            "message_campaign_read": "read",
            "message_campaign_failed": "failed",
        }
        new_status = status_map.get(event_type, event_type)
        update_fields = {
            "status": new_status,
            "source": "campaign",
            f"{new_status}_at": datetime.now(timezone.utc).isoformat(),
            "phone": data.get("customer", {}).get("channel_phone_number", ""),
            "campaign_id": message.get("campaign_id", ""),
        }
        if event_type == "message_campaign_failed":
            update_fields["failure_reason"] = message.get("channel_failure_reason", "")
        if msg_id:
            await wa_message_status_col.update_one(
                {"message_id": msg_id},
                {"$set": update_fields},
                upsert=True,
            )

    # --- Template status updates (approved/rejected by Meta) ---
    elif event_type == "message_template_status_update":
        template_event = data.get("event", "")
        template_name = data.get("message_template_name", "")
        template_lang = data.get("message_template_language", "")
        reason = data.get("reason")
        await wa_webhook_logs_col.update_one(
            {"event_type": event_type, "received_at": {"$exists": True}},
            {"$set": {
                "template_name": template_name,
                "template_status": template_event,
                "template_language": template_lang,
                "rejection_reason": reason,
            }},
            upsert=False,
        )

    # --- Account alerts & events ---
    elif event_type in ("account_alerts", "account_update", "account_review_update",
                        "business_capability_update", "phone_number_quality_update",
                        "template_performance_metrics", "messages"):
        pass  # Already logged above

    return {"status": "success", "code": 200}


# --- Admin WhatsApp inbox endpoints ---
@app.get("/api/admin/whatsapp/conversations")
async def get_wa_conversations(_=Depends(admin_required)):
    """Get all WhatsApp conversations for the CRM inbox."""
    cursor = wa_conversations_col.find(
        {},
        {"_id": 0}
    ).sort("updated_at", -1).limit(100)
    conversations = []
    async for doc in cursor:
        # Get last message preview
        msgs = doc.get("messages", [])
        last_msg = msgs[-1] if msgs else None
        conversations.append({
            "phone": doc["phone"],
            "session_id": doc.get("session_id", ""),
            "customer_name": doc.get("customer_name", doc["phone"]),
            "status": doc.get("status", "active"),
            "unread": doc.get("unread", 0),
            "message_count": len(msgs),
            "last_message": last_msg.get("content", "")[:100] if last_msg else "",
            "last_message_role": last_msg.get("role", "") if last_msg else "",
            "last_message_time": last_msg.get("timestamp", "") if last_msg else "",
            "lead_created": doc.get("lead_created", False),
            "created_at": doc.get("created_at", ""),
            "updated_at": doc.get("updated_at", ""),
        })
    return {"conversations": conversations, "total": len(conversations)}


@app.get("/api/admin/whatsapp/conversations/{phone}")
async def get_wa_conversation(phone: str, _=Depends(admin_required)):
    """Get a specific WhatsApp conversation with full messages."""
    doc = await wa_conversations_col.find_one({"phone": phone}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Conversation not found")
    # Mark as read
    await wa_conversations_col.update_one({"phone": phone}, {"$set": {"unread": 0}})
    return doc


@app.post("/api/admin/whatsapp/send")
async def admin_send_wa_message(request: Request, _=Depends(admin_required)):
    """Admin sends a manual reply to a WhatsApp conversation."""
    body = await request.json()
    phone = body.get("phone", "")
    message = body.get("message", "")
    if not phone or not message:
        raise HTTPException(400, "Phone and message are required")

    # Send via Interakt
    result = await send_whatsapp_message(phone, message)

    # Save to conversation
    admin_msg = {
        "role": "admin",
        "content": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "channel": "whatsapp",
    }
    await wa_conversations_col.update_one(
        {"phone": phone},
        {
            "$push": {"messages": admin_msg},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
        upsert=True,
    )

    return {"success": result.get("success", False), "message": "Reply sent"}


@app.post("/api/admin/whatsapp/conversations/{phone}/takeover")
async def admin_takeover_conversation(phone: str, _=Depends(admin_required)):
    """Admin takes over a conversation from the AI bot."""
    await wa_conversations_col.update_one(
        {"phone": phone},
        {"$set": {"status": "human", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Conversation switched to human mode"}


@app.post("/api/admin/whatsapp/conversations/{phone}/automate")
async def admin_automate_conversation(phone: str, _=Depends(admin_required)):
    """Switch conversation back to AI bot."""
    await wa_conversations_col.update_one(
        {"phone": phone},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Conversation switched back to AI mode"}


# --- Template Message Endpoints ---

@app.post("/api/admin/whatsapp/send-template")
async def admin_send_template(request: Request, _=Depends(admin_required)):
    """Send a pre-approved WhatsApp template message to a customer."""
    body = await request.json()
    phone = body.get("phone", "")
    template_name = body.get("template_name", "")
    language_code = body.get("language_code", "en")
    body_values = body.get("body_values", [])
    header_values = body.get("header_values", [])
    button_values = body.get("button_values")

    if not phone or not template_name:
        raise HTTPException(400, "Phone and template_name are required")

    result = await send_whatsapp_template(
        phone, template_name, language_code,
        body_values=body_values or None,
        header_values=header_values or None,
        button_values=button_values,
        callback_data=f"template_{template_name}",
    )

    # Save template message to conversation
    template_msg = {
        "role": "admin",
        "content": f"[Template: {template_name}] " + (", ".join(body_values) if body_values else ""),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "channel": "whatsapp",
        "type": "template",
        "template_name": template_name,
    }
    await wa_conversations_col.update_one(
        {"phone": phone},
        {
            "$push": {"messages": template_msg},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
        upsert=True,
    )

    return {"success": result.get("success", False), "message": "Template sent", "data": result.get("data")}


# --- Interakt Contact Sync Endpoints ---

@app.post("/api/admin/whatsapp/sync-lead")
async def admin_sync_lead_to_interakt(request: Request, _=Depends(admin_required)):
    """Sync a specific lead to Interakt's contact database with traits and tags."""
    body = await request.json()
    lead_id = body.get("lead_id", "")
    if not lead_id:
        raise HTTPException(400, "lead_id is required")

    lead = await leads_col.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Lead not found")

    phone = lead.get("phone_whatsapp", "")
    if not phone:
        raise HTTPException(400, "Lead has no WhatsApp number")

    tags = ["crm-lead"]
    if lead.get("score"):
        tags.append(f"score-{lead['score'].lower()}")
    if lead.get("source"):
        tags.append(f"source-{lead['source'].lower()}")

    traits = {
        "name": lead.get("name", ""),
        "email": lead.get("email", ""),
        "hospital": lead.get("hospital_clinic", ""),
        "district": lead.get("district", ""),
        "inquiry_type": lead.get("inquiry_type", ""),
        "product_interest": lead.get("product_interest", ""),
        "lead_status_crm": lead.get("status", ""),
    }
    # Remove empty traits
    traits = {k: v for k, v in traits.items() if v}

    result = await track_user_in_interakt(phone, name=lead.get("name", ""), email=lead.get("email", ""),
                                           traits=traits, tags=tags)
    return {"success": result.get("success", False), "data": result.get("data")}


@app.post("/api/admin/whatsapp/sync-all-leads")
async def admin_sync_all_leads(request: Request, _=Depends(admin_required)):
    """Bulk sync all leads with WhatsApp numbers to Interakt."""
    cursor = leads_col.find(
        {"phone_whatsapp": {"$ne": ""}},
        {"_id": 0}
    )
    synced = 0
    failed = 0
    async for lead in cursor:
        phone = lead.get("phone_whatsapp", "")
        if not phone:
            continue
        tags = ["crm-lead"]
        if lead.get("score"):
            tags.append(f"score-{lead['score'].lower()}")
        traits = {
            "name": lead.get("name", ""),
            "email": lead.get("email", ""),
            "hospital": lead.get("hospital_clinic", ""),
            "district": lead.get("district", ""),
            "lead_status_crm": lead.get("status", ""),
        }
        traits = {k: v for k, v in traits.items() if v}
        result = await track_user_in_interakt(phone, name=lead.get("name", ""),
                                               email=lead.get("email", ""),
                                               traits=traits, tags=tags)
        if result.get("success"):
            synced += 1
        else:
            failed += 1

    return {"synced": synced, "failed": failed, "total": synced + failed}


# --- Event Tracking Endpoints ---

@app.post("/api/admin/whatsapp/track-event")
async def admin_track_event(request: Request, _=Depends(admin_required)):
    """Manually track a business event for a contact in Interakt."""
    body = await request.json()
    phone = body.get("phone", "")
    event_name = body.get("event", "")
    event_traits = body.get("traits", {})

    if not phone or not event_name:
        raise HTTPException(400, "phone and event are required")

    result = await track_event_in_interakt(phone, event_name, event_traits)
    return {"success": result.get("success", False), "data": result.get("data")}


# --- Message Analytics Endpoints ---

@app.get("/api/admin/whatsapp/analytics")
async def get_wa_analytics(_=Depends(admin_required)):
    """Get WhatsApp messaging analytics — delivery rates, conversation stats."""
    # Conversation stats
    total_convs = await wa_conversations_col.count_documents({})
    active_convs = await wa_conversations_col.count_documents({"status": "active"})
    human_convs = await wa_conversations_col.count_documents({"status": "human"})

    # Message delivery stats
    total_msgs = await wa_message_status_col.count_documents({})
    sent_msgs = await wa_message_status_col.count_documents({"status": "sent"})
    delivered_msgs = await wa_message_status_col.count_documents({"status": "delivered"})
    read_msgs = await wa_message_status_col.count_documents({"status": "read"})
    failed_msgs = await wa_message_status_col.count_documents({"status": "failed"})
    queued_msgs = await wa_message_status_col.count_documents({"status": "queued"})
    template_msgs = await wa_message_status_col.count_documents({"type": "template"})

    # Total messages across all conversations
    pipeline = [
        {"$project": {"msg_count": {"$size": {"$ifNull": ["$messages", []]}}}},
        {"$group": {"_id": None, "total": {"$sum": "$msg_count"}}},
    ]
    agg = await wa_conversations_col.aggregate(pipeline).to_list(1)
    total_chat_msgs = agg[0]["total"] if agg else 0

    return {
        "conversations": {
            "total": total_convs,
            "ai_active": active_convs,
            "human_takeover": human_convs,
            "total_messages": total_chat_msgs,
        },
        "delivery": {
            "total_tracked": total_msgs,
            "queued": queued_msgs,
            "sent": sent_msgs,
            "delivered": delivered_msgs,
            "read": read_msgs,
            "failed": failed_msgs,
            "template_messages": template_msgs,
            "delivery_rate": round((delivered_msgs / total_msgs * 100) if total_msgs > 0 else 0, 1),
            "read_rate": round((read_msgs / total_msgs * 100) if total_msgs > 0 else 0, 1),
        },
    }


@app.get("/api/admin/whatsapp/webhook-logs")
async def get_wa_webhook_logs(_=Depends(admin_required)):
    """Get recent webhook events for debugging and monitoring."""
    cursor = wa_webhook_logs_col.find(
        {}, {"_id": 0}
    ).sort("received_at", -1).limit(50)
    logs = await cursor.to_list(50)
    return {"logs": logs, "total": len(logs)}
