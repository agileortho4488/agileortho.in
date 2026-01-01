# OrthoConnect - Product Requirements Document

## Overview
OrthoConnect is a fully-featured, ethical, patient-first orthopaedic healthcare platform for India. It provides:
- Research-backed patient education about 700+ orthopaedic conditions
- Intelligent surgeon discovery with Hindi/Telugu support
- Free professional profiles for surgeons
- Trust badges and verification system

## Core Principles (Non-Negotiable)
- **No appointment booking** - Only show contact details
- **No paid listings** - All profiles are free
- **No doctor rankings** - Distance/alphabetical sorting only
- **No advertisements** - Clean, ad-free experience
- **No reviews/testimonials** - Can be gamed

## Design System
- **Style**: Modern health-tech with animations and glow effects
- **Colors**: Softer gradients (400 shade) - teal, sky, indigo, pink, amber, cyan
- **Typography**: Inter font family
- **Components**: Shadcn/UI + Framer Motion animations
- **Effects**: Floating orbs, glow on hover, scroll animations

## Key Features

### 1. Intelligent Search System ✅
- Auto-suggest dropdown with categories
- Hindi/Telugu keyword support (घुटने का दर्द, कमर दर्द, మోకాలు నొప్పి)
- Synonym matching (knee = ghutna = mokalu, mumbai = bombay)
- Recent searches saved locally
- Near me geolocation button
- Radius controls (5/10/25/50 km)

### 2. Research-Backed Education Content ✅
**13 conditions with full medical content:**
- ACL Tear, Meniscal Tears, Knee Osteoarthritis
- Lumbar Disc Herniation, Sciatica, Spinal Stenosis
- Rotator Cuff Tear, Frozen Shoulder
- Hip Osteoarthritis
- Carpal Tunnel Syndrome, Trigger Finger
- Clubfoot, Scoliosis

**Content structure:**
- Key Takeaways, Symptoms, Causes, Risk Factors
- Treatment (Non-Surgical + Surgical)
- Recovery & Rehabilitation, Prevention
- References to AAOS, NHS, Mayo Clinic

### 3. Trust Badges on Profiles ✅
- Admin Verified (blue)
- Registration Submitted (amber)
- Photo Verified (violet)

### 4. Premium UI/UX ✅
- Animated backgrounds with floating orbs
- Softer color gradients (400 shade)
- Scroll animations
- Dark gradient headers
- Glassmorphism elements

### 5. Full Platform ✅
- Homepage with search and 4 content sections
- Education Hub with 11 categories
- Topic pages with accordions
- Doctor profiles with trust badges, WhatsApp, Call, Website buttons
- Surgeon registration with OTP and website field
- Admin dashboard

### 6. Contact Features ✅ (NEW)
- **WhatsApp Button** on doctor profile - Opens WhatsApp with pre-filled message to surgeon's number
- **Call Clinic Button** - Direct tel: link to clinic phone
- **Visit Website Button** - Links to surgeon's personal/clinic website

## Subspecialties (Expanded)
- Shoulder, Elbow, Hand, Hip, Knee
- Spine, Sports Medicine, Trauma
- Oncology, Paediatrics

## Pages
- `/` - Homepage with smart search
- `/about` - About OrthoConnect & AgileOrtho ✅
- `/contact` - Contact page with form & details ✅
- `/education` - Education Hub
- `/education/:category` - Category listing
- `/education/:category/:topic` - Topic page
- `/doctor/:slug` - Doctor profile with WhatsApp/Call/Website buttons
- `/join` - Surgeon registration with website field
- `/admin` - Admin login
- `/admin/dashboard` - Admin review

## External Links
- Shop: https://www.agileortho.shop (opens in new tab)
- AgileOrtho: https://www.agileortho.in

## Test Credentials
- Admin: password `admin`
- Mobile: Any 10-digit number (OTP mocked)
- Test Surgeon: slug `dr-test-playwright-knee-mumbai-7ab3`

## Testing Status
✅ All backend tests passing (100% - 15/15)
✅ All frontend tests passing (100%)
✅ UI components verified
✅ Mobile responsive
✅ Search with Hindi/Telugu support working
✅ WhatsApp/Call/Website buttons verified

## Completed This Session (Jan 2026)
- ✅ WhatsApp button on doctor profile page
- ✅ Website field for surgeon registration
- ✅ Expanded subspecialties (Spine, Sports Medicine, Trauma)
- ✅ Enhanced search synonyms (Hindi, Telugu, city aliases)
- ✅ About page integration verified
- ✅ Contact page integration verified
- ✅ Header navigation links working
- ✅ Shop link opens in new tab
- ✅ Full testing with 15 backend tests + frontend UI tests

## Future/Backlog (P2)
- Trust badge system improvements
- Admin workflow upgrade ("Needs Clarification" status)
- SEO-focused city landing pages
- Surgeon profile editing post-approval
- AI Chatbot integration (blocked - library installation issue)

---
Last Updated: January 2026
