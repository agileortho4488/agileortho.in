import { useState, useEffect } from "react";
import { getAdminLeads, updateAdminLead, deleteAdminLead } from "../lib/api";
import api from "../lib/api";
import { toast } from "sonner";
import {
  Search, Flame, Thermometer, Snowflake, Phone, Mail, Trash2, Eye, X, ChevronLeft, ChevronRight,
  MessageCircle, Globe, MapPin, Database, Loader2, Zap,
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
  google_maps: { label: "Google Maps", icon: MapPin, class: "bg-orange-50 text-orange-700 border-orange-200" },
  indiamart_rfq: { label: "IndiaMART", icon: Database, class: "bg-red-50 text-red-700 border-red-200" },
};

const SOURCE_OPTIONS = ["whatsapp", "whatsapp_funnel", "interakt_sync", "website", "google_maps", "indiamart_rfq"];
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
  const [scraping, setScraping] = useState(false);
  const [scrapeRun, setScrapeRun] = useState(null);

  const bulkScrape = async () => {
    if (!window.confirm("This will scrape Google Maps across 20 Telangana districts × 6 medical queries (~120 searches) and auto-insert clinics as Leads. Proceed?")) return;
    setScraping(true);
    try {
      const res = await api.post("/api/admin/prospects/scrape", { max_per_query: 10 });
      setScrapeRun(res.data);
      toast.success(`Scrape started: ${res.data.run_id}. New leads will appear in ~3-5 min.`);
      // Poll for completion
      const runId = res.data.run_id;
      const poll = setInterval(async () => {
        try {
          const r = await api.get(`/api/admin/prospects/runs/${runId}`);
          setScrapeRun(r.data);
          if (r.data.status === "done") {
            clearInterval(poll);
            setScraping(false);
            toast.success(`Scrape done: ${r.data.total_inserted} new leads added (${r.data.total_scraped} scanned)`);
            fetchLeads();
          }
        } catch (e) { console.error(e); }
      }, 15000);
      setTimeout(() => { clearInterval(poll); setScraping(false); }, 10 * 60 * 1000);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Scrape trigger failed");
      setScraping(false);
    }
  };

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

  useEffect(() => { fetchLeads(); }, [page, filters]);
  useEffect(() => {
    // Handle GSC OAuth redirect (flow now lives in Market Intel page)
    const q = new URLSearchParams(window.location.search);
    if (q.get("gsc") === "connected") {
      toast.success("Google Search Console connected — go to Market Intel to see your search queries");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (q.get("gsc") === "error") {
      toast.error("GSC connection failed: " + (q.get("reason") || "unknown"));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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

      {/* Lead Sources & Actions */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-sm p-4 mb-4 text-white" data-testid="lead-sources-bar">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ fontFamily: "Chivo" }}>
              <Zap size={14} className="text-emerald-400" /> Lead Acquisition
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">One click → scrape 20 Telangana districts → auto-populate leads + territory analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={bulkScrape}
              disabled={scraping}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-bold rounded-sm text-sm"
              data-testid="bulk-scrape-btn"
            >
              {scraping ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
              {scraping ? "Scraping..." : "Bulk Scrape Telangana"}
            </button>
            <a
              href="/admin/market-intelligence"
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-600 text-slate-200 rounded-sm text-xs font-semibold hover:bg-slate-700"
              data-testid="go-to-market-intel-btn"
            >
              <Search size={12} /> Market Intel (optional)
            </a>
          </div>
        </div>
        {scrapeRun && (
          <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-300 flex items-center gap-3 flex-wrap" data-testid="scrape-status">
            <span className="font-mono bg-slate-700 px-1.5 py-0.5 rounded">{scrapeRun.run_id}</span>
            <span className={`font-bold ${scrapeRun.status === "done" ? "text-emerald-400" : "text-amber-300"}`}>
              {scrapeRun.status?.toUpperCase()}
            </span>
            {scrapeRun.progress && <span>· {scrapeRun.progress}</span>}
            {scrapeRun.total_inserted !== undefined && (
              <span>· <b className="text-emerald-400">{scrapeRun.total_inserted} new leads</b> / {scrapeRun.total_scraped} scanned</span>
            )}
            {scrapeRun.errors?.length > 0 && (
              <span className="text-red-300">· {scrapeRun.errors.length} errors</span>
            )}
          </div>
        )}
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
                <div><p className="text-xs text-slate-500 mb-1">Product / Search Query</p><p className="text-sm">{selectedLead.product_interest}</p></div>
              )}
              {selectedLead.source === "google_maps" && (
                <div className="grid grid-cols-2 gap-3 text-xs bg-orange-50 border border-orange-100 rounded-sm p-3" data-testid="gmaps-metrics">
                  {selectedLead.gmaps_category && <div><span className="text-slate-500 block">Category</span><span className="font-semibold text-orange-700">{selectedLead.gmaps_category}</span></div>}
                  {selectedLead.gmaps_rating ? <div><span className="text-slate-500 block">Rating</span><span className="font-semibold text-orange-700">{selectedLead.gmaps_rating} ⭐ ({selectedLead.gmaps_reviews})</span></div> : null}
                  {selectedLead.gmaps_address && <div className="col-span-2"><span className="text-slate-500 block">Address</span><span className="font-medium text-slate-800">{selectedLead.gmaps_address}</span></div>}
                  {selectedLead.gmaps_website && <div className="col-span-2"><span className="text-slate-500 block">Website</span><a href={selectedLead.gmaps_website} target="_blank" rel="noopener noreferrer" className="text-orange-700 underline truncate block text-xs">{selectedLead.gmaps_website}</a></div>}
                  {selectedLead.gmaps_url && <div className="col-span-2"><a href={selectedLead.gmaps_url} target="_blank" rel="noopener noreferrer" className="text-orange-700 underline text-xs">Open in Google Maps ↗</a></div>}
                  {selectedLead.gmaps_search_query && <div className="col-span-2"><span className="text-slate-500 block">Found via query</span><span className="font-mono text-xs text-slate-800">{selectedLead.gmaps_search_query}</span></div>}
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
