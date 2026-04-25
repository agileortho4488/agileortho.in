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
  title: "Orthopedic Implants Distributor in Hyderabad — Meril Medical Devices Telangana",
  description:
    "Buy Meril orthopedic implants, trauma plates, knee & hip replacement, cardiovascular stents and 810+ CDSCO-approved medical devices in Hyderabad. Authorized Meril Life Sciences master franchise serving hospitals across all 33 Telangana districts. Fast B2B delivery, bulk pricing.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Orthopedic Implants Distributor Hyderabad | Meril Telangana — Agile Healthcare",
    description:
      "810+ Meril medical devices across 13 clinical divisions. Authorized master franchise distributor for hospitals across Telangana — orthopedic, trauma, cardio, joint replacement, diagnostics & more.",
    url: "https://www.agileortho.in/",
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

  // Page-level schema: FAQPage (captures featured snippets) + BreadcrumbList.
  // Sitewide Organization/LocalBusiness/WebSite live in layout.jsx so they
  // appear on every page without duplication.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Where can I buy Meril orthopedic implants in Hyderabad?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Agile Healthcare is the authorized Meril Life Sciences master franchise for Telangana, supplying orthopedic implants, trauma plates, knee and hip replacement systems and 810+ medical devices to hospitals across Hyderabad and all 33 districts. Call +91 74162 16262 or WhatsApp for bulk hospital quotes.",
        },
      },
      {
        "@type": "Question",
        name: "Are Meril implants CDSCO approved and ISO 13485 certified?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. All Meril Life Sciences medical devices supplied by Agile Healthcare are CDSCO-registered and manufactured at ISO 13485-certified facilities. We provide regulatory documents, GST invoices and lot traceability with every order.",
        },
      },
      {
        "@type": "Question",
        name: "Which medical device divisions does Agile Healthcare cover?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "13 Meril divisions: Trauma, Joint Replacement, Cardiovascular, Diagnostics, Endo Surgery, Infection Prevention, Sports Medicine, ENT, Urology, Critical Care, Peripheral Intervention, Spine and Robotics — 810+ products in total.",
        },
      },
      {
        "@type": "Question",
        name: "What is the typical delivery time for orthopedic implants in Telangana?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Most products are usually in stock at our Hyderabad warehouse with 24-hour delivery to hospitals in Hyderabad, Secunderabad, Warangal, Karimnagar, Nizamabad and Khammam. Other Telangana districts typically receive within 24–48 hours.",
        },
      },
      {
        "@type": "Question",
        name: "Do you offer bulk pricing for hospitals and surgical centres?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. Hospitals, surgical centres and group purchasing organisations get tiered B2B pricing on bulk orders. Send a list with quantity, GST and delivery location and we provide an exact quote within one working day.",
        },
      },
      {
        "@type": "Question",
        name: "Are knee and hip replacement implants available?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. The full Meril joint replacement portfolio is available — Freedom Knee, DAAPRO hip stem, Destiknee, Hinge Knee System and more. Brochures, sizing charts and surgical-technique PDFs are sent on WhatsApp request.",
        },
      },
      {
        "@type": "Question",
        name: "Can I get the complete Meril product catalog PDF?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. WhatsApp 'CATALOG' to +91 74165 21222 and we share division-wise catalogs and brochures instantly. You can also browse all 810+ products at agileortho.in/catalog.",
        },
      },
    ],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home",
        item: "https://www.agileortho.in/" },
    ],
  };

  return (
    <div className="bg-[#0A0A0A]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

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

      {/* FAQ — high-intent buyer questions, mirrored in JSON-LD for featured snippets */}
      <section className="py-20 sm:py-24 bg-[#0D0D0D] border-t border-white/[0.06]" data-testid="faq-section" id="faq">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <FadeUp>
            <div className="text-center mb-12">
              <span className="text-xs font-semibold text-[#2DD4BF] uppercase tracking-widest">Frequently asked</span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-light tracking-tight text-white" style={{ fontFamily: "Outfit" }}>
                Ordering Meril medical devices in Hyderabad
              </h2>
              <p className="mt-3 text-sm text-white/55">
                Quick answers for hospital procurement teams and surgeons across Telangana.
              </p>
            </div>
          </FadeUp>
          <div className="space-y-3">
            {faqSchema.mainEntity.map((q, i) => (
              <details
                key={q.name}
                className="group bg-[#111] border border-white/[0.06] rounded-sm overflow-hidden"
                data-testid={`faq-item-${i}`}
              >
                <summary className="cursor-pointer px-6 py-4 flex items-center justify-between gap-4 text-left text-white font-medium text-sm sm:text-base hover:bg-white/[0.03] transition-colors">
                  <span>{q.name}</span>
                  <ArrowRight size={16} className="text-[#D4AF37] flex-shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-6 pb-5 pt-1 text-sm text-white/65 leading-relaxed">
                  {q.acceptedAnswer.text}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

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
