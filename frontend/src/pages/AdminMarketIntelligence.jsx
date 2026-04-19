import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  TrendingUp, MapPin, Search, RefreshCw, Sparkles, Flame,
  CheckCircle2, Download, Target, Link2, Users, Loader2,
} from "lucide-react";
import api from "../lib/api";

const DIVISION_PRESETS = [
  { label: "Default", keywords: "orthopedic implant,bone plate,knee implant,hip replacement,Meril" },
  { label: "Trauma", keywords: "bone plate,locking plate,bone screw,fracture fixation,MBOSS" },
  { label: "Joint Replacement", keywords: "knee implant,hip replacement,knee replacement,joint prosthesis" },
  { label: "Spine", keywords: "spine implant,pedicle screw,spinal fusion" },
  { label: "Sports Medicine", keywords: "ACL implant,meniscus repair,shoulder anchor" },
  { label: "Cardiovascular", keywords: "cardiac stent,drug eluting stent,angioplasty balloon" },
  { label: "Endo Surgery", keywords: "surgical stapler,laparoscopic clip,endoscopy device" },
];

const TIMEFRAMES = [
  { value: "today 1-m", label: "Last 30 days" },
  { value: "today 3-m", label: "Last 90 days" },
  { value: "today 12-m", label: "Last 12 months" },
  { value: "today 5-y", label: "Last 5 years" },
];

