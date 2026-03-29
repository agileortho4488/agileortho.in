import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, MessageCircle, ChevronDown, Bone, HeartPulse, Activity, Microscope, ShieldCheck, Scissors, Wrench, Dumbbell, EarOff, Droplets, Heart, GitBranch, Cpu, Phone } from "lucide-react";
import { COMPANY } from "@/lib/constants";
import { dropdownVariants } from "@/lib/motion";
import LeadCaptureModal from "@/components/LeadCaptureModal";

const DIVISIONS = [
  { name: "Trauma", slug: "trauma", icon: Bone },
  { name: "Joint Replacement", slug: "joint-replacement", icon: Activity },
  { name: "Cardiovascular", slug: "cardiovascular", icon: HeartPulse },
  { name: "Diagnostics", slug: "diagnostics", icon: Microscope },
  { name: "Spine", slug: "spine", icon: Bone },
  { name: "Sports Medicine", slug: "sports-medicine", icon: Dumbbell },
  { name: "Endo Surgery", slug: "endo-surgery", icon: Scissors },
  { name: "ENT", slug: "ent", icon: EarOff },
  { name: "Infection Prevention", slug: "infection-prevention", icon: ShieldCheck },
  { name: "Instruments", slug: "instruments", icon: Wrench },
  { name: "Urology", slug: "urology", icon: Droplets },
  { name: "Critical Care", slug: "critical-care", icon: Heart },
  { name: "Peripheral Intervention", slug: "peripheral-intervention", icon: GitBranch },
  { name: "Robotics", slug: "robotics", icon: Cpu },
];

const SOLUTIONS = [
  { name: "Fracture Fixation", slug: "trauma", desc: "Plates, screws & nails" },
  { name: "Joint Replacement", slug: "joint-replacement", desc: "Hip, knee & shoulder" },
  { name: "Cardiac Intervention", slug: "cardiovascular", desc: "Stents & scaffolds" },
  { name: "Infection Control", slug: "infection-prevention", desc: "Sterilization systems" },
  { name: "Minimally Invasive", slug: "endo-surgery", desc: "Endo-surgical devices" },
  { name: "Diagnostic Systems", slug: "diagnostics", desc: "Analyzers & reagents" },
];

