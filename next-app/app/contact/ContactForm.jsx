"use client";

import { useState } from "react";
import { MessageCircle, Phone, Mail, MapPin, Send, Loader2, CheckCircle2 } from "lucide-react";
import { COMPANY } from "@/lib/constants";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    inquiry_type: "general",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          source: "website_contact_form",
          page: "/contact",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess(true);
      setForm({ name: "", email: "", phone: "", organization: "", inquiry_type: "general", message: "" });
    } catch (err) {
      setError("Could not submit. Please try WhatsApp or call us directly.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-[#0D0D0D] border border-[#2DD4BF]/30 rounded-sm p-10 text-center" data-testid="contact-success">
        <CheckCircle2 size={40} className="mx-auto text-[#2DD4BF] mb-4" />
        <h3 className="text-xl font-bold text-white" style={{ fontFamily: "Outfit" }}>Thank you — we&apos;ll be in touch within 24 hours.</h3>
        <p className="mt-2 text-sm text-white/55">Meanwhile, reach us instantly on WhatsApp for any urgent enquiries.</p>
        <a
          href={`https://wa.me/${COMPANY.whatsapp.replace("+", "")}`}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#F2C94C] text-black font-semibold rounded-sm px-5 py-2.5 text-sm transition-colors"
        >
          <MessageCircle size={14} /> Open WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" data-testid="contact-form">
      <div className="grid sm:grid-cols-2 gap-4">
        <input name="name" value={form.name} onChange={onChange} required placeholder="Your name*" className="bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50" />
        <input name="email" type="email" value={form.email} onChange={onChange} required placeholder="Email*" className="bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <input name="phone" value={form.phone} onChange={onChange} required placeholder="Phone*" className="bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50" />
        <input name="organization" value={form.organization} onChange={onChange} placeholder="Hospital / Organization" className="bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50" />
      </div>
      <select name="inquiry_type" value={form.inquiry_type} onChange={onChange} className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50">
        <option value="general">General Enquiry</option>
        <option value="quote">Request a Quote</option>
        <option value="product_info">Product Information</option>
        <option value="bulk_order">Bulk / Hospital Procurement</option>
        <option value="partnership">Partnership</option>
        <option value="technical_support">Technical Support</option>
      </select>
      <textarea name="message" value={form.message} onChange={onChange} required rows={4} placeholder="How can we help? Include product names or SKUs if known." className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50 resize-none" />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#F2C94C] disabled:opacity-50 text-black font-semibold rounded-sm px-6 py-3.5 text-sm transition-colors">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : <><Send size={14} /> Submit Enquiry</>}
      </button>
    </form>
  );
}
