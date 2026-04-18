import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Bone, Package, Workflow, Zap, Layers, BadgeCheck, Factory, Phone,
} from "lucide-react";
import {
  getCatalogProduct,
  getProductRecommendations,
  listCatalogProducts,
  backendFileUrl,
} from "@/lib/api";

export const revalidate = 3600; // ISR: regenerate page every hour

// ──────────────────────────────────────────────────────────────
// STATIC PARAMS — pre-build 1,202 product pages at deploy time
// ──────────────────────────────────────────────────────────────
export async function generateStaticParams() {
  // Page through the catalog to get all slugs
  const out = [];
  let page = 1;
  const limit = 100; // FastAPI endpoint caps at 100
  // eslint-disable-next-line no-console
  console.log("[generateStaticParams] Fetching product slugs…");
  while (true) {
    const r = await listCatalogProducts({ page, limit });
    const items = r?.products || [];
    // eslint-disable-next-line no-console
    console.log(`[generateStaticParams] page=${page} received=${items.length}`);
    for (const p of items) {
      if (p.slug) out.push({ slug: p.slug });
    }
    if (items.length < limit) break;
    page += 1;
    if (page > 30) break; // safety cap (>= 3000 products)
  }
  // eslint-disable-next-line no-console
  console.log(`[generateStaticParams] total slugs=${out.length}`);
  return out;
}

