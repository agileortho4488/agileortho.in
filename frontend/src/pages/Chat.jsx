import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Send, Bot, User, ChevronRight, Phone, MessageCircle, ArrowLeft, ShieldCheck, ShieldAlert, ShieldX, ExternalLink } from "lucide-react";
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
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full" data-testid="confidence-badge-high">
        <ShieldCheck size={10} /> Verified Match
      </span>
    );
  }
  if (confidence === "medium") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full" data-testid="confidence-badge-medium">
        <ShieldAlert size={10} /> Partial Match
      </span>
    );
  }
  if (confidence === "low" || confidence === "none") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full" data-testid="confidence-badge-low">
        <ShieldX size={10} /> No Match
      </span>
    );
  }
  return null;
}

function HandoffBanner({ sessionId }) {
  const handleClick = () => {
    logTelemetry(sessionId, "handoff_clicked");
  };
  return (
    <div className="mt-2 flex items-center gap-2 p-2.5 bg-[#0B1F3F]/5 border border-[#0B1F3F]/10 rounded-xl text-xs" data-testid="handoff-banner">
      <Phone size={12} className="text-[#0B1F3F] shrink-0" />
      <span className="text-slate-600">Need help? Speak to a product specialist:</span>
      <a
        href="https://wa.me/917416521222"
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="inline-flex items-center gap-1 font-bold text-[#25D366] hover:underline"
        data-testid="handoff-whatsapp-link"
      >
        <MessageCircle size={11} /> WhatsApp <ExternalLink size={9} />
      </a>
    </div>
  );
}

function ChatBubble({ msg, isUser, sessionId }) {
  const confidence = msg.confidence;
  const showHandoff = !isUser && (confidence === "low" || confidence === "none" || confidence === "medium");

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} items-end`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-emerald-600" : "bg-[#0B1F3F]"}`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
      </div>
      <div className={`max-w-[70%] ${isUser ? "" : ""}`}>
        {!isUser && confidence && (
          <div className="mb-1.5 ml-0.5">
            <ConfidenceBadge confidence={confidence} />
          </div>
        )}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser ? "bg-emerald-600 text-white rounded-br-md" : "bg-white text-slate-800 rounded-bl-md border border-slate-200"
        }`}>
          <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
            __html: msg.content
              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
              .replace(/\n• /g, "<br/>&#8226; ")
              .replace(/\n- /g, "<br/>&#8211; ")
              .replace(/\n---\n/g, '<hr class="my-3 border-slate-200"/>')
              .replace(/\n/g, "<br/>")
              .replace(/(https:\/\/wa\.me\/\d+)/g, '<a href="$1" target="_blank" rel="noopener" class="underline font-semibold">$1</a>')
          }} />
        </div>
        {showHandoff && <HandoffBanner sessionId={sessionId} />}
      </div>
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
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
    fetch(`${API_URL}/api/chatbot/history/${sessionId.current}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.messages && d.messages.length > 0) {
          setMessages(d.messages);
        } else {
          setMessages([{
            role: "assistant",
            content: "Welcome to Agile Ortho! I'm your AI-powered product intelligence assistant.\n\nI can help you with:\n• Finding medical devices by name, brand, or division\n• Product specifications and SKU codes\n• Connecting you with our sales team\n\nWhat are you looking for today?",
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
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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

      // Log handoff offer for medium/low/none confidence
      if (data.confidence !== "high") {
        logTelemetry(sessionId.current, "handoff_offered", userText, data.confidence);
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "I'm having trouble connecting. Please reach us on WhatsApp: https://wa.me/917416521222",
        confidence: "none",
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="min-h-[calc(100vh-180px)] bg-[#FAFAFA] flex flex-col" data-testid="chat-page">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-400 hover:text-slate-700 transition-colors" data-testid="chat-back-link"><ArrowLeft size={18} /></Link>
            <div className="w-10 h-10 bg-[#0B1F3F] rounded-full flex items-center justify-center">
              <Bot size={20} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900" style={{ fontFamily: "Chivo" }}>Agile Ortho AI Assistant</h1>
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Powered by SKU Intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://wa.me/917416521222" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 bg-[#25D366] text-white text-xs font-bold rounded-lg hover:bg-[#1DA851] transition-colors" data-testid="chat-whatsapp-link">
              <MessageCircle size={13} /> WhatsApp
            </a>
            <a href="tel:+917416521222" className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors">
              <Phone size={13} /> Call
            </a>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 max-w-4xl w-full mx-auto flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5" data-testid="chat-page-messages">
          {messages.map((msg, i) => (
            <ChatBubble key={i} msg={msg} isUser={msg.role === "user"} sessionId={sessionId.current} />
          ))}
          {loading && (
            <div className="flex gap-3 items-end">
              <div className="w-8 h-8 rounded-full bg-[#0B1F3F] flex items-center justify-center shrink-0">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md border border-slate-200">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {/* Quick Suggestions */}
          {messages.length <= 1 && !loading && suggestions.length > 0 && (
            <div className="max-w-lg space-y-2" data-testid="chat-page-suggestions">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-11">Try asking</p>
              <div className="ml-11 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="text-left px-3.5 py-2.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-colors flex items-center justify-between"
                    data-testid={`page-suggestion-${i}`}
                  >
                    <span className="line-clamp-1">{s}</span>
                    <ChevronRight size={12} className="text-slate-300 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-200 bg-white p-4 shrink-0">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about products, specifications, SKU codes..."
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all"
              disabled={loading}
              data-testid="chat-page-input"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-11 h-11 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              data-testid="chat-page-send-btn"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
