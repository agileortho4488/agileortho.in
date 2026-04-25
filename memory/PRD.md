# Agile Healthcare - B2B Medical Device Platform PRD


## Recent Changes (Feb 2026 — Buying-Guide Articles: 6 Long-Form Pages)
1. **`next-app/lib/guides.js` (new)** — config of 6 long-form research articles (1000–1500 words each), each with structured `body` array of typed sections (p, h2, h3, ul, ol, table, callout, cta, quote) so content can be edited without touching renderer.

   **Articles shipped**:
   - `/guides/freedom-knee-vs-destiknee` (8 min) — Joint Replacement
   - `/guides/meril-vs-zimmer-biomet-orthopedic-implants` (7 min) — Joint Replacement
   - `/guides/daapro-uncemented-vs-cemented-hip-stems` (6 min) — Joint Replacement
   - `/guides/biomime-drug-eluting-stent-guide-india` (7 min) — Cardiovascular
   - `/guides/cdsco-approved-orthopedic-implants-procurement-guide` (8 min) — Procurement
   - `/guides/variabilis-2-4mm-vs-2-7mm-locking-plates` (6 min) — Trauma

   Each entry has: title, metaTitle, description, 5-keyword array, summary, datePublished, dateModified, author, body sections (with comparison tables where relevant), 5 FAQs, and `relatedBuy` slugs that link into the existing /buy landing pages.

2. **`next-app/app/guides/[slug]/page.jsx` (new)** — SSG renderer:
   - Hero with category pill, H1, summary, read-time, last-updated date, author byline.
   - Body renderer that handles 9 section types (paragraphs, h2/h3, bulleted/ordered lists, comparison tables, info/warning/success callouts, inline CTAs, quotes).
   - FAQ section with collapsible items (visible content + FAQPage schema).
   - "Ready to procure?" cards linking to 3 related /buy pages.
   - "More {category} guides" cross-link block.
   - Bottom CTA bar (WhatsApp + phone + all-guides).
   - 3× JSON-LD: Article schema (with publisher @id pointing to sitewide Organization, datePublished/dateModified, articleSection, keywords, inLanguage=en-IN), BreadcrumbList, FAQPage.

3. **`next-app/app/guides/page.jsx` (new)** — Index grouped by category (Joint Replacement / Cardiovascular / Procurement / Trauma).

4. **Site header** — added "Guides" nav link (desktop + mobile menu) for discoverability.

5. **Home page** — added "Buying guides" 6-card block right before the FAQ section, internal-linking to all guides.

6. **Sitemap** — `/guides` index + 6 guide URLs added (priority 0.8, changeFrequency monthly, lastModified=dateModified).

7. **Build verified** — 904 SSG pages total (was 897; +7 for guides + index). Smoke tests pass:
   - `/guides/freedom-knee-vs-destiknee` → 9 h2 sections, 1 comparison table, 5 FAQ items, 3 related buy links, all 3 JSON-LD schemas (Article/BreadcrumbList/FAQPage) present.
   - Lint clean across all touched files.

**Expected impact**: top-of-funnel research traffic (queries like "Meril vs Zimmer", "knee replacement guide India", "DAAPRO uncemented") usually starts surfacing within 2–4 weeks. Comparison-table content is highly featured-snippet-eligible and tends to capture position 0 results. Each guide also internal-links to 2–3 /buy pages, accelerating PageRank flow into the high-commercial-intent landing pages.



## Recent Changes (Feb 2026 — Programmatic Landing Pages: 30 High-Intent Buy URLs)
1. **`next-app/lib/buyPages.js` (new)** — config of 30 curated high-commercial-intent landing pages, grouped:
   - **Category A (10)**: Procedure × City — `knee-replacement-implants-hyderabad`, `hip-replacement-implants-hyderabad`, `trauma-implants-hyderabad`, `cardiac-stents-hyderabad`, `orthopedic-implants-hyderabad`, `orthopedic-implants-telangana`, `spine-implants-hyderabad`, `sports-medicine-implants-hyderabad`, plus Telangana variants.
   - **Category B (10)**: Real product family × Hyderabad — `freedom-knee-hyderabad`, `destiknee-hyderabad`, `daapro-hip-hyderabad`, `biomime-stent-hyderabad`, `variabilis-locking-plates-hyderabad`, `im-nailing-system-hyderabad`, `ket-nailing-system-hyderabad`, `rotafix-anchors-hyderabad`, `latitud-acetabular-cup-hyderabad`, `mirus-endocutter-hyderabad`.
   - **Category C (10)**: Division × India — `orthopedic-implants-distributor-india`, `joint-replacement-distributor-india`, `cardiovascular-stents-supplier-india`, `spine-implants-distributor-india`, `diagnostics-equipment-supplier-india`, `endo-surgery-instruments-india`, `sports-medicine-implants-india`, `urology-devices-supplier-india`, `ent-medical-devices-india`, `critical-care-devices-supplier-india`, `infection-prevention-supplier-india`.
   - Each entry has slug, h1, metaTitle (<60 char), description (<160 char), 4–5 keywords, intro paragraph, catalog filters (division/search), city/areaServed, and 4 custom FAQs (3 shared standard + 1 page-unique).
