# Agile Ortho — Product Requirements Document

## Original Problem Statement
Build a B2B medical device platform for a premier medical device master franchise in Telangana, India ("Agile Ortho").
Core: 6-layer semantic architecture — Raw Extraction → Structured Catalog → Semantic Intelligence → Relationship Graph → Rule Engine → Website Generation.

## Tech Stack
- Frontend: React, TailwindCSS, Shadcn UI, Manrope font
- Backend: FastAPI, Motor (Async MongoDB), Pydantic
- AI: Claude Sonnet 4.5 via emergentintegrations
- Storage: Emergent Object Storage
- Web Search: SerpAPI for product verification

## Completed Phases

### Phases 1-4: Pipeline → Chatbot → Taxonomy → Product Template — COMPLETE
### Phase 5A-E: Semantic Intelligence, Relationships, SKU Split, Comparison, QA — COMPLETE

### Phase 5F: Web-Search Fallback Pipeline — COMPLETE (2026-03-28)
- 774 products via LLM+SerpAPI, 135 via rule-based sibling inheritance
- 100% coverage (909 staged), 243 auto-promoted

### Phase 5G: Enrichment Review Dashboard — COMPLETE (2026-03-28)
### Phase 5H: Smart Review Suggestions — COMPLETE (2026-03-28)

### Phase 5I: Non-Pilot Shared-SKU Cleanup — COMPLETE (2026-03-28)
- ENT: 45 products (0 shared shadow_ids)
- Endo Surgery: 170 products (0 shared shadow_ids)
- Cardiovascular: 66 products (0 shared shadow_ids)

### Phase 5J: 4-Lane Auto-Promotion Pipeline — COMPLETE (2026-03-28)
- Lane 1 (Safe): 245 | Lane 2 (Family): 2 | Lane 3 (Inherit+Standalone): 258
- Total promoted: 505 products, 65 remain for manual review

### Phase 5K: Live Push — COMPLETE (2026-03-28)
- Expanded from 4 pilot divisions (157 products) → 13 divisions (810 products)
- Production-eligible filter: enriched + no conflicts + no draft + medium/high confidence
- Merged Products/Portfolio into single "Products" → `/catalog` path
- `/products` redirects to `/catalog`
- Nav cleaned: single "Products" link, Shop stays separate
- Division descriptions for all 13 divisions
- Homepage updated: catalog API, search → /catalog, division cards → /catalog
- **Testing: 100% pass (19 backend + all frontend — iteration_46.json)**

## Current State
| Metric | Value |
|--------|-------|
| Total products in DB | 1,202 |
| Canonical enriched | 1,134 (94.3%) |
| Production-eligible (live) | 810 (67.4%) |
| Live divisions | 13 |
| Promoted total | 842 |
| Pending manual review | 65 |
| Excluded (review/conflict/low) | 324 |

## Key API Endpoints
- Catalog: `/api/catalog/divisions`, `/api/catalog/products`, `/api/catalog/products/{slug}`
- Review: `/api/admin/review/stats`, `/api/admin/review/products`
- Auto-Promote: `/api/admin/review/auto-promote/preview`, `/api/admin/review/auto-promote/execute`
- Compare: `/api/catalog/compare`

## Admin Access
- URL: /admin/login
- Password: kOpcELYcEvkVtyDAE5-2uw

## Priority Stack
1. ~~Phase 5A-K~~ DONE
2. Manual review of 65 true blockers (42 conflicts, 29 very low conf, 15 weak evidence)
3. WhatsApp bot (ON HOLD — needs Interakt API key)
4. Archive old phase scripts to `scripts/archive/`

## Known Issues
- File 008 (corrupted DOCX) — BLOCKED
- Emergent LLM Key budget exhausted
- 65 products need manual review
- 324 products excluded from live (186 review_required, 4 conflicts, 126 low confidence)
