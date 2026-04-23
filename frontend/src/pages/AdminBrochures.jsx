import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Upload, FileDown, RefreshCw, CheckCircle2, AlertTriangle,
  FileText, Package, Loader2,
} from "lucide-react";
import api from "../lib/api";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminBrochures() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/api/admin/brochures/summary")
      .then((r) => setSummary(r.data))
      .catch(() => toast.error("Failed to load brochure coverage"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const downloadTemplate = () => {
    const token = localStorage.getItem("admin_token");
    fetch(`${API_URL}/api/admin/brochures/manifest-template`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "brochure_manifest_template.csv";
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error("Failed to download template"));
  };

  const handleUpload = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("Please upload a .zip file");
      return;
    }
    setUploading(true);
    setReport(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await api.post(
        "/api/admin/brochures/bulk-import",
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 300000,
        },
      );
      setReport(res.data);
      toast.success(
        `Updated ${res.data.products_updated} products from ${res.data.pdfs_uploaded} PDFs`,
      );
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Import failed");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleUpload(f);
  };

  return (
    <div className="p-8 space-y-6" data-testid="admin-brochures-page">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Brochures</h1>
          <p className="text-sm text-slate-500 mt-1">
            Bulk-upload product brochures via a single ZIP + manifest.csv.
          </p>
        </div>
        <button
          onClick={load}
          className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
          data-testid="brochures-refresh-btn"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </header>

      {/* Coverage summary */}
      <section className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total products"
          value={summary?.total_products ?? "—"}
          tone="neutral"
        />
        <StatCard
          label="With brochure"
          value={summary?.with_brochure ?? "—"}
          tone="emerald"
        />
        <StatCard
          label="Missing"
          value={summary?.missing ?? "—"}
          tone="amber"
        />
        <StatCard
          label="Coverage"
          value={summary ? `${Math.round(100 * summary.with_brochure / (summary.total_products || 1))}%` : "—"}
          tone="blue"
        />
      </section>

      {/* Upload zone */}
      <section className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">
            Upload ZIP (PDFs + manifest.csv)
          </h2>
          <button
            onClick={downloadTemplate}
            className="text-sm text-[#2DD4BF] hover:text-[#14B8A6] inline-flex items-center gap-1 font-medium"
            data-testid="download-manifest-template-btn"
          >
            <FileDown size={14} /> Download manifest template
          </button>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
            dragOver ? "border-[#2DD4BF] bg-teal-50/50" : "border-slate-300 bg-slate-50/40"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          data-testid="brochure-drop-zone"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-slate-600">
              <Loader2 className="animate-spin" size={28} />
              <p>Uploading and applying manifest...</p>
              <p className="text-xs text-slate-400">Large ZIPs can take 1–2 minutes</p>
            </div>
          ) : (
            <>
              <Upload size={36} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm text-slate-600">
                Drag & drop a ZIP here, or{" "}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[#2DD4BF] font-medium hover:underline"
                  data-testid="browse-zip-btn"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-slate-400 mt-2">
                ZIP must contain <code className="bg-slate-100 px-1 rounded">manifest.csv</code> at root + all referenced PDFs.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files?.[0])}
                data-testid="brochure-file-input"
              />
            </>
          )}
        </div>

        {/* Manifest help */}
        <details className="mt-4 text-sm text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-700">
            Manifest format & examples
          </summary>
          <div className="mt-3 space-y-2">
            <p>
              <code className="bg-slate-100 px-1 rounded">manifest.csv</code> columns:{" "}
              <code className="bg-slate-100 px-1 rounded">filename, scope_type, scope_value</code>
            </p>
            <p>
              <strong>scope_type</strong> must be one of:{" "}
              <code className="bg-slate-100 px-1 rounded">product_slug</code>,{" "}
              <code className="bg-slate-100 px-1 rounded">product_family</code>,{" "}
              <code className="bg-slate-100 px-1 rounded">division</code>.
            </p>
            <pre className="bg-slate-900 text-slate-100 rounded p-3 text-xs overflow-x-auto">
{`filename,scope_type,scope_value
freedom-knee.pdf,product_family,Freedom Knee
daapro.pdf,product_family,DAAPRO
all-diagnostics.pdf,division,Diagnostics
biomime-dcb.pdf,product_slug,biomime-dcb`}
            </pre>
            <p className="text-xs text-slate-500">
              Tip: <code>division</code> and <code>product_family</code> scopes
              only attach to products that don't already have a brochure.
              Use <code>product_slug</code> to override a specific product.
            </p>
          </div>
        </details>
      </section>

      {/* Per-division coverage */}
      <section className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-slate-800">Coverage by division</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-6 py-2 font-medium">Division</th>
                <th className="text-right px-6 py-2 font-medium">Total</th>
                <th className="text-right px-6 py-2 font-medium">With brochure</th>
                <th className="text-right px-6 py-2 font-medium">Missing</th>
                <th className="text-left px-6 py-2 font-medium">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.by_division || []).map((d) => (
                <tr key={d.division} className="border-t hover:bg-slate-50">
                  <td className="px-6 py-2 text-slate-800">{d.division}</td>
                  <td className="px-6 py-2 text-right text-slate-700">{d.total}</td>
                  <td className="px-6 py-2 text-right text-emerald-700">{d.with_brochure}</td>
                  <td className={`px-6 py-2 text-right ${d.missing > 0 ? "text-amber-700" : "text-slate-400"}`}>
                    {d.missing}
                  </td>
                  <td className="px-6 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-1.5 bg-slate-200 rounded">
                        <div
                          className={`h-1.5 rounded ${d.percent === 100 ? "bg-emerald-500" : d.percent > 0 ? "bg-amber-400" : "bg-slate-300"}`}
                          style={{ width: `${d.percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-10 text-right">{d.percent}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Import report */}
      {report && (
        <section className="bg-white border rounded-xl shadow-sm" data-testid="brochure-import-report">
          <div className="px-6 py-4 border-b flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-800">Import report</h2>
          </div>
          <div className="p-6 grid grid-cols-4 gap-4 text-sm">
            <Stat label="PDFs in ZIP" value={report.pdfs_in_zip} icon={FileText} />
            <Stat label="PDFs uploaded" value={report.pdfs_uploaded} icon={Upload} />
            <Stat label="Manifest rows" value={report.manifest_rows} icon={FileText} />
            <Stat label="Products updated" value={report.products_updated} icon={Package} />
          </div>
          {report.manifest_report?.length > 0 && (
            <div className="px-6 pb-6 max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Row</th>
                    <th className="text-left px-3 py-2 font-medium">File</th>
                    <th className="text-left px-3 py-2 font-medium">Scope</th>
                    <th className="text-right px-3 py-2 font-medium">Matched</th>
                    <th className="text-right px-3 py-2 font-medium">Updated</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.manifest_report.map((r) => (
                    <tr key={r.row} className="border-t">
                      <td className="px-3 py-1.5 text-slate-500">{r.row}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-700">{r.filename}</td>
                      <td className="px-3 py-1.5 text-slate-600">
                        {r.scope_type ? `${r.scope_type}: ${r.scope_value}` : "—"}
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-700">{r.matched ?? "—"}</td>
                      <td className="px-3 py-1.5 text-right text-emerald-700">{r.updated ?? "—"}</td>
                      <td className="px-3 py-1.5">
                        {r.ok ? (
                          <span className="text-emerald-700 inline-flex items-center gap-1">
                            <CheckCircle2 size={12} /> ok
                          </span>
                        ) : (
                          <span className="text-red-700 inline-flex items-center gap-1">
                            <AlertTriangle size={12} /> {r.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const tones = {
    neutral: "bg-white border-slate-200 text-slate-900",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    blue: "bg-sky-50 border-sky-200 text-sky-900",
  };
  return (
    <div className={`border rounded-xl p-5 shadow-sm ${tones[tone]}`}>
      <div className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
        <Icon size={18} className="text-slate-500" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-xl font-semibold text-slate-800">{value}</div>
      </div>
    </div>
  );
}
