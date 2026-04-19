import { useState, useEffect } from "react";
import { getAdminLeads, updateAdminLead, deleteAdminLead } from "../lib/api";
import api from "../lib/api";
import { toast } from "sonner";
import {
  Search, Flame, Thermometer, Snowflake, Phone, Mail, Trash2, Eye, X, ChevronLeft, ChevronRight,
  MessageCircle, Globe, MapPin, Database, CheckCircle2, Download,
} from "lucide-react";

const SCORE_BADGES = {
  Hot: { icon: Flame, class: "bg-red-50 text-red-700 border-red-200" },
  Warm: { icon: Thermometer, class: "bg-amber-50 text-amber-700 border-amber-200" },
  Cold: { icon: Snowflake, class: "bg-blue-50 text-blue-400 border-blue-200" },
};

const SOURCE_META = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle, class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  whatsapp_funnel: { label: "WA Funnel", icon: MessageCircle, class: "bg-emerald-50 text-emerald-700 border-emerald-300" },
  interakt_sync: { label: "Interakt", icon: MessageCircle, class: "bg-teal-50 text-teal-700 border-teal-200" },
  website: { label: "Website", icon: Globe, class: "bg-blue-50 text-blue-700 border-blue-200" },
  gsc_warm: { label: "GSC Search", icon: Search, class: "bg-purple-50 text-purple-700 border-purple-200" },
  apify_google_maps: { label: "Google Maps", icon: MapPin, class: "bg-orange-50 text-orange-700 border-orange-200" },
  indiamart_rfq: { label: "IndiaMART", icon: Database, class: "bg-red-50 text-red-700 border-red-200" },
};

const SOURCE_OPTIONS = ["whatsapp", "whatsapp_funnel", "interakt_sync", "website", "gsc_warm", "apify_google_maps", "indiamart_rfq"];
const STATUS_OPTIONS = ["new", "contacted", "qualified", "negotiation", "won", "lost"];

