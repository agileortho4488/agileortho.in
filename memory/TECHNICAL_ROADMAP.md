# OrthoConnect Technical Implementation Plan
## Features Required for 6-Month Growth Plan

---

## Priority 1: Surgeon Acquisition Features (Month 1-2)

### 1.1 Bulk Import & Claim Profile System
**Purpose**: Allow surgeons to "claim" their pre-created profiles

**How it works**:
1. Admin imports surgeon data (name, mobile, email, city, hospital)
2. System creates "unclaimed" profiles
3. Surgeon receives SMS/Email: "Your profile is ready - claim it now"
4. Surgeon verifies via OTP and completes profile
5. Profile moves from "unclaimed" to "pending verification"

**Backend Requirements**:
```python
# New endpoints needed
POST /api/admin/surgeons/bulk-import    # Import from CSV
POST /api/surgeon/claim-profile         # Claim unclaimed profile
GET  /api/profiles/unclaimed/{mobile}   # Check if profile exists

# New status: "unclaimed" added to SurgeonStatus enum
```

**Frontend Requirements**:
- Admin: Bulk import page with CSV template
- Public: "Claim Your Profile" page at /claim
- SMS template: "Dr. {name}, your OrthoConnect profile is ready..."

---

### 1.2 City-Wise Landing Pages
**Purpose**: SEO + Targeted campaigns

**URLs**:
- /surgeons/hyderabad
- /surgeons/vijayawada
- /surgeons/visakhapatnam
- etc.

**Features**:
- City hero image
- Stats: "X surgeons in {city}"
- Surgeon cards filtered by city
- "Join as {city} surgeon" CTA
- Schema.org LocalBusiness markup

**Backend**:
```python
GET /api/profiles/by-city/{city}        # Get surgeons by city
GET /api/meta/city-stats/{city}         # Get city statistics
```

---

### 1.3 Enhanced Referral System
**Current**: Basic referral code
**Needed**: Tiered rewards + tracking

**Tiers**:
```
Tier 1: 3 referrals → "Top Referrer" badge + Featured 1 week
Tier 2: 5 referrals → AgileOrtho consumables kit (₹2,000 value)
Tier 3: 10 referrals → VIP CME invite + Equipment discount
```

**Backend**:
```python
GET  /api/surgeon/referral-stats        # Referral count & tier
POST /api/surgeon/claim-reward/{tier}   # Claim tier reward
GET  /api/admin/referral-leaderboard    # Top referrers
```

**Frontend**:
- Referral dashboard with progress bars
- Shareable referral cards (image generation)
- Leaderboard widget

---

### 1.4 Email Automation Sequences
**Purpose**: Automated follow-up for signups

**Sequences**:
```
New Contact (not signed up):
├── Day 0: Invitation email
├── Day 3: Benefits reminder
├── Day 7: Social proof ("Your colleagues joined")
├── Day 14: Final reminder
└── Day 21: Archive (unresponsive)

Profile Created (incomplete):
├── Day 1: Complete your profile
├── Day 3: Add your photo
├── Day 7: Add documents for verification
└── Day 14: Final reminder

Profile Verified:
├── Day 0: Congratulations email
├── Day 7: First patient inquiry report
├── Day 30: Monthly stats report
└── Ongoing: Monthly newsletter
```

**Technical**:
- Use SendGrid for bulk email (Zoho limits)
- Store sequence state in MongoDB
- Cron job to process sequences daily

---

## Priority 2: Engagement Features (Month 3-4)

### 2.1 Surgeon Dashboard Analytics
**Purpose**: Show value to surgeons

**Metrics to Show**:
- Profile views (daily/weekly/monthly)
- Search appearances
- Patient inquiries (if implemented)
- Referral performance
- Comparison to city average

**Backend**:
```python
GET /api/surgeon/me/analytics           # Dashboard data
GET /api/surgeon/me/analytics/views     # View history
GET /api/surgeon/me/analytics/compare   # City comparison
```

