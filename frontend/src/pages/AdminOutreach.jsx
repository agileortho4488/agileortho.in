import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Upload, Mail, MessageCircle, Users, TrendingUp, 
  Send, Trash2, Download, Plus, Search, Filter,
  CheckCircle, Clock, Eye, MousePointer, UserCheck, XCircle,
  ArrowLeft, RefreshCw
} from "lucide-react";
import { apiClient, getToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";

export default function AdminOutreach() {
  const api = useMemo(() => apiClient(), []);
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sending, setSending] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [newContact, setNewContact] = useState({
    name: "", email: "", mobile: "", city: "", subspecialty: "", clinic_name: "", notes: ""
  });

  const token = getToken("admin");

  async function loadData() {
    setLoading(true);
    try {
      const [contactsRes, statsRes] = await Promise.all([
        api.get("/admin/outreach/contacts", { headers: { Authorization: `Bearer ${token}` } }),
        api.get("/admin/outreach/stats", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setContacts(contactsRes.data || []);
      setStats(statsRes.data);
    } catch (e) {
      toast.error("Failed to load outreach data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = !searchQuery || 
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.city?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contacts, searchQuery, statusFilter]);

  async function handleImportCSV() {
    if (!csvData.trim()) return;
    
    try {
      // Parse CSV
      const lines = csvData.trim().split("\n");
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      
      const contactsList = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        const contact = {};
        headers.forEach((h, idx) => {
          contact[h] = values[idx] || "";
        });
        if (contact.email) {
          contactsList.push(contact);
        }
      }
      
      const res = await api.post("/admin/outreach/contacts/import", 
        { contacts: contactsList },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Imported ${res.data.imported} contacts (${res.data.duplicates} duplicates skipped)`);
      setShowImportModal(false);
      setCsvData("");
      loadData();
    } catch (e) {
      toast.error("Failed to import contacts");
    }
  }

  async function handleAddContact() {
    if (!newContact.email) {
      toast.error("Email is required");
      return;
    }
    
    try {
      const params = new URLSearchParams(newContact);
      await api.post(`/admin/outreach/contacts?${params}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Contact added");
      setShowAddModal(false);
      setNewContact({ name: "", email: "", mobile: "", city: "", subspecialty: "", clinic_name: "", notes: "" });
      loadData();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to add contact");
    }
  }

  async function handleSendEmails(templateType = "invitation") {
    if (selectedIds.size === 0) {
      toast.error("Select contacts first");
      return;
    }
    
    setSending(true);
    try {
      const res = await api.post("/admin/outreach/send",
        { contact_ids: Array.from(selectedIds), template_type: templateType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Sent ${res.data.sent} emails (${res.data.failed} failed)`);
      setSelectedIds(new Set());
      loadData();
    } catch (e) {
      toast.error("Failed to send emails");
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteContact(id) {
    if (!confirm("Delete this contact?")) return;
    
    try {
      await api.delete(`/admin/outreach/contacts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Contact deleted");
      loadData();
    } catch (e) {
      toast.error("Failed to delete contact");
    }
  }

  async function openWhatsApp(contactId) {
    try {
      const res = await api.get(`/admin/outreach/whatsapp/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.open(res.data.whatsapp_url, "_blank");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to generate WhatsApp link");
    }
  }

  function toggleSelect(id) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  function selectAll() {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map(c => c.id)));
    }
  }

  const statusConfig = {
    new: { label: "New", color: "bg-slate-100 text-slate-700", icon: Clock },
    invited: { label: "Invited", color: "bg-blue-100 text-blue-700", icon: Mail },
    opened: { label: "Opened", color: "bg-amber-100 text-amber-700", icon: Eye },
    clicked: { label: "Clicked", color: "bg-violet-100 text-violet-700", icon: MousePointer },
    signed_up: { label: "Signed Up", color: "bg-emerald-100 text-emerald-700", icon: UserCheck },
    unsubscribed: { label: "Unsubscribed", color: "bg-red-100 text-red-700", icon: XCircle },
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link to="/admin/dashboard" className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
                Outreach & Marketing
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage surgeon contacts and email campaigns
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowImportModal(true)}
              className="rounded-full border-slate-200"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddModal(true)}
              className="rounded-full border-slate-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`${api.defaults.baseURL}/admin/outreach/export?token=${token}`, "_blank")}
              className="rounded-full border-slate-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <Card className="p-4 bg-slate-50 border-slate-200">
              <div className="text-2xl font-bold text-slate-900">{stats.total_contacts}</div>
              <div className="text-xs text-slate-500">Total Contacts</div>
            </Card>
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="text-2xl font-bold text-blue-700">{stats.by_status.invited}</div>
              <div className="text-xs text-blue-600">Invited</div>
            </Card>
            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="text-2xl font-bold text-amber-700">{stats.by_status.opened}</div>
              <div className="text-xs text-amber-600">Opened</div>
            </Card>
            <Card className="p-4 bg-violet-50 border-violet-200">
              <div className="text-2xl font-bold text-violet-700">{stats.by_status.clicked}</div>
              <div className="text-xs text-violet-600">Clicked</div>
            </Card>
            <Card className="p-4 bg-emerald-50 border-emerald-200">
              <div className="text-2xl font-bold text-emerald-700">{stats.by_status.signed_up}</div>
              <div className="text-xs text-emerald-600">Signed Up</div>
            </Card>
            <Card className="p-4 bg-teal-50 border-teal-200">
              <div className="text-2xl font-bold text-teal-700">{stats.rates.open_rate}%</div>
              <div className="text-xs text-teal-600">Open Rate</div>
            </Card>
            <Card className="p-4 bg-cyan-50 border-cyan-200">
              <div className="text-2xl font-bold text-cyan-700">{stats.rates.conversion_rate}%</div>
              <div className="text-xs text-cyan-600">Conversion</div>
            </Card>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, city..."
              className="pl-10 rounded-full border-slate-200 bg-white"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-4 rounded-full border border-slate-200 bg-white text-sm"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="invited">Invited</option>
            <option value="opened">Opened</option>
            <option value="clicked">Clicked</option>
            <option value="signed_up">Signed Up</option>
          </select>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">{selectedIds.size} selected</span>
              <Button
                onClick={() => handleSendEmails("invitation")}
                disabled={sending}
                className="rounded-full bg-teal-600 hover:bg-teal-700"
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Sending..." : "Send Invitation"}
              </Button>
              <select
                onChange={(e) => e.target.value && handleSendEmails(e.target.value)}
                className="h-10 px-3 rounded-full border border-slate-200 bg-white text-sm"
                defaultValue=""
              >
                <option value="" disabled>More templates...</option>
                <option value="followup_1">Follow-up 1</option>
                <option value="followup_2">Follow-up 2</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>
          )}

          <Button
            variant="ghost"
            onClick={loadData}
            className="rounded-full"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Contacts Table */}
        <Card className="overflow-hidden border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredContacts.length && filteredContacts.length > 0}
                      onChange={selectAll}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="p-3 text-left font-medium text-slate-600">Name</th>
                  <th className="p-3 text-left font-medium text-slate-600">Email</th>
                  <th className="p-3 text-left font-medium text-slate-600">Mobile</th>
                  <th className="p-3 text-left font-medium text-slate-600">City</th>
                  <th className="p-3 text-left font-medium text-slate-600">Status</th>
                  <th className="p-3 text-left font-medium text-slate-600">Emails Sent</th>
                  <th className="p-3 text-left font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No contacts found. Import a CSV or add contacts manually.
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => {
                    const statusCfg = statusConfig[contact.status] || statusConfig.new;
                    const StatusIcon = statusCfg.icon;
                    
                    return (
                      <tr key={contact.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(contact.id)}
                            onChange={() => toggleSelect(contact.id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="p-3 font-medium text-slate-900">{contact.name || "—"}</td>
                        <td className="p-3 text-slate-600">{contact.email}</td>
                        <td className="p-3 text-slate-600">{contact.mobile || "—"}</td>
                        <td className="p-3 text-slate-600">{contact.city || "—"}</td>
                        <td className="p-3">
                          <Badge className={`${statusCfg.color} gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusCfg.label}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-600">{contact.emails_sent || 0}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {contact.mobile && (
                              <button
                                onClick={() => openWhatsApp(contact.id)}
                                className="p-2 rounded-lg hover:bg-green-100 text-green-600"
                                title="WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteContact(contact.id)}
                              className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 w-full max-w-lg"
            >
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Import Contacts from CSV</h2>
              <p className="text-sm text-slate-500 mb-4">
                Paste your CSV data below. Required columns: <code className="bg-slate-100 px-1 rounded">email</code>. 
                Optional: <code className="bg-slate-100 px-1 rounded">name</code>, <code className="bg-slate-100 px-1 rounded">mobile</code>, 
                <code className="bg-slate-100 px-1 rounded">city</code>, <code className="bg-slate-100 px-1 rounded">subspecialty</code>, 
                <code className="bg-slate-100 px-1 rounded">clinic_name</code>
              </p>
              <textarea
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                placeholder="name,email,mobile,city,subspecialty
Dr. John Doe,john@example.com,9876543210,Mumbai,Knee"
                className="w-full h-48 p-3 border border-slate-200 rounded-xl text-sm font-mono resize-none"
              />
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="ghost" onClick={() => setShowImportModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImportCSV} className="bg-teal-600 hover:bg-teal-700">
                  Import
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Add Contact Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 w-full max-w-lg"
            >
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Add Contact</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    placeholder="Name"
                    className="rounded-xl border-slate-200"
                  />
                  <Input
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    placeholder="Email *"
                    type="email"
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    value={newContact.mobile}
                    onChange={(e) => setNewContact({ ...newContact, mobile: e.target.value })}
                    placeholder="Mobile"
                    className="rounded-xl border-slate-200"
                  />
                  <Input
                    value={newContact.city}
                    onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
                    placeholder="City"
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    value={newContact.subspecialty}
                    onChange={(e) => setNewContact({ ...newContact, subspecialty: e.target.value })}
                    placeholder="Subspecialty"
                    className="rounded-xl border-slate-200"
                  />
                  <Input
                    value={newContact.clinic_name}
                    onChange={(e) => setNewContact({ ...newContact, clinic_name: e.target.value })}
                    placeholder="Clinic Name"
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <Input
                  value={newContact.notes}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                  placeholder="Notes"
                  className="rounded-xl border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddContact} className="bg-teal-600 hover:bg-teal-700">
                  Add Contact
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </section>
    </main>
  );
}
