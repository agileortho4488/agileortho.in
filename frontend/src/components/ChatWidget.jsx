import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, ChevronRight, User, Bot, Phone, ShieldCheck, ShieldAlert, ShieldX, ExternalLink } from "lucide-react";
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

function logTelemetry(sessionId, eventType, query = null, confidence = null, metadata = null) {
  fetch(`${API_URL}/api/chatbot/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, event_type: eventType, query, confidence, metadata }),
  }).catch(() => {});
}

function ConfidenceBadge({ confidence }) {
  if (confidence === "high") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full" data-testid="widget-confidence-high">
        <ShieldCheck size={9} /> Verified
      </span>
    );
  }
  if (confidence === "medium") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full" data-testid="widget-confidence-medium">
        <ShieldAlert size={9} /> Partial
      </span>
    );
  }
  if (confidence === "low" || confidence === "none") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full" data-testid="widget-confidence-low">
        <ShieldX size={9} /> No Match
      </span>
    );
  }
  return null;
}

function ChatBubble({ msg, isUser, sessionId }) {
  const confidence = msg.confidence;
  const showHandoff = !isUser && (confidence === "low" || confidence === "none" || confidence === "medium");

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} items-end`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? "bg-emerald-600" : "bg-[#0B1F3F]"
      }`}>
        {isUser ? <User size={13} className="text-white" /> : <Bot size={13} className="text-white" />}
      </div>
      <div className={`max-w-[80%]`}>
        {!isUser && confidence && (
          <div className="mb-1 ml-0.5">
            <ConfidenceBadge confidence={confidence} />
          </div>
        )}
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-emerald-600 text-white rounded-br-md"
            : "bg-slate-100 text-slate-800 rounded-bl-md"
        }`}>
          <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
            __html: msg.content
              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
              .replace(/\n• /g, "<br/>&#8226; ")
              .replace(/\n- /g, "<br/>&#8211; ")
              .replace(/\n---\n/g, '<hr class="my-2 border-slate-300"/>')
              .replace(/\n/g, "<br/>")
              .replace(/(https:\/\/wa\.me\/\d+)/g, '<a href="$1" target="_blank" rel="noopener" class="underline font-semibold">$1</a>')
          }} />
        </div>
        {showHandoff && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500" data-testid="widget-handoff-banner">
            <Phone size={10} className="shrink-0" />
            <span>Need help?</span>
            <a
              href="https://wa.me/917416521222"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => logTelemetry(sessionId, "handoff_clicked")}
              className="font-bold text-[#25D366] hover:underline inline-flex items-center gap-0.5"
              data-testid="widget-handoff-link"
            >
              <MessageCircle size={9} /> WhatsApp <ExternalLink size={8} />
            </a>
          </div>
        )}
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
      logTelemetry(sessionId, "lead_form_submitted");
      onClose();
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 space-y-2 border-t border-slate-200 bg-slate-50" data-testid="lead-form">
      <p className="text-xs font-bold text-slate-700">Share your details for a callback</p>
      <input type="text" placeholder="Your Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500" data-testid="chat-lead-name" />
      <input type="text" placeholder="Hospital / Clinic" value={form.hospital_clinic} onChange={(e) => setForm({ ...form, hospital_clinic: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500" data-testid="chat-lead-hospital" />
      <input type="tel" placeholder="WhatsApp Number *" value={form.phone_whatsapp} onChange={(e) => setForm({ ...form, phone_whatsapp: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500" data-testid="chat-lead-phone" />
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-100" data-testid="lead-form-cancel">Cancel</button>
        <button type="submit" disabled={submitting} className="flex-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50" data-testid="lead-form-submit">
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
  const [lowConfidenceCount, setLowConfidenceCount] = useState(0);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const sessionId = useRef(getSessionId());

  useEffect(() => {
    fetch(`${API_URL}/api/chatbot/suggestions`)
      .then((r) => r.json())
      .then((d) => setSuggestions(d.suggestions || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      fetch(`${API_URL}/api/chatbot/history/${sessionId.current}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.messages && d.messages.length > 0) {
            setMessages(d.messages);
          } else {
            setMessages([{
              role: "assistant",
              content: "Welcome to Agile Ortho! I'm your AI product intelligence assistant. I can help you find Meril medical devices, check specifications, and connect you with our sales team.\n\nHow can I help you today?",
              confidence: "high",
            }]);
          }
        })
        .catch(() => {
          setMessages([{
            role: "assistant",
            content: "Welcome to Agile Ortho! I'm your AI product assistant. How can I help you today?",
            confidence: "high",
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
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chatbot/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userText, session_id: sessionId.current }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.answer,
        confidence: data.confidence,
        sources: data.sources,
      }]);

      // Track non-high confidence for lead form trigger
      if (data.confidence !== "high") {
        logTelemetry(sessionId.current, "handoff_offered", userText, data.confidence);
        setLowConfidenceCount((c) => {
          const next = c + 1;
          // After 2+ medium/low responses, offer lead form
          if (next >= 2 && !showLeadForm) {
            setTimeout(() => {
              setShowLeadForm(true);
              logTelemetry(sessionId.current, "lead_form_shown");
            }, 1500);
          }
          return next;
        });
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "I'm having trouble connecting. Please try again or reach us on WhatsApp: https://wa.me/917416521222",
        confidence: "none",
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, showLeadForm]);

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
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-pulse" /> SKU Intelligence
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <a href="tel:+917416521222" className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors" title="Call sales">
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
              <ChatBubble key={i} msg={msg} isUser={msg.role === "user"} sessionId={sessionId.current} />
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

            {/* Quick Suggestions */}
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
                placeholder="Ask about products, specs, SKU codes..."
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
