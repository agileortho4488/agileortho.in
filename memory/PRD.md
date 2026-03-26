# Agile Ortho — Product Requirements Document

## Original Problem Statement
Build a B2B medical device platform for a premier medical device master franchise in Telangana, India. Rebranded as "Agile Ortho".

## Tech Stack
- **Frontend**: React, TailwindCSS, Shadcn UI, Manrope font, react-helmet-async
- **Backend**: FastAPI, Motor (Async MongoDB), Pydantic
- **AI**: Claude Sonnet 4.5 via emergentintegrations (categorization + chatbot)
- **Storage**: Emergent Object Storage
- **3rd Party**: Interakt WhatsApp API, Google Analytics 4

## Current State (as of 2026-03-26)
- **967 products**, **13 divisions**, AI-categorized with consistent naming
- **78 Variabilis products** newly imported from PDF brochure
- **5 new brochure PDFs** uploaded to Object Storage and linked to products
- **AI Categorization System** built — processes all products using Claude Sonnet 4.5
- **Product data bundled** as `product_data.json` (967 products) + `lead_data.json` for auto-seeding
- **Complete homepage redesign** — trust-first, conversion-focused, 10-section layout
- **Product pages redesigned** — Premium B2B aesthetic (dark navy + teal)
- **SEO fully implemented** — react-helmet-async, JSON-LD structured data, 33 district landing pages
- **Automated CRM pipeline**: WhatsApp → Lead extraction → Scoring → Follow-ups
- **Gated brochure downloads** with CRM lead capture

## Division Structure (13 Divisions, 967 Products)
| Division | Products | Key Categories |
|---|---|---|
| Trauma | 218 | Distal Radial Plates, Bone Screws, Locking Screws, Humerus Plates, Intramedullary Nails |
| Endo-surgical | 167 | Sutures, Endocutters, Hernia Mesh, Staplers, Ultrasonic Instruments |
| Joint Replacement | 112 | Hip Implants, Knee Implants, Revision Knee Systems, Total Knee/Hip Replacement |
| Diagnostics | 105 | Biochemistry Reagents, Rapid Diagnostic Tests, Blood Typing, Drug Testing |
| Infection Prevention | 85 | Surgical Drapes, Surgical Gowns, Hand Hygiene, Skin Preparation |
| Cardiovascular | 60 | Heart Valves, Coronary Stents, TAVR Systems, Embolization |
| Sports Medicine | 54 | Shoulder Arthroscopy, Knee Arthroscopy, Equipment |
| Instruments | 52 | Surgical Instruments, Instrument Sets, Storage Systems |
| ENT | 45 | Balloon Catheters, Airway Management, Nasal Devices, Tracheostomy |
| Urology | 28 | Guidewires, Stents, Sheaths, Stone Baskets |
| Critical Care | 23 | Respiratory Care, Renal Care, Regional Anesthesia |
| Peripheral Intervention | 12 | Peripheral Stents, Balloon Catheters |
| Robotics | 6 | Surgical Robotic Systems, Orthopedic Robotics |

## Database Seeding
- `seed.py` loads from `product_data.json` and `lead_data.json` on startup
- Uses SKU-based upsert to avoid duplicates
- Auto-seeds when product count < file count

## Key API Endpoints
- `GET /api/divisions` — Returns all divisions with categories and counts
- `GET /api/products` — Paginated product listing with search/filter
- `GET /api/products/:id` — Product detail
- `POST /api/leads` — Create lead
- `POST /api/brochure-download` — Gated brochure download with lead capture
- `POST /api/webhook/whatsapp` — WhatsApp webhook
- `GET /api/admin/automation/stats` — Automation dashboard

## SKU Intelligence System (Active — Feb 2026)

### Architecture
A 4-layer brochure data extraction system for training AI chatbot/WhatsApp bot:
- **Layer 1**: Raw per-file extractions (`/app/backend/brochure_intelligence/raw_extractions/`)
- **Layer 2**: Normalized product/SKU master (`/app/backend/brochure_intelligence/normalized_products/`)
- **Layer 3**: Chatbot training chunks (`/app/backend/brochure_intelligence/training_chunks/`)
- **Layer 4**: Logs, review queue, conflict resolution (`/app/backend/brochure_intelligence/logs/`)

### CRITICAL: Central Nervous System
**ANY new agent MUST read `/app/backend/brochure_intelligence/SYSTEM_STATE.json` FIRST.**
This file contains complete processing state, discovered patterns, and resume point.

### Mandatory Extraction Rules
1. **Completeness Rule:** "No file is complete until every page is checked and every extractable detail is captured or explicitly logged as unreadable."
2. **Source Traceability Rule:** "Every page must stay married to its original brochure source; no cross-brochure page mixing is allowed."
   - Before extraction: confirm source filename, file ID, exact page number(s), content type
   - Per-page metadata required: source_file, file_id, page_number, parser_used, extraction_method
   - Cross-brochure products: keep each source linked separately, compare during normalization only

### Source Data
- 200 brochure files (2.5GB ZIP from Google Drive)
- Google Drive link: `https://drive.google.com/file/d/191gs1CPG_MkcqWPtqC_GWIrPd1xvJlS_/view`
- Local path: `/tmp/zoho_brochures/` (needs re-download if /tmp is cleared)
- Download: `gdown 'https://drive.google.com/uc?id=191gs1CPG_MkcqWPtqC_GWIrPd1xvJlS_' -O /tmp/zoho_full.zip --fuzzy`

### Processing Status
- Files processed: 50/200
- Next file: #51
- Batch 1 (1-25): COMPLETE — audited, re-extracted (018-020,022,025), normalized, chunked, retrieval validated (10/10)
- Batch 2 (26-50): COMPLETE — extracted, parsed, normalized, merged with Batch 1, shadow DB updated, retrieval validated (15/15)
- Products extracted: 372
- SKUs with codes: 1,353
- Brands identified: 49
- Divisions: 7 (Trauma, Diagnostics, Infection Prevention, Cardiovascular, ENT, Joint Replacement, Critical Care)
- Shadow DB: LIVE (shadow_products, shadow_skus, shadow_brands, shadow_chunks)
- Chatbot API: LIVE at /api/chatbot/query, /api/chatbot/brands, /api/chatbot/products, /api/chatbot/skus, /api/chatbot/stats

### Extraction Pipeline
- Tier 1: pdfplumber/python-pptx/openpyxl (direct text)
- Tier 2: pytesseract OCR (image-based pages)
- Tier 3: Claude AI (ambiguous/complex content)

### MongoDB Sync Plan
1. Build full intelligence layer first (all 200 files)
2. Create shadow collections in MongoDB
3. Validate against existing product_data.json
4. Only then merge into production

## Upcoming Tasks
- P0: Continue brochure extraction (Files 51-200, in batches of 25)
- P1: Deeper consolidation at File 75, 100
- P1: Generate training chunks for each new batch
- P1: Website chatbot frontend integration
- P2: WhatsApp AI Chatbot (via Interakt)
- P2: Website partial product update (high-confidence products only)

## Future/Backlog
- P3: Product comparison feature
- P3: Push re-deployment to sync shadow to production
- P4: MongoDB to PostgreSQL migration (if needed)
- P5: Image extraction from brochure pages
- P6: AI chatbot training with extracted brochure knowledge

## Admin Access
- URL: /admin/login
- Password: admin
