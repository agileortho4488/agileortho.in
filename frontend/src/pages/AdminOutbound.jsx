import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Send, Pause, Play, RefreshCw, Plus, Trash2, Settings, AlertTriangle,
  CheckCircle2, Clock, MousePointerClick, ThumbsUp, MessageSquare, Flame,
} from "lucide-react";
import api from "../lib/api";

const STATUS_COLOR = {
  sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-slate-50 text-slate-600 border-slate-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminOutbound() {
  const [dashboard, setDashboard] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/api/admin/outbound/dashboard"),
      api.get("/api/admin/outbound/rules"),
    ])
      .then(([d, r]) => {
        setDashboard(d.data);
        setRules(r.data.rules || []);
      })
      .catch(() => toast.error("Failed to load outbound engine"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  const togglePause = async () => {
    try {
      if (dashboard?.today?.paused) {
        await api.post("/api/admin/outbound/resume");
        toast.success("Engine resumed");
      } else {
        await api.post("/api/admin/outbound/pause", { reason: "manual" });
        toast.success("Engine paused");
      }
      load();
    } catch { toast.error("Failed to update pause state"); }
  };

  const runTick = async () => {
    try {
      const res = await api.post("/api/admin/outbound/tick");
      if (res.data.ran) toast.success(`Sent ${res.data.sends} messages`);
      else toast.warning(`Tick skipped: ${res.data.reason}`);
      load();
    } catch { toast.error("Tick failed"); }
  };

  const saveRule = async (rule) => {
    try {
      if (rule.id) await api.put(`/api/admin/outbound/rules/${rule.id}`, rule);
      else await api.post("/api/admin/outbound/rules", rule);
      toast.success("Rule saved");
      setEditing(null); setShowNew(false);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };

  const deleteRule = async (id) => {
    if (!window.confirm("Delete this rule?")) return;
    try {
      await api.delete(`/api/admin/outbound/rules/${id}`);
      toast.success("Rule deleted"); load();
    } catch { toast.error("Delete failed"); }
  };

  const toggleRule = async (rule) => {
    try {
      await api.put(`/api/admin/outbound/rules/${rule.id}`, { ...rule, enabled: !rule.enabled });
      load();
    } catch { toast.error("Toggle failed"); }
  };

  if (loading && !dashboard) {
    return <div className="p-6 text-sm text-slate-400">Loading outbound engine...</div>;
  }

  const today = dashboard?.today || {};
  const cfg = dashboard?.config || {};
  const last7 = dashboard?.last_7d || {};
  const canSend = dashboard?.can_send_now;
  const reason = dashboard?.reason;

  return (
    <div className="p-6 space-y-6" data-testid="admin-outbound">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-slate-900" style={{ fontFamily: "Chivo" }}>Outbound Engine</h1>
          <p className="text-sm text-slate-500 mt-0.5">Rule-based WhatsApp outreach with quality guardrails</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-sm text-xs hover:border-slate-300" data-testid="outbound-refresh">
            <RefreshCw size={12} /> Refresh
          </button>
          <button onClick={runTick} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-indigo-300 text-indigo-700 rounded-sm text-xs font-semibold hover:bg-indigo-50" data-testid="outbound-tick-now">
            <Send size={12} /> Run tick now
          </button>
          <button
            onClick={togglePause}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold ${today.paused ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-red-600 text-white hover:bg-red-700"}`}
            data-testid="outbound-pause-toggle"
          >
            {today.paused ? <><Play size={12} /> Resume</> : <><Pause size={12} /> Pause</>}
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div className={`border rounded-sm p-3 flex items-start gap-3 ${canSend ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`} data-testid="outbound-status-banner">
        {canSend ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />}
        <div className="text-sm">
          <p className={`font-bold ${canSend ? "text-emerald-800" : "text-amber-900"}`}>
            {canSend ? "Engine is sending" : `Engine is idle — ${reason}`}
          </p>
          <p className="text-xs mt-0.5 text-slate-600">
            Daily cap: {cfg.daily_cap?.toLocaleString()} · Business hours: {cfg.business_hours?.[0]}:00 – {cfg.business_hours?.[1]}:00 IST · Block threshold: {cfg.block_threshold}
          </p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="outbound-kpis">
        <Kpi icon={Send} label="Sent today" value={today.sent_count ?? 0} sub={`of ${cfg.daily_cap?.toLocaleString()} cap`} color="emerald" />
        <Kpi icon={ThumbsUp} label="Opt-ins today" value={today.opt_in_count ?? 0} sub="Users said YES" color="indigo" />
        <Kpi icon={MousePointerClick} label="Clicks today" value={today.click_count ?? 0} sub="Link opens" color="violet" />
        <Kpi icon={MessageSquare} label="Replies today" value={today.reply_count ?? 0} sub="Incoming messages" color="teal" />
        <Kpi icon={Flame} label="Blocks today" value={today.blocks_count ?? 0} sub={`Pauses at ${cfg.block_threshold}`} color={today.blocks_count >= cfg.block_threshold ? "red" : "slate"} />
      </div>

      {/* 7-day rollup */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm" data-testid="outbound-7d">
        <Mini label="7d sent" value={last7.sent?.toLocaleString() ?? 0} />
        <Mini label="7d clicks" value={last7.clicks?.toLocaleString() ?? 0} sub={`${last7.click_rate ?? 0}% CTR`} />
        <Mini label="7d opt-ins" value={last7.opt_ins?.toLocaleString() ?? 0} sub={`${last7.opt_in_rate ?? 0}% opt-in`} />
        <Mini label="Active rules" value={`${dashboard?.active_rules ?? 0} / ${dashboard?.total_rules ?? 0}`} />
      </div>

      {/* Rules */}
      <div className="bg-white border border-slate-200 rounded-sm" data-testid="outbound-rules-panel">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Rules</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setConfigOpen(true)} className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-slate-200 rounded hover:border-slate-300" data-testid="outbound-config-btn">
              <Settings size={12} /> Engine config
            </button>
            <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700" data-testid="outbound-new-rule-btn">
              <Plus size={12} /> New rule
            </button>
          </div>
        </div>
        {rules.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No rules yet. Click <b>New rule</b> to create your first outbound automation (e.g. "Send opt-in template to new Google Maps leads").
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Enabled</th>
                <th className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Name</th>
                <th className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Template</th>
                <th className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Match</th>
                <th className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Cooldown</th>
                <th className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map((r) => (
                <tr key={r.id} data-testid={`rule-row-${r.id}`}>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleRule(r)}
                      className={`w-9 h-5 rounded-full relative transition-colors ${r.enabled ? "bg-emerald-500" : "bg-slate-300"}`}
                      data-testid={`rule-toggle-${r.id}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${r.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-2 font-semibold text-slate-900">{r.name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-indigo-700">{r.template_name || <span className="text-red-500">— missing —</span>}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">
                    {Object.entries(r.match || {}).map(([k, v]) => (
                      <span key={k} className="inline-block mr-1.5 bg-slate-100 px-1.5 py-0.5 rounded-sm font-mono">{k}={String(v)}</span>
                    ))}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-600">{r.cooldown_hours}h</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(r)} className="px-2 py-1 text-xs border border-slate-200 rounded hover:border-slate-300">Edit</button>
                      <button onClick={() => deleteRule(r.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent sends */}
      <div className="bg-white border border-slate-200 rounded-sm" data-testid="outbound-recent">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <Clock size={14} className="text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900">Recent sends</h3>
        </div>
        {(dashboard?.recent_sends || []).length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No outbound sends yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Time</th>
                <th className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Phone</th>
                <th className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Template</th>
                <th className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Rule</th>
                <th className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Status</th>
                <th className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dashboard.recent_sends.slice(0, 25).map((s) => (
                <tr key={s.tracking_id}>
                  <td className="px-4 py-2 text-xs font-mono text-slate-500">{new Date(s.created_at).toLocaleTimeString()}</td>
                  <td className="px-4 py-2 font-mono text-xs">{s.phone}</td>
                  <td className="px-4 py-2 text-xs">{s.template_name}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">{s.rule_name}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-1.5 py-0.5 border rounded-sm text-[10px] font-bold uppercase tracking-wide ${STATUS_COLOR[s.status] || STATUS_COLOR.pending}`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {s.clicked_at && <span className="text-violet-700 mr-2">🖱 clicked</span>}
                    {s.opted_in_at && <span className="text-emerald-700 mr-2">✅ opted-in</span>}
                    {s.replied_at && <span className="text-teal-700 mr-2">💬 replied</span>}
                    {s.blocked_at && <span className="text-red-700">🚫 blocked</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(showNew || editing) && (
        <RuleEditor
          rule={editing || { enabled: true, cooldown_hours: 168, priority: 10 }}
          onClose={() => { setEditing(null); setShowNew(false); }}
          onSave={saveRule}
        />
      )}

      {configOpen && <ConfigModal config={cfg} onClose={() => setConfigOpen(false)} onSaved={load} />}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, color }) {
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-700",
    indigo: "bg-indigo-50 text-indigo-700",
    violet: "bg-violet-50 text-violet-700",
    teal: "bg-teal-50 text-teal-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-50 text-slate-700",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-sm p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-7 h-7 rounded-sm inline-flex items-center justify-center ${colorMap[color] || colorMap.slate}`}><Icon size={14} /></span>
        <span className="text-[10px] uppercase tracking-wide font-bold text-slate-500">{label}</span>
      </div>
      <div className="text-2xl font-black text-slate-900" style={{ fontFamily: "Chivo" }}>{typeof value === "number" ? value.toLocaleString() : value}</div>
      <p className="text-[11px] text-slate-500">{sub}</p>
    </div>
  );
}

function Mini({ label, value, sub }) {
  return (
    <div className="bg-white border border-slate-200 rounded-sm px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide font-bold text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900">{value}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}

function RuleEditor({ rule, onClose, onSave }) {
  const [form, setForm] = useState({
    ...rule,
    match_source: rule.match?.source || "",
    match_status: rule.match?.status || "",
    match_min_age: rule.match?.min_age_minutes || "",
    body_values_str: (rule.body_values || []).join(", "),
  });
  const submit = (e) => {
    e.preventDefault();
    const payload = {
      id: form.id,
      name: form.name,
      enabled: form.enabled,
      template_name: form.template_name,
      cooldown_hours: Number(form.cooldown_hours) || 168,
      priority: Number(form.priority) || 10,
      match: {
        ...(form.match_source && { source: form.match_source }),
        ...(form.match_status && { status: form.match_status }),
        ...(form.match_min_age && { min_age_minutes: Number(form.match_min_age) }),
      },
      body_values: form.body_values_str.split(",").map((s) => s.trim()).filter(Boolean),
    };
    onSave(payload);
  };
  return (
    <div className="fixed inset-0 z-50 flex" data-testid="rule-editor">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <form onSubmit={submit} className="w-full max-w-md bg-white shadow-xl overflow-y-auto p-5 space-y-3">
        <h2 className="font-bold text-slate-900 text-lg" style={{ fontFamily: "Chivo" }}>{rule.id ? "Edit rule" : "New rule"}</h2>
        <Field label="Name"><input required value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm" data-testid="rule-name" /></Field>
        <Field label="Interakt template name"><input required value={form.template_name || ""} onChange={(e) => setForm({ ...form, template_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm font-mono" placeholder="ao_optin_v1" data-testid="rule-template" /></Field>
        <Field label="Body values (comma-separated tokens)"><input value={form.body_values_str} onChange={(e) => setForm({ ...form, body_values_str: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm font-mono" placeholder="{{product_interest}}, {{name}}" data-testid="rule-body-values" /></Field>
        <p className="text-[11px] text-slate-500 -mt-2">Supported tokens: {`{{name}}, {{hospital}}, {{district}}, {{product_interest}}, {{category}}, {{tracking_id}}`}</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Match source"><input value={form.match_source} onChange={(e) => setForm({ ...form, match_source: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm font-mono" placeholder="google_maps" data-testid="rule-match-source" /></Field>
          <Field label="Match status"><input value={form.match_status} onChange={(e) => setForm({ ...form, match_status: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm font-mono" placeholder="new" /></Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Min age (min)"><input type="number" value={form.match_min_age} onChange={(e) => setForm({ ...form, match_min_age: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm" placeholder="10" /></Field>
          <Field label="Cooldown (hrs)"><input type="number" value={form.cooldown_hours} onChange={(e) => setForm({ ...form, cooldown_hours: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm" /></Field>
          <Field label="Priority"><input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm" /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} data-testid="rule-enabled" />
          Enabled
        </label>
        <div className="flex items-center gap-2 pt-3">
          <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-sm text-sm font-bold hover:bg-indigo-700" data-testid="rule-save">Save</button>
          <button type="button" onClick={onClose} className="py-2 px-4 border border-slate-200 rounded-sm text-sm">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function ConfigModal({ config, onClose, onSaved }) {
  const [form, setForm] = useState({
    daily_cap: config.daily_cap,
    cooldown_hours: config.cooldown_hours,
    block_threshold: config.block_threshold,
    business_hours_start: config.business_hours?.[0] ?? 9,
    business_hours_end: config.business_hours?.[1] ?? 19,
    engine_enabled: config.engine_enabled,
  });
  const save = async (e) => {
    e.preventDefault();
    try {
      await api.put("/api/admin/outbound/config", {
        daily_cap: Number(form.daily_cap),
        cooldown_hours: Number(form.cooldown_hours),
        block_threshold: Number(form.block_threshold),
        business_hours: [Number(form.business_hours_start), Number(form.business_hours_end)],
        engine_enabled: !!form.engine_enabled,
      });
      toast.success("Config saved"); onSaved(); onClose();
    } catch { toast.error("Save failed"); }
  };
  return (
    <div className="fixed inset-0 z-50 flex" data-testid="config-modal">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <form onSubmit={save} className="w-full max-w-md bg-white shadow-xl p-5 space-y-3">
        <h2 className="font-bold text-slate-900 text-lg" style={{ fontFamily: "Chivo" }}>Engine config</h2>
        <Field label="Daily cap"><input type="number" value={form.daily_cap} onChange={(e) => setForm({ ...form, daily_cap: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm" /></Field>
        <Field label="Cooldown per lead (hrs)"><input type="number" value={form.cooldown_hours} onChange={(e) => setForm({ ...form, cooldown_hours: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm" /></Field>
        <Field label="Block threshold (auto-pause)"><input type="number" value={form.block_threshold} onChange={(e) => setForm({ ...form, block_threshold: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Business hours start (IST)"><input type="number" min="0" max="23" value={form.business_hours_start} onChange={(e) => setForm({ ...form, business_hours_start: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm" /></Field>
          <Field label="Business hours end (IST)"><input type="number" min="0" max="23" value={form.business_hours_end} onChange={(e) => setForm({ ...form, business_hours_end: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm" /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.engine_enabled} onChange={(e) => setForm({ ...form, engine_enabled: e.target.checked })} />
          Engine enabled
        </label>
        <div className="flex items-center gap-2 pt-3">
          <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-sm text-sm font-bold hover:bg-indigo-700">Save</button>
          <button type="button" onClick={onClose} className="py-2 px-4 border border-slate-200 rounded-sm text-sm">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide font-bold text-slate-600 mb-1 block">{label}</label>
      {children}
    </div>
  );
}
