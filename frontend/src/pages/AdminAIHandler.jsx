import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Brain, RefreshCw, Play, CheckCircle2, AlertTriangle, Edit3,
  MessageSquare, TrendingUp, FileText, Save,
} from "lucide-react";
import api from "../lib/api";

const INTENT_COLOR = {
  PRICING: "bg-amber-50 text-amber-700 border-amber-200",
  BULK_QUOTE: "bg-red-50 text-red-700 border-red-200",
  MEETING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  PRODUCT_SPEC: "bg-teal-50 text-teal-700 border-teal-200",
  CATALOG_REQUEST: "bg-violet-50 text-violet-700 border-violet-200",
  SPAM: "bg-slate-50 text-slate-500 border-slate-200",
  IRRELEVANT: "bg-slate-50 text-slate-500 border-slate-200",
  GENERAL: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function AdminAIHandler() {
  const [stats, setStats] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [filter, setFilter] = useState({ intent: "", channel: "" });
  const [loading, setLoading] = useState(true);
  const [correcting, setCorrecting] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [config, setConfig] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.intent) params.set("intent", filter.intent);
    if (filter.channel) params.set("channel", filter.channel);
    Promise.all([
      api.get("/api/admin/ai/stats"),
      api.get(`/api/admin/ai/recent?${params}`),
      api.get("/api/admin/ai/config"),
    ])
      .then(([s, r, c]) => {
        setStats(s.data);
        setInteractions(r.data.interactions || []);
        setConfig(c.data);
      })
      .catch(() => toast.error("Failed to load AI data"))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const runTest = async () => {
    if (!testMsg.trim()) return;
    setTesting(true);
    try {
      const res = await api.post("/api/admin/ai/test", { message: testMsg, channel: "whatsapp" });
      setTestResult(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Test failed");
    } finally { setTesting(false); }
  };

  const saveCorrection = async (row, corrected, note) => {
    try {
      await api.post(`/api/admin/ai/correct/${row.id}`, { corrected_reply: corrected, note });
      toast.success("Correction saved");
      setCorrecting(null);
      load();
    } catch { toast.error("Save failed"); }
  };

  if (loading && !stats) return <div className="p-6 text-sm text-slate-400">Loading...</div>;

  return (
    <div className="p-6 space-y-5" data-testid="admin-ai-handler">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2" style={{ fontFamily: "Chivo" }}>
            <Brain size={18} className="text-violet-600" /> AI Lead Handler
          </h1>
          <p className="text-sm text-slate-500">Review, correct, and tune the AI that handles every inbound message.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-1.5 border border-slate-200 rounded-sm text-xs hover:border-slate-300 inline-flex items-center gap-1">
            <RefreshCw size={12} /> Refresh
          </button>
          <button onClick={() => setConfigOpen(true)} className="px-3 py-1.5 bg-slate-900 text-white rounded-sm text-xs font-bold inline-flex items-center gap-1" data-testid="ai-edit-prompt-btn">
            <Edit3 size={12} /> Edit system prompt
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="ai-stats">
          <Kpi label="Total inbound" value={stats.total_interactions} color="indigo" />
          <Kpi label="Last 24h" value={stats.last_24h} color="emerald" />
          {(stats.by_intent || []).slice(0, 3).map((b) => (
            <Kpi key={b.intent} label={b.intent} value={b.count} color={intentToColor(b.intent)} />
          ))}
        </div>
      )}

      {/* Tester */}
      <div className="bg-white border border-slate-200 rounded-sm p-4" data-testid="ai-tester">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Play size={14} className="text-violet-600" /> Test the AI without side effects
        </h3>
        <div className="flex gap-2">
          <input
            value={testMsg}
            onChange={(e) => setTestMsg(e.target.value)}
            placeholder='e.g., "price of knee replacement", "send me brochure for trauma plates"'
            className="flex-1 px-3 py-2 border border-slate-200 rounded-sm text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") runTest(); }}
            data-testid="ai-test-input"
          />
          <button onClick={runTest} disabled={testing || !testMsg.trim()} className="px-4 py-2 bg-violet-600 text-white rounded-sm text-sm font-bold hover:bg-violet-700 disabled:opacity-50" data-testid="ai-test-btn">
            {testing ? "Testing..." : "Test"}
          </button>
        </div>
        {testResult && (
          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-sm text-sm" data-testid="ai-test-result">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 border rounded-sm text-[10px] font-bold uppercase tracking-wide ${INTENT_COLOR[testResult.intent] || ""}`}>{testResult.intent}</span>
              <span className="text-xs text-slate-500">confidence {((testResult.confidence || 0) * 100).toFixed(0)}%</span>
              {testResult.sales_alert_fired && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">🔔 sales alert fired</span>}
            </div>
            <pre className="whitespace-pre-wrap text-slate-800 font-mono text-xs">{testResult.reply}</pre>
            {testResult.reasoning && <p className="text-[11px] text-slate-500 mt-2"><b>reasoning:</b> {testResult.reasoning}</p>}
          </div>
        )}
      </div>

      {/* Filters + Recent */}
      <div className="bg-white border border-slate-200 rounded-sm" data-testid="ai-recent-panel">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare size={14} /> Recent inbound (last {interactions.length})
          </h3>
          <div className="flex gap-2">
            <select value={filter.intent} onChange={(e) => setFilter({ ...filter, intent: e.target.value })} className="px-2 py-1 border border-slate-200 rounded-sm text-xs">
              <option value="">All intents</option>
              {Object.keys(INTENT_COLOR).map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            <select value={filter.channel} onChange={(e) => setFilter({ ...filter, channel: e.target.value })} className="px-2 py-1 border border-slate-200 rounded-sm text-xs">
              <option value="">All channels</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="web">Website</option>
            </select>
          </div>
        </div>
        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
          {interactions.map((row) => (
            <div key={row.id} className="p-4 hover:bg-slate-50" data-testid={`ai-row-${row.id}`}>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`px-2 py-0.5 border rounded-sm text-[10px] font-bold uppercase tracking-wide ${INTENT_COLOR[row.intent] || ""}`}>{row.intent}</span>
                <span className="text-xs text-slate-400">{row.channel}</span>
                <span className="text-xs text-slate-400 font-mono">{row.phone || row.session_id?.slice(0, 10)}</span>
                {row.lead_district && <span className="text-xs text-slate-500">📍 {row.lead_district}</span>}
                <span className="text-xs text-slate-400 ml-auto">{new Date(row.created_at).toLocaleString()}</span>
              </div>
              <div className="text-sm">
                <div className="text-slate-500 text-xs mb-1">INBOUND:</div>
                <div className="text-slate-800 mb-2">{row.inbound}</div>
                <div className="text-slate-500 text-xs mb-1">AI REPLY:</div>
                <pre className="whitespace-pre-wrap text-slate-700 text-xs font-mono bg-slate-50 p-2 rounded-sm border border-slate-100">{row.reply || "(empty — SPAM/IRRELEVANT filter)"}</pre>
                {row.corrected_reply && (
                  <div className="mt-2 bg-emerald-50 border border-emerald-200 p-2 rounded-sm text-xs">
                    <b className="text-emerald-800">✓ Corrected by admin:</b>
                    <pre className="whitespace-pre-wrap mt-1 text-emerald-900 font-mono">{row.corrected_reply}</pre>
                    {row.correction_note && <p className="text-emerald-700 mt-1">Note: {row.correction_note}</p>}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px] text-slate-500">{row.reasoning}</p>
                  <button onClick={() => setCorrecting(row)} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1">
                    <Edit3 size={11} /> {row.corrected_reply ? "Update correction" : "Correct this reply"}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {interactions.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">No interactions match your filters.</div>
          )}
        </div>
      </div>

      {correcting && (
        <CorrectionModal row={correcting} onClose={() => setCorrecting(null)} onSave={saveCorrection} />
      )}
      {configOpen && config && (
        <PromptEditor config={config} onClose={() => setConfigOpen(false)} onSaved={() => { setConfigOpen(false); load(); }} />
      )}
    </div>
  );
}

function Kpi({ label, value, color }) {
  const cmap = {
    indigo: "bg-indigo-50 text-indigo-700",
    emerald: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    teal: "bg-teal-50 text-teal-700",
    slate: "bg-slate-50 text-slate-700",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-sm p-3">
      <span className={`inline-block w-fit px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wide ${cmap[color] || cmap.slate}`}>{label}</span>
      <div className="text-2xl font-black text-slate-900 mt-1" style={{ fontFamily: "Chivo" }}>{typeof value === "number" ? value.toLocaleString() : value}</div>
    </div>
  );
}

function intentToColor(intent) {
  return { PRICING: "amber", BULK_QUOTE: "red", MEETING: "indigo", PRODUCT_SPEC: "teal",
           CATALOG_REQUEST: "violet", SPAM: "slate", IRRELEVANT: "slate", GENERAL: "emerald" }[intent] || "slate";
}

function CorrectionModal({ row, onClose, onSave }) {
  const [text, setText] = useState(row.corrected_reply || row.reply || "");
  const [note, setNote] = useState(row.correction_note || "");
  return (
    <div className="fixed inset-0 z-50 flex" data-testid="ai-correction-modal">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <form onSubmit={(e) => { e.preventDefault(); onSave(row, text, note); }} className="w-full max-w-xl bg-white shadow-xl p-5 space-y-3 overflow-y-auto">
        <h2 className="font-bold text-slate-900" style={{ fontFamily: "Chivo" }}>Correct this AI reply</h2>
        <div className="p-2 bg-slate-50 text-xs border border-slate-200 rounded-sm">
          <b>Inbound:</b> {row.inbound}<br />
          <b>Original AI reply:</b><br />
          <pre className="whitespace-pre-wrap font-mono mt-1">{row.reply}</pre>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide font-bold text-slate-600 mb-1 block">Corrected reply</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm font-mono" data-testid="correction-reply" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide font-bold text-slate-600 mb-1 block">Why was it wrong?</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm" placeholder="e.g. didn't attach brochure, wrong product" data-testid="correction-note" />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-sm text-sm font-bold hover:bg-indigo-700" data-testid="save-correction">
            <Save size={14} className="inline mr-1" /> Save correction
          </button>
          <button type="button" onClick={onClose} className="py-2 px-4 border border-slate-200 rounded-sm text-sm">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function PromptEditor({ config, onClose, onSaved }) {
  const [prompt, setPrompt] = useState(config.system_prompt || config.default_prompt || "");
  const [booking, setBooking] = useState(config.booking_url || "");
  const [sales, setSales] = useState(config.sales_whatsapp || "");
  const [saving, setSaving] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/api/admin/ai/config", {
        system_prompt: prompt, booking_url: booking, sales_whatsapp: sales,
      });
      toast.success("Saved — AI now uses the new prompt instantly");
      onSaved();
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };
  const resetDefault = () => {
    if (window.confirm("Reset to factory default prompt?")) setPrompt(config.default_prompt);
  };
  return (
    <div className="fixed inset-0 z-50 flex" data-testid="ai-prompt-editor">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <form onSubmit={save} className="w-full max-w-2xl bg-white shadow-xl p-5 space-y-3 overflow-y-auto">
        <h2 className="font-bold text-slate-900 text-lg" style={{ fontFamily: "Chivo" }}>AI System Prompt & Config</h2>
        <p className="text-xs text-slate-500">Edits apply instantly to every incoming message. You can always reset to default.</p>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs uppercase tracking-wide font-bold text-slate-600">System prompt</label>
            <button type="button" onClick={resetDefault} className="text-xs text-indigo-600 hover:underline">Reset to default</button>
          </div>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={20} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-xs font-mono" data-testid="ai-prompt-textarea" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wide font-bold text-slate-600 mb-1 block">Meeting booking URL</label>
            <input value={booking} onChange={(e) => setBooking(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm" placeholder="https://cal.com/..." data-testid="ai-booking-url" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide font-bold text-slate-600 mb-1 block">Sales WhatsApp (hot alerts)</label>
            <input value={sales} onChange={(e) => setSales(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm" placeholder="917416..." data-testid="ai-sales-number" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={saving} className="flex-1 py-2 bg-indigo-600 text-white rounded-sm text-sm font-bold hover:bg-indigo-700 disabled:opacity-50" data-testid="save-ai-config">
            {saving ? "Saving..." : "Save & apply"}
          </button>
          <button type="button" onClick={onClose} className="py-2 px-4 border border-slate-200 rounded-sm text-sm">Cancel</button>
        </div>
      </form>
    </div>
  );
}