2. **`next-app/app/buy/[slug]/page.jsx` (new)** — SSG page with `generateStaticParams` over all 30 entries:
   - Hero with H1, location badge, intro, 4 trust badges + dynamic stock count.
   - 3 primary CTAs (WhatsApp pre-filled with H1, phone, browse catalog).
   - Live product grid (12 SKUs from `searchCatalogProducts(filters)` server-side).
   - Visible FAQ section mirrored to `FAQPage` schema (featured-snippet eligible).
   - Internal-link cluster of 6 related buy pages (same city or same division).
   - District callout (12 districts) on Hyderabad/Telangana pages.
   - 4× JSON-LD: BreadcrumbList, ItemList of products, FAQPage, multi-type LocalBusiness+MedicalEquipmentSupplier with parentOrganization @id linkback.
3. **`next-app/app/buy/page.jsx` (new)** — Index page listing all 30 by category (Hyderabad / Telangana / India).
4. **Home page** — added "Popular searches" section with 9 internal links to top buy pages, placed before the FAQ section. Boosts internal PageRank flow + lets visitors discover the new pages.
5. **Sitemap** — `app/sitemap.js` now includes `/buy` index + all 30 `/buy/[slug]` entries with `priority=0.85, changeFrequency=weekly`.
6. **Build verified** — 897 SSG pages total (was 865; +32 for buy pages + index + 1 internal). Zero warnings, lint clean.
7. **Smoke-tested**: `/buy/knee-replacement-implants-hyderabad` → correct title, 12 products, 4 FAQ items, 4 schema types (BreadcrumbList/FAQPage/ItemList/LocalBusiness multi-type) all present.

**Expected impact**: programmatic landing pages typically 3–5× organic impressions for B2B catalog sites within 60 days because they exactly match buyer search syntax ("buy {product family} {city}"). Combined with the previous SEO push (Org schema, FAQ on home/division/district, full Product+Offer schema), this gives Google ~900 highly-targeted indexable pages.



## Recent Changes (Feb 2026 — SEO Growth Push: Keywords + Schema Stack)
**Goal**: drive organic impressions on agileortho.in by aligning copy, metadata, and schema with high-volume B2B medical-device buyer intent.

1. **Sitewide schema graph** in `next-app/app/layout.jsx`:
   - `WebSite` with `SearchAction` (sitelinks search box eligibility).
   - `Organization` + `MedicalEquipmentSupplier` + `LocalBusiness` (multi-type) with `@id` for entity linking, GeoCoordinates, openingHours, currenciesAccepted (INR), paymentAccepted, areaServed (Telangana + 5 cities), 2× contactPoint (Sales + WhatsApp), sameAs links, knowsAbout list, makesOffer.
   - Sitewide metadata: high-intent default title ("Orthopedic Implants & Medical Devices Distributor in Hyderabad — Meril Telangana"), expanded description, 13-keyword array, robots googleBot config (max-image-preview=large, max-snippet=-1).

2. **Home page** (`app/page.jsx`):
   - New title: "Orthopedic Implants Distributor in Hyderabad — Meril Medical Devices Telangana".
   - Description rewritten with high-volume terms (orthopedic implants, trauma plates, knee/hip replacement, cardiovascular stents, CDSCO, B2B bulk).
   - Removed duplicated Org/LocalBiz schema (now sitewide).
   - **New `FAQPage` schema** with 7 buyer-intent questions (where to buy, CDSCO approval, divisions, delivery time, bulk pricing, knee/hip portfolio, catalog request).
   - **New visible FAQ section** mirroring the schema (Google requires visible content for FAQ rich results) with `data-testid="faq-section"` + per-item testids.
   - `BreadcrumbList` schema.

