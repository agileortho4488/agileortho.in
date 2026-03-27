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
- **SKU Intelligence System**: Files 1-125 fully processed (62.5% of 200-file pipeline)
- **100-file Consolidation Checkpoint COMPLETE** — full rebuild from structured drafts
- **403 normalized products**, **3,323 unique SKU codes**, **64 brands**, **427 training chunks**
- **Shadow DB LIVE** with chatbot API at `/api/chatbot/query`
- **100% retrieval validation** on Files 1-100 corpus

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
| Batch 1 | 001-025 | 287 | 287 | 1,273 | 1,273 |
| Batch 2 | 026-050 | 52 | 52 | 224 | 224 |
| Batch 3 | 051-075 | 27 | 27 | 929 | 929 |
| Batch 4 | 076-100 | 19 | 19 | 270 | 425 |
| Batch 5 | 101-125 | 18 | 18 | 627 | 700 |
| **Total** | **1-125** | **403** | **403** | **3,323** | **3,551** |

### Mandatory Extraction Rules
1. 300 DPI OCR on every PDF page (mandatory, not fallback)
2. Deep SKU extraction — no shortcuts/summaries
3. Page-by-page verification for no-SKU claims
4. CLI tools (pdftotext/pdftoppm) for files >10MB to prevent OOM
5. CID-encoded PDFs need pure OCR re-extraction (see File 123)

### Frozen Snapshots
- `normalized_products/snapshots/frozen_1_100_*` — 100-file checkpoint
- `logs/consolidation_report_files_1_100.md` — Full reconciliation report

### Central Nervous System
**`/app/backend/brochure_intelligence/SYSTEM_STATE.json`** — Must be read first by any agent.

## Key API Endpoints
- `GET /api/divisions` — Returns all divisions with categories and counts
- `GET /api/products` — Paginated product listing with search/filter
- `POST /api/chatbot/query` — Shadow DB chatbot query
- `GET /api/chatbot/stats` — Shadow DB statistics
- `GET /api/chatbot/brands` — All brands from shadow DB

## Upcoming Tasks
- P0: Batch 6 (Files 126-150) — Continue 25-file processing
- P0: Batches 7-8 (Files 151-200)
- P1: Consolidation checkpoint at File 150
- P2: Website AI Chatbot frontend integration
- P3: WhatsApp AI Chatbot (Interakt)
- P4: Push Shadow DB to Live Production DB

## Blocked
- File 008 (corrupted DOCX) — awaiting uncorrupted file

## Key Observations
- Files 116 & 117 are duplicates (same Mirus Powered Endoscopic content)
- File 123 has CID-encoded fonts requiring pure OCR
- File 125 is a comprehensive pricing catalog (301 diagnostics codes with MRP)
- File 108 (204MB) and File 109 (165p training book) are very large, need CLI extraction

## Admin Access
- URL: /admin/login
- Password: admin