// ──────────────────────────────────────────────────────────────
// SEO METADATA — per product (Google indexable, OG, JSON-LD via script)
// ──────────────────────────────────────────────────────────────
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);
  if (!product) return { title: "Product Not Found" };

  const title =
    product.seo_meta_title ||
    `${product.product_name_display || product.product_name} | Meril Authorized Distributor`;
  const description =
    product.seo_meta_description ||
    `${product.product_name_display} — authorized Meril Life Sciences medical device. Available across Telangana via Agile Healthcare.`;

  const imageUrl = product.images?.[0]?.storage_path
    ? backendFileUrl(product.images[0].storage_path)
    : null;

  return {
    title,
    description,
    alternates: { canonical: `/catalog/products/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://agileortho.in/catalog/products/${slug}`,
      type: "website",
      images: imageUrl ? [{ url: imageUrl }] : [],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// ──────────────────────────────────────────────────────────────
// PAGE
// ──────────────────────────────────────────────────────────────
export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);
  if (!product) notFound();

  const recs = await getProductRecommendations(slug);
  const mustBuy = recs?.must_buy || [];
  const bundle = recs?.bundle || [];

  const imageUrl = product.images?.[0]?.storage_path
    ? backendFileUrl(product.images[0].storage_path)
    : null;

  // JSON-LD Product schema (critical for Google Rich Results)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.product_name_display || product.product_name,
    description: product.seo_meta_description || product.description_live || "",
    brand: {
      "@type": "Brand",
      name: product.brand || "Meril",
    },
    category: product.category || product.division_canonical || "Medical Device",
    ...(imageUrl ? { image: imageUrl } : {}),
    manufacturer: {
      "@type": "Organization",
      name: product.manufacturer || "Meril Life Sciences",
    },
  };

  return (
    <main className="min-h-screen bg-ink text-white" data-testid="product-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ═══ HERO ═══ */}
      <section className="px-6 py-12 max-w-7xl mx-auto grid md:grid-cols-2 gap-10">
        <div className="bg-white/5 border border-white/10 rounded-sm aspect-square flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={product.product_name_display || product.product_name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-white/40">
              <Bone size={48} />
              <p className="text-sm font-semibold">{product.category || "Medical Device"}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {product.brand && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gold bg-gold/10 border border-gold/20 px-2.5 py-1 rounded">
              {product.brand}
              {product.parent_brand && product.parent_brand !== product.brand && (
                <span className="font-medium normal-case tracking-normal"> by {product.parent_brand}</span>
              )}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {product.product_name_display || product.product_name}
          </h1>
          {product.clinical_subtitle && (
            <p className="text-lg text-white/70">{product.clinical_subtitle}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm pt-2">
            <span className="flex items-center gap-2 text-white/70">
              <Package size={14} className="text-gold" />
              {product.category || "Medical Device"}
            </span>
            <span className="flex items-center gap-2 text-white/70">
              <Factory size={14} className="text-gold" />
              {product.manufacturer || "Meril Life Sciences"}
            </span>
            <span className="flex items-center gap-2 text-white/70">
              <BadgeCheck size={14} className="text-gold" />
              {product.division_canonical}
            </span>
          </div>
          {product.description_live && (
            <p className="text-sm text-white/70 leading-relaxed pt-4">
              {product.description_live}
            </p>
          )}
          <div className="flex gap-3 pt-6">
            <a
              href="https://wa.me/917416521222"
              className="px-6 py-3 bg-gold text-ink text-sm font-bold rounded-sm hover:bg-[#F2C94C] transition-colors"
            >
              Request Quote
            </a>
            <a
              href="tel:+917416521222"
              className="px-6 py-3 border border-white/20 text-sm font-semibold rounded-sm hover:border-gold transition-colors flex items-center gap-2"
            >
              <Phone size={14} /> Call
            </a>
          </div>
        </div>
      </section>

      {/* ═══ SURGICAL DECISION ENGINE (Knowledge Graph Recommendations) ═══ */}
      {(mustBuy.length > 0 || bundle.length > 0) && (
        <section className="px-6 py-12 max-w-7xl mx-auto" data-testid="kg-recommendations">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-sm bg-gold/10 flex items-center justify-center border border-gold/30">
              <Workflow size={16} className="text-gold" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Surgical Decision Engine</h2>
              <p className="text-xs text-white/45 mt-0.5">
                Cross-sell intelligence powered by product knowledge graph
              </p>
            </div>
          </div>

          {mustBuy.length > 0 && (
            <div className="mb-10" data-testid="kg-must-buy">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={14} className="text-gold" />
                <h3 className="text-sm font-bold uppercase tracking-[0.1em]">Required Together</h3>
                <span className="text-[10px] text-white/45">Compatible screws, bolts &amp; accessories</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {mustBuy.slice(0, 8).map((item) => (
                  <Link
                    key={`mb-${item.slug}`}
                    href={`/catalog/products/${item.slug}`}
                    className="group bg-ink border border-gold/20 rounded-sm overflow-hidden hover:border-gold/60 transition-colors"
                    data-testid={`kg-must-buy-${item.slug}`}
                  >
                    <div className="h-28 bg-white/5 flex items-center justify-center">
                      <Bone size={28} className="text-slate-200" />
                    </div>
                    <div className="p-3">
                      <span className="inline-block text-[9px] font-bold uppercase border px-1.5 py-0.5 rounded-md mb-1.5 text-gold bg-gold/10 border-gold/20">
                        Required · {Math.round((item.confidence || 0) * 100)}%
                      </span>
                      <h4 className="text-xs font-bold line-clamp-2 group-hover:text-gold transition-colors leading-snug">
                        {item.product_name}
                      </h4>
                      <p className="text-[10px] text-white/45 mt-1 line-clamp-1">{item.reason}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {bundle.length > 0 && (
            <div data-testid="kg-bundle">
              <div className="flex items-center gap-2 mb-4">
                <Layers size={14} className="text-teal" />
                <h3 className="text-sm font-bold uppercase tracking-[0.1em]">Complete the System</h3>
                <span className="text-[10px] text-white/45">Bundle components from the same surgical system</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {bundle.slice(0, 8).map((item) => (
                  <Link
                    key={`bn-${item.slug}`}
                    href={`/catalog/products/${item.slug}`}
                    className="group bg-ink border border-teal/20 rounded-sm overflow-hidden hover:border-teal/60 transition-colors"
                    data-testid={`kg-bundle-${item.slug}`}
                  >
                    <div className="h-28 bg-white/5 flex items-center justify-center">
                      <Bone size={28} className="text-slate-200" />
                    </div>
                    <div className="p-3">
                      <span className="inline-block text-[9px] font-bold uppercase border px-1.5 py-0.5 rounded-md mb-1.5 text-teal bg-teal/10 border-teal/20">
                        Bundle · {Math.round((item.confidence || 0) * 100)}%
                      </span>
                      <h4 className="text-xs font-bold line-clamp-2 group-hover:text-teal transition-colors leading-snug">
                        {item.product_name}
                      </h4>
                      <p className="text-[10px] text-white/45 mt-1 line-clamp-1">{item.reason}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ═══ FOOTER handled by root layout ═══ */}
    </main>
  );
}
