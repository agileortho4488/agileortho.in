import { useParams, Link } from "react-router-dom";
import {
  ChevronRight, Phone, MessageSquare, MapPin, Building2,
  Bone, HeartPulse, Microscope, Stethoscope, Scissors, Shield,
  Activity, Syringe, Scan, CircuitBoard, Package, BadgeCheck,
  ArrowRight, Mail, Dumbbell, Disc, Replace, Wrench
} from "lucide-react";
import { getDistrictBySlug, TELANGANA_DISTRICTS } from "../lib/districts";
import { SEO, buildBreadcrumbSchema, buildFAQSchema } from "../components/SEO";

const DIVISION_ICONS = {
  "Joint Replacement": Replace,
  "Trauma": Bone,
  "Sports Medicine": Dumbbell,
  "Spine": Disc,
  "Instruments": Wrench,
  "Cardiovascular": HeartPulse,
  "Diagnostics": Microscope,
  "ENT": Stethoscope,
  "Endo-surgical": Scissors,
  "Infection Prevention": Shield,
  "Peripheral Intervention": Activity,
  "Critical Care": Syringe,
  "Urology": Scan,
  "Robotics": CircuitBoard,
};

export default function DistrictPage() {
  const { slug } = useParams();
  const district = getDistrictBySlug(slug);

  if (!district) {
    return (
      <div className="min-h-screen flex items-center justify-center font-[Manrope]">
        <div className="text-center">
          <MapPin size={48} className="mx-auto text-white/35 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">District Not Found</h1>
          <p className="text-white/40 mb-4">The district you're looking for doesn't exist.</p>
          <Link to="/districts" className="text-[#2DD4BF] font-semibold hover:text-[#2DD4BF]">
            View All Districts
          </Link>
        </div>
      </div>
    );
  }

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Districts", url: "/districts" },
    { name: district.name },
  ];

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: `Agile Healthcare - Medical Device Distributor in ${district.name}`,
    description: `Authorized Meril Life Sciences distributor serving hospitals, clinics, and diagnostic centers in ${district.name}, Telangana.`,
    url: `https://agileortho.in/districts/${district.slug}`,
    telephone: "+917416216262",
    address: {
      "@type": "PostalAddress",
      addressLocality: district.name,
      addressRegion: "Telangana",
      addressCountry: "IN"
    },
    areaServed: {
      "@type": "City",
      name: district.name
    }
  };

  // District-specific FAQs for rich search results
  const districtFaqs = [
    {
      question: `Who is the authorized Meril medical device distributor in ${district.name}?`,
      answer: `Agile Healthcare is the authorized Meril Life Sciences master franchise distributor for ${district.name} and all 33 districts of Telangana. We supply 810+ medical devices across 13 clinical divisions including ${district.medicalFocus.slice(0, 3).join(", ")}.`,
    },
    {
      question: `What medical devices are available in ${district.name}, Telangana?`,
      answer: `We supply ${district.medicalFocus.join(", ")} devices from Meril Life Sciences to hospitals in ${district.name}. Products include orthopedic implants, cardiovascular stents, diagnostic analyzers, and surgical instruments. All products are CDSCO registered and ISO 13485 certified.`,
    },
    {
      question: `Which hospitals in ${district.name} does Agile Healthcare serve?`,
      answer: `We serve major healthcare institutions in ${district.name} including ${district.hospitals.slice(0, 4).join(", ")}${district.hospitals.length > 4 ? " and more" : ""}. We supply to both government and private hospitals, clinics, and diagnostic centers.`,
    },
    {
      question: `How to order medical devices in ${district.name}?`,
      answer: `Contact Agile Healthcare at +91 74162 16262, WhatsApp +91 74165 21222, or email info@agileortho.in. We offer direct dispatch from our Hyderabad warehouse to ${district.name} with fast turnaround for urgent requirements.`,
    },
  ];

  const nearby = TELANGANA_DISTRICTS.filter(
    (d) => d.slug !== district.slug
  ).slice(0, 6);

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-[Manrope]">
      <SEO
        title={`Medical Devices in ${district.name}, Telangana`}
        description={`Authorized Meril Life Sciences distributor in ${district.name}, Telangana. Bulk supply of orthopedic implants, cardiovascular stents, diagnostic analyzers, surgical instruments for hospitals and clinics. ${district.tagline}.`}
        canonical={`/districts/${district.slug}`}
        jsonLd={[localBusinessSchema, buildBreadcrumbSchema(breadcrumbs), buildFAQSchema(districtFaqs)]}
      />

      {/* ===== DARK HERO ===== */}
      <section className="bg-[#0D0D0D] relative overflow-hidden" data-testid="district-hero">
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500 via-transparent to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-12 lg:py-16">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-white/45 mb-6" data-testid="breadcrumb">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={12} />
            <Link to="/districts" className="hover:text-white transition-colors">Districts</Link>
            <ChevronRight size={12} />
            <span className="text-white font-medium">{district.name}</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2DD4BF]/100/10 border border-teal-500/20 text-teal-400 text-xs font-bold uppercase tracking-[0.2em] mb-5">
              <MapPin size={13} /> {district.tagline}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight" data-testid="district-title">
              Medical Devices in {district.name}, Telangana
            </h1>
            <p className="mt-5 text-lg text-white/35 leading-relaxed max-w-2xl">
              Authorized Meril Life Sciences distributor serving hospitals, clinics, and diagnostic centers in {district.name}. Fast dispatch from Hyderabad with dedicated product support.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-teal-600 text-white font-semibold rounded-sm hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/20"
                data-testid="district-quote-btn"
              >
                Request Bulk Quote for {district.name}
              </Link>
              <a
                href="https://wa.me/917416521222"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#25D366] text-white font-semibold rounded-sm hover:bg-[#1DA851] transition-colors"
                data-testid="district-whatsapp-btn"
              >
                <MessageSquare size={16} /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DISTRICT INFO ===== */}
      <section className="py-16 bg-[#0A0A0A]" data-testid="district-info">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Main content */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-white tracking-tight mb-4">
                Medical Device Supply in {district.name}
              </h2>
              <p className="text-white/50 leading-relaxed mb-6">
                {district.description}
              </p>
              <p className="text-white/50 leading-relaxed">
                Agile Ortho provides reliable, compliant medical device distribution to healthcare institutions in {district.name} from our Hyderabad warehouse. With MD-42 licensing, CDSCO-registered products, and dedicated logistics, we ensure timely supply of Meril Life Sciences devices across all medical divisions.
              </p>
            </div>

            {/* Quick stats */}
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/[0.06] rounded-sm p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45 mb-1">District Population</p>
                <p className="text-2xl font-bold text-white">{district.population}</p>
              </div>
              <div className="bg-white/5 border border-white/[0.06] rounded-sm p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45 mb-1">Key Focus Areas</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {district.medicalFocus.map((f) => (
                    <span key={f} className="text-xs font-medium text-[#2DD4BF] bg-[#2DD4BF]/10 border border-teal-100 px-2.5 py-1 rounded-full">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-white/5 border border-white/[0.06] rounded-sm p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45 mb-1">Supply</p>
                <p className="text-sm font-semibold text-white/70">Direct dispatch from Hyderabad</p>
                <p className="text-xs text-white/40 mt-1">Fast turnaround for urgent requirements</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOSPITALS WE SERVE ===== */}
      <section className="py-16 bg-white/5" data-testid="district-hospitals">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-[#2DD4BF] text-xs font-bold uppercase tracking-[0.2em] mb-3">Healthcare Institutions</p>
            <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Hospitals & Clinics in {district.name}
            </h2>
            <p className="mt-3 text-white/40 max-w-lg mx-auto text-sm">
              We supply medical devices to government hospitals, private multi-specialty centers, and clinics across {district.name}.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {district.hospitals.map((h) => (
              <div key={h} className="flex items-center gap-3 bg-[#0A0A0A] border border-white/[0.06] rounded-sm px-5 py-4">
                <Building2 size={18} className="text-[#2DD4BF] shrink-0" />
                <span className="text-sm font-medium text-white/70">{h}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRODUCT DIVISIONS ===== */}
      <section className="py-16 bg-[#0A0A0A]" data-testid="district-divisions">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-[#2DD4BF] text-xs font-bold uppercase tracking-[0.2em] mb-3">Product Catalog</p>
            <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Medical Device Divisions Available in {district.name}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {district.medicalFocus.map((div) => {
              const Icon = DIVISION_ICONS[div] || Package;
              return (
                <Link
                  key={div}
                  to={`/products?division=${encodeURIComponent(div)}`}
                  className="group bg-white/5 border border-white/[0.06] rounded-sm p-5 text-center hover:border-[#2DD4BF]/20 hover:shadow-md transition-all"
                  data-testid={`district-division-${div.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <div className="w-12 h-12 rounded-sm bg-[#2DD4BF]/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-teal-100 transition-colors">
                    <Icon size={22} className="text-[#2DD4BF]" />
                  </div>
                  <h3 className="font-semibold text-white text-sm">{div}</h3>
                  <span className="text-xs text-[#2DD4BF] font-medium mt-2 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Browse <ChevronRight size={11} />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== TRUST & COMPLIANCE ===== */}
      <section className="py-12 bg-white/5 border-y border-white/10" data-testid="district-compliance">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-4">
            {[
              "MD-42 Licensed Distributor",
              "CDSCO Registered Devices",
              "ISO 13485 Supply Chain",
              "Authorized Meril Distributor",
            ].map((badge) => (
              <span key={badge} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-[#0A0A0A] border border-white/10 text-sm font-medium text-white/70 shadow-sm">
                <BadgeCheck size={16} className="text-[#2DD4BF]" /> {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ SECTION (for SEO rich results) ===== */}
      <section className="py-16 bg-[#0A0A0A]" data-testid="district-faq">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-[#2DD4BF] text-xs font-bold uppercase tracking-[0.2em] mb-3">Frequently Asked</p>
            <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Medical Devices in {district.name} — FAQs
            </h2>
          </div>
          <div className="space-y-4">
            {districtFaqs.map((faq, i) => (
              <details
                key={i}
                className="group bg-white/5 border border-white/[0.06] rounded-sm overflow-hidden"
                data-testid={`district-faq-${i}`}
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer select-none">
                  <span className="text-sm font-semibold text-white/80 group-open:text-[#2DD4BF] transition-colors pr-4">{faq.question}</span>
                  <ChevronRight size={16} className="text-white/30 shrink-0 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-6 pb-5 text-sm text-white/45 leading-relaxed">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA BANNER ===== */}
      <section className="py-12" data-testid="district-cta">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-[#0D0D0D] rounded-sm py-14 px-8 text-center">
            <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Need Medical Devices in {district.name}?
            </h2>
            <p className="mt-3 text-white/45 max-w-lg mx-auto text-sm">
              Get competitive bulk pricing for your hospital, clinic, or diagnostic center. We deliver across all of {district.name} from Hyderabad.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-teal-600 text-white font-semibold rounded-sm hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/20"
                data-testid="district-cta-quote"
              >
                <Mail size={16} /> Request Quote
              </Link>
              <a
                href="https://wa.me/917416521222"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#25D366] text-white font-semibold rounded-sm hover:bg-[#1DA851] transition-colors"
              >
                <MessageSquare size={16} /> WhatsApp
              </a>
              <a
                href="tel:+917416216262"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-slate-600 text-white font-semibold rounded-sm hover:bg-slate-800 transition-colors"
              >
                <Phone size={16} /> Call Now
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== OTHER DISTRICTS ===== */}
      <section className="py-16 bg-[#0A0A0A]" data-testid="other-districts">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[#2DD4BF] text-xs font-bold uppercase tracking-[0.2em] mb-2">We Also Serve</p>
              <h2 className="text-2xl font-bold text-white tracking-tight">Other Districts in Telangana</h2>
            </div>
            <Link
              to="/districts"
              className="text-sm text-[#2DD4BF] font-semibold hover:text-[#2DD4BF] flex items-center gap-1 hidden sm:flex"
            >
              All 33 Districts <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {nearby.map((d) => (
              <Link
                key={d.slug}
                to={`/districts/${d.slug}`}
                className="group bg-white/5 border border-white/[0.06] rounded-sm px-4 py-3 hover:border-[#2DD4BF]/20 hover:shadow-sm transition-all text-center"
                data-testid={`other-district-${d.slug}`}
              >
                <MapPin size={16} className="mx-auto text-white/45 group-hover:text-[#2DD4BF] transition-colors mb-1.5" />
                <p className="text-sm font-semibold text-white/70 group-hover:text-[#2DD4BF] transition-colors">{d.name}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center sm:hidden">
            <Link to="/districts" className="text-sm text-[#2DD4BF] font-semibold">
              View All 33 Districts <ArrowRight size={14} className="inline" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
