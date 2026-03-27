# Agile Ortho — Product Requirements Document

## Original Problem Statement
Build a B2B medical device platform for a premier medical device master franchise in Telangana, India. Rebranded as "Agile Ortho".

## Tech Stack
- **Frontend**: React, TailwindCSS, Shadcn UI, Manrope font, react-helmet-async
- **Backend**: FastAPI, Motor (Async MongoDB), Pydantic
- **AI**: Claude Sonnet 4.5 via emergentintegrations (categorization + chatbot)
- **Storage**: Emergent Object Storage
- **3rd Party**: Interakt WhatsApp API, Google Analytics 4

## Current State (as of 2026-03-27)
- **967 products**, **13 divisions**, AI-categorized with consistent naming
- **SKU Intelligence System**: Files 1-100 fully processed (50% of 200-file pipeline)
- **391 normalized products**, **1,629 SKU codes**, **51 brands**, **574 training chunks**
- **Shadow DB LIVE** with chatbot API at `/api/chatbot/query`
- **Complete homepage redesign** — trust-first, conversion-focused
- **SEO fully implemented** — react-helmet-async, JSON-LD, 33 district landing pages

## SKU Intelligence System (Active)

### Architecture
4-layer brochure data extraction system:
- **Layer 1**: Raw per-file extractions (`raw_extractions/`)
- **Layer 2**: Structured drafts (`structured_drafts/`)
- **Layer 3**: Normalized product/SKU master (`normalized_products/`)
- **Layer 4**: Training chunks + Shadow DB

### Processing Status
| Batch | Files | Status | Products | SKUs |
|-------|-------|--------|----------|------|
| Batch 1 | 001-025 | COMPLETE | 326 | 1,305 |
| Batch 2 | 026-050 | COMPLETE | 46 | 48 |
| Batch 3 | 051-075 | COMPLETE | 27 | 930 |
| Batch 4 | 076-100 | COMPLETE | 19 | 276 |
| **Total** | **1-100** | **50% DONE** | **391** | **1,629** |

### Mandatory Extraction Rules
1. 300 DPI OCR on every PDF page (mandatory, not fallback)
2. Deep SKU extraction — no shortcuts/summaries
3. Page-by-page verification for no-SKU claims
4. CLI tools (pdftotext/pdftoppm) for files >20MB to prevent OOM

### Central Nervous System
**`/app/backend/brochure_intelligence/SYSTEM_STATE.json`** — Must be read first by any agent.

## Key API Endpoints
- `GET /api/divisions` — Returns all divisions with categories and counts
- `GET /api/products` — Paginated product listing with search/filter
- `POST /api/chatbot/query` — Shadow DB chatbot query
- `GET /api/chatbot/stats` — Shadow DB statistics
- `GET /api/chatbot/brands` — All brands from shadow DB
- `POST /api/chat` — Main website chat

## Upcoming Tasks
- P0: Batch 5 (Files 101-125) — Continue 25-file processing
- P1: Consolidation checkpoint at File 100 (cross-batch dedupe, conflict review)
- P1: Continue batches 6-8 (Files 126-200)
- P2: Website AI Chatbot frontend integration
- P3: WhatsApp AI Chatbot (Interakt)
- P4: Push Shadow DB to Live Production DB

## Future/Backlog
- P3: Product comparison feature
- P4: MongoDB to PostgreSQL migration (if needed)
- P5: Image extraction from brochure pages
- P6: Full chatbot training with complete 200-file dataset

## Blocked
- File 008 (corrupted DOCX) — awaiting uncorrupted file

## Admin Access
- URL: /admin/login
- Password: admin
