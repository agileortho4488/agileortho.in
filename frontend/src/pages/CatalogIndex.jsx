import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, ChevronRight, Bone, HeartPulse, Activity, Microscope, ShieldCheck, Scissors, Wrench, Dumbbell, EarOff, Droplets, Heart, GitBranch, Cpu, ArrowRight } from "lucide-react";
import { getCatalogDivisions } from "@/lib/api";
import { SEO, buildBreadcrumbSchema, buildItemListSchema } from "@/components/SEO";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DIVISION_ICONS = {
  "Trauma": Bone, "Cardiovascular": HeartPulse, "Joint Replacement": Activity,
  "Diagnostics": Microscope, "Infection Prevention": ShieldCheck,
  "Endo Surgery": Scissors, "Instruments": Wrench, "Sports Medicine": Dumbbell,
  "ENT": EarOff, "Urology": Droplets, "Critical Care": Heart,
  "Peripheral Intervention": GitBranch, "Robotics": Cpu,
};

export default function CatalogIndex() {
  const [divisions, setDivisions] = useState([]);
  const [stats, setStats] = useState({ products: 0, divisions: 0, categories: 0 });
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    getCatalogDivisions()
      .then((r) => {
        const divs = r.data.divisions || [];
        setDivisions(divs);
        setStats({
          products: r.data.total_products || 0,
          divisions: divs.length,
          categories: divs.reduce((acc, d) => acc + (d.categories || []).length, 0),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) {
      setSearchQuery(q);
      doSearch(q);
    }
  }, [searchParams]);

  const doSearch = async (q) => {
    if (!q.trim()) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const res = await fetch(`${API_URL}/api/products?search=${encodeURIComponent(q)}&limit=20`);
      const data = await res.json();
      setSearchResults(data);
    } catch { setSearchResults(null); }
    finally { setSearching(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    doSearch(searchQuery);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const catalogJsonLd = divisions.length > 0 ? [
    buildBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Product Catalog" }
    ]),
    buildItemListSchema(
      divisions.map(d => ({ product_name: d.name, id: d.slug })),
      "All Divisions"
    )
  ] : [];

  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="catalog-index">
      <SEO
        title="Medical Device Catalog — 810+ Meril Products"
        description={`Browse ${stats.products || '810+'}  verified Meril medical devices across ${stats.divisions || 13} clinical divisions including Trauma, Cardiovascular, Joint Replacement, Diagnostics, and more. Authorized distributor for Telangana hospitals.`}
        canonical="/catalog"
        jsonLd={catalogJsonLd.length === 1 ? catalogJsonLd[0] : catalogJsonLd}
      />
      {/* Header */}
      <div className="border-b border-white/[0.06] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="h-px w-8 bg-[#D4AF37]" />
            <span className="text-xs font-bold text-[#D4AF37] tracking-[0.2em] uppercase">Verified Product Catalog</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-white" style={{ fontFamily: 'Outfit' }} data-testid="catalog-title">
            Product Catalog
          </h1>
          <p className="mt-3 text-sm text-white/55">
            <span className="text-white font-medium">{stats.products}</span> verified products across{" "}
            <span className="text-white font-medium">{stats.divisions}</span> divisions and{" "}
            <span className="text-white font-medium">{stats.categories}</span> categories.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="mt-8 flex items-center gap-0 max-w-xl" data-testid="catalog-search-form">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, SKUs, brands..."
                className="w-full bg-white/5 border border-white/10 rounded-l-sm pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                data-testid="catalog-search-input"
              />
            </div>
            <button type="submit" className="bg-[#D4AF37] hover:bg-[#F2C94C] text-black font-semibold px-6 py-3 rounded-r-sm text-sm transition-colors" data-testid="catalog-search-btn">
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Search Results */}
      {searchResults && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10" data-testid="search-results">
          <p className="text-sm text-white/50 mb-6">
            {searching ? "Searching..." : `Found ${searchResults.total} result(s) for "${searchQuery}"`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(searchResults.products || []).map((p) => (
              <Link
                key={p.slug || p.product_name}
                to={`/catalog/products/${p.slug}`}
                className="card-premium rounded-sm p-5 group"
                data-testid={`search-result-${p.slug}`}
              >
                <p className="text-xs text-[#D4AF37] font-medium mb-1">{p.division_canonical}</p>
                <h3 className="text-sm font-medium text-white group-hover:text-[#D4AF37] transition-colors" style={{ fontFamily: 'Outfit' }}>
                  {p.product_name_display || p.product_name}
                </h3>
                {p.semantic_brand_system && (
                  <p className="mt-1 text-xs text-white/30">{p.semantic_brand_system}</p>
                )}
                {p.category && (
                  <p className="mt-2 text-xs text-white/20">{p.category}</p>
                )}
              </Link>
            ))}
          </div>
          <button
            onClick={() => { setSearchResults(null); setSearchQuery(""); }}
            className="mt-6 text-sm text-[#2DD4BF] hover:text-[#5EEAD4] transition-colors"
          >
            &larr; Back to all divisions
          </button>
        </div>
      )}

      {/* Division Grid */}
      {!searchResults && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {divisions.map((div, i) => {
              const Icon = DIVISION_ICONS[div.name] || Bone;
              return (
                <Link
                  key={div.name}
                  to={`/catalog/${div.slug}`}
                  className={`group card-premium rounded-sm p-6 animate-fade-up stagger-${Math.min(i + 1, 8)}`}
                  data-testid={`catalog-division-${div.slug}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center border border-white/[0.06] group-hover:border-[#D4AF37]/30 transition-colors">
                      <Icon size={18} strokeWidth={1.5} className="text-[#D4AF37]" />
                    </div>
                    <span className="text-xs font-bold text-[#2DD4BF] bg-[#2DD4BF]/10 px-2 py-0.5 rounded">
                      {div.product_count}
                    </span>
                  </div>

                  <h3 className="text-base font-medium text-white group-hover:text-[#D4AF37] transition-colors" style={{ fontFamily: 'Outfit' }}>
                    {div.name}
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {(div.categories || []).slice(0, 3).map((cat) => (
                      <span key={cat} className="text-[10px] bg-white/5 text-white/55 px-1.5 py-0.5 rounded">{cat}</span>
                    ))}
                    {(div.categories || []).length > 3 && (
                      <span className="text-[10px] text-white/40">+{(div.categories || []).length - 3} more</span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-white/40">
                    <span>{(div.categories || []).length} categories &middot; {(div.brands || []).length} brands</span>
                    <span className="text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      Browse <ArrowRight size={10} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
