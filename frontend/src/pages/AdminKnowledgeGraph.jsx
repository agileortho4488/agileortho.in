import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Network, Link2, Package2, RefreshCw, Send, TrendingUp } from "lucide-react";
import {
  getKnowledgeGraphStats,
  getKnowledgeGraphTop,
  rebuildKnowledgeGraph,
  indexNowSubmitAll,
} from "../lib/api";

export default function AdminKnowledgeGraph() {
  const [stats, setStats] = useState(null);
  const [top, setTop] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [pinging, setPinging] = useState(false);

  const loadAll = () => {
    setLoading(true);
    Promise.all([getKnowledgeGraphStats(), getKnowledgeGraphTop(12)])
      .then(([s, t]) => {
        setStats(s.data);
        setTop(t.data.top || []);
      })
      .catch(() => toast.error("Failed to load knowledge graph"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const handleRebuild = async () => {
    if (!window.confirm("Rebuild the full product knowledge graph? This re-mines all relationships (takes ~30s).")) return;
    setRebuilding(true);
    try {
      const res = await rebuildKnowledgeGraph();
      toast.success(`Graph rebuilt: ${res.data.total_relationships || res.data.relationships_created || 0} edges`);
      loadAll();
    } catch {
      toast.error("Rebuild failed");
    } finally {
      setRebuilding(false);
    }
  };

  const handleIndexNow = async () => {
    setPinging(true);
    try {
      const res = await indexNowSubmitAll();
      toast.success(`Submitted ${res.data.total_urls} URLs to Bing/Yandex IndexNow`);
    } catch {
      toast.error("IndexNow submission failed");
    } finally {
      setPinging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="kg-loading">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const coverage = Number(stats.coverage_pct || 0);

  return (
    <div className="p-6" data-testid="admin-knowledge-graph">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-slate-900" style={{ fontFamily: "Chivo" }}>Knowledge Graph</h1>
          <p className="text-sm text-slate-500 mt-0.5">Product cross-sell edges mined from the live catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleIndexNow}
            disabled={pinging}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-sm text-sm text-slate-700 hover:border-slate-300 disabled:opacity-50"
            data-testid="indexnow-submit-btn"
          >
            <Send size={14} />{pinging ? "Pinging..." : "Ping IndexNow"}
          </button>
          <button
            onClick={handleRebuild}
            disabled={rebuilding}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-sm text-sm hover:bg-emerald-700 disabled:opacity-50"
            data-testid="rebuild-kg-btn"
          >
            <RefreshCw size={14} className={rebuilding ? "animate-spin" : ""} />
            {rebuilding ? "Rebuilding..." : "Rebuild Graph"}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Edges", value: stats.total_relationships, icon: Network, color: "text-emerald-600 bg-emerald-50" },
          { label: "REQUIRES", value: stats.requires_edges, icon: Link2, color: "text-amber-600 bg-amber-50" },
          { label: "BUNDLE", value: stats.bundle_edges, icon: Package2, color: "text-teal-600 bg-teal-50" },
          { label: "Products Covered", value: `${stats.products_covered}/${stats.total_products}`, icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-sm p-4" data-testid={`kg-stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
            <div className={`w-8 h-8 rounded flex items-center justify-center mb-2 ${color}`}>
              <Icon size={16} />
            </div>
            <p className="text-2xl font-black text-slate-900" style={{ fontFamily: "Chivo" }}>{value}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Coverage bar */}
      <div className="bg-white border border-slate-200 rounded-sm p-5 mb-6" data-testid="kg-coverage-section">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-900">Catalog Coverage</h3>
          <span className="text-sm font-mono text-slate-500">{coverage}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
            style={{ width: `${Math.min(coverage, 100)}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {stats.products_covered} of {stats.total_products} live products have at least one mined relationship.
          {coverage < 70 && " Consider rebuilding after catalog edits to improve coverage."}
        </p>
      </div>

      {/* Top recommended products */}
      <div className="bg-white border border-slate-200 rounded-sm p-5" data-testid="kg-top-products">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Top Cross-Sell Hubs</h3>
        <p className="text-xs text-slate-500 mb-3">Products that appear most often as a recommendation target across the catalog.</p>
        {top.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No recommendations yet. Rebuild the graph first.</p>
        ) : (
          <div className="space-y-2">
            {top.map((p, idx) => (
              <div key={p.slug} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <span className="text-xs font-mono text-slate-400 w-6">{idx + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{p.product_name}</p>
                  <p className="text-xs text-slate-500">{p.division} · {p.brand || "—"}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 text-xs font-semibold">
                  {p.recommendation_count} refs
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
