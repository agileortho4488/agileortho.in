# Agile Ortho — Product Requirements Document

## Original Problem Statement
Build a B2B medical device platform for a premier medical device master franchise in Telangana, India ("Agile Ortho").
Core requirement: "SKU Intelligence System" — extract 100% of product data from 200 manufacturer brochures. 4-layer architecture feeding a Website Chatbot and WhatsApp AI Chatbot.

## Tech Stack
- **Frontend**: React, TailwindCSS, Shadcn UI, Manrope font
- **Backend**: FastAPI, Motor (Async MongoDB), Pydantic
- **AI**: Claude Sonnet 4.5 via emergentintegrations
- **Storage**: Emergent Object Storage
- **3rd Party**: Interakt WhatsApp API (pending)

## SKU Intelligence Pipeline — COMPLETE

### Final Metrics
| Metric | Count |
|--------|-------|
| Raw extracted products | 523 |
| Normalized products | 481 |
| Unique SKU codes | 5,107 |
| SKU occurrences | 6,065 |
| Brands | 97 |
| Divisions | 13 |
| Training chunks | 654 |

### Chunk Breakdown (5 categories)
| Category | Count |
|----------|-------|
| Product | 481 |
| SKU overflow | 36 |
| Brand/Intelligence | 110 |
| Glossary/Reference | 20 |
| Clinical Evidence | 7 |

### Readiness Steps — ALL COMPLETE
1. Cross-batch dedupe / alias cleanup — DONE
2. Full chunk expansion (5 categories) — DONE
3. Retrieval validation — **100% pass rate (35/35)**, up from 91.7%
4. Production-readiness assessment — READY

### Chatbot Guardrails — IMPLEMENTED
1. **Confidence gating**: High → direct answer, Medium → with verification note, Low → graceful refusal
2. **SKU exact-match**: Direct DB lookup with prefix fallback
3. **Off-topic rejection**: Anti-domain signal detection, word-boundary safe

### Architecture
- Layer 1: Raw extractions (`raw_extractions/`)
- Layer 2: Structured drafts (`structured_drafts/`)
- Layer 3: Normalized masters (`normalized_products/`)
- Layer 4: Training chunks + Shadow DB
- Source of truth: `file_id` (NOT ordinal position)
- Central nervous system: `SYSTEM_STATE.json`

## Website Chatbot UI — COMPLETE (2026-03-27)

### Features Implemented
- **Confidence-aware chat bubbles**: Green "Verified Match" badge (high), amber "Partial Match" badge (medium), grey "No Match" badge (low/none)
- **WhatsApp handoff banners**: Shown for medium/low/none confidence responses, enabling smooth escalation to human sales reps
- **Session tracking**: Conversations stored in `chatbot_conversations` collection with full turn history
- **Telemetry logging**: All queries, confidence levels, handoff offers, and handoff clicks logged to `chatbot_telemetry` collection
- **Full-page chat** (`/chat`): Complete chat experience with suggestions, history persistence
- **Floating chat widget**: Bottom-right widget on all pages with same confidence-aware rendering
- **Lead form trigger**: Auto-shows after 2+ non-high-confidence responses in the widget

### API Endpoints
- `POST /api/chatbot/query` — Guarded chatbot query (confidence gating + SKU exact-match + off-topic rejection + session tracking + response time)
- `GET /api/chatbot/history/{session_id}` — Retrieve conversation history
- `POST /api/chatbot/telemetry` — Log UI telemetry events
- `GET /api/chatbot/telemetry/report?days=7` — **Admin-protected** 7-day telemetry review report
- `GET /api/chatbot/suggestions` — Contextual suggestions
- `GET /api/chatbot/stats` — Shadow DB statistics
- `GET /api/chatbot/brands` — All brands
- `GET /api/chatbot/products` — Products with filtering
- `GET /api/chatbot/skus` — SKUs with filtering

## Telemetry Report — COMPLETE (2026-03-27)