3. **Product pages** (`catalog/products/[slug]/page.jsx`):
   - New title pattern: "{Product} — Buy in Hyderabad | {Brand} {Division} | Agile Healthcare".
   - Description: includes "buy", "Hyderabad", "Telangana", "CDSCO-approved", WhatsApp CTA.
   - 7-keyword auto-generated array per product (slug + city + state + distributor + price + buy + brand-division).
   - **Enhanced Product schema** with full `Offer`: priceCurrency=INR, availability=InStock, itemCondition=NewCondition, businessFunction=Sell, areaServed=Telangana, seller=@organization, PriceSpecification, sku, mpn, isRelatedTo product_family.
   - **`BreadcrumbList`** schema (Home → Catalog → Division → Product).

4. **Division pages** (`catalog/[divisionSlug]/page.jsx`):
   - Title: "Buy {Division} Implants in Hyderabad — Meril {Division} Distributor Telangana".
   - 6-keyword array (division+city, division+state, Meril+division, buy verb, supplier-India, top categories).
   - **`CollectionPage` schema** with `ItemList` of top 10 products (linkable in SERP).
   - **Division-specific `FAQPage`** (4 questions) for featured-snippet capture.
   - Existing `BreadcrumbList` retained.

5. **District pages** (`districts/[districtSlug]/page.jsx`):
   - Title: "Orthopedic Implants & Medical Device Distributor in {District}, Telangana — Meril Authorized".
   - Keywords array per district (medical-device-distributor + city, orthopedic-implants + city, etc.).
   - LocalBusiness schema upgraded to multi-type (`MedicalBusiness` + `MedicalEquipmentSupplier`), linked to sitewide Org via parentOrganization @id, includes openingHours, priceRange, currenciesAccepted, knowsAbout from district medicalFocus.
   - **District-specific `FAQPage`** (3 questions) for geo-intent featured snippets.

6. **Build verified clean** — 865 SSG pages, lint passes everywhere, all schema types present in rendered HTML (FAQPage / BreadcrumbList / CollectionPage / Product+Offer / MedicalEquipmentSupplier).

**User next-step**: redeploy to Vercel (build cache unchecked). Submit refreshed sitemap in GSC → expect impressions to climb over 2–4 weeks as Google reindexes 865 pages with new metadata + rich schema. Watch GSC "Performance > Queries" for new long-tail captures and "Enhancements > FAQ / Breadcrumbs / Products" for rich-result eligibility growth.



## Recent Changes (Feb 2026 — Bulk Brochure Import (ZIP + Manifest))
1. **New `routes/brochures.py`**:
   - `GET /api/admin/brochures/summary` — coverage stats (total / with / missing / by_division + percent).
   - `GET /api/admin/brochures/manifest-template` — downloadable starter CSV listing every 0%-covered division and every missing product_family (pre-filled `scope_type=division|product_family`).
   - `POST /api/admin/brochures/bulk-import` — accepts ONE `.zip` containing `manifest.csv` + PDFs. Extracts in-memory, uploads each PDF to object storage at `agile-ortho/brochures/<slugified>.pdf`, then applies every manifest row (`filename,scope_type,scope_value` with scope_type ∈ product_slug|product_family|division). Returns per-row report: matched/updated counts + error per row.
2. **Safety**: `product_family` and `division` scopes only write to products that currently have no brochure (never overwrites manual uploads). `product_slug` scope is an explicit override.
3. **New admin page** `/admin/brochures` (AdminBrochures.jsx): 4 coverage stat cards, drag-and-drop ZIP uploader with progress spinner, download-manifest-template button, live coverage table per division with progress bars, and a detailed per-row import report post-upload.
4. **Routed & navigated**: added to `App.js` routes and `AdminLayout.jsx` sidebar ("Brochures" with FileText icon).
5. **E2E verified**: 3-PDF + 3-row manifest ZIP processed in <1s, 525 products updated (Diagnostics 199 + Endo Surgery 170 + Infection Prevention 156), coverage jumped 18% → 61.5% in one call. Test data rolled back afterward.



