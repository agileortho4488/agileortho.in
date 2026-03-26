import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search, SlidersHorizontal, Package, Grid3X3, List,
  ChevronLeft, ChevronRight, ChevronDown, X, Layers,
  Bone, HeartPulse, Microscope, Stethoscope, Scissors,
  Shield, Activity, Syringe, Scan, CircuitBoard, Dumbbell,
  Disc, Replace, Wrench, ArrowRight
} from "lucide-react";
import { getCategoryStats, getProductFamilies, getDivisions } from "../lib/api";
import { SEO, buildBreadcrumbSchema } from "../components/SEO";

const API = process.env.REACT_APP_BACKEND_URL;

const DIVISION_ICONS = {
  "Joint Replacement": Replace, "Trauma": Bone, "Sports Medicine": Dumbbell,
  "Spine": Disc, "Instruments": Wrench, "Cardiovascular": HeartPulse,
  "Diagnostics": Microscope, "ENT": Stethoscope, "Endo-surgical": Scissors,
  "Infection Prevention": Shield, "Peripheral Intervention": Activity,
  "Critical Care": Syringe, "Urology": Scan, "Robotics": CircuitBoard,
};

const DIVISIONS = [
  "Joint Replacement", "Trauma", "Sports Medicine", "Spine", "Instruments",
  "Cardiovascular", "Diagnostics", "ENT", "Endo-surgical",
  "Infection Prevention", "Peripheral Intervention",
  "Critical Care", "Urology", "Robotics"
];

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [families, setFamilies] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [divisionCounts, setDivisionCounts] = useState({});
  const [divisionCategories, setDivisionCategories] = useState({});
  const [totalProducts, setTotalProducts] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const division = searchParams.get("division") || "";
  const category = searchParams.get("category") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");

  // Determine view mode: category-level or product-level
  const showCategories = division && !category && !search;
  const showFamilies = category || search || (!division && !category);

  useEffect(() => {
    getDivisions().then((r) => {
      const counts = {};
      const cats = {};
      let tp = 0;
      (r.data.divisions || []).forEach((d) => {
        counts[d.name] = d.product_count;
        cats[d.name] = d.categories || [];
        tp += d.product_count;
      });
      setDivisionCounts(counts);
      setDivisionCategories(cats);
      setTotalProducts(tp);
    }).catch(() => {});
  }, []);

  // Fetch category stats when division is selected (no category filter)
  useEffect(() => {
    if (!showCategories) return;
    setLoading(true);
    getCategoryStats({ division }).then((r) => {
      setCategories(r.data.categories || []);
      setTotal(r.data.total || 0);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, [division, showCategories]);

  // Fetch product families when category is selected or searching
  useEffect(() => {
    if (!showFamilies) return;
    setLoading(true);
    const params = { page, limit: 12 };
    if (division) params.division = division;
    if (category) params.category = category;
    if (search) params.search = search;

    getProductFamilies(params).then((r) => {
      setFamilies(r.data.families || []);
      setTotal(r.data.total || 0);
      setPages(r.data.pages || 1);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, [division, category, search, page, showFamilies]);

  useEffect(() => { setSearchInput(search); }, [search]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) { next.set(key, value); } else { next.delete(key); }
    next.delete("page");
    if (key === "division") next.delete("category");
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

  const hasActiveFilters = division || category || search;

  const seoTitle = category ? `${category} - ${division}` : division ? `${division} Medical Devices` : "Medical Device Catalog";
  const seoDesc = category
    ? `Browse ${category} medical devices in ${division}. Multiple systems and sizes available.`
    : division
    ? `Browse ${division} medical devices from authorized Meril distributor in Telangana.`
    : `Browse ${totalProducts}+ medical devices across ${Object.keys(divisionCounts).length} divisions.`;
  const breadcrumbs = [{ name: "Home", url: "/" }, { name: "Products", url: "/products" }];
  if (division) breadcrumbs.push({ name: division, url: `/products?division=${encodeURIComponent(division)}` });
  if (category) breadcrumbs.push({ name: category });

  return (
    <div className="min-h-screen bg-white font-[Manrope]">
      <SEO title={seoTitle} description={seoDesc}
        canonical={division ? `/products?division=${encodeURIComponent(division)}` : "/products"}
        jsonLd={[buildBreadcrumbSchema(breadcrumbs)]} />

      {/* ===== HERO BANNER ===== */}
      <section className="bg-slate-900 relative overflow-hidden" data-testid="products-hero">
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500 via-transparent to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-10 lg:py-14">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-5 flex-wrap" data-testid="breadcrumb">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={12} />
            {!division ? (
              <span className="text-white font-medium">Products</span>
            ) : (
              <Link to="/products" className="hover:text-white transition-colors">Products</Link>
            )}
            {division && (
              <>
                <ChevronRight size={12} />
                {!category ? (
                  <span className="text-white font-medium">{division}</span>
                ) : (
                  <Link to={`/products?division=${encodeURIComponent(division)}`} className="hover:text-white transition-colors">{division}</Link>
                )}
              </>
            )}
            {category && (
              <>
                <ChevronRight size={12} />
                <span className="text-teal-400 font-medium">{category}</span>
              </>
            )}
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="text-teal-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Product Catalog</p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight" data-testid="products-page-title">
                {category || division || "All Products"}
              </h1>
              <p className="mt-3 text-slate-400 text-base">
                {showCategories
                  ? `${categories.length} product categories in ${division}`
                  : category
                  ? `${total} product ${total !== 1 ? "systems" : "system"} in ${category}`
                  : search
                  ? `${total} results for "${search}"`
                  : `${totalProducts.toLocaleString()} medical devices across ${Object.keys(divisionCounts).length} divisions`
                }
              </p>
            </div>

            <form onSubmit={handleSearch} className="flex w-full lg:w-auto" data-testid="product-search-form">
              <div className="relative flex-1 lg:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search products, SKUs, categories..."
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-slate-700 rounded-l-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 focus:bg-white/15 transition-colors"
                  data-testid="product-search-input" />
              </div>
              <button type="submit" className="px-5 py-3 bg-teal-600 text-white text-sm font-semibold rounded-r-lg hover:bg-teal-700 transition-colors" data-testid="product-search-btn">Search</button>
            </form>
          </div>
        </div>
      </section>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Active filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-6" data-testid="active-filters">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Filters:</span>
            {division && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium border border-teal-100">
                {division}
                <button onClick={() => { const n = new URLSearchParams(); setSearchParams(n); }} className="hover:text-teal-900"><X size={12} /></button>
              </span>
            )}
            {category && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                {category}
                <button onClick={() => setFilter("category", "")} className="hover:text-slate-900"><X size={12} /></button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                &quot;{search}&quot;
                <button onClick={() => setFilter("search", "")} className="hover:text-slate-900"><X size={12} /></button>
              </span>
            )}
            <button onClick={() => setSearchParams({})} className="text-xs text-slate-500 hover:text-red-600 font-medium underline underline-offset-2 ml-2 transition-colors" data-testid="clear-filters-btn">Clear All</button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ===== SIDEBAR ===== */}
          <button onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="lg:hidden flex items-center justify-between w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"
            data-testid="mobile-filter-toggle">
            <span className="flex items-center gap-2"><SlidersHorizontal size={15} /> Filter by Division</span>
            <ChevronDown size={16} className={`transition-transform ${mobileFiltersOpen ? "rotate-180" : ""}`} />
          </button>

          <aside className={`lg:w-60 shrink-0 ${mobileFiltersOpen ? "block" : "hidden lg:block"}`} data-testid="product-filters">
            <div className="sticky top-20">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-900 mb-4 flex items-center gap-2">
                <SlidersHorizontal size={13} className="text-teal-600" /> Divisions
              </h3>
              <div className="space-y-0.5">
                <button onClick={() => setSearchParams({})}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm transition-all ${!division ? "bg-slate-900 text-white font-semibold shadow-md" : "text-slate-600 hover:bg-slate-50 font-medium"}`}
                  data-testid="filter-division-all">
                  <span className="flex items-center gap-2.5">
                    <Package size={15} className={!division ? "text-teal-400" : "text-slate-400"} /> All Divisions
                  </span>
                  <span className="text-xs text-slate-400">{totalProducts > 0 ? totalProducts : ""}</span>
                </button>

                {DIVISIONS.map((d) => {
                  const Icon = DIVISION_ICONS[d] || Package;
                  const isActive = division === d;
                  const subCats = divisionCategories[d] || [];
                  return (
                    <div key={d}>
                      <button onClick={() => setFilter("division", d)}
                        className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm transition-all ${isActive ? "bg-teal-50 text-teal-800 font-semibold border border-teal-200" : "text-slate-600 hover:bg-slate-50 font-medium"}`}
                        data-testid={`filter-division-${d.toLowerCase().replace(/\s/g, "-")}`}>
                        <span className="flex items-center gap-2.5">
                          <Icon size={15} className={isActive ? "text-teal-600" : "text-slate-400"} /> {d}
                        </span>
                        {divisionCounts[d] && <span className={`text-xs ${isActive ? "text-teal-600" : "text-slate-400"}`}>{divisionCounts[d]}</span>}
                      </button>
                      {/* Show subcategories when division active */}
                      {isActive && subCats.length > 0 && (
                        <div className="ml-6 mt-1 mb-2 space-y-0.5 border-l-2 border-teal-100 pl-3">
                          {subCats.map((cat) => (
                            <button key={cat} onClick={() => setFilter("category", cat)}
                              className={`block w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all ${category === cat ? "bg-teal-100 text-teal-800 font-semibold" : "text-slate-500 hover:text-teal-700 hover:bg-slate-50"}`}
                              data-testid={`filter-category-${cat.toLowerCase().replace(/\s/g, "-")}`}>
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* ===== MAIN GRID ===== */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-900">{showCategories ? categories.length : total}</span>
                {showCategories ? " categories" : ` product ${total !== 1 ? "ranges" : "range"}`}
                {search && <> matching &quot;<span className="text-teal-600">{search}</span>&quot;</>}
              </p>
              {!showCategories && (
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                  <button onClick={() => setViewMode("grid")} className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`} data-testid="view-grid-btn"><Grid3X3 size={15} /></button>
                  <button onClick={() => setViewMode("list")} className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`} data-testid="view-list-btn"><List size={15} /></button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-28">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-slate-400">Loading...</p>
                </div>
              </div>
            ) : showCategories ? (
              /* ═══ CATEGORY CARDS VIEW ═══ */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5" data-testid="category-grid">
                {categories.map((c) => {
                  const Icon = DIVISION_ICONS[c.division] || Package;
                  return (
                    <button key={`${c.division}-${c.category}`}
                      onClick={() => setFilter("category", c.category)}
                      className="group bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-lg hover:border-teal-200 transition-all duration-300 text-left"
                      data-testid={`category-card-${c.category.toLowerCase().replace(/\s/g, "-")}`}>
                      <div className="h-36 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden relative">
                        <Icon size={48} className="text-slate-200 group-hover:text-teal-200 transition-colors duration-300" strokeWidth={1} />
                        {c.image && c.image.length > 0 && (
                          <img src={`${API}/api/files/${c.image[0].storage_path}`} alt={c.category}
                            className="absolute inset-0 w-full h-full object-contain p-4 opacity-50 group-hover:opacity-80 transition-opacity" loading="lazy" />
                        )}
                        {c.has_brochure && (
                          <div className="absolute top-3 right-3">
                            <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">PDF Available</span>
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors text-base leading-snug">
                          {c.category}
                        </h3>
                        <div className="mt-3 flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                            <Layers size={11} /> {c.system_count} {c.system_count === 1 ? "system" : "systems"}
                          </span>
                          <span className="text-xs text-slate-400">{c.sku_count} SKUs</span>
                        </div>
                        <div className="mt-3 flex items-center text-xs text-teal-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                          Browse Systems <ArrowRight size={12} className="ml-1" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : families.length === 0 ? (
              <div className="text-center py-28 bg-slate-50 rounded-2xl border border-slate-100">
                <Package size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-700 font-semibold mb-1">No products found</p>
                <p className="text-sm text-slate-500">Try adjusting your search or filter criteria.</p>
                <button onClick={() => setSearchParams({})} className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors" data-testid="empty-clear-filters-btn">View All Products</button>
              </div>
            ) : viewMode === "grid" ? (
              /* ═══ PRODUCT FAMILY GRID ═══ */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5" data-testid="family-grid">
                {families.map((f) => (
                  <Link key={f.family_name}
                    to={f.variant_count > 1 ? `/products/family/${encodeURIComponent(f.family_name)}` : `/products/${f.id}`}
                    className="group bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-lg hover:border-teal-200 transition-all duration-300"
                    data-testid={`product-family-card-${f.id}`}>
                    <div className="h-48 bg-slate-50 flex items-center justify-center overflow-hidden p-4 relative">
                      {f.images && f.images.length > 0 ? (
                        <img src={`${API}/api/files/${f.images[0].storage_path}`} alt={f.family_name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      ) : (<Package size={40} className="text-slate-200" />)}
                      <div className="absolute top-3 left-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">{f.division}</span>
                      </div>
                      {f.variant_count > 1 && (
                        <div className="absolute top-3 right-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                            <Layers size={10} /> {f.variant_count} SKUs
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      {f.category && <p className="text-[11px] text-slate-400 font-medium mb-1.5">{f.category}</p>}
                      <h3 className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors line-clamp-2 leading-snug">{f.family_name}</h3>
                      <p className="text-sm text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{f.description}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-medium">
                          {f.variant_count > 1 ? `${f.variant_count} sizes available` : f.manufacturer || ""}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-teal-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                          {f.variant_count > 1 ? "View Range" : "View Details"} <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              /* ═══ PRODUCT FAMILY LIST ═══ */
              <div className="space-y-3" data-testid="family-list">
                {families.map((f) => (
                  <Link key={f.family_name}
                    to={f.variant_count > 1 ? `/products/family/${encodeURIComponent(f.family_name)}` : `/products/${f.id}`}
                    className="group flex items-center gap-5 bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-lg hover:border-teal-200 transition-all duration-300"
                    data-testid={`product-family-list-${f.id}`}>
                    <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 overflow-hidden p-2">
                      {f.images && f.images.length > 0 ? (
                        <img src={`${API}/api/files/${f.images[0].storage_path}`} alt={f.family_name} className="w-full h-full object-contain" loading="lazy" />
                      ) : (<Package size={24} className="text-slate-200" />)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600">{f.division}</span>
                        {f.category && <span className="text-[10px] text-slate-400">{f.category}</span>}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-teal-600 transition-colors truncate">{f.family_name}</h3>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{f.description}</p>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      {f.variant_count > 1 && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                          <Layers size={11} /> {f.variant_count} SKUs
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* ===== PAGINATION ===== */}
            {!showCategories && pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10" data-testid="pagination">
                <button onClick={() => goPage(page - 1)} disabled={page <= 1}
                  className="flex items-center gap-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  data-testid="pagination-prev"><ChevronLeft size={14} /> Prev</button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                    let pageNum;
                    if (pages <= 7) pageNum = i + 1;
                    else if (page <= 4) pageNum = i + 1;
                    else if (page >= pages - 3) pageNum = pages - 6 + i;
                    else pageNum = page - 3 + i;
                    return (
                      <button key={pageNum} onClick={() => goPage(pageNum)}
                        className={`w-10 h-10 text-sm font-medium rounded-lg transition-all ${pageNum === page ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
                        data-testid={`pagination-page-${pageNum}`}>{pageNum}</button>
                    );
                  })}
                </div>
                <button onClick={() => goPage(page + 1)} disabled={page >= pages}
                  className="flex items-center gap-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  data-testid="pagination-next">Next <ChevronRight size={14} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
