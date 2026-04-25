import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight, MapPin, Users, Building2, Stethoscope,
  MessageCircle, Phone, ArrowRight,
} from "lucide-react";
import { TELANGANA_DISTRICTS, getDistrictBySlug } from "@/lib/districts";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/Motion";
import { COMPANY } from "@/lib/constants";

export const revalidate = 86400; // 24h

export async function generateStaticParams() {
  return TELANGANA_DISTRICTS.map((d) => ({ districtSlug: d.slug }));
}

export async function generateMetadata({ params }) {
  const { districtSlug } = await params;
  const d = getDistrictBySlug(districtSlug);
  if (!d) return { title: "District Not Found" };
  const focus = (d.medicalFocus || []).slice(0, 3).join(", ");
  const title = `Orthopedic Implants & Medical Device Distributor in ${d.name}, Telangana — Meril Authorized`;
  const description = `Buy Meril orthopedic implants, trauma plates, knee & hip replacement systems and 810+ CDSCO-approved medical devices in ${d.name}, Telangana. Authorized master franchise — ${focus} and more. Same-day delivery for ${d.name} hospitals.`;
  return {
    title,
    description,
    keywords: [
      `medical device distributor ${d.name}`,
      `orthopedic implants ${d.name}`,
      `Meril distributor ${d.name} Telangana`,
      `hospital supplies ${d.name}`,
      `surgical instruments ${d.name}`,
      ...(d.medicalFocus || []).slice(0, 3),
    ],
    alternates: { canonical: `/districts/${districtSlug}` },
    openGraph: {
      title,
      description,
      url: `https://www.agileortho.in/districts/${districtSlug}`,
      type: "website",
    },
  };
}

