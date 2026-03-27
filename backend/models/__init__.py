from pydantic import BaseModel
from typing import Optional


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