## Recent Changes (Feb 2026 — Vercel Bot Shield / Edge Request Mitigation)
1. **`next-app/app/robots.js` rewritten** — explicit Disallow for GPTBot, ClaudeBot, anthropic-ai, CCBot, Google-Extended, PerplexityBot, Bytespider, Amazonbot, FacebookBot, Meta-ExternalAgent/Fetcher, Applebot-Extended, Diffbot, Omgilibot, AhrefsBot, SemrushBot, DataForSeoBot, MJ12bot, etc. Googlebot/Bingbot/DuckDuckBot/Yandex/Baiduspider explicitly allowed.
2. **`next-app/middleware.js` (new)** — edge middleware returns 403 early for non-compliant scrapers (Bytespider, AhrefsBot, python-requests, Scrapy, HeadlessChrome, etc.) so the page function never runs. Matcher skips `_next/static`, `_next/image`, images, fonts, robots, sitemap so static asset serving stays cheap.
3. **`next-app/next.config.mjs` headers()**:
   - `/_next/static/*` → `public, max-age=31536000, immutable`
   - images → `public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800`
   - robots/sitemap → `public, max-age=3600, s-maxage=3600`
   - all pages → `public, max-age=0, s-maxage=3600, stale-while-revalidate=86400` (CDN absorbs the load)
   - Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy.
4. **Full ISR audit confirmed** — no `force-dynamic`, all routes use `revalidate` (home/catalog/product=1h, districts=24h). Build output: 865 pages SSG.
5. **Local verification** (curl on production build): Bytespider/GPTBot/ClaudeBot/AhrefsBot → **403**; Googlebot + real browser → **200**. `robots.txt` serves full block-list correctly.
6. **Follow-up cleanup after first Vercel deploy**:
   - Renamed `middleware.js` → `proxy.js` (Next.js 16 convention; `export function proxy()`). Removed deprecation warning.
   - Removed redundant `Cache-Control` override for `/_next/static/:path*` (Next.js sets `immutable` automatically). Removed build warning.
   - Build rerun: clean, 865 SSG pages, Proxy compiled, bot blocks still verified (Bytespider/AhrefsBot → 403, Googlebot/browser → 200).
7. **User next-step**: redeploy to Vercel ("Use existing Build Cache" unchecked once more for the rename); monitor Vercel Analytics for edge-request reduction over 24h.


## Recent Changes (Feb 2026 — Auto-Reply Shield + Smarter Division Matcher)
1. **Auto-reply detection** (`services/whatsapp_funnel.is_business_auto_reply`) — regex patterns catch "thank you for your message", "we're unavailable", "please wait", "greetings from", "welcome to", "assalamu alaikum", etc.
2. **WhatsApp webhook silent on auto-replies** — prevents bot-to-bot loops that hurt Meta quality rating. Flags thread `status=auto_reply_skipped`.
3. **AI Lead Handler** also checks auto-reply pattern before classifying — returns `intent=SPAM, reply=""` silently.
4. **Division matcher bug fixed** — keywords ≤4 chars now require word boundaries. "ent" no longer matches "center", "hip" no longer matches "shipping". Was causing DIAGNOSTIC CENTERS to be routed to ENT division.
5. **Retroactive flag sweep** — existing conversations scanned, auto-reply threads marked so bot ignores further messages from those numbers.

## Recent Changes (Feb 2026 — AI Brochure Enrichment + Admin Control Panel)
1. **AI handler now enriches every reply** with real links from `catalog_products.brochure_url` + division catalog URLs. No more bare "Catalog: https://www" truncated replies.
2. **Division-aware**: AI picks division_hint (Trauma/JR/Spine/…); system auto-appends matching catalog + up to 2 brochure PDFs.
3. **whatsapp_funnel.build_brochure_reply** now returns real PDF object-storage URL (`/api/files/agile-ortho/brochures/...`) instead of generic catalog page.
4. **New admin panel** `/admin/ai` — stats, inbound feed, per-row "Correct this reply", sandbox tester, live-editable system prompt (hot-swap, no redeploy).
5. **6 new admin endpoints**: `/api/admin/ai/stats`, `/recent`, `/config` (GET/PUT), `/test`, `/correct/{id}`.
6. **Custom prompt persisted** in `app_config.type=ai_handler_prompt` — AI hot-reloads on every message.
7. Brochure coverage: 214 products × division-specific catalogs (JR: 79, Sports Med: 53, Trauma: 47, Urology: 28, Instruments: 7).

