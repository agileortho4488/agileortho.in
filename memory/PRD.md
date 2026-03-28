# Agile Ortho — Product Requirements Document

## Original Problem Statement
Build a B2B medical device platform for a premier medical device master franchise in Telangana, India ("Agile Ortho").
Core requirement: "SKU Intelligence System" — extract 100% of product data from 200 manufacturer brochures. 6-layer architecture: Raw Extraction → Structured Catalog → Semantic Intelligence → Relationship Graph → Rule Engine → Website Generation.

## Tech Stack
- **Frontend**: React, TailwindCSS, Shadcn UI, Manrope font
- **Backend**: FastAPI, Motor (Async MongoDB), Pydantic
- **AI**: Claude Sonnet 4.5 via emergentintegrations
- **Storage**: Emergent Object Storage
- **3rd Party**: Interakt WhatsApp API (pending)

## Completed Phases

### Phases 1-4: Pipeline, Chatbot, Taxonomy, Product Template — COMPLETE
- 1206 catalog_products, 5882 catalog_skus, 4 pilot divisions

### Phase 5A: Semantic Intelligence + Clinical Reclassification — COMPLETE (2026-03-27)
- 3 MongoDB collections: `brand_system_intelligence`, `family_relationships`, `semantic_rules`
- 297/1206 products semantically enriched
- Clinical-first naming by division

### Phase 5B: Relationship Graph + Related Products — COMPLETE (2026-03-27)
- `GET /api/catalog/products/{slug}/related` — 3 labeled buckets
- Compatible Components, Same Family Alternatives, Related System Products
- Admin password secured

### Phase 5C: Split Shared-SKU Products — COMPLETE (2026-03-28)
- 6 pools resolved, 1,296 SKUs reassigned, 27 products merged
- MBOSS screws promoted to high confidence

### Phase 5D: Product Comparison Feature — COMPLETE (2026-03-28)

**API Endpoints:**
- `POST /api/catalog/compare` — Side-by-side comparison of 2-4 products
  - Input: `{"slugs": ["slug1", "slug2"]}`
  - Returns: `{products: [...], comparison: [{label, values, is_different}], division}`
- `GET /api/catalog/compare/suggestions/{slug}` — Suggest comparable products
  - Returns: `{suggestions: [{slug, product_name_display, comparison_reason}]}`

**Supported Comparison Types:**
| Type | Example |
|------|---------|
| Coated vs Uncoated | ARMAR (Titanium) vs AURIC (TiNbN Coated) |
| Same Category Different Brand | Any products in same category_canonical |
| Related System Products | Products linked via family_relationships |
| Multi-product (up to 4) | Any 2-4 products from same division |

**Guardrails:**
- Cross-division comparison blocked (400 error)
- Maximum 4 products
- Minimum 2 products
- Only pilot-filter products (mapping_confidence=high)
- Merged/draft products excluded

**Comparison Attributes:**
Division, Category, Brand System, Material, Coating, System Type, Implant Class, technical specs, Available Variants (SKUs), Anatomy Scope, Description

**Example Comparisons:**
1. ARMAR Titanium Plates vs AURIC 2.4mm LPS Distal Radial Volar Buttress Plate → Highlights coating difference (TiNbN)
2. BioMime vs MOZEC → Cardiovascular stent vs balloon comparison
3. Suggestions for AURIC plate → Shows ARMAR base variant, MBOSS screws, same-category alternatives

**Frontend:**
- `/catalog/compare` page with side-by-side table
- Amber highlight on differing rows
- "Add Product" button with search and suggestions
- "Compare with Similar" button on product detail pages
- Empty state with "Browse Portfolio" link

### Test Results
- iteration_37: Phase 5A — 100%
- iteration_38: Phase 5B — 100%
- iteration_39: Phase 5C — 100%
- iteration_40: Phase 5D — 100% (14/14 backend, 100% frontend)

## Current Priority Stack
1. ~~Phase 5A-D~~ DONE
2. **Phase 5E: Re-audit vague/mixed pages** (using semantic rules)
3. Non-pilot division shared-SKU cleanup (ENT, Endo Surgery)
4. Live DB push (ON HOLD)
5. WhatsApp bot (ON HOLD — needs Interakt API key)

## Key API Endpoints
- `GET /api/catalog/divisions`
- `GET /api/catalog/divisions/{slug}`
- `GET /api/catalog/products/{slug}`
- `GET /api/catalog/products/{slug}/related`
- `POST /api/catalog/compare`
- `GET /api/catalog/compare/suggestions/{slug}`
- `GET /api/catalog/brand-intelligence/{entity_code}`

## Admin Access
- URL: /admin/login
- Password: kOpcELYcEvkVtyDAE5-2uw
