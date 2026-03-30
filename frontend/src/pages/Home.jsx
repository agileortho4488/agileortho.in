import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, ArrowRight, Shield, Award, Building2, MapPin,
  MessageCircle, Phone, ChevronDown, ChevronRight,
  Bone, HeartPulse, Activity, Microscope, ShieldCheck, Scissors,
  Wrench, Dumbbell, EarOff, Droplets, Heart, GitBranch, Cpu
} from "lucide-react";
import { getDivisions, getFeaturedProducts } from "@/lib/api";
import { COMPANY } from "@/lib/constants";
import { FadeUp, StaggerContainer, StaggerItem, ScaleIn } from "@/lib/motion";
import { useVisitor } from "@/context/VisitorContext";
import LeadCaptureModal from "@/components/LeadCaptureModal";
import { SEO, buildOrganizationSchema, buildLocalBusinessSchema } from "@/components/SEO";

const DIVISION_ICONS = {
  "Trauma": Bone, "Cardiovascular": HeartPulse, "Joint Replacement": Activity,
  "Diagnostics": Microscope, "Infection Prevention": ShieldCheck,
  "Endo Surgery": Scissors, "Instruments": Wrench, "Sports Medicine": Dumbbell,
  "ENT": EarOff, "Urology": Droplets, "Critical Care": Heart,
  "Peripheral Intervention": GitBranch, "Robotics": Cpu, "Spine": Bone,
};

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/ba46cd2b-59a7-4ec9-b669-726f82ef2be6/images/1a9163d6801209f9b5299054943c93e970d5743284fe9652166bc8cb79de42f6.png";

