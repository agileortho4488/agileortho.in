import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, Filter, ChevronLeft, ChevronRight, Check, X,
  Edit3, Users, ArrowUpDown, Eye, AlertTriangle, CheckCircle2,
  BarChart3, Layers, Sparkles, ShieldCheck, ShieldAlert, ChevronDown, ChevronUp,
  Zap, Loader2,
} from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_COLORS = {
  externally_verified: "bg-emerald-100 text-emerald-800",
  internally_verified: "bg-blue-100 text-blue-800",
  externally_enriched: "bg-teal-100 text-teal-800",
  review_required_ambiguity: "bg-amber-100 text-amber-800",
  review_required_conflict: "bg-red-100 text-red-800",
  insufficient_evidence: "bg-slate-100 text-slate-600",
};

const ACTION_COLORS = {
  keep_as_is: "bg-emerald-50 text-emerald-700",
  rename: "bg-blue-50 text-blue-700",
  send_to_review: "bg-amber-50 text-amber-700",
  merge_into_parent_family: "bg-purple-50 text-purple-700",
  split_page: "bg-orange-50 text-orange-700",
};

function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
  };
}

// ── Stats Cards ──
function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6" data-testid="review-stats-bar">
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wide">Total Products</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total_products?.toLocaleString()}</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wide">Canonical</p>
        <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.total_canonical?.toLocaleString()}</p>
        <p className="text-xs text-slate-400">{stats.coverage_pct}% coverage</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wide">Staged</p>
        <p className="text-2xl font-bold text-blue-600 mt-1">{stats.total_staged?.toLocaleString()}</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wide">Pending Review</p>
        <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending_review?.toLocaleString()}</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wide">Promoted</p>
        <p className="text-2xl font-bold text-teal-600 mt-1">{stats.total_promoted?.toLocaleString()}</p>
      </div>
    </div>
  );
}

