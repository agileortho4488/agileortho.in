# MedDevice Pro — Product Requirements Document

## Project Overview
**Name:** MedDevice Pro — B2B Medical Device Master Franchise Platform
**Client:** Premier Meril Life Sciences distributor in Telangana, India
**Stack:** React 19 + FastAPI + MongoDB + Claude AI (planned)
**URL:** https://meddevice-ai.preview.emergentagent.com

## Core Requirements
1. Portfolio showcase website with hierarchical mega-menu (8 divisions)
2. Custom CRM with lead scoring engine
3. Claude AI PDF catalog importer (Phase 3)
4. RAG AI chatbot (Phase 4)
5. WhatsApp integration via Interakt (Phase 5)
6. SEO optimization (Phase 6)

## What's Implemented (Phase 1 - Dec 2025)

### Backend (FastAPI + MongoDB)
- Products CRUD API with filtering, search, pagination
- Leads API with auto-scoring engine (Hot/Warm/Cold)
- Admin JWT auth
- Dashboard stats API
- 45 Meril products seeded across 8 divisions
- Database indexes for performance

### Frontend (React 19 + Tailwind + Shadcn)
- **Public Pages:** Home, Products (grid/list), Product Detail, About, Contact
- **Admin Pages:** Login, Dashboard, Leads CRM, Products Management
- Mega-menu with 8 divisions and sub-categories
- Lead capture forms (quote request, contact)
- Footer with MD-42 License, GST, ISO certification
- Clinical medical design (Deep Navy, Surgical Green, White)

### Product Divisions (45 products)
1. Orthopedics (6) — Knee/Hip arthroplasty
2. Trauma (6) — Plating, nailing, screws
3. Cardiovascular (6) — Stents, valves, scaffolds
4. Diagnostics (6) — Analyzers, rapid tests, ELISA
5. ENT (5) — Sinus, RF, laser, otoscope
6. Endo-surgical (6) — Sutures, staplers, robotics
7. Infection Prevention (6) — Gowns, disinfection, wound care
8. Peripheral Intervention (4) — Stents, balloons, closure

### Lead Scoring Algorithm
- Bulk Quote inquiry: +40 pts
- Hospital provided: +15 pts
- Email provided: +10 pts
- District provided: +10 pts
- Product interest: +15 pts
- Score >= 60: Hot | 35-59: Warm | <35: Cold

## Testing Status
- Backend: 26/26 tests passed (100%)
- Frontend: 15/15 UI tests passed (100%)
- Test report: /app/test_reports/iteration_13.json

## Credentials
- Admin: password = "admin"

## Remaining Phases

### Phase 2: Enhanced CRM (P0)
- Lead detail page improvements
- Kanban pipeline view
- CRM analytics dashboard
- Admin product CRUD UI (create/edit)

### Phase 3: Claude AI PDF Importer (P1)
- PDF upload endpoint
- Claude integration for data extraction
- SEO content auto-generation
- Admin approval workflow

### Phase 4: RAG AI Chatbot (P2)
- Vector knowledge base from product catalog
- Chat widget on website
- System prompt engineering
- Human handoff to CRM

### Phase 5: WhatsApp via Interakt (P2)
- Webhook integration
- AI chatbot on WhatsApp
- Unified inbox in CRM

### Phase 6: SEO & Polish (P3)
- React Helmet meta tags
- JSON-LD structured data
- District landing pages
- Performance optimization