function DropdownMenu({ trigger, children, testId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} data-testid={testId}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 text-sm font-medium tracking-wide transition-colors py-2 ${open ? "text-[#D4AF37]" : "text-white/80 hover:text-white"}`}
      >
        {trigger} <ChevronDown size={12} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdownVariants} initial="hidden" animate="visible" exit="exit"
            className="absolute top-full left-0 pt-1 z-50 origin-top"
          >
            <div className="w-64 bg-[#141414] border border-white/10 rounded-sm shadow-2xl shadow-black/50 py-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SiteHeader() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const [leadModal, setLeadModal] = useState({ open: false, inquiryType: "", productInterest: "", whatsappMessage: "", source: "" });

  const closeMobile = () => { setMobileMenuOpen(false); setMobileExpanded(null); };
  const openLead = (type, msg, src) => setLeadModal({ open: true, inquiryType: type, productInterest: "", whatsappMessage: msg, source: src });

  return (
    <>
      <header
        data-testid="site-header"
        className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0A0A0A]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0A0A0A]/70"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6">
          <Link data-testid="site-logo-link" to="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/agile_healthcare_logo.png" alt="Agile Healthcare" className="h-10 sm:h-14 w-auto invert" data-testid="site-logo-mark" />
            <div className="leading-tight">
              <span className="text-sm sm:text-base font-bold text-white tracking-tight" style={{ fontFamily: 'Outfit' }}>AGILE HEALTHCARE</span>
              <span className="hidden sm:block text-[9px] text-[#D4AF37] font-semibold tracking-[0.15em] uppercase">Meril Authorized</span>
            </div>
          </Link>

          <nav data-testid="site-nav" className="hidden items-center gap-7 lg:flex">
            {/* Explore Products dropdown */}
            <DropdownMenu trigger="Explore Products" testId="nav-explore-dropdown">
              <div className="grid grid-cols-1 gap-0.5 max-h-80 overflow-y-auto px-1">
                {DIVISIONS.map((div) => {
                  const Icon = div.icon;
                  return (
                    <Link
                      key={div.slug}
                      to={`/catalog/${div.slug}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-white/5 transition-colors group"
                      data-testid={`nav-div-${div.slug}`}
                    >
                      <Icon size={14} className="text-[#D4AF37] opacity-60 group-hover:opacity-100" />
                      <span className="text-sm text-white/70 group-hover:text-white transition-colors">{div.name}</span>
                    </Link>
                  );
                })}
                <div className="border-t border-white/[0.06] mt-1 pt-1 px-3">
                  <Link to="/catalog" className="flex items-center gap-2 py-2.5 text-sm text-[#D4AF37] font-medium hover:text-[#F2C94C] transition-colors" data-testid="nav-all-products">
                    View All Products →
                  </Link>
                </div>
              </div>
            </DropdownMenu>

            {/* Solutions dropdown */}
            <DropdownMenu trigger="Solutions" testId="nav-solutions-dropdown">
              <div className="px-1">
                {SOLUTIONS.map((sol) => (
                  <Link
                    key={sol.slug}
                    to={`/catalog/${sol.slug}`}
                    className="flex flex-col px-3 py-2.5 rounded-sm hover:bg-white/5 transition-colors group"
                    data-testid={`nav-sol-${sol.slug}`}
                  >
                    <span className="text-sm text-white/70 group-hover:text-white font-medium transition-colors">{sol.name}</span>
                    <span className="text-xs text-white/35">{sol.desc}</span>
                  </Link>
                ))}
              </div>
            </DropdownMenu>

            <NavLink to="/districts" className={({ isActive }) => `text-sm font-medium tracking-wide transition-colors ${isActive ? "text-[#D4AF37]" : "text-white/80 hover:text-white"}`} data-testid="nav-districts-link">
              For Hospitals
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => `text-sm font-medium tracking-wide transition-colors ${isActive ? "text-[#D4AF37]" : "text-white/80 hover:text-white"}`} data-testid="nav-about-link">
              About
            </NavLink>
            <NavLink to="/contact" className={({ isActive }) => `text-sm font-medium tracking-wide transition-colors ${isActive ? "text-[#D4AF37]" : "text-white/80 hover:text-white"}`} data-testid="nav-contact-link">
              Contact
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            {/* WhatsApp Dropdown */}
            <div className="hidden sm:block relative" data-testid="header-whatsapp-dropdown">
              <DropdownMenu trigger={<span className="inline-flex items-center gap-2 rounded-sm bg-[#D4AF37] px-5 py-2 text-sm font-semibold text-black hover:bg-[#F2C94C] transition-all hover:shadow-lg hover:shadow-[#D4AF37]/20"><MessageCircle size={14} strokeWidth={2} /> WhatsApp</span>} testId="header-wa-menu">
                <div className="px-1">
                  <button onClick={() => openLead("Sales Enquiry", "Hi, I'd like to check product availability and pricing for my hospital.", "header_wa_sales")}
                    className="flex flex-col w-full text-left px-3 py-2.5 rounded-sm hover:bg-white/5 transition-colors group" data-testid="wa-sales">
                    <span className="text-sm text-white/70 group-hover:text-white font-medium transition-colors">Sales & Availability</span>
                    <span className="text-xs text-white/35">Check pricing & stock</span>
                  </button>
                  <button onClick={() => openLead("Catalog Request", "Hi, I'd like to request the Agile Ortho product catalog (PDF) for our hospital.", "header_wa_catalog")}
                    className="flex flex-col w-full text-left px-3 py-2.5 rounded-sm hover:bg-white/5 transition-colors group" data-testid="wa-catalog">
                    <span className="text-sm text-white/70 group-hover:text-white font-medium transition-colors">Request Catalog (PDF)</span>
                    <span className="text-xs text-white/35">Get the full product list</span>
                  </button>
                  <button onClick={() => openLead("Technical Support", "Hi, I need technical support regarding a Meril medical device.", "header_wa_support")}
                    className="flex flex-col w-full text-left px-3 py-2.5 rounded-sm hover:bg-white/5 transition-colors group" data-testid="wa-support">
                    <span className="text-sm text-white/70 group-hover:text-white font-medium transition-colors">Technical Support</span>
                    <span className="text-xs text-white/35">Device queries & assistance</span>
                  </button>
                </div>
              </DropdownMenu>
            </div>

            <button
              data-testid="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-sm border border-white/10 bg-white/5 text-white lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div data-testid="mobile-menu" className="border-t border-white/[0.06] bg-[#0A0A0A] px-4 py-5 lg:hidden max-h-[80vh] overflow-y-auto">
            <nav className="flex flex-col gap-1">
              {/* Explore Products */}
              <button onClick={() => setMobileExpanded(mobileExpanded === "products" ? null : "products")} className="flex items-center justify-between px-3 py-3 text-sm font-medium text-white/80">
                Explore Products <ChevronDown size={14} className={`transition-transform ${mobileExpanded === "products" ? "rotate-180" : ""}`} />
              </button>
              {mobileExpanded === "products" && (
                <div className="pl-4 pb-2 space-y-0.5">
                  {DIVISIONS.map((div) => (
                    <Link key={div.slug} to={`/catalog/${div.slug}`} onClick={closeMobile} className="flex items-center gap-2 px-3 py-2 text-sm text-white/55 hover:text-white transition-colors">
                      <div.icon size={12} className="text-[#D4AF37]" /> {div.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Solutions */}
              <button onClick={() => setMobileExpanded(mobileExpanded === "solutions" ? null : "solutions")} className="flex items-center justify-between px-3 py-3 text-sm font-medium text-white/80">
                Solutions <ChevronDown size={14} className={`transition-transform ${mobileExpanded === "solutions" ? "rotate-180" : ""}`} />
              </button>
              {mobileExpanded === "solutions" && (
                <div className="pl-4 pb-2 space-y-0.5">
                  {SOLUTIONS.map((sol) => (
                    <Link key={sol.slug} to={`/catalog/${sol.slug}`} onClick={closeMobile} className="block px-3 py-2 text-sm text-white/55 hover:text-white transition-colors">{sol.name}</Link>
                  ))}
                </div>
              )}

              <Link to="/districts" onClick={closeMobile} className="px-3 py-3 text-sm font-medium text-white/80">For Hospitals</Link>
              <Link to="/about" onClick={closeMobile} className="px-3 py-3 text-sm font-medium text-white/80">About</Link>
              <Link to="/contact" onClick={closeMobile} className="px-3 py-3 text-sm font-medium text-white/80">Contact</Link>

              <div className="flex gap-2 mt-4">
                <button onClick={() => { closeMobile(); openLead("Sales Enquiry", "Hi, I'd like to enquire about medical devices.", "mobile_menu"); }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-sm bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-black">
                  <MessageCircle size={14} /> WhatsApp
                </button>
                <a href={`tel:${COMPANY.phone}`} className="flex-1 flex items-center justify-center gap-2 rounded-sm border border-white/15 px-5 py-3 text-sm font-medium text-white">
                  <Phone size={14} /> Call
                </a>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Sticky Mobile Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#0A0A0A]/95 backdrop-blur-lg border-t border-white/[0.06] px-4 py-2 safe-area-pb" data-testid="mobile-action-bar">
        <div className="flex items-center justify-around gap-2">
          <a href={`tel:${COMPANY.phone}`} className="flex flex-col items-center gap-0.5 py-1.5 px-3 text-white/60 hover:text-white transition-colors">
            <Phone size={18} />
            <span className="text-[10px] font-medium">Call</span>
          </a>
          <button onClick={() => openLead("Sales Enquiry", "Hi, I'd like to enquire about medical devices.", "mobile_bar")} className="flex flex-col items-center gap-0.5 py-1.5 px-3 text-[#D4AF37] hover:text-[#F2C94C] transition-colors">
            <MessageCircle size={18} />
            <span className="text-[10px] font-medium">WhatsApp</span>
          </button>
          <Link to="/catalog" className="flex flex-col items-center gap-0.5 py-1.5 px-3 text-white/60 hover:text-white transition-colors">
            <Bone size={18} />
            <span className="text-[10px] font-medium">Browse</span>
          </Link>
        </div>
      </div>

      {/* Lead Capture Modal */}
      <LeadCaptureModal
        isOpen={leadModal.open}
        onClose={() => setLeadModal({ ...leadModal, open: false })}
        inquiryType={leadModal.inquiryType}
        productInterest={leadModal.productInterest}
        whatsappMessage={leadModal.whatsappMessage}
        source={leadModal.source}
      />
    </>
  );
}
