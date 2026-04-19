"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, X, Send, Loader2, Bot, Sparkles, Phone,
} from "lucide-react";
import { COMPANY } from "@/lib/constants";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

// Simple per-session id. Persists in localStorage so history survives reloads.
function useSessionId() {
  const ref = useRef(null);
  useEffect(() => {
    let sid = typeof window !== "undefined" ? localStorage.getItem("ao_chat_sid") : null;
    if (!sid) {
      sid = `web_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      try { localStorage.setItem("ao_chat_sid", sid); } catch {}
    }
    ref.current = sid;
  }, []);
  return ref;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const bodyRef = useRef(null);
  const sessionId = useSessionId();

  // Load suggestions + history once when opened
  useEffect(() => {
    if (!open) return;
    if (suggestions.length === 0) {
      fetch(`${BACKEND}/api/chatbot/suggestions`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => d?.suggestions && setSuggestions(d.suggestions.slice(0, 4)))
        .catch(() => {});
    }
    if (messages.length === 0 && sessionId.current) {
      fetch(`${BACKEND}/api/chatbot/history/${sessionId.current}`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (d?.messages?.length) {
            setMessages(d.messages.map((m) => ({ role: m.role, content: m.content })));
          } else {
            setMessages([
              {
                role: "assistant",
                content: "Hello, I'm the Agile Ortho AI assistant. I can help with product information, specs, and connecting you with our sales team. What are you looking for today?",
              },
            ]);
          }
        })
        .catch(() => {
          setMessages([
            { role: "assistant", content: "Hi! How can I help you today?" },
          ]);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/chatbot/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, session_id: sessionId.current }),
      });
      const data = await res.json();
      const reply = data?.answer || "Sorry, I couldn't process that. Please try again.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((m) => [...m, {
        role: "assistant",
        content: "I'm having trouble connecting right now. Please WhatsApp us directly for immediate help.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating trigger — hidden on mobile since mobile has sticky bottom nav */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            onClick={() => setOpen(true)}
            className="hidden lg:flex fixed bottom-6 right-6 z-40 items-center gap-2 bg-[#D4AF37] hover:bg-[#F2C94C] text-black font-semibold rounded-full pl-4 pr-5 py-3 shadow-2xl shadow-[#D4AF37]/30 transition-all hover:scale-105"
            data-testid="chat-widget-fab"
          >
            <div className="relative">
              <MessageCircle size={18} strokeWidth={2.2} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            </div>
            <span className="text-sm">Ask AI</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-50 flex flex-col bg-[#0A0A0A] border border-white/10 shadow-2xl shadow-black/60 overflow-hidden
                       bottom-0 right-0 w-full h-[90vh] rounded-t-xl
                       lg:bottom-6 lg:right-6 lg:w-[400px] lg:h-[560px] lg:rounded-sm"
            data-testid="chat-widget-panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0D0D0D]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-sm bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                  <Bot size={16} className="text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white" style={{ fontFamily: "Outfit" }}>Agile AI Assistant</p>
                  <p className="text-[10px] text-[#2DD4BF] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF] animate-pulse" />
                    Online · Responds instantly
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-sm hover:bg-white/5 text-white/50 hover:text-white flex items-center justify-center transition-colors"
                data-testid="chat-widget-close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" data-testid="chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-sm px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-[#D4AF37] text-black font-medium"
                        : "bg-white/5 text-white/90 border border-white/[0.06]"
                    }`}
                    data-testid={`chat-msg-${m.role}`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 text-white/90 border border-white/[0.06] rounded-sm px-3.5 py-2.5 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-[#D4AF37]" />
                    <span className="text-xs text-white/60">Thinking…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions */}
            {messages.length <= 1 && suggestions.length > 0 && !loading && (
              <div className="px-4 pb-3 space-y-1.5" data-testid="chat-suggestions">
                <p className="text-[10px] font-bold text-[#D4AF37] tracking-widest uppercase flex items-center gap-1.5">
                  <Sparkles size={10} /> Quick Questions
                </p>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full text-left text-xs text-white/70 hover:text-white bg-white/5 hover:bg-white/[0.08] border border-white/10 hover:border-[#D4AF37]/40 rounded-sm px-3 py-2 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-white/[0.06] px-3 py-3 bg-[#0D0D0D]">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Ask about products, specs, availability…"
                  rows={1}
                  className="flex-1 bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50 resize-none max-h-24"
                  data-testid="chat-input"
                />
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-sm bg-[#D4AF37] hover:bg-[#F2C94C] disabled:opacity-40 disabled:cursor-not-allowed text-black flex items-center justify-center transition-colors"
                  data-testid="chat-send-btn"
                >
                  <Send size={14} />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[10px] text-white/35">AI-powered · Not medical advice</p>
                <a
                  href={`https://wa.me/${COMPANY.whatsapp.replace("+", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-[#2DD4BF] hover:text-[#5EEAD4] font-medium flex items-center gap-1 transition-colors"
                >
                  <Phone size={10} /> Talk to a human
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