// ── Filter Bar ──
function FilterBar({ filters, setFilters, stats }) {
  const divisions = stats?.by_division?.map((d) => d.division) || [];
  const statuses = stats?.by_status?.map((s) => s.status) || [];
  const actions = stats?.by_action?.map((a) => a.action) || [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4" data-testid="review-filter-bar">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs text-slate-500 font-medium uppercase">Filters</span>
        </div>

        <select
          value={filters.division || ""}
          onChange={(e) => setFilters({ ...filters, division: e.target.value || null, page: 1 })}
          className="text-sm border border-slate-200 rounded px-2 py-1.5 bg-white"
          data-testid="filter-division"
        >
          <option value="">All Divisions</option>
          {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          value={filters.status || ""}
          onChange={(e) => setFilters({ ...filters, status: e.target.value || null, page: 1 })}
          className="text-sm border border-slate-200 rounded px-2 py-1.5 bg-white"
          data-testid="filter-status"
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>

        <select
          value={filters.action || ""}
          onChange={(e) => setFilters({ ...filters, action: e.target.value || null, page: 1 })}
          className="text-sm border border-slate-200 rounded px-2 py-1.5 bg-white"
          data-testid="filter-action"
        >
          <option value="">All Actions</option>
          {actions.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
        </select>

        <div className="flex items-center gap-1">
          <label className="text-xs text-slate-500">Conf:</label>
          <input
            type="number" step="0.05" min="0" max="1" placeholder="min"
            value={filters.confidence_min ?? ""}
            onChange={(e) => setFilters({ ...filters, confidence_min: e.target.value ? parseFloat(e.target.value) : null, page: 1 })}
            className="text-sm border border-slate-200 rounded px-2 py-1.5 w-16"
            data-testid="filter-conf-min"
          />
          <span className="text-slate-300">-</span>
          <input
            type="number" step="0.05" min="0" max="1" placeholder="max"
            value={filters.confidence_max ?? ""}
            onChange={(e) => setFilters({ ...filters, confidence_max: e.target.value ? parseFloat(e.target.value) : null, page: 1 })}
            className="text-sm border border-slate-200 rounded px-2 py-1.5 w-16"
            data-testid="filter-conf-max"
          />
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-2 top-2 text-slate-400" />
          <input
            type="text" placeholder="Search brand..."
            value={filters.brand || ""}
            onChange={(e) => setFilters({ ...filters, brand: e.target.value || null, page: 1 })}
            className="text-sm border border-slate-200 rounded pl-7 pr-2 py-1.5 w-36"
            data-testid="filter-brand-search"
          />
        </div>

        <div className="relative">
          <Layers size={14} className="absolute left-2 top-2 text-slate-400" />
          <input
            type="text" placeholder="Search family..."
            value={filters.family || ""}
            onChange={(e) => setFilters({ ...filters, family: e.target.value || null, page: 1 })}
            className="text-sm border border-slate-200 rounded pl-7 pr-2 py-1.5 w-36"
            data-testid="filter-family-search"
          />
        </div>

        <button
          onClick={() => setFilters({ page: 1, pending_only: true })}
          className="text-xs text-slate-400 hover:text-slate-600 underline ml-auto"
          data-testid="filter-clear-btn"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}

// ── Product Row ──
function ProductRow({ product, onView, onApprove, onReject, selected, onToggle }) {
  const conf = product.proposed_semantic_confidence ?? 0;
  const statusCls = STATUS_COLORS[product.proposed_web_verification_status] || "bg-slate-100 text-slate-600";
  const actionCls = ACTION_COLORS[product.proposed_recommended_action] || "bg-slate-50 text-slate-600";
  const hasConflict = product.proposed_conflict_detected;

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors" data-testid={`review-row-${product.slug}`}>
      <td className="px-3 py-2.5">
        <input type="checkbox" checked={selected} onChange={onToggle} className="rounded border-slate-300" data-testid={`review-checkbox-${product.slug}`} />
      </td>
      <td className="px-3 py-2.5">
        <div className="max-w-[220px]">
          <p className="text-sm font-medium text-slate-800 truncate">{product.product_name_display || product.slug}</p>
          {product.proposed_clinical_display_title && product.proposed_clinical_display_title !== product.product_name_display && (
            <p className="text-xs text-blue-600 truncate mt-0.5">
              → {product.proposed_clinical_display_title}
            </p>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-slate-500">{product.division_canonical || "—"}</td>
      <td className="px-3 py-2.5">
        <span className="text-xs text-slate-600">{product.proposed_semantic_brand_system || product.brand || "—"}</span>
      </td>
      <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[120px] truncate">{product.proposed_semantic_implant_class || "—"}</td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${conf >= 0.85 ? "bg-emerald-500" : conf >= 0.7 ? "bg-amber-500" : "bg-red-500"}`} />
          <span className="text-xs font-mono text-slate-600">{conf.toFixed(2)}</span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${statusCls}`}>
          {hasConflict && <AlertTriangle size={10} />}
          {product.proposed_web_verification_status?.replace(/_/g, " ")}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${actionCls}`}>
          {product.proposed_recommended_action?.replace(/_/g, " ")}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          <button onClick={() => onView(product.slug)} className="p-1 hover:bg-slate-100 rounded" title="View details" data-testid={`review-view-${product.slug}`}>
            <Eye size={14} className="text-slate-500" />
          </button>
          <button onClick={() => onApprove(product.slug)} className="p-1 hover:bg-emerald-50 rounded" title="Approve" data-testid={`review-approve-${product.slug}`}>
            <Check size={14} className="text-emerald-600" />
          </button>
          <button onClick={() => onReject(product.slug)} className="p-1 hover:bg-red-50 rounded" title="Reject" data-testid={`review-reject-${product.slug}`}>
            <X size={14} className="text-red-500" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Detail Modal ──
function DetailModal({ slug, onClose, onApprove, onReject }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState({});

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`${API}/api/admin/review/products/${slug}`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((d) => { setDetail(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  if (!slug) return null;

  const handleEditApprove = async () => {
    const res = await fetch(`${API}/api/admin/review/products/${slug}/edit-approve`, {
      method: "POST", headers: getHeaders(), body: JSON.stringify({ edits }),
    });
    if (res.ok) {
      toast.success(`${slug} edited and approved`);
      onClose(true);
    } else {
      toast.error("Failed to edit-approve");
    }
  };

  const COMPARE_FIELDS = [
    { key: "semantic_brand_system", label: "Brand System" },
    { key: "semantic_system_type", label: "System Type" },
    { key: "semantic_implant_class", label: "Implant Class" },
    { key: "semantic_material_default", label: "Material" },
    { key: "semantic_anatomy_scope", label: "Anatomy Scope" },
    { key: "semantic_confidence", label: "Confidence" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="review-detail-modal">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{slug}</h2>
            {detail?.product?.division_canonical && (
              <p className="text-xs text-slate-500">{detail.product.division_canonical}</p>
            )}
          </div>
          <button onClick={() => onClose(false)} className="p-2 hover:bg-slate-100 rounded" data-testid="detail-close-btn">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading...</div>
        ) : detail ? (
          <div className="p-6 space-y-6">
            {/* Reasoning summary */}
            {detail.proposed?.reasoning_summary && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Reasoning</p>
                <p className="text-sm text-slate-700">{detail.proposed.reasoning_summary}</p>
              </div>
            )}

            {/* Side-by-side comparison */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <ArrowUpDown size={14} /> Current vs Proposed
              </h3>
              <table className="w-full text-sm" data-testid="detail-comparison-table">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 text-xs text-slate-500 font-medium w-1/4">Field</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-500 font-medium w-[37.5%]">Current</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-500 font-medium w-[37.5%]">Proposed</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-3 text-xs text-slate-500">Display Title</td>
                    <td className="py-2 px-3 text-slate-700">{detail.current?.product_name_display || "—"}</td>
                    <td className="py-2 px-3 text-blue-700 font-medium">
                      {editMode ? (
                        <input
                          className="border rounded px-2 py-1 text-sm w-full"
                          defaultValue={detail.proposed?.clinical_display_title || ""}
                          onChange={(e) => setEdits({ ...edits, clinical_display_title: e.target.value })}
                        />
                      ) : detail.proposed?.clinical_display_title || "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-3 text-xs text-slate-500">Subtitle</td>
                    <td className="py-2 px-3 text-slate-700">{detail.current?.clinical_subtitle || "—"}</td>
                    <td className="py-2 px-3 text-blue-700">{detail.proposed?.clinical_subtitle || "—"}</td>
                  </tr>
                  {COMPARE_FIELDS.map((f) => {
                    const curr = detail.current?.[f.key];
                    const prop = detail.proposed?.[f.key];
                    const currStr = Array.isArray(curr) ? curr.join(", ") : String(curr ?? "—");
                    const propStr = Array.isArray(prop) ? prop.join(", ") : String(prop ?? "—");
                    const changed = currStr !== propStr;
                    return (
                      <tr key={f.key} className={`border-b border-slate-100 ${changed ? "bg-yellow-50/50" : ""}`}>
                        <td className="py-2 px-3 text-xs text-slate-500">{f.label}</td>
                        <td className="py-2 px-3 text-slate-700">{currStr}</td>
                        <td className={`py-2 px-3 ${changed ? "text-blue-700 font-medium" : "text-slate-700"}`}>
                          {editMode && f.key !== "semantic_confidence" ? (
                            <input
                              className="border rounded px-2 py-1 text-sm w-full"
                              defaultValue={propStr}
                              onChange={(e) => setEdits({ ...edits, [f.key]: e.target.value })}
                            />
                          ) : propStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Verification log */}
            {detail.verification_log && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Verification Log</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-500">Status:</span> <span className="font-medium">{detail.verification_log.web_verification_status}</span></div>
                  <div><span className="text-slate-500">Source Tier:</span> <span className="font-medium">{detail.verification_log.source_priority_used}</span></div>
                  <div><span className="text-slate-500">Conflict:</span> <span className="font-medium">{detail.verification_log.external_conflict ? "YES" : "No"}</span></div>
                  <div><span className="text-slate-500">Action:</span> <span className="font-medium">{detail.verification_log.final_recommended_action}</span></div>
                </div>
                {detail.verification_log.external_sources?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-slate-500">External Sources:</p>
                    {detail.verification_log.external_sources.map((s, i) => (
                      <div key={i} className="text-xs">
                        <span className="text-slate-400">[{s.source_type}]</span>{" "}
                        <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                          {s.source_title}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => { onApprove(slug); onClose(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                data-testid="detail-approve-btn"
              >
                <CheckCircle2 size={16} /> Approve
              </button>
              {editMode ? (
                <button
                  onClick={handleEditApprove}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  data-testid="detail-edit-approve-btn"
                >
                  <Edit3 size={16} /> Save & Approve
                </button>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium"
                  data-testid="detail-edit-btn"
                >
                  <Edit3 size={16} /> Edit & Approve
                </button>
              )}
              <button
                onClick={() => { onReject(slug); onClose(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                data-testid="detail-reject-btn"
              >
                <X size={16} /> Reject
              </button>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-red-400">Failed to load details</div>
        )}
      </div>
    </div>
  );
}

// ── Family Review Panel ──
function FamilyPanel({ onBulkApprove }) {
  const [families, setFamilies] = useState([]);
  const [divFilter, setDivFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const loadFamilies = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (divFilter) params.set("division", divFilter);
    fetch(`${API}/api/admin/review/families?${params}`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((d) => { setFamilies(d.families || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [divFilter]);

  useEffect(() => { loadFamilies(); }, [loadFamilies]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg" data-testid="family-review-panel">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Layers size={16} /> Family-Level Review
        </h3>
        <span className="text-xs text-slate-400">{families.length} families</span>
      </div>
      <div className="max-h-[500px] overflow-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading families...</div>
        ) : families.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No families pending review</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {families.map((f) => (
              <div key={`${f.family}-${f.division}`} className="px-4 py-3 hover:bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{f.family}</p>
                    <p className="text-xs text-slate-500">
                      {f.division} · {f.count} products · avg {f.avg_confidence.toFixed(2)} conf
                      {f.brands.length > 0 && ` · ${f.brands.join(", ")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.has_conflict && <AlertTriangle size={14} className="text-red-500" />}
                    <button
                      onClick={() => onBulkApprove(f.family, f.division)}
                      className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 font-medium"
                      data-testid={`family-approve-${f.family}`}
                    >
                      Approve All ({f.count})
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {f.statuses.map((s) => (
                    <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[s] || "bg-slate-100 text-slate-500"}`}>
                      {s.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Smart Suggestions Panel ──
function SmartSuggestionsPanel({ onBulkApprove, onRefresh }) {
  const [suggestions, setSuggestions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());
  const [approving, setApproving] = useState(null);

  const loadSuggestions = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/admin/review/smart-suggestions`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setSuggestions(d.suggestions || []);
        setSummary(d.summary || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);

  const handleApproveFamily = async (suggestion) => {
    const slugs = suggestion.eligible_slugs;
    if (!slugs.length) return;
    const msg = `Approve ${slugs.length} eligible products in "${suggestion.family}" (${suggestion.division})?`;
    if (!window.confirm(msg)) return;

    setApproving(suggestion.family);
    const res = await fetch(`${API}/api/admin/review/bulk-approve`, {
      method: "POST", headers: getHeaders(),
      body: JSON.stringify({ slugs }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Approved ${data.count} products from "${suggestion.family}"`);
      loadSuggestions();
      if (onRefresh) onRefresh();
    } else {
      toast.error("Failed to approve");
    }
    setApproving(null);
  };

  const toggleExpand = (key) => {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpanded(next);
  };

  const ScoreBadge = ({ score }) => {
    const cls = score >= 80 ? "bg-emerald-100 text-emerald-800" :
                score >= 50 ? "bg-amber-100 text-amber-800" :
                "bg-red-100 text-red-800";
    return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cls}`}>{score}</span>;
  };

  const ExclusionTag = ({ reason }) => {
    const labels = {
      ti_vs_ss_material_ambiguity: "Ti vs SS conflict",
      mixed_materials: "Mixed materials",
      mixed_coated_uncoated: "Mixed coated/uncoated",
      cross_brand_bundle: "Cross-brand",
      has_conflict_flags: "Conflict flags",
      conflict_review_members: "Conflict review",
      avg_confidence_below_threshold: "Low avg confidence",
      mixed_divisions: "Mixed divisions",
    };
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
        <ShieldAlert size={10} /> {labels[reason] || reason.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div data-testid="smart-suggestions-panel">
      {/* Summary bar */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4" data-testid="smart-summary">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <p className="text-xs text-emerald-600 font-medium">Safe to Approve</p>
            <p className="text-xl font-bold text-emerald-800">{summary.fully_eligible}</p>
            <p className="text-[10px] text-emerald-500">families</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-600 font-medium">Partially Eligible</p>
            <p className="text-xl font-bold text-amber-800">{summary.partially_eligible}</p>
            <p className="text-[10px] text-amber-500">families</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-xs text-red-600 font-medium">Not Eligible</p>
            <p className="text-xl font-bold text-red-800">{summary.ineligible}</p>
            <p className="text-[10px] text-red-500">families</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-xs text-blue-600 font-medium">Products Clearable</p>
            <p className="text-xl font-bold text-blue-800">{summary.total_products_clearable}</p>
            <p className="text-[10px] text-blue-500">via bulk approve</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-sm text-slate-400">
          Analyzing families...
        </div>
      ) : suggestions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-sm text-slate-400">
          No family suggestions available
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map((s) => {
            const key = `${s.division}||${s.brand}||${s.family}`;
            const isExpanded = expanded.has(key);
            const isEligible = s.smart_approve_eligible;
            const isPartial = s.partially_eligible;
            const borderCls = isEligible ? "border-emerald-200" : isPartial ? "border-amber-200" : "border-red-200";
            const headerBg = isEligible ? "bg-emerald-50/50" : isPartial ? "bg-amber-50/50" : "bg-red-50/30";

            return (
              <div key={key} className={`bg-white border ${borderCls} rounded-lg overflow-hidden`} data-testid={`suggestion-${s.family}`}>
                {/* Header */}
                <div
                  className={`px-4 py-3 ${headerBg} cursor-pointer flex items-center justify-between`}
                  onClick={() => toggleExpand(key)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isEligible ? (
                      <ShieldCheck size={18} className="text-emerald-600 flex-shrink-0" />
                    ) : isPartial ? (
                      <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
                    ) : (
                      <ShieldAlert size={18} className="text-red-500 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800 truncate">{s.family}</p>
                        <ScoreBadge score={s.smart_approve_score} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {s.division} · {s.brand || "(no brand)"} · {s.family_size} products · avg {s.avg_confidence} conf
                        {s.implant_classes.length > 0 && ` · ${s.implant_classes.join(", ")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(isEligible || isPartial) && s.eligible_count > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleApproveFamily(s); }}
                        disabled={approving === s.family}
                        className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium disabled:opacity-50"
                        data-testid={`smart-approve-${s.family}`}
                      >
                        {approving === s.family ? "Approving..." : `Approve ${s.eligible_count}`}
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 py-3 border-t border-slate-100 space-y-3">
                    {/* Reason */}
                    <div className="bg-slate-50 rounded-md p-3">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Analysis</p>
                      <p className="text-sm text-slate-700">{s.smart_approve_reason}</p>
                    </div>

                    {/* Confidence range */}
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-500">Confidence range:</span>
                      <span className="font-mono">{s.min_confidence} — {s.max_confidence}</span>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-500">Eligible:</span>
                      <span className="font-medium text-emerald-700">{s.eligible_count}</span>
                      <span className="text-slate-500">Excluded:</span>
                      <span className="font-medium text-red-600">{s.excluded_count}</span>
                    </div>

                    {/* Exclusions */}
                    {s.smart_approve_exclusion_reasons.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Exclusion reasons:</p>
                        <div className="flex flex-wrap gap-1">
                          {s.smart_approve_exclusion_reasons.map((r) => <ExclusionTag key={r} reason={r} />)}
                        </div>
                      </div>
                    )}

                    {/* Sample titles */}
                    {s.sample_titles.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Sample products:</p>
                        <div className="grid grid-cols-2 gap-1">
                          {s.sample_titles.map((t, i) => (
                            <p key={i} className="text-xs text-slate-600 truncate">· {t}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Excluded slugs (if any) */}
                    {s.excluded_slugs.length > 0 && s.excluded_slugs.length <= 10 && (
                      <div>
                        <p className="text-xs text-red-500 mb-1">Excluded items (need individual review):</p>
                        <div className="flex flex-wrap gap-1">
                          {s.excluded_slugs.map((slug) => (
                            <span key={slug} className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">
                              {slug}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Auto-Promote Pipeline Panel ──
function AutoPromotePanel({ onRefresh }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/review/auto-promote/preview`, { headers: getHeaders() });
      const data = await res.json();
      setPreview(data);
    } catch (e) {
      toast.error("Failed to load preview");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const executeAutoPromote = async (lanes) => {
    setExecuting(true);
    try {
      const res = await fetch(`${API}/api/admin/review/auto-promote/execute`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ lanes }),
      });
      const data = await res.json();
      setResult(data);
      toast.success(`Promoted ${data.total_promoted} products!`);
      onRefresh?.();
      loadPreview();
    } catch (e) {
      toast.error("Auto-promote failed");
    }
    setExecuting(false);
  };

  if (loading && !preview) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500" data-testid="auto-promote-loading">
        <Loader2 className="animate-spin mr-2" size={20} /> Analyzing pipeline...
      </div>
    );
  }

  if (!preview) return null;

  const { lane1_safe, lane2_family, lane3_inherit, lane4_manual, summary } = preview;

  const LANE_CONFIG = [
    {
      key: "lane1", label: "Lane 1 — Safe Auto-Approve", data: lane1_safe,
      color: "emerald", icon: <ShieldCheck size={18} />,
      desc: "Confidence >= 0.85, no conflicts, not blocked",
    },
    {
      key: "lane2", label: "Lane 2 — Family Consensus", data: lane2_family,
      color: "blue", icon: <Users size={18} />,
      desc: "Clean families with consistent brand, class, and materials",
    },
    {
      key: "lane3", label: "Lane 3 — Inherit + Standalone", data: lane3_inherit,
      color: "teal", icon: <Layers size={18} />,
      desc: "Parent inheritance, size variants, and standalone decent-confidence products",
    },
  ];

  return (
    <div className="space-y-4" data-testid="auto-promote-panel">
      {/* Summary Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">4-Lane Auto-Promotion Pipeline</h3>
            <p className="text-sm text-slate-500 mt-0.5">Review by exception — only true blockers need manual attention</p>
          </div>
          <button
            onClick={() => executeAutoPromote(["lane1", "lane2", "lane3"])}
            disabled={executing || summary.auto_promotable === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium
              hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="execute-all-lanes-btn"
          >
            {executing ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
            {executing ? "Promoting..." : `Promote All ${summary.auto_promotable} Products`}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-700">{summary.auto_promotable}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Auto-Promotable</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{summary.manual_review_only}</p>
            <p className="text-xs text-red-600 mt-0.5">Manual Review</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-slate-700">{summary.total_pending}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total Pending</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">
              {summary.total_pending > 0 ? Math.round((summary.auto_promotable / summary.total_pending) * 100) : 0}%
            </p>
            <p className="text-xs text-blue-600 mt-0.5">Clearance Rate</p>
          </div>
        </div>
      </div>

      {/* Result Banner */}
      {result && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4" data-testid="auto-promote-result">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span className="font-semibold text-emerald-800">Pipeline Complete</span>
          </div>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div><span className="text-emerald-600 font-medium">{result.results?.lane1 || 0}</span> Safe</div>
            <div><span className="text-blue-600 font-medium">{result.results?.lane2 || 0}</span> Family</div>
            <div><span className="text-teal-600 font-medium">{result.results?.lane3 || 0}</span> Inherit</div>
            <div><span className="text-red-600 font-medium">{result.results?.lane4_remaining || 0}</span> Manual</div>
          </div>
          <p className="text-sm text-emerald-700 mt-2 font-medium">
            Total promoted: {result.total_promoted} | Remaining: {result.remaining_manual_review}
          </p>
        </div>
      )}

      {/* Lane Cards */}
      {LANE_CONFIG.map(({ key, label, data, color, icon, desc }) => (
        <div key={key} className="bg-white border border-slate-200 rounded-lg p-4" data-testid={`lane-card-${key}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-${color}-600`}>{icon}</span>
              <h4 className="font-semibold text-slate-800">{label}</h4>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-${color}-100 text-${color}-700`}>
                {data.count}
              </span>
            </div>
            <button
              onClick={() => executeAutoPromote([key])}
              disabled={executing || data.count === 0}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
                ${data.count > 0
                  ? `bg-${color}-50 text-${color}-700 hover:bg-${color}-100`
                  : "bg-slate-50 text-slate-400 cursor-not-allowed"
                }`}
              data-testid={`execute-${key}-btn`}
            >
              {executing ? "..." : `Promote ${data.count}`}
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-2">{desc}</p>
          {data.families && data.families.length > 0 && (
            <div className="mt-2 space-y-1">
              {data.families.map((f, i) => (
                <div key={i} className="text-xs bg-slate-50 rounded px-2 py-1">
                  <span className="font-medium">{f.family}</span>
                  <span className="text-slate-400 mx-1">|</span>
                  {f.division} / {f.brand} — {f.count} products (avg {f.avg_conf})
                </div>
              ))}
            </div>
          )}
          {data.sample && data.sample.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {data.sample.slice(0, 5).map((s, i) => (
                <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  {typeof s === 'string' ? s : s.slug}
                </span>
              ))}
              {data.count > 5 && (
                <span className="text-xs text-slate-400">+{data.count - 5} more</span>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Lane 4: Manual Review */}
      <div className="bg-white border border-red-200 rounded-lg p-4" data-testid="lane-card-lane4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={18} className="text-red-500" />
          <h4 className="font-semibold text-slate-800">Lane 4 — Manual Review Required</h4>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
            {lane4_manual.count}
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-3">True blockers: real conflicts, weak evidence, source disagreement, very low confidence</p>
        {lane4_manual.reasons && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
            {Object.entries(lane4_manual.reasons).sort((a,b) => b[1]-a[1]).map(([reason, count]) => (
              <div key={reason} className="bg-red-50 rounded px-2 py-1.5 text-center">
                <p className="text-sm font-bold text-red-700">{count}</p>
                <p className="text-xs text-red-500">{reason.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        )}
        {lane4_manual.sample && lane4_manual.sample.length > 0 && (
          <div className="space-y-1">
            {lane4_manual.sample.slice(0, 5).map((s, i) => (
              <div key={i} className="text-xs bg-red-50 rounded px-2 py-1 flex justify-between">
                <span className="font-medium text-slate-700">{s.slug}</span>
                <span className="text-red-500">conf: {s.conf} | {s.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ──
export default function AdminReview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [selectedSlugs, setSelectedSlugs] = useState(new Set());
  const [detailSlug, setDetailSlug] = useState(null);
  const [viewMode, setViewMode] = useState("products"); // products | families
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    division: searchParams.get("division") || null,
    brand: searchParams.get("brand") || null,
    status: searchParams.get("status") || null,
    action: searchParams.get("action") || null,
    confidence_min: searchParams.get("conf_min") ? parseFloat(searchParams.get("conf_min")) : null,
    confidence_max: searchParams.get("conf_max") ? parseFloat(searchParams.get("conf_max")) : null,
    family: searchParams.get("family") || null,
    pending_only: true,
    page: parseInt(searchParams.get("page") || "1"),
  });

  const loadStats = useCallback(() => {
    fetch(`${API}/api/admin/review/stats`, { headers: getHeaders() })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const loadProducts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", filters.page);
    params.set("limit", "30");
    if (filters.pending_only) params.set("pending_only", "true");
    if (filters.division) params.set("division", filters.division);
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.status) params.set("status", filters.status);
    if (filters.action) params.set("action", filters.action);
    if (filters.confidence_min != null) params.set("confidence_min", filters.confidence_min);
    if (filters.confidence_max != null) params.set("confidence_max", filters.confidence_max);
    if (filters.family) params.set("family", filters.family);

    fetch(`${API}/api/admin/review/products?${params}`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filters]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleApprove = async (slug) => {
    const res = await fetch(`${API}/api/admin/review/products/${slug}/approve`, {
      method: "POST", headers: getHeaders(),
    });
    if (res.ok) {
      toast.success(`${slug} approved`);
      loadProducts();
      loadStats();
    } else {
      toast.error("Failed to approve");
    }
  };

  const handleReject = async (slug) => {
    const res = await fetch(`${API}/api/admin/review/products/${slug}/reject`, {
      method: "POST", headers: getHeaders(),
    });
    if (res.ok) {
      toast.success(`${slug} rejected`);
      loadProducts();
      loadStats();
    } else {
      toast.error("Failed to reject");
    }
  };

  const handleBulkApprove = async (family, division) => {
    if (!window.confirm(`Bulk approve all products in family "${family}" (${division})?`)) return;
    const res = await fetch(`${API}/api/admin/review/bulk-approve`, {
      method: "POST", headers: getHeaders(),
      body: JSON.stringify({ family, division }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Bulk approved ${data.count} products`);
      loadProducts();
      loadStats();
    } else {
      toast.error("Bulk approve failed");
    }
  };

  const handleBulkApproveSelected = async () => {
    if (selectedSlugs.size === 0) return;
    if (!window.confirm(`Approve ${selectedSlugs.size} selected products?`)) return;
    const res = await fetch(`${API}/api/admin/review/bulk-approve`, {
      method: "POST", headers: getHeaders(),
      body: JSON.stringify({ slugs: [...selectedSlugs] }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Approved ${data.count} products`);
      setSelectedSlugs(new Set());
      loadProducts();
      loadStats();
    }
  };

  return (
    <div className="p-6 font-[Manrope]" data-testid="admin-review-dashboard">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Enrichment Review Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review and approve staged semantic enrichments</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("products")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "products" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            data-testid="view-mode-products"
          >
            <BarChart3 size={14} /> Products
          </button>
          <button
            onClick={() => setViewMode("families")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "families" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            data-testid="view-mode-families"
          >
            <Layers size={14} /> Families
          </button>
          <button
            onClick={() => setViewMode("smart")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "smart" ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
            data-testid="view-mode-smart"
          >
            <Sparkles size={14} /> Smart Suggestions
          </button>
          <button
            onClick={() => setViewMode("auto")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "auto" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
            data-testid="view-mode-auto"
          >
            <Zap size={14} /> Auto-Promote
          </button>
        </div>
      </div>

      <StatsBar stats={stats} />

      {viewMode === "products" ? (
        <>
          <FilterBar filters={filters} setFilters={setFilters} stats={stats} />

          {/* Bulk actions */}
          {selectedSlugs.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4 flex items-center justify-between" data-testid="bulk-action-bar">
              <span className="text-sm text-blue-700">{selectedSlugs.size} selected</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkApproveSelected}
                  className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium"
                  data-testid="bulk-approve-selected-btn"
                >
                  Approve Selected
                </button>
                <button
                  onClick={() => setSelectedSlugs(new Set())}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="review-products-table">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2.5 w-10">
                      <input
                        type="checkbox"
                        checked={selectedSlugs.size === products.length && products.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedSlugs(new Set(products.map((p) => p.slug)));
                          else setSelectedSlugs(new Set());
                        }}
                        className="rounded border-slate-300"
                        data-testid="review-select-all"
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs text-slate-500 font-medium">Product</th>
                    <th className="px-3 py-2.5 text-left text-xs text-slate-500 font-medium">Division</th>
                    <th className="px-3 py-2.5 text-left text-xs text-slate-500 font-medium">Brand</th>
                    <th className="px-3 py-2.5 text-left text-xs text-slate-500 font-medium">Class</th>
                    <th className="px-3 py-2.5 text-left text-xs text-slate-500 font-medium">Conf</th>
                    <th className="px-3 py-2.5 text-left text-xs text-slate-500 font-medium">Status</th>
                    <th className="px-3 py-2.5 text-left text-xs text-slate-500 font-medium">Action</th>
                    <th className="px-3 py-2.5 text-left text-xs text-slate-500 font-medium w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">Loading...</td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">No products match these filters</td></tr>
                  ) : (
                    products.map((p, idx) => (
                      <ProductRow
                        key={`${p.slug}-${idx}`}
                        product={p}
                        onView={setDetailSlug}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        selected={selectedSlugs.has(p.slug)}
                        onToggle={() => {
                          const next = new Set(selectedSlugs);
                          if (next.has(p.slug)) next.delete(p.slug);
                          else next.add(p.slug);
                          setSelectedSlugs(next);
                        }}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <span className="text-xs text-slate-500">{total} total · Page {filters.page} of {pages}</span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={filters.page <= 1}
                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                    className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-30"
                    data-testid="review-page-prev"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={filters.page >= pages}
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                    className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-30"
                    data-testid="review-page-next"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : viewMode === "families" ? (
        <FamilyPanel onBulkApprove={handleBulkApprove} />
      ) : viewMode === "auto" ? (
        <AutoPromotePanel onRefresh={() => { loadProducts(); loadStats(); }} />
      ) : (
        <SmartSuggestionsPanel onRefresh={() => { loadProducts(); loadStats(); }} />
      )}

      {/* Detail Modal */}
      <DetailModal
        slug={detailSlug}
        onClose={(refresh) => {
          setDetailSlug(null);
          if (refresh) { loadProducts(); loadStats(); }
        }}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
