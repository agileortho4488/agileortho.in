# Product Knowledge Graph — Detailed Project Report
## Agile Healthcare | Meril Life Sciences Master Franchise, Telangana

---

## 1. EXECUTIVE SUMMARY

Agile Healthcare currently operates a B2B medical device distribution platform with **967 products** across **13 clinical divisions**, serving **1,287 leads** and **105 discovered hospitals/surgeons** across Telangana. The product catalog contains **5,882 SKUs** with **643 product families** and **11 pre-existing brand relationships**.

**The Opportunity:** Transform this product database into a **Surgical Decision Engine** — a system that automatically tells sales reps *what to sell next* based on what a hospital already bought, needs, and will need again.

**Projected Impact:**
- **20–40% increase in average order value** (screw-plate auto-bundling)
- **Predictable recurring revenue** (consumable reorder alerts)
- **Junior reps perform like veterans** (AI-powered next-sell recommendations)

---

## 2. CURRENT STATE ANALYSIS

### 2.1 Product Portfolio Breakdown

| Division | Products | Categories | Key Brands |
|----------|----------|------------|------------|
| **Trauma** | 218 | 20 | ARMAR, AURIC, KET, CLAVO, MBOSS |
| **Endo-Surgical** | 168 | 13 | MIRUS, MERIGROW, MYCLIP |
| **Joint Replacement** | 112 | 14 | DESTIKNEE, FREEDOM, LATITUDE, BIOLOX |
| **Diagnostics** | 105 | 11 | AUTOQUANT, MERISCREEN, MERISERA |
| **Infection Prevention** | 85 | 10 | BAKTIO, CEROSAFE |
| **Cardiovascular** | 60 | 13 | BIOMIME, MOZEC, NEXGEN |
| **Instruments** | 53 | 6 | Surgical Drill Bits, Instrument Sets |
| **Sports Medicine** | 53 | 3 | ROTAFIX, FILAHOOK |
| **ENT** | 45 | 11 | Airway Management, Nasal Devices |
| **Urology** | 28 | 9 | Catheters, Stents, Guidewires |
| **Critical Care** | 23 | 8 | BREATHFLEX, Airway Management |
| **Peripheral Intervention** | 13 | 5 | Balloon Catheters, Vascular Closure |
| **Robotics** | 4 | 2 | CORIN OMNI, Surgical Robotic Systems |
| **TOTAL** | **967** | **125+** | **18 brand systems** |

### 2.2 Material Distribution

| Material | Count | Used In |
|----------|-------|---------|
| Titanium Alloy (TAN) | 77 | Trauma plates, screws |
| Titanium alloy (general) | 38 | Implants |
| TAN (Ti-6Al-7Nb) | 30 | Premium implants |
| Chemical Reagent | 30 | Diagnostics |
| Surgical grade steel | 29 | Instruments |
| Titanium (pure) | 29 | Screws, bolts |
| Titanium staples | 27 | Endo-surgical |
| Non-woven fabric | 19 | Infection prevention |
| Titanium with TiNBn coating | 17 | Premium screws |

### 2.3 Existing Relationships (Already Discovered)

```
AURIC ──[coated_variant_of]──> ARMAR         (conf: 0.95)
ARMAR ──[uses_screw_family]──> MBOSS          (conf: 0.90)
AURIC ──[uses_screw_family]──> MBOSS          (conf: 0.90)
CLAVO ──[uses_screw_family]──> MBOSS          (conf: 0.88)
CLAVO ──[belongs_to_system]──> Intramedullary Nail (conf: 0.98)
ARMAR ──[belongs_to_system]──> Plates         (conf: 0.95)
MIRUS ──[belongs_to_system]──> Staplers       (conf: 0.95)
MERISCREEN ──[belongs_to]────> Diagnostic Tests (conf: 0.97)
MERISERA ──[belongs_to]──────> Reagents       (conf: 0.95)
DESTIKNEE ──[same_family]───> FREEDOM         (conf: 0.85)
BIOLOX ──[used_with_hip]────> LATITUDE        (conf: 0.88)
```

### 2.4 Top Product Families by Size

