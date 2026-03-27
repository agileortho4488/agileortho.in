# Agile Ortho — Product Requirements Document

## Original Problem Statement
Build a B2B medical device platform for a premier medical device master franchise in Telangana, India. Rebranded as "Agile Ortho".
Recent requirement: Build a "SKU Intelligence System" — extract 100% of product data from 200 manufacturer brochures. Strictly separated 4-layer architecture feeding into a Website Chatbot and WhatsApp AI Chatbot.

## Tech Stack
- **Frontend**: React, TailwindCSS, Shadcn UI, Manrope font, react-helmet-async
- **Backend**: FastAPI, Motor (Async MongoDB), Pydantic
- **AI**: Claude Sonnet 4.5 via emergentintegrations (categorization + chatbot)
- **Storage**: Emergent Object Storage
- **3rd Party**: Interakt WhatsApp API, Google Analytics 4

## Current State (as of 2026-03-27)
- **SKU Intelligence System**: Files 1-150 fully processed (75% of 200-file pipeline)
- **150-file Consolidation Checkpoint COMPLETE**
- **433 normalized products**, **3,978 unique SKU codes**, **73 brands**, **13 divisions**
- **462 training chunks** with 100% product coverage
- **Shadow DB synced** with chatbot API at `/api/chatbot/query`

## SKU Intelligence System (Active)

### Architecture
4-layer brochure data extraction system:
- **Layer 1**: Raw per-file extractions (`raw_extractions/`)
- **Layer 2**: Structured drafts (`structured_drafts/`)
- **Layer 3**: Normalized product/SKU master (`normalized_products/`)
- **Layer 4**: Training chunks + Shadow DB

### Processing Status
| Batch | Files | Raw Products | Norm Products | Unique SKUs | SKU Occurrences |
|-------|-------|-------------|--------------|-------------|-----------------|
| Batch 1 | 001-025 | 326 | 287 | 1,273 | 1,385 |
| Batch 2 | 026-050 | 53 | 52 | 224 | 234 |
| Batch 3 | 051-075 | 27 | 27 | 929 | 930 |
| Batch 4 | 076-100 | 19 | 19 | 270 | 382 |
| Batch 5 | 101-125 | 18 | 18 | 627 | 700 |
| Batch 6 | 126-150 | 30 | 30 | 655 | 695 |
| **Total** | **1-150** | **473** | **433** | **3,978** | **4,326** |

### Mandatory Extraction Rules
1. 300 DPI OCR on every PDF page (mandatory, not fallback)
2. Deep SKU extraction — no shortcuts/summaries
3. Page-by-page verification for no-SKU claims
4. CLI tools (pdftotext/pdftoppm) for files >10MB to prevent OOM
5. CID-encoded PDFs need pure OCR re-extraction

### Frozen Snapshots
- `normalized_products/snapshots/frozen_1_100_*` — 100-file checkpoint
- `normalized_products/snapshots/frozen_1_150_*` — 150-file checkpoint
- `logs/consolidation_report_files_1_100.md` — 100-file report
- `logs/consolidation_report_files_1_150.md` — 150-file report

### Central Nervous System
**`/app/backend/brochure_intelligence/SYSTEM_STATE.json`** — Must be read first by any agent.

## Key API Endpoints
- `GET /api/divisions` — Returns all divisions with categories and counts
- `GET /api/products` — Paginated product listing with search/filter
- `POST /api/chatbot/query` — Shadow DB chatbot query
- `GET /api/chatbot/stats` — Shadow DB statistics
- `GET /api/chatbot/brands` — All brands from shadow DB

## Upcoming Tasks
- P0: Batch 7 (Files 151-175) — 300 DPI OCR mandatory, CLI for files >10MB
- P0: Batch 8 (Files 176-200)
- P1: 200-File Final Consolidation Checkpoint
- P2: Website AI Chatbot frontend integration
- P3: WhatsApp AI Chatbot (Interakt)
- P4: Push Shadow DB to Live Production DB

## Blocked
- File 008 (corrupted DOCX) — awaiting uncorrupted file

## Key Observations
- Files 116 & 117 are confirmed duplicates (0 products, 0 SKUs)
- File 123 has CID-encoded fonts requiring pure OCR
- File 125 is a comprehensive pricing catalog (301 diagnostics codes with MRP)
- 5 large source brochures removed from disk to free space (can re-download from Google Drive)

## Admin Access
- URL: /admin/login
- Password: admin
