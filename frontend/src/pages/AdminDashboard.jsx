import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getAdminStats } from "../lib/api";
import {
  Package, Users, Flame, Thermometer, Snowflake, BarChart3,
  Calendar, TrendingUp, Network, RefreshCw, ClipboardCheck, ArrowRight,
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    getAdminStats()
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 60_000); // auto-refresh every 60s
    return () => clearInterval(t);
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const kg = stats.knowledge_graph || {};
  const coverage = Number(kg.coverage_pct || 0);

  return (
    <div className="p-6" data-testid="admin-dashboard">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-slate-900" style={{ fontFamily: "Chivo" }}>Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Overview of your CRM and product catalog</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-sm text-sm text-slate-700 hover:border-slate-300 disabled:opacity-50"
          data-testid="dashboard-refresh-btn"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Top row: Lead momentum KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KPICard label="Leads Today" value={stats.leads_today} icon={Calendar} color="text-emerald-600 bg-emerald-50" testid="kpi-leads-today" />
        <KPICard label="Last 7 Days" value={stats.leads_7d} icon={TrendingUp} color="text-blue-600 bg-blue-50" testid="kpi-leads-7d" />
        <KPICard label="Last 30 Days" value={stats.leads_30d} icon={BarChart3} color="text-indigo-600 bg-indigo-50" testid="kpi-leads-30d" />
        <KPICard label="Review Pending" value={stats.review_pending} icon={ClipboardCheck} color="text-amber-600 bg-amber-50" testid="kpi-review-pending" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <KPICard label="Products" value={stats.total_products} icon={Package} color="text-blue-600 bg-blue-50" testid="stat-products" />
        <KPICard label="Total Leads" value={stats.total_leads} icon={Users} color="text-slate-600 bg-slate-50" testid="stat-total-leads" />
        <KPICard label="Hot Leads" value={stats.hot_leads} icon={Flame} color="text-red-600 bg-red-50" testid="stat-hot-leads" />
        <KPICard label="Warm Leads" value={stats.warm_leads} icon={Thermometer} color="text-amber-600 bg-amber-50" testid="stat-warm-leads" />
        <KPICard label="Cold Leads" value={stats.cold_leads} icon={Snowflake} color="text-blue-400 bg-blue-50" testid="stat-cold-leads" />
        <KPICard label="New Leads" value={stats.new_leads} icon={BarChart3} color="text-emerald-600 bg-emerald-50" testid="stat-new-leads" />
      </div>

      {/* Knowledge Graph summary */}
      <Link
        to="/admin/knowledge-graph"
        className="group block bg-white border border-slate-200 hover:border-emerald-300 rounded-sm p-5 mb-6 transition-colors"
        data-testid="kg-summary-card"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded flex items-center justify-center bg-emerald-50 text-emerald-600 shrink-0">
              <Network size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Knowledge Graph</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {kg.total_relationships || 0} edges ({kg.requires_edges || 0} REQUIRES · {kg.bundle_edges || 0} BUNDLE) ·
                {" "}{kg.products_covered || 0}/{kg.total_products || 0} products covered
              </p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0 mt-1" />
        </div>
        <div className="mt-3 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
            style={{ width: `${Math.min(coverage, 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1.5">{coverage}% catalog coverage · Click to manage →</p>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products by Division */}
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Products by Division</h3>
          <div className="space-y-3">
            {stats.products_by_division.map((d) => (
              <div key={d.division} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{d.division}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${(d.count / Math.max(...stats.products_by_division.map((x) => x.count))) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-500 w-6 text-right">{d.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leads by Inquiry Type */}
        <div className="bg-white border border-slate-200 rounded-sm p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Leads by Inquiry Type</h3>
          {stats.leads_by_inquiry.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No leads yet. Start capturing leads from the website.</p>
          ) : (
            <div className="space-y-3">
              {stats.leads_by_inquiry.map((d) => (
                <div key={d.type} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{d.type}</span>
                  <span className="text-sm font-bold text-slate-900">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leads by District */}
        <div className="bg-white border border-slate-200 rounded-sm p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Top Districts by Leads</h3>
          {stats.leads_by_district.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No district data yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {stats.leads_by_district.map((d) => (
                <div key={d.district} className="bg-slate-50 rounded-sm p-3 text-center">
                  <p className="text-lg font-black text-slate-900" style={{ fontFamily: "Chivo" }}>{d.count}</p>
                  <p className="text-xs text-slate-500 truncate">{d.district}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color, testid }) {
  return (
    <div className="bg-white border border-slate-200 rounded-sm p-4" data-testid={testid}>
      <div className={`w-8 h-8 rounded flex items-center justify-center mb-2 ${color}`}>
        <Icon size={16} />
      </div>
      <p className="text-2xl font-black text-slate-900" style={{ fontFamily: "Chivo" }}>{value ?? 0}</p>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}
