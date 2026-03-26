import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, Package, Grid3X3, List, ChevronLeft, ChevronRight } from "lucide-react";
import { getProducts, getDivisions } from "../lib/api";

const DIVISIONS = [
  "Orthopedics", "Cardiovascular", "Diagnostics",
  "ENT", "Endo-surgical", "Infection Prevention", "Peripheral Intervention",
  "Critical Care", "Urology", "Robotics"
];

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");

  const division = searchParams.get("division") || "";
  const category = searchParams.get("category") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 12 };
    if (division) params.division = division;
    if (category) params.category = category;
    if (search) params.search = search;

    getProducts(params)
      .then((r) => {
        setProducts(r.data.products);
        setTotal(r.data.total);
        setPages(r.data.pages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [division, category, search, page]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete("page");
    if (key === "division") next.delete("category");
    setSearchParams(next);
  };

  const goPage = (p) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(p));
    setSearchParams(next);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link to="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Products</span>
            {division && <><span>/</span><span className="text-slate-900 font-medium">{division}</span></>}
            {category && <><span>/</span><span className="text-emerald-600 font-medium">{category}</span></>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-56 shrink-0" data-testid="product-filters">
            <div className="bg-white border border-slate-200 rounded-sm p-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 mb-3 flex items-center gap-2">
                <SlidersHorizontal size={14} /> Filters
              </h3>

              {/* Division filter */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-600 mb-2">Division</p>
                <button
                  onClick={() => setFilter("division", "")}
                  className={`block w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${
                    !division ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  All Divisions
                </button>
                {DIVISIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setFilter("division", d)}
                    className={`block w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${
                      division === d ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
                    }`}
                    data-testid={`filter-division-${d.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Clear */}
              {(division || category || search) && (
                <button
                  onClick={() => setSearchParams({})}
                  className="w-full text-sm text-red-500 hover:text-red-700 font-medium py-2"
                  data-testid="clear-filters-btn"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-black text-slate-900" style={{ fontFamily: "Chivo" }}>
                  {division || "All Products"}
                  {category && ` — ${category}`}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">{total} product{total !== 1 ? "s" : ""} found</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded ${viewMode === "grid" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700"}`}
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded ${viewMode === "list" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-700"}`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-200 rounded-sm">
                <Package size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">No products found matching your criteria.</p>
                <button onClick={() => setSearchParams({})} className="mt-3 text-sm text-emerald-600 font-medium hover:text-emerald-700">
                  Clear filters
                </button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {products.map((p) => (
                  <Link
                    key={p.id}
                    to={`/products/${p.id}`}
                    className="group bg-white border border-slate-200 rounded-sm hover-lift overflow-hidden"
                    data-testid={`product-card-${p.id}`}
                  >
                    <div className="h-36 bg-slate-50 flex items-center justify-center overflow-hidden">
                      {p.images && p.images.length > 0 ? (
                        <img
                          src={`${process.env.REACT_APP_BACKEND_URL}/api/files/${p.images[0].storage_path}`}
                          alt={p.product_name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          data-testid={`product-image-${p.id}`}
                        />
                      ) : (
                        <Package size={36} className="text-slate-200" />
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">{p.division}</span>
                        {p.category && <span className="text-[10px] text-slate-300">|</span>}
                        {p.category && <span className="text-[10px] text-slate-400">{p.category}</span>}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors" style={{ fontFamily: "Chivo" }}>
                        {p.product_name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-2">SKU: {p.sku_code}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((p) => (
                  <Link
                    key={p.id}
                    to={`/products/${p.id}`}
                    className="group flex items-center gap-4 bg-white border border-slate-200 rounded-sm p-4 hover-lift"
                    data-testid={`product-list-${p.id}`}
                  >
                    <div className="w-16 h-16 bg-slate-50 rounded flex items-center justify-center shrink-0 overflow-hidden">
                      {p.images && p.images.length > 0 ? (
                        <img
                          src={`${process.env.REACT_APP_BACKEND_URL}/api/files/${p.images[0].storage_path}`}
                          alt={p.product_name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <Package size={24} className="text-slate-200" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">{p.division}</span>
                        {p.category && <span className="text-[10px] text-slate-400">{p.category}</span>}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors truncate" style={{ fontFamily: "Chivo" }}>
                        {p.product_name}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">{p.description}</p>
                    </div>
                    <span className="text-xs font-mono text-slate-400 shrink-0">{p.sku_code}</span>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => goPage(page - 1)}
                  disabled={page <= 1}
                  className="p-2 border border-slate-200 rounded disabled:opacity-30 hover:bg-slate-50"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => goPage(p)}
                    className={`w-9 h-9 text-sm rounded ${p === page ? "bg-slate-900 text-white" : "border border-slate-200 hover:bg-slate-50"}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => goPage(page + 1)}
                  disabled={page >= pages}
                  className="p-2 border border-slate-200 rounded disabled:opacity-30 hover:bg-slate-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