export default function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ score: "", status: "", source: "", search: "" });
  const [selectedLead, setSelectedLead] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [gscStatus, setGscStatus] = useState(null);
  const [gscBusy, setGscBusy] = useState(false);
  const [gscSites, setGscSites] = useState([]);
  const [gscSite, setGscSite] = useState("");

  const fetchLeads = () => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (filters.score) params.score = filters.score;
    if (filters.status) params.status = filters.status;
    if (filters.source) params.source = filters.source;
    if (filters.search) params.search = filters.search;
    getAdminLeads(params)
      .then((r) => { setLeads(r.data.leads); setTotal(r.data.total); setPages(r.data.pages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchGscStatus = () => {
    api.get("/api/admin/gsc/status")
      .then((r) => {
        setGscStatus(r.data);
        if (r.data?.connected) {
          // auto-fetch accessible sites
          api.get("/api/admin/gsc/sites").then((s) => {
            const sites = s.data.sites || [];
            setGscSites(sites);
            // Prefer agileortho.in domain property as default
            const pref = sites.find((x) => x.includes("agileortho.in")) || sites[0] || "";
            setGscSite(pref);
          }).catch(() => {});
        }
      })
      .catch(() => setGscStatus({ connected: false, configured: false }));
  };

  useEffect(() => { fetchLeads(); }, [page, filters]);
  useEffect(() => {
    fetchGscStatus();
    // Handle OAuth redirect
    const q = new URLSearchParams(window.location.search);
    if (q.get("gsc") === "connected") {
      toast.success("Google Search Console connected");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (q.get("gsc") === "error") {
      toast.error("GSC connection failed: " + (q.get("reason") || "unknown"));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const connectGsc = async () => {
    try {
      const res = await api.get("/api/admin/gsc/connect");
      window.location.href = res.data.auth_url;
    } catch (err) {
      toast.error(err?.response?.data?.detail || "GSC connect failed");
    }
  };

  const importGsc = async () => {
    if (!gscSite) { toast.error("Pick a site first"); return; }
    setGscBusy(true);
    try {
      const res = await api.post("/api/admin/gsc/import", {
        site_url: gscSite,
        days: 28,
        top_n: 50,
      });
      toast.success(`Imported ${res.data.leads_inserted} new + ${res.data.leads_updated} updated from ${gscSite}`);
      fetchLeads();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "GSC import failed");
    } finally {
      setGscBusy(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateAdminLead(id, { status });
      toast.success("Status updated");
      fetchLeads();
      if (selectedLead?.id === id) setSelectedLead((prev) => ({ ...prev, status }));
    } catch { toast.error("Failed to update"); }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !selectedLead) return;
    try {
      const res = await updateAdminLead(selectedLead.id, { notes: noteText });
      setSelectedLead(res.data);
      setNoteText("");
      toast.success("Note added");
    } catch { toast.error("Failed to add note"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this lead?")) return;
    try {
      await deleteAdminLead(id);
      toast.success("Lead deleted");
      fetchLeads();
      if (selectedLead?.id === id) setSelectedLead(null);
    } catch { toast.error("Failed to delete"); }
  };

  return (
    <div className="p-6 h-full flex flex-col" data-testid="admin-leads">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900" style={{ fontFamily: "Chivo" }}>Leads CRM</h1>
          <p className="text-sm text-slate-500">{total} total leads</p>
        </div>
      </div>

      {/* Lead Sources */}
      <div className="bg-white border border-slate-200 rounded-sm p-3 mb-4" data-testid="lead-sources-bar">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <Database size={14} className="text-slate-400" />
            <span className="text-xs uppercase tracking-wide font-bold text-slate-600">Sources</span>
            <span className="text-xs text-slate-500">WhatsApp funnel (auto) · Website form (auto) · Google Search Console (below)</span>
          </div>
          <div className="flex items-center gap-2">
            {gscStatus?.connected ? (
              <>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-sm text-xs font-semibold" data-testid="gsc-connected-badge">
                  <CheckCircle2 size={12} /> GSC Connected
                </span>
                {gscSites.length > 1 && (
                  <select
                    value={gscSite}
                    onChange={(e) => setGscSite(e.target.value)}
                    className="px-2 py-1 border border-slate-200 rounded-sm text-xs bg-white max-w-[200px]"
                    data-testid="gsc-site-select"
                  >
                    {gscSites.map((s) => <option key={s} value={s}>{s.replace("sc-domain:", "domain: ")}</option>)}
                  </select>
                )}
                <button
                  onClick={importGsc}
                  disabled={gscBusy || !gscSite}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-sm text-xs font-semibold hover:bg-purple-700 disabled:opacity-50"
                  data-testid="gsc-import-btn"
                >
                  <Download size={12} /> {gscBusy ? "Importing..." : "Import Search Queries (28d)"}
                </button>
              </>
            ) : gscStatus?.configured ? (
              <button
                onClick={connectGsc}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-purple-300 text-purple-700 rounded-sm text-xs font-semibold hover:bg-purple-50"
                data-testid="gsc-connect-btn"
              >
                <Search size={12} /> Connect Google Search Console
              </button>
            ) : (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-2 py-1" data-testid="gsc-not-configured">
                GSC OAuth not configured — set GOOGLE_OAUTH_CLIENT_ID / SECRET in backend/.env
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4" data-testid="lead-filters">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={filters.search}
            onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
            className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500 w-48"
            data-testid="lead-search-input"
          />
        </div>
        <select
          value={filters.score}
          onChange={(e) => { setFilters({ ...filters, score: e.target.value }); setPage(1); }}
          className="px-2.5 py-1.5 border border-slate-200 rounded-sm text-sm bg-white"
        >
          <option value="">All Scores</option>
          <option value="Hot">Hot</option>
          <option value="Warm">Warm</option>
          <option value="Cold">Cold</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
          className="px-2.5 py-1.5 border border-slate-200 rounded-sm text-sm bg-white"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select
          value={filters.source}
          onChange={(e) => { setFilters({ ...filters, source: e.target.value }); setPage(1); }}
          className="px-2.5 py-1.5 border border-slate-200 rounded-sm text-sm bg-white"
          data-testid="source-filter"
        >
          <option value="">All Sources</option>
          {SOURCE_OPTIONS.map((s) => (
            <option key={s} value={s}>{SOURCE_META[s]?.label || s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20 text-sm text-slate-400">No leads found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="leads-table">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">Name</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">Hospital</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">Contact</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">Source</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">Score</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">Status</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => {
                  const badge = SCORE_BADGES[lead.score] || SCORE_BADGES.Cold;
                  const BadgeIcon = badge.icon;
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50" data-testid={`lead-row-${lead.id}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{lead.name}</p>
                        <p className="text-xs text-slate-400">{lead.district || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{lead.hospital_clinic || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {lead.phone_whatsapp && <a href={`tel:${lead.phone_whatsapp}`} className="text-slate-500 hover:text-emerald-600"><Phone size={14} /></a>}
                          {lead.email && <a href={`mailto:${lead.email}`} className="text-slate-500 hover:text-emerald-600"><Mail size={14} /></a>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const meta = SOURCE_META[lead.source] || { label: lead.source || "—", icon: Database, class: "bg-slate-50 text-slate-600 border-slate-200" };
                          const SrcIcon = meta.icon;
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-semibold ${meta.class}`} data-testid={`source-${lead.source}`}>
                              <SrcIcon size={11} /> {meta.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-xs font-semibold ${badge.class}`}>
                            <BadgeIcon size={12} /> {lead.score}
                          </span>
                          {typeof lead.score_value === "number" && (
                            <span className="text-xs font-mono text-slate-500" title="Lead score value (0-100)">
                              {lead.score_value}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateStatus(lead.id, e.target.value)}
                          className="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white"
                        >
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSelectedLead(lead)} className="p-1 text-slate-400 hover:text-slate-900" data-testid={`view-lead-${lead.id}`}>
                            <Eye size={14} />
                          </button>
                          <button onClick={() => handleDelete(lead.id)} className="p-1 text-slate-400 hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="p-1 border border-slate-200 rounded disabled:opacity-30">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-slate-500">Page {page} of {pages}</span>
          <button onClick={() => setPage(page + 1)} disabled={page >= pages} className="p-1 border border-slate-200 rounded disabled:opacity-30">
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex" data-testid="lead-detail-drawer">
          <div className="flex-1 bg-black/30" onClick={() => setSelectedLead(null)} />
          <div className="w-full max-w-md bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Chivo" }}>{selectedLead.name}</h2>
              <button onClick={() => setSelectedLead(null)} className="p-1 text-slate-400 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-500">Hospital</p><p className="font-medium">{selectedLead.hospital_clinic || "—"}</p></div>
                <div><p className="text-xs text-slate-500">District</p><p className="font-medium">{selectedLead.district || "—"}</p></div>
                <div><p className="text-xs text-slate-500">Phone</p><p className="font-medium">{selectedLead.phone_whatsapp || "—"}</p></div>
                <div><p className="text-xs text-slate-500">Email</p><p className="font-medium">{selectedLead.email || "—"}</p></div>
                <div><p className="text-xs text-slate-500">Inquiry Type</p><p className="font-medium">{selectedLead.inquiry_type}</p></div>
                <div><p className="text-xs text-slate-500">Score</p><p className="font-medium">{selectedLead.score} ({selectedLead.score_value})</p></div>
                <div><p className="text-xs text-slate-500">Source</p><p className="font-medium">{selectedLead.source}</p></div>
                <div><p className="text-xs text-slate-500">Created</p><p className="font-medium">{new Date(selectedLead.created_at).toLocaleDateString()}</p></div>
              </div>
              {selectedLead.product_interest && (
                <div><p className="text-xs text-slate-500 mb-1">Product Interest</p><p className="text-sm">{selectedLead.product_interest}</p></div>
              )}
              {selectedLead.source === "gsc_warm" && (
                <div className="grid grid-cols-2 gap-3 text-xs bg-purple-50 border border-purple-100 rounded-sm p-3" data-testid="gsc-metrics">
                  <div><span className="text-slate-500 block">Clicks (28d)</span><span className="font-bold text-purple-700 text-sm">{selectedLead.gsc_clicks ?? 0}</span></div>
                  <div><span className="text-slate-500 block">Impressions</span><span className="font-bold text-purple-700 text-sm">{selectedLead.gsc_impressions ?? 0}</span></div>
                  <div><span className="text-slate-500 block">Avg Position</span><span className="font-bold text-purple-700 text-sm">{selectedLead.gsc_position ?? "—"}</span></div>
                  <div><span className="text-slate-500 block">CTR</span><span className="font-bold text-purple-700 text-sm">{selectedLead.gsc_ctr ? (selectedLead.gsc_ctr * 100).toFixed(1) + "%" : "—"}</span></div>
                  {selectedLead.gsc_country && <div><span className="text-slate-500 block">Country</span><span className="font-semibold">{selectedLead.gsc_country}</span></div>}
                  {selectedLead.gsc_landing_page && <div className="col-span-2"><span className="text-slate-500 block">Landing Page</span><a href={selectedLead.gsc_landing_page} target="_blank" rel="noopener noreferrer" className="text-purple-700 underline truncate block text-xs">{selectedLead.gsc_landing_page}</a></div>}
                </div>
              )}
              {selectedLead.message && (
                <div><p className="text-xs text-slate-500 mb-1">Message</p><p className="text-sm">{selectedLead.message}</p></div>
              )}

              {/* AI Score Reasoning */}
              {(selectedLead.score_reasoning || []).length > 0 && (
                <div data-testid="lead-score-reasoning">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-600 mb-2">
                    Why this score? <span className="font-mono text-slate-400 normal-case">({selectedLead.score} · {selectedLead.score_value})</span>
                  </p>
                  <div className="space-y-1.5">
                    {selectedLead.score_reasoning.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm bg-emerald-50/40 border border-emerald-100 rounded-sm px-2.5 py-1.5">
                        <span className="text-xs font-mono font-bold text-emerald-700 shrink-0">+{r.points}</span>
                        <span className="text-slate-700">{r.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-600 mb-2">Notes</p>
                {(selectedLead.notes || []).length === 0 ? (
                  <p className="text-sm text-slate-400">No notes yet</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedLead.notes.map((n, i) => (
                      <div key={i} className="bg-slate-50 rounded p-2">
                        <p className="text-sm">{n.text}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500"
                    data-testid="add-note-input"
                  />
                  <button onClick={handleAddNote} className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-sm hover:bg-emerald-700" data-testid="add-note-btn">
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
