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
  - Hyderabad, Mumbai, Delhi, Bangalore, Chennai, Kolkata
  - Pune, Ahmedabad, Jaipur, Lucknow, Chandigarh, Kochi
- **Social Meta Tags**: og:title, og:description, twitter:card
- **Schema.org Markup**: Physician, MedicalBusiness
- **Google Analytics**: G-MXXC41JFLG

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

### ✅ Surgeon Features
- Max 2 subspecialties limit
- Website field for personal/clinic URL
- Profile editing (even after approval)
- WhatsApp contact button on profile

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
| `/admin` | Admin login |
| `/admin/dashboard` | Admin dashboard |
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
```

## Test Credentials
- **Admin**: password `admin`
- **OTP**: Real SMS via 2Factor.in

## Completed This Session
- ✅ 404 Not Found page
- ✅ 12 SEO city landing pages
- ✅ Admin "Needs Clarification" status
- ✅ 5 trust badges on doctor profile
- ✅ Success toast notifications
- ✅ Status-specific banners in surgeon portal
- ✅ Favicon (teal "A")
- ✅ Social meta tags (OG, Twitter)
- ✅ Surgeon profile editing post-approval
- ✅ Shop link in header navigation

## Deployment
✅ Ready for production deployment
- All health checks passed
- No hardcoded values
- Environment variables configured

---
Last Updated: January 2026
