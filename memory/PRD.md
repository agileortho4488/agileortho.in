# Agile Ortho — Product Requirements Document

## Original Problem Statement
Build a B2B medical device platform for a premier medical device master franchise in Telangana, India. Rebranded as "Agile Ortho".

## Tech Stack
- **Frontend**: React, TailwindCSS, Shadcn UI, Manrope font, react-helmet-async
- **Backend**: FastAPI, Motor (Async MongoDB), Pydantic
- **AI**: Claude Sonnet 4.5 via emergentintegrations
- **Storage**: Emergent Object Storage
- **3rd Party**: Interakt WhatsApp API, Google Analytics 4

## Current State (as of 2026-03-26)
- **814 products**, **10 divisions**, **100% image coverage**
- **Product data now bundled** as `product_data.json` (1.3MB) + `lead_data.json` (13KB) for auto-seeding on deploy
- **Complete homepage redesign** — trust-first, conversion-focused, 10-section layout
- **Product pages redesigned** — Premium B2B aesthetic (dark navy + teal)
- **SEO fully implemented** — react-helmet-async, JSON-LD structured data, 33 district landing pages
- **Automated CRM pipeline**: WhatsApp → Lead extraction → Scoring → Follow-ups

## Database Seeding
- `seed.py` loads from `product_data.json` and `lead_data.json` on startup
- Uses SKU-based upsert to avoid duplicates
- Auto-seeds when product count < file count

## SEO Implementation
- Dynamic meta tags on all pages (title, description, og:tags, canonical)
- JSON-LD: Organization, MedicalBusiness, Product, BreadcrumbList, ItemList
- 33 Telangana district landing pages (`/districts/:slug`)

## Key API Endpoints
- `GET /api/products/featured/homepage`
- `GET /api/divisions`
- `GET /api/products` (pagination + filters)
- `GET /api/products/:id`
- `POST /api/leads`
- `POST /api/webhook/whatsapp`
- `GET /api/admin/automation/stats`

## Upcoming Tasks
- P2: WhatsApp Interactive Elements — Quick reply buttons, campaign management
- P2: Facebook Developer Account Integration — CAPI and Lead Ads

## Future/Backlog
- P3: Product comparison feature
- P4: MongoDB → PostgreSQL migration

## Admin Access
- URL: /admin/login
- Password: admin
