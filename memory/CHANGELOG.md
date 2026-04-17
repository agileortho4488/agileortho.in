# MedDevice Pro — Changelog

## February 2026

### Enhanced WhatsApp Integration (COMPLETE - Feb 2026)
- **Template Message API:** Admin can send pre-approved WhatsApp templates from the admin panel (with phone selector, template name, language, body variables)
- **User Track API:** CRM leads auto-synced to Interakt with traits (name, email, hospital, district) and tags (score, source)
- **Event Track API:** Business events tracked in Interakt (Lead Created, WhatsApp Conversation Started)
- **Message Status Tracking:** Webhook now handles Sent/Delivered/Read/Failed status events, stored in wa_message_status collection
- **WhatsApp Analytics Dashboard:** New admin tab with conversation stats (total, AI active, human takeover, total messages) and delivery metrics (queued, sent, delivered, read, failed, template count, delivery rate, read rate)
- **Contact Sync:** New admin tab for bulk syncing all CRM leads to Interakt
- **Auto-sync on Lead Creation:** Website contact form leads automatically synced to Interakt with traits and tags
- **Admin UI Tabs:** WhatsApp admin page now has 4 tabs: Inbox, Templates, Analytics, Contact Sync
- **Testing:** 100% pass rate (19 backend + all frontend tests)

### Product Detail Page Redesign (COMPLETE)
- **Research:** Analyzed Agile Ortho reference page + B2B medical device best practices
- **Hero Section:** Side-by-side layout with sticky product image (left) and rich info panel (right)
- **Social Share:** WhatsApp, LinkedIn, Email, Copy Link buttons
- **Product Tags:** Clickable chips (division, category, material) below product image
- **Key Features:** Technical specs as bullet points with checkmarks + quick attribute chips
- **CTAs:** Request Bulk Quote (modal overlay), WhatsApp Enquiry, Call Sales Team, Request Datasheet
- **Trust Badges:** ISO 13485, CE Mark, CDSCO Approved, Authorized Distributor with sub-labels
- **Quote Modal:** Dark header with product name, full form with validation, lead creation via API
- **Tabbed Content:** Overview (description, features, applications, details grid) | Specifications (formal table with dark header + zebra stripes) | Sizes & Variants
- **Help Banner:** Dark navy CTA with Call Now + Contact Specialist
- **Related Products:** "You May Also Like" — up to 4 products from same division
- **Testing:** 100% pass rate (11 backend + 27 frontend tests)

### Real Brochure Import with Claude Vision (COMPLETE - Feb 2026)
- **Problem:** 4 of 5 real Meril brochures were image-based PDFs — `pdfplumber` couldn't extract text
- **Solution:** Added OCR fallback (`pytesseract` + `pdf2image`) and Claude Vision extraction pipeline
  - Converts PDF pages to images → sends to Claude's vision model → extracts structured product data
  - Retry logic with exponential backoff for API resilience
  - Processing in batches of 3 pages to stay within API limits
- **Reprocess endpoint:** Added `/api/admin/imports/{id}/reprocess` for retrying failed imports
- **Reprocess button:** Added to AdminImports UI for failed imports
- **Results from 5 real Meril brochures:**
  - LBL Plate Chart: 19 products extracted (vision)
  - Armar Titanium Catalogue: 10 products (vision)
  - Ti Elbow/Clavicle/Calcaneal: 11 products (vision)
  - Variabilis Multi-angle Plates: 4 products (text)
  - Trauma PLATE Brochure: Failed (transient Claude API gateway error — can retry)
- **Total:** 44 new products published, catalog now has **93 products**
- **Extraction quality:** Full descriptions, technical specs, materials, size variants (up to 24 sizes) all correctly extracted

