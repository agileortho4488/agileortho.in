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

## Recent Changes (Apr 19, 2026 — WhatsApp Funnel, iteration_66)
1. **Fully automated WhatsApp Conversational Funnel** — `/app/backend/services/whatsapp_funnel.py`
   - State machine: `root → division_picker → product_picker → product_detail → quote|brochure|agent`
   - On any first inbound message, bot auto-replies with welcome menu listing 13 divisions
   - Numeric replies 1-13 pick a division → bot sends top 3 products (A/B/C)
   - Letter A/B/C picks product → bot sends specs + 3 CTAs (1=quote, 2=brochure, 3=agent)
   - Quote request auto-upgrades lead to `Hot` score 80, `inquiry_type=Bulk Quote`, `source=whatsapp_funnel`
   - Keyword detection — `trauma`, `plate`, `knee`, `acl`, etc. jump straight to matching division
   - Text-based (not Interakt templates) → zero manual setup, works out of the box
   - Graceful fallback to existing AI bot when user strays off-script
2. **3 new admin endpoints** — `/api/admin/whatsapp/funnel-analytics`, `/funnel-simulate`, `/funnel-reset`
3. **New admin page** `/admin/whatsapp-funnel` (`AdminWhatsAppFunnel.jsx`) with:
   - Conversion funnel bars (Started → Division → Product → Quote) with drop-off %
   - Per-division pick counts
   - Live simulator (dry-run a conversation without sending WhatsApp)
   - Recent 25 funnel events stream with from→to transitions
4. Sidebar link "WA Funnel" added; routes registered
5. Tests: 10/10 backend pytest + 100% frontend coverage (iteration_66)

## Recent Changes (Apr 19, 2026 — Admin Enhancements, iteration_65)
1. **Dashboard KPI refresh + Knowledge Graph card** — `/app/frontend/src/pages/AdminDashboard.jsx`
   - New 4-KPI row: Leads Today, Last 7 Days, Last 30 Days, Review Pending
   - Auto-refresh every 60s + manual Refresh button
   - Clickable Knowledge Graph summary card (edges + coverage bar) linking to `/admin/knowledge-graph`
2. **New Knowledge Graph admin page** — `/app/frontend/src/pages/AdminKnowledgeGraph.jsx`
   - Stat cards (Total Edges, REQUIRES, BUNDLE, Products Covered), catalog coverage progress bar
   - Top Cross-Sell Hubs list (top products by incoming recommendation count)
   - "Rebuild Graph" (re-mines all relationships) + "Ping IndexNow" one-click actions
   - Registered at `/admin/knowledge-graph`; sidebar nav updated
3. **Lead Scoring visibility** — `/app/frontend/src/pages/AdminLeads.jsx` + backend
   - New `explain_lead_score(lead)` helper in `helpers.py` returns `[{points, label}]`
   - `/api/admin/leads`, `/api/admin/leads/{id}` (GET & PUT) now include `score_reasoning`
   - Drawer shows "Why this score?" breakdown with point contributions
   - Table now shows numeric score value alongside the Hot/Warm/Cold badge
4. **Enhanced `/api/admin/stats`** — added `leads_today`, `leads_7d`, `leads_30d`, `review_pending`, and inline `knowledge_graph` block
5. Tests: 11/11 backend pytest + 100% frontend coverage (iteration_65)

## Recent Changes (Apr 19, 2026)
1. **Admin split from public website** — `/app/frontend` (React CRA) is now admin-only
   - Deleted 15 public pages/components (Home, Catalog, Products, ProductDetail, Districts, About, Contact, Chat, ChatWidget, CookieConsent, SEO, SiteHeader, SiteFooter, Layout, PageTransition, VisitorContext, lib/districts, lib/constants, AdminBulkUpload)
   - Root `/` now redirects to `/admin/login`; 404 page shows admin-only message + link to agileortho.in
   - Sidebar header links to public site (opens in new tab)
   - `noindex, nofollow, noarchive` robots meta tag on admin HTML
   - Page title: "Agile Ortho — Admin Console"
   - All 8 admin nav items + logout working; 14/14 backend + 11/11 frontend tests passed (iteration_64.json)
2. **ChatWidget ported to Next.js** at `/app/next-app/components/ChatWidget.jsx`
   - Connects to existing backend `/api/chatbot/query`, `/api/chatbot/suggestions`, `/api/chatbot/history/{session_id}`
   - Persistent session_id in localStorage; auto-loads history on reopen
   - Beautiful floating panel (desktop FAB + full-height mobile drawer), auto-scroll, suggestion chips, WhatsApp handoff
   - Mounted in root layout so it appears on every public page
   - Tested end-to-end: real AI responses with deep links into the SSG catalog
3. **Full public site ported to Next.js (`/app/next-app`)** — 857 pre-rendered pages total

## Recent Changes (Apr 17, 2026)
   - Home, Catalog, About, Contact (server-rendered, ISR 1h)
   - **13 division pages** (`/catalog/[divisionSlug]`) with category chips + product grid (SSG)
   - **810 product pages** with Surgical Decision Engine (SSG)
   - **33 district pages** (`/districts/[districtSlug]`) with local SEO (LocalBusiness JSON-LD), hospital lists, medical focus links (SSG)
   - Districts index, catalog search, contact form wired to `/api/leads`
   - Sitemap: 861 URLs indexing every page
   - All pages use site-wide SiteHeader + SiteFooter matching React CRA pixel-for-pixel
   - Build verified locally: `yarn build` → 857 pages in ~20s, all routes 200

## Recent Changes (Apr 17, 2026)
1. **Next.js/Vercel POC shipped** at `/app/next-app` (parallel to existing React CRA)
   - Next.js 16 app router, 810 catalog products pre-rendered as static HTML (`generateStaticParams`)
   - ISR revalidate every 1h, per-product SEO metadata + JSON-LD Product schema
   - Surgical Decision Engine (KG recommendations) embedded on every product page
   - Dynamic `sitemap.xml` (811 URLs) and `robots.txt`
   - Build verified: `yarn build` produces 810 static HTML pages in ~15s
   - Deploy-ready: Vercel project needs `NEXT_PUBLIC_BACKEND_URL` + `BACKEND_URL` env vars
   - Admin dashboard stays on React CRA for now (full migration is session 2)
2. **Product Knowledge Graph Phase 1 shipped** — Mining engine + API + frontend widget
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
- Next.js / Vercel frontend migration — **POC complete** (Apr 17 2026): 810 product pages pre-rendered as static HTML in `/app/next-app`. Next step: full migration of remaining 24 pages.
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