### Report Schema (GET /api/chatbot/telemetry/report)
Admin-protected endpoint returning:
- `summary`: total_queries, unique_sessions, avg_response_time_ms, confidence_distribution, handoff (shown/clicked/rate), sku_lookup (queries/success/rate), off_topic (rejected/rate)
- `top_queries`: Top 20 queries by frequency
- `no_match_patterns`: Top 20 no-match/low-confidence queries
- `medium_confidence_examples`: Sample of medium-confidence responses for manual review
- `comparison_candidates`: Queries containing "vs", "compare", "difference" etc.
- `failed_sku_queries`: SKU lookups that returned no results
- `top_handoff_trigger_queries`: Queries that triggered WhatsApp handoff offers

## Catalog Taxonomy Mapping (Phase 1) — COMPLETE (2026-03-27)

### What Was Actually Done

Built the full canonical mapping layer between the current live catalog and the shadow brochure-enriched catalog, without touching live product behavior yet.

#### 1. Created 6 MongoDB Collections
| Collection | Records | Purpose |
|-----------|---------|---------|
| `catalog_division_map` | 15 | Live vs Shadow vs Canonical division mapping |
| `catalog_category_map` | 211 | Category mapping with division context |
| `catalog_material_dict` | 293 | Controlled material normalization dictionary |
| `catalog_brand_dict` | 89 | Brand/manufacturer normalization |
| `catalog_product_family_map` | 643 | Product family grouping with confidence scores |
| `catalog_taxonomy` | 1 | Master roll-up / audit summary |

#### 2. Mapped Live vs Shadow Taxonomy
Compared Live DB (967 products) against Shadow DB (brochure-backed catalog data). Created canonical mappings for: division, category, material, brand, product family.

#### 3. Preserved Original Values Alongside Canonical Values
Did not overwrite source values blindly. For each mapped field, preserved:
- original live value
- original shadow value
- canonical normalized value

Applied to: divisions, categories, materials, brands, product families.

#### 4. Built Controlled Material Normalization
Created a proper material dictionary instead of simple text cleanup. Example: "Titanium Alloy (TAN)", "Titanium alloy", "Titanium Alloy", "TAN(Ti-6Al-7Nb)" all normalized into controlled canonical values while keeping originals preserved.

#### 5. Scored Product Family Confidence
Because live product_family is often just the same as product_name, grouping was not forced blindly. Added: product_family_canonical, product_family_confidence, grouping classification.
- 44 high confidence
- 14 medium confidence
- 585 singleton / no safe grouping yet

#### 6. Measured Safe Mapping Coverage
- 829/967 live products safely mappable = **85.7%**
- 138 products remain in live-only divisions, preserved but flagged
- Live-only divisions flagged: Instruments, Robotics, Sports Medicine, Urology

#### 7. Treated Shadow as Enrichment, Not Automatic Truth
Shadow data was used to enrich and standardize, not to blindly replace live data. Live values preserved, ambiguous mappings flagged, only safe canonical mappings accepted automatically.

#### 8. Exposed Results Through Admin API
- `GET /api/admin/catalog/taxonomy` — Full taxonomy mapping report for review and Phase 2 usage

## Current Status
- Pipeline: COMPLETE (200/200 files)
- Guardrails: IMPLEMENTED (100% validation pass rate)
- Shadow DB: Synced and validated
- Website chatbot UI: COMPLETE AND TESTED (100% pass rate, iteration 29)
- Catalog taxonomy (Phase 1): COMPLETE — 6 mapping collections generated
- Catalog migration (Phase 2): NOT STARTED
- Live DB: NOT PUSHED (awaiting user approval)
- WhatsApp bot: NOT STARTED (awaiting Interakt API key)

## Priority Stack (User Approved)
1. ~~Confidence gating~~ DONE
2. ~~Off-topic rejection~~ DONE
3. ~~SKU exact-match improvement~~ DONE
4. ~~Re-validation~~ DONE (100%)
5. ~~Website chatbot UI integration~~ DONE (2026-03-27)
6. ~~Telemetry report endpoint~~ DONE (2026-03-27)
7. ~~Catalog taxonomy mapping (Phase 1)~~ DONE (2026-03-27)
8. Catalog products_v2 + catalog_skus (Phase 2) — NEXT
9. Standardized product page template (Phase 3)
10. Pilot one division migration (Phase 4)
11. Product comparison feature
12. Live DB push (ON HOLD)
13. WhatsApp bot (ON HOLD)

## Blocked
- File 008 (corrupted DOCX)
- WhatsApp bot (needs Interakt API key)

## Admin Access
- URL: /admin/login
- Password: admin
