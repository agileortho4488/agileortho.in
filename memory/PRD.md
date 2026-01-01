# OrthoConnect - Product Requirements Document

## Overview
OrthoConnect is an ethical, patient-first orthopaedic healthcare platform for India. The platform provides:
- Patient education about orthopaedic conditions in simple language
- Surgeon discovery (search by location/specialty)
- Free professional profiles for surgeons

## Core Principles (Non-Negotiable)
- **No appointment booking** - Only show contact details
- **No paid listings** - All profiles are free
- **No doctor rankings** - Distance/alphabetical sorting only
- **No advertisements** - Clean, ad-free experience
- **No reviews/testimonials** - Can be gamed

## Design System (Implemented)
- **Style**: Modern health-tech (Option 2)
- **Color Palette**: Monochrome + Teal Accent (Option A)
  - Background: Pure white (#FFFFFF)
  - Primary Text: Rich black (#0A0A0A)
  - Secondary Text: Slate grey (#64748B)
  - Accent: Medical teal (#0D9488)
  - Borders: Light grey (#E2E8F0)
  - Alert/Urgent: Warm red (#DC2626)
- **Typography**: Inter font family
- **Components**: Shadcn/UI with Tailwind CSS

## Tech Stack
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT + Mocked OTP (for MVP)

## Key Features

### 1. Patient Education Hub
- Comprehensive library of orthopaedic topics (700+ topics)
- Categories: Trauma, Spine, Shoulder/Elbow, Knee/Sports, Pediatric, etc.
- Topic pages with: Key Takeaways, Accordion sections, Urgent Care sidebar
- Medical disclaimer on all pages

### 2. Surgeon Discovery
- Smart search (natural language queries)
- "Near me" button (geolocation)
- Radius filtering (5/10/25/50km)
- Popular searches chips
- Results with map view
- No ranking - distance/alphabetical only

### 3. Doctor Profiles
- Professional header with photo
- Qualifications & registration number
- Subspecialties badges
- Conditions treated & procedures
- Multiple clinic locations with accordions
- Contact card (phone, website, Google Maps)
- Platform disclaimer

### 4. Surgeon Onboarding
- Mobile + OTP verification (MOCKED for MVP)
- Multi-step profile creation
- Admin approval workflow
- Profile photo upload (admin-controlled visibility)

### 5. Admin Dashboard
- Review pending profiles
- Approve/Reject with notes
- Photo visibility control
- "Needs Clarification" status (planned)

## Pages Implemented
- `/` - Homepage with search, trust bar, sections
- `/education` - Education Hub (category cards)
- `/education/:category` - Category listing with search filter
- `/education/:category/:topic` - Topic page with accordions
- `/doctor/:slug` - Public doctor profile
- `/join` - Surgeon registration flow
- `/admin` - Admin login
- `/admin/dashboard` - Admin review interface
- `/about`, `/contact` - Info pages

## API Endpoints
- `GET /api/profiles/smart-search` - Natural language search
- `GET /api/profiles/by-slug/:slug` - Doctor profile
- `POST /api/auth/request-otp` - Send OTP (mocked)
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/surgeons` - Create surgeon profile
- `GET /api/admin/surgeons` - List surgeons for review
- `PUT /api/admin/surgeons/:id/status` - Approve/Reject
- `PUT /api/admin/surgeons/:id/photo-visibility` - Toggle photo

## Database Collections
- `users` - User accounts (mobile, is_admin, surgeon_profile_id)
- `surgeons` - Surgeon profiles with all details

## What's Implemented ✅
- [x] Complete UI overhaul (Phase 1)
- [x] Homepage redesign with 4 sections
- [x] Trust bar with ethical messaging
- [x] Popular searches chips
- [x] "Near me" geolocation button
- [x] Education Hub with accordion topic pages
- [x] Key Takeaways and Urgent Care cards
- [x] Premium Doctor Profile design
- [x] Mobile-responsive design
- [x] Dark footer with quick links
- [x] Smart search with natural language
- [x] Surgeon onboarding with OTP (mocked)
- [x] Admin review dashboard
- [x] Photo upload with visibility control

## Upcoming Tasks (P1)
- [ ] Search Intelligence enhancements (synonyms, Hindi/Telugu keywords)
- [ ] Auto-suggest while typing
- [ ] Surgeon dashboard improvements (structured tags, website field)
- [ ] Admin taxonomy management

## Future Tasks (P2)
- [ ] Trust signals (verification badges)
- [ ] "Needs Clarification" admin workflow
- [ ] City landing pages for SEO
- [ ] Multi-language support
- [ ] Analytics dashboards

## Parked/Blocked
- AI Chatbot - blocked due to library installation issues in environment

## Test Credentials
- Admin password: `admin`
- Test mobile: Any 10-digit number (OTP is mocked)

---
Last Updated: January 2026
