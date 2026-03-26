# Agile Ortho — Product Requirements Document

## Original Problem Statement
Build a B2B medical device platform for a premier medical device master franchise in Telangana, India. Rebranded as "Agile Ortho".

## Tech Stack
- **Frontend**: React, TailwindCSS, Shadcn UI
- **Backend**: FastAPI, Motor (Async MongoDB), Pydantic
- **AI**: Claude Sonnet 4.5 via emergentintegrations
- **Storage**: Emergent Object Storage
- **3rd Party**: Interakt WhatsApp API, Google Analytics 4

## Architecture (Modular)
```
/app/backend/
├── server.py          # Entry point (~70 lines)
├── db.py, models.py, helpers.py, seed.py
├── routes/
│   ├── public.py      # Products, leads, divisions, files
│   ├── admin.py       # Dashboard, CRUD, image upload
│   ├── imports.py     # PDF import pipeline
│   ├── chat.py        # RAG chatbot
│   ├── whatsapp.py    # WhatsApp/Interakt
│   └── bulk_upload.py # Bulk catalog upload
```

## Completed Features
- Portfolio website with 854 products across 13 divisions
- Kanban CRM with lead scoring
- Claude AI PDF/PPTX importer with OCR + Vision
- RAG chatbot with department-specific contact routing
- Interakt WhatsApp integration (auto-replies, templates, webhooks)
- Google Analytics 4
- Product image upload (single + bulk) via object storage
- Server refactored from 2200-line monolith to modular routes
- Bulk catalog processing: 200 files from Google Drive → object storage → Claude extraction → 854 products

## Contact Numbers in Chatbot
- Dispatch & Delivery: 741818183
- Trauma/Ortho/Spine Orders: 74161612350
- General Queries: 7416216262
- Consumables & Other Divisions: 7416416871
- Billing & Finance: 7416416093

## Upcoming Tasks
- P1: SEO & Polish — react-helmet-async, JSON-LD, district landing pages
- P2: Homepage Redesign (Meril style)
- P3: Product images gallery on public pages
- P3: Product comparison feature
- P4: Clean up 24 "Uncategorized" products
