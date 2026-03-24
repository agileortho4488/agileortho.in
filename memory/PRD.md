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

### Phase 2: Enhanced CRM (COMPLETE - Dec 2025)
- **Kanban Pipeline:** 6-column drag-and-drop board (New, Contacted, Qualified, Negotiation, Won, Lost)
  - Cards show name, hospital, score badge, source, product interest, contact icons, district
  - Drag between columns updates lead status via API
  - Info bar: "AI Chatbot leads auto-populate this pipeline"
- **CRM Analytics:** Conversion funnel, score distribution (Hot/Warm/Cold), leads by source, top districts, inquiry type breakdown, recent leads
- **Product Create/Edit:** Full form drawer with all fields (name, SKU, division, category, material, description, JSON specs, sizes, pack size, manufacturer, SEO, status)
- **Demo Data:** 12 realistic leads seeded across pipeline stages
- **Admin Sidebar:** 5 nav items (Dashboard, Pipeline, Leads, Analytics, Products)
- **Testing:** 100% pass rate — 24 backend + all frontend UI tests

### Phase 3: Claude AI PDF Importer (COMPLETE - Dec 2025)
- **PDF Upload:** Upload manufacturer PDFs to backend, stored locally
- **Claude AI Extraction:** Text extracted via pdfplumber → sent to Claude Sonnet → structured JSON product data
- **SEO Generation:** Claude auto-generates SEO title + meta description for each product
- **Admin Approval:** Review extracted products, expand to see details, edit fields, approve individual or all → publishes to catalog
- **Real Test:** Sales Guide PDF → 16 products extracted across 6 divisions with SEO content
- **Admin Sidebar:** 6 nav items (Dashboard, Pipeline, Leads, Analytics, Products, PDF Import)
- **Testing:** 100% pass rate — 23 backend + all frontend tests

## Credentials
- Admin: password = "admin"

## Remaining Phases

### Phase 2: Enhanced CRM (P0)
- Kanban pipeline view (auto-populated by AI chatbot in Phase 4) - COMPLETE
- CRM analytics dashboard - COMPLETE
- Admin product CRUD UI (create/edit) - COMPLETE

### Phase 3: Claude AI PDF Importer (P1) - COMPLETE
- PDF upload endpoint with Claude AI extraction
- SEO content auto-generation (descriptions + meta tags)
- Admin approval workflow (review, edit, approve/reject, publish)

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
