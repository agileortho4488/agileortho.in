# Agile Healthcare — Product Requirements Document

## Original Problem Statement
Build a B2B medical device platform for Agile Healthcare (formerly Agile Ortho), a premier Meril Life Sciences master franchise in Telangana, India. The platform provides a standardized, clinically grouped product catalog with AI Chatbot, WhatsApp integration, and Admin Dashboard.

## Architecture
- **Frontend**: React (CRA) + Tailwind + Shadcn UI + Framer Motion
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB (`catalog_products`, `catalog_skus`, `wa_conversations`, `chatbot_telemetry`, `leads`)
- **AI**: Claude Sonnet 4.5 via `emergentintegrations`
- **WhatsApp**: Interakt API
- **Design**: Dark Premium theme — Outfit font, gold (#D4AF37) + teal (#2DD4BF) on obsidian (#0A0A0A)

## What's Been Implemented

### Framer Motion Animations — Mar 28, 2026
- **Page Transitions**: AnimatePresence in Layout.jsx for smooth fade/slide between routes
- **Scroll-Triggered Animations**: FadeUp, StaggerContainer, StaggerItem on homepage sections (divisions, featured products)
- **Hero Staggered Reveal**: Overline, title, subtitle, search, CTAs animate in sequence with easeOut timing
- **Stats Cards**: Individual staggered entrance with scale + fade
- **CTA Section**: ScaleIn animation on scroll
- **Dropdown Animations**: dropdownVariants for WhatsApp menu open/close
- **Modal Animations**: modalOverlayVariants + modalContentVariants for LeadCaptureModal
- **Motion Library**: `/app/frontend/src/lib/motion.jsx` — reusable animation components

### Universal Lead Capture System — Mar 28, 2026
- LeadCaptureModal intercepts all WhatsApp/enquiry actions
- Captures: Name, Hospital, Department, Phone, Email, District
- Integrated: Header dropdown, Hero CTA, CTA section, Product detail, Mobile bar
- Backend `department` field in LeadCreate model, sent to Interakt traits

### UX Audit Implementations — Mar 28, 2026
- Logo: Agile Healthcare branding with new icon + text
- WhatsApp dropdown: 3 options (Sales, Catalog PDF, Support)
- Hero: Better search placeholder, consolidated CTAs
- Product cards: Centered, 2-line truncation, material/brand tags
- Footer: 4-column layout (Brand, Navigation, Locations, Compliance)
- Contact page: Gold focus styling, dark theme consistency

### Deployment Fix — Mar 28, 2026
- Removed 2.5GB of large binaries from git history (uploads, brochures, brochure_intelligence)
- Git repo reduced from 4.4GB to 8.6MB
- .gitignore updated to prevent re-tracking

### Core Platform (Previous Sessions)
- 810+ products across 13 clinical divisions
- AI Chatbot (web + WhatsApp), Admin Dashboard with CRM
- 3-Tab Analytics, Auto-seed on deployment

## Pending Items
- **P0**: Manual review of 65 true blockers via Admin Review Dashboard
- **P2**: Archive legacy phase scripts to `scripts/archive/`
- **P3**: File 008 (corrupted DOCX) — blocked

## Known Constraints
- Emergent LLM Key budget — avoid batch LLM scripts
- WhatsApp free-form replies only within 24h of customer's last message
