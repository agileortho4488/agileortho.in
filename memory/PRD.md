# OrthoConnect - Product Requirements Document

## Overview
OrthoConnect is an ethical, patient-first orthopaedic healthcare platform for India. It provides:
- Research-backed patient education about orthopaedic conditions
- Surgeon discovery with intelligent search (no booking, no rankings)
- Free professional profiles for surgeons

## Core Principles (Non-Negotiable)
- **No appointment booking** - Only show contact details
- **No paid listings** - All profiles are free
- **No doctor rankings** - Distance/alphabetical sorting only
- **No advertisements** - Clean, ad-free experience
- **No reviews/testimonials** - Can be gamed

## Design System (Premium Health-Tech)
- **Style**: Modern with animations, glow effects, scroll animations
- **Color Palette**: Monochrome + Teal with category-specific gradients
- **Typography**: Inter font family
- **Components**: Shadcn/UI + Framer Motion
- **Effects**: Floating orbs, glow cards, page transitions

## Tech Stack
- **Frontend**: React + Tailwind CSS + Shadcn/UI + Framer Motion
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT + Mocked OTP

## Key Features Implemented

### 1. Intelligent Search System ✅
- **Auto-suggest dropdown** with categories (Condition, Treatment, Symptom, Search)
- **Hindi/Telugu keyword support** (घुटने का दर्द, कमर दर्द)
- **Synonym matching** (knee = ghutna = ghutne = mokalu)
- **Recent searches** stored in localStorage
- **"Near me" button** with geolocation
- **Radius controls** (5/10/25/50 km)

### 2. Research-Backed Education Content ✅
- **Real medical content** for key conditions (ACL Tear, Meniscus, Herniated Disc, etc.)
- **Sources cited**: AAOS, NHS, Mayo Clinic, Cleveland Clinic
- **Structured format**: Key Takeaways, Symptoms, Causes, Risk Factors, Treatment, Recovery, Prevention
- **"Research-backed content" badge** on complete topics
- **700+ topic placeholders** ready for content

### 3. Trust Badges on Profiles ✅
- **Admin Verified** badge (blue)
- **Registration Submitted** badge (amber)
- **Photo Verified** badge (violet)
- Animated entrance with hover effects

### 4. Premium UI/UX ✅
- **Animated backgrounds** with floating gradient orbs
- **Glow effects** on card hover (category-specific colors)
- **Scroll animations** (fade-in, scale, stagger)
- **Dark gradient headers** on education pages
- **Glassmorphism** elements

### 5. Surgeon Profiles ✅
- Premium header with photo and trust badges
- Contact card (click-to-call, website)
- Locations accordion with Google Maps links
- Platform disclaimer

## Pages
- `/` - Homepage with intelligent search
- `/education` - Education Hub with category cards
- `/education/:category` - Category with topic grid
- `/education/:category/:topic` - Topic with real content
- `/doctor/:slug` - Doctor profile with trust badges
- `/join` - Surgeon registration
- `/admin/dashboard` - Admin review

## Content Completed
- ACL Tear (Anterior Cruciate Ligament Injury)
- Meniscal Tears (Meniscus Injury)
- Herniated Disc (Slipped Disc)
- Rotator Cuff Tear
- Hip Osteoarthritis

## Search Synonyms Implemented
- Hindi: ghutne, kamar, kandha, kalai, haddi, jodon, dard
- Telugu: mokalu, noppi, vennunoppi
- Medical: ACL, PCL, MCL, meniscus, sciatica, arthritis
- Common: fracture, sprain, tear, replacement

## Upcoming Tasks
🟡 **Add more topic content** - Expand research-backed content to more conditions
🟡 **Surgeon Dashboard** - Structured tags for conditions/procedures
🟢 **City landing pages** - SEO-focused location pages

## Test Credentials
- Admin password: `admin`
- Test mobile: Any 10-digit number (OTP is mocked)

---
Last Updated: January 2026
