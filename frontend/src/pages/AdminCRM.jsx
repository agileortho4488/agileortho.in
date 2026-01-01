import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, UserPlus, Search, Filter, Tag, MessageCircle, Mail, Phone,
  ArrowLeft, RefreshCw, Upload, Download, MoreVertical, Send,
  CheckCircle, Clock, Star, UserCheck, AlertCircle, XCircle,
  Building, MapPin, Stethoscope, Calendar, Activity, Zap,
  MessageSquare, Megaphone
} from "lucide-react";
import { apiClient, getToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";

const STATUS_CONFIG = {
  lead: { label: "Lead", color: "bg-slate-100 text-slate-700", icon: Clock },
  contacted: { label: "Contacted", color: "bg-blue-100 text-blue-700", icon: MessageCircle },
  interested: { label: "Interested", color: "bg-amber-100 text-amber-700", icon: Star },
  registered: { label: "Registered", color: "bg-violet-100 text-violet-700", icon: UserCheck },
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  inactive: { label: "Inactive", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function AdminCRM() {
  const api = useMemo(() => apiClient(), []);
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [zohoConnected, setZohoConnected] = useState(null);
  const [syncing, setSyncing] = useState(false);
  
  const [newContact, setNewContact] = useState({
    name: "", mobile: "", email: "", city: "", subspecialty: "", clinic_name: "", tags: "", notes: ""
  });
  
  const [broadcast, setBroadcast] = useState({
    channel: "email",
    message_type: "general",
    subject: "",
    message: "",
  });

  const token = getToken("admin");

  async function loadData(tagOverride = null) {
    setLoading(true);
    try {
      const tag = tagOverride !== null ? tagOverride : tagFilter;
      // Limit to 500 contacts for performance, filter by tag if provided
      const params = new URLSearchParams();
      if (tag) params.set('tag', tag);
      params.set('limit', '500');
      
      const [contactsRes, statsRes] = await Promise.all([
        api.get(`/admin/crm/contacts?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } }),
        api.get("/admin/crm/stats", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setContacts(contactsRes.data || []);
      setStats(statsRes.data);
    } catch (e) {
      toast.error("Failed to load CRM data");
    } finally {
      setLoading(false);
    }
  }

  async function testZohoConnection() {
    try {
      const res = await api.get("/admin/zoho-campaigns/lists", { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.lists || res.data?.message) {
        setZohoConnected(true);
        toast.success("Zoho Campaigns connected!");
      } else {
        setZohoConnected(false);
        toast.error("Zoho Campaigns connection failed");
      }
    } catch (e) {
      setZohoConnected(false);
    }
  }

  useEffect(() => {
    loadData();
    testZohoConnection();
  }, []);

  // Reload when tag filter changes to important tags
  useEffect(() => {
    if (tagFilter === 'discovery' || tagFilter === 'unclaimed') {
      loadData(tagFilter);
    }
  }, [tagFilter]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = !searchQuery || 
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.mobile?.includes(searchQuery) ||
        c.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.hospital?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.source?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.crm_status === statusFilter || c.status === statusFilter;
      const matchesTag = !tagFilter || c.tags?.includes(tagFilter);
      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [contacts, searchQuery, statusFilter, tagFilter]);

  async function handleAddContact() {
    if (!newContact.name || !newContact.mobile) {
      toast.error("Name and mobile are required");
      return;
    }
    
    try {
      const params = new URLSearchParams(newContact);
      await api.post(`/admin/crm/contacts?${params}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Contact added to CRM");
      setShowAddModal(false);
      setNewContact({ name: "", mobile: "", email: "", city: "", subspecialty: "", clinic_name: "", tags: "", notes: "" });
      loadData();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to add contact");
    }
  }

  async function handleImportSurgeons() {
    try {
      const res = await api.post("/admin/crm/import-surgeons", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Imported ${res.data.imported} surgeons (${res.data.skipped} skipped)`);
      loadData();
    } catch (e) {
      toast.error("Failed to import surgeons");
    }
  }

  async function handleUpdateStatus(contactId, newStatus) {
    try {
      await api.patch(`/admin/crm/contacts/${contactId}?crm_status=${newStatus}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Status updated");
      loadData();
    } catch (e) {
      toast.error("Failed to update status");
    }
  }

  async function handleSyncToZoho(contactId) {
    try {
      // Sync single contact to Zoho Campaigns
      const contact = contacts.find(c => c.id === contactId);
      if (!contact?.email) {
        toast.error("Contact needs an email address");
        return;
      }
      
      const res = await api.post(`/admin/zoho-campaigns/add-contacts?sync_all=false`, {
        contact_ids: [contactId]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.ok || res.data.added > 0) {
        toast.success("Synced to Zoho Campaigns");
        loadData();
      } else {
        toast.error(res.data.error || "Sync failed");
      }
    } catch (e) {
      toast.error("Failed to sync to Zoho Campaigns");
    }
  }

  async function handleBulkSyncToZoho() {
    if (selectedIds.size === 0) {
      toast.error("Select contacts first");
      return;
    }
    
    setSyncing(true);
    try {
      const res = await api.post("/admin/zoho-campaigns/add-contacts?sync_all=false", 
        { contact_ids: Array.from(selectedIds) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Synced ${res.data.added || res.data.synced || 0} contacts to Zoho Campaigns`);
      setSelectedIds(new Set());
      loadData();
    } catch (e) {
      toast.error("Failed to bulk sync");
    } finally {
      setSyncing(false);
    }
  }

  async function openZohoWhatsApp(contactId) {
    try {
      const res = await api.get(`/admin/crm/zoho/whatsapp-url/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.ok) {
        // Open Zoho Desk contact page where they can send WhatsApp
        window.open(res.data.desk_url, "_blank");
        toast.success(`Opening Zoho Desk for ${res.data.contact_name}. Click "Send WhatsApp message" to send.`);
      } else {
        // Contact not synced, sync first
        toast.info("Syncing contact to Zoho Desk first...");
        await handleSyncToZoho(contactId);
      }
    } catch (e) {
      toast.error("Failed to get Zoho URL");
    }
  }

  async function handleSendBroadcast() {
    if (selectedIds.size === 0) {
      toast.error("Select contacts first");
      return;
    }
    if (!broadcast.message) {
      toast.error("Message is required");
      return;
    }
    
    try {
      const res = await api.post("/admin/crm/broadcast", {
        contact_ids: Array.from(selectedIds),
        ...broadcast,
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success(`Sent to ${res.data.sent} contacts (${res.data.failed} failed)`);
      setShowBroadcastModal(false);
      setBroadcast({ channel: "email", message_type: "general", subject: "", message: "" });
      setSelectedIds(new Set());
    } catch (e) {
      toast.error("Failed to send broadcast");
    }
  }

  async function getWhatsAppLinks() {
    if (selectedIds.size === 0) return;
    
    const message = broadcast.message || "Hello Dr. {name}, we have an update for you from OrthoConnect!";
    
    try {
      const res = await api.get(`/admin/crm/whatsapp-broadcast-links?contact_ids=${Array.from(selectedIds).join(",")}&message=${encodeURIComponent(message)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Open each link in sequence with a small delay
      for (const link of res.data.links) {
        window.open(link.whatsapp_url, "_blank");
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e) {
      toast.error("Failed to generate WhatsApp links");
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

  // Get unique tags for filter
  const allTags = useMemo(() => {
    const tags = new Set();
    contacts.forEach(c => c.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [contacts]);

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
                Surgeon CRM
              </h1>
              <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                Manage surgeon relationships & communication
                {zohoConnected !== null && (
                  <Badge className={zohoConnected ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                    {zohoConnected ? "Zoho Connected" : "Zoho Disconnected"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleImportSurgeons} className="rounded-full border-slate-200">
              <Upload className="h-4 w-4 mr-2" />
              Import Surgeons
            </Button>
            <Button variant="outline" onClick={() => setShowAddModal(true)} className="rounded-full border-slate-200">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card className="p-4 bg-slate-50 border-slate-200">
              <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
              <div className="text-xs text-slate-500">Total Contacts</div>
            </Card>
            {Object.entries(stats.by_status).map(([status, count]) => {
              const cfg = STATUS_CONFIG[status];
              return (
                <Card key={status} className={`p-4 ${cfg?.color?.replace('text-', 'border-').replace('100', '200')} border`}>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs opacity-80">{cfg?.label || status}</div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, mobile, email, city..."
              className="pl-10 rounded-full border-slate-200 bg-white"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-4 rounded-full border border-slate-200 bg-white text-sm"
          >
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="h-10 px-4 rounded-full border border-slate-200 bg-white text-sm"
          >
            <option value="">All Tags</option>
            <option value="discovery">🔍 Discovery Imports</option>
            <option value="unclaimed">📋 Unclaimed Profiles</option>
            {allTags.filter(t => t !== 'discovery' && t !== 'unclaimed').map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">{selectedIds.size} selected</span>
              <Button
                onClick={handleBulkSyncToZoho}
                disabled={syncing}
                className="rounded-full bg-violet-600 hover:bg-violet-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                {syncing ? "Syncing..." : "Sync to Zoho"}
              </Button>
              <Button
                onClick={() => setShowBroadcastModal(true)}
                className="rounded-full bg-teal-600 hover:bg-teal-700"
              >
                <Megaphone className="h-4 w-4 mr-2" />
                Broadcast
              </Button>
              <Button
                onClick={getWhatsAppLinks}
                variant="outline"
                className="rounded-full border-green-300 text-green-700 hover:bg-green-50"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp All
              </Button>
            </div>
          )}

          <Button variant="ghost" onClick={loadData} className="rounded-full">
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
                  <th className="p-3 text-left font-medium text-slate-600">Contact</th>
                  <th className="p-3 text-left font-medium text-slate-600">Location</th>
                  <th className="p-3 text-left font-medium text-slate-600">Status</th>
                  <th className="p-3 text-left font-medium text-slate-600">Tags</th>
                  <th className="p-3 text-left font-medium text-slate-600">Last Contact</th>
                  <th className="p-3 text-left font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No contacts found. Add contacts or import from registered surgeons.
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => {
                    const statusCfg = STATUS_CONFIG[contact.crm_status] || STATUS_CONFIG.lead;
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
                        <td className="p-3">
                          <div className="font-medium text-slate-900 flex items-center gap-2">
                            {contact.name}
                            {contact.surgeon_id && (
                              <Badge className="bg-emerald-100 text-emerald-700 text-xs">Registered</Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {contact.mobile && <span className="mr-3">📱 {contact.mobile}</span>}
                            {contact.email && <span>✉️ {contact.email}</span>}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-slate-600">{contact.city || "—"}</div>
                          {contact.subspecialty && (
                            <div className="text-xs text-slate-400">{contact.subspecialty}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <select
                            value={contact.crm_status}
                            onChange={(e) => handleUpdateStatus(contact.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full border-0 ${statusCfg.color}`}
                          >
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                              <option key={key} value={key}>{cfg.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {(contact.tags || []).slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                            {contact.tags?.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{contact.tags.length - 3}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-slate-500 text-xs">
                          {contact.last_contacted 
                            ? new Date(contact.last_contacted).toLocaleDateString()
                            : "Never"
                          }
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {contact.mobile && (
                              <button
                                onClick={() => {
                                  const mobile = contact.mobile.length === 10 ? "91" + contact.mobile : contact.mobile;
                                  window.open(`https://api.whatsapp.com/send?phone=${mobile}`, "_blank");
                                }}
                                className="p-2 rounded-lg hover:bg-green-100 text-green-600"
                                title="WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </button>
                            )}
                            {contact.email && (
                              <button
                                onClick={() => window.open(`mailto:${contact.email}`, "_blank")}
                                className="p-2 rounded-lg hover:bg-blue-100 text-blue-600"
                                title="Email"
                              >
                                <Mail className="h-4 w-4" />
                              </button>
                            )}
                            {contact.mobile && (
                              <button
                                onClick={() => window.open(`tel:${contact.mobile}`, "_blank")}
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                                title="Call"
                              >
                                <Phone className="h-4 w-4" />
                              </button>
                            )}
                            {zohoConnected && contact.zoho_contact_id && (
                              <button
                                onClick={() => openZohoWhatsApp(contact.id)}
                                className="p-2 rounded-lg hover:bg-green-100 text-green-700 border border-green-200"
                                title="Send WhatsApp via Zoho Desk"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            )}
                            {zohoConnected && !contact.zoho_contact_id && (
                              <button
                                onClick={() => handleSyncToZoho(contact.id)}
                                className="p-2 rounded-lg hover:bg-violet-100 text-violet-600"
                                title="Sync to Zoho"
                              >
                                <Zap className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedContact(contact)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                              title="View Details"
                            >
                              <Activity className="h-4 w-4" />
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

        {/* Add Contact Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Add CRM Contact</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      placeholder="Name *"
                      className="rounded-xl border-slate-200"
                    />
                    <Input
                      value={newContact.mobile}
                      onChange={(e) => setNewContact({ ...newContact, mobile: e.target.value })}
                      placeholder="Mobile *"
                      className="rounded-xl border-slate-200"
                    />
                  </div>
                  <Input
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    placeholder="Email"
                    type="email"
                    className="rounded-xl border-slate-200"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      value={newContact.city}
                      onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
                      placeholder="City"
                      className="rounded-xl border-slate-200"
                    />
                    <Input
                      value={newContact.subspecialty}
                      onChange={(e) => setNewContact({ ...newContact, subspecialty: e.target.value })}
                      placeholder="Subspecialty"
                      className="rounded-xl border-slate-200"
                    />
                  </div>
                  <Input
                    value={newContact.clinic_name}
                    onChange={(e) => setNewContact({ ...newContact, clinic_name: e.target.value })}
                    placeholder="Clinic Name"
                    className="rounded-xl border-slate-200"
                  />
                  <Input
                    value={newContact.tags}
                    onChange={(e) => setNewContact({ ...newContact, tags: e.target.value })}
                    placeholder="Tags (comma separated)"
                    className="rounded-xl border-slate-200"
                  />
                  <Textarea
                    value={newContact.notes}
                    onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                    placeholder="Notes"
                    className="rounded-xl border-slate-200"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button onClick={handleAddContact} className="bg-teal-600 hover:bg-teal-700">Add Contact</Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Broadcast Modal */}
        <AnimatePresence>
          {showBroadcastModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 w-full max-w-lg"
              >
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Send Broadcast</h2>
                <p className="text-sm text-slate-500 mb-4">Sending to {selectedIds.size} contacts</p>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      value={broadcast.channel}
                      onChange={(e) => setBroadcast({ ...broadcast, channel: e.target.value })}
                      className="h-10 px-4 rounded-xl border border-slate-200 text-sm"
                    >
                      <option value="email">Email Only</option>
                      <option value="whatsapp">WhatsApp Only</option>
                      <option value="both">Email + WhatsApp</option>
                    </select>
                    <select
                      value={broadcast.message_type}
                      onChange={(e) => setBroadcast({ ...broadcast, message_type: e.target.value })}
                      className="h-10 px-4 rounded-xl border border-slate-200 text-sm"
                    >
                      <option value="general">General Update</option>
                      <option value="promotion">Promotion</option>
                      <option value="cme_update">CME Update</option>
                      <option value="conference">Conference</option>
                    </select>
                  </div>
                  
                  {broadcast.channel !== "whatsapp" && (
                    <Input
                      value={broadcast.subject}
                      onChange={(e) => setBroadcast({ ...broadcast, subject: e.target.value })}
                      placeholder="Email Subject"
                      className="rounded-xl border-slate-200"
                    />
                  )}
                  
                  <Textarea
                    value={broadcast.message}
                    onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })}
                    placeholder="Message (use {name} for personalization)"
                    className="rounded-xl border-slate-200"
                    rows={5}
                  />
                  
                  <p className="text-xs text-slate-400">
                    Tip: Use {"{name}"} to personalize. For WhatsApp, links will open sequentially.
                  </p>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="ghost" onClick={() => setShowBroadcastModal(false)}>Cancel</Button>
                  <Button onClick={handleSendBroadcast} className="bg-teal-600 hover:bg-teal-700">
                    <Send className="h-4 w-4 mr-2" />
                    Send Broadcast
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Contact Details Drawer */}
        <AnimatePresence>
          {selectedContact && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setSelectedContact(null)}>
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25 }}
                className="bg-white w-full max-w-md h-full overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-slate-900">{selectedContact.name}</h2>
                    <button onClick={() => setSelectedContact(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                      <XCircle className="h-5 w-5 text-slate-400" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Contact Info */}
                    <Card className="p-4 space-y-2">
                      {selectedContact.mobile && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {selectedContact.mobile}
                        </div>
                      )}
                      {selectedContact.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {selectedContact.email}
                        </div>
                      )}
                      {selectedContact.city && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          {selectedContact.city}
                        </div>
                      )}
                      {selectedContact.subspecialty && (
                        <div className="flex items-center gap-2 text-sm">
                          <Stethoscope className="h-4 w-4 text-slate-400" />
                          {selectedContact.subspecialty}
                        </div>
                      )}
                      {selectedContact.clinic_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="h-4 w-4 text-slate-400" />
                          {selectedContact.clinic_name}
                        </div>
                      )}
                    </Card>
                    
                    {/* Tags */}
                    {selectedContact.tags?.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 mb-2">Tags</div>
                        <div className="flex flex-wrap gap-1">
                          {selectedContact.tags.map(tag => (
                            <Badge key={tag} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Notes */}
                    {selectedContact.notes && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 mb-2">Notes</div>
                        <p className="text-sm text-slate-600">{selectedContact.notes}</p>
                      </div>
                    )}
                    
                    {/* Activity Log */}
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-2">Activity Log</div>
                      <div className="space-y-2">
                        {(selectedContact.activities || []).slice().reverse().map((activity, idx) => (
                          <div key={idx} className="flex gap-2 text-sm">
                            <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 flex-shrink-0" />
                            <div>
                              <div className="text-slate-700">{activity.details}</div>
                              <div className="text-xs text-slate-400">
                                {new Date(activity.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                        {!selectedContact.activities?.length && (
                          <p className="text-sm text-slate-400">No activities yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