export default function AdminMarketIntelligence() {
  const [keywords, setKeywords] = useState(DIVISION_PRESETS[0].keywords);
  const [geo, setGeo] = useState("IN");
  const [timeframe, setTimeframe] = useState("today 3-m");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // GSC state
  const [gscStatus, setGscStatus] = useState(null);
  const [gscSites, setGscSites] = useState([]);
  const [gscSite, setGscSite] = useState("");
  const [gscBusy, setGscBusy] = useState(false);
  const [gscQueries, setGscQueries] = useState(null);
  const [findingBuyers, setFindingBuyers] = useState(null);

  const load = useCallback((refresh = false) => {
    setLoading(true);
    api.get("/api/admin/intelligence/trends", {
      params: { keywords, geo, timeframe, refresh: refresh ? true : undefined },
      timeout: 90_000,
    })
      .then((r) => {
        setData(r.data);
        if (r.data?.error) toast.error("Google Trends: " + r.data.error.slice(0, 120));
      })
      .catch(() => toast.error("Failed to load trends"))
      .finally(() => setLoading(false));
  }, [keywords, geo, timeframe]);

  const fetchGscStatus = useCallback(() => {
    api.get("/api/admin/gsc/status")
      .then((r) => {
        setGscStatus(r.data);
        if (r.data?.connected) {
          api.get("/api/admin/gsc/sites").then((s) => {
            const sites = s.data.sites || [];
            setGscSites(sites);
            const pref = sites.find((x) => x.includes("agileortho.in")) || sites[0] || "";
            setGscSite(pref);
          }).catch(() => {});
        }
      })
      .catch(() => setGscStatus({ connected: false, configured: false }));
  }, []);

  useEffect(() => { load(false); }, [load]);
  useEffect(() => {
    fetchGscStatus();
    const q = new URLSearchParams(window.location.search);
    if (q.get("gsc") === "connected") {
      toast.success("Google Search Console connected");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (q.get("gsc") === "error") {
      toast.error("GSC connection failed: " + (q.get("reason") || "unknown"));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchGscStatus]);

  const connectGsc = async () => {
    try {
      const res = await api.get("/api/admin/gsc/connect");
      window.location.href = res.data.auth_url;
    } catch (err) {
      toast.error(err?.response?.data?.detail || "GSC connect failed");
    }
  };

  const loadGscQueries = async () => {
    if (!gscSite) return;
    setGscBusy(true);
    try {
      const res = await api.post("/api/admin/gsc/import", {
        site_url: gscSite, days: 28, top_n: 100,
      });
      setGscQueries(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "GSC fetch failed");
    } finally {
      setGscBusy(false);
    }
  };

  const findBuyersForQuery = async (query) => {
    setFindingBuyers(query);
    try {
      const res = await api.post("/api/admin/gsc/find-buyers", {
        query, max_per_query: 8,
      });
      toast.success(`Scraping "${query}" across Telangana — results will appear in Leads within a minute.`);
      console.log("find-buyers run_id:", res.data.run_id);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Scrape trigger failed");
    } finally {
      setFindingBuyers(null);
    }
  };

  const iot = data?.interest_over_time || [];
  const regions = data?.interest_by_region || [];
  const rq = data?.related_queries || {};
  const hasError = Boolean(data?.error);
  const kwList = data?.keywords || [];

  return (
    <div className="p-6" data-testid="admin-market-intelligence">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-slate-900" style={{ fontFamily: "Chivo" }}>Market Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5">Google search intent for Meril product keywords (24h cache)</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-sm text-sm text-slate-700 hover:border-slate-300 disabled:opacity-50"
          data-testid="mi-refresh-btn"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Fetching..." : "Refresh"}
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 mb-6 space-y-3" data-testid="mi-controls">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 uppercase tracking-wide shrink-0">Preset:</span>
          {DIVISION_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setKeywords(p.keywords)}
              className={`px-2.5 py-1 text-xs rounded-sm border transition-colors ${keywords === p.keywords ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"}`}
              data-testid={`preset-${p.label.replace(/\s/g, "-").toLowerCase()}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wide">Keywords (comma-sep, max 5)</label>
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500"
              data-testid="mi-keywords-input"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full mt-1 px-2.5 py-2 border border-slate-200 rounded-sm text-sm bg-white"
              data-testid="mi-timeframe-select"
            >
              {TIMEFRAMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 uppercase tracking-wide shrink-0">Geo:</span>
          {["IN", "IN-TG", "IN-AP", "IN-KA", "IN-MH", "IN-DL"].map((g) => (
            <button
              key={g}
              onClick={() => setGeo(g)}
              className={`px-2.5 py-1 text-xs rounded-sm border transition-colors ${geo === g ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"}`}
            >
              {g}
            </button>
          ))}
          <button
            onClick={() => load(false)}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-sm text-sm hover:bg-emerald-700 disabled:opacity-50"
            data-testid="mi-query-btn"
          >
            <Search size={14} /> Query Trends
          </button>
        </div>
        {data?.cache_age_hours !== undefined && (
          <p className="text-xs text-slate-500">Showing cached data ({data.cache_age_hours}h old) — click Refresh to force a live fetch.</p>
        )}
      </div>

      {hasError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-sm p-4 mb-6">
          {data.error}
        </div>
      )}

      {/* Google Search Console — search intent insights */}
      <div className="bg-white border border-slate-200 rounded-sm p-5 mb-6" data-testid="gsc-panel">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Target size={16} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Google Search Console — Search Intent</h3>
          <span className="text-xs text-slate-400">(What people actually typed to find your site)</span>
          <div className="ml-auto flex items-center gap-2">
            {gscStatus?.connected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200" data-testid="gsc-status-connected">
                <CheckCircle2 size={11} /> Connected
              </span>
            ) : (
              <button
                onClick={connectGsc}
                disabled={!gscStatus?.configured}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-sm text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="gsc-connect-btn"
                title={gscStatus?.configured ? "" : "Set GOOGLE_OAUTH_CLIENT_ID & SECRET in backend/.env"}
              >
                <Link2 size={12} /> Connect Google Search Console
              </button>
            )}
          </div>
        </div>

        {gscStatus?.connected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs text-slate-500 uppercase tracking-wide shrink-0">Site:</label>
              <select
                value={gscSite}
                onChange={(e) => setGscSite(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-sm text-sm bg-white min-w-[240px]"
                data-testid="gsc-site-select"
              >
                {gscSites.length === 0 ? (
                  <option value="">No verified sites found</option>
                ) : (
                  gscSites.map((s) => <option key={s} value={s}>{s}</option>)
                )}
              </select>
              <button
                onClick={loadGscQueries}
                disabled={!gscSite || gscBusy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-sm text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                data-testid="gsc-load-queries-btn"
              >
                {gscBusy ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                {gscBusy ? "Loading..." : "Load queries (last 28d)"}
              </button>
              {gscQueries?.queries?.length > 0 && (
                <span className="text-xs text-slate-500">{gscQueries.queries.length} queries loaded</span>
              )}
            </div>

            {gscQueries?.queries?.length > 0 && (
              <div className="border border-slate-200 rounded-sm overflow-hidden" data-testid="gsc-queries-table">
                <div className="max-h-[420px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="text-left">
                        <th className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Search Query</th>
                        <th className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 text-right">Clicks</th>
                        <th className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 text-right">Impr.</th>
                        <th className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 text-right">CTR</th>
                        <th className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 text-right">Pos.</th>
                        <th className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gscQueries.queries.slice(0, 100).map((q) => {
                        const busy = findingBuyers === q.query;
                        return (
                          <tr key={q.query} className="hover:bg-slate-50" data-testid={`gsc-row-${q.query.slice(0, 30)}`}>
                            <td className="px-3 py-2 text-slate-800 font-medium">{q.query}</td>
                            <td className="px-3 py-2 text-right font-mono text-xs text-slate-700">{q.clicks ?? 0}</td>
                            <td className="px-3 py-2 text-right font-mono text-xs text-slate-500">{q.impressions ?? 0}</td>
                            <td className="px-3 py-2 text-right font-mono text-xs text-slate-500">{q.ctr ? (q.ctr * 100).toFixed(1) + "%" : "—"}</td>
                            <td className="px-3 py-2 text-right font-mono text-xs text-slate-500">{q.position ? q.position.toFixed(1) : "—"}</td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => findBuyersForQuery(q.query)}
                                disabled={busy}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-orange-600 text-white rounded-sm text-[11px] font-semibold hover:bg-orange-700 disabled:opacity-50"
                                data-testid={`find-buyers-${q.query.slice(0, 30)}`}
                              >
                                {busy ? <Loader2 size={10} className="animate-spin" /> : <Users size={10} />}
                                {busy ? "Scraping..." : "Find Buyers"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-3 py-2 bg-slate-50 text-[11px] text-slate-500 border-t border-slate-200">
                  <b>Find Buyers:</b> Scrapes Google Maps across Telangana for clinics/vendors matching the query — new leads land in the CRM within a minute.
                </div>
              </div>
            )}

            {gscQueries && (!gscQueries.queries || gscQueries.queries.length === 0) && (
              <p className="text-xs text-slate-500 py-2">No queries returned. Try a different site or wait for Google to collect more data.</p>
            )}
          </div>
        )}

        {gscStatus && !gscStatus.connected && (
          <p className="text-xs text-slate-500">
            {gscStatus.configured
              ? "Connect your Google account to pull the real search queries people typed to find your products — then scrape Google Maps for buyers matching those queries."
              : "Google OAuth not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in backend/.env."}
          </p>
        )}
      </div>

      {/* Interest Over Time — ASCII-style sparkline */}
      <div className="bg-white border border-slate-200 rounded-sm p-5 mb-6" data-testid="mi-iot">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">Interest Over Time</h3>
          <span className="text-xs text-slate-400">(Normalised 0–100, relative to peak)</span>
        </div>
        {iot.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No data. Try a different timeframe or keyword.</p>
        ) : (
          <div className="space-y-3">
            {kwList.map((kw, idx) => <Sparkline key={kw} keyword={kw} data={iot} colorIdx={idx} />)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interest by Region */}
        <div className="bg-white border border-slate-200 rounded-sm p-5" data-testid="mi-regions">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Top Regions</h3>
          </div>
          {regions.length === 0 || regions[0]?.error ? (
            <p className="text-sm text-slate-400 py-6 text-center">{regions[0]?.error || "No regional data available."}</p>
          ) : (
            <div className="space-y-2">
              {regions.slice(0, 15).map((r, i) => {
                const max = regions[0]?.score || 1;
                const pct = Math.round((r.score / max) * 100);
                const isTg = r.region === "Telangana";
                return (
                  <div key={r.code || r.region} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 w-5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-sm ${isTg ? "font-bold text-emerald-700" : "text-slate-700"}`}>
                          {r.region} {isTg && "⭐"}
                        </span>
                        <span className="text-xs font-mono text-slate-500">{r.score}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${isTg ? "bg-emerald-500" : "bg-slate-400"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Related Queries */}
        <div className="bg-white border border-slate-200 rounded-sm p-5" data-testid="mi-related">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Related Queries</h3>
            <span className="text-xs text-slate-400">(for "{kwList[0] || ""}")</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <RelatedList title="Rising" icon={Flame} items={rq.rising || []} color="text-red-600 bg-red-50" />
            <RelatedList title="Top" icon={TrendingUp} items={rq.top || []} color="text-emerald-600 bg-emerald-50" />
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-sm text-xs text-slate-600">
        <p><b>How to use this data:</b></p>
        <ul className="list-disc ml-5 mt-1 space-y-0.5">
          <li>If Telangana is top for a keyword → double-down locally. If another state is top → opportunity to expand.</li>
          <li>Rising queries = keywords gaining traction right now. Target those in your next WhatsApp campaign or SEO page.</li>
          <li>Interest Over Time shows seasonality. Peaks usually align with medical conferences, insurance renewal cycles, etc.</li>
          <li>Coming next: Google Search Console integration (your actual site search traffic) + IndiaMART buyer RFQs.</li>
        </ul>
      </div>
    </div>
  );
}

function Sparkline({ keyword, data, colorIdx }) {
  const values = data.map((d) => d[keyword] ?? 0);
  const max = Math.max(1, ...values);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const peak = Math.max(...values);
  const W = 320, H = 40;
  const step = W / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${i * step},${H - (v / max) * H}`).join(" ");
  const colors = ["#059669", "#0891b2", "#7c3aed", "#db2777", "#ca8a04"];
  const c = colors[colorIdx % colors.length];
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{keyword}</p>
        <p className="text-xs text-slate-500">peak {peak} · avg {avg}</p>
      </div>
      <svg width={W} height={H} className="shrink-0">
        <polyline fill="none" stroke={c} strokeWidth="1.5" points={pts} />
      </svg>
    </div>
  );
}

function RelatedList({ title, icon: Icon, items, color }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={12} className={color.split(" ")[0]} />
        <span className="text-xs uppercase font-bold tracking-wide text-slate-700">{title}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">No related queries available (Google Trends often rate-limits this endpoint; try again in a few minutes).</p>
      ) : (
        <div className="space-y-1">
          {items.slice(0, 8).map((it, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-slate-100 last:border-0">
              <span className="text-slate-700 truncate">{it.query}</span>
              <span className={`ml-2 px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold ${color}`}>{it.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
