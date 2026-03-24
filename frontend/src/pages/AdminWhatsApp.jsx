import { useState, useEffect, useRef } from "react";
import { MessageCircle, Phone, Send, Bot, User, UserCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

function timeAgo(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ConversationItem({ conv, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-slate-100 transition-colors ${
        active ? "bg-emerald-50 border-l-2 border-l-emerald-600" : "hover:bg-slate-50"
      }`}
      data-testid={`wa-conv-${conv.phone}`}
    >
      <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white shrink-0">
        <UserCircle size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-slate-900 truncate">{conv.customer_name}</span>
          <span className="text-[10px] text-slate-400 whitespace-nowrap">{timeAgo(conv.last_message_time)}</span>
        </div>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          {conv.last_message_role === "customer" ? "" : conv.last_message_role === "admin" ? "You: " : "Bot: "}
          {conv.last_message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
            conv.status === "human" ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
          }`}>
            {conv.status === "human" ? "Human" : "AI Bot"}
          </span>
          {conv.unread > 0 && (
            <span className="w-5 h-5 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {conv.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ msg }) {
  const isCustomer = msg.role === "customer";
  const isAdmin = msg.role === "admin";
  return (
    <div className={`flex gap-2.5 ${isCustomer ? "flex-row" : "flex-row-reverse"}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        isCustomer ? "bg-[#25D366]" : isAdmin ? "bg-slate-700" : "bg-[#0B1F3F]"
      }`}>
        {isCustomer ? <User size={13} className="text-white" /> : isAdmin ? <UserCircle size={13} className="text-white" /> : <Bot size={13} className="text-white" />}
      </div>
      <div className={`max-w-[70%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
        isCustomer
          ? "bg-white border border-slate-200 text-slate-800 rounded-bl-md"
          : isAdmin
          ? "bg-slate-700 text-white rounded-br-md"
          : "bg-emerald-600 text-white rounded-br-md"
      }`}>
        <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
          __html: msg.content
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\n- /g, "<br/>- ")
            .replace(/\n/g, "<br/>")
        }} />
        <p className={`text-[10px] mt-1 ${isCustomer ? "text-slate-400" : "text-white/60"}`}>
          {msg.role === "admin" ? "Admin" : msg.role === "assistant" ? "AI Bot" : "Customer"} &middot; {timeAgo(msg.timestamp)}
        </p>
      </div>
    </div>
  );
}

export default function AdminWhatsApp() {
  const [conversations, setConversations] = useState([]);
  const [activePhone, setActivePhone] = useState(null);
  const [activeConv, setActiveConv] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const token = localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/whatsapp/conversations`, { headers });
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchConversation = async (phone) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/whatsapp/conversations/${phone}`, { headers });
      const data = await res.json();
      setActiveConv(data);
      // Update unread in list
      setConversations((prev) =>
        prev.map((c) => (c.phone === phone ? { ...c, unread: 0 } : c))
      );
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchConversations(); }, []);

  useEffect(() => {
    if (activePhone) fetchConversation(activePhone);
  }, [activePhone]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeConv]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
      if (activePhone) fetchConversation(activePhone);
    }, 10000);
    return () => clearInterval(interval);
  }, [activePhone]);

  const sendReply = async () => {
    if (!reply.trim() || !activePhone || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/whatsapp/send`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ phone: activePhone, message: reply }),
      });
      if (!res.ok) throw new Error();
      setReply("");
      toast.success("Reply sent via WhatsApp");
      fetchConversation(activePhone);
      fetchConversations();
    } catch { toast.error("Failed to send reply"); }
    setSending(false);
  };

  const toggleMode = async (phone, mode) => {
    const endpoint = mode === "human" ? "takeover" : "automate";
    try {
      await fetch(`${API_URL}/api/admin/whatsapp/conversations/${phone}/${endpoint}`, {
        method: "POST", headers,
      });
      toast.success(mode === "human" ? "Switched to human mode" : "Switched to AI mode");
      fetchConversation(phone);
      fetchConversations();
    } catch { toast.error("Failed to switch mode"); }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex" data-testid="wa-inbox">
      {/* Sidebar — Conversation List */}
      <div className={`w-full md:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0 ${activePhone ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#25D366] rounded-lg flex items-center justify-center">
              <MessageCircle size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Chivo" }}>WhatsApp Inbox</h2>
              <p className="text-[10px] text-slate-400">{conversations.length} conversations</p>
            </div>
          </div>
          <button onClick={fetchConversations} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400" data-testid="wa-refresh-btn">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" data-testid="wa-conv-list">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-20 px-6">
              <MessageCircle size={40} className="text-slate-200 mx-auto" />
              <p className="text-sm text-slate-500 mt-3">No WhatsApp conversations yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Conversations will appear here when customers message your WhatsApp number: {WHATSAPP_NUMBER || "+917416521222"}
              </p>
            </div>
          ) : (
            conversations.map((c) => (
              <ConversationItem
                key={c.phone}
                conv={c}
                active={activePhone === c.phone}
                onClick={() => setActivePhone(c.phone)}
              />
            ))
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className={`flex-1 flex flex-col bg-[#F5F5F0] ${!activePhone ? "hidden md:flex" : "flex"}`}>
        {!activePhone ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle size={48} className="text-slate-200 mx-auto" />
              <p className="text-sm text-slate-400 mt-3">Select a conversation to view messages</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setActivePhone(null)} className="md:hidden text-slate-400 mr-1" data-testid="wa-back-btn">
                  <ArrowLeft size={18} />
                </button>
                <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center text-white">
                  <UserCircle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{activeConv?.customer_name || activePhone}</h3>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Phone size={9} /> +91 {activePhone}
                    <span className="mx-1">|</span>
                    <span className={`font-bold ${activeConv?.status === "human" ? "text-orange-600" : "text-emerald-600"}`}>
                      {activeConv?.status === "human" ? "Human Mode" : "AI Bot Mode"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeConv?.status === "human" ? (
                  <button
                    onClick={() => toggleMode(activePhone, "active")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                    data-testid="wa-switch-ai-btn"
                  >
                    <Bot size={12} /> Switch to AI
                  </button>
                ) : (
                  <button
                    onClick={() => toggleMode(activePhone, "human")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition-colors"
                    data-testid="wa-takeover-btn"
                  >
                    <UserCircle size={12} /> Take Over
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="wa-messages">
              {(activeConv?.messages || []).map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
            </div>

            {/* Reply Bar */}
            <div className="bg-white border-t border-slate-200 p-3 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Type a reply..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                  disabled={sending}
                  data-testid="wa-reply-input"
                />
                <button
                  onClick={sendReply}
                  disabled={!reply.trim() || sending}
                  className="w-10 h-10 bg-[#25D366] text-white rounded-xl flex items-center justify-center hover:bg-[#1DA851] disabled:opacity-40 transition-colors shrink-0"
                  data-testid="wa-send-btn"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const WHATSAPP_NUMBER = "+917416521222";
