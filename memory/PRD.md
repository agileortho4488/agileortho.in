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

### Universal Lead Capture System — Mar 28, 2026
- **LeadCaptureModal**: Reusable component that intercepts all WhatsApp/enquiry actions to capture: Name, Hospital/Clinic, Department, WhatsApp Number, Email, District before redirecting to WhatsApp with pre-populated messages
- **Integrated across all touchpoints**: Header WhatsApp dropdown (Sales, Catalog, Support), Hero CTA "Check Availability & Pricing", Homepage CTA "Get Product Catalog" / "Talk to Sales", Product detail "WhatsApp Enquiry", Mobile action bar
- **Backend department field**: Added `department` to LeadCreate model, sent to Interakt traits for retargeting
- **13 department options**: Orthopedics, Cardiology, General Surgery, Neurosurgery, Urology, ENT, Spine Surgery, Sports Medicine, Diagnostics/Pathology, Hospital Administration, Procurement/Purchase, Biomedical Engineering, Other

### UX Audit Fixes — Mar 28, 2026
- **Logo enlarged**: h-10/h-12 (48px) for proper brand visibility
- **Dropdown hover fix**: Eliminated gap between trigger and dropdown panel (pt-1 instead of mt-2) so menu stays stable when hovering to items
- **WhatsApp Header Dropdown**: 3 options (Sales, Catalog PDF, Technical Support) — all go through lead capture
- **Hero CTA Consolidation**: "Browse Catalog" (primary) + "Check Availability & Pricing" (lead capture)
- **Search Placeholder**: "Search by name or SKU (e.g., KET 2.4mm Locking Plate)"
- **Category Grid**: Increased gap-4/gap-6 for breathing room
- **Product Cards**: Centered text, 2-line truncated descriptions, teal material + gold brand tags
- **CTA Section**: "Equip Your Hospital with Precision Meril Products" headline, "Get Product Catalog" + "Talk to Sales" buttons
- **Footer 4-Column**: Brand (with consolidated address), Navigation, Locations ("All 33 Districts" no arrow), Compliance
- **Product Detail**: Teal circular checkmark icons for specs, dark form inputs, pre-populated WhatsApp messages
- **Contact Page**: Updated headline, gold focus styling on all inputs
- **Micro-interactions**: Button press effects, smooth focus transitions, scrollbar-hide, link-underline animation

### Dark Premium Theme (Full Redesign)
- Global CSS: Dark background (#0A0A0A), card surface (#141414), white/55+ text contrast
- Navigation: Glassmorphism header with gold WhatsApp dropdown
- All public pages: About, Contact, Districts, Chat — dark themed with gold focus

### Core Platform
- 810+ production-eligible products across 13 clinical divisions
- Full catalog browsing, global search, SEO-optimized product detail pages
- AI Chatbot (web + WhatsApp via Interakt), greeting detection
- Admin Dashboard with Product Management, Lead CRM, WhatsApp Management
- 3-Tab Analytics: CRM Leads | Search Intelligence | WhatsApp Metrics
- Auto-seed on fresh deployments

### Staff Contact Numbers
- Dispatch: 7416818183 | Ortho/Spine: 7416162350 | General: 7416216262
- Consumables: 7416416871 | Billing: 7416416093 | WhatsApp Sales: 7416521222

## Deployment Configuration
- Interakt API Key: in backend/.env
- Webhook Secret: `1dc24700-25aa-4262-be11-1e64a38be99f`
- Production Webhook: `https://www.agileortho.in/api/webhook/whatsapp`
- WhatsApp Business: +917416521222

## Pending Items
- **P0**: Manual review of 65 true blockers via Admin Review Dashboard
- **P2**: Archive legacy phase scripts to `scripts/archive/`
- **P3**: File 008 (corrupted DOCX) — blocked, awaiting uncorrupted file

## Known Constraints
- Emergent LLM Key budget — avoid batch LLM scripts
- WhatsApp free-form replies only within 24h of customer's last message
