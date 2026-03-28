# Agile Ortho — Product Requirements Document

## Original Problem Statement
Build a B2B medical device platform for Agile Ortho, a premier Meril Life Sciences master franchise in Telangana, India. The platform provides a standardized, clinically grouped product catalog mapped to exact manufacturer SKUs, with an AI Chatbot (web + WhatsApp via Interakt), and a secure Admin Dashboard.

## Architecture
- **Frontend**: React (CRA) + Tailwind + Shadcn UI
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB (`catalog_products`, `catalog_skus`, `wa_conversations`, `chatbot_telemetry`, `leads`)
- **AI**: Claude Sonnet 4.5 via `emergentintegrations` (Emergent LLM Key)
- **WhatsApp**: Interakt API (webhook + outbound messaging)
- **Design**: Dark Premium theme — Outfit font, gold (#D4AF37) + teal (#2DD4BF) accents on obsidian (#0A0A0A)

## What's Been Implemented

### Dark Premium Theme (Full Redesign)
- **Global CSS**: Dark background (#0A0A0A), card surface (#141414), white/55+ text contrast
- **Navigation**: Glassmorphism dark header with gold WhatsApp CTA
- **Homepage**: Hero with medical device imagery, gold "Devices" text, search bar, division bento grid, featured products, stats, CTA
- **Catalog**: Dark division cards with teal product counts, gold accent labels
- **Product Detail**: Dark specs tables, gold brand badges, teal material tags
- **Chat Widget**: Dark theme with gold send button, "Agile Ortho AI" header
- **Footer**: Gold section headers, "AGILE ORTHO" watermark, compliance badges
- **All public pages**: About, Contact, Districts, Chat — all dark themed

### Core Platform
- Responsive homepage with 13 medical divisions, featured products, district coverage
- Full catalog browsing: `/catalog` → `/catalog/{division-slug}` → `/catalog/products/{slug}`
- Global product search across 810 production-eligible products
- SEO-optimized product detail pages with specifications, SKU codes, brochure links

### AI Chatbot (Web + WhatsApp)
- Web chatbot widget with product search, SKU lookup, brand queries
- Greeting detection for casual messages (hi, hello, hey, etc.)
- WhatsApp webhook via Interakt — full conversation pipeline
- Human takeover mode, auto lead creation, delivery tracking

### Admin Dashboard
- Product management (1202 catalog products across 14 canonical divisions)
- Lead CRM with scoring and follow-up automation
- WhatsApp conversation management
- Enhanced Analytics (3 tabs): CRM Leads | Search Intelligence | WhatsApp
- 4-Lane Auto-Promotion pipeline, Review dashboard for 65 true blockers

### Data Pipeline & Auto-Seed
- Auto-seed on fresh deployments (catalog_products, catalog_skus, division maps, leads)
- 810 production-eligible products with canonical naming
- Full system cutover: all public APIs use `catalog_products_col`

### Staff Contact Numbers (Configured in AI Bots)
- Dispatch & Delivery: 7416818183
- Orthopedics & Spine: 7416162350
- General Queries: 7416216262
- Consumables: 7416416871
- Billing & Finance: 7416416093
- WhatsApp Sales: 7416521222

## Deployment Configuration
- **Interakt API Key**: Configured in backend/.env
- **Webhook Secret**: `1dc24700-25aa-4262-be11-1e64a38be99f`
- **Production Webhook URL**: `https://www.agileortho.in/api/webhook/whatsapp`
- **WhatsApp Business Number**: +917416521222
- **Rate Limit**: 600 requests/minute on Interakt API

## Pending Items
- **P0**: Manual review of 65 true blockers (conflicts, weak evidence) via Admin Review Dashboard
- **P2**: Archive legacy phase scripts to `scripts/archive/`
- **P3**: File 008 (corrupted DOCX) — blocked, awaiting uncorrupted file

## Known Constraints
- Emergent LLM Key budget exhausted — avoid batch LLM scripts
- WhatsApp free-form replies only within 24h of customer's last message