## Recent Changes (Feb 2026 — AI Lead Handler (Angle B))
1. **New `services/ai_lead_handler.py`** — unified intelligence layer for inbound messages.
   Classifies every WhatsApp reply + website chatbot message into:
   `PRICING / BULK_QUOTE / MEETING / PRODUCT_SPEC / CATALOG_REQUEST / SPAM / IRRELEVANT / GENERAL`
   Uses Claude Sonnet (via Emergent LLM Key) with strict JSON output schema.
2. **Auto lead updates**: each reply refreshes `score`, `score_value`, `status`, `product_interest`, `last_ai_intent`, `last_ai_reasoning`, and appends to `intent_history[]`.
3. **Rules (never overridden by Claude)**:
   - No price quotes ever (AI asks for GST + volume + location, promises exact quote within 1 working day)
   - No stock claims beyond "usually in stock in Hyderabad, 24h delivery"
   - Responds in same language as user (English / Hindi / Telugu)
   - 40-80 word replies, no markdown
4. **Hot-lead sales alert**: on `BULK_QUOTE` intent, fires a native WhatsApp ping to `sales_whatsapp` (configurable via `app_config.type=ai_handler_config`).
5. **Spam handling**: `SPAM` / `IRRELEVANT` → silent (no reply sent, lead flagged `status=junk`).
6. **Hooked into**:
   - `routes/whatsapp.py` — after funnel miss, before legacy product chat (priority)
   - `routes/chat.py` — runs in parallel with website chatbot for lead tracking
7. **New collection** `ai_interactions_col` — every classification logged (inbound / intent / confidence / reasoning / reply) for analytics.
8. **Tested end-to-end**: 5 real-world scenarios classified correctly at ≥0.60 confidence, lead record auto-upgraded to Warm/Hot with `intent_history` growing.

## Recent Changes (Feb 2026 — Autopilot Bulk Scrape)
1. **Daily auto-scraper** (`services/apify.py`) — fires 6 AM IST every day, scrapes 6 medical query types × 20 Telangana districts × 10 results (up to 1,200 clinics/day).
2. **Queries expanded**: orthopedic hospital, multi-specialty, trauma center, joint replacement clinic, spine surgery clinic, endoscopy center.
3. **Districts expanded**: 5 → 20 (covers Hyderabad, Rangareddy, Warangal, Karimnagar, Khammam, Nizamabad, Sangareddy, Nalgonda, Adilabad, Mahabubnagar, Siddipet, Suryapet, Jagtial, Peddapalli, Kamareddy, Mancherial, Vikarabad, Hanumakonda, Mahabubabad, Medchal).
4. **Idempotency**: same phone = update in place; `status=new` preserved if human hasn't touched it.
5. **Bulk Scrape button** on `/admin/leads` Sources bar for force-trigger (backup to daily cron).
6. **Territory analytics** now auto-populates from `google_maps` leads → Analytics → Territory tab lights up without manual work.
7. **First live run verified**: 233+ clinics added across 24 districts in 7 minutes, 0 errors.

## Recent Changes (Feb 2026 — MVP-C + MVP-A Outbound Engine)
1. **New Outbound Engine** (`services/outbound_engine.py` + `routes/outbound.py` + `pages/AdminOutbound.jsx`)
   - Rule-based WhatsApp outreach scheduler (5-min tick)
   - **Safety stack (MVP-C)**: 2000/day cap, 7-day per-phone cooldown, business-hours only (9 AM – 7 PM IST), auto-pause at 3+ blocks/day
   - **Opt-in gate**: No outbound to `source:google_maps` leads until they click "Yes, send catalog" on the opt-in template
   - **Closer loop (MVP-A)**: UTM click tracking at `/api/track/click` auto-upgrades clicker to Warm; opt-in promotes to Warm+Qualified
   - Admin UI: engine status banner, 5 KPI cards, 7d rollup, rules table with toggle/edit/delete, recent sends log, config modal, manual pause/resume/tick
   - Hooks in `routes/whatsapp.py` webhook detect opt-in clicks + replies + Meta block events
2. **Interakt templates spec** at `/app/INTERAKT_TEMPLATES.md` — copy-paste ready for user to submit (ao_optin_v1, ao_catalog_carousel_v1, ao_quote_followup_v1)
3. New MongoDB collections: `outbound_rules`, `outbound_sends`, `outbound_quality` (daily snapshot)
4. Admin sidebar + App routing updated: `/admin/outbound`

