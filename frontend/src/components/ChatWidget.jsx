import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, ChevronRight, User, Bot, Phone } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

function getSessionId() {
  let sid = sessionStorage.getItem("chat_session_id");
  if (!sid) {
    sid = "s-" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    sessionStorage.setItem("chat_session_id", sid);
  }
  return sid;
}

function ChatBubble({ msg, isUser }) {
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} items-end`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? "bg-emerald-600" : "bg-[#0B1F3F]"
      }`}>
        {isUser ? <User size={13} className="text-white" /> : <Bot size={13} className="text-white" />}
      </div>
      <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
        isUser
          ? "bg-emerald-600 text-white rounded-br-md"
          : "bg-slate-100 text-slate-800 rounded-bl-md"
      }`}>
        <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
          __html: msg.content
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\n• /g, "<br/>&#8226; ")
            .replace(/\n- /g, "<br/>&#8211; ")
            .replace(/\n/g, "<br/>")
            .replace(/(https:\/\/wa\.me\/\d+)/g, '<a href="$1" target="_blank" rel="noopener" class="underline font-semibold">$1</a>')
        }} />
      </div>
    </div>
  );
}

function LeadForm({ sessionId, onClose }) {
  const [form, setForm] = useState({ name: "", hospital_clinic: "", phone_whatsapp: "", email: "", district: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone_whatsapp) {
      toast.error("Name and WhatsApp number are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, session_id: sessionId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Thank you! Our team will contact you shortly.");
      onClose();
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 space-y-2 border-t border-slate-200 bg-slate-50">
      <p className="text-xs font-bold text-slate-700">Share your details for a callback</p>
      <input type="text" placeholder="Your Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500" data-testid="chat-lead-name" />
      <input type="text" placeholder="Hospital / Clinic" value={form.hospital_clinic} onChange={(e) => setForm({ ...form, hospital_clinic: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500" data-testid="chat-lead-hospital" />
      <input type="tel" placeholder="WhatsApp Number *" value={form.phone_whatsapp} onChange={(e) => setForm({ ...form, phone_whatsapp: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500" data-testid="chat-lead-phone" />
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-100">Cancel</button>
        <button type="submit" disabled={submitting} className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
          {submitting ? "..." : "Submit"}
        </button>
      </div>
    </form>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const sessionId = useRef(getSessionId());

  useEffect(() => {
    fetch(`${API_URL}/api/chat/suggestions`)
      .then((r) => r.json())
      .then((d) => setSuggestions(d.suggestions || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      // Load history
      fetch(`${API_URL}/api/chat/history/${sessionId.current}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.messages && d.messages.length > 0) {
            setMessages(d.messages);
          } else {
            setMessages([{
              role: "assistant",
              content: "Welcome to Agile Ortho! I'm your AI product assistant. I can help you find the right Meril medical devices, check specifications, and connect you with our sales team.\n\nHow can I help you today?",
            }]);
          }
        })
        .catch(() => {
          setMessages([{
            role: "assistant",
            content: "Welcome to Agile Ortho! I'm your AI product assistant. How can I help you today?",
          }]);
        });
    }
  }, [open, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = useCallback(async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");
    const userMsg = { role: "user", content: userText };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, session_id: sessionId.current }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      if (data.lead_signal) {
        setTimeout(() => setShowLeadForm(true), 1000);
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "I'm having trouble connecting. Please try again or reach us on WhatsApp: https://wa.me/919876543210",
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-600/30 flex items-center justify-center hover:bg-emerald-700 hover:scale-105 transition-all duration-200"
          data-testid="chat-widget-toggle"
          aria-label="Open chat"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden" data-testid="chat-window">
          {/* Header */}
          <div className="bg-[#0B1F3F] px-4 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm" style={{ fontFamily: "Chivo" }}>Agile Ortho Assistant</h3>
                <p className="text-emerald-300 text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-pulse" /> Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <a href="tel:+919876543210" className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors" title="Call sales">
                <Phone size={15} />
              </a>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors" data-testid="chat-close-btn">
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} isUser={msg.role === "user"} />
            ))}
            {loading && (
              <div className="flex gap-2.5 items-end">
                <div className="w-7 h-7 rounded-full bg-[#0B1F3F] flex items-center justify-center shrink-0">
                  <Bot size={13} className="text-white" />
                </div>
                <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Suggestions — only show at start */}
            {messages.length <= 1 && !loading && suggestions.length > 0 && (
              <div className="space-y-1.5" data-testid="chat-suggestions">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick questions</p>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="w-full text-left px-3 py-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors flex items-center justify-between"
                    data-testid={`suggestion-${i}`}
                  >
                    {s} <ChevronRight size={12} className="text-slate-300" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lead Form */}
          {showLeadForm && (
            <LeadForm sessionId={sessionId.current} onClose={() => setShowLeadForm(false)} />
          )}

          {/* Input */}
          <div className="border-t border-slate-200 p-3 shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about products, specs, pricing..."
                className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                disabled={loading}
                data-testid="chat-input"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                data-testid="chat-send-btn"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
