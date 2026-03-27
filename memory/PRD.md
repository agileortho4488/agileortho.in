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
- **967 products**, **11 divisions**, AI-categorized with consistent naming
- **SKU Intelligence System**: Files 1-100 fully processed (50% of 200-file pipeline)
- **Consolidation Checkpoint at File 100 COMPLETE**
- **385 normalized products**, **2,696 unique SKU codes**, **58 brands**, **403 training chunks**
- **Shadow DB LIVE** with chatbot API at `/api/chatbot/query`
- **100% retrieval validation** — all products, SKUs, brands in training corpus

## SKU Intelligence System (Active)

### Architecture
4-layer brochure data extraction system:
- **Layer 1**: Raw per-file extractions (`raw_extractions/`)
- **Layer 2**: Structured drafts (`structured_drafts/`)
- **Layer 3**: Normalized product/SKU master (`normalized_products/`)
- **Layer 4**: Training chunks + Shadow DB

### Processing Status (Post-Consolidation)
| Batch | Files | Products | Unique SKUs |
|-------|-------|----------|-------------|
| Batch 1 | 001-025 | 287 | 1,273 |
| Batch 2 | 026-050 | 52 | 224 |
| Batch 3 | 051-075 | 27 | 929 |
| Batch 4 | 076-100 | 19 | 270 |
| **Total** | **1-100** | **385** | **2,696** |

### Count Definitions (Critical)
- **Raw extracted products**: 425 (total entries across all drafts before dedupe)
- **Normalized products**: 385 (after name+brand deduplication)
- **Unique SKU codes**: 2,696 (distinct codes after cross-file deduplication)
- **SKU occurrences/mentions**: 2,851 (total mentions including repeats across files)

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

## Upcoming Tasks
- P0: Batch 5 (Files 101-125) — Continue 25-file processing
- P0: Batches 6-8 (Files 126-200)
- P1: Consolidation checkpoint at File 150 or 200
- P2: Website AI Chatbot frontend integration
- P3: WhatsApp AI Chatbot (Interakt)
- P4: Push Shadow DB to Live Production DB

## Blocked
- File 008 (corrupted DOCX) — awaiting uncorrupted file

## Admin Access
- URL: /admin/login
- Password: admin
