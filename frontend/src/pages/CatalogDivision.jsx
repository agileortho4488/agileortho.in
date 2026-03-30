import { useState, useEffect } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import {
  Search, Package, ChevronRight, ChevronLeft, X, ArrowRight,
  Tag, Layers, Grid3X3, List, ChevronDown,
  Bone, HeartPulse, Microscope, Activity
} from "lucide-react";
import { getCatalogProducts, getCatalogDivision } from "../lib/api";
import { SEO, buildBreadcrumbSchema, buildItemListSchema } from "../components/SEO";

const API = process.env.REACT_APP_BACKEND_URL;

export default function CatalogDivision() {
  const { divisionSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [divInfo, setDivInfo] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const category = searchParams.get("category") || "";
  const brand = searchParams.get("brand") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");

  useEffect(() => {
    setNotFound(false);
    getCatalogDivision(divisionSlug).then((r) => setDivInfo(r.data)).catch(() => setNotFound(true));
  }, [divisionSlug]);

  useEffect(() => {
    if (!divInfo) return;
    setLoading(true);
    const params = { division: divInfo.name, page, limit: 18 };
    if (category) params.category = category;
    if (brand) params.brand = brand;
    if (search) params.search = search;
    getCatalogProducts(params)
      .then((r) => { setProducts(r.data.products || []); setTotal(r.data.total || 0); setPages(r.data.pages || 1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [divInfo, category, brand, search, page]);

  useEffect(() => { setSearchInput(search); }, [search]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) { next.set(key, value); } else { next.delete(key); }
    next.delete("page");
    setSearchParams(next);
  };

  const handleSearch = (e) => { e.preventDefault(); setFilter("search", searchInput.trim()); };
  const goPage = (p) => { const next = new URLSearchParams(searchParams); next.set("page", String(p)); setSearchParams(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const hasFilters = category || brand || search;

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <Package size={48} className="mx-auto text-white/25 mb-4" />
          <p className="text-white font-semibold text-lg" style={{ fontFamily: 'Outfit' }}>Division not found</p>
          <Link to="/catalog" className="text-[#D4AF37] font-medium mt-3 inline-block hover:text-[#F2C94C]" data-testid="back-to-catalog">Browse All Divisions</Link>
        </div>
      </div>
    );
  }

  if (!divInfo) {
    return <div className="flex items-center justify-center py-40 bg-[#0A0A0A]"><div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" /></div>;
  }

  const divCategories = divInfo.categories || [];
  const divBrands = divInfo.brands || [];
  const visibleCategories = showAllCategories ? divCategories : divCategories.slice(0, 8);

  const divisionSeoDescription = `Browse ${total} verified ${divInfo.name} medical devices from Meril Life Sciences. Categories include ${divCategories.slice(0, 5).join(', ')}${divCategories.length > 5 ? ' and more' : ''}. Authorized distributor for Telangana hospitals.`;
  const divisionJsonLd = [
    buildBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Product Catalog", url: "/catalog" },
      { name: divInfo.name }
    ]),
    buildItemListSchema(products, divInfo.name)
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="catalog-division-page">
      <SEO
        title={`${divInfo.name} Medical Devices — Meril Authorized`}
        description={divisionSeoDescription}
        canonical={`/catalog/${divInfo.slug}`}
        jsonLd={divisionJsonLd}
      />
      {/* Hero */}
      <section className="bg-[#0D0D0D] border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <nav className="flex items-center gap-1.5 text-sm text-white/45 mb-5 flex-wrap" data-testid="catalog-breadcrumb">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={12} />
            <Link to="/catalog" className="hover:text-white transition-colors">Products</Link>
            <ChevronRight size={12} />
            <span className="text-[#D4AF37] font-medium">{divInfo.name}</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight" data-testid="catalog-title" style={{ fontFamily: 'Outfit' }}>
                {divInfo.name}
              </h1>
              <p className="mt-2 text-sm text-white/55">
                <span className="text-white font-medium">{total}</span> verified products across{" "}
                <span className="text-white font-medium">{divCategories.length}</span> categories from{" "}
                <span className="text-white font-medium">{divBrands.length}</span> brands
              </p>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex items-center gap-0 w-full sm:w-auto sm:min-w-[320px]" data-testid="catalog-search-form">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={`Search in ${divInfo.name}...`}
                  className="w-full bg-white/5 border border-white/10 rounded-l-sm pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37]/50 transition-colors" />
              </div>
              <button type="submit" className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#F2C94C] text-black text-sm font-semibold rounded-r-sm transition-colors" data-testid="catalog-search-btn">Search</button>
            </form>
          </div>
        </div>
      </section>

      {/* Horizontal Category Filters */}
      <div className="border-b border-white/[0.06] bg-[#0A0A0A] sticky top-[53px] z-30" data-testid="category-filters">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button onClick={() => setFilter("category", "")}
              className={`shrink-0 px-4 py-2 rounded-sm text-xs font-semibold transition-all whitespace-nowrap ${!category ? "bg-[#D4AF37] text-black" : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white"}`}
              data-testid="cat-filter-all">
              All
            </button>
            {visibleCategories.map((c) => (
              <button key={c} onClick={() => setFilter("category", c)}
                className={`shrink-0 px-4 py-2 rounded-sm text-xs font-medium transition-all whitespace-nowrap ${category === c ? "bg-[#D4AF37] text-black" : "bg-white/5 text-white/55 border border-white/10 hover:bg-white/10 hover:text-white"}`}
                data-testid={`cat-filter-${c.toLowerCase().replace(/\s+/g, '-')}`}>
                {c}
              </button>
            ))}
            {divCategories.length > 8 && !showAllCategories && (
              <button onClick={() => setShowAllCategories(true)} className="shrink-0 px-3 py-2 text-xs text-[#D4AF37] font-medium hover:text-[#F2C94C] transition-colors whitespace-nowrap">
                +{divCategories.length - 8} more
              </button>
            )}
          </div>

          {/* Brand filter row */}
          {divBrands.length > 1 && (
            <div className="flex items-center gap-2 mt-2 overflow-x-auto scrollbar-hide pb-1">
              <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold shrink-0 mr-1">Brand:</span>
              <button onClick={() => setFilter("brand", "")}
                className={`shrink-0 px-3 py-1.5 rounded-sm text-[11px] font-medium transition-all whitespace-nowrap ${!brand ? "text-[#D4AF37] bg-[#D4AF37]/10" : "text-white/45 hover:text-white/70"}`}
                data-testid="brand-filter-all">All</button>
              {divBrands.slice(0, 12).map((b) => (
                <button key={b} onClick={() => setFilter("brand", b)}
                  className={`shrink-0 px-3 py-1.5 rounded-sm text-[11px] font-medium transition-all whitespace-nowrap ${brand === b ? "text-[#D4AF37] bg-[#D4AF37]/10" : "text-white/45 hover:text-white/70"}`}
                  data-testid={`brand-filter-${b.toLowerCase().replace(/\s+/g, '-')}`}>{b}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Filters + View Toggle */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {hasFilters && (
              <>
                {category && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-medium border border-[#D4AF37]/20">
                    {category} <button onClick={() => setFilter("category", "")}><X size={12} /></button>
                  </span>
                )}
                {brand && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-white/5 text-white/70 text-xs font-medium border border-white/10">
                    {brand} <button onClick={() => setFilter("brand", "")}><X size={12} /></button>
                  </span>
                )}
                {search && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-white/5 text-white/70 text-xs font-medium border border-white/10">
                    &quot;{search}&quot; <button onClick={() => setFilter("search", "")}><X size={12} /></button>
                  </span>
                )}
                <button onClick={() => setSearchParams({})} className="text-xs text-white/40 hover:text-red-400 font-medium ml-1">Clear all</button>
              </>
            )}
            <p className="text-sm text-white/45">
              <span className="font-semibold text-white">{total}</span> products
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white/5 rounded-sm p-0.5 border border-white/[0.06]">
            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-sm transition-all ${viewMode === "grid" ? "bg-white/10 text-white" : "text-white/35"}`}><Grid3X3 size={15} /></button>
            <button onClick={() => setViewMode("list")} className={`p-2 rounded-sm transition-all ${viewMode === "list" ? "bg-white/10 text-white" : "text-white/35"}`}><List size={15} /></button>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-28 bg-white/[0.02] rounded-sm border border-white/[0.06]">
            <Package size={48} className="mx-auto text-white/15 mb-4" />
            <p className="text-white font-semibold">No products found</p>
            <button onClick={() => setSearchParams({})} className="mt-5 px-5 py-2.5 bg-[#D4AF37] hover:bg-[#F2C94C] text-black text-sm font-semibold rounded-sm transition-colors">View All</button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {products.map((p) => {
              const hasRealImage = p.images?.length > 0 && p.images[0]?.storage_path;
              return (
                <Link key={p.slug} to={`/catalog/products/${p.slug}`}
                  className="group card-premium rounded-sm overflow-hidden hover-lift"
                  data-testid={`catalog-product-card-${p.slug}`}>
                  <div className="aspect-[4/3] bg-[#0D0D0D] flex items-center justify-center overflow-hidden p-5 relative">
                    {hasRealImage ? (
                      <img src={`${API}/api/files/${p.images[0].storage_path}`} alt={`${p.product_name_display}${p.brand ? ` by ${p.brand}` : ''} — ${divInfo.name} medical device from Meril Life Sciences`}
                        className="max-w-full max-h-full object-contain opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" loading="lazy" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Bone size={32} className="text-white/8" />
                        <span className="text-[10px] text-white/20">{p.category || divInfo.name}</span>
                      </div>
                    )}
                    {p.brand && (
                      <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#0A0A0A]/80 backdrop-blur px-2 py-0.5 rounded border border-[#D4AF37]/20">
                        {p.brand}
                      </span>
                    )}
                    {p.shadow_sku_count > 0 && (
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold text-white/60 bg-[#0A0A0A]/80 backdrop-blur px-2 py-0.5 rounded border border-white/10">
                        <Layers size={10} /> {p.shadow_sku_count} SKUs
                      </span>
                    )}
                  </div>
                  <div className="p-5 text-center">
                    {p.category && <p className="text-[11px] text-[#D4AF37] font-semibold uppercase tracking-wider mb-1.5">{p.category}</p>}
                    <h3 className="font-semibold text-white group-hover:text-[#D4AF37] transition-colors line-clamp-2 leading-snug" style={{ fontFamily: 'Outfit' }}>{p.product_name_display}</h3>
                    <p className="text-xs text-white/45 mt-1.5 line-clamp-2 leading-relaxed">{p.description}</p>
                    <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
                      {p.semantic_material_default && (
                        <span className="text-[10px] font-semibold text-[#2DD4BF] bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 px-2.5 py-0.5 rounded">{p.semantic_material_default}</span>
                      )}
                      {p.brand && (
                        <span className="text-[10px] font-semibold text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2.5 py-0.5 rounded">{p.brand}</span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-1 text-xs text-[#D4AF37] font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300">
                      View Details <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((p) => {
              const hasRealImage = p.images?.length > 0 && p.images[0]?.storage_path;
              return (
                <Link key={p.slug} to={`/catalog/products/${p.slug}`}
                  className="group flex items-center gap-5 card-premium rounded-sm p-4 hover-lift"
                  data-testid={`catalog-product-list-${p.slug}`}>
                  <div className="w-20 h-20 bg-[#0D0D0D] rounded-sm flex items-center justify-center shrink-0 overflow-hidden p-2">
                    {hasRealImage ? (
                      <img src={`${API}/api/files/${p.images[0].storage_path}`} alt={`${p.product_name_display}${p.brand ? ` by ${p.brand}` : ''} — ${divInfo.name} device`} className="w-full h-full object-contain opacity-80" loading="lazy" />
                    ) : (<Bone size={24} className="text-white/10" />)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {p.brand && <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">{p.brand}</span>}
                      {p.category && <span className="text-[10px] text-white/40">{p.category}</span>}
                    </div>
                    <h3 className="font-semibold text-sm text-white group-hover:text-[#D4AF37] transition-colors truncate" style={{ fontFamily: 'Outfit' }}>{p.product_name_display}</h3>
                    <p className="text-xs text-white/40 truncate mt-0.5">{p.description}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:flex items-center gap-3">
                    {p.shadow_sku_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-white/40 bg-white/5 px-2.5 py-1 rounded border border-white/[0.06]">
                        <Tag size={11} /> {p.shadow_sku_count} SKUs
                      </span>
                    )}
                    <ArrowRight size={14} className="text-white/20 group-hover:text-[#D4AF37] transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10" data-testid="catalog-pagination">
            <button onClick={() => goPage(page - 1)} disabled={page <= 1}
              className="flex items-center gap-1 px-4 py-2.5 border border-white/10 rounded-sm text-sm font-medium text-white/50 hover:bg-white/5 disabled:opacity-20 transition-all">
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="text-sm text-white/40">Page {page} of {pages}</span>
            <button onClick={() => goPage(page + 1)} disabled={page >= pages}
              className="flex items-center gap-1 px-4 py-2.5 border border-white/10 rounded-sm text-sm font-medium text-white/50 hover:bg-white/5 disabled:opacity-20 transition-all">
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
