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
- 523 raw products, 481 normalized, 5107 SKU codes, 97 brands, 13 divisions, 654 training chunks

## Website Chatbot UI — COMPLETE
- Confidence-aware chat, WhatsApp handoff, session tracking, telemetry

## Catalog Taxonomy & Merge (Phase 1 & 2) — COMPLETE
- 6 taxonomy collections, 1206 catalog_products, 5882 catalog_skus

## Standardized Product Template (Phase 3) — COMPLETE

## Trauma Pilot (Phase 4) — COMPLETE
- P0/P1 polish: Category placeholders, Family Code, title-cased specs, unified coating, brand hierarchy

## Multi-Division Expansion — COMPLETE (2026-03-27)

| Division | Products | Categories | Brands |
|----------|----------|------------|--------|
| Trauma | 16 | 12 | 6 |
| Cardiovascular | 8 | 4 | 4 |
| Diagnostics | 59 | 7 | 4 |
| Joint Replacement | 4 | 5 | 4 |

## P0 Grouping Fix — COMPLETE (2026-03-27)
- Humerus page renamed to "2.7mm-3.5mm LPS Humerus Bone Plates (Titanium)" — 9 plate subtypes mapped to brochure subgroups
- Duplicate humerus page hidden

## P1 Product Grouping Audit — COMPLETE (2026-03-27)
All products now follow: Division > Category > Anatomy/Subgroup > Brand > Product Family > SKU

### Fixes applied:
- **ARMAR**: "ARMAR Titanium Plates" → "ARMAR LPS Plating System (Titanium)" — flagged for anatomy review
- **PFRN bolts**: 27 individual bolt-size pages → 1 family page ("PFRN 4.9mm Locking Bolt Self Tapping")
- **CLAVO IM Nail**: Hidden (duplicate of PFRN Proximal Femoral, shared 59 SKUs)
- **CLAVO Elastic**: Added "(Pediatric)" context
- **Destiknee**: 3 entries → 1 ("Destiknee Total Knee Replacement System")
- **HIV+Syphilis**: 5 pack-size pages → 1 family page
- **All routes unified**: /catalog/trauma now uses generic CatalogDivision.jsx (breadcrumb: Home > Portfolio > Trauma)

## P2 SKU Table Polish — COMPLETE (2026-03-27)
- Structured columns: Plate Subtype, Holes, Length, Side (parsed from SKU codes via HUMERUS_PLATE_TYPES mapping)
- Sticky header, case-insensitive search, pagination (30/page), CSV export
- Color-coded Left/Right badges, clean "View Brochure" links

### Test Results
- iteration_31: Trauma P0/P1 — 100%
- iteration_32: Multi-division — 100% (22/22)
- iteration_34: SKU table polish — 100% (19/19)
- iteration_35: P1 grouping fix — 100% (21/21)

## Flagged for Future Split (from P0/P1 audit)
- 6 MERISCREEN DOA products sharing 80 SKUs each → need individual test-type split
- 3 AutoQuant reagents (CRP, Lipase, Micro Albumin) sharing 50 SKUs → need individual reagent split
- ARMAR Titanium Plates → needs anatomy classification when more detailed catalog data is available
- Freedom Knee 176 SKUs → may need subfamily grouping

## Priority Stack
1. ~~All pipeline/chatbot/catalog phases~~ DONE
2. ~~Multi-Division Expansion~~ DONE
3. ~~P0/P1 Grouping Fix~~ DONE
4. ~~P2 SKU Table Polish~~ DONE
5. **P3: Add Portfolio to main navigation**
6. Product Comparison Feature
7. Split shared-SKU products (DOA, reagents)
8. Live DB push (ON HOLD)
9. WhatsApp bot (ON HOLD — needs Interakt API key)

## Blocked
- File 008 (corrupted DOCX)
- WhatsApp bot (needs Interakt API key)

## Admin Access
- URL: /admin/login
- Password: admin
