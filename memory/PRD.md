# Agile Ortho — Product Requirements Document

## Original Problem Statement
Build a B2B medical device platform for a premier medical device master franchise in Telangana, India. Rebranded as "Agile Ortho".

## Tech Stack
- **Frontend**: React, TailwindCSS, Shadcn UI, Manrope font
- **Backend**: FastAPI, Motor (Async MongoDB), Pydantic
- **AI**: Claude Sonnet 4.5 via emergentintegrations
- **Storage**: Emergent Object Storage
- **3rd Party**: Interakt WhatsApp API, Google Analytics 4

## Current State (as of 2026-03-26)
- **814 products**, **10 divisions**, **100% image coverage**
- **Complete homepage redesign** — trust-first, conversion-focused, 10-section layout
- **Automated CRM pipeline**: WhatsApp → Lead extraction → Scoring → Follow-ups
- **23 leads** (11 hot, 7 warm, 5 cold) with automated scoring

## Homepage Structure (10 Sections)
1. Utility bar (authorized distributor badge, contact)
2. Hero (buyer-focused, dark navy, static)
3. Trust metrics strip (SKUs, 10 divisions, 33 districts, 24/7 supply)
4. Who We Serve (5 cards: Hospitals, Clinics, Diagnostic Centers, OT Teams, Procurement)
5. Product Divisions (10 division cards with descriptions, counts, CTAs)
6. Why Agile Ortho (6 value props)
7. Featured Products (8 diverse products from different divisions)
8. How Ordering Works (4-step procurement process)
9. Compliance Band (MD-42, CDSCO, GST, authorized distributor)
10. Final CTA (Request Quote + WhatsApp + Call)

## Divisions (10)
Orthopedics (308), Endo-surgical (171), Diagnostics (105), Infection Prevention (85), Cardiovascular (66), ENT (45), Critical Care (23), Peripheral Intervention (6), Urology (3), Robotics (2)

## Key API Endpoints
- `GET /api/products/featured/homepage` — Diverse products for homepage showcase
- `GET /api/divisions` — Division list with counts
- `GET /api/products` — Product listing with pagination/filters
- `POST /api/webhook/whatsapp` — Interakt webhook
- `GET /api/admin/automation/stats` — CRM automation statistics
- `POST /api/admin/automation/trigger-followups` — Process due follow-ups

## Upcoming Tasks
- P1: SEO — react-helmet-async, JSON-LD structured data, meta tags
- P1: District landing pages for Telangana local SEO
- P2: Contact page with RFQ form
- P2: Admin automation dashboard (visual follow-up stats)

## Future/Backlog
- P3: WhatsApp interactive buttons (quick replies)
- P3: Product comparison feature
- P3: Campaign management (bulk WhatsApp sends)
- P4: MongoDB → PostgreSQL migration

## Admin Access
- URL: /admin/login
- Password: admin