| Family | Products | Division |
|--------|----------|----------|
| AutoQuant 400 Biochemistry Reagents | 29 | Diagnostics |
| CLAVO PFRN 4.9mm Locking Bolts | 28 | Trauma |
| Variabilis 2.7mm Cortex Screws | 22 | Trauma |
| ROTAFIX Titanium Anchors | 19 | Sports Medicine |
| Latitud Acetabular Cup System | 16 | Joint Replacement |
| Variabilis 2.4mm Distal Radial Plates | 16 | Trauma |
| MIRUS Power Endocutter 60mm Reloads | 10 | Endo-surgical |
| KET Nailing System | 9 | Trauma |
| FILAHOOK Soft Anchor System | 8 | Sports Medicine |
| TRENT Uncemented Femoral Stem | 7 | Joint Replacement |

### 2.5 CRM & Sales Data

| Metric | Value |
|--------|-------|
| Total CRM Leads | 1,287 |
| CRM Contacts | 10,452 |
| Discovered Hospitals/Surgeons | 105 |
| WhatsApp Conversations | 1,270 |
| Active Pipeline Stages | 6 (new → won/lost) |
| Hot Leads | 18 |
| Warm Leads | 14 |
| Cold Leads | 1,242 (mostly Interakt synced) |

---

## 3. PRODUCT KNOWLEDGE GRAPH — ARCHITECTURE

### 3.1 What Is It?

A **Product Knowledge Graph** is a relationship database that maps how products connect to each other — not just by category, but by **surgical need, physical compatibility, and purchase patterns**.

```
                    ┌─────────────┐
                    │  ARMAR 3.5  │
                    │  Titanium   │
                    │   Plate     │
                    └──────┬──────┘
                           │ REQUIRES (hole: 3.5mm)
                    ┌──────▼──────┐
                    │  MBOSS 3.5  │
                    │  Locking    │
                    │   Screw     │
                    └──────┬──────┘
                           │ BUNDLE (trauma set)
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Drill Bit│ │ Surgical │ │ Bone     │
        │ 3.5mm    │ │ Drapes   │ │ Cement   │
        └──────────┘ └──────────┘ └──────────┘
```

### 3.2 Data Model

**Collection: `product_relationships`**
```json
{
  "source_slug": "armar-3.5mm-lps-proximal-humerus-plate",
  "target_slug": "mboss-3.5mm-locking-screw",
  "relationship_type": "REQUIRES",
  "confidence": 0.95,
  "rule_source": "diameter_match",
  "context": {
    "matched_on": "screw_diameter=3.5mm",
    "surgical_context": "trauma_plating",
    "division": "Trauma"
  },
  "revenue_impact": "high",
  "created_at": "2026-03-30T12:00:00Z"
}
```

**Three Relationship Types (Phase 1 — Revenue Focused):**

| Type | Meaning | Rule Logic | Revenue Impact |
|------|---------|------------|----------------|
| `REQUIRES` | Must buy together | Diameter match, same system, physical dependency | **Highest** — increases every order |
| `BUNDLE` | Same surgical procedure | Same product family, same implant class | **High** — upsells complete kits |
| `REORDER` | Consumable, needs replenishment | Category = sutures/reagents/drapes + usage cycle | **Recurring** — predictable cash flow |

### 3.3 Relationship Mining Rules

#### Rule 1: REQUIRES — Screw-Plate Diameter Matching
```
FOR each plate product WHERE name contains "Xmm":
  FIND all screws WHERE name contains "Xmm"
  AND same brand system OR compatible material
  CREATE edge: plate → screw (REQUIRES, confidence=0.95)
```

**Example matches from your data:**
| Plate | Screw | Matched On |
|-------|-------|------------|
| ARMAR 3.5mm LPS Proximal Humerus Plate | MBOSS 3.5mm Cortex Screw | 3.5mm diameter + ARMAR→MBOSS relationship |
| ARMAR 2.4mm Distal Radial Plate | Variabilis 2.4mm Locking Screw | 2.4mm diameter |
| Variabilis 2.7mm Fibula Plate | Variabilis 2.7mm Cortex Screw | 2.7mm diameter + same brand |
| KET 4.5mm Compression Plate | MBOSS 4.5mm Cortex Screw | 4.5mm diameter |
| AURIC LPS Clavicle Plates | MBOSS 3.5mm Locking Screw | 3.5mm + AURIC→MBOSS relationship |