**Frontend**:
- Charts (line chart for views over time)
- Stats cards
- "Improve your profile" suggestions

---

### 2.2 WhatsApp Integration
**Purpose**: Easy onboarding + notifications

**Option A: Zoho Desk (Current)**
- Already integrated
- Limited automation
- Manual template sending

**Option B: WhatsApp Business API (Recommended)**
- Full automation
- Chatbot capability
- Higher cost (~₹1,000/month)

**Features**:
1. Profile creation via WhatsApp chat
2. Verification OTP via WhatsApp
3. New inquiry notifications
4. Monthly stats summary
5. CME event reminders

---

### 2.3 CME/Event Management System
**Purpose**: Organize and promote events

**Features**:
- Event creation (admin)
- Registration with payment (optional)
- Attendee management
- Certificate generation
- Post-event feedback

**Backend**:
```python
# Event endpoints
POST /api/admin/events                  # Create event
GET  /api/events                        # List events
GET  /api/events/{id}                   # Event details
POST /api/events/{id}/register          # Register for event
GET  /api/events/{id}/attendees         # Attendee list (admin)
POST /api/events/{id}/certificate       # Generate certificate

# Models
Event: {id, title, description, date, venue, capacity, fee, speakers[], sponsors[]}
Registration: {id, event_id, surgeon_id, status, payment_id, attended}
```

**Frontend**:
- /events page (public)
- /events/{id} detail page
- Registration form
- Admin: Event management dashboard
- Certificate download

---

### 2.4 Patient Inquiry System
**Purpose**: Track patient interest (without booking)

**How it works**:
1. Patient views surgeon profile
2. Clicks "Send Inquiry" (name, phone, condition)
3. Surgeon receives notification (email + WhatsApp)
4. Inquiry tracked in surgeon dashboard

**Note**: No appointment booking (per core principles)

**Backend**:
```python
POST /api/profiles/{slug}/inquiry       # Submit inquiry
GET  /api/surgeon/me/inquiries          # List inquiries
PATCH /api/surgeon/me/inquiries/{id}    # Mark as responded
```

---

## Priority 3: Monetization Features (Month 4-5)

### 3.1 AgileOrtho.shop Integration
**Purpose**: Convert trust to sales

**Integration Points**:
1. "Recommended Equipment" widget on surgeon dashboard
2. Exclusive member discounts (via promo codes)
3. Purchase history tracking (for loyalty program)
4. "Order Again" for consumables

**Technical Options**:
- **Option A**: Embed shop iframe in OrthoConnect
- **Option B**: Deep links with UTM tracking
- **Option C**: Full API integration (requires shop API)

**Recommended**: Option B (simple, trackable)
```
Link format: https://agileortho.shop?utm_source=orthoconnect&utm_medium=dashboard&surgeon_id={id}
```

---

### 3.2 Sponsorship Management
**Purpose**: Manage CME/event sponsors

**Features**:
- Sponsor tiers (Title, Gold, Silver)
- Logo placement automation
- Lead sharing (post-event)
- ROI reporting

**Backend**:
```python
# Sponsor endpoints
POST /api/admin/sponsors                # Add sponsor
GET  /api/events/{id}/sponsors          # Event sponsors
POST /api/events/{id}/sponsors/{id}/leads  # Share leads
```

---

### 3.3 Hospital Partnership Portal
**Purpose**: B2B relationships

**Features**:
- Hospital registration
- Bulk surgeon onboarding
- Equipment contract management
- Usage analytics

**Backend**:
```python
# Hospital endpoints
POST /api/hospitals                     # Register hospital
GET  /api/hospitals/{id}/surgeons       # Hospital's surgeons
POST /api/hospitals/{id}/contract       # Equipment contract
```

---

## Priority 4: Scale Features (Month 5-6)

### 4.1 Mobile App (PWA Enhancement)
**Current**: Basic PWA
**Needed**: Full mobile experience

**Features**:
- Push notifications
- Offline profile viewing
- Quick actions (share profile, view stats)
- Camera integration (photo upload)

