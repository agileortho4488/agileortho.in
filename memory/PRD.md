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

## Recent Changes (Apr 17, 2026)
1. **Product Knowledge Graph Phase 1 shipped** — Mining engine + API + frontend widget
   - `product_relationships` MongoDB collection (5,924 edges: 672 REQUIRES + 5,252 BUNDLE)
   - 443 of 874 live products covered (50.7%)
   - REQUIRES rule: plate↔screw diameter matching with VALID_DIAMETERS whitelist (1.5mm-7.3mm) and BRAND_SCREW_MAP for cross-brand compatibility
   - BUNDLE rule: same product_family (0.90) + same brand_system+implant_class (0.85)
   - REORDER rule explicitly skipped (user has separate deployment for that)
2. **New API endpoints**: `/api/products/{slug}/recommendations`, `/api/admin/knowledge-graph/stats`, `/api/admin/knowledge-graph/rebuild`
3. **Frontend**: "Surgical Decision Engine" section on product detail page — "Required Together" (gold) + "Complete the System" (teal) bucket grids with confidence badges and reason labels
4. All 13 backend tests passed (iteration_63.json)

## Recent Changes (Mar 30, 2026)
1. Interakt Contact Sync: Pull contacts from Interakt Customer API into CRM (1261 contacts synced)
2. Bot reply fix: Reduced from 4 messages to 1 contextual AI reply
3. Cookie consent banner hidden on admin pages
4. All dashboard functionalities verified (100% pass rate)

## Code Quality Fixes Applied (Mar 30, 2026)
### Critical
- **XSS Fix**: Added DOMPurify sanitization to all 3 `dangerouslySetInnerHTML` instances (Chat.jsx, ChatWidget.jsx, AdminWhatsApp.jsx)
- **Circular Import Fix**: Extracted shared `send_whatsapp_message` into `/backend/services/__init__.py` — automation.py no longer imports from whatsapp.py
- **Hardcoded Secrets**: Moved JWT fallback secret to env var pattern in helpers.py; test files use `os.environ.get()` 
- **Mutable Default Arguments**: Fixed 4 instances (`body: dict = {}` → `body: dict = None` + `body = body or {}`) in bulk_upload.py, imports.py, review.py
- **Empty Catch Blocks**: Added error parameters and `console.error()` logging to all 9 catch blocks in AdminWhatsApp.jsx

### Important
- **MD5 → SHA256**: Replaced `hashlib.md5` with `hashlib.sha256` in 4 archived scripts
- **Identity Checks**: Fixed `is True` → `== True` in test files

## Prioritized Backlog

### P0
- Product Knowledge Graph Phase 2 (CRM integration, lead-based recommendations using order history) — blocked on Order Log feature
- Order Log feature (manual order entry in CRM) — unlocks Phase 2+3

### P1
- Meta Pixel ID and Google Ads Conversion ID (BLOCKED - waiting on user)
- Next.js / Vercel frontend migration for faster SSG/SSR (paused per user until KG shipped)
- File 008 processing (BLOCKED - awaiting uncorrupted DOCX)
- Push CRM leads to Interakt timeout fix (background job for 1274+ leads)

### P2
- WhatsApp/Email opt-in consent management
- Consolidate prerender_districts.py with frontend districts.js
- Incremental React hook dependency warnings cleanup
- Split large files (AdminAnalytics.jsx, CatalogProductDetail.jsx)

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
- GET /api/products/{slug}/recommendations (NEW — Knowledge Graph recommendations: must_buy + bundle)
- GET /api/admin/knowledge-graph/stats (NEW — admin)
- POST /api/admin/knowledge-graph/rebuild (NEW — admin re-mine graph)
