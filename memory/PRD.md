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

### Admin CRM Dashboard Upgrade + Marketing Integrations — Mar 29, 2026
- **Territory Tab**: Zone performance cards, district penetration table, zone filter buttons, zero-lead districts, cross-sell opportunities (division gaps), top departments by zone, visitor searches by zone
- **Meta Pixel + Google Ads**: Pixel script in index.html (placeholder ID), GA4 lead event tracking, Google Ads conversion stub, trackLeadConversion() fires on all lead form submissions
- **Interakt WhatsApp Nurture**: Automated nurture sequences (hot/warm/cold), follow-up scheduler with 60s polling, smart skip (customer active, human takeover), nurture stats visible in WhatsApp tab
- **Zoho Email Integration**: SMTP-based brochure email via Zoho (smtppro.zoho.in), admin endpoint to send brochure emails, public endpoint for auto-confirmation on lead capture

### Zone/Territory + IP Geolocation + Lead Intelligence — Mar 29, 2026
- IP Geolocation auto-detect via ip-api.com
- 4-Zone Hyderabad Mapping with 130+ localities
- Equal Department Scoring (ALL 13 divisions = 25pts)
- Lead Auto-Scoring (0-100), Auto-Routing to Agile Healthcare
- Visitor Event Tracking, Territory Penetration API, Zone Analytics API

### Framer Motion Animations — Mar 28, 2026
- Page transitions, scroll-triggered section animations, modal and dropdown animations

### Universal Lead Capture System — Mar 28, 2026
- LeadCaptureModal on ALL WhatsApp/enquiry touchpoints
- Captures: Name, Hospital, Department, Phone, Email, District

### UX Audit + Dark Premium Theme — Mar 28, 2026
- Agile Healthcare branding, WhatsApp dropdown, consolidated CTAs, 4-column footer

### Core Platform
- 810+ products, 13 divisions, AI chatbot, Admin CRM, analytics tabs, auto-seed

## Key API Endpoints
- `GET /api/geo/detect` — IP geolocation
- `POST /api/geo/track` — Visitor event tracking
- `GET /api/geo/zones` — Zone data with lead counts
- `GET /api/geo/zone-analytics` — Zone-level CRM analytics
- `GET /api/geo/territory-penetration` — District x Division penetration
- `GET /api/geo/visitor-insights` — Search/visit analytics
- `POST /api/admin/email/send-brochure` — Send brochure email (admin)
- `POST /api/email/lead-confirmation` — Auto-send lead confirmation (public)
- `GET /api/admin/automation/stats` — Nurture sequence statistics

## Pending Items
- **P0**: Replace Meta Pixel PIXEL_ID_PLACEHOLDER with actual Pixel ID
- **P0**: Replace Google Ads Conversion ID (AW-PLACEHOLDER/PLACEHOLDER) with actual ID
- **P1**: Manual review of blockers via Admin Review Dashboard
- **P2**: Consent management (opt-in/opt-out)
- **P2**: Archive legacy phase scripts
- **P2**: File 008 (corrupted DOCX) — BLOCKED (awaiting user file)

## Future/Backlog
- Hospital Account Intelligence (multi-department engagement tracking)
- Competitive intelligence (competitor product searches)
- Reorder prediction based on consumption patterns

## Known Constraints
- ip-api.com free tier: 45 requests/min (sufficient for B2B traffic)
- WhatsApp free-form replies only within 24h
- Meta Pixel console warning expected until real Pixel ID is configured
- Emergent LLM Key budget — avoid batch LLM scripts
