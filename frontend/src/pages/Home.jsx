import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Shield, Truck, HeartPulse, Microscope, Bone, Stethoscope,
  Syringe, Activity, Phone, MessageSquare, Building2, Scan, Scissors,
  BadgeCheck, MapPin, Headphones, Package, Clock, FileCheck, Users,
  ClipboardList, Send, ChevronRight, Zap, Globe, CircuitBoard, Search,
  Dumbbell, Disc, Replace, Wrench
} from "lucide-react";
import { getProducts, getDivisions } from "../lib/api";
import { SEO, buildOrganizationSchema, buildLocalBusinessSchema } from "../components/SEO";

const API = process.env.REACT_APP_BACKEND_URL;

const DIVISION_META = {
  "Joint Replacement": { icon: Replace, desc: "Hip and knee arthroplasty implants, revision systems, modular components, and positioning devices for total joint replacement.", bg: "bg-blue-50/70" },
  "Trauma": { icon: Bone, desc: "Locking plates, intramedullary nails, screws, reconstruction nails, and fracture fixation systems for trauma surgery.", bg: "bg-amber-50/70" },
  "Sports Medicine": { icon: Dumbbell, desc: "Arthroscopic anchors, suture systems, ACL/PCL reconstruction, meniscal repair, shavers, and endoscope camera systems.", bg: "bg-green-50/70" },
  "Instruments": { icon: Wrench, desc: "Surgical instrument sets, drill bits, reamers, alignment guides, storage systems, and positioning accessories for orthopaedic procedures.", bg: "bg-slate-50/70" },
  "Spine": { icon: Disc, desc: "Pedicle screws, interbody cages, cervical plates, and spinal fixation systems for spinal surgery.", bg: "bg-violet-50/70" },
  "Cardiovascular": { icon: HeartPulse, desc: "Coronary stents, heart valves, TAVI, TEER systems, and cardiac surgery devices for interventional and surgical cardiology.", bg: "bg-red-50/70" },
  "Diagnostics": { icon: Microscope, desc: "Rapid tests, ELISA, hematology analyzers, coagulation systems, and clinical chemistry solutions.", bg: "bg-purple-50/70" },
  "ENT": { icon: Stethoscope, desc: "Sinus, airway, nasal, and tracheostomy devices for ear, nose, and throat surgical procedures.", bg: "bg-teal-50/70" },
  "Endo Surgery": { icon: Scissors, desc: "Sutures, staplers, hernia mesh, biosurgical products, energy devices, and women's health solutions.", bg: "bg-indigo-50/70" },
  "Infection Prevention": { icon: Shield, desc: "Surgical gowns, drapes, hand hygiene, skin prepping, and hospital disinfection systems.", bg: "bg-emerald-50/70" },
  "Peripheral Intervention": { icon: Activity, desc: "Peripheral stents, PTA balloons, drug-coated balloons, and vascular closure devices.", bg: "bg-orange-50/70" },
  "Critical Care": { icon: Syringe, desc: "Vascular access, renal care, regional anesthesia, respiratory, and airway management devices.", bg: "bg-cyan-50/70" },
  "Urology": { icon: Scan, desc: "Catheters, stents, stone baskets, guidewires, dilators, scopes, and laser systems for urological procedures.", bg: "bg-sky-50/70" },
  "Robotics": { icon: CircuitBoard, desc: "Surgical robotics platforms and instrumentation for minimally invasive robotic procedures.", bg: "bg-rose-50/70" },
};

