from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from bson import ObjectId
from datetime import datetime, timezone
import os
import uuid
import json
import asyncio
import pdfplumber
import tempfile

from db import products_col, imports_col
from helpers import admin_required, serialize_doc, serialize_docs, escape_regex, EMERGENT_LLM_KEY

router = APIRouter()


# --- Text Extraction ---

def extract_pdf_text(file_path: str) -> str:
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n\n"
    except Exception:
        pass

    if not text or len(text) < 50:
        try:
            import fitz
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                page_text = page.get_text()
                if page_text:
                    text += page_text + "\n\n"
            doc.close()
        except Exception:
            pass

    return text.strip()


def extract_pdf_text_ocr(file_path: str) -> str:
    try:
        from pdf2image import convert_from_path
        import pytesseract
        images = convert_from_path(file_path, dpi=300, first_page=1, last_page=20)
        text = ""
        for img in images:
            page_text = pytesseract.image_to_string(img)
            if page_text:
                text += page_text + "\n\n"
        return text.strip()
    except Exception:
        pass

    try:
        import fitz
        import pytesseract
        from PIL import Image
        from io import BytesIO
        doc = fitz.open(file_path)
        text = ""
        for i, page in enumerate(doc):
            if i >= 20:
                break
            pix = page.get_pixmap(dpi=300)
            img = Image.open(BytesIO(pix.tobytes("png")))
            page_text = pytesseract.image_to_string(img)
            if page_text:
                text += page_text + "\n\n"
        doc.close()
        return text.strip()
    except Exception:
        return ""


def pdf_pages_to_base64(file_path: str, max_pages: int = 15) -> list:
    result = []
    try:
        from pdf2image import convert_from_path
        import base64
        from io import BytesIO
        images = convert_from_path(file_path, dpi=200, first_page=1, last_page=max_pages)
        for img in images:
            buf = BytesIO()
            img.save(buf, format="JPEG", quality=75)
            b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            result.append(b64)
        if result:
            return result
    except Exception:
        pass

    try:
        import fitz
        import base64
        doc = fitz.open(file_path)
        for i, page in enumerate(doc):
            if i >= max_pages:
                break
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("jpeg")
            b64 = base64.b64encode(img_bytes).decode("utf-8")
            result.append(b64)
        doc.close()
    except Exception:
        pass

    return result


# --- Claude Extraction ---

async def claude_extract_products_vision(page_images_b64: list) -> list:
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
- division: One of: Orthopedics, Cardiovascular, Diagnostics, ENT, Endo-surgical, Infection Prevention, Peripheral Intervention, Critical Care, Robotics, Cardiac Surgery, Urology
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
- division: One of: Orthopedics, Cardiovascular, Diagnostics, ENT, Endo-surgical, Infection Prevention, Peripheral Intervention, Critical Care, Robotics, Cardiac Surgery, Urology
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


# --- Import Processing ---

async def process_pdf_import(import_id: str, file_path: str):
    try:
        pdf_text = extract_pdf_text(file_path)
        use_vision = False

        if not pdf_text or len(pdf_text) < 50:
            pdf_text = extract_pdf_text_ocr(file_path)

        if not pdf_text or len(pdf_text) < 50:
            use_vision = True
            page_images = pdf_pages_to_base64(file_path, max_pages=10)
            if not page_images:
                await imports_col.update_one(
                    {"_id": ObjectId(import_id)},
                    {"$set": {"status": "failed", "error": "Could not extract text or images from PDF"}}
                )
                return

        if use_vision:
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
            p["_dup_status"] = "new"
            p["_dup_match"] = None

            sku = p.get("sku_code", "").strip()
            name = p.get("product_name", "").strip()

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

            if name:
                name_lower = name.lower()
                existing_name = await products_col.find_one(
                    {"$or": [
                        {"product_name": {"$regex": f"^{escape_regex(name)}$", "$options": "i"}},
                        {"product_name": {"$regex": escape_regex(name_lower), "$options": "i"}},
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


# --- Routes ---

@router.post("/api/admin/import/pdf")
async def upload_pdf(file: UploadFile = File(...), _=Depends(admin_required)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted")

    os.makedirs("/app/backend/uploads", exist_ok=True)
    file_path = f"/app/backend/uploads/{uuid.uuid4().hex}_{file.filename}"
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

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

    asyncio.create_task(process_pdf_import(import_id, file_path))

    return {"import_id": import_id, "status": "processing", "filename": file.filename}


@router.get("/api/admin/imports")
async def list_imports(_=Depends(admin_required)):
    cursor = imports_col.find().sort("upload_date", -1)
    docs = await cursor.to_list(50)
    return {"imports": serialize_docs(docs)}


@router.get("/api/admin/imports/{import_id}")
async def get_import(import_id: str, _=Depends(admin_required)):
    try:
        doc = await imports_col.find_one({"_id": ObjectId(import_id)})
    except Exception:
        raise HTTPException(400, "Invalid import ID")
    if not doc:
        raise HTTPException(404, "Import not found")
    return serialize_doc(doc)


@router.post("/api/admin/imports/{import_id}/reprocess")
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


@router.post("/api/admin/imports/{import_id}/approve")
async def approve_import_products(import_id: str, body: dict = {}, _=Depends(admin_required)):
    try:
        doc = await imports_col.find_one({"_id": ObjectId(import_id)})
    except Exception:
        raise HTTPException(400, "Invalid import ID")
    if not doc:
        raise HTTPException(404, "Import not found")

    approve_ids = body.get("approve_ids", [])
    products_to_add = []
    skipped_dupes = 0

    for p in doc.get("extracted_products", []):
        if approve_ids and p.get("_temp_id") not in approve_ids:
            continue
        if p.get("approved"):
            continue
        if p.get("_dup_status") == "duplicate":
            skipped_dupes += 1
            continue

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
        docs_to_insert = [d for _, d in products_to_add]
        await products_col.insert_many(docs_to_insert)
        added = len(docs_to_insert)
        added_ids = {tid for tid, _ in products_to_add}

    updated_products = []
    for p in doc.get("extracted_products", []):
        tid = p.get("_temp_id")
        if tid in added_ids:
            p["approved"] = True
        elif not approve_ids and p.get("_dup_status") == "duplicate":
            p["approved"] = True
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


@router.put("/api/admin/imports/{import_id}/product/{temp_id}")
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


@router.delete("/api/admin/imports/{import_id}/product/{temp_id}")
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
