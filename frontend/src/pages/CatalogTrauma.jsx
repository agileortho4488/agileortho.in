import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search, Package, ChevronRight, ChevronLeft, X, Bone,
  Tag, Layers, Grid3X3, List, SlidersHorizontal, ChevronDown, BadgeCheck
} from "lucide-react";
import { getCatalogProducts, getCatalogDivisions } from "../lib/api";

const API = process.env.REACT_APP_BACKEND_URL;

export default function CatalogTrauma() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [divInfo, setDivInfo] = useState({ categories: [], brands: [], product_count: 0 });
  const [searchInput, setSearchInput] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const category = searchParams.get("category") || "";
  const brand = searchParams.get("brand") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");

  useEffect(() => {
    getCatalogDivisions().then((r) => {
      const trauma = (r.data.divisions || []).find((d) => d.name === "Trauma");
      if (trauma) setDivInfo(trauma);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { division: "Trauma", page, limit: 18 };
    if (category) params.category = category;
    if (brand) params.brand = brand;
    if (search) params.search = search;

    getCatalogProducts(params)
      .then((r) => {
        setProducts(r.data.products || []);
        setTotal(r.data.total || 0);
        setPages(r.data.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, brand, search, page]);

  useEffect(() => { setSearchInput(search); }, [search]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) { next.set(key, value); } else { next.delete(key); }
    next.delete("page");
    setSearchParams(next);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilter("search", searchInput.trim());
  };

  const goPage = (p) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(p));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasFilters = category || brand || search;

  return (
    <div className="min-h-screen bg-white font-[Manrope]" data-testid="catalog-trauma-page">
      {/* Hero */}
      <section className="bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-10 lg:py-14">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-5 flex-wrap" data-testid="catalog-breadcrumb">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={12} />
            <Link to="/products" className="hover:text-white transition-colors">Products</Link>
            <ChevronRight size={12} />
            <span className="text-white font-medium">Trauma</span>
            {category && (
              <>
                <ChevronRight size={12} />
                <span className="text-amber-400 font-medium">{category}</span>
              </>
            )}
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Bone size={20} className="text-amber-400" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                    <BadgeCheck size={10} /> Verified Catalog
                  </span>
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight" data-testid="catalog-title">
                Trauma Division
              </h1>
              <p className="mt-3 text-slate-400 text-base">
                {total} verified products across {divInfo.categories.length} categories
                {divInfo.brands.length > 0 && ` from ${divInfo.brands.length} brands`}
              </p>
            </div>

            <form onSubmit={handleSearch} className="flex w-full lg:w-auto">
              <div className="relative flex-1 lg:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search products, SKUs, brands..."
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-slate-700 rounded-l-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  data-testid="catalog-search-input" />
              </div>
              <button type="submit" className="px-5 py-3 bg-amber-600 text-white text-sm font-semibold rounded-r-lg hover:bg-amber-700 transition-colors" data-testid="catalog-search-btn">Search</button>
            </form>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Active filters */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-6" data-testid="catalog-active-filters">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Filters:</span>
            {category && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                {category} <button onClick={() => setFilter("category", "")}><X size={12} /></button>
              </span>
            )}
            {brand && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                {brand} <button onClick={() => setFilter("brand", "")}><X size={12} /></button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                &quot;{search}&quot; <button onClick={() => setFilter("search", "")}><X size={12} /></button>
              </span>
            )}
            <button onClick={() => setSearchParams({})} className="text-xs text-slate-500 hover:text-red-600 font-medium underline underline-offset-2 ml-2">Clear All</button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <button onClick={() => setFiltersOpen(!filtersOpen)}
            className="lg:hidden flex items-center justify-between w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700">
            <span className="flex items-center gap-2"><SlidersHorizontal size={15} /> Filters</span>
            <ChevronDown size={16} className={`transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </button>

          <aside className={`lg:w-56 shrink-0 ${filtersOpen ? "block" : "hidden lg:block"}`} data-testid="catalog-sidebar">
            <div className="sticky top-20 space-y-6">
              {/* Categories */}
              {divInfo.categories.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900 mb-3">Categories</h3>
                  <div className="space-y-0.5">
                    <button onClick={() => setFilter("category", "")}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!category ? "bg-amber-50 text-amber-700 font-semibold border border-amber-100" : "text-slate-600 hover:bg-slate-50"}`}
                      data-testid="cat-filter-all">All Categories</button>
                    {divInfo.categories.map((c) => (
                      <button key={c} onClick={() => setFilter("category", c)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${category === c ? "bg-amber-50 text-amber-700 font-semibold border border-amber-100" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
                        data-testid={`cat-filter-${c.toLowerCase().replace(/\s/g, "-")}`}>{c}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Brands */}
              {divInfo.brands.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900 mb-3">Brands</h3>
                  <div className="space-y-0.5">
                    <button onClick={() => setFilter("brand", "")}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!brand ? "bg-slate-100 text-slate-700 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}
                      data-testid="brand-filter-all">All Brands</button>
                    {divInfo.brands.map((b) => (
                      <button key={b} onClick={() => setFilter("brand", b)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${brand === b ? "bg-slate-100 text-slate-700 font-semibold" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
                        data-testid={`brand-filter-${b.toLowerCase().replace(/\s/g, "-")}`}>{b}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-900">{total}</span> products
                {search && <> matching &quot;<span className="text-amber-600">{search}</span>&quot;</>}
              </p>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                <button onClick={() => setViewMode("grid")} className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}><Grid3X3 size={15} /></button>
                <button onClick={() => setViewMode("list")} className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}><List size={15} /></button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-28">
                <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-28 bg-slate-50 rounded-2xl border border-slate-100">
                <Package size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-700 font-semibold">No products found</p>
                <button onClick={() => setSearchParams({})} className="mt-5 px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors">View All</button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5" data-testid="catalog-grid">
                {products.map((p) => {
                  const isBrochure = p.image_type === "brochure_cover";
                  const hasRealImage = p.images?.length > 0 && !isBrochure;
                  return (
                  <Link key={p.slug} to={`/catalog/products/${p.slug}`}
                    className="group bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-lg hover:border-amber-200 transition-all duration-300"
                    data-testid={`catalog-product-card-${p.slug}`}>
                    <div className="h-48 bg-slate-50 flex items-center justify-center overflow-hidden p-4 relative">
                      {hasRealImage ? (
                        <img src={`${API}/api/files/${p.images[0].storage_path}`} alt={p.product_name_display}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center">
                            <Bone size={28} className="text-slate-300" />
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">{p.category || "Trauma"}</span>
                        </div>
                      )}
                      {p.brand && (
                        <div className="absolute top-3 left-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                            {p.brand}{p.parent_brand && p.parent_brand !== p.brand && <span className="text-amber-500 font-medium normal-case tracking-normal"> by {p.parent_brand}</span>}
                          </span>
                        </div>
                      )}
                      {p.shadow_sku_count > 0 && (
                        <div className="absolute top-3 right-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                            <Layers size={10} /> {p.shadow_sku_count} SKUs
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      {p.category && <p className="text-[11px] text-slate-400 font-medium mb-1.5">{p.category}</p>}
                      <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2 leading-snug">{p.product_name_display}</h3>
                      <p className="text-sm text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{p.description}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-medium">{p.material || ""}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  </Link>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3" data-testid="catalog-list">
                {products.map((p) => {
                  const isBrochure = p.image_type === "brochure_cover";
                  const hasRealImage = p.images?.length > 0 && !isBrochure;
                  return (
                  <Link key={p.slug} to={`/catalog/products/${p.slug}`}
                    className="group flex items-center gap-5 bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-lg hover:border-amber-200 transition-all duration-300"
                    data-testid={`catalog-product-list-${p.slug}`}>
                    <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 overflow-hidden p-2">
                      {hasRealImage ? (
                        <img src={`${API}/api/files/${p.images[0].storage_path}`} alt={p.product_name_display} className="w-full h-full object-contain" loading="lazy" />
                      ) : (<Bone size={24} className="text-slate-200" />)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {p.brand && <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">{p.brand}{p.parent_brand && p.parent_brand !== p.brand && <span className="font-medium normal-case tracking-normal text-slate-400"> by {p.parent_brand}</span>}</span>}
                        {p.category && <span className="text-[10px] text-slate-400">{p.category}</span>}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-amber-600 transition-colors truncate">{p.product_name_display}</h3>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{p.description}</p>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      {p.shadow_sku_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                          <Tag size={11} /> {p.shadow_sku_count} SKUs
                        </span>
                      )}
                    </div>
                  </Link>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10" data-testid="catalog-pagination">
                <button onClick={() => goPage(page - 1)} disabled={page <= 1}
                  className="flex items-center gap-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors">
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="text-sm text-slate-500">Page {page} of {pages}</span>
                <button onClick={() => goPage(page + 1)} disabled={page >= pages}
                  className="flex items-center gap-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors">
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