export default function Home() {
  const [divisions, setDivisions] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [heroSearch, setHeroSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getDivisions().then((r) => setDivisions(r.data.divisions || [])).catch(() => {});
    import("axios").then(({ default: axios }) => {
      axios.get(`${API}/api/products/featured/homepage`).then((r) => setFeaturedProducts(r.data.products || [])).catch(() => {});
    });
  }, []);

  const totalProducts = divisions.reduce((s, d) => s + (d.product_count || 0), 0);

  return (
    <div className="font-[Manrope]">
      <SEO
        title="Authorized Meril Life Sciences Distributor - Medical Devices for Hospitals in Telangana"
        description="Agile Ortho is the authorized Meril Life Sciences master distributor for Telangana. Orthopedic implants, cardiovascular stents, diagnostic analyzers, endo-surgical instruments, ENT devices, and infection prevention products for hospitals and clinics across all 33 districts."
        canonical="/"
        jsonLd={[buildOrganizationSchema(), buildLocalBusinessSchema()]}
      />      {/* ===== 1. UTILITY BAR ===== */}
      <div className="bg-slate-900 text-white border-b border-slate-800" data-testid="utility-bar">
        <div className="max-w-7xl mx-auto px-6 py-2 flex flex-wrap justify-between items-center text-xs">
          <span className="text-slate-300 hidden sm:block">
            <BadgeCheck size={13} className="inline mr-1 text-teal-400" />
            Authorized Meril Life Sciences Distributor &middot; Bulk Supply for Hospitals, Clinics & Diagnostic Centers
          </span>
          <div className="flex items-center gap-4 text-slate-300 ml-auto sm:ml-0">
            <a href="tel:+917416216262" className="hover:text-white flex items-center gap-1">
              <Phone size={11} /> +91 74162 16262
            </a>
            <a href="https://wa.me/917416521222" target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center gap-1">
              <MessageSquare size={11} /> WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* ===== 2. HERO ===== */}
      <section className="relative bg-slate-900 overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0 opacity-40">
          <img src="https://images.unsplash.com/photo-1640876777012-bdb00a6323e2?w=1920&q=80" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/85 to-slate-900/50" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
          <div className="max-w-2xl">
            <p className="text-teal-400 text-xs font-bold uppercase tracking-[0.2em] mb-5">
              Authorized Medical Device Distributor &middot; Telangana
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] tracking-tight">
              Reliable Medical Device Supply for Hospitals Across Telangana
            </h1>
            <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-xl">
              Orthopedics, cardiovascular, diagnostics, infection prevention, endo-surgery, ENT, robotics, and more — with compliant distribution, fast dispatch, and technical product support.
            </p>

            {/* ===== MASTER SEARCH BAR ===== */}
            <form
              onSubmit={(e) => { e.preventDefault(); if (heroSearch.trim()) navigate(`/catalog?search=${encodeURIComponent(heroSearch.trim())}`); }}
              className="mt-8 flex w-full max-w-lg"
              data-testid="hero-search-form"
            >
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder={`Search ${totalProducts || 810}+ products — implants, stents, analyzers...`}
                  className="w-full pl-11 pr-4 py-4 bg-white/10 border border-slate-600 rounded-l-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:border-teal-500 focus:bg-white/15 backdrop-blur-sm transition-all"
                  data-testid="hero-search-input"
                />
              </div>
              <button
                type="submit"
                className="px-7 py-4 bg-teal-600 text-white font-bold text-sm rounded-r-xl hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/25"
                data-testid="hero-search-btn"
              >
                Search
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Knee Implants", "Coronary Stents", "Sutures", "Surgical Gowns", "Hip System"].map((q) => (
                <button
                  key={q}
                  onClick={() => navigate(`/catalog?search=${encodeURIComponent(q)}`)}
                  className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-teal-500 px-3 py-1.5 rounded-full transition-all"
                  data-testid={`quick-search-${q.toLowerCase().replace(/\s/g, "-")}`}
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/20"
                data-testid="hero-browse-btn"
              >
                Browse Product Divisions <ArrowRight size={16} />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-3.5 border border-slate-500 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                data-testid="hero-quote-btn"
              >
                Request Bulk Quote
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              <a href="https://wa.me/917416521222" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors underline underline-offset-2">
                Talk to a Product Specialist on WhatsApp
              </a>
            </p>
            {/* Trust chips */}
            <div className="mt-10 flex flex-wrap gap-3">
              {[
                { icon: BadgeCheck, text: "MD-42 Licensed Distributor" },
                { icon: MapPin, text: "33 Districts Covered" },
                { icon: Headphones, text: "Technical Product Support" },
              ].map(({ icon: Icon, text }) => (
                <span key={text} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-slate-300 text-xs font-medium backdrop-blur-sm">
                  <Icon size={13} className="text-teal-400" /> {text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== 3. TRUST METRICS STRIP ===== */}
      <section className="relative z-10" data-testid="trust-metrics">
        <div className="max-w-6xl mx-auto px-6 -mt-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            {[
              { value: `${totalProducts > 0 ? totalProducts.toLocaleString() : "8,000"}+`, label: "SKUs Available" },
              { value: "14", label: "Product Divisions" },
              { value: "33", label: "Districts in Telangana" },
              { value: "24/7", label: "Bulk Hospital Supply" },
            ].map((s, i) => (
              <div key={s.label} className={`p-6 text-center ${i < 3 ? "border-r border-slate-100" : ""}`}>
                <p className="text-3xl font-bold text-slate-900 tracking-tight">{s.value}</p>
                <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-wider font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 4. WHO WE SERVE ===== */}
      <section className="py-24 bg-white" data-testid="who-we-serve">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-teal-600 text-xs font-bold uppercase tracking-[0.2em] mb-3">Who We Serve</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
              Built for Healthcare Procurement
            </h2>
            <p className="mt-4 text-slate-500 max-w-xl mx-auto">
              We support hospitals, clinics, diagnostic centers, and OT teams with dependable supply, product guidance, and bulk procurement support.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {[
              { icon: Building2, title: "Hospitals", desc: "Bulk supply and dependable dispatch for day-to-day and urgent device needs." },
              { icon: HeartPulse, title: "Clinics", desc: "Reliable access to essential devices with responsive support and streamlined ordering." },
              { icon: Microscope, title: "Diagnostic Centers", desc: "Supply continuity and distributor support for diagnostic workflows and lab operations." },
              { icon: Scissors, title: "OT & Surgical Teams", desc: "Procedure-focused product availability with technical coordination." },
              { icon: ClipboardList, title: "Procurement Teams", desc: "Fast quotations, compliance-ready vendor info, and simplified ordering." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-slate-50 rounded-2xl p-7 border border-slate-100 hover:border-teal-200 hover:shadow-md transition-all group" data-testid={`serve-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors">
                  <Icon size={20} className="text-teal-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 5. PRODUCT DIVISIONS ===== */}
      <section className="py-24 bg-slate-50" data-testid="divisions-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-teal-600 text-xs font-bold uppercase tracking-[0.2em] mb-3">Product Catalog</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
              Explore Product Divisions
            </h2>
            <p className="mt-4 text-slate-500 max-w-xl mx-auto">
              Browse our medical portfolio by division to find the right products faster.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {divisions.map((div) => {
              const meta = DIVISION_META[div.name] || { icon: Package, desc: "Medical devices and solutions.", bg: "bg-slate-50/70" };
              const Icon = meta.icon;
              return (
                <Link
                  key={div.name}
                  to={`/catalog?division=${encodeURIComponent(div.name)}`}
                  className={`group ${meta.bg} rounded-2xl p-7 border border-slate-100 hover:border-teal-300 hover:shadow-lg transition-all`}
                  data-testid={`division-card-${div.name.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
                      <Icon size={22} className="text-teal-600" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 bg-white px-2.5 py-1 rounded-full">
                      {div.product_count} products
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">{div.name}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">{meta.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore {div.name} <ChevronRight size={14} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== 6. WHY AGILE ORTHO ===== */}
      <section className="py-24 bg-white" data-testid="why-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-teal-600 text-xs font-bold uppercase tracking-[0.2em] mb-3">Why Agile Ortho</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
              More Than a Distributor
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {[
              { icon: BadgeCheck, title: "Licensed & Compliant Distribution", desc: "Authorized supply with the regulatory confidence hospitals and institutions expect." },
              { icon: MapPin, title: "Pan-Telangana Reach", desc: "Distribution support across all 33 districts with responsive coordination from Hyderabad." },
              { icon: Headphones, title: "Technical Product Guidance", desc: "Dedicated support for product selection, usage understanding, and hospital-facing coordination." },
              { icon: Zap, title: "Fast Institutional Dispatch", desc: "Built for real procurement timelines, urgent requirements, and repeat hospital ordering." },
              { icon: Globe, title: "Broad Medical Catalog", desc: "Multiple divisions in one place to simplify sourcing and reduce vendor fragmentation." },
              { icon: Users, title: "Relationship-Driven Service", desc: "Responsive communication, quotation support, and practical assistance when timelines matter." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-5 p-6 rounded-2xl hover:bg-slate-50 transition-colors" data-testid={`why-card-${title.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}`}>
                <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-teal-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1.5">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 7. FEATURED PRODUCTS ===== */}
      <section className="py-24 bg-slate-50" data-testid="featured-products">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-teal-600 text-xs font-bold uppercase tracking-[0.2em] mb-3">High Demand</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
                Featured Products
              </h2>
            </div>
            <Link to="/catalog" className="text-sm font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 hidden sm:flex">
              View All Products <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredProducts.slice(0, 8).map((p, i) => (
              <Link
                key={p.id}
                to={`/catalog/products/${p.id}`}
                className="group bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-lg hover:border-teal-200 transition-all"
                data-testid={`featured-product-${p.id}`}
              >
                <div className="h-44 bg-slate-50 flex items-center justify-center overflow-hidden p-4">
                  {p.images && p.images.length > 0 ? (
                    <img
                      src={`${API}/api/files/${p.images[0].storage_path}`}
                      alt={p.product_name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <Package size={40} className="text-slate-200" />
                  )}
                </div>
                <div className="p-5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                    {p.division}
                  </span>
                  {i < 2 && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Best Seller</span>}
                  <h3 className="font-bold text-slate-900 mt-2.5 group-hover:text-teal-600 transition-colors line-clamp-1">
                    {p.product_name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Link to="/catalog" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
              View All Products <ArrowRight size={14} className="inline" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 8. HOW ORDERING WORKS ===== */}
      <section className="py-24 bg-white" data-testid="ordering-process">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-teal-600 text-xs font-bold uppercase tracking-[0.2em] mb-3">Procurement Process</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
              How Ordering Works
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-teal-200" />
            {[
              { step: "01", icon: Send, title: "Share Your Requirement", desc: "Send your product list, department need, or procedure-based requirement." },
              { step: "02", icon: FileCheck, title: "Get Quote & Availability", desc: "Our team confirms pricing, availability, and suitable options." },
              { step: "03", icon: Truck, title: "Dispatch from Hyderabad", desc: "Products are processed and coordinated for fast delivery across Telangana." },
              { step: "04", icon: Headphones, title: "Delivery & Support", desc: "Reliable follow-through, technical coordination, and responsive communication." },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center relative" data-testid={`step-${step}`}>
                <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto relative z-10">
                  <Icon size={24} className="text-teal-600" />
                </div>
                <p className="text-xs font-bold text-teal-600 mt-4 uppercase tracking-wider">Step {step}</p>
                <h3 className="font-bold text-slate-900 mt-2">{title}</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 9. COMPLIANCE & TRUST BAND ===== */}
      <section className="py-16 bg-slate-50 border-y border-slate-200" data-testid="compliance-band">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Built for Institutional Trust</h2>
            <p className="text-slate-500 mt-2 text-sm">We support hospitals, clinics, and diagnostic centers with compliant supply and responsive coordination.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              "MD-42 Wholesale Drug License",
              "CDSCO Registered Devices",
              "GST & CIN Registered",
              "Authorized Distributor Network",
              "Pan-Telangana Service Coverage",
            ].map((badge) => (
              <span key={badge} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 shadow-sm">
                <BadgeCheck size={16} className="text-teal-600" /> {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 10. FINAL CTA BAND ===== */}
      <section className="py-12" data-testid="final-cta">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-slate-900 rounded-3xl py-16 px-8 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
              Need Bulk Pricing or Product Support?
            </h2>
            <p className="mt-4 text-slate-400 max-w-lg mx-auto">
              Get a quotation for your hospital, clinic, or diagnostic center from our Hyderabad team.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/20"
                data-testid="cta-quote-btn"
              >
                Request Bulk Quote
              </Link>
              <a
                href="https://wa.me/917416521222"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#25D366] text-white font-semibold rounded-lg hover:bg-[#1DA851] transition-colors"
                data-testid="cta-whatsapp-btn"
              >
                <MessageSquare size={16} /> WhatsApp Specialist
              </a>
              <a
                href="tel:+917416216262"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-slate-600 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                data-testid="cta-call-btn"
              >
                <Phone size={16} /> Call Now
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
