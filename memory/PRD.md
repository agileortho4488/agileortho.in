# Agile Healthcare — Product Requirements Document

## Original Problem Statement
Build a B2B medical device platform for Agile Healthcare, the Meril Life Sciences master franchise for ALL of Telangana, India. The platform provides a clinically grouped product catalog across ALL 13 Meril divisions, with AI Chatbot, WhatsApp integration, CRM/Lead scoring, zone-based territory analytics, and Admin Dashboard.

## Architecture
- **Frontend**: React (CRA) + Tailwind + Shadcn UI + Framer Motion
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB (catalog_products, catalog_skus, leads, visitor_events, zones, wa_conversations, chatbot_telemetry, learning_cache)
- **AI**: Claude Sonnet 4.5 via emergentintegrations
- **WhatsApp**: Interakt API
- **Email**: Zoho SMTP (smtppro.zoho.in)
- **Geolocation**: ip-api.com (free tier)
- **Tracking**: Meta Pixel + Google Analytics 4 (G-MXXC41JFLG)
- **Self-Learning**: Background engine analyzing conversations → enriching leads → FAQ cache for smarter chatbot

## Telangana Market Structure
### Hyderabad Metro (4 Zones — ALL Agile Healthcare)
- Zone 01 (Kukatpally): 365 accounts, 209 hospitals, 156 labs
- Zone 02 (Ameerpet/Hitech City): 413 accounts, 276 hospitals, 138 labs — PRIMARY
- Zone 03 (Central/Old City): 379 accounts, 226 hospitals, 153 labs
- Zone 04 (Dilsukhnagar/Secunderabad): 734 accounts, 430 hospitals, 304 labs
### 33 Districts — Full Telangana coverage
### 13 Meril Divisions (ALL Equal Priority)

## Admin Dashboard Tabs (6 total)
1. **CRM Leads** — Funnel, scores, sources, districts, recent leads with product interest tags, Product Demand Intelligence (trending + demand + associations)
2. **Territory** — All 4 zones with accounts/hospitals/labs, penetration %, marketing gaps, district table
3. **Hospitals** — Multi-department engagement depth, upsell opportunities
4. **Competitive Intel** — 24 tracked competitor brands, division threat map, Meril counter-products
5. **Search Intelligence** — Chatbot queries, confidence, no-match patterns
6. **WhatsApp** — Conversations, delivery, nurture automation stats

## What's Been Implemented

### Self-Learning Chatbot Engine — Mar 29, 2026
- Background engine (runs every 5 min) analyzes chatbot + WhatsApp conversations
- Extracts product interests using 45+ medical device keyword patterns
- Enriches leads with `product_insights` field (divisions_interested, products_mentioned)
- Builds FAQ cache from successful conversations (70% word overlap matching)
- Tracks product associations (what divisions are asked together)
- Surfaces trending divisions + lead product interest in existing CRM Leads tab
- **31 leads enriched** with intelligence; Trauma, ENT, Cardiology trending highest

### Hospital Account Intelligence & Competitive Intelligence — Mar 29, 2026
- Hospital multi-department engagement tracking, upsell scoring
- 24 competitor brands tracked (Stryker, Zimmer, DePuy, Medtronic, Abbott, etc.)
- Division threat map with Meril counter-products

### Admin CRM + Marketing Integrations — Mar 29, 2026
- Territory tab (all 4 zones), Meta Pixel + GA4, Interakt nurture, Zoho SMTP email

### Earlier Features
- IP Geolocation + 4-Zone mapping, Framer Motion, Universal Lead Capture
- 810+ products, 13 divisions, AI chatbot, Admin CRM, WhatsApp automation

## Key API Endpoints
- `GET /api/admin/analytics` — Now includes product_intelligence (trending, demand, associations)
- `GET /api/geo/zone-analytics` — All 4 zones with full metadata
- `GET /api/geo/hospital-intelligence` — Hospital account tracking
- `GET /api/geo/competitive-intelligence` — 24 competitor brands tracked
- `POST /api/chatbot/query` — Now checks FAQ cache first

## Pending Items
- **P0**: Replace Meta Pixel PIXEL_ID_PLACEHOLDER with actual Pixel ID
- **P0**: Replace Google Ads Conversion ID placeholder with actual ID
- **P1**: Manual review of blockers via Admin Review Dashboard
- **P2**: Consent management, archive legacy scripts, File 008 (BLOCKED)

## Future/Backlog
- Reorder prediction based on consumption patterns
