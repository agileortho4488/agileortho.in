import Link from "next/link";
import {
  ArrowRight, Shield, Award, Building2, MapPin, Phone, MessageCircle,
  Bone, HeartPulse, Activity, Microscope, ShieldCheck, Scissors,
  Wrench, Dumbbell, EarOff, Droplets, Heart, GitBranch, Cpu,
} from "lucide-react";
import { getDivisions, listCatalogProducts, backendFileUrl } from "@/lib/api";
import { FadeUp, StaggerContainer, StaggerItem, ScaleIn } from "@/components/Motion";
import HomeHero from "@/components/HomeHero";

export const revalidate = 3600; // ISR: regenerate hourly

const DIVISION_ICONS = {
  Trauma: Bone,
  Cardiovascular: HeartPulse,
  "Joint Replacement": Activity,
  Diagnostics: Microscope,
  "Infection Prevention": ShieldCheck,
  "Endo Surgery": Scissors,
  Instruments: Wrench,
  "Sports Medicine": Dumbbell,
  ENT: EarOff,
  Urology: Droplets,
  "Critical Care": Heart,
  "Peripheral Intervention": GitBranch,
  Robotics: Cpu,
  Spine: Bone,
};

export const metadata = {
  title: "Meril Medical Device Distributor in Hyderabad & Telangana",
  description:
    "Agile Healthcare is the authorized Meril Life Sciences master franchise for Telangana. Browse 810+ verified medical devices across 13 clinical divisions — Trauma, Cardiovascular, Joint Replacement, Diagnostics and more.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Meril Medical Device Distributor in Hyderabad & Telangana | Agile Healthcare",
    description:
      "Authorized Meril Life Sciences master franchise for Telangana. 810+ verified medical devices across 13 clinical divisions, serving hospitals in all 33 districts.",
    url: "https://agileortho.in/",
    type: "website",
  },
};

