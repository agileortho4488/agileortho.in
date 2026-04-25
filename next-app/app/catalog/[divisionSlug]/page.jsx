import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Bone, ArrowRight } from "lucide-react";
import {
  getDivisions,
  getCatalogDivision,
  searchCatalogProducts,
  backendFileUrl,
} from "@/lib/api";
import { WhatsAppIconButton } from "@/components/WhatsAppCTA";

export const revalidate = 3600;

export async function generateStaticParams() {
  const r = await getDivisions();
  return (r?.divisions || []).map((d) => ({ divisionSlug: d.slug }));
}

export async function generateMetadata({ params }) {
  const { divisionSlug } = await params;
  const div = await getCatalogDivision(divisionSlug);
  if (!div) return { title: "Division Not Found" };
  const cats = (div.categories || []).slice(0, 5).join(", ");
  const title = `Buy ${div.name} Implants in Hyderabad — Meril ${div.name} Distributor Telangana`;
  const description = `${div.product_count}+ Meril ${div.name.toLowerCase()} medical devices available in Hyderabad and across Telangana. CDSCO-approved, ISO 13485 certified — fast hospital delivery, B2B bulk pricing. Categories: ${cats}${(div.categories || []).length > 5 ? " and more" : ""}.`;
  return {
    title,
    description,
    keywords: [
      `${div.name} implants Hyderabad`,
      `${div.name} distributor Telangana`,
      `Meril ${div.name}`,
      `buy ${div.name} medical devices`,
      `${div.name} supplier India`,
      ...(div.categories || []).slice(0, 5),
    ],
    alternates: { canonical: `/catalog/${divisionSlug}` },
    openGraph: {
      title,
      description,
      url: `https://www.agileortho.in/catalog/${divisionSlug}`,
      type: "website",
    },
  };
}

export default async function DivisionPage({ params }) {
  const { divisionSlug } = await params;
  const div = await getCatalogDivision(divisionSlug);
  if (!div) notFound();

  const first = await searchCatalogProducts({
    division: div.name,
    page: 1,
    limit: 24,
  });
  const products = first.products || [];
  const total = first.total || 0;

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.agileortho.in" },
      { "@type": "ListItem", position: 2, name: "Product Catalog", item: "https://www.agileortho.in/catalog" },
      { "@type": "ListItem", position: 3, name: div.name, item: `https://www.agileortho.in/catalog/${divisionSlug}` },
    ],
  };

  // CollectionPage + FAQ schema for division-specific featured-snippet eligibility.
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${div.name} Medical Devices — Meril Distributor Hyderabad`,
    url: `https://www.agileortho.in/catalog/${divisionSlug}`,
    isPartOf: { "@id": "https://www.agileortho.in/#website" },
    about: { "@type": "Thing", name: div.name },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total,
      itemListElement: products.slice(0, 10).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://www.agileortho.in/catalog/products/${p.slug}`,
        name: p.product_name_display || p.product_name,
      })),
    },
  };

  const divFaqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Where can I buy Meril ${div.name.toLowerCase()} devices in Hyderabad?`,
        acceptedAnswer: { "@type": "Answer",
          text: `Agile Healthcare is the authorized Meril Life Sciences master franchise for Telangana, supplying ${div.product_count}+ ${div.name.toLowerCase()} medical devices to hospitals across Hyderabad and all 33 districts. Call +91 74162 16262 or WhatsApp for same-day quotes.` },
      },
      {
        "@type": "Question",
        name: `Are Meril ${div.name.toLowerCase()} implants CDSCO approved?`,
        acceptedAnswer: { "@type": "Answer",
          text: `Yes. All Meril ${div.name.toLowerCase()} medical devices supplied by Agile Healthcare are CDSCO-registered and manufactured at ISO 13485-certified facilities. Lot numbers, GST invoices and regulatory documents are issued with every order.` },
      },
      {
        "@type": "Question",
        name: `What categories of ${div.name.toLowerCase()} products are available?`,
        acceptedAnswer: { "@type": "Answer",
          text: `${div.product_count}+ products across categories including ${(div.categories || []).slice(0, 6).join(", ")}. Browse the full list on this page or WhatsApp 'CATALOG' to +91 74165 21222 for the division brochure PDF.` },
      },
      {
        "@type": "Question",
        name: `What is the typical delivery time for ${div.name.toLowerCase()} orders in Telangana?`,
        acceptedAnswer: { "@type": "Answer",
          text: `Most ${div.name.toLowerCase()} products are usually in stock at our Hyderabad warehouse with 24-hour delivery to Hyderabad, Secunderabad, Warangal, Karimnagar, Nizamabad and Khammam. Other Telangana districts typically receive within 24–48 hours.` },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="catalog-division-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(divFaqSchema) }} />

      <section className="bg-[#0D0D0D] border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <nav className="flex items-center gap-1.5 text-sm text-white/45 mb-5 flex-wrap" data-testid="catalog-breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={12} />
            <Link href="/catalog" className="hover:text-white transition-colors">Products</Link>
            <ChevronRight size={12} />
            <span className="text-[#D4AF37] font-medium">{div.name}</span>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight" style={{ fontFamily: "Outfit" }} data-testid="catalog-title">
            {div.name}
          </h1>
          <p className="mt-2 text-sm text-white/55">
            <span className="text-white font-medium">{total}</span> verified products across{" "}
            <span className="text-white font-medium">{(div.categories || []).length}</span> categories from{" "}
            <span className="text-white font-medium">{(div.brands || []).length}</span> brands
          </p>

          {/* Category chips */}
          {(div.categories || []).length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {div.categories.map((cat) => (
                <span key={cat} className="text-xs bg-white/5 border border-white/10 text-white/70 px-3 py-1 rounded-sm">
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {products.length === 0 ? (
          <p className="text-center text-white/45 py-16">No products found in this division.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => {
              const imgPath = p.images?.[0]?.storage_path;
              const imgUrl = imgPath ? backendFileUrl(imgPath) : null;
              return (
                <div
                  key={p.slug}
                  className="group card-premium rounded-sm overflow-hidden block relative"
                  data-testid={`division-product-${p.slug}`}
                >
                  <Link href={`/catalog/products/${p.slug}`} className="block">
                    {imgUrl ? (
                      <div className="aspect-[4/3] bg-[#0D0D0D] overflow-hidden flex items-center justify-center p-4">
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
                        <Bone size={32} className="text-white/10" />
                      </div>
                    )}
                    <div className="p-4 pb-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] mb-1.5">
                        {p.category || p.division_canonical}
                      </p>
                      <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-[#D4AF37] transition-colors leading-snug" style={{ fontFamily: "Outfit" }}>
                        {p.product_name_display || p.product_name}
                      </h3>
                      {p.semantic_brand_system && (
                        <p className="mt-1 text-[11px] text-white/45 line-clamp-1">{p.semantic_brand_system}</p>
                      )}
                      <div className="mt-3 flex items-center gap-1 text-[11px] text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-all font-medium">
                        View details <ArrowRight size={10} />
                      </div>
                    </div>
                  </Link>
                  <div className="px-4 pb-4">
                    <WhatsAppIconButton
                      productName={p.product_name_display || p.product_name}
                      brand={p.semantic_brand_system || ""}
                      slug={p.slug}
                      tone="gold"
                      testid={`wa-div-${p.slug}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {total > 24 && (
          <p className="mt-10 text-center text-sm text-white/55">
            Showing first 24 of {total} products.{" "}
            <Link href="/catalog" className="text-[#D4AF37] hover:text-[#F2C94C] font-medium">
              Browse full catalog →
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