#### Rule 2: BUNDLE — Same System Components
```
FOR each product family:
  FIND all products in the same family
  CREATE edges: each product → other products (BUNDLE, confidence=0.90)
```

**Example bundles from your data:**

**Destiknee Total Knee System:**
| Component | Category | Required? |
|-----------|----------|-----------|
| Destiknee Femoral Component | Knee Implants | Yes |
| Destiknee Tibial Tray | Knee Tibial Components | Yes |
| Destiknee Tibial Insert | Knee Tibial Components | Yes |
| Destiknee Patellar Component | Knee Implants | Optional |
| Bone Cement + Pressurizer | Instruments | Required if cemented |

**Latitude Hip System:**
| Component | Category | Required? |
|-----------|----------|-----------|
| Latitude Acetabular Cup | Hip Acetabular Components | Yes |
| BIOLOX Ceramic Head | Hip Stems | Yes (via BIOLOX→LATITUDE relationship) |
| TRENT Femoral Stem | Hip Stems | Yes |
| Bipolar Cup System | Hip Implants | Alternative |

**CLAVO Nailing System:**
| Component | Category | Required? |
|-----------|----------|-----------|
| CLAVO PFIN/PFRN Femoral Nail | Nailing Systems | Yes |
| CLAVO PFRN 4.9mm Locking Bolts | Locking Screws | Yes (28 products) |
| CLAVO 6.4mm Cannulated Bolts | Locking Screws | Yes |
| KET Nailing Instrument Set | Instrument Sets | Yes |

#### Rule 3: REORDER — Consumable Detection
```
FOR each product WHERE category IN consumable_categories:
  TAG as reorder_eligible
  SET default_cycle_days based on category
```

**Consumable Categories & Reorder Cycles:**
| Category | Products | Default Cycle | Division |
|----------|----------|---------------|----------|
| Sutures (Absorbable + Catgut) | 41 | 14 days | Endo-surgical |
| Biochemistry Reagents | 35 | 30 days | Diagnostics |
| Hernia Mesh | 26 | Per surgery | Endo-surgical |
| Surgical Drapes | 22 | 7 days | Infection Prevention |
| Hand Hygiene (BAKTIO) | 19 | 21 days | Infection Prevention |
| Endocutter Reloads (MIRUS) | 18 | Per surgery | Endo-surgical |
| Point of Care Tests | 15 | 30 days | Diagnostics |
| Surface Disinfectants | 12 | 14 days | Infection Prevention |

---

## 4. DEMO: HOW IT WORKS IN PRACTICE

### Demo Scenario 1: Hospital X Buys Trauma Plates

**Hospital: TRG Hospitals, Mailardevpally**
**Purchase: ARMAR 3.5mm LPS Proximal Humerus Plate**

The system automatically shows:

```
┌──────────────────────────────────────────────────────────────┐
│  RECOMMENDED FOR THIS ORDER                                  │
│                                                              │
│  MUST BUY (required for surgery):                            │
│  ┌──────────────────────────────────────┬─────────┬────────┐│
│  │ Product                              │ Match   │ Price  ││
│  ├──────────────────────────────────────┼─────────┼────────┤│
│  │ MBOSS 3.5mm Cortex Screw (6 sizes)  │ 95%     │ --     ││
│  │ MBOSS 3.5mm Locking Screw (8 sizes) │ 95%     │ --     ││
│  │ 3.5mm Drill Bit                     │ 92%     │ --     ││
│  └──────────────────────────────────────┴─────────┴────────┘│
│                                                              │
│  COMPLETE BUNDLE (full surgical kit):                        │
│  ┌──────────────────────────────────────┬─────────┐         │
│  │ ARMAR 3.5mm Instrument Set          │ 90%     │         │
│  │ AURIC Gold Plate (premium upgrade)  │ 88%     │         │
│  └──────────────────────────────────────┴─────────┘         │
│                                                              │
│  CONSUMABLE ADD-ONS:                                         │
│  ┌──────────────────────────────────────┬─────────┐         │
│  │ Absorbable Sutures (12 variants)    │ Reorder │         │
│  │ BAKTIO Surgical Hand Rub            │ Reorder │         │
│  │ CEROSAFE Surgical Drapes            │ Reorder │         │
│  └──────────────────────────────────────┴─────────┘         │
└──────────────────────────────────────────────────────────────┘
```

