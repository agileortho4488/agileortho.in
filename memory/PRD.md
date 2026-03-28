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
- 1206 catalog_products, 5882 catalog_skus, 4 pilot divisions

### Phase 5A: Semantic Intelligence + Clinical Reclassification — COMPLETE
### Phase 5B: Relationship Graph + Related Products — COMPLETE
### Phase 5C: Split Shared-SKU Products — COMPLETE
### Phase 5D: Product Comparison — COMPLETE
### Phase 5E: Comparison QA + Clinical Guardrails — COMPLETE

### Phase 5F: Web-Search Fallback Pipeline — COMPLETE (2026-03-28)
- 774 products via LLM+SerpAPI, 135 via rule-based sibling inheritance
- 100% coverage (909 staged), 243 auto-promoted

### Phase 5G: Enrichment Review Dashboard — COMPLETE (2026-03-28)
- Product-level: filters, side-by-side comparison, approve/reject/edit+approve
- Family-level: bulk approve by family pattern
- Audit trail: promotion_log collection

### Phase 5H: Smart Review Suggestions — COMPLETE (2026-03-28)
- Analyzes families for bulk-approve safety with 8 eligibility criteria
- Detects: Ti vs SS ambiguity, mixed coated/uncoated, cross-brand bundles, conflict flags
- Scores 0-100 with reasoning, eligible/excluded member separation
- Reviewer-facing (not auto-approve) — approve/inspect/reject per suggestion
- **Testing: 100% pass (59/59 backend + all frontend — iteration_43.json)**

## Current State
| Metric | Value |
|--------|-------|
| Total products | 1,206 |
| Canonical enriched | ~597 (49.5%) |
| Staged (pending) | ~607 |
| Promoted total | ~301 |
| Safe-to-approve families | 7 |
| Products clearable via smart | ~35 |

## Key API Endpoints
- Catalog: `/api/catalog/divisions`, `/api/catalog/products/{slug}`, `/api/catalog/compare`
- Review: `/api/admin/review/stats`, `/api/admin/review/products`, `/api/admin/review/smart-suggestions`
- Actions: `.../approve`, `.../reject`, `.../edit-approve`, `.../bulk-approve`

## Key DB Collections
- catalog_products, catalog_skus
- brand_system_intelligence, family_relationships, semantic_rules
- web_verification_log (909 docs), promotion_log (~301 docs)

## Key Scripts
- `/app/backend/scripts/web_search_fallback.py` — Main enrichment pipeline
- `/app/backend/scripts/pre_promotion_snapshot.json` — DB backup

## Admin Access
- URL: /admin/login
- Password: kOpcELYcEvkVtyDAE5-2uw

## Priority Stack
1. ~~Phase 5A-H~~ DONE
2. **NEXT: Review pending products** using dashboard (user action)
3. Non-pilot division shared-SKU cleanup (ENT, Endo Surgery)
4. Live DB push (ON HOLD)
5. WhatsApp bot (ON HOLD — needs Interakt API key)

## Known Issues
- File 008 (corrupted DOCX) — BLOCKED
- Emergent LLM Key budget exhausted — 135 products used rule-based fallback
- Some products have empty slugs (127 items) — handled via _id
