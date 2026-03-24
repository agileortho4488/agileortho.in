# Agile Ortho — Product Requirements Document

## Project Overview
**Name:** Agile Ortho — B2B Medical Device Platform
**Company:** AGILE ORTHOPEDICS PRIVATE LIMITED
**Domain:** www.agileortho.in
**Stack:** React 19 + FastAPI + MongoDB + Claude AI + Interakt WhatsApp
**GST:** 36AATCA5653R1ZO

## Core Identity
- **Brand:** Agile Ortho
- **Tagline:** Mobility Revolutionised
- **Role:** Authorized Meril Life Sciences Master Distributor for Telangana
- **Phone:** +917416216262
- **WhatsApp:** +917416521222
- **Email:** info@agileortho.in
- **Address:** 1st Floor, Plot No 26, H.No 8-6-11/P20, Urmila Devi Complex, Engineers Colony, Hayathnagar, Hyderabad, Telangana - 500074
- **Shop:** https://www.agileortho.shop

## What's Implemented

### Phase 1: Foundation & Portfolio (COMPLETE)
- Backend: FastAPI + MongoDB, Products CRUD, Leads API, Admin JWT auth
- Database: 93 products across 8 divisions (45 seeded + 44 from brochure imports + 4 from Variabilis)
- Lead Scoring: Auto-scoring engine (Hot/Warm/Cold)
- Frontend: React 19 + Tailwind CSS + Shadcn UI
- Navigation: Products, About, Contact, AI Assistant, Shop (external)
- Admin: Login, dashboard, leads CRM, products management

### Phase 2: Enhanced CRM (COMPLETE)
- Kanban Pipeline: 6-column drag-and-drop board
- CRM Analytics: Conversion funnel, score distribution, leads by source
- Product Create/Edit: Full form drawer

### Phase 3: Claude AI PDF Importer (COMPLETE)
- PDF Upload → Claude AI Extraction → SEO Generation → Admin Approval
- Deduplication: SKU + name similarity check
- Claude Vision: For image-based PDFs (OCR + Vision fallback)
- Reprocess endpoint for failed imports

### Product Detail Page Redesign (COMPLETE)
- Side-by-side hero, social share, product tags, tabbed content
- Trust badges, quote modal, help banner, related products

### Phase 4: RAG AI Chatbot (COMPLETE)
- Claude Sonnet RAG with 93-product knowledge base
- Floating widget on all pages + dedicated /chat page
- Session management, conversation history, lead capture
- Agile Ortho Sales Assistant personality

### Phase 5: Interakt WhatsApp Integration (COMPLETE)
- Webhook: POST /api/webhook/whatsapp
- AI auto-reply on WhatsApp using same RAG pipeline
- Human takeover mode
- Auto-lead creation from WhatsApp
- Unified inbox at /admin/whatsapp

### Full Rebrand (COMPLETE)
- MedDevice Pro → Agile Ortho everywhere
- Real company logo, address, GST, phone numbers, email
- SEO meta tags, page titles, favicon updated
- "Made with Emergent" badge removed

## Product Divisions (93 products)
1. Orthopedics (22) 2. Trauma (35) 3. Cardiovascular (6)
4. Diagnostics (6) 5. ENT (5) 6. Endo-surgical (6)
7. Infection Prevention (6) 8. Peripheral Intervention (4)

## Credentials
- Admin Password: admin

## Remaining Tasks

### Phase 6: SEO & Polish (P1)
- React Helmet meta tags per page
- JSON-LD structured data
- District landing pages
- Performance optimization

### Backlog
- Meril website-inspired homepage redesign
- Product image uploads via object storage
- Product comparison feature
- Backend refactoring (break monolithic server.py)
- Retry Trauma PLATE Brochure import
