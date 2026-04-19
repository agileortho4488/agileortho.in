import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Bone, ArrowRight } from "lucide-react";
import {
  getDivisions,
  getCatalogDivision,
  searchCatalogProducts,
  backendFileUrl,
} from "@/lib/api";

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
  return {
    title: `${div.name} Medical Devices — Meril Authorized`,
    description: `Browse ${div.product_count} verified ${div.name} medical devices from Meril Life Sciences. Categories include ${cats}${(div.categories || []).length > 5 ? " and more" : ""}. Authorized distributor for Telangana hospitals.`,
    alternates: { canonical: `/catalog/${divisionSlug}` },
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

  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="catalog-division-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

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
                <Link
                  key={p.slug}
                  href={`/catalog/products/${p.slug}`}
                  className="group card-premium rounded-sm overflow-hidden block"
                  data-testid={`division-product-${p.slug}`}
                >
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
                  <div className="p-4">
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