### Phase 4: RAG AI Chatbot (COMPLETE - Feb 2026)
- **AI Engine:** Claude Sonnet via emergentintegrations with RAG pipeline
- **Product Search:** MongoDB text index + keyword regex fallback on 93 products
- **Knowledge Base:** All 93 Meril products (name, specs, material, sizes, categories)
- **Chatbot Identity:** Agile Ortho AI Sales Assistant — product expert + lead capture + WhatsApp routing
- **System Prompt:** Consultative B2B sales personality, addresses users as "Doctor", never discloses pricing
- **Floating Widget:** Green chat bubble on all pages (bottom-right), opens 380px chat panel
- **Dedicated /chat Page:** Full-screen chat with WhatsApp/Call buttons
- **Session Management:** sessionStorage-based session IDs, shared between widget and /chat page
- **Conversation History:** Stored in MongoDB, last 10 messages used as context
- **Lead Capture:** Detects buying signals, captures name/hospital/phone via in-chat form
- **Quick Suggestions:** 5 pre-built questions for first-time users
- **Testing:** 100% pass rate (12 backend + 20 frontend tests)
- **Removed:** "Made with Emergent" badge from all pages

### Full Rebrand: MedDevice Pro → Agile Ortho (COMPLETE - Feb 2026)
- **Branding:** All references updated to Agile Ortho / AGILE ORTHOPEDICS PRIVATE LIMITED
- **Logo:** Real Agile Ortho logo files (black, white, monogram variants) placed in /public
- **Header:** Agile Ortho logo + nav (Products, About, Contact, AI Assistant, Shop) + WhatsApp button
- **Footer:** Full company info — phone +917416216262, WhatsApp +917416521222, email info@agileortho.in, address (Hayathnagar, Hyderabad), GST 36AATCA5653R1ZO
- **Homepage:** "Mobility Revolutionised" hero, real stats (93+ devices, 8 divisions, 33 districts, 180+ countries)
- **Contact:** Real address, phone, email
- **SEO:** Updated page title, meta description, keywords, favicon, OG tags
- **Admin:** Agile Ortho monogram in sidebar
- **Cleanup:** Removed old Header.jsx/Footer.jsx, "Made with Emergent" badge, all placeholder phone numbers
- **Testing:** 100% pass (18 branding requirements verified)

### Phase 5: Interakt WhatsApp Integration (COMPLETE - Feb 2026)
- **Interakt API:** Configured with API key for sending/receiving WhatsApp messages
- **WhatsApp Business Number:** +917416521222
- **Webhook:** POST /api/webhook/whatsapp receives incoming customer messages from Interakt
- **AI Auto-Reply:** Incoming WhatsApp messages processed through same Claude RAG pipeline — finds relevant products, generates consultative response, sends reply via Interakt
- **Human Takeover:** Admin can switch any conversation to "human mode" — disables AI auto-replies, admin replies manually
- **Auto-Lead Creation:** First WhatsApp message from a new number auto-creates a lead (source: whatsapp, score: warm)
- **Unified Inbox:** Admin CRM page at /admin/whatsapp with:
  - Conversation list (name, phone, last message preview, AI BOT/Human badge, unread count)
  - Full chat view with message bubbles (customer=white, bot=green, admin=dark)
  - Take Over / Switch to AI toggle buttons
  - Manual reply input with send via Interakt API
  - Auto-refresh every 10 seconds
- **Webhook URL to configure in Interakt:** https://strange-easley-2.preview.emergentagent.com/api/webhook/whatsapp
- **Testing:** 100% pass rate (14 backend + 12 frontend tests)

## December 2025

### Phase 1: Foundation & Portfolio (COMPLETE)
- **Clean Slate:** Deprecated entire OrthoConnect codebase, started fresh
- **Backend:** Built FastAPI server with Products CRUD, Leads API, Admin JWT auth, Dashboard stats
- **Database:** MongoDB with 45 Meril products seeded across 8 divisions
- **Lead Scoring:** Auto-scoring engine (Hot/Warm/Cold) based on inquiry type, hospital, contact info
- **Frontend:** Full React 19 app with Tailwind CSS + Shadcn UI
  - Homepage with hero, stats bar, 8 division cards, featured products, CTAs
  - Product listing with grid/list view, division filter sidebar, search, pagination
  - Product detail with specs table, quote form, WhatsApp enquiry button
  - About page with Meril company info
  - Contact page with lead capture form (all 33 Telangana districts)
  - Admin login, dashboard, leads CRM, products management
- **Navigation:** Hierarchical mega-menu with 8 divisions and sub-categories
- **Footer:** MD-42 License, GST number, ISO 13485 certification
- **Design:** Clinical medical palette (Chivo headings, Manrope body, surgical green + navy)
- **Testing:** 100% pass rate — 26 backend + 15 frontend tests
