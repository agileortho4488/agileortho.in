import Link from "next/link";
import { MapPin, Building2, Users, ArrowRight, MessageCircle } from "lucide-react";
import { TELANGANA_DISTRICTS } from "@/lib/districts";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/Motion";

export const metadata = {
  title: "Medical Device Distribution — All 33 Districts of Telangana",
  description:
    "Agile Ortho serves hospitals, clinics, and diagnostic centers across all 33 districts of Telangana with authorized Meril Life Sciences medical devices. Find your district for localized supply and support.",
  alternates: { canonical: "/districts" },
};

export default function DistrictsIndex() {
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.agileortho.in" },
      { "@type": "ListItem", position: 2, name: "Districts", item: "https://www.agileortho.in/districts" },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="districts-index">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      {/* Hero */}
      <section className="bg-[#0D0D0D] relative overflow-hidden" data-testid="districts-hero">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-20 relative z-10">
          <FadeUp>
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-8 bg-[#D4AF37]" />
              <span className="text-xs font-bold text-[#D4AF37] tracking-[0.2em] uppercase">
                Telangana Coverage
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight" data-testid="districts-page-title" style={{ fontFamily: "Outfit" }}>
              Serving All <span className="text-[#D4AF37]">33 Districts</span> of Telangana
            </h1>
            <p className="mt-4 max-w-3xl text-sm sm:text-base text-white/60 leading-relaxed">
              Authorized Meril Life Sciences medical device distribution from our Hyderabad warehouse.
              Fast delivery, localized support, and direct access to verified products for every hospital and clinic across the state.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* District Grid */}
      <section className="py-16" data-testid="districts-grid-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {TELANGANA_DISTRICTS.map((d) => (
              <StaggerItem key={d.slug}>
                <Link
                  href={`/districts/${d.slug}`}
                  className="card-premium rounded-sm p-6 group block"
                  data-testid={`district-card-${d.slug}`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-sm bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0 group-hover:bg-[#D4AF37]/20 transition-colors">
                      <MapPin size={16} className="text-[#D4AF37]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-white group-hover:text-[#D4AF37] transition-colors" style={{ fontFamily: "Outfit" }}>
                        {d.name}
                      </h3>
                      <p className="text-xs text-[#2DD4BF] font-medium mt-0.5">{d.tagline}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-white/55 mb-3">
                    <span className="flex items-center gap-1.5">
                      <Users size={11} className="text-[#D4AF37]" /> {d.population}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Building2 size={11} className="text-[#D4AF37]" /> {(d.hospitals || []).length} hospitals
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {(d.medicalFocus || []).slice(0, 3).map((focus) => (
                      <span key={focus} className="text-[10px] bg-white/5 text-white/60 px-2 py-0.5 rounded">
                        {focus}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 text-xs font-medium text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity">
                    View coverage <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#0D0D0D]" data-testid="districts-cta">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
          <FadeUp>
            <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight" style={{ fontFamily: "Outfit" }}>
              Need delivery to your <span className="text-[#D4AF37] font-medium">hospital</span>?
            </h2>
            <p className="mt-3 text-sm text-white/60 max-w-xl mx-auto">
              We deliver across all 33 districts from our Hyderabad warehouse. Get a quotation for your hospital today.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="https://wa.me/917416521222?text=Hi%2C%20I%27d%20like%20a%20quotation%20for%20my%20hospital."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#F2C94C] text-black font-semibold rounded-sm px-7 py-3 text-sm transition-all hover:shadow-lg hover:shadow-[#D4AF37]/20"
                data-testid="districts-cta-wa"
              >
                <MessageCircle size={14} /> Request Quotation
              </a>
              <Link href="/contact" className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 hover:bg-white/5 text-white font-medium rounded-sm px-7 py-3 text-sm transition-all">
                Contact Sales
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
