from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from db import products_col, leads_col, conversations_col
from seed import seed_database, seed_leads
from helpers import init_storage

from routes.public import router as public_router
from routes.admin import router as admin_router
from routes.imports import router as imports_router
from routes.chat import router as chat_router
from routes.whatsapp import router as whatsapp_router
from routes.bulk_upload import router as bulk_upload_router
from routes.image_extract import router as image_extract_router
from routes.automation import router as automation_router

app = FastAPI(title="Agile Ortho API")

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if CORS_ORIGINS == "*" else CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public_router)
app.include_router(admin_router)
app.include_router(imports_router)
app.include_router(chat_router)
app.include_router(whatsapp_router)
app.include_router(bulk_upload_router)
app.include_router(image_extract_router)
app.include_router(automation_router)


@app.on_event("startup")
async def startup():
    await seed_database()
    await seed_leads()

    await products_col.create_index("division")
    await products_col.create_index("category")
    await products_col.create_index("slug")
    await products_col.create_index("status")
    await products_col.create_index("product_family")
    await products_col.create_index("sku_code", unique=True, sparse=True)
    await leads_col.create_index("score")
    await leads_col.create_index("status")
    await leads_col.create_index("created_at")
    await conversations_col.create_index("session_id")
    await conversations_col.create_index("updated_at")

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

    try:
        init_storage()
        print("Object storage initialized")
    except Exception as e:
        print(f"Object storage init failed (non-critical): {e}")

    # Start follow-up automation scheduler
    import asyncio
    from routes.automation import followup_scheduler
    asyncio.create_task(followup_scheduler())
    print("Follow-up automation scheduler started")

    # Index for automation collections
    from db import db as mongo_db
    followup_col = mongo_db["followup_queue"]
    await followup_col.create_index("status")
    await followup_col.create_index("send_at")
    await followup_col.create_index("phone")
    await leads_col.create_index("phone_whatsapp")

    print("Agile Ortho API started")