export default async function DistrictPage({ params }) {
  const { districtSlug } = await params;
  const d = getDistrictBySlug(districtSlug);
  if (!d) notFound();

  // JSON-LD: LocalBusiness scoped to this district for local SEO. Linked
  // to the sitewide Organization @id so Google ties them together.
  const localBiz = {
    "@context": "https://schema.org",
    "@type": ["MedicalBusiness", "MedicalEquipmentSupplier"],
    name: `Agile Healthcare — Medical Device Distributor in ${d.name}`,
    description:
      `Authorized Meril Life Sciences medical device distributor for ${d.name}, Telangana — ${d.description}`,
    url: `https://www.agileortho.in/districts/${districtSlug}`,
    image: "https://www.agileortho.in/agile_healthcare_logo.png",
    areaServed: {
      "@type": "AdministrativeArea",
      name: `${d.name}, Telangana, India`,
    },
    parentOrganization: { "@id": "https://www.agileortho.in/#organization" },
    telephone: COMPANY.phone,
    email: COMPANY.email,
    priceRange: "₹₹",
    currenciesAccepted: "INR",
    openingHours: "Mo-Sa 09:00-19:00",
    knowsAbout: d.medicalFocus || [],
  };
  // FAQ schema scoped to this district — captures geo-intent featured snippets.
  const districtFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Where can hospitals in ${d.name} buy Meril orthopedic implants?`,
        acceptedAnswer: { "@type": "Answer",
          text: `Agile Healthcare is the authorized Meril Life Sciences master franchise serving ${d.name} and the rest of Telangana. We supply 810+ CDSCO-approved medical devices including trauma plates, knee/hip replacement systems and cardiovascular stents. WhatsApp +91 74165 21222 for quotes.` },
      },
      {
        "@type": "Question",
        name: `How fast can implants be delivered to ${d.name} hospitals?`,
        acceptedAnswer: { "@type": "Answer",
          text: `Most products are usually in stock at our Hyderabad warehouse. Delivery to ${d.name} typically takes 24–48 hours; same-day dispatch is available for emergency surgical cases.` },
      },
      {
        "@type": "Question",
        name: `Which medical specialities do you serve in ${d.name}?`,
        acceptedAnswer: { "@type": "Answer",
          text: `We supply across 13 Meril divisions covering ${(d.medicalFocus || []).join(", ")} and more. Brochures and surgical-technique PDFs are available on WhatsApp request.` },
      },
    ],
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.agileortho.in" },
      { "@type": "ListItem", position: 2, name: "Districts", item: "https://www.agileortho.in/districts" },
      { "@type": "ListItem", position: 3, name: d.name, item: `https://www.agileortho.in/districts/${districtSlug}` },
    ],
  };

  // Related nearby districts
  const siblings = TELANGANA_DISTRICTS
    .filter((o) => o.slug !== d.slug)
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="district-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBiz) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(districtFaq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      {/* Hero */}
      <section className="bg-[#0D0D0D] border-b border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
          <nav className="flex items-center gap-1.5 text-sm text-white/45 mb-5 flex-wrap">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={12} />
            <Link href="/districts" className="hover:text-white transition-colors">Districts</Link>
            <ChevronRight size={12} />
            <span className="text-[#D4AF37] font-medium">{d.name}</span>
          </nav>

          <FadeUp>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-sm bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                <MapPin size={18} className="text-[#D4AF37]" />
              </div>
              <span className="text-xs font-bold text-[#2DD4BF] tracking-[0.15em] uppercase">
                Telangana District
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight" style={{ fontFamily: "Outfit" }} data-testid="district-title">
              Medical Devices in <span className="text-[#D4AF37]">{d.name}</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-[#2DD4BF] font-medium">{d.tagline}</p>

            <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/60">
              <span className="flex items-center gap-2">
                <Users size={14} className="text-[#D4AF37]" /> Population: <strong className="text-white">{d.population}</strong>
              </span>
              <span className="flex items-center gap-2">
                <Building2 size={14} className="text-[#D4AF37]" /> <strong className="text-white">{(d.hospitals || []).length}</strong> major hospitals
              </span>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Description */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <FadeUp>
            <h2 className="text-xs font-bold text-[#D4AF37] tracking-[0.2em] uppercase mb-4">
              Healthcare Overview
            </h2>
            <p className="text-base text-white/75 leading-[1.8]">
              {d.description}
            </p>
          </FadeUp>
        </div>
      </section>

      {/* Hospitals + Medical Focus */}
      <section className="py-10 border-t border-white/[0.06] bg-[#0D0D0D]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 grid md:grid-cols-2 gap-10">
          <FadeUp>
            <h2 className="text-xs font-bold text-[#D4AF37] tracking-[0.2em] uppercase mb-5">
              Major Hospitals in {d.name}
            </h2>
            <ul className="space-y-3">
              {(d.hospitals || []).map((h) => (
                <li key={h} className="flex items-center gap-3 text-sm text-white/80">
                  <Building2 size={13} className="text-[#2DD4BF] shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          </FadeUp>

          <FadeUp>
            <h2 className="text-xs font-bold text-[#D4AF37] tracking-[0.2em] uppercase mb-5">
              Medical Device Focus
            </h2>
            <div className="flex flex-wrap gap-2">
              {(d.medicalFocus || []).map((focus) => (
                <Link
                  key={focus}
                  href={`/catalog/${focus.toLowerCase().replace(/\s+/g, "-").replace("endo-surgical", "endo-surgery")}`}
                  className="inline-flex items-center gap-2 bg-white/5 border border-white/10 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/10 px-4 py-2 rounded-sm text-sm text-white/80 hover:text-white transition-all"
                >
                  <Stethoscope size={12} className="text-[#D4AF37]" /> {focus}
                </Link>
              ))}
            </div>
            <p className="mt-6 text-xs text-white/50">
              All products are authorized Meril Life Sciences medical devices, CDSCO-registered and ISO 13485 certified.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <FadeUp>
            <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight" style={{ fontFamily: "Outfit" }}>
              Supplying {d.name} Hospitals with <span className="text-[#D4AF37] font-medium">Meril</span>
            </h2>
            <p className="mt-3 text-sm text-white/60">
              Get product availability, bulk quotes, and technical specifications for your hospital in {d.name}.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href={`https://wa.me/${COMPANY.whatsapp.replace("+", "")}?text=Hi%2C%20I%27m%20from%20${encodeURIComponent(d.name)}%20and%20I%27d%20like%20product%20availability%20for%20my%20hospital.`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#F2C94C] text-black font-semibold rounded-sm px-7 py-3 text-sm transition-all"
                data-testid="district-cta-wa"
              >
                <MessageCircle size={14} /> WhatsApp Enquiry
              </a>
              <a
                href={`tel:${COMPANY.phone}`}
                className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 hover:bg-white/5 text-white font-medium rounded-sm px-7 py-3 text-sm transition-all"
              >
                <Phone size={14} /> Call {COMPANY.phone}
              </a>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Nearby districts */}
      <section className="py-12 border-t border-white/[0.06] bg-[#0D0D0D]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-xs font-bold text-[#D4AF37] tracking-[0.2em] uppercase mb-6 text-center">
            Other Districts We Serve
          </h2>
          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {siblings.map((s) => (
              <StaggerItem key={s.slug}>
                <Link
                  href={`/districts/${s.slug}`}
                  className="group card-premium rounded-sm px-4 py-3 text-center block"
                  data-testid={`nearby-${s.slug}`}
                >
                  <p className="text-sm font-medium text-white group-hover:text-[#D4AF37] transition-colors">{s.name}</p>
                  <p className="text-[10px] text-white/40 mt-0.5 line-clamp-1">{s.tagline}</p>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
          <div className="text-center mt-6">
            <Link href="/districts" className="inline-flex items-center gap-1 text-sm text-[#D4AF37] hover:text-[#F2C94C] font-medium">
              View all 33 districts <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
