import { Link } from "react-router-dom";
import { MapPin, ChevronRight, ArrowRight, Phone, MessageSquare, BadgeCheck, Mail } from "lucide-react";
import { TELANGANA_DISTRICTS } from "../lib/districts";
import { SEO, buildBreadcrumbSchema } from "../components/SEO";

export default function DistrictsIndex() {
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Districts" },
  ];

  return (
    <div className="min-h-screen bg-white font-[Manrope]">
      <SEO
        title="Medical Device Supply Across 33 Districts of Telangana"
        description="Agile Ortho serves hospitals, clinics, and diagnostic centers across all 33 districts of Telangana with authorized Meril Life Sciences medical devices. Find your district for localized supply and support."
        canonical="/districts"
        jsonLd={buildBreadcrumbSchema(breadcrumbs)}
      />

      {/* ===== DARK HERO ===== */}
      <section className="bg-slate-900 relative overflow-hidden" data-testid="districts-hero">
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500 via-transparent to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-12 lg:py-16">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-5" data-testid="breadcrumb">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={12} />
            <span className="text-white font-medium">Districts</span>
          </nav>

          <div className="max-w-3xl">
            <p className="text-teal-400 text-xs font-bold uppercase tracking-[0.2em] mb-4">Pan-Telangana Coverage</p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight" data-testid="districts-page-title">
              Medical Device Supply Across All 33 Districts
            </h1>
            <p className="mt-5 text-lg text-slate-300 leading-relaxed max-w-2xl">
              Authorized Meril Life Sciences distributor serving hospitals, clinics, and diagnostic centers across every district in Telangana with fast dispatch from Hyderabad.
            </p>
          </div>
        </div>
      </section>

      {/* ===== DISTRICT GRID ===== */}
      <section className="py-16" data-testid="district-grid">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TELANGANA_DISTRICTS.map((d) => (
              <Link
                key={d.slug}
                to={`/districts/${d.slug}`}
                className="group bg-white border border-slate-100 rounded-2xl p-6 hover:border-teal-200 hover:shadow-lg transition-all"
                data-testid={`district-card-${d.slug}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                    <MapPin size={18} className="text-teal-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">
                    {d.population}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg group-hover:text-teal-700 transition-colors">{d.name}</h3>
                <p className="text-xs text-teal-600 font-medium mt-0.5">{d.tagline}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {d.medicalFocus.slice(0, 3).map((f) => (
                    <span key={f} className="text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">{f}</span>
                  ))}
                  {d.medicalFocus.length > 3 && (
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">+{d.medicalFocus.length - 3} more</span>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  View Details <ArrowRight size={13} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TRUST STRIP ===== */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-4">
            {[
              "MD-42 Licensed Distributor",
              "All 33 Telangana Districts",
              "CDSCO Registered Devices",
              "Authorized Meril Distributor",
            ].map((badge) => (
              <span key={badge} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 shadow-sm">
                <BadgeCheck size={16} className="text-teal-600" /> {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-12" data-testid="districts-cta">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-slate-900 rounded-2xl py-14 px-8 text-center">
            <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Need Medical Devices Anywhere in Telangana?
            </h2>
            <p className="mt-3 text-slate-400 max-w-lg mx-auto text-sm">
              We deliver across all 33 districts from our Hyderabad warehouse. Get a quotation for your hospital today.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Mail size={16} /> Request Quote
              </Link>
              <a
                href="https://wa.me/917416521222"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#25D366] text-white font-semibold rounded-lg hover:bg-[#1DA851] transition-colors"
              >
                <MessageSquare size={16} /> WhatsApp
              </a>
              <a
                href="tel:+917416216262"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-slate-600 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
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