## Recent Changes (Feb 2026 — GSC Insights → Apify Buyers Flow, live-verified)
1. **GSC panel rendered on Market Intelligence page** (`AdminMarketIntelligence.jsx`)
   - Connect button (when disconnected) / "Connected" badge (when linked)
   - Site selector auto-populated from `/api/admin/gsc/sites` (prefers `agileortho.in`)
   - "Load queries (last 28d)" → pulls top 100 GSC queries as **insights** (NOT leads)
   - Each query row: clicks / impressions / CTR / position + an orange **"Find Buyers"** button
   - "Find Buyers" fires `POST /api/admin/gsc/find-buyers` → Apify Google Maps scraper scrapes Telangana clinics matching that query → inserts them into `leads_col` as `source: google_maps` with phone/address/category/rating
2. **AdminLeads.jsx cleaned up** — GSC pseudo-leads deleted, Sources bar added with CTA pointing to Market Intel for new-lead acquisition
3. **Data-testid anchors** (for testing agent): `gsc-panel`, `gsc-status-connected`, `gsc-connect-btn`, `gsc-site-select`, `gsc-load-queries-btn`, `gsc-queries-table`, `find-buyers-<query-prefix>`
4. Live-verified with real Google Search Console data: 100 queries loaded, UI renders end-to-end

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

## Recent Changes (Apr 19, 2026 — GSC OAuth + Unified Leads Dashboard)
1. **Google Search Console OAuth 2.0 integration** — `services/gsc.py` + `routes/intelligence.py`
   - OAuth flow: admin clicks "Connect GSC" → redirected to Google → callback stores refresh token in `app_config`
   - Auto-refresh expired access tokens
   - `/api/admin/gsc/{status, connect, callback, sites, import}` endpoints
2. **Unified Leads dashboard** — no separate prospects page per user request
   - `AdminLeads.jsx` now shows a **Sources bar** at top with GSC connect/import actions
   - New **Source column** on the leads table with colored badges (WhatsApp / WA Funnel / Interakt / Website / GSC Search / Google Maps / IndiaMART)
   - **Source filter dropdown** added to existing filters
   - Lead detail drawer shows GSC-specific metrics (clicks, impressions, CTR, position, country, landing page) when source=gsc_warm
3. **GSC import → leads** — one click fetches top 50 search queries from last 28 days, inserts each as a Hot/Warm/Cold lead with:
   - `source: "gsc_warm"`
   - `score_value = clicks × 8 + (30 - position) + ctr × 200` (clipped 0-100)
   - Dedupe by (source, query) so re-runs update in place
4. **Backend `/api/admin/leads` now supports `source` query param**
5. **One-time setup required from user**: create OAuth client in Google Cloud Console + paste `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` into `backend/.env`

## Recent Changes (Apr 19, 2026 — Market Intelligence Phase 1 + Prospects Foundation)
1. **Google Trends dashboard** at `/admin/market-intelligence` (`AdminMarketIntelligence.jsx`)
   - 7 keyword presets (Default + 6 Meril divisions) + custom keyword input (max 5)
   - 4 timeframes (30d / 90d / 12m / 5y), 6 geo filters (IN + 5 top states)
   - Interest Over Time sparklines (5 colored lines)
   - Top Regions list (Telangana highlighted with star when in top 10)
   - Related Queries (Rising + Top) with rate-limit-aware empty state
   - 24h cache in `market_intelligence` collection → cheap re-queries
2. **New backend services**
   - `services/market_intelligence.py` — `trendspy` library (pytrends replacement, urllib3 2.x compatible)
   - `routes/intelligence.py` — `/api/admin/intelligence/trends`, `/trends/division/{division}`, `/keywords`
3. **Prospects CRM foundation** (started before user pivoted to search-intent)
   - `services/apify.py` + `routes/prospects.py` — Apify Google Maps Scraper integration with cost guardrails
   - `prospects_col` + `apify_runs_col` MongoDB collections
   - Endpoints: `/api/admin/prospects` (list/filter), `/stats`, `/scrape`, `/runs/{id}`, `/export.csv`, `/bulk-update`
   - **NOT YET EXPOSED** in admin UI (pivoted to search-intent approach per user feedback)
