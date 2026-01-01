# OrthoConnect - Product Requirements Document

## Overview
OrthoConnect is an ethical, patient-first orthopaedic healthcare platform for India — **An initiative of AgileOrtho**.

## Core Principles
- **No appointment booking** - Only show contact details
- **No paid listings** - All profiles are free
- **No doctor rankings** - Distance/alphabetical sorting only
- **No advertisements** - Clean, ad-free experience

## Branding
- **Logo**: "A" in teal gradient + "OrthoConnect" title
- **Tagline**: "An initiative of AgileOrtho"
- **Footer**: "© 2026 OrthoConnect by AgileOrtho"

## Key Features

### 1. Real OTP Authentication ✅
- **Provider**: 2Factor.in
- **Resend OTP**: 30-second countdown timer
- **Change Number**: Link to reset OTP flow
- **Fallback**: Mocked OTP if SMS fails

### 2. Surgeon Registration ✅
- **Max 2 subspecialties** (frontend + backend enforced)
- Website field for personal/clinic website
- Photo upload (enabled after profile submission)
- Document upload for verification

### 3. Doctor Profile ✅
- WhatsApp button (opens chat with surgeon)
- Call Clinic button (direct tel: link)
- Visit Website button
- Trust badges (Admin Verified, Registration Submitted)

### 4. Patient Education Hub ✅
- 13+ conditions with medical content
- Key takeaways, symptoms, causes, treatments

### 5. Intelligent Search ✅
- Hindi/Telugu keyword support
- City aliases (Mumbai/Bombay)
- Auto-suggest dropdown

## Subspecialties (Max 2 per surgeon)
1. Shoulder
2. Elbow
3. Hand
4. Hip
5. Knee
6. Spine
7. Sports Medicine
8. Trauma
9. Oncology
10. Paediatrics

## About Page - Advisory Board
- **B. Nagi Reddy** - Director, Finance & Legal

## Pages
- `/` - Homepage
- `/about` - About OrthoConnect
- `/contact` - Contact page
- `/education` - Education Hub
- `/education/:category` - Category
- `/education/:category/:topic` - Topic
- `/doctor/:slug` - Doctor profile
- `/join` - Surgeon registration
- `/admin` - Admin login
- `/admin/dashboard` - Admin dashboard

## Test Credentials
- **Admin**: password `admin`
- **OTP**: Real SMS via 2Factor.in (200 SMS balance)

## Environment Variables
```
TWOFACTOR_API_KEY=a95afc45-e6f0-11f0-a6b2-0200cd936042
ADMIN_PASSWORD=admin
```

## Completed This Session
- ✅ AgileOrtho branding
- ✅ About page (only B. Nagi Reddy)
- ✅ Max 2 subspecialties limit
- ✅ Real OTP via 2Factor.in
- ✅ Resend OTP with 30s countdown
- ✅ Change number link
- ✅ WhatsApp button on doctor profile
- ✅ Photo upload fix (enabled after profile submission)

## Future/Backlog
- Trust badge improvements
- Admin "Needs Clarification" status
- SEO city landing pages
- Surgeon profile editing post-approval

---
Last Updated: January 2026
