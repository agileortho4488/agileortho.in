"use client";
import { MessageCircle } from "lucide-react";
import { COMPANY } from "@/lib/constants";

/**
 * Build a wa.me deep-link with a pre-filled message.
 *
 * The pre-filled text is what WhatsApp shows in the compose box — it is
 * NOT auto-sent. This matches the Interakt inbound flow: when the user
 * hits Send, our backend funnel engine detects the product keyword and
 * jumps the conversation straight into that product's detail card.
 */
export function buildWhatsAppLink({ productName = "", brand = "", slug = "" } = {}) {
  const phone = (COMPANY.whatsapp || "").replace(/[^0-9]/g, "");
  const parts = [];
  if (productName) {
    parts.push(`Hi Agile Ortho, I'd like a quote for *${productName}*.`);
    if (brand) parts.push(`Brand: ${brand}.`);
  } else {
    parts.push("Hi Agile Ortho, I'd like product info.");
  }
  if (slug) {
    parts.push(`(ref: ${slug})`);
  }
  parts.push("Please share availability & bulk pricing.");
  const message = encodeURIComponent(parts.join(" "));
  return `https://wa.me/${phone}?text=${message}`;
}

/**
 * Primary "Ask on WhatsApp" CTA — pill button for product detail hero.
 */
export function WhatsAppCTA({ productName, brand, slug, className = "", label, testid }) {
  const href = buildWhatsAppLink({ productName, brand, slug });
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-6 py-3 bg-gold text-ink text-sm font-bold rounded-sm hover:bg-[#F2C94C] transition-colors ${className}`}
      data-testid={testid || "wa-cta"}
    >
      <MessageCircle size={14} />
      {label || `Ask about ${productName || "this product"}`}
    </a>
  );
}

/**
 * Compact icon button for recommendation / listing cards.
 * Stops propagation so the card's parent <Link> doesn't also fire.
 */
export function WhatsAppIconButton({ productName, brand, slug, tone = "gold", testid }) {
  const href = buildWhatsAppLink({ productName, brand, slug });
  const toneClass =
    tone === "teal"
      ? "text-teal border-teal/40 hover:bg-teal/10"
      : "text-gold border-gold/40 hover:bg-gold/10";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 px-2 py-1 border rounded text-[10px] font-semibold transition-colors ${toneClass}`}
      title={`Ask on WhatsApp about ${productName}`}
      data-testid={testid || `wa-icon-${slug || "btn"}`}
    >
      <MessageCircle size={10} />
      WhatsApp
    </a>
  );
}