**Without Knowledge Graph:** Order = 1 plate = low margin
**With Knowledge Graph:** Order = plate + 14 screws + drills + sutures + drapes = **3-5x order value**

### Demo Scenario 2: Hospital Y — Total Knee Replacement

**Hospital: Apollo Diagnostics Center**
**Inquiry: Destiknee Total Knee System**

```
┌──────────────────────────────────────────────────────────────┐
│  DESTIKNEE TOTAL KNEE — COMPLETE SURGICAL KIT                │
│                                                              │
│  SYSTEM COMPONENTS (BUNDLE):                                 │
│  [x] Destiknee Femoral Component                             │
│  [x] Destiknee Tibial Tray                                   │
│  [x] Destiknee Tibial Insert (4 options)                     │
│  [ ] Destiknee Patellar Component (optional)                 │
│                                                              │
│  REQUIRED INSTRUMENTS:                                       │
│  [x] Destiknee Instrument Set                                │
│  [x] Cement Pressurizer                                      │
│  [x] Bone Cement (BoneWax)                                   │
│                                                              │
│  ALSO CONSIDER:                                              │
│  [ ] FREEDOM Knee System (alternative system)                │
│  [ ] Opulent Knee System (premium line)                      │
│                                                              │
│  CONSUMABLES (auto-reorder):                                 │
│  [x] Sutures — reorders every 14 days                        │
│  [x] CEROSAFE Drapes — reorders every 7 days                 │
│  [x] BAKTIO Hand Hygiene — reorders every 21 days            │
└──────────────────────────────────────────────────────────────┘
```

### Demo Scenario 3: CRM Lead View — Reorder Alert

```
┌──────────────────────────────────────────────────────────────┐
│  VK DIAGNOSTICS                                              │
│  Status: Active Customer | Zone: Hyderabad Central           │
│                                                              │
│  REORDER ALERTS:                                             │
│  [OVERDUE] AutoQuant 400 Reagent Kit — last order: 45d ago   │
│  [DUE]     BAKTIO Hand Sanitizer — last order: 20d ago       │
│  [UPCOMING] MERISCREEN Rapid Test Kits — due in 8 days       │
│                                                              │
│  CROSS-SELL (based on purchase history):                      │
│  - CEL-QUANT Hematology Analyzer (85% match)                 │
│  - AutoQuant 1200 (upgrade from 400) (78% match)             │
│                                                              │
│  [Send WhatsApp Reminder]  [Generate Quotation]              │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. TECHNICAL IMPLEMENTATION PLAN

### 5.1 Backend Architecture

```
/app/backend/
├── services/
│   └── knowledge_graph.py          # Core relationship engine
├── routes/
│   └── recommendations.py          # API endpoints
└── scripts/
    └── build_relationships.py      # One-time mining script
```

### 5.2 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/products/{slug}/recommendations` | Get cross-sell for a product |
| GET | `/api/leads/{id}/recommendations` | Get recommendations for a lead based on history |
| GET | `/api/admin/knowledge-graph/stats` | Dashboard stats (total relationships, coverage) |
| POST | `/api/admin/knowledge-graph/rebuild` | Re-mine relationships from scratch |

**Response Format:**
```json
{
  "product": "ARMAR 3.5mm LPS Proximal Humerus Plate",
  "must_buy": [
    {
      "product": "MBOSS 3.5mm Cortex Screw",
      "relationship": "REQUIRES",
      "confidence": 0.95,
      "reason": "3.5mm diameter match + ARMAR-MBOSS brand pairing"
    }
  ],
  "bundle": [
    {
      "product": "ARMAR 3.5mm Instrument Set",
      "relationship": "BUNDLE",
      "confidence": 0.90,
      "reason": "Same brand plating system"
    }
  ],
  "reorder": [
    {
      "product": "Absorbable Sutures",
      "relationship": "REORDER",
      "confidence": 0.85,
      "default_cycle_days": 14
    }
  ]
}
```

