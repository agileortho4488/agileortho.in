import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, MapPin, Shield, Award, Building2, Bone,
  ArrowRight, MessageCircle, Phone, CheckCircle2,
} from "lucide-react";
import { searchCatalogProducts, backendFileUrl } from "@/lib/api";
import { BUY_PAGES, getBuyPage } from "@/lib/buyPages";
import { TELANGANA_DISTRICTS } from "@/lib/districts";

export const revalidate = 86400; // ISR: 24h — programmatic pages don't change often

// Pre-build every /buy/[slug] page at deploy time
export async function generateStaticParams() {
  return BUY_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cfg = getBuyPage(slug);
  if (!cfg) return { title: "Page Not Found" };
  return {
    title: cfg.metaTitle,
    description: cfg.description,
    keywords: cfg.keywords,
    alternates: { canonical: `/buy/${slug}` },
    openGraph: {
      title: cfg.h1,
      description: cfg.description,
      url: `https://www.agileortho.in/buy/${slug}`,
      type: "website",
    },
  };
}

export default async function BuyPage({ params }) {
  const { slug } = await params;
  const cfg = getBuyPage(slug);
  if (!cfg) notFound();

  // Pull matching products (server-side, cached)
  const res = await searchCatalogProducts({ ...cfg.filters, page: 1, limit: 18 });
  const products = res?.products || [];
  const totalProducts = res?.total || products.length;

  // Related landing pages — same area or similar query type
  const related = BUY_PAGES
    .filter((p) => p.slug !== slug)
    .filter((p) => p.city === cfg.city || (cfg.filters.division && p.filters.division === cfg.filters.division))
    .slice(0, 6);

  // ── JSON-LD schema graph ──────────────────────────────────────────────────
  const pageUrl = `https://www.agileortho.in/buy/${slug}`;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.agileortho.in/" },
      { "@type": "ListItem", position: 2, name: "Buy", item: "https://www.agileortho.in/buy" },
      { "@type": "ListItem", position: 3, name: cfg.h1, item: pageUrl },
    ],
  };
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: cfg.h1,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 10).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://www.agileortho.in/catalog/products/${p.slug}`,
      name: p.product_name_display || p.product_name,
    })),
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cfg.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const localBiz = {
    "@context": "https://schema.org",
    "@type": ["MedicalEquipmentSupplier", "LocalBusiness"],
    name: `Agile Healthcare — ${cfg.h1}`,
    url: pageUrl,
    image: "https://www.agileortho.in/agile_healthcare_logo.png",
    parentOrganization: { "@id": "https://www.agileortho.in/#organization" },
    areaServed: cfg.areaServed,
    priceRange: "₹₹",
    currenciesAccepted: "INR",
    paymentAccepted: "Cash, Bank Transfer, UPI, Cheque",
    openingHours: "Mo-Sa 09:00-19:00",
    telephone: "+917416216262",
    email: "info@agileortho.in",
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="buy-landing-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBiz) }} />

      {/* HERO */}
      <section className="bg-[#0D0D0D] border-b border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
          <nav className="flex items-center gap-1.5 text-sm text-white/45 mb-5 flex-wrap">
            <Link href="/" className="hover:text-white">Home</Link>
            <ChevronRight size={12} />
            <span className="text-white/55">Buy</span>
            <ChevronRight size={12} />
            <span className="text-[#D4AF37] font-medium truncate">{cfg.h1}</span>
          </nav>

          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#2DD4BF] bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 px-2.5 py-1 rounded">
              <MapPin size={10} /> {cfg.city}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2.5 py-1 rounded">
              Meril Authorized
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white tracking-tight max-w-4xl"
              style={{ fontFamily: "Outfit" }}
              data-testid="buy-page-h1">
            {cfg.h1}
          </h1>
          <p className="mt-5 text-base sm:text-lg text-white/65 max-w-3xl leading-relaxed">
            {cfg.intro}
          </p>

          {/* Trust badges */}
          <div className="mt-7 flex flex-wrap gap-5 text-xs text-white/55">
            <span className="inline-flex items-center gap-1.5"><Shield size={14} className="text-[#2DD4BF]" /> CDSCO Registered</span>
            <span className="inline-flex items-center gap-1.5"><Award size={14} className="text-[#2DD4BF]" /> ISO 13485 Certified</span>
            <span className="inline-flex items-center gap-1.5"><Building2 size={14} className="text-[#2DD4BF]" /> Meril Master Franchise</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-[#2DD4BF]" /> {totalProducts}+ products in stock</span>
          </div>

          {/* Primary CTAs */}
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`https://wa.me/917416521222?text=${encodeURIComponent(`Hi, I'd like a quote for ${cfg.h1.replace(/^Buy\s+/, "")}.`)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#F2C94C] text-black font-semibold rounded-sm px-6 py-3 text-sm transition-all"
              data-testid="buy-cta-whatsapp"
            >
              <MessageCircle size={14} /> WhatsApp Quote
            </a>
            <a
              href="tel:+917416216262"
              className="inline-flex items-center gap-2 border border-white/15 hover:border-[#D4AF37]/40 hover:bg-white/5 text-white font-medium rounded-sm px-6 py-3 text-sm transition-all"
              data-testid="buy-cta-call"
            >
              <Phone size={14} /> +91 74162 16262
            </a>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 hover:bg-white/5 text-white font-medium rounded-sm px-6 py-3 text-sm transition-all"
            >
              Browse Full Catalog <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* PRODUCT GRID */}
      {products.length > 0 && (
        <section className="py-16 sm:py-20" data-testid="buy-products-section">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
              <div>
                <span className="text-xs font-semibold text-[#2DD4BF] uppercase tracking-widest">Available now</span>
                <h2 className="mt-2 text-2xl sm:text-3xl font-light text-white tracking-tight" style={{ fontFamily: "Outfit" }}>
                  {totalProducts}+ products available in {cfg.city}
                </h2>
              </div>
              <Link href="/catalog" className="text-sm text-[#D4AF37] hover:text-[#F2C94C] font-medium inline-flex items-center gap-1">
                View all products <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.slice(0, 12).map((p) => {
                const img = p.images?.[0]?.storage_path
                  ? backendFileUrl(p.images[0].storage_path)
                  : null;
                return (
                  <Link
                    key={p.slug}
                    href={`/catalog/products/${p.slug}`}
                    className="group bg-[#111] border border-white/[0.06] hover:border-[#D4AF37]/30 rounded-sm overflow-hidden transition-all p-4 flex flex-col"
                    data-testid={`buy-product-card-${p.slug}`}
                  >
                    <div className="aspect-square bg-white/5 flex items-center justify-center mb-3 overflow-hidden rounded-sm">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={p.product_name_display || p.product_name} className="w-full h-full object-contain" />
                      ) : (
                        <Bone size={32} className="text-white/25" />
                      )}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]/70 truncate">
                      {p.brand || "Meril"}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-[#D4AF37]"
                        style={{ fontFamily: "Outfit" }}>
                      {p.product_name_display || p.product_name}
                    </h3>
                    {p.division_canonical && (
                      <span className="mt-2 inline-block text-[10px] text-white/45">{p.division_canonical}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-16 sm:py-20 bg-[#0D0D0D] border-y border-white/[0.06]" data-testid="buy-faq-section">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold text-[#2DD4BF] uppercase tracking-widest">Frequently asked</span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-light text-white tracking-tight" style={{ fontFamily: "Outfit" }}>
              {cfg.h1.replace(/^Buy\s+/, "")} — your questions answered
            </h2>
          </div>
          <div className="space-y-3">
            {cfg.faqs.map((q, i) => (
              <details key={q.q} className="group bg-[#111] border border-white/[0.06] rounded-sm overflow-hidden"
                       data-testid={`buy-faq-${i}`}>
                <summary className="cursor-pointer px-6 py-4 flex items-center justify-between gap-4 text-white font-medium text-sm hover:bg-white/[0.03]">
                  <span>{q.q}</span>
                  <ArrowRight size={14} className="text-[#D4AF37] flex-shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-6 pb-5 pt-1 text-sm text-white/65 leading-relaxed">{q.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* RELATED LANDING PAGES — internal-link cluster */}
      {related.length > 0 && (
        <section className="py-16 sm:py-20" data-testid="buy-related-section">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="text-xl sm:text-2xl font-light text-white tracking-tight mb-6" style={{ fontFamily: "Outfit" }}>
              Related buyer pages
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/buy/${r.slug}`}
                  className="group flex items-center justify-between gap-3 bg-[#111] border border-white/[0.06] hover:border-[#D4AF37]/30 px-5 py-4 rounded-sm transition-all"
                  data-testid={`buy-related-${r.slug}`}
                >
                  <span className="text-sm text-white group-hover:text-[#D4AF37] font-medium">{r.h1}</span>
                  <ArrowRight size={14} className="text-white/35 group-hover:text-[#D4AF37] flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* District callout for Telangana / Hyderabad pages */}
      {(cfg.city === "Hyderabad" || cfg.city === "Telangana") && (
        <section className="py-12 bg-[#0D0D0D] border-t border-white/[0.06]" data-testid="buy-districts-section">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="text-base font-medium text-white/75 mb-5">Also serving these Telangana districts:</h2>
            <div className="flex flex-wrap gap-2">
              {TELANGANA_DISTRICTS.slice(0, 12).map((d) => (
                <Link key={d.slug} href={`/districts/${d.slug}`}
                      className="text-xs text-white/55 hover:text-[#D4AF37] bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-[#D4AF37]/30 px-3 py-1.5 rounded-sm transition-all">
                  {d.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
