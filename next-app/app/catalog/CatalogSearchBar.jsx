"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";

export default function CatalogSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

  const doSearch = async (q) => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${backend}/api/catalog/products?search=${encodeURIComponent(q)}&limit=20`);
      const data = await res.json();
      setResults(data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) doSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const onSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    router.push(`/catalog${params.toString() ? "?" + params.toString() : ""}`);
    doSearch(query);
  };

  return (
    <>
      <form onSubmit={onSubmit} className="mt-8 flex items-center gap-0 max-w-xl" data-testid="catalog-search-form">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, SKUs, brands..."
            className="w-full bg-white/5 border border-white/10 rounded-l-sm pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
            data-testid="catalog-search-input"
          />
        </div>
        <button type="submit" className="bg-[#D4AF37] hover:bg-[#F2C94C] text-black font-semibold px-6 py-3 rounded-r-sm text-sm transition-colors" data-testid="catalog-search-btn">
          Search
        </button>
      </form>

      {results && (
        <div className="mt-10" data-testid="search-results">
          <p className="text-sm text-white/50 mb-6">
            {loading ? "Searching…" : `Found ${results.total} result(s) for "${query}"`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(results.products || []).map((p) => (
              <Link
                key={p.slug}
                href={`/catalog/products/${p.slug}`}
                className="card-premium rounded-sm p-5 group"
                data-testid={`search-result-${p.slug}`}
              >
                <p className="text-xs text-[#D4AF37] font-medium mb-1">{p.division_canonical || p.division}</p>
                <h3 className="text-sm font-medium text-white group-hover:text-[#D4AF37] transition-colors" style={{ fontFamily: "Outfit" }}>
                  {p.product_name_display || p.product_name}
                </h3>
                {p.semantic_brand_system && <p className="mt-1 text-xs text-white/30">{p.semantic_brand_system}</p>}
                {p.category && <p className="mt-2 text-xs text-white/20">{p.category}</p>}
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setResults(null);
              setQuery("");
              router.push("/catalog");
            }}
            className="mt-6 text-sm text-[#2DD4BF] hover:text-[#5EEAD4] transition-colors"
          >
            ← Back to all divisions
          </button>
        </div>
      )}
    </>
  );
}
