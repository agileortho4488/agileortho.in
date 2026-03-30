import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft, X, Plus, GitCompare, ChevronRight,
  Bone, HeartPulse, Microscope, Activity, Search
} from "lucide-react";
import { toast } from "sonner";
import { SEO } from "../components/SEO";

const API = process.env.REACT_APP_BACKEND_URL;

const DIVISION_ICONS = { Trauma: Bone, Cardiovascular: HeartPulse, Diagnostics: Microscope, "Joint Replacement": Activity };

export default function CatalogCompare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const slugs = (searchParams.get("products") || "").split(",").filter(Boolean);

  // Fetch comparison when slugs change
  useEffect(() => {
    if (slugs.length < 2) {
      setComparison(null);
      return;
    }
    setLoading(true);
    fetch(`${API}/api/catalog/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs }),
    })
      .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
      .then(data => setComparison(data))
      .catch(err => {
        toast.error(err.detail || "Comparison failed");
        setComparison(null);
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  // Fetch suggestions from first product
  useEffect(() => {
    if (slugs.length >= 1) {
      fetch(`${API}/api/catalog/compare/suggestions/${slugs[0]}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setSuggestions(data.suggestions || []); })
        .catch(() => {});
    }
  }, [slugs[0]]);

  const addProduct = (slug) => {
    if (slugs.includes(slug)) return;
    if (slugs.length >= 4) { toast.error("Maximum 4 products"); return; }
    const next = [...slugs, slug];
    setSearchParams({ products: next.join(",") });
    setShowSuggestions(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeProduct = (slug) => {
    const next = slugs.filter(s => s !== slug);
    setSearchParams(next.length ? { products: next.join(",") } : {});
  };

  // Search products
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      setSearching(true);
      const div = comparison?.division || "";
      const q = div ? `&division=${div}` : "";
      fetch(`${API}/api/catalog/products?search=${encodeURIComponent(searchQuery)}${q}&limit=8`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) setSearchResults((data.products || []).filter(p => !slugs.includes(p.slug)));
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const DivIcon = comparison ? (DIVISION_ICONS[comparison.division] || Bone) : GitCompare;

  return (
    <div className="min-h-screen bg-white/5">
      <SEO
        title="Compare Medical Devices"
        description="Compare specifications of Meril medical devices side-by-side. Find the right product for your hospital."
        noIndex={true}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/catalog" className="text-white/45 hover:text-white/50 transition-colors" data-testid="compare-back-btn">
            <ArrowLeft size={20} />
          </Link>
          <div className="w-10 h-10 rounded-sm bg-[#0D0D0D] flex items-center justify-center">
            <GitCompare size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight" data-testid="compare-title">Product Comparison</h1>
            {comparison && <p className="text-sm text-white/40">{comparison.division} — {comparison.products.length} products</p>}
          </div>
          {comparison?.comparison_basis && (
            <div className="ml-auto flex items-center gap-2" data-testid="compare-basis-badge">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                comparison.comparison_confidence === "high" ? "text-[#2DD4BF] bg-[#2DD4BF]/10 border-emerald-200" :
                comparison.comparison_confidence === "medium" ? "text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/20" :
                "text-white/40 bg-white/5 border-white/10"
              }`}>{comparison.comparison_confidence} confidence</span>
              <span className="text-[10px] text-white/45 max-w-xs truncate">{comparison.comparison_guardrail_reason}</span>
            </div>
          )}
        </div>

        {/* Empty state */}
        {slugs.length === 0 && (
          <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-12 text-center" data-testid="compare-empty">
            <GitCompare size={48} className="text-slate-200 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white/70 mb-2">Select Products to Compare</h2>
            <p className="text-sm text-white/45 mb-6 max-w-md mx-auto">Browse the catalog and click "Compare" on product pages to add them here. Compare up to 4 products from the same division.</p>
            <Link to="/catalog" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0D0D0D] text-white text-sm font-semibold rounded-sm hover:bg-slate-800 transition-colors" data-testid="compare-browse-btn">
              Browse Products <ChevronRight size={14} />
            </Link>
          </div>
        )}

        {/* Need one more product */}
        {slugs.length === 1 && !loading && (
          <div className="space-y-6">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-8 text-center" data-testid="compare-need-more">
              <p className="text-white/40 mb-4">Add at least one more product from the same division to compare.</p>
            </div>
            {suggestions.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-3">Suggested Comparisons</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {suggestions.filter(s => s.slug !== slugs[0]).slice(0, 8).map(s => (
                    <button
                      key={s.slug}
                      onClick={() => addProduct(s.slug)}
                      className="text-left bg-[#0A0A0A] border border-slate-150 rounded-sm p-4 hover:border-amber-300 hover:shadow-sm transition-all group"
                      data-testid={`compare-suggestion-${s.slug}`}
                    >
                      <span className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-wider">{s.comparison_reason}</span>
                      <p className="text-sm font-bold text-white/90 mt-1 line-clamp-2 group-hover:text-[#D4AF37] transition-colors">{s.product_name_display}</p>
                      {s.clinical_subtitle && <p className="text-[10px] text-white/45 mt-1 line-clamp-1">{s.clinical_subtitle}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-12 text-center">
            <div className="w-8 h-8 border-2 border-white/10 border-t-slate-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-white/45">Loading comparison...</p>
          </div>
        )}

        {/* Comparison table */}
        {comparison && !loading && (
          <div className="space-y-6" data-testid="compare-table">
            {/* Product headers */}
            <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${comparison.products.length}, 1fr)` }}>
              {/* Add product cell */}
              <div className="flex items-end">
                {slugs.length < 4 && (
                  <button
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37] hover:text-[#D4AF37] transition-colors"
                    data-testid="compare-add-btn"
                  >
                    <Plus size={14} /> Add Product
                  </button>
                )}
              </div>
              {comparison.products.map((p, i) => (
                <div key={p.slug} className="bg-[#0A0A0A] border border-white/10 rounded-sm p-4 relative group" data-testid={`compare-product-header-${i}`}>
                  <button
                    onClick={() => removeProduct(p.slug)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/5 hover:bg-red-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`compare-remove-${p.slug}`}
                  >
                    <X size={12} className="text-white/45 hover:text-red-500" />
                  </button>
                  <Link to={`/catalog/products/${p.slug}`} className="block hover:opacity-80 transition-opacity">
                    <div className="w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center mb-3">
                      <DivIcon size={18} className="text-white/45" />
                    </div>
                    <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug">{p.product_name_display}</h3>
                    {p.clinical_subtitle && <p className="text-[10px] text-white/45 mt-1 line-clamp-1">{p.clinical_subtitle}</p>}
                  </Link>
                </div>
              ))}
            </div>

            {/* Add product panel */}
            {showSuggestions && (
              <div className="bg-[#0A0A0A] border border-[#D4AF37]/20 rounded-sm p-5 space-y-4" data-testid="compare-add-panel">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
                  <input
                    type="text"
                    placeholder={`Search ${comparison.division} products...`}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-white/10 rounded-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300"
                    data-testid="compare-search-input"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {searchResults.map(r => (
                      <button key={r.slug} onClick={() => addProduct(r.slug)}
                        className="text-left p-3 border border-white/[0.06] rounded-sm hover:border-amber-300 hover:bg-[#D4AF37]/10 transition-all"
                        data-testid={`compare-search-result-${r.slug}`}
                      >
                        <p className="text-xs font-bold text-white/90 line-clamp-2">{r.product_name_display}</p>
                        {r.clinical_subtitle && <p className="text-[9px] text-white/45 mt-0.5">{r.clinical_subtitle}</p>}
                      </button>
                    ))}
                  </div>
                )}
                {suggestions.filter(s => !slugs.includes(s.slug)).length > 0 && !searchQuery && (
                  <div>
                    <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider mb-2">Suggestions</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {suggestions.filter(s => !slugs.includes(s.slug)).slice(0, 4).map(s => (
                        <button key={s.slug} onClick={() => addProduct(s.slug)}
                          className="text-left p-3 border border-white/[0.06] rounded-sm hover:border-amber-300 hover:bg-[#D4AF37]/10 transition-all">
                          <span className="text-[8px] font-bold text-[#D4AF37] uppercase">{s.comparison_reason}</span>
                          <p className="text-xs font-bold text-white/90 line-clamp-2 mt-0.5">{s.product_name_display}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Comparison rows */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-sm overflow-hidden" data-testid="compare-rows">
              {comparison.comparison.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid items-center ${i % 2 === 0 ? "bg-[#0A0A0A]" : "bg-white/5/50"} ${row.is_different ? "border-l-2 border-l-amber-400" : ""}`}
                  style={{ gridTemplateColumns: `200px repeat(${comparison.products.length}, 1fr)` }}
                  data-testid={`compare-row-${i}`}
                >
                  <div className="px-5 py-3.5">
                    <span className="text-xs font-semibold text-white/40">{row.label}</span>
                  </div>
                  {row.values.map((val, vi) => (
                    <div key={vi} className={`px-5 py-3.5 text-sm ${val === "—" ? "text-white/35" : "text-white/90 font-medium"} ${row.is_different && val !== "—" ? "bg-[#D4AF37]/10/30" : ""}`}>
                      {val}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Description comparison */}
            <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${comparison.products.length}, 1fr)` }}>
              <div className="flex items-start pt-4">
                <span className="text-xs font-semibold text-white/40">Description</span>
              </div>
              {comparison.products.map(p => (
                <div key={p.slug} className="bg-[#0A0A0A] border border-white/10 rounded-sm p-4">
                  <p className="text-xs text-white/50 leading-relaxed line-clamp-6">{p.description || "No description available"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
