# Agile Healthcare — Product Requirements Document

## Original Problem Statement
Build a B2B medical device platform for Agile Healthcare, the Meril Life Sciences master franchise for ALL of Telangana, India. The platform provides a clinically grouped product catalog across ALL 13 Meril divisions, with AI Chatbot, WhatsApp integration, CRM/Lead scoring, zone-based territory analytics, and Admin Dashboard.

## Architecture
- **Frontend**: React (CRA) + Tailwind + Shadcn UI + Framer Motion
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB (catalog_products, catalog_skus, leads, visitor_events, zones, wa_conversations, chatbot_telemetry)
- **AI**: Claude Sonnet 4.5 via emergentintegrations
- **WhatsApp**: Interakt API
- **Email**: Zoho SMTP (smtppro.zoho.in)
- **Geolocation**: ip-api.com (free tier)
- **Tracking**: Meta Pixel + Google Analytics 4 (G-MXXC41JFLG)
- **Design**: Dark Premium — Outfit font, gold (#D4AF37) + teal (#2DD4BF) on obsidian (#0A0A0A)

## Telangana Market Structure
### Hyderabad Metro (4 Zones — ALL Agile Healthcare)
- Zone 01 (Kukatpally): 365 accounts, 209 hospitals, 156 labs
- Zone 02 (Ameerpet/Hitech City): 413 accounts, 276 hospitals, 138 labs — PRIMARY
- Zone 03 (Central/Old City): 379 accounts, 226 hospitals, 153 labs
- Zone 04 (Dilsukhnagar/Secunderabad): 734 accounts, 430 hospitals, 304 labs
- **Total Metro: 1,891 accounts**
### 33 Districts — Full Telangana coverage

### 13 Meril Divisions (ALL Equal Priority)
Trauma, Joints/Arthroplasty, Spine, Cardiology, Endosurgery, Endo, ENT, Diagnostics, Vascular, Consumables, Sports Medicine, Dental, Orthobiologics

## What's Been Implemented

### Hospital Account Intelligence & Competitive Intelligence — Mar 29, 2026
- **Hospital Account Intel**: Multi-department engagement tracking per hospital. Shows engagement depth (deep/moderate/single), upsell opportunities with missing Meril divisions, department count per hospital. API: `GET /api/geo/hospital-intelligence`
- **Competitive Intelligence**: Tracks 24 competitor brands (Zimmer Biomet, Stryker, DePuy Synthes, Medtronic, Abbott, Boston Scientific, Smith & Nephew, Arthrex, NuVasive, Globus Medical, Edwards Lifesciences, Karl Storz, Olympus, Ethicon, B. Braun, Cook Medical, Siemens, GE Healthcare, Philips, Straumann, Nobel Biocare, Osstem, Integra). Auto-detects mentions in chatbot queries & website searches. Shows division threat map with Meril counter-products. API: `GET /api/geo/competitive-intelligence`
- **Territory Tab Fixed**: All 4 zones ALWAYS visible with accounts/hospitals/labs, penetration %, missing divisions per zone. Red alerts for zero-lead zones.

### Admin CRM Dashboard Upgrade + Marketing Integrations — Mar 29, 2026
- **Territory Tab**: Zone performance cards, district penetration table, zone filter buttons, zero-lead districts, cross-sell opportunities
- **Meta Pixel + Google Ads**: Pixel script in index.html (placeholder ID), GA4 lead event tracking, Google Ads conversion stub
- **Interakt WhatsApp Nurture**: Automated nurture sequences (hot/warm/cold), follow-up scheduler, nurture stats in WhatsApp tab
- **Zoho Email Integration**: SMTP-based brochure email via Zoho

### Zone/Territory + IP Geolocation + Lead Intelligence — Mar 29, 2026
- IP Geolocation, 4-Zone Hyderabad Mapping, Equal Department Scoring, Lead Auto-Scoring, Visitor Event Tracking

### Earlier Features
- Framer Motion Animations, Universal Lead Capture, UX Audit + Dark Premium Theme
- Core Platform: 810+ products, 13 divisions, AI chatbot, Admin CRM, auto-seed

## Key API Endpoints
- `GET /api/geo/zone-analytics` — All 4 zones with accounts, hospitals, penetration %, missing divisions
- `GET /api/geo/hospital-intelligence` — Hospital multi-department tracking, upsell opportunities
- `GET /api/geo/competitive-intelligence` — 24 competitor brands tracked, division threats, Meril counters
- `GET /api/geo/territory-penetration` — District x Division penetration
- `GET /api/geo/visitor-insights` — Search/visit analytics by zone
- `POST /api/admin/email/send-brochure` — Send brochure email (admin)
- `POST /api/email/lead-confirmation` — Auto-send lead confirmation (public)

## Admin Dashboard Tabs (6 total)
1. **CRM Leads** — Funnel, scores, sources, districts, recent leads
2. **Territory** — All 4 zones, penetration %, marketing gaps, district table
3. **Hospitals** — Multi-department engagement, upsell opportunities, depth scoring
4. **Competitive Intel** — 24 tracked brands, division threats, Meril alternatives
5. **Search Intelligence** — Chatbot queries, confidence, no-match patterns
6. **WhatsApp** — Conversations, delivery, nurture automation stats

## Pending Items
- **P0**: Replace Meta Pixel PIXEL_ID_PLACEHOLDER with actual Pixel ID
- **P0**: Replace Google Ads Conversion ID placeholder with actual ID
- **P1**: Manual review of blockers via Admin Review Dashboard
- **P2**: Consent management (opt-in/opt-out)
- **P2**: Archive legacy phase scripts
- **P2**: File 008 (corrupted DOCX) — BLOCKED (awaiting user file)

## Future/Backlog
- Reorder prediction based on consumption patterns

## Known Constraints
- ip-api.com free tier: 45 requests/min
- Meta Pixel console warning expected until real Pixel ID configured
- Competitive Intel shows 0 mentions until real doctors search for competitor brands
