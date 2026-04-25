/**
 * Programmatic landing pages — `/buy/[slug]`
 *
 * 30 curated high-intent buyer queries auto-rendered from the live catalog.
 * Each entry:
 *   slug           URL segment (kebab-case)
 *   h1             on-page H1 (also used in <title>)
 *   metaTitle      <60 chars title tag (SERP)
 *   description    <160 chars meta description
 *   keywords       array for keywords meta + JSON-LD `about`
 *   intro          1-2 sentence visible intro paragraph
 *   filters        passed to /api/catalog/products (division|search|brand)
 *   city           "Hyderabad" | "Telangana" | "India" — for location schema/copy
 *   areaServed     LocalBusiness areaServed value
 *   faqs           array of {q, a} mirrored into FAQPage schema + visible UI
 *
 * URL pattern logic: stay close to the way buyers actually search Google.
 *   - "buy {procedure} implants in {city}"
 *   - "buy {brand product} {city}"
 *   - "{division} distributor india"
 */

const STD_FAQ_DELIVERY_HYD = {
  q: "How fast can implants be delivered to Hyderabad hospitals?",
  a: "Most products are usually in stock at our Hyderabad warehouse with same-day or 24-hour delivery to hospitals in Hyderabad, Secunderabad and surrounding districts. Same-day dispatch is available for emergency surgical cases.",
};
const STD_FAQ_CDSCO = {
  q: "Are these implants CDSCO approved and ISO 13485 certified?",
  a: "Yes. All Meril Life Sciences medical devices supplied by Agile Healthcare are CDSCO-registered and manufactured at ISO 13485-certified facilities. Lot numbers, GST invoices and regulatory documents are issued with every order.",
};
const STD_FAQ_BULK = {
  q: "Do you offer bulk B2B pricing for hospitals?",
  a: "Yes — hospitals, surgical centres and group purchasing organisations get tiered B2B pricing on bulk orders. Send a list with quantity, GST and delivery location and we send an exact quote within one working day.",
};
const STD_FAQ_BROCHURE = {
  q: "Can I get the brochure or surgical-technique PDF?",
  a: "Yes — WhatsApp 'CATALOG' to +91 74165 21222 and we share division-wise brochures, surgical-technique PDFs and sizing charts instantly.",
};

