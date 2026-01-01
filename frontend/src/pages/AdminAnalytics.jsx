import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Users, TrendingUp, MapPin, Stethoscope, Eye, Download, 
  CheckCircle, Clock, XCircle, AlertTriangle, BarChart3 
} from "lucide-react";
import { apiClient, getToken } from "@/lib/api";
import { Button } from "@/components/ui/button";

function StatCard({ icon: Icon, label, value, color, subtext }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
          {subtext && <p className="mt-1 text-xs text-slate-400">{subtext}</p>}
        </div>
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

function DistributionBar({ items, colorFn }) {
  const total = items.reduce((sum, i) => sum + i.count, 0);
  
  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const percentage = total > 0 ? (item.count / total) * 100 : 0;
        return (
          <div key={idx}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-700">{item.label}</span>
              <span className="text-slate-500">{item.count}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className={`h-full rounded-full ${colorFn(idx)}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminAnalytics() {
  const api = useMemo(() => apiClient(), []);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const token = getToken("admin");
        const res = await api.get("/admin/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAnalytics(res.data);
      } catch (e) {
        console.error("Failed to load analytics:", e);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [api]);

  async function exportCSV() {
    setExporting(true);
    try {
      const token = getToken("admin");
      const response = await fetch(`${api.defaults.baseURL}/admin/export/surgeons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `surgeons_export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded mb-8" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totals = analytics?.totals || {};
  const cityDist = (analytics?.city_distribution || []).map(c => ({ label: c.city, count: c.count }));
  const subDist = (analytics?.subspecialty_distribution || []).map(s => ({ label: s.subspecialty, count: s.count }));

  return (
    <main data-testid="admin-analytics-page" className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Platform Analytics</h1>
            <p className="text-slate-500 mt-1">Overview of surgeon registrations and engagement</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={exportCSV}
              disabled={exporting}
              className="rounded-xl bg-teal-600 hover:bg-teal-700"
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/admin/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <StatCard
            icon={Users}
            label="Total Surgeons"
            value={totals.total || 0}
            color="bg-slate-700"
          />
          <StatCard
            icon={CheckCircle}
            label="Approved"
            value={totals.approved || 0}
            color="bg-emerald-500"
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={totals.pending || 0}
            color="bg-amber-500"
          />
          <StatCard
            icon={AlertTriangle}
            label="Needs Info"
            value={totals.needs_clarification || 0}
            color="bg-blue-500"
          />
          <StatCard
            icon={XCircle}
            label="Rejected"
            value={totals.rejected || 0}
            color="bg-rose-500"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <StatCard
            icon={TrendingUp}
            label="New Signups (30 days)"
            value={analytics?.recent_signups_30d || 0}
            color="bg-indigo-500"
          />
          <StatCard
            icon={Eye}
            label="Total Profile Views"
            value={analytics?.total_profile_views || 0}
            color="bg-cyan-500"
          />
          <StatCard
            icon={MapPin}
            label="Cities Covered"
            value={cityDist.length}
            color="bg-pink-500"
          />
        </div>

        {/* Distribution Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* City Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="h-5 w-5 text-slate-400" />
              <h2 className="font-semibold text-slate-900">City Distribution</h2>
            </div>
            {cityDist.length > 0 ? (
              <DistributionBar
                items={cityDist.slice(0, 8)}
                colorFn={(i) => ["bg-teal-500", "bg-emerald-500", "bg-cyan-500", "bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-pink-500", "bg-rose-500"][i % 8]}
              />
            ) : (
              <p className="text-slate-500 text-sm">No data available</p>
            )}
          </motion.div>

          {/* Subspecialty Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-6">
              <Stethoscope className="h-5 w-5 text-slate-400" />
              <h2 className="font-semibold text-slate-900">Subspecialty Distribution</h2>
            </div>
            {subDist.length > 0 ? (
              <DistributionBar
                items={subDist.slice(0, 8)}
                colorFn={(i) => ["bg-emerald-500", "bg-teal-500", "bg-cyan-500", "bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-pink-500", "bg-amber-500"][i % 8]}
              />
            ) : (
              <p className="text-slate-500 text-sm">No data available</p>
            )}
          </motion.div>
        </div>
      </div>
    </main>
  );
}
