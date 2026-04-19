from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from db import products_col, leads_col, conversations_col
from seed import seed_database, seed_leads, seed_catalog
from helpers import init_storage

from routes.public import router as public_router
from routes.admin import router as admin_router
from routes.imports import router as imports_router
from routes.chat import router as chat_router
from routes.whatsapp import router as whatsapp_router
from routes.bulk_upload import router as bulk_upload_router
from routes.image_extract import router as image_extract_router
from routes.automation import router as automation_router
from routes.chatbot import router as chatbot_router
from routes.catalog import router as catalog_router
from routes.review import router as review_router
from routes.geo import router as geo_router
from routes.email import router as email_router
from routes.seo import router as seo_router
from routes.prerender import router as prerender_router
from routes.recommendations import router as recommendations_router
from routes.indexnow import router as indexnow_router
from routes.prospects import router as prospects_router

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
app.include_router(chatbot_router)
app.include_router(catalog_router)
app.include_router(review_router)
app.include_router(geo_router)
app.include_router(email_router)
app.include_router(seo_router)
app.include_router(prerender_router)
app.include_router(recommendations_router)
app.include_router(indexnow_router)
app.include_router(prospects_router)


@app.on_event("startup")
async def startup():
    await seed_database()
    await seed_leads()
    await seed_catalog()

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

    try:
        from services.knowledge_graph import ensure_indexes as kg_ensure_indexes
        await kg_ensure_indexes()
        print("Knowledge graph indexes initialized")
    except Exception as e:
        print(f"KG index init failed (non-critical): {e}")

    try:
        from services.whatsapp_funnel import ensure_indexes as funnel_ensure_indexes
        await funnel_ensure_indexes()
        print("WhatsApp funnel indexes initialized")
    except Exception as e:
        print(f"Funnel index init failed (non-critical): {e}")

    # Load persisted WhatsApp funnel mode from DB into env (overrides default)
    try:
        from db import db as mongo_db
        cfg = await mongo_db["app_config"].find_one({"type": "whatsapp_funnel"})
        if cfg and cfg.get("mode"):
            os.environ["WHATSAPP_FUNNEL_MODE"] = cfg["mode"]
            print(f"WhatsApp funnel mode: {cfg['mode']}")
    except Exception as e:
        print(f"Funnel mode load failed (non-critical): {e}")

    try:
        from services.apify import ensure_indexes as apify_ensure
        await apify_ensure()
        print("Prospects/Apify indexes initialized")
    except Exception as e:
        print(f"Apify index init failed (non-critical): {e}")

    # Start follow-up automation scheduler
    import asyncio
    from routes.automation import followup_scheduler
    asyncio.create_task(followup_scheduler())
    print("Follow-up automation scheduler started")

    # Start self-learning engine
    from routes.learning import learning_scheduler, learn_from_all_conversations
    asyncio.create_task(learning_scheduler())
    # Run initial learning pass immediately
    asyncio.create_task(learn_from_all_conversations())
    print("Self-learning engine started")

    # Index for automation collections
    from db import db as mongo_db
    followup_col = mongo_db["followup_queue"]
    await followup_col.create_index("status")
    await followup_col.create_index("send_at")
    await followup_col.create_index("phone")
    await leads_col.create_index("phone_whatsapp")

    # Indexes for chatbot session tracking & telemetry
    chatbot_conv = mongo_db["chatbot_conversations"]
    chatbot_telem = mongo_db["chatbot_telemetry"]
    await chatbot_conv.create_index("session_id", unique=True)
    await chatbot_telem.create_index("session_id")
    await chatbot_telem.create_index("event_type")
    await chatbot_telem.create_index("timestamp")

    # Visitor event tracking indexes
    from db import visitor_events_col
    await visitor_events_col.create_index("zone_id")
    await visitor_events_col.create_index("event_type")
    await visitor_events_col.create_index("timestamp")
    await visitor_events_col.create_index("session_id")
    await leads_col.create_index("zone_id")
    await leads_col.create_index("lead_score")

    print("Agile Ortho API started")
