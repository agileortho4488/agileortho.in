import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, Users, CheckCircle2, AlertCircle, ArrowLeft, Send, Loader2, Download } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function getToken() {
  return localStorage.getItem("oc_admin_token");
}

export default function AdminBulkImport() {
  const navigate = useNavigate();
  const api = apiClient();
  
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState(null);
  const [unclaimedList, setUnclaimedList] = useState([]);
  
  // Import form
  const [csvText, setCsvText] = useState("");
  const [sendSms, setSendSms] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Check auth
  useEffect(() => {
    if (!getToken()) {
      navigate("/admin");
    }
  }, [navigate]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const res = await api.get("/admin/surgeons/stats/unclaimed", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setStats(res.data);
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  }, [api]);

  // Load unclaimed profiles
  const loadUnclaimed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/surgeons/unclaimed?limit=50", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setUnclaimedList(res.data.surgeons || []);
    } catch (e) {
      console.error("Failed to load unclaimed:", e);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadStats();
    loadUnclaimed();
  }, [loadStats, loadUnclaimed]);

  // Parse CSV text to contacts
  function parseCSV(text) {
    const lines = text.trim().split("\n");
    const contacts = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Skip header row if detected
      if (i === 0 && (line.toLowerCase().includes("name") || line.toLowerCase().includes("mobile"))) {
        continue;
      }
      
      const parts = line.split(/[,\t]/).map(p => p.trim().replace(/^["']|["']$/g, ""));
      
      if (parts.length >= 2) {
        const contact = {
          name: parts[0] || "",
          mobile: parts[1] || "",
          email: parts[2] || "",
          city: parts[3] || "",
          hospital: parts[4] || "",
          qualifications: parts[5] || "",
          subspecialty: parts[6] || "",
        };
        
        // Validate mobile
        const cleanMobile = contact.mobile.replace(/\D/g, "").slice(-10);
        if (cleanMobile.length === 10) {
          contact.mobile = cleanMobile;
          contacts.push(contact);
        }
      }
    }
    
    return contacts;
  }

  // Handle file upload
  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target.result);
    };
    reader.readAsText(file);
  }

  // Handle import
  async function handleImport() {
    const contacts = parseCSV(csvText);
    
    if (contacts.length === 0) {
      toast.error("No valid contacts found", {
        description: "Please check your CSV format",
      });
      return;
    }
    
    setImporting(true);
    setImportResult(null);
    
    try {
      const res = await api.post("/admin/surgeons/bulk-import", {
        contacts,
        send_sms: sendSms,
        send_email: sendEmail,
      }, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      
      setImportResult(res.data);
      
      toast.success("Import Complete!", {
        description: `Imported ${res.data.imported} surgeons`,
      });
      
      // Reload data
      loadStats();
      loadUnclaimed();
      
    } catch (e) {
      const msg = e?.response?.data?.detail || "Import failed";
      toast.error("Import Failed", { description: msg });
    } finally {
      setImporting(false);
    }
  }

  // Download CSV template
  function downloadTemplate() {
    const template = `Name,Mobile,Email,City,Hospital,Qualifications,Subspecialty
Dr. John Smith,9876543210,john@email.com,Hyderabad,Apollo Hospital,MBBS MS Ortho,Knee
Dr. Jane Doe,9123456789,jane@email.com,Vijayawada,KIMS,MBBS DNB Ortho,"Knee, Hip"`;
    
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orthoconnect_import_template.csv";
    a.click();
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Bulk Import Surgeons</h1>
          <p className="mt-1 text-slate-600">
            Import surgeon contacts and create unclaimed profiles for them to claim
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {stats?.total_unclaimed || 0}
                  </div>
                  <div className="text-sm text-slate-500">Unclaimed Profiles</div>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {stats?.claimed_this_week || 0}
                  </div>
                  <div className="text-sm text-slate-500">Claimed This Week</div>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {stats?.by_city?.length || 0}
                  </div>
                  <div className="text-sm text-slate-500">Cities Covered</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Import Form */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Import Contacts</h2>
              
              {/* CSV Format Info */}
              <div className="mb-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-700 mb-2">CSV Format:</div>
                <code className="text-xs text-slate-600 block bg-white p-2 rounded border">
                  Name, Mobile, Email, City, Hospital, Qualifications, Subspecialty
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="mt-3 h-8 rounded-full text-xs"
                >
                  <Download className="w-3 h-3 mr-1" /> Download Template
                </Button>
              </div>
              
              {/* File Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
              </div>
              
              {/* Or Paste */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Or Paste CSV Data
                </label>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Dr. John Smith,9876543210,john@email.com,Hyderabad..."
                  className="w-full h-32 rounded-xl border border-slate-200 p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <div className="mt-1 text-xs text-slate-500">
                  {parseCSV(csvText).length} valid contacts detected
                </div>
              </div>
              
              {/* Options */}
              <div className="mb-6 space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sendSms}
                    onChange={(e) => setSendSms(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-slate-700">Send SMS notification to imported contacts</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-slate-700">Send Email notification to imported contacts</span>
                </label>
              </div>
              
              {/* Import Button */}
              <Button
                onClick={handleImport}
                disabled={importing || parseCSV(csvText).length === 0}
                className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700"
              >
                {importing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import {parseCSV(csvText).length} Contacts
                  </>
                )}
              </Button>
              
              {/* Import Result */}
              {importResult && (
                <div className="mt-4 rounded-xl bg-teal-50 border border-teal-200 p-4">
                  <div className="flex items-center gap-2 text-teal-800 font-medium mb-2">
                    <CheckCircle2 className="w-4 h-4" /> Import Complete
                  </div>
                  <div className="text-sm text-teal-700 space-y-1">
                    <div>✅ Imported: {importResult.imported}</div>
                    <div>⏭️ Skipped (duplicates): {importResult.skipped}</div>
                    {importResult.errors?.length > 0 && (
                      <div className="text-amber-700">
                        ⚠️ Errors: {importResult.errors.slice(0, 3).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Unclaimed List */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Recent Unclaimed
              </h2>
              
              {/* City Distribution */}
              {stats?.by_city?.length > 0 && (
                <div className="mb-4 pb-4 border-b border-slate-100">
                  <div className="text-xs font-medium text-slate-500 mb-2">By City</div>
                  <div className="space-y-1">
                    {stats.by_city.slice(0, 5).map((c) => (
                      <div key={c.city} className="flex justify-between text-sm">
                        <span className="text-slate-600">{c.city}</span>
                        <span className="font-medium text-slate-900">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* List */}
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                </div>
              ) : unclaimedList.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">
                  No unclaimed profiles yet
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {unclaimedList.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <div className="font-medium text-slate-900 text-sm truncate">
                        {s.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {s.mobile?.slice(0, 2)}****{s.mobile?.slice(-4)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {s.locations?.[0]?.city || "Unknown city"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
