# OrthoConnect - Product Requirements Document

## Overview
OrthoConnect is an ethical, patient-first orthopaedic healthcare platform for India — **An initiative of AgileOrtho**.

## Core Principles
- **No appointment booking** - Only show contact details
- **No paid listings** - All profiles are free
- **No doctor rankings** - Distance/alphabetical sorting only
- **No advertisements** - Clean, ad-free experience

## Branding
- **Logo**: Teal "A" gradient + "OrthoConnect"
- **Tagline**: "An initiative of AgileOrtho"
- **Favicon**: Teal "A" SVG icon
- **Theme Color**: #0d9488 (teal)

## Features Implemented

### ✅ Core Platform
- Homepage with smart search (Hindi/Telugu support)
- Patient Education Hub (13+ conditions)
- Doctor Profile pages with trust badges
- Surgeon registration portal
- Admin dashboard

### ✅ Authentication
- Real OTP via 2Factor.in
- Resend OTP with 30s countdown
- Change number option
- JWT token auth

### ✅ SEO & Marketing
- **12 City Landing Pages**: /orthopaedic-surgeons-{city}
- **Social Meta Tags**: og:title, og:description, twitter:card
- **Schema.org Markup**: Physician, MedicalBusiness
- **Google Analytics**: G-MXXC41JFLG
- **robots.txt** and **sitemap.xml**

### ✅ User Experience
- **404 Page**: Animated design with quick links
- **Success Toasts**: Profile submission confirmation
- **Status Banners**: Color-coded (approved/pending/rejected/needs_clarification)
- **Page Transitions**: Smooth Framer Motion animations

### ✅ Trust & Verification
- **5 Trust Badges** on doctor profiles:
  1. Admin Verified (blue)
  2. Registration Submitted (amber)
  3. Photo Verified (violet)
  4. Location Verified (cyan)
  5. Profile Complete (teal)

### ✅ Admin Features
- **4 Status Tabs**: Pending, Needs Info, Approved, Rejected
- **Needs Clarification Status**: Request more info from surgeons
- Photo visibility control
- Document download
- **Analytics Dashboard**: `/admin/analytics`
  - Platform statistics (total, approved, pending, etc.)
  - City distribution chart
  - Subspecialty distribution chart
  - Recent signups (30 days)
  - Total profile views
- **CSV Export**: Download all surgeon data as CSV

### ✅ Surgeon Features
- Max 2 subspecialties limit
- Website field for personal/clinic URL
- Profile editing (even after approval)
- WhatsApp contact button on profile
- **Referral System**:
  - Generate unique referral code
  - Share via WhatsApp or Email
  - Track referral count

### ✅ Events & Blog (January 2026)
- **Events Page** (`/events`):
  - Admin-managed CRUD
  - Filter by type (Conference, CME, Workshop, Webinar)
  - Event registration URLs
- **Blog Page** (`/blog`):
  - Admin-managed articles
  - Filter by category (Patient Education, Industry News, Research, Health Tips)
  - Individual article pages with view tracking

### ✅ Profile Analytics
- Profile view tracking on each doctor visit
- View count displayed in admin analytics
- Stored in `profile_views` collection

### ✅ Email Notifications (January 2026)
- **Zoho Mail SMTP Integration**
- Email sent when admin changes surgeon status:
  - Approved: Congratulations email
  - Rejected: Update required email
  - Needs Clarification: Action required email

### ✅ PWA Support (January 2026)
- `manifest.json` with OrthoConnect branding
- Service worker with offline caching
- Installable on mobile devices

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with search |
| `/about` | About OrthoConnect |
| `/contact` | Contact page |
| `/education` | Education Hub |
| `/education/:cat` | Category |
| `/education/:cat/:topic` | Topic |
| `/doctor/:slug` | Doctor profile |
| `/join` | Surgeon portal |
| `/surgeons` | Surgeons listing |
| `/events` | Events/CME listing |
| `/blog` | Blog articles |
| `/blog/:slug` | Article detail |
| `/admin` | Admin login |
| `/admin/dashboard` | Admin dashboard |
| `/admin/analytics` | Platform analytics |
| `/orthopaedic-surgeons-{city}` | City landing (12 cities) |
| `/*` | 404 Not Found |

## Subspecialties
1. Shoulder, 2. Elbow, 3. Hand, 4. Hip, 5. Knee
6. Spine, 7. Sports Medicine, 8. Trauma
9. Oncology, 10. Paediatrics

## Environment
```
Backend: FastAPI (port 8001)
Frontend: React (port 3000)
Database: MongoDB
OTP: 2Factor.in
Analytics: Google Analytics (G-MXXC41JFLG)
Email: Zoho Mail SMTP (info@agileortho.in)
```

## Test Credentials
- **Admin**: password `admin`
- **OTP**: Real SMS via 2Factor.in

## API Endpoints (New in January 2026)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/analytics` | GET | Platform statistics |
| `/api/admin/export/surgeons` | GET | CSV export |
| `/api/profiles/{slug}/view` | POST | Track profile view |
| `/api/profiles/{slug}/stats` | GET | Get view count |
| `/api/events` | GET | List events |
| `/api/admin/events` | POST | Create event |
| `/api/admin/events/{id}` | DELETE | Delete event |
| `/api/articles` | GET | List articles |
| `/api/articles/{slug}` | GET | Article detail |
| `/api/admin/articles` | POST | Create article |
| `/api/surgeon/me/referral-code` | POST | Generate referral code |
| `/api/surgeon/apply-referral` | POST | Apply referral code |
| `/api/surgeon/me/referrals` | GET | Get referral list |

## Completed This Session (January 1, 2026)
- ✅ Admin Analytics page with charts
- ✅ CSV Export for surgeons
- ✅ Profile view tracking
- ✅ Events page (admin-managed)
- ✅ Blog page (admin-managed)
- ✅ Email notifications via Zoho SMTP
- ✅ Referral system with unique codes
- ✅ PWA support (manifest + service worker)
- ✅ Fixed route registration bug (routes after app.include_router)
- ✅ **Outreach & Marketing Automation System** (`/admin/outreach`)
  - Import contacts from CSV
  - Add contacts manually
  - Send automated email campaigns (4 templates)
  - Track opens, clicks, conversions
  - WhatsApp integration with pre-filled messages
  - Export contacts as CSV

## Upcoming Tasks
- Loading Skeletons for better UX
- Admin events/blog content management UI

## Deployment
✅ Ready for production deployment
- All health checks passed
- No hardcoded values
- Environment variables configured
- SMTP credentials configured

---
Last Updated: January 1, 2026
