import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  Search, Globe, MapPin, Users, Download, Upload, RefreshCw, 
  CheckCircle, AlertCircle, ArrowLeft, Building, Phone, Mail,
  Loader2, ExternalLink, Filter, Database
} from "lucide-react";
import { apiClient, getToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STATES = [
  { value: "telangana", label: "Telangana" },
  { value: "andhra_pradesh", label: "Andhra Pradesh" },
];

const CITIES = {
  telangana: ["Hyderabad", "Secunderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam"],
  andhra_pradesh: ["Vijayawada", "Visakhapatnam", "Guntur", "Nellore", "Kurnool", "Tirupati", "Rajahmundry", "Kakinada", "Anantapur"],
};

const SOURCES = [
  { id: "google_maps", name: "Google Maps", icon: Globe, color: "bg-blue-100 text-blue-700" },
  { id: "practo", name: "Practo", icon: Building, color: "bg-violet-100 text-violet-700" },
  { id: "justdial", name: "JustDial", icon: Search, color: "bg-amber-100 text-amber-700" },
  { id: "nmc", name: "NMC Registry", icon: Database, color: "bg-emerald-100 text-emerald-700" },
];

function DiscoveredSurgeonCard({ surgeon, onImport, importing }) {
  const isImported = surgeon.status === "imported";
  const isMatched = surgeon.status === "matched";
  
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 truncate">{surgeon.name}</h3>
            {isMatched && (
              <Badge className="bg-teal-100 text-teal-700 text-xs">Matched</Badge>
            )}
            {isImported && (
              <Badge className="bg-emerald-100 text-emerald-700 text-xs">Imported</Badge>
            )}
          </div>
          
          {surgeon.qualifications && (
            <p className="text-sm text-slate-500 mt-0.5">{surgeon.qualifications}</p>
          )}
          
          <div className="mt-2 space-y-1">
            {surgeon.hospital && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Building className="w-3.5 h-3.5" />
                <span className="truncate">{surgeon.hospital}</span>
              </div>
            )}
            {surgeon.city && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <MapPin className="w-3.5 h-3.5" />
                <span>{surgeon.city}</span>
              </div>
            )}
            {surgeon.phone && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Phone className="w-3.5 h-3.5" />
                <span>{surgeon.phone}</span>
              </div>
            )}
            {surgeon.email && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{surgeon.email}</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1 mt-2">
            {surgeon.source && (
              <Badge className="bg-slate-100 text-slate-600 text-xs">{surgeon.source}</Badge>
            )}
            {surgeon.subspecialty && (
              <Badge className="bg-teal-50 text-teal-700 text-xs">{surgeon.subspecialty}</Badge>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          {!isImported && !isMatched && (
            <Button
              size="sm"
              onClick={() => onImport(surgeon)}
              disabled={importing}
              className="h-8 rounded-full bg-teal-600 hover:bg-teal-700 text-xs"
            >
              {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Import"}
            </Button>
          )}
          {surgeon.profile_url && (
            <a
              href={surgeon.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-3 inline-flex items-center justify-center rounded-full border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
            >
              <ExternalLink className="w-3 h-3 mr-1" /> View
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminSurgeonDiscovery() {
  const api = useMemo(() => apiClient(), []);
  const token = getToken("admin");
  
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(null);
  
  const [selectedState, setSelectedState] = useState("telangana");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedSources, setSelectedSources] = useState(["google_maps", "practo"]);
  const [searchQuery, setSearchQuery] = useState("orthopaedic surgeon");
  
  const [discoveredSurgeons, setDiscoveredSurgeons] = useState([]);
  const [stats, setStats] = useState({ total: 0, imported: 0, matched: 0, new: 0, serpapi_configured: false });
  const [searchHistory, setSearchHistory] = useState([]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get("/admin/discovery/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  }, [api, token]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get("/admin/discovery/history?limit=10", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchHistory(res.data || []);
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  }, [api, token]);

  useEffect(() => {
    loadStats();
    loadHistory();
  }, [loadStats, loadHistory]);

  async function handleSearch() {
    if (!selectedCity) {
      toast.error("Please select a city");
      return;
    }
    
    setSearching(true);
    setDiscoveredSurgeons([]);
    
    try {
      const res = await api.post("/admin/discovery/search", {
        state: selectedState,
        city: selectedCity,
        sources: selectedSources,
        query: searchQuery,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDiscoveredSurgeons(res.data.results || []);
      toast.success(`Found ${res.data.results?.length || 0} surgeons`);
      loadStats();
      loadHistory();
    } catch (e) {
      const msg = e?.response?.data?.detail || "Search failed";
      toast.error(msg);
    } finally {
      setSearching(false);
    }
  }

  async function handleImportSingle(surgeon) {
    setImporting(surgeon.id || surgeon.name);
    
    try {
      await api.post("/admin/discovery/import", {
        surgeons: [surgeon]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setDiscoveredSurgeons(prev => prev.map(s => 
        (s.id || s.name) === (surgeon.id || surgeon.name) 
          ? { ...s, status: "imported" } 
          : s
      ));
      
      toast.success(`Imported ${surgeon.name}`);
      loadStats();
    } catch (e) {
      toast.error("Import failed");
    } finally {
      setImporting(null);
    }
  }

  async function handleImportAll() {
    const newSurgeons = discoveredSurgeons.filter(s => s.status !== "imported" && s.status !== "matched");
    
    if (newSurgeons.length === 0) {
      toast.error("No new surgeons to import");
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await api.post("/admin/discovery/import", {
        surgeons: newSurgeons
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDiscoveredSurgeons(prev => prev.map(s => 
        newSurgeons.some(ns => (ns.id || ns.name) === (s.id || s.name))
          ? { ...s, status: "imported" }
          : s
      ));
      
      toast.success(`Imported ${res.data.imported} surgeons`);
      loadStats();
    } catch (e) {
      toast.error("Bulk import failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleExportCSV() {
    if (discoveredSurgeons.length === 0) {
      toast.error("No surgeons to export");
      return;
    }
    
    const headers = ["Name", "Qualifications", "Hospital", "City", "Phone", "Email", "Subspecialty", "Source", "Status"];
    const rows = discoveredSurgeons.map(s => [
      s.name || "",
      s.qualifications || "",
      s.hospital || "",
      s.city || "",
      s.phone || "",
      s.email || "",
      s.subspecialty || "",
      s.source || "",
      s.status || "new",
    ]);
    
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `discovered_surgeons_${selectedCity}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const toggleSource = (sourceId) => {
    setSelectedSources(prev => 
      prev.includes(sourceId) 
        ? prev.filter(s => s !== sourceId)
        : [...prev, sourceId]
    );
  };

  const newCount = discoveredSurgeons.filter(s => s.status !== "imported" && s.status !== "matched").length;

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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Surgeon Discovery</h1>
            {stats.serpapi_configured ? (
              <Badge className="bg-emerald-100 text-emerald-700 text-xs">SerpAPI Active</Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 text-xs">Basic Mode</Badge>
            )}
          </div>
          <p className="mt-1 text-slate-600">
            Search and import orthopaedic surgeons from multiple sources
          </p>
          {!stats.serpapi_configured && (
            <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <strong>Tip:</strong> Add SERPAPI_KEY to backend/.env for enhanced search results from Google Maps, Practo & JustDial.
              <a href="https://serpapi.com" target="_blank" rel="noopener noreferrer" className="ml-1 text-amber-900 underline">
                Get API Key
              </a>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-sm text-slate-500">Total Discovered</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-bold text-emerald-600">{stats.imported}</div>
            <div className="text-sm text-slate-500">Imported</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-bold text-teal-600">{stats.matched}</div>
            <div className="text-sm text-slate-500">Matched Existing</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.new}</div>
            <div className="text-sm text-slate-500">Pending Review</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Panel */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Search Settings</h2>
              
              {/* State */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
                <select
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setSelectedCity("");
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm"
                >
                  {STATES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              
              {/* City */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm"
                >
                  <option value="">Select city...</option>
                  {CITIES[selectedState]?.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              
              {/* Search Query */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Search Query</label>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="orthopaedic surgeon"
                  className="h-10 rounded-xl"
                />
              </div>
              
              {/* Sources */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Sources</label>
                <div className="space-y-2">
                  {SOURCES.map(source => (
                    <button
                      key={source.id}
                      onClick={() => toggleSource(source.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selectedSources.includes(source.id)
                          ? "border-teal-300 bg-teal-50 text-teal-800"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <source.icon className="w-4 h-4" />
                      {source.name}
                      {selectedSources.includes(source.id) && (
                        <CheckCircle className="w-4 h-4 ml-auto text-teal-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              <Button
                onClick={handleSearch}
                disabled={searching || !selectedCity}
                className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700"
              >
                {searching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search Surgeons
                  </>
                )}
              </Button>
              
              {/* Recent Searches */}
              {searchHistory.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Recent Searches</h3>
                  <div className="space-y-2">
                    {searchHistory.slice(0, 5).map((h, i) => (
                      <div key={i} className="text-xs text-slate-500 flex items-center justify-between">
                        <span>{h.city} ({h.found} found)</span>
                        <span className="text-slate-400">{new Date(h.searched_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            {/* Actions */}
            {discoveredSurgeons.length > 0 && (
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-600">
                  Found <span className="font-semibold">{discoveredSurgeons.length}</span> surgeons
                  {newCount > 0 && <span className="text-teal-600 ml-1">({newCount} new)</span>}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    className="h-9 rounded-full"
                  >
                    <Download className="w-4 h-4 mr-1" /> Export CSV
                  </Button>
                  {newCount > 0 && (
                    <Button
                      size="sm"
                      onClick={handleImportAll}
                      disabled={loading}
                      className="h-9 rounded-full bg-teal-600 hover:bg-teal-700"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-1" /> Import All ({newCount})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Results List */}
            {searching ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <div className="h-5 w-48 bg-slate-200 rounded mb-2" />
                        <div className="h-4 w-32 bg-slate-100 rounded mb-3" />
                        <div className="h-3 w-64 bg-slate-100 rounded" />
                      </div>
                      <div className="h-8 w-20 bg-slate-200 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : discoveredSurgeons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700">No Results Yet</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Select a city and click &quot;Search Surgeons&quot; to discover orthopaedic surgeons from multiple sources.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {discoveredSurgeons.map((surgeon, index) => (
                  <DiscoveredSurgeonCard
                    key={surgeon.id || index}
                    surgeon={surgeon}
                    onImport={handleImportSingle}
                    importing={importing === (surgeon.id || surgeon.name)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
