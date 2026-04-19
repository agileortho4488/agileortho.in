# Interakt Template Submissions — Copy-Paste Ready

Submit these in **Interakt → Messaging → Templates → Create New Template**. Meta review typically takes 1–24 hours.

> ⚠️ **Category selection is critical.** Both templates below are **Marketing** category (required for cold/semi-cold outreach). If you select "Utility" or "Authentication", Meta will reject them.

---

## Template 1 — `ao_optin_v1` (Opt-in / Consent)

**Purpose:** First-touch message to cold leads (scraped from Google Maps via GSC "Find Buyers"). Must look like a question, not a pitch — otherwise Meta will reject.

| Field | Value |
|---|---|
| **Template Name** | `ao_optin_v1` |
| **Category** | Marketing |
| **Language** | English |

### Header
`None` (no header)

### Body
```
Hi! We noticed your clinic may be looking for {{1}}. 

Agile Ortho is the authorised Meril Life Sciences master franchise in Telangana — we supply orthopedic implants, trauma plates, joint replacement systems, and more, directly from the manufacturer.

Would you like us to send you our 2026 catalog with current pricing?
```
**Body variables you'll provide at send time:**
- `{{1}}` → product category inferred from their GSC query (e.g., "orthopedic implants", "bone plates")

### Footer
```
Reply STOP to opt out. Agile Healthcare, Hyderabad.
```

### Buttons (Quick Reply type)
1. `Yes, send catalog`
2. `Not interested`
3. `Call me instead`

---

## Template 2 — `ao_catalog_carousel_v1` (Product Carousel — only sent AFTER opt-in)

**Purpose:** Sent within 24h of "Yes, send catalog" click. Meta allows richer content here because user has opted in.

| Field | Value |
|---|---|
| **Template Name** | `ao_catalog_carousel_v1` |
| **Category** | Marketing |
| **Language** | English |

### Header
**Type:** Image
**Sample image:** Upload a clean hero image of your Meril product family (Recommend: MBOSS screw system or ARMAR plate on a neutral background, 1024×1024 JPG).

### Body
```
Hi {{1}}, thanks for your interest!

Here's our top 3 bestsellers in {{2}} for {{3}}:

🔹 {{4}}
🔹 {{5}}
🔹 {{6}}

All items are IS/ISO certified, available from stock in Hyderabad. Bulk pricing on request.
```

**Body variables:**
- `{{1}}` → Lead's name (or "Doctor" if unknown)
- `{{2}}` → Product category (e.g., "Trauma")
- `{{3}}` → District / hospital name
- `{{4}}`, `{{5}}`, `{{6}}` → Top 3 product names

### Footer
```
Agile Healthcare • Authorised Meril Master Franchise • Telangana
```

### Buttons (Call-to-Action + Quick Reply mix)
1. **URL button:** `View full catalog` → `https://www.agileortho.in/catalog?utm_source=wa&utm_campaign=carousel_v1&lead={{7}}`
   *(where `{{7}}` is the lead's tracking ID — we insert it at send time)*
2. **Quick reply:** `Book a demo`
3. **Quick reply:** `Get bulk quote`

---

## Template 3 (Optional) — `ao_quote_followup_v1`

**Purpose:** Sent 24h after a "Get bulk quote" click if the user hasn't replied.

| Field | Value |
|---|---|
| **Template Name** | `ao_quote_followup_v1` |
| **Category** | Marketing |
| **Language** | English |

### Body
```
Hi {{1}}, following up on your interest in {{2}}.

Our team can share a personalized bulk quote within 1 working day. Would you like to share:
• Expected monthly volume
• Your preferred delivery location

Or simply book a 15-min call with our specialist.
```

### Buttons
1. **URL button:** `Book 15-min call` → `https://cal.com/agile-ortho/demo?lead={{3}}`
   *(replace `cal.com/agile-ortho/demo` with your actual Calendly/Cal.com URL once set up)*
2. **Quick reply:** `Share volume details`
3. **Quick reply:** `Not now`

---

## After Templates Are Approved — Share These With The Agent

Paste back into the chat:
```
Template 1 status: APPROVED / REJECTED
Template 2 status: APPROVED / REJECTED
Template 3 status: APPROVED / REJECTED (optional)
Cal.com / Calendly URL: https://...
```

Then the outbound engine rules will auto-activate.

---

## Rejection Playbook

If Meta rejects `ao_optin_v1` or `ao_catalog_carousel_v1`:

| Rejection reason | What to do |
|---|---|
| "Promotional content not allowed in Utility category" | Resubmit as Marketing category |
| "Sample content unclear" | Fill in sample values for all variables when submitting (Interakt UI has a "Sample values" field) |
| "Generic greetings" | Replace `{{1}}` with a specific product category in the body, not just "Hi" |
| "Missing opt-out language" | Our footer already says "Reply STOP to opt out" — add it if missing |

---

## Content Rules Baked Into The Engine (You Don't Need To Remember These)

- **No outbound to `source:google_maps` leads without opt-in** — engine enforces this
- **Max 2000/day** across all templates combined (your requested cap)
- **Auto-pause if >3 blocks/spam reports in 24h** — safety kill-switch
- **Cooldown: 7 days between messages to the same number**
- **Business hours only:** sends run between 9 AM – 7 PM IST (configurable)
- **Every outbound link has a unique tracking ID** → clicks hit `/api/track/click` → lead auto-upgrades to "Warm"