4. **WhatsApp webhook fix** — Interakt delivers interactive list/button replies as **JSON string in message body** (`{"type":"list_reply","list_reply":{"id":"div:..."}}`), not a structured `interactive` field. Parser updated to handle both shapes so interactive funnel replies route correctly.
5. **Webhook URL guidance documented** — the production Next.js site (`www.agileortho.in`) has no backend; webhooks must point to the deployed backend (`jointsmart.emergent.host` when deployed) or the current preview URL for dev testing.

## Recent Changes (Apr 19, 2026 — Interactive Funnel Fix, live-verified)
- **BUG FIX**: Interakt API was rejecting the interactive payload because I used `type: "Interactive"`. Correct type names are `"InteractiveList"` and `"InteractiveButton"` (separate types, revealed via Interakt's own error response).
- **Schema fix**: The WhatsApp Cloud API interactive block must be wrapped inside `data.message`, not `data` directly.
- **Live-verified**: `/api/admin/whatsapp/funnel-test-interactive` now passes Interakt validation — only blocker is the 24h session window (recipient must have messaged the business number in last 24h).
- Default mode switched back to `interactive`.
- Admin config endpoint now accurately reports `interactive_supported: true` with the session-window note.

## Recent Changes (Apr 19, 2026 — Interactive Funnel Upgrade, iteration_67)
1. **WhatsApp Funnel now supports native Interactive List + Reply Button UI** via Interakt session messages
   - `send_whatsapp_interactive_list()` and `send_whatsapp_interactive_buttons()` hit the same `/v1/public/message/` endpoint with `type: "Interactive"` (verified correct casing)
   - `try_handle_funnel()` now accepts `mode="text"|"interactive"` and returns structured payload dicts (`type: "text" | "interactive_list" | "interactive_buttons"`)
   - Welcome menu renders as a native list with 10 clinical division rows + "Talk to specialist"; product picker as native list of 3 products; product detail as 3 reply buttons (Bulk quote, Get brochure, Talk to agent)
   - Graceful fallback: if Interakt API returns error (e.g., session window expired), the funnel auto-sends plain text
2. **Inbound webhook parses interactive replies** — `interactive.list_reply.id` and `interactive.button_reply.id` are encoded as message text (`div:Trauma`, `prod:<slug>`, `act:quote`) so the funnel engine routes them identically to typed replies
3. **Runtime mode toggle** persisted in `app_config` collection + loaded on startup
4. **New admin endpoints** — `/api/admin/whatsapp/funnel-config` (GET/POST), `/funnel-test-interactive`
5. **Admin UI upgrades** (`AdminWhatsAppFunnel.jsx`)
   - Text ↔ Interactive mode toggle at top of page
   - Simulator has mode dropdown + rich preview: `SimReplyPreview` component renders interactive_list as bulleted rows with #id tokens + button label; interactive_buttons as 3 disabled pill buttons (visual preview of what recipient will see)
   - "Send Live Interactive Test" panel for real-phone QA
6. Tests: 11/11 backend pytest + 100% frontend coverage (iteration_67)

## Recent Changes (Apr 19, 2026 — WhatsApp Deep-links on Public Site)
1. **Pre-filled WhatsApp CTAs on every product card** — `/app/next-app/components/WhatsAppCTA.jsx` (new reusable client component)
   - `buildWhatsAppLink()` — generates `wa.me/{phone}?text=...` with product name, brand, slug ref
   - `<WhatsAppCTA>` — primary pill button for product detail hero (replaces static "Request Quote")
   - `<WhatsAppIconButton>` — compact pill for listing cards + KG recommendation cards (stopPropagation on click)
2. **Product detail page** (`/app/next-app/app/catalog/products/[slug]/page.jsx`)
   - Hero CTA now reads "Ask about {Product Name}" with pre-filled message
   - Must-buy and Bundle recommendation cards each get a WhatsApp pill
3. **Division listing page** (`/app/next-app/app/catalog/[divisionSlug]/page.jsx`) — every product card has a WhatsApp pill under the name
4. Pre-filled message format: `Hi Agile Ortho, I'd like a quote for *{Product Name}*. Brand: {Brand}. (ref: {slug}) Please share availability & bulk pricing.` — this keyword triggers the funnel engine to jump the user straight into that product/division
5. Next.js build verified: all 810 product pages + 13 division pages regenerated cleanly

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