export default function Home() {
  const [divisions, setDivisions] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [leadModal, setLeadModal] = useState({ open: false, inquiryType: "", productInterest: "", whatsappMessage: "", source: "" });
  const { trackEvent } = useVisitor();

  useEffect(() => {
    getDivisions().then((r) => setDivisions(r.data.divisions || [])).catch(() => {});
    getFeaturedProducts().then((r) => setFeaturedProducts(r.data.products || [])).catch(() => {});
    trackEvent("page_view", { page: "/" });
  }, [trackEvent]);

  const totalProducts = divisions.reduce((s, d) => s + (d.product_count || 0), 0);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      trackEvent("search", { search_query: searchQuery.trim(), page: "/" });
      window.location.href = `/catalog?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const openLeadCapture = (inquiryType, productInterest, whatsappMessage, source) => {
    setLeadModal({ open: true, inquiryType, productInterest, whatsappMessage, source });
  };

  return (
    <div className="bg-[#0A0A0A]">
      <SEO
        title="Meril Medical Device Distributor in Hyderabad & Telangana"
        description={`Agile Healthcare is the authorized Meril Life Sciences master franchise for Telangana. Browse ${totalProducts > 0 ? totalProducts + '+' : '810+'} verified medical devices across ${divisions.length || 13} clinical divisions — Trauma, Cardiovascular, Joint Replacement, Diagnostics and more.`}
        canonical="/"
        jsonLd={[buildOrganizationSchema(), buildLocalBusinessSchema()]}
      />
      {/* ===== HERO ===== */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0">
          <img src={HERO_BG} alt="Meril Life Sciences medical devices — surgical implants, cardiovascular stents, and diagnostic equipment for hospitals in Hyderabad and Telangana" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-[#0A0A0A]/50" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* LEFT: Text */}
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-3 mb-6"
              >
                <span className="h-px w-10 bg-[#D4AF37]" />
                <span className="text-xs font-bold text-[#D4AF37] tracking-[0.25em] uppercase" data-testid="hero-overline">
                  Meril Authorized Distributor
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-white leading-[1.1]"
                data-testid="hero-title" style={{ fontFamily: 'Outfit' }}
              >
                Meril Medical
                <br />
                <span className="text-gradient-gold font-medium">Devices</span> for
                <br />
                Hyderabad & Telangana
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6 text-base sm:text-lg text-white/70 max-w-lg leading-[1.75]"
                data-testid="hero-subtitle"
              >
                Browse <span className="text-white font-semibold">{totalProducts > 0 ? `${totalProducts}+` : "800+"}</span> verified products across{" "}
                <span className="text-white font-semibold">{divisions.length || 13}</span> clinical divisions.
                Serving hospitals and clinics in all 33 districts.
              </motion.p>

              {/* Search */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className={`mt-8 transition-all duration-300 max-w-lg ${searchFocused ? "scale-[1.02]" : ""}`}
              >
                <form onSubmit={handleSearch} className="flex items-center gap-0" data-testid="hero-search-form">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                      placeholder="Search by name or SKU (e.g., KET 2.4mm Locking Plate)"
                      className={`w-full bg-white/5 border rounded-l-sm pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none transition-all duration-300 ${searchFocused ? "border-[#D4AF37]/60 bg-white/8 shadow-lg shadow-[#D4AF37]/5" : "border-white/10"}`}
                      data-testid="hero-search-input"
                    />
                  </div>
                  <button type="submit" className="bg-[#D4AF37] hover:bg-[#F2C94C] text-black font-semibold px-6 py-3.5 rounded-r-sm text-sm transition-all hover:shadow-lg hover:shadow-[#D4AF37]/20" data-testid="hero-search-btn">
                    Search
                  </button>
                </form>
                <p className="mt-2 text-xs text-white/35 pl-1">Try: "trauma plates", "BioMime stent", "knee implant"</p>
              </motion.div>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="mt-8 flex flex-wrap gap-4"
              >
                <Link to="/catalog" className="group inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#F2C94C] text-black font-semibold rounded-sm px-7 py-3.5 text-sm transition-all hover:shadow-lg hover:shadow-[#D4AF37]/20" data-testid="hero-cta-catalog">
                  Browse Catalog <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <button onClick={() => openLeadCapture("Sales Enquiry", "", "Hi, I'd like to check product availability and pricing for my hospital.", "homepage_hero")}
                  className="group inline-flex items-center gap-2 border border-white/15 hover:border-[#D4AF37]/40 hover:bg-white/5 text-white font-medium rounded-sm px-7 py-3.5 text-sm transition-all" data-testid="hero-cta-availability">
                  <MessageCircle size={14} /> Check Availability & Pricing
                </button>
              </motion.div>
            </div>

            {/* RIGHT: Quick Stats */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {[
                { value: `${totalProducts || 810}+`, label: "Verified Products", sub: "Across all divisions" },
                { value: `${divisions.length || 13}`, label: "Clinical Divisions", sub: "Complete coverage" },
                { value: "33", label: "Districts", sub: "All of Telangana" },
                { value: "24/7", label: "AI Support", sub: "Instant product help" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="card-premium rounded-sm p-6 text-center hover-lift"
                  data-testid={`hero-stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <p className="text-3xl font-light text-white" style={{ fontFamily: 'Outfit' }}>{stat.value}</p>
                  <p className="text-xs text-[#D4AF37] font-semibold mt-1 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-[11px] text-white/40 mt-0.5">{stat.sub}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll Guidance */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce" data-testid="scroll-hint">
          <span className="text-[10px] text-white/30 uppercase tracking-widest font-medium">Browse Categories</span>
          <ChevronDown size={16} className="text-[#D4AF37]/50" />
        </div>
      </section>

      {/* ===== TRUST BAR ===== */}
      <section className="border-y border-white/[0.06] bg-[#0D0D0D]" data-testid="trust-bar">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex flex-wrap items-center justify-center gap-8 sm:gap-14">
          {[
            { icon: Shield, label: "ISO 13485 Certified" },
            { icon: Award, label: "CDSCO Registered" },
            { icon: Building2, label: "Meril Authorized" },
            { icon: MapPin, label: "33 Districts" },
          ].map((badge) => (
            <div key={badge.label} className="flex items-center gap-2.5" data-testid={`trust-badge-${badge.label.toLowerCase().replace(/\s/g, '-')}`}>
              <badge.icon size={16} strokeWidth={1.5} className="text-[#2DD4BF]" />
              <span className="text-xs font-medium tracking-wide text-white/60">{badge.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== DIVISIONS — Alternating bg #111 ===== */}
      <section className="py-20 sm:py-24 bg-[#111]" data-testid="divisions-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <FadeUp>
            <div className="text-center mb-12">
              <span className="text-xs font-bold text-[#D4AF37] tracking-[0.2em] uppercase">Product Divisions</span>
              <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-white" style={{ fontFamily: 'Outfit' }}>
                Meril Clinical Divisions
              </h2>
              <p className="mt-3 text-sm text-white/50 max-w-md mx-auto">Select a division to explore verified products with specifications and SKU details</p>
            </div>
          </FadeUp>

          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {divisions.map((div) => {
              const Icon = DIVISION_ICONS[div.name] || Bone;
              return (
                <StaggerItem key={div.name}>
                  <Link
                    to={`/catalog/${div.slug || div.name.toLowerCase().replace(/\s+/g, "-")}`}
                    className="group card-premium rounded-sm p-5 sm:p-6 text-center hover-lift block"
                    data-testid={`division-card-${div.slug}`}
                  >
                    <div className="mx-auto w-12 h-12 rounded-sm bg-[#D4AF37]/8 border border-[#D4AF37]/15 flex items-center justify-center mb-4 group-hover:bg-[#D4AF37]/15 group-hover:border-[#D4AF37]/30 transition-all duration-300">
                      <Icon size={20} strokeWidth={1.5} className="text-[#D4AF37]" />
                    </div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-[#D4AF37] transition-colors" style={{ fontFamily: 'Outfit' }}>
                      {div.name}
                    </h3>
                    <p className="mt-1 text-xs text-[#2DD4BF] font-medium">{div.product_count} products</p>
                    <p className="mt-1.5 text-[11px] text-white/40 line-clamp-1">
                      {(div.categories || []).slice(0, 3).join(", ")}
                    </p>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerContainer>

          <div className="text-center mt-10">
            <Link to="/catalog" className="group inline-flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#F2C94C] font-medium transition-colors" data-testid="view-all-divisions">
              View Full Catalog <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FEATURED PRODUCTS — Back to dark ===== */}
      {featuredProducts.length > 0 && (
        <section className="py-20 sm:py-24 bg-[#0A0A0A]" data-testid="featured-section">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <FadeUp>
              <div className="text-center mb-12">
                <span className="text-xs font-bold text-[#D4AF37] tracking-[0.2em] uppercase">Featured</span>
                <h2 className="mt-2 text-2xl sm:text-3xl font-medium tracking-tight text-white" style={{ fontFamily: 'Outfit' }}>
                  Popular Products
                </h2>
              </div>
            </FadeUp>

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5" staggerDelay={0.06}>
              {featuredProducts.slice(0, 8).map((p) => (
                <StaggerItem key={p.slug || p.id}>
                  <Link
                    to={`/catalog/products/${p.slug || p.id}`}
                    className="group card-premium rounded-sm overflow-hidden hover-lift block"
                    data-testid={`featured-product-${p.slug || p.id}`}
                  >
                  {p.images && p.images[0] ? (
                    <div className="aspect-[4/3] bg-[#0D0D0D] overflow-hidden flex items-center justify-center p-6">
                      <img
                        src={`${process.env.REACT_APP_BACKEND_URL}/api/files/${p.images[0].storage_path}`}
                        alt={p.product_name}
                        className="max-w-full max-h-full object-contain opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-[#0D0D0D] flex items-center justify-center">
                      <Bone size={36} className="text-white/8" />
                    </div>
                  )}
                  <div className="p-5 text-center">
                    <p className="text-[11px] text-[#D4AF37] font-semibold uppercase tracking-wider mb-1.5">{p.division_canonical || p.division}</p>
                    <h3 className="text-sm font-semibold text-white group-hover:text-[#D4AF37] transition-colors line-clamp-2 leading-snug" style={{ fontFamily: 'Outfit' }}>
                      {p.product_name_display || p.product_name}
                    </h3>
                    {p.semantic_material_default && (
                      <span className="inline-block mt-2 text-[10px] font-semibold text-[#2DD4BF] bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 px-2.5 py-0.5 rounded">
                        {p.semantic_material_default}
                      </span>
                    )}
                    {!p.semantic_material_default && p.semantic_brand_system && (
                      <p className="mt-1.5 text-xs text-white/45">{p.semantic_brand_system}</p>
                    )}
                    <div className="mt-3 flex items-center justify-center gap-1 text-xs text-[#D4AF37] font-medium opacity-0 group-hover:opacity-100 transition-all duration-300">
                      View Details <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}

      {/* ===== CTA — Alternating bg #111 ===== */}
      <section className="py-20 sm:py-28 bg-[#111]" data-testid="cta-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <ScaleIn>
            <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-white" style={{ fontFamily: 'Outfit' }}>
              Equip Your Hospital with <span className="text-[#D4AF37] font-medium">Meril</span> Medical Devices
            </h2>
            <p className="mt-4 text-sm sm:text-base text-white/55">
              Connect with our product specialists for bulk quotes, hospital procurement, and technical specifications.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <button onClick={() => openLeadCapture("Catalog Request", "", "Hi, I'd like to receive the complete Agile Ortho product catalog PDF.", "homepage_cta_catalog")}
                className="group inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#F2C94C] text-black font-semibold rounded-sm px-8 py-3.5 text-sm transition-all hover:shadow-lg hover:shadow-[#D4AF37]/20" data-testid="cta-get-catalog">
                Get Product Catalog <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => openLeadCapture("Bulk Procurement", "", "Hi, I'd like to discuss bulk procurement for my hospital.", "homepage_cta_sales")}
                className="group inline-flex items-center gap-2 border border-white/15 hover:border-[#D4AF37]/40 hover:bg-white/5 text-white font-medium rounded-sm px-8 py-3.5 text-sm transition-all" data-testid="cta-whatsapp">
                <MessageCircle size={14} /> Talk to Sales
              </button>
              <Link to="/contact" className="group inline-flex items-center gap-2 border border-white/15 hover:border-white/30 hover:bg-white/5 text-white font-medium rounded-sm px-8 py-3.5 text-sm transition-all" data-testid="cta-contact">
                <Phone size={14} /> Contact Us
              </Link>
            </div>
            </div>
          </ScaleIn>
        </div>
      </section>

      {/* Lead Capture Modal */}
      <LeadCaptureModal
        isOpen={leadModal.open}
        onClose={() => setLeadModal({ ...leadModal, open: false })}
        inquiryType={leadModal.inquiryType}
        productInterest={leadModal.productInterest}
        whatsappMessage={leadModal.whatsappMessage}
        source={leadModal.source}
      />
    </div>
  );
}
