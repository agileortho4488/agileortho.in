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
import { WhatsAppCTA, WhatsAppIconButton } from "@/components/WhatsAppCTA";

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
      url: `https://www.agileortho.in/catalog/products/${slug}`,
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
          <div className="flex gap-3 pt-6 flex-wrap">
            <WhatsAppCTA
              productName={product.product_name_display || product.product_name}
              brand={product.brand}
              slug={slug}
              label={`Ask about ${product.product_name_display || product.product_name}`}
              testid="product-wa-cta"
            />
            <a
              href="tel:+917416521222"
              className="px-6 py-3 border border-white/20 text-sm font-semibold rounded-sm hover:border-gold transition-colors flex items-center gap-2"
            >
              <Phone size={14} /> Call
            </a>
          </div>
        </div>
      </section>

      {/* ═══ PRODUCT DETAILS — description, specs, clinical metadata ═══ */}
      <section className="px-6 py-10 max-w-7xl mx-auto border-t border-white/10" data-testid="product-details">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            {/* Extended description */}
            {(product.description_live || product.description_shadow) && (
              <div data-testid="product-description">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Bone size={16} className="text-gold" /> Product overview
                </h2>
                <div className="text-sm text-white/70 leading-relaxed space-y-3">
                  {product.description_live && <p>{product.description_live}</p>}
                  {product.description_shadow && product.description_shadow !== product.description_live && (
                    <p className="text-white/55 border-l-2 border-gold/30 pl-3 italic">
                      {product.description_shadow}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Technical specifications table */}
            {product.technical_specifications && typeof product.technical_specifications === "object" && Object.keys(product.technical_specifications).length > 0 && (
              <div data-testid="product-specs">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Workflow size={16} className="text-gold" /> Technical specifications
                </h2>
                <div className="border border-white/10 rounded-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-white/10">
                      {Object.entries(product.technical_specifications).map(([k, v]) => (
                        <tr key={k} className="hover:bg-white/5">
                          <td className="py-2 px-3 text-white/50 font-medium w-1/3 capitalize">{k.replace(/_/g, " ")}</td>
                          <td className="py-2 px-3 text-white/85">
                            {Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Clinical scope cards */}
            {(Array.isArray(product.semantic_procedure_scope) && product.semantic_procedure_scope.length > 0 || Array.isArray(product.semantic_anatomy_scope) && product.semantic_anatomy_scope.length > 0) && (
              <div data-testid="product-clinical">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <BadgeCheck size={16} className="text-gold" /> Clinical scope
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {Array.isArray(product.semantic_procedure_scope) && product.semantic_procedure_scope.length > 0 && (
                    <div className="border border-white/10 rounded-sm p-4">
                      <p className="text-[10px] uppercase tracking-widest text-gold font-bold mb-2">Procedures</p>
                      <ul className="space-y-1.5">
                        {product.semantic_procedure_scope.map((p) => (
                          <li key={p} className="text-sm text-white/80 flex items-start gap-2">
                            <span className="text-gold mt-0.5">•</span> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(product.semantic_anatomy_scope) && product.semantic_anatomy_scope.length > 0 && (
                    <div className="border border-white/10 rounded-sm p-4">
                      <p className="text-[10px] uppercase tracking-widest text-gold font-bold mb-2">Anatomical focus</p>
                      <ul className="space-y-1.5">
                        {product.semantic_anatomy_scope.map((a) => (
                          <li key={a} className="text-sm text-white/80 flex items-start gap-2">
                            <span className="text-gold mt-0.5">•</span> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Use cases / indications */}
            {Array.isArray(product.proposed_semantic_use_case_tags) && product.proposed_semantic_use_case_tags.length > 0 && (
              <div data-testid="product-use-cases">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Zap size={16} className="text-gold" /> Indications & use cases
                </h2>
                <div className="flex flex-wrap gap-2">
                  {product.proposed_semantic_use_case_tags.map((t) => (
                    <span key={t} className="text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-sm text-white/80">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — quick facts */}
          <aside className="space-y-4" data-testid="product-sidebar">
            <div className="border border-white/10 rounded-sm p-4 bg-white/5">
              <p className="text-[10px] uppercase tracking-widest text-gold font-bold mb-3">Quick facts</p>
              <dl className="space-y-2.5 text-sm">
                {product.sku_code && (
                  <div>
                    <dt className="text-white/45 text-xs">SKU</dt>
                    <dd className="text-white font-mono text-xs">{product.sku_code}</dd>
                  </div>
                )}
                {product.pack_size && (
                  <div>
                    <dt className="text-white/45 text-xs">Pack size</dt>
                    <dd className="text-white/90">{product.pack_size}</dd>
                  </div>
                )}
                {Array.isArray(product.size_variables) && product.size_variables.length > 0 && (
                  <div>
                    <dt className="text-white/45 text-xs">Sizes available</dt>
                    <dd className="text-white/90">{product.size_variables.join(", ")}</dd>
                  </div>
                )}
                {product.material_canonical && (
                  <div>
                    <dt className="text-white/45 text-xs">Material</dt>
                    <dd className="text-white/90">{product.material_canonical}</dd>
                  </div>
                )}
                {product.semantic_system_type && (
                  <div>
                    <dt className="text-white/45 text-xs">System type</dt>
                    <dd className="text-white/90">{product.semantic_system_type}</dd>
                  </div>
                )}
                {product.semantic_implant_class && (
                  <div>
                    <dt className="text-white/45 text-xs">Implant class</dt>
                    <dd className="text-white/90 capitalize">{String(product.semantic_implant_class).replace(/_/g, " ")}</dd>
                  </div>
                )}
                {product.parent_brand && (
                  <div>
                    <dt className="text-white/45 text-xs">Parent brand</dt>
                    <dd className="text-white/90">{product.parent_brand}</dd>
                  </div>
                )}
              </dl>
            </div>

            {product.brochure_url && (
              <a
                href={backendFileUrl(product.brochure_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-gold/40 bg-gold/10 rounded-sm p-3 text-center text-sm font-bold text-gold hover:bg-gold/20 transition-colors"
                data-testid="product-brochure-download"
              >
                📄 Download brochure PDF
              </a>
            )}
          </aside>
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
                  <div
                    key={`mb-${item.slug}`}
                    className="group relative bg-ink border border-gold/20 rounded-sm overflow-hidden hover:border-gold/60 transition-colors"
                    data-testid={`kg-must-buy-${item.slug}`}
                  >
                    <Link href={`/catalog/products/${item.slug}`} className="block">
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
                    <div className="px-3 pb-3">
                      <WhatsAppIconButton
                        productName={item.product_name}
                        slug={item.slug}
                        tone="gold"
                        testid={`wa-mb-${item.slug}`}
                      />
                    </div>
                  </div>
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
                  <div
                    key={`bn-${item.slug}`}
                    className="group relative bg-ink border border-teal/20 rounded-sm overflow-hidden hover:border-teal/60 transition-colors"
                    data-testid={`kg-bundle-${item.slug}`}
                  >
                    <Link href={`/catalog/products/${item.slug}`} className="block">
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
                    <div className="px-3 pb-3">
                      <WhatsAppIconButton
                        productName={item.product_name}
                        slug={item.slug}
                        tone="teal"
                        testid={`wa-bn-${item.slug}`}
                      />
                    </div>
                  </div>
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