export default async function Home() {
  const [divisionsRes, productsRes] = await Promise.all([
    getDivisions(),
    listCatalogProducts({ page: 1, limit: 8 }),
  ]);
  const divisions = divisionsRes?.divisions || [];
  const featuredProducts = productsRes?.products || [];
  const totalProducts = divisions.reduce((s, d) => s + (d.product_count || 0), 0) || 810;

  // Organization + LocalBusiness JSON-LD
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Agile Healthcare",
    legalName: "AGILE ORTHOPEDICS PRIVATE LIMITED",
    url: "https://agileortho.in",
    logo: "https://agileortho.in/agile_healthcare_logo.png",
    description: "Authorized Meril Life Sciences master franchise distributor serving hospitals and clinics across Telangana.",
    telephone: "+917416216262",
    email: "info@agileortho.in",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Hayathnagar",
      addressLocality: "Hyderabad",
      addressRegion: "Telangana",
      postalCode: "500074",
      addressCountry: "IN",
    },
  };
  const localBizSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: "Agile Healthcare",
    image: "https://agileortho.in/agile_healthcare_logo.png",
    telephone: "+917416216262",
    address: orgSchema.address,
    areaServed: "Telangana, India",
    url: "https://agileortho.in",
  };

  return (
    <div className="bg-[#0A0A0A]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBizSchema) }} />

      {/* HERO (client component for animations & search) */}
      <HomeHero totalProducts={totalProducts} divisionCount={divisions.length || 13} />

      {/* TRUST BAR */}
      <section className="border-y border-white/[0.06] bg-[#0D0D0D]" data-testid="trust-bar">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex flex-wrap items-center justify-center gap-8 sm:gap-14">
          {[
            { icon: Shield, label: "ISO 13485 Certified" },
            { icon: Award, label: "CDSCO Registered" },
            { icon: Building2, label: "Meril Authorized" },
            { icon: MapPin, label: "33 Districts" },
          ].map((badge) => (
            <div key={badge.label} className="flex items-center gap-2.5" data-testid={`trust-badge-${badge.label.toLowerCase().replace(/\s/g, "-")}`}>
              <badge.icon size={16} strokeWidth={1.5} className="text-[#2DD4BF]" />
              <span className="text-xs font-medium tracking-wide text-white/60">{badge.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* DIVISIONS */}
      <section className="py-20 sm:py-24 bg-[#111]" data-testid="divisions-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <FadeUp>
            <div className="text-center mb-12">
              <span className="text-xs font-bold text-[#D4AF37] tracking-[0.2em] uppercase">Product Divisions</span>
              <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight text-white" style={{ fontFamily: "Outfit" }}>
                Meril Clinical Divisions
              </h2>
              <p className="mt-3 text-sm text-white/50 max-w-md mx-auto">
                Select a division to explore verified products with specifications and SKU details
              </p>
            </div>
          </FadeUp>

          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {divisions.map((div) => {
              const Icon = DIVISION_ICONS[div.name] || Bone;
              return (
                <StaggerItem key={div.name}>
                  <Link
                    href={`/catalog/${div.slug || div.name.toLowerCase().replace(/\s+/g, "-")}`}
                    className="group card-premium rounded-sm p-5 sm:p-6 text-center hover-lift block"
                    data-testid={`division-card-${div.slug}`}
                  >
                    <div className="mx-auto w-12 h-12 rounded-sm bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mb-4 group-hover:bg-[#D4AF37]/20 group-hover:border-[#D4AF37]/40 transition-all duration-300">
                      <Icon size={20} strokeWidth={1.5} className="text-[#D4AF37]" />
                    </div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-[#D4AF37] transition-colors" style={{ fontFamily: "Outfit" }}>
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
            <Link href="/catalog" className="group inline-flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#F2C94C] font-medium transition-colors">
              View Full Catalog <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      {featuredProducts.length > 0 && (
        <section className="py-20 sm:py-24 bg-[#0A0A0A]" data-testid="featured-section">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <FadeUp>
              <div className="text-center mb-12">
                <span className="text-xs font-bold text-[#D4AF37] tracking-[0.2em] uppercase">Featured</span>
                <h2 className="mt-2 text-2xl sm:text-3xl font-medium tracking-tight text-white" style={{ fontFamily: "Outfit" }}>
                  Popular Products
                </h2>
              </div>
            </FadeUp>

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5" staggerDelay={0.06}>
              {featuredProducts.slice(0, 8).map((p) => {
                const imgPath = p.images?.[0]?.storage_path;
                const imgUrl = imgPath ? backendFileUrl(imgPath) : null;
                return (
                  <StaggerItem key={p.slug || p.id}>
                    <Link
                      href={`/catalog/products/${p.slug || p.id}`}
                      className="group card-premium rounded-sm overflow-hidden hover-lift block"
                      data-testid={`featured-product-${p.slug || p.id}`}
                    >
                      {imgUrl ? (
                        <div className="aspect-[4/3] bg-[#0D0D0D] overflow-hidden flex items-center justify-center p-6">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgUrl}
                            alt={p.product_name}
                            className="max-w-full max-h-full object-contain opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[4/3] bg-[#0D0D0D] flex items-center justify-center">
                          <Bone size={36} className="text-white/10" />
                        </div>
                      )}
                      <div className="p-5 text-center">
                        <p className="text-[11px] text-[#D4AF37] font-semibold uppercase tracking-wider mb-1.5">
                          {p.division_canonical || p.division}
                        </p>
                        <h3 className="text-sm font-semibold text-white group-hover:text-[#D4AF37] transition-colors line-clamp-2 leading-snug" style={{ fontFamily: "Outfit" }}>
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
                );
              })}
            </StaggerContainer>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 sm:py-28 bg-[#111]" data-testid="cta-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <ScaleIn>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-white" style={{ fontFamily: "Outfit" }}>
                Equip Your Hospital with <span className="text-[#D4AF37] font-medium">Meril</span> Medical Devices
              </h2>
              <p className="mt-4 text-sm sm:text-base text-white/55">
                Connect with our product specialists for bulk quotes, hospital procurement, and technical specifications.
              </p>

              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <a
                  href="https://wa.me/917416521222?text=Hi%2C%20I%27d%20like%20to%20receive%20the%20complete%20Agile%20Ortho%20product%20catalog%20PDF."
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#F2C94C] text-black font-semibold rounded-sm px-8 py-3.5 text-sm transition-all hover:shadow-lg hover:shadow-[#D4AF37]/20"
                  data-testid="cta-get-catalog"
                >
                  Get Product Catalog <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="https://wa.me/917416521222?text=Hi%2C%20I%27d%20like%20to%20discuss%20bulk%20procurement%20for%20my%20hospital."
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-2 border border-white/15 hover:border-[#D4AF37]/40 hover:bg-white/5 text-white font-medium rounded-sm px-8 py-3.5 text-sm transition-all"
                  data-testid="cta-whatsapp"
                >
                  <MessageCircle size={14} /> Talk to Sales
                </a>
                <Link href="/contact" className="group inline-flex items-center gap-2 border border-white/15 hover:border-white/30 hover:bg-white/5 text-white font-medium rounded-sm px-8 py-3.5 text-sm transition-all">
                  <Phone size={14} /> Contact Us
                </Link>
              </div>
            </div>
          </ScaleIn>
        </div>
      </section>
    </div>
  );
}
