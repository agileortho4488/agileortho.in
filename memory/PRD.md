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
- `POST /api/chatbot/query` — Guarded chatbot query (confidence gating + SKU exact-match + off-topic rejection + session tracking)
- `GET /api/chatbot/history/{session_id}` — Retrieve conversation history
- `POST /api/chatbot/telemetry` — Log UI telemetry events
- `GET /api/chatbot/suggestions` — Contextual suggestions
- `GET /api/chatbot/stats` — Shadow DB statistics
- `GET /api/chatbot/brands` — All brands
- `GET /api/chatbot/products` — Products with filtering
- `GET /api/chatbot/skus` — SKUs with filtering

## Current Status
- Pipeline: COMPLETE (200/200 files)
- Guardrails: IMPLEMENTED (100% validation pass rate)
- Shadow DB: Synced and validated
- Website chatbot UI: COMPLETE AND TESTED (100% pass rate, iteration 29)
- Live DB: NOT PUSHED (awaiting user approval)
- WhatsApp bot: NOT STARTED (awaiting Interakt API key)

## Priority Stack (User Approved)
1. ~~Confidence gating~~ DONE
2. ~~Off-topic rejection~~ DONE
3. ~~SKU exact-match improvement~~ DONE
4. ~~Re-validation~~ DONE (100%)
5. ~~Website chatbot UI integration~~ DONE (2026-03-27)
6. Product comparison feature — NEXT
7. Live DB push (ON HOLD)
8. WhatsApp bot (ON HOLD)

## Blocked
- File 008 (corrupted DOCX)
- WhatsApp bot (needs Interakt API key)

## Admin Access
- URL: /admin/login
- Password: admin