### 5.3 MongoDB Collections

**New collection: `product_relationships`**
```json
{
  "source_slug": "string",
  "target_slug": "string",
  "relationship_type": "REQUIRES | BUNDLE | REORDER",
  "confidence": 0.0-1.0,
  "rule_source": "diameter_match | same_family | brand_relationship | consumable_tag",
  "context": {},
  "revenue_impact": "high | medium | low",
  "status": "active",
  "created_at": "ISO datetime"
}
```

**New collection: `reorder_tracking`** (Phase 1.5)
```json
{
  "lead_id": "string",
  "hospital_name": "string",
  "product_slug": "string",
  "last_order_date": "ISO datetime",
  "cycle_days": 14,
  "next_reorder_date": "ISO datetime",
  "status": "upcoming | due | overdue",
  "notified": false
}
```

---

## 6. EXECUTION TIMELINE

### Session 1: Relationship Mining Engine
- Build `knowledge_graph.py` service
- Implement 3 rule types (REQUIRES, BUNDLE, REORDER)
- Run mining against 967 products
- Store results in `product_relationships` collection
- Build `/api/products/{slug}/recommendations` endpoint
- **Deliverable:** Working API that returns recommendations for any product

### Session 2: CRM Integration
- Build `/api/leads/{id}/recommendations` endpoint
- Add Knowledge Graph widget to CRM Lead detail page
- Add recommendations panel to Product Detail page
- Add admin stats dashboard for relationship coverage
- **Deliverable:** Sales reps see recommendations in CRM

### Session 3: Consumable Reorder Engine
- Build reorder tracking system
- WhatsApp auto-reminder integration (optional)
- Reorder alerts in CRM dashboard
- **Deliverable:** Auto-alerts for consumable reorders

---

## 7. EXPECTED RELATIONSHIP COUNTS (Estimated)

| Type | Estimated Edges | Source |
|------|----------------|--------|
| REQUIRES (screw-plate) | ~150-200 | Diameter matching across 218 trauma products |
| REQUIRES (nail-bolt) | ~40-60 | CLAVO + KET nailing systems |
| BUNDLE (same system) | ~300-400 | 643 product families |
| BUNDLE (brand pairs) | ~50-80 | 11 existing brand relationships |
| REORDER (consumables) | ~180-200 | Sutures, reagents, drapes, hygiene |
| **TOTAL** | **~720-940** | Across 967 products |

**Coverage:** ~75-85% of products will have at least one relationship.

---

## 8. REVENUE IMPACT MODEL

### Conservative Estimates

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Avg items per trauma order | 1-2 | 4-6 | +200% |
| Consumable reorder rate | Ad-hoc | Systematic | Predictable |
| Junior rep productivity | Low (needs senior guidance) | High (system guides them) | +150% |
| Missed cross-sell | ~60% | ~15% | -75% |

### Revenue Formula
```
Current: 100 orders/month x avg 2 items = 200 line items
After:   100 orders/month x avg 5 items = 500 line items

Revenue uplift = 150% more line items per order
```

---

## 9. WHAT WE'RE NOT BUILDING (Phase 2/3 — Future)

| Feature | Why Delayed | When |
|---------|-------------|------|
| Cross-division intelligence | Noisy, needs purchase data validation | Phase 2 |
| AI PDF extraction | Needs LLM integration, slower ROI | Phase 3 |
| Upgrade path logic | Needs pricing data and margin info | Phase 2 |
| "Used in same OR" predictions | Needs real surgical procedure mapping | Phase 3 |
| Surgeon preference learning | Needs order history per surgeon | Phase 3 |

---

## 10. COMPETITIVE MOAT

This system creates a **defensible competitive advantage** because:

1. **Data compounds over time** — every order makes recommendations smarter
2. **Switching cost** — hospitals get used to easy reordering
3. **Rep efficiency** — competitors' reps can't match your system-guided selling
4. **Consumable lock-in** — auto-reorder creates sticky recurring revenue

**You're not building a product catalog. You're building a surgical decision engine for hospitals.**

---

*Report generated: March 30, 2026*
*Platform: Agile Healthcare CRM | agileortho.in*
*Data source: Live MongoDB (test_database)*