export const BUY_PAGES = [
  // ── Category A: Procedure × City (highest commercial intent) ──────────────
  {
    slug: "knee-replacement-implants-hyderabad",
    h1: "Buy Knee Replacement Implants in Hyderabad",
    metaTitle: "Knee Replacement Implants Hyderabad — Meril Distributor",
    description:
      "Buy Meril knee replacement implants in Hyderabad — Freedom Knee, Destiknee, Hinge Knee System. CDSCO-approved, in-stock, 24-hour hospital delivery across Telangana.",
    keywords: ["knee replacement implants Hyderabad", "Meril knee implants distributor", "Freedom Knee Hyderabad", "buy knee implants Telangana", "knee prosthesis supplier India"],
    intro:
      "Authorized Meril knee replacement portfolio for Hyderabad orthopedic surgeons — Freedom Knee, Destiknee, Hinge Knee System and full revision range. CDSCO-approved, ISO 13485 certified, in-stock at our Hyderabad warehouse.",
    filters: { search: "knee", division: "Joint Replacement" },
    city: "Hyderabad",
    areaServed: "Hyderabad, Telangana, India",
    faqs: [
      { q: "Which knee replacement systems does Agile Healthcare distribute in Hyderabad?",
        a: "We distribute the full Meril knee portfolio: Freedom Knee, Destiknee, Hinge Knee System and revision components. All sizes available with same-day dispatch from our Hyderabad warehouse." },
      STD_FAQ_DELIVERY_HYD, STD_FAQ_CDSCO, STD_FAQ_BULK,
    ],
  },
  {
    slug: "hip-replacement-implants-hyderabad",
    h1: "Buy Hip Replacement Implants in Hyderabad",
    metaTitle: "Hip Replacement Implants Hyderabad — Meril Distributor",
    description:
      "Buy Meril hip replacement implants in Hyderabad — DAAPRO uncemented stem, Latitud acetabular cups, TRENT femoral systems. CDSCO-approved, fast hospital delivery.",
    keywords: ["hip replacement implants Hyderabad", "DAAPRO Hyderabad", "Latitud acetabular cup", "buy hip implants Telangana", "Meril hip prosthesis"],
    intro:
      "Full Meril hip replacement range available in Hyderabad — DAAPRO uncemented femoral stem, Latitud acetabular cup system, TRENT femoral systems with all liner and head options. Authorized master franchise distributor for Telangana.",
    filters: { search: "hip", division: "Joint Replacement" },
    city: "Hyderabad",
    areaServed: "Hyderabad, Telangana, India",
    faqs: [
      { q: "Which hip replacement systems are stocked in Hyderabad?",
        a: "DAAPRO uncemented femoral stem, Latitud acetabular cup system, TRENT femoral systems plus revision range — all sizes available, usually same-day dispatch from Hyderabad." },
      STD_FAQ_DELIVERY_HYD, STD_FAQ_CDSCO, STD_FAQ_BULK,
    ],
  },
  {
    slug: "knee-replacement-implants-telangana",
    h1: "Buy Knee Replacement Implants in Telangana",
    metaTitle: "Knee Replacement Implants Telangana — Meril Distributor",
    description:
      "Meril knee replacement implants delivered to all 33 Telangana districts — Freedom Knee, Destiknee, Hinge Knee. CDSCO-approved, B2B bulk pricing, 24–48h hospital delivery.",
    keywords: ["knee implants Telangana", "knee replacement Warangal", "knee replacement Karimnagar", "Meril Telangana distributor", "joint replacement Telangana hospitals"],
    intro:
      "We supply Meril knee replacement implants across all 33 Telangana districts — Freedom Knee, Destiknee, Hinge Knee System, full revision range. Centralized warehouse in Hyderabad with 24–48h delivery to Warangal, Karimnagar, Nizamabad, Khammam and beyond.",
    filters: { search: "knee", division: "Joint Replacement" },
    city: "Telangana",
    areaServed: "Telangana, India",
    faqs: [
      { q: "Do you supply knee implants outside Hyderabad?",
        a: "Yes. We deliver to every Telangana district — Warangal, Karimnagar, Nizamabad, Khammam, Mahabubnagar and 28 more — typically within 24–48 hours from Hyderabad." },
      STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE,
    ],
  },
  {
    slug: "trauma-implants-hyderabad",
    h1: "Buy Trauma Implants & Orthopedic Plates in Hyderabad",
    metaTitle: "Trauma Implants Hyderabad — Meril Plates & Screws",
    description:
      "260+ Meril trauma implants in Hyderabad — Variabilis locking plates, KET nailing system, IM nailing, distal radial plates. CDSCO-approved, same-day delivery, B2B pricing.",
    keywords: ["trauma implants Hyderabad", "orthopedic plates Hyderabad", "Variabilis Hyderabad", "KET nailing system", "IM nailing Hyderabad", "Meril trauma distributor"],
    intro:
      "Full Meril trauma portfolio available in Hyderabad — Variabilis 2.4mm and 2.7mm locking plate systems, KET nailing system, IM nailing system, distal radial plates, cortex and locking screws. 260+ SKUs in stock.",
    filters: { division: "Trauma" },
    city: "Hyderabad",
    areaServed: "Hyderabad, Telangana, India",
    faqs: [
      { q: "Which trauma implant systems are available in Hyderabad?",
        a: "Variabilis 2.4mm and 2.7mm locking plate systems (multi-angle locking, cortex screws, distal radial plates), KET nailing system, IM nailing system and full Meril trauma range — 260+ SKUs across the catalog." },
      STD_FAQ_DELIVERY_HYD, STD_FAQ_CDSCO, STD_FAQ_BULK,
    ],
  },
  {
    slug: "trauma-plates-telangana",
    h1: "Buy Orthopedic Trauma Plates in Telangana",
    metaTitle: "Trauma Plates Telangana — Meril Locking Plates Distributor",
    description:
      "Meril trauma plates delivered across Telangana — Variabilis 2.4mm and 2.7mm locking plates, distal radial, multi-angle locking systems. CDSCO-approved, fast hospital delivery.",
    keywords: ["trauma plates Telangana", "locking plates Telangana", "Variabilis distributor", "orthopedic plates supplier", "Meril plates"],
    intro:
      "Variabilis locking plate systems and the full Meril trauma plate range delivered to every Telangana district. Multi-angle locking screws, distal radial plates, cortex screws — all sizes typically in stock at our Hyderabad warehouse.",
    filters: { search: "plate", division: "Trauma" },
    city: "Telangana",
    areaServed: "Telangana, India",
    faqs: [
      { q: "Which Meril plate systems are stocked?",
        a: "Variabilis 2.4mm Locking Plates, Variabilis 2.4mm Distal Radial Plates, Variabilis 2.4mm Multi-Angle Locking Plates, Variabilis 2.7mm Cortex Screws and the full Meril trauma plate range." },
      STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE,
    ],
  },
  {
    slug: "spine-implants-hyderabad",
    h1: "Buy Spine Implants in Hyderabad",
    metaTitle: "Spine Implants Hyderabad — Meril Distributor Telangana",
    description:
      "Buy Meril spine implants in Hyderabad — pedicle screws, rods and spinal fixation systems. CDSCO-approved, fast hospital delivery across Telangana.",
    keywords: ["spine implants Hyderabad", "pedicle screws Hyderabad", "spinal fixation Telangana", "Meril spine distributor"],
    intro:
      "Meril spine implants for spine surgeons in Hyderabad — pedicle screw systems, rods, connectors and full spinal fixation range. CDSCO-approved with rapid Hyderabad warehouse turnaround.",
    filters: { division: "Spine" },
    city: "Hyderabad",
    areaServed: "Hyderabad, Telangana, India",
    faqs: [
      STD_FAQ_DELIVERY_HYD, STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE,
    ],
  },
  {
    slug: "cardiac-stents-hyderabad",
    h1: "Buy Cardiac Stents in Hyderabad",
    metaTitle: "Cardiac Stents Hyderabad — Meril BioMime Distributor",
    description:
      "Buy Meril BioMime drug-eluting stents and cardiac devices in Hyderabad. CDSCO-approved cardiovascular implants, in-stock, fast cath-lab delivery across Telangana.",
    keywords: ["cardiac stents Hyderabad", "BioMime stent Hyderabad", "drug eluting stents Telangana", "Meril cardiology distributor", "cath lab supplies Hyderabad"],
    intro:
      "Authorized distributor of Meril BioMime drug-eluting stents and the full Meril cardiology portfolio for Hyderabad cath labs and cardiac centres. Same-day dispatch for emergency cases.",
    filters: { division: "Cardiovascular" },
    city: "Hyderabad",
    areaServed: "Hyderabad, Telangana, India",
    faqs: [
      { q: "Which cardiac stents are available?",
        a: "Meril BioMime, BioMime Morph and the full Meril drug-eluting stent range plus balloons, guidewires and cardiology accessories." },
      STD_FAQ_DELIVERY_HYD, STD_FAQ_CDSCO, STD_FAQ_BROCHURE,
    ],
  },
  {
    slug: "orthopedic-implants-hyderabad",
    h1: "Orthopedic Implants Distributor in Hyderabad",
    metaTitle: "Orthopedic Implants Hyderabad — Meril Master Franchise",
    description:
      "Authorized Meril Life Sciences master franchise for orthopedic implants in Hyderabad — trauma, joint replacement, spine, sports medicine. 500+ SKUs in stock, fast delivery.",
    keywords: ["orthopedic implants Hyderabad", "Meril orthopedic distributor", "Hyderabad orthopedic supplier", "ortho implants buy Hyderabad"],
    intro:
      "Authorized Meril Life Sciences master franchise distributor of orthopedic implants for Hyderabad hospitals — trauma plates, knee and hip replacement systems, spine implants, sports medicine anchors. 500+ SKUs in stock.",
    filters: { search: "ortho" },
    city: "Hyderabad",
    areaServed: "Hyderabad, Telangana, India",
    faqs: [
      { q: "What orthopedic implant categories do you stock in Hyderabad?",
        a: "Trauma (260+ SKUs), Joint Replacement (125+ SKUs including knee and hip), Spine, Sports Medicine, Instruments — all from Meril Life Sciences." },
      STD_FAQ_DELIVERY_HYD, STD_FAQ_CDSCO, STD_FAQ_BULK,
    ],
  },
  {
    slug: "orthopedic-implants-telangana",
    h1: "Orthopedic Implants Distributor in Telangana",
    metaTitle: "Orthopedic Implants Telangana — Meril Distributor",
    description:
      "Meril orthopedic implants delivered to all 33 Telangana districts. Trauma, joint replacement, spine and sports medicine — CDSCO-approved, fast hospital delivery.",
    keywords: ["orthopedic implants Telangana", "ortho distributor Telangana", "Meril Telangana", "implants supplier Warangal Karimnagar"],
    intro:
      "Meril orthopedic implants for hospitals across every Telangana district — trauma, joint replacement, spine, sports medicine. Centralized Hyderabad warehouse with 24–48h delivery to Warangal, Karimnagar, Nizamabad, Khammam, Mahabubnagar and beyond.",
    filters: { search: "ortho" },
    city: "Telangana",
    areaServed: "Telangana, India",
    faqs: [
      { q: "Do you deliver orthopedic implants outside Hyderabad?",
        a: "Yes. Every Telangana district is served — Warangal, Karimnagar, Nizamabad, Khammam, Mahabubnagar and 28 more — usually within 24–48 hours from Hyderabad." },
      STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE,
    ],
  },
  {
    slug: "sports-medicine-implants-hyderabad",
    h1: "Buy Sports Medicine Implants & Anchors in Hyderabad",
    metaTitle: "Sports Medicine Hyderabad — Meril ROTAFIX & FILAHOOK",
    description:
      "Buy Meril ROTAFIX titanium anchors, FILAHOOK soft anchor system, PERSIST endoscopy and full sports medicine range in Hyderabad. Fast delivery across Telangana.",
    keywords: ["sports medicine Hyderabad", "ROTAFIX anchors", "FILAHOOK Hyderabad", "PERSIST endoscopy", "shoulder anchors Hyderabad"],
    intro:
      "Full Meril sports medicine portfolio for Hyderabad arthroscopists — ROTAFIX titanium anchors, FILAHOOK soft anchor system, PERSIST endoscopy system and the complete shoulder/knee arthroscopy range.",
    filters: { division: "Sports Medicine" },
    city: "Hyderabad",
    areaServed: "Hyderabad, Telangana, India",
    faqs: [
      STD_FAQ_DELIVERY_HYD, STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE,
    ],
  },

  // ── Category B: Brand / Family × Hyderabad (long-tail high intent) ────────
  {
    slug: "freedom-knee-hyderabad",
    h1: "Buy Meril Freedom Knee in Hyderabad",
    metaTitle: "Freedom Knee Hyderabad — Meril Authorized Distributor",
    description:
      "Buy the Meril Freedom Knee replacement system in Hyderabad — full size range, CDSCO-approved, in-stock, same-day delivery for orthopedic surgeons across Telangana.",
    keywords: ["Freedom Knee Hyderabad", "Meril Freedom Knee", "Freedom Knee distributor Telangana", "buy Freedom Knee India"],
    intro:
      "Authorized distributor of the Meril Freedom Knee total knee replacement system for Hyderabad. Full size range with same-day delivery and surgical-technique PDFs available on WhatsApp request.",
    filters: { search: "Freedom Knee" },
    city: "Hyderabad",
    areaServed: "Hyderabad, Telangana, India",
    faqs: [
      STD_FAQ_DELIVERY_HYD, STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE,
    ],
  },
  {
    slug: "destiknee-hyderabad",
    h1: "Buy Meril Destiknee in Hyderabad",
    metaTitle: "Destiknee Hyderabad — Meril Knee System Distributor",
    description:
      "Buy the Meril Destiknee total knee replacement system in Hyderabad. Authorized distributor — full size range, CDSCO-approved, same-day delivery across Telangana.",
    keywords: ["Destiknee Hyderabad", "Meril Destiknee distributor", "Destiknee Telangana", "buy Destiknee"],
    intro:
      "Authorized distributor of the Meril Destiknee knee replacement system in Hyderabad. CDSCO-approved with full size range typically in stock for same-day surgical needs.",
    filters: { search: "Destiknee" },
    city: "Hyderabad",
    areaServed: "Hyderabad, Telangana, India",
    faqs: [STD_FAQ_DELIVERY_HYD, STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE],
  },
  {
    slug: "daapro-hip-hyderabad",
    h1: "Buy DAAPRO Uncemented Hip Stem in Hyderabad",
    metaTitle: "DAAPRO Hyderabad — Meril Hip Stem Distributor",
    description:
      "Buy the Meril DAAPRO uncemented femoral hip stem in Hyderabad. Authorized distributor — CDSCO-approved, in-stock, same-day delivery across Telangana.",
    keywords: ["DAAPRO Hyderabad", "DAAPRO hip stem", "Meril DAAPRO distributor", "uncemented hip stem India"],
    intro:
      "Authorized distributor of the Meril DAAPRO uncemented femoral hip stem in Hyderabad. Full size range with same-day surgical-case dispatch available.",
    filters: { search: "DAAPRO" },
    city: "Hyderabad",
    areaServed: "Hyderabad, Telangana, India",
    faqs: [STD_FAQ_DELIVERY_HYD, STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE],
  },
  {
    slug: "biomime-stent-hyderabad",
    h1: "Buy Meril BioMime Drug-Eluting Stent in Hyderabad",
    metaTitle: "BioMime Stent Hyderabad — Meril Cardiology Distributor",
    description:
      "Buy Meril BioMime drug-eluting coronary stent in Hyderabad. Authorized distributor — CDSCO-approved, in-stock at Hyderabad cath-lab supply, same-day dispatch.",
    keywords: ["BioMime Hyderabad", "BioMime stent", "Meril BioMime distributor", "drug eluting stent Telangana"],
    intro:
      "Authorized distributor of the Meril BioMime drug-eluting coronary stent for Hyderabad cath labs. Full size range with same-day emergency dispatch.",
    filters: { search: "BioMime" },
    city: "Hyderabad",
    areaServed: "Hyderabad, Telangana, India",
    faqs: [STD_FAQ_DELIVERY_HYD, STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE],
  },
  {
    slug: "variabilis-locking-plates-hyderabad",
    h1: "Buy Meril Variabilis Locking Plates in Hyderabad",
    metaTitle: "Variabilis Locking Plates Hyderabad — Meril Distributor",
    description:
      "Buy Meril Variabilis 2.4mm and 2.7mm locking plate systems in Hyderabad. Cortex screws, multi-angle locking, distal radial plates — CDSCO-approved, fast delivery.",
    keywords: ["Variabilis Hyderabad", "Variabilis locking plates", "Meril Variabilis distributor", "2.4mm locking plate Hyderabad"],
    intro:
      "Authorized distributor of the Meril Variabilis 2.4mm and 2.7mm locking plate range in Hyderabad — multi-angle locking screws, distal radial plates, cortex screws and the full small-fragment system.",
    filters: { search: "Variabilis" },
    city: "Hyderabad",
    areaServed: "Hyderabad, Telangana, India",
    faqs: [
      { q: "Which Variabilis sizes and components are stocked?",
        a: "All Variabilis 2.4mm and 2.7mm components — locking plates, distal radial plates, multi-angle locking screws, cortex screws — typically in stock at the Hyderabad warehouse." },
      STD_FAQ_DELIVERY_HYD, STD_FAQ_CDSCO, STD_FAQ_BULK,
    ],
  },
  {
    slug: "im-nailing-system-hyderabad",
    h1: "Buy IM Nailing System in Hyderabad",
    metaTitle: "IM Nailing System Hyderabad — Meril Distributor",
    description:
      "Buy Meril IM Nailing System in Hyderabad — femoral and tibial intramedullary nails with full instrumentation. CDSCO-approved, fast Hyderabad warehouse delivery.",
    keywords: ["IM nailing Hyderabad", "intramedullary nail Hyderabad", "Meril IM nailing", "IM nail distributor Telangana"],
    intro:
      "Authorized distributor of the Meril IM Nailing System in Hyderabad — femoral and tibial intramedullary nails with full instrument set. Same-day dispatch for trauma surgical cases.",
    filters: { search: "IM Nailing" },
    city: "Hyderabad",
    areaServed: "Hyderabad, Telangana, India",
    faqs: [STD_FAQ_DELIVERY_HYD, STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE],
  },
  {
    slug: "ket-nailing-system-hyderabad",
    h1: "Buy KET Nailing System in Hyderabad",
    metaTitle: "KET Nailing System Hyderabad — Meril Trauma Distributor",
    description:
      "Buy the Meril KET Nailing System in Hyderabad — humerus and tibia intramedullary nails with full instrumentation. CDSCO-approved, fast hospital delivery.",
    keywords: ["KET nailing Hyderabad", "KET nail Meril", "Meril KET distributor", "KET nailing Telangana"],
    intro:
      "Authorized distributor of the Meril KET Nailing System in Hyderabad. Full instrument set, all sizes available — same-day dispatch for trauma surgical cases.",
    filters: { search: "KET" },
    city: "Hyderabad",
    areaServed: "Hyderabad, Telangana, India",
    faqs: [STD_FAQ_DELIVERY_HYD, STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE],
  },
  {
    slug: "rotafix-anchors-hyderabad",
    h1: "Buy ROTAFIX Titanium Anchors in Hyderabad",
    metaTitle: "ROTAFIX Anchors Hyderabad — Meril Sports Medicine Distributor",
    description:
      "Buy Meril ROTAFIX titanium anchors in Hyderabad for shoulder and rotator cuff surgery. Authorized distributor, full size range, same-day Hyderabad delivery.",
    keywords: ["ROTAFIX Hyderabad", "ROTAFIX anchors", "Meril ROTAFIX distributor", "shoulder anchors Hyderabad"],
    intro:
      "Authorized distributor of Meril ROTAFIX titanium anchors in Hyderabad — shoulder and rotator cuff repair anchors with full size range. Same-day arthroscopy-case dispatch.",
    filters: { search: "ROTAFIX" },
    city: "Hyderabad",
    areaServed: "Hyderabad, Telangana, India",
    faqs: [STD_FAQ_DELIVERY_HYD, STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE],
  },
  {
    slug: "latitud-acetabular-cup-hyderabad",
    h1: "Buy Latitud Acetabular Cup System in Hyderabad",
    metaTitle: "Latitud Acetabular Cup Hyderabad — Meril Hip Distributor",
    description:
      "Buy the Meril Latitud Acetabular Cup System in Hyderabad — full liner and head range. CDSCO-approved hip replacement components, same-day surgical dispatch.",
    keywords: ["Latitud Hyderabad", "Latitud acetabular cup", "Meril Latitud distributor", "acetabular cup Hyderabad"],
    intro:
      "Authorized distributor of the Meril Latitud Acetabular Cup System in Hyderabad — cups, liners and femoral heads in full size range for primary and revision hip arthroplasty.",
    filters: { search: "Latitud" },
    city: "Hyderabad",
    areaServed: "Hyderabad, Telangana, India",
    faqs: [STD_FAQ_DELIVERY_HYD, STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE],
  },
  {
    slug: "mirus-endocutter-hyderabad",
    h1: "Buy MIRUS Power Endocutter in Hyderabad",
    metaTitle: "MIRUS Endocutter Hyderabad — Meril Endo Surgery Distributor",
    description:
      "Buy Meril MIRUS Power Endocutter (45mm and 60mm) in Hyderabad. Endo-surgical staplers and reloads — CDSCO-approved, fast hospital delivery across Telangana.",
    keywords: ["MIRUS endocutter Hyderabad", "endo cutter Meril", "endo stapler Hyderabad", "MIRUS reload distributor"],
    intro:
      "Authorized distributor of the Meril MIRUS Power Endocutter range — 45mm and 60mm staplers with reload cartridges — for laparoscopic surgical centres across Hyderabad and Telangana.",
    filters: { search: "MIRUS" },
    city: "Hyderabad",
    areaServed: "Hyderabad, Telangana, India",
    faqs: [STD_FAQ_DELIVERY_HYD, STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE],
  },

  // ── Category C: Division × India (broader national queries) ───────────────
  {
    slug: "orthopedic-implants-distributor-india",
    h1: "Meril Orthopedic Implants Distributor in India",
    metaTitle: "Orthopedic Implants Distributor India — Meril Authorized",
    description:
      "Authorized Meril Life Sciences distributor of orthopedic implants for India — trauma, joint replacement, spine, sports medicine. 500+ SKUs, CDSCO-approved, pan-India delivery.",
    keywords: ["orthopedic implants distributor India", "Meril orthopedic India", "ortho implants supplier India", "buy orthopedic implants India"],
    intro:
      "Authorized Meril Life Sciences distributor of the full orthopedic implant range — trauma, joint replacement, spine, sports medicine — serving hospitals across India from our Hyderabad warehouse.",
    filters: { search: "ortho" },
    city: "India",
    areaServed: "India",
    faqs: [
      { q: "Do you ship orthopedic implants outside Telangana?",
        a: "Yes — pan-India delivery is available. Lead times depend on city; metro deliveries typically 2–4 days. Hyderabad and Telangana hospitals get same-day or 24-hour dispatch." },
      STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE,
    ],
  },
  {
    slug: "joint-replacement-distributor-india",
    h1: "Meril Joint Replacement Implants Distributor in India",
    metaTitle: "Joint Replacement Distributor India — Meril Knee & Hip",
    description:
      "Authorized Meril joint replacement distributor for India — Freedom Knee, Destiknee, DAAPRO Hip, Latitud Cup. CDSCO-approved, full size range, fast hospital delivery.",
    keywords: ["joint replacement distributor India", "Meril knee hip India", "knee replacement supplier India", "hip replacement distributor India"],
    intro:
      "Authorized Meril joint replacement distributor for hospitals across India — Freedom Knee, Destiknee, Hinge Knee System, DAAPRO Hip Stem, Latitud Acetabular Cup and the full revision range.",
    filters: { division: "Joint Replacement" },
    city: "India",
    areaServed: "India",
    faqs: [STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE,
      { q: "Which Meril joint replacement systems are most ordered?",
        a: "Freedom Knee and Destiknee for primary TKR; Hinge Knee for revisions; DAAPRO + Latitud cup combination for THR. Full revision range also available." },
    ],
  },
  {
    slug: "cardiovascular-stents-supplier-india",
    h1: "Meril Cardiovascular Stents & Cardiology Devices Supplier in India",
    metaTitle: "Cardiovascular Stents Supplier India — Meril BioMime",
    description:
      "Authorized Meril cardiovascular distributor for India — BioMime drug-eluting stents, balloons, guidewires, Dafodil heart valves. CDSCO-approved, cath-lab dispatch.",
    keywords: ["cardiovascular stents India", "BioMime supplier India", "Meril cardiology distributor", "drug eluting stent India", "Dafodil heart valves"],
    intro:
      "Authorized Meril cardiovascular distributor for cath labs and cardiac centres across India — BioMime drug-eluting stents, balloons, guidewires, Dafodil heart valves and full cardiology accessories.",
    filters: { division: "Cardiovascular" },
    city: "India",
    areaServed: "India",
    faqs: [STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE,
      { q: "Which Meril cardiovascular products are stocked?",
        a: "BioMime, BioMime Morph drug-eluting stents, balloons, guidewires, sheaths, Dafodil heart valves — full Meril cardiology portfolio." },
    ],
  },
  {
    slug: "spine-implants-distributor-india",
    h1: "Meril Spine Implants Distributor in India",
    metaTitle: "Spine Implants Distributor India — Meril Pedicle Screw Systems",
    description:
      "Authorized Meril spine implants distributor for India — pedicle screws, rods, spinal fixation systems. CDSCO-approved, fast hospital delivery.",
    keywords: ["spine implants distributor India", "pedicle screw India", "Meril spine distributor", "spinal fixation India"],
    intro:
      "Authorized Meril spine implants distributor for spine surgeons across India — pedicle screw systems, rods, connectors and the full spinal fixation range.",
    filters: { division: "Spine" },
    city: "India",
    areaServed: "India",
    faqs: [STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE,
      { q: "Do you supply revision spine instruments?",
        a: "Yes — primary and revision pedicle screw systems plus dedicated instrument sets. Quote available within one working day." },
    ],
  },
  {
    slug: "diagnostics-equipment-supplier-india",
    h1: "Meril Diagnostics Equipment & Reagents Supplier in India",
    metaTitle: "Diagnostics Equipment Supplier India — AutoQuant 400 & Reagents",
    description:
      "Authorized Meril diagnostics distributor for India — AutoQuant 400 biochemistry analyzer, reagents and lab equipment. CDSCO-approved, full lab support.",
    keywords: ["diagnostics equipment India", "AutoQuant 400 supplier", "Meril diagnostics distributor", "biochemistry reagents India", "lab equipment India"],
    intro:
      "Authorized Meril diagnostics distributor for clinical laboratories across India — AutoQuant 400 biochemistry analyzer, reagents and full Meril lab portfolio. Reagent supply contracts available.",
    filters: { division: "Diagnostics" },
    city: "India",
    areaServed: "India",
    faqs: [STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE,
      { q: "Do you offer reagent supply contracts?",
        a: "Yes — annual reagent supply contracts with priority dispatch and dedicated lab support are available. Contact sales for terms." },
    ],
  },
  {
    slug: "endo-surgery-instruments-india",
    h1: "Meril Endo-Surgery Instruments Supplier in India",
    metaTitle: "Endo Surgery Instruments India — Meril MIRUS & MERIGROW",
    description:
      "Meril endo-surgery distributor for India — MIRUS Power Endocutter (45mm/60mm), reloads, MERIGROW PP mesh, FILAPROP 3D mesh. CDSCO-approved, fast delivery.",
    keywords: ["endo surgery instruments India", "MIRUS endocutter India", "MERIGROW mesh", "FILAPROP 3D mesh", "Meril endo surgery distributor"],
    intro:
      "Authorized Meril endo-surgery distributor for laparoscopic surgical centres across India — MIRUS Power Endocutter range, MERIGROW PP macroporous mesh, FILAPROP 3D mesh and full endo-surgical accessories.",
    filters: { division: "Endo Surgery" },
    city: "India",
    areaServed: "India",
    faqs: [STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE,
      { q: "Which mesh products are available?",
        a: "MERIGROW PP macroporous mesh, FILAPROP 3D mesh and ABSOMESH partially-absorbable mesh in standard sizes including 10×15 cm." },
    ],
  },
  {
    slug: "sports-medicine-implants-india",
    h1: "Meril Sports Medicine & Arthroscopy Distributor in India",
    metaTitle: "Sports Medicine Distributor India — Meril ROTAFIX & FILAHOOK",
    description:
      "Authorized Meril sports medicine distributor for India — ROTAFIX titanium anchors, FILAHOOK soft anchor system, PERSIST endoscopy. CDSCO-approved, fast delivery.",
    keywords: ["sports medicine distributor India", "arthroscopy supplier India", "ROTAFIX India", "FILAHOOK distributor", "Meril sports medicine"],
    intro:
      "Authorized Meril sports medicine and arthroscopy distributor for India — ROTAFIX titanium anchors, FILAHOOK soft anchor system, PERSIST endoscopy system and full shoulder/knee arthroscopy accessories.",
    filters: { division: "Sports Medicine" },
    city: "India",
    areaServed: "India",
    faqs: [STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE,
      { q: "Which anchors are available?",
        a: "ROTAFIX titanium anchors, FILAHOOK soft anchor system and the full Meril shoulder/knee arthroscopy anchor range." },
    ],
  },
  {
    slug: "urology-devices-supplier-india",
    h1: "Meril Urology Devices Supplier in India",
    metaTitle: "Urology Devices India — Meril Authorized Distributor",
    description:
      "Authorized Meril urology distributor for India — full urological device portfolio. CDSCO-approved, fast hospital and clinic delivery.",
    keywords: ["urology devices India", "Meril urology distributor", "urological supplies India", "urology equipment India"],
    intro:
      "Authorized Meril urology distributor for urologists and hospitals across India — full Meril urological device portfolio including endourology, stone management and cystoscopy accessories.",
    filters: { division: "Urology" },
    city: "India",
    areaServed: "India",
    faqs: [STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE, STD_FAQ_DELIVERY_HYD],
  },
  {
    slug: "ent-medical-devices-india",
    h1: "Meril ENT Medical Devices Distributor in India",
    metaTitle: "ENT Medical Devices India — Meril Distributor",
    description:
      "Authorized Meril ENT distributor for India — tracheal T-tubes, ENT instruments and accessories. CDSCO-approved, fast hospital delivery.",
    keywords: ["ENT medical devices India", "tracheal T tubes India", "Meril ENT distributor", "ENT supplies India"],
    intro:
      "Authorized Meril ENT distributor for ENT surgeons and hospitals across India — tracheal T-tubes, ENT instruments and full Meril ENT range.",
    filters: { division: "ENT" },
    city: "India",
    areaServed: "India",
    faqs: [STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE, STD_FAQ_DELIVERY_HYD],
  },
  {
    slug: "critical-care-devices-supplier-india",
    h1: "Meril Critical Care Devices Supplier in India",
    metaTitle: "Critical Care Devices Supplier India — Meril Authorized",
    description:
      "Authorized Meril critical care distributor for India — ICU and critical-care medical devices. CDSCO-approved, fast hospital delivery.",
    keywords: ["critical care devices India", "ICU equipment India", "Meril critical care", "critical care supplier India"],
    intro:
      "Authorized Meril critical care distributor for ICUs and critical-care units across India — full Meril critical-care device portfolio with priority dispatch for emergency cases.",
    filters: { division: "Critical Care" },
    city: "India",
    areaServed: "India",
    faqs: [STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE, STD_FAQ_DELIVERY_HYD],
  },
  {
    slug: "infection-prevention-supplier-india",
    h1: "Meril Infection Prevention Solutions Supplier in India",
    metaTitle: "Infection Prevention Supplier India — Meril Distributor",
    description:
      "Authorized Meril infection prevention distributor for India — sterilization, surgical drapes, gowns and full infection-prevention catalog. CDSCO-approved.",
    keywords: ["infection prevention India", "Meril infection prevention", "surgical drapes India", "sterilization supplies India"],
    intro:
      "Authorized Meril infection prevention distributor for hospitals across India — sterilization products, surgical drapes, gowns and the full Meril infection-prevention catalog.",
    filters: { division: "Infection Prevention" },
    city: "India",
    areaServed: "India",
    faqs: [STD_FAQ_CDSCO, STD_FAQ_BULK, STD_FAQ_BROCHURE, STD_FAQ_DELIVERY_HYD],
  },
];

export function getBuyPage(slug) {
  return BUY_PAGES.find((p) => p.slug === slug) || null;
}

export const BUY_PAGE_SLUGS = BUY_PAGES.map((p) => p.slug);
