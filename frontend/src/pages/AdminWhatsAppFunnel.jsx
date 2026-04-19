import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  MessageCircle, PlayCircle, RefreshCw, Zap,
  Users, Target, MessageSquare, TrendingDown,
} from "lucide-react";
import api from "../lib/api";

export default function AdminWhatsAppFunnel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simPhone, setSimPhone] = useState("9199999999");
  const [simMsg, setSimMsg] = useState("hi");
  const [simResult, setSimResult] = useState(null);
  const [simBusy, setSimBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/api/admin/whatsapp/funnel-analytics")
      .then((r) => setData(r.data))
      .catch(() => toast.error("Failed to load funnel analytics"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const runSim = async () => {
    if (!simPhone || !simMsg) return;
    setSimBusy(true);
    try {
      const res = await api.post("/api/admin/whatsapp/funnel-simulate", {
        phone: simPhone, message: simMsg,
      });
      setSimResult(res.data);
      load();
    } catch {
      toast.error("Simulation failed");
    } finally {
      setSimBusy(false);
    }
  };

  const resetSim = async () => {
    if (!simPhone) return;
    try {
      await api.post("/api/admin/whatsapp/funnel-reset", { phone: simPhone });
      setSimResult(null);
      toast.success("Funnel state reset for " + simPhone);
    } catch {
      toast.error("Reset failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const dp = data.distinct_phones || {};
  const steps = [
    { key: "started", label: "Started", icon: MessageCircle, color: "bg-slate-500" },
    { key: "division_picked", label: "Picked Division", icon: Target, color: "bg-blue-500" },
    { key: "product_picked", label: "Picked Product", icon: Zap, color: "bg-indigo-500" },
    { key: "quote_requested", label: "Requested Quote", icon: TrendingDown, color: "bg-emerald-600" },
  ];
  const maxCount = Math.max(1, ...steps.map((s) => dp[s.key] || 0));

  return (
    <div className="p-6" data-testid="admin-funnel-page">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-slate-900" style={{ fontFamily: "Chivo" }}>WhatsApp Funnel</h1>
          <p className="text-sm text-slate-500 mt-0.5">Automated catalog walk: menu → division → product → quote</p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-sm text-sm text-slate-700 hover:border-slate-300"
          data-testid="funnel-refresh-btn"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white border border-slate-200 rounded-sm p-5 mb-6" data-testid="funnel-conversion">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Conversion Funnel (unique phones)</h3>
        <div className="space-y-3">
          {steps.map(({ key, label, icon: Icon, color }, idx) => {
            const count = dp[key] || 0;
            const pct = Math.round(100 * (count / maxCount));
            const prev = idx > 0 ? (dp[steps[idx - 1].key] || 0) : null;
            const drop = prev && prev > 0 ? Math.round(100 * (1 - count / prev)) : null;
            return (
              <div key={key} data-testid={`funnel-step-${key}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-white ${color}`}>
                      <Icon size={12} />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-slate-900">{count}</span>
                    {drop !== null && (
                      <span className={`text-xs font-mono ${drop > 50 ? "text-red-600" : "text-amber-600"}`}>
                        -{drop}% drop
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
          <Kpi label="Brochures Sent" value={dp.brochure_requested || 0} icon={MessageSquare} />
          <Kpi label="Agent Handoffs" value={dp.agent_requested || 0} icon={Users} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per-Division */}
        <div className="bg-white border border-slate-200 rounded-sm p-5" data-testid="funnel-per-division">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Most Picked Divisions</h3>
          {(data.per_division || []).length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No divisions picked yet.</p>
          ) : (
            <div className="space-y-2">
              {data.per_division.map((d) => (
                <div key={d.division} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-700">{d.division}</span>
                  <span className="text-sm font-bold text-slate-900">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Simulator */}
        <div className="bg-white border border-slate-200 rounded-sm p-5" data-testid="funnel-simulator">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Funnel Simulator</h3>
          <p className="text-xs text-slate-500 mb-3">Dry-run a conversation without sending WhatsApp.</p>
          <div className="space-y-2">
            <input
              value={simPhone}
              onChange={(e) => setSimPhone(e.target.value)}
              placeholder="Phone (no country code)"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500"
              data-testid="sim-phone-input"
            />
            <input
              value={simMsg}
              onChange={(e) => setSimMsg(e.target.value)}
              placeholder="Message (e.g. hi, 1, A, trauma)"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500"
              data-testid="sim-msg-input"
            />
            <div className="flex gap-2">
              <button
                onClick={runSim}
                disabled={simBusy}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-sm text-sm hover:bg-emerald-700 disabled:opacity-50"
                data-testid="sim-send-btn"
              >
                <PlayCircle size={14} /> {simBusy ? "Sending..." : "Send"}
              </button>
              <button
                onClick={resetSim}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-sm text-sm text-slate-700 hover:border-slate-300"
                data-testid="sim-reset-btn"
              >
                <RefreshCw size={14} /> Reset
              </button>
            </div>
          </div>
          {simResult && (
            <div className="mt-4 space-y-2" data-testid="sim-result">
              <p className="text-xs uppercase tracking-[0.1em] text-slate-500 font-bold">Bot reply</p>
              {(simResult.replies || []).map((r, i) => (
                <div key={i} className="text-sm whitespace-pre-wrap bg-emerald-50 border border-emerald-100 rounded-sm p-3 font-mono text-[13px]">{r}</div>
              ))}
              <p className="text-xs text-slate-500">
                Next state: <span className="font-mono text-slate-700">{simResult.state?.node}</span>
                {simResult.state?.division ? ` · ${simResult.state.division}` : ""}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white border border-slate-200 rounded-sm p-5 mt-6" data-testid="funnel-recent">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Recent Funnel Events</h3>
        {(data.recent || []).length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No events yet. Message your WhatsApp number to start.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">Input</th>
                  <th className="py-2 pr-3">From → To</th>
                  <th className="py-2 pr-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recent.map((e, i) => (
                  <tr key={i}>
                    <td className="py-1.5 pr-3 text-xs font-mono text-slate-500">{new Date(e.timestamp).toLocaleTimeString()}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-slate-700">{e.phone}</td>
                    <td className="py-1.5 pr-3 text-slate-700">{e.input || "—"}</td>
                    <td className="py-1.5 pr-3 text-xs text-slate-500">{e.from_node} → <span className="text-slate-900 font-semibold">{e.to_node}</span></td>
                    <td className="py-1.5 pr-3"><span className="inline-block px-2 py-0.5 bg-slate-100 rounded-sm text-xs font-mono">{e.action}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded flex items-center justify-center bg-slate-50 text-slate-500">
        <Icon size={14} />
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase">{label}</p>
        <p className="text-sm font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