**Technical**: Enhance existing PWA or React Native app

---

### 4.2 Advanced Search & Filters
**Current**: Basic name/city/specialty search
**Needed**: Smart discovery

**New Filters**:
- Distance (already implemented ✓)
- Experience years
- Hospital type (corporate/private/govt)
- Languages spoken
- Gender preference
- Availability (morning/evening/weekend)

---

### 4.3 Automated Reporting
**Purpose**: Reduce manual work

**Reports**:
1. Daily: New signups, inquiries
2. Weekly: Engagement metrics
3. Monthly: Growth report, revenue
4. On-demand: Custom date range

**Delivery**: Email + Dashboard

---

## Database Schema Updates

### New Collections Needed

```javascript
// Unclaimed profiles (for bulk import)
unclaimed_profiles: {
  id: String,
  name: String,
  mobile: String,
  email: String,
  city: String,
  hospital: String,
  source: String,        // "bulk_import", "referral", etc.
  claim_token: String,
  claimed: Boolean,
  claimed_at: Date,
  created_at: Date
}

// Email sequences
email_sequences: {
  id: String,
  contact_type: String,  // "surgeon", "lead", "hospital"
  contact_id: String,
  sequence_name: String,
  current_step: Number,
  status: String,        // "active", "completed", "unsubscribed"
  last_sent_at: Date,
  next_send_at: Date,
  created_at: Date
}

// Events
events: {
  id: String,
  title: String,
  description: String,
  date: Date,
  venue: Object,
  capacity: Number,
  fee: Number,
  speakers: Array,
  sponsors: Array,
  registrations_count: Number,
  status: String,
  created_at: Date
}

// Event registrations
event_registrations: {
  id: String,
  event_id: String,
  surgeon_id: String,
  status: String,
  payment_status: String,
  attended: Boolean,
  certificate_url: String,
  created_at: Date
}

// Patient inquiries
patient_inquiries: {
  id: String,
  surgeon_id: String,
  patient_name: String,
  patient_phone: String,
  condition: String,
  message: String,
  status: String,        // "new", "contacted", "closed"
  surgeon_notes: String,
  created_at: Date
}

// Hospitals
hospitals: {
  id: String,
  name: String,
  type: String,          // "corporate", "private", "government"
  city: String,
  address: String,
  contact_person: String,
  phone: String,
  email: String,
  surgeon_ids: Array,
  contract_status: String,
  created_at: Date
}
```

---

## API Endpoints Summary

### Phase 1 (Month 1-2)
```
POST /api/admin/surgeons/bulk-import
POST /api/surgeon/claim-profile
GET  /api/profiles/by-city/{city}
GET  /api/meta/city-stats/{city}
GET  /api/surgeon/referral-stats
POST /api/surgeon/claim-reward/{tier}
```

### Phase 2 (Month 3-4)
```
GET  /api/surgeon/me/analytics
POST /api/events
GET  /api/events
POST /api/events/{id}/register
POST /api/profiles/{slug}/inquiry
GET  /api/surgeon/me/inquiries
```

### Phase 3 (Month 4-5)
```
POST /api/admin/sponsors
GET  /api/events/{id}/sponsors
POST /api/hospitals
GET  /api/hospitals/{id}/surgeons
```

---

## Implementation Order

### Week 1-2: Data Foundation
1. Bulk import system
2. Claim profile flow
3. City landing pages

### Week 3-4: Outreach Automation
4. SendGrid integration
5. Email sequence engine
6. Enhanced referral tracking

### Week 5-6: Engagement
7. Surgeon analytics dashboard
8. Patient inquiry system
9. WhatsApp notifications

### Week 7-8: Events
10. Event management
11. Registration system
12. Certificate generation

### Week 9-10: Monetization
13. Shop integration
14. Hospital portal
15. Sponsorship management

### Week 11-12: Scale
16. Advanced search
17. Automated reports
18. Mobile app enhancements

---

*Document Version: 1.0*
*Created: January 1, 2026*
