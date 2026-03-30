# Agile Healthcare - B2B Medical Device Platform PRD

## Original Problem Statement
Build a B2B medical device platform for "Agile Healthcare", a premier Meril Life Sciences master franchise in Telangana. Focus on a visually stunning, high-contrast "Dark Premium B2B" UI, CRM Analytics dashboard tracking search intelligence/leads, geographic territory/zone lead tracking, end-to-end commercial loops (Interakt WhatsApp webhook, AI Chatbot), automated data seeding, and robust technical SEO.

## Tech Stack
- Frontend: React + TailwindCSS + Shadcn/UI
- Backend: FastAPI + Python
- Database: MongoDB
- Integrations: Interakt WhatsApp API, Meta/Google Pixels (pending IDs)

## What's Been Implemented

### Core Platform
- 810+ products across 13 clinical divisions
- 1202 catalog entries with search/filter
- 33 Telangana districts with service area pages
- AI Chatbot for product queries

### Admin Dashboard (All Working)
- Dashboard stats (products, leads, hot/warm/cold counts)
- CRM Pipeline (6-stage Kanban: new, contacted, qualified, negotiation, won, lost)
- Leads management (1287 total leads, search/filter/score/status)
- Analytics (6 tabs: CRM Leads, Territory, Hospitals, Competitive Intel, Search Intelligence, WhatsApp)
- Products management (1202 products, search/filter, bulk operations)
- PDF Import for brochure extraction

### WhatsApp Integration (Interakt)
- Webhook handler for real-time message/delivery/campaign events
- AI Bot auto-reply (single contextual reply per message)
- WhatsApp Inbox (conversations with message thread view)
- Templates (send template form)
- Analytics (conversation stats, delivery stats, campaign stats)
- **Contact Sync (NEW)**: Pull 1261+ contacts from Interakt API into CRM

### SEO & Compliance
- react-helmet-async on all Catalog pages
- JSON-LD schema injection (Products, FAQPage, LocalBusiness)
- Backend prerendering/SSR for non-JS crawlers
- GDPR Cookie Consent banner (hidden on admin pages)
- District pages with FAQ section

### Security
- Admin auth with hardcoded SHA-256 hash fallback
- JWT token validation on all admin routes
- Admin layout auth guard

## Recent Changes (Mar 30, 2026)
1. Interakt Contact Sync: Pull contacts from Interakt Customer API into CRM (1261 contacts synced)
2. Bot reply fix: Reduced from 4 messages to 1 contextual AI reply
3. Cookie consent banner hidden on admin pages
4. All dashboard functionalities verified (100% pass rate)

## Prioritized Backlog

### P0 - None (all critical items resolved)

### P1
- Meta Pixel ID and Google Ads Conversion ID (BLOCKED - waiting on user)
- File 008 processing (BLOCKED - awaiting uncorrupted DOCX)
- Push CRM leads to Interakt timeout fix (background job for 1274+ leads)

### P2
- Reorder prediction based on consumption patterns
- WhatsApp/Email opt-in consent management
- Consolidate prerender_districts.py with frontend districts.js

## Credentials
- Admin Login: `/admin/login` with password `AgileHealth2026admin`
- Interakt API Key: In backend/.env

## Key API Endpoints
- POST /api/admin/login
- GET /api/admin/stats, /api/admin/pipeline, /api/admin/analytics, /api/admin/leads
- GET /api/admin/whatsapp/analytics, /api/admin/whatsapp/conversations
- POST /api/admin/whatsapp/fetch-interakt-contacts (NEW)
- POST /api/admin/whatsapp/sync-interakt-to-crm (NEW)
- POST /api/webhook/whatsapp (Interakt webhook)
- GET /api/geo/territory-penetration, hospital-intelligence, competitive-intelligence
- GET /api/chatbot/telemetry/report
