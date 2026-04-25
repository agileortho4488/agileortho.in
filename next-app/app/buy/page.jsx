import Link from "next/link";
import { ArrowRight, MapPin, ShoppingCart } from "lucide-react";
import { BUY_PAGES } from "@/lib/buyPages";

export const revalidate = 86400;

export const metadata = {
  title: "Buy Meril Medical Devices Online — Hyderabad, Telangana, India",
  description:
    "Quick-buy landing pages for the most-asked Meril medical devices — orthopedic implants, knee/hip replacement, cardiac stents, trauma plates, sports medicine. Hyderabad, Telangana and pan-India delivery.",
  alternates: { canonical: "/buy" },
};

const GROUPS = [
  { label: "Hyderabad", filter: (p) => p.city === "Hyderabad" },
  { label: "Telangana", filter: (p) => p.city === "Telangana" },
  { label: "India (pan-India delivery)", filter: (p) => p.city === "India" },
];

export default function BuyIndex() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="buy-index-page">
      <section className="bg-[#0D0D0D] border-b border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
          <span className="text-xs font-semibold text-[#2DD4BF] uppercase tracking-widest inline-flex items-center gap-1.5">
            <ShoppingCart size={12} /> Quick buy
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-light text-white tracking-tight"
              style={{ fontFamily: "Outfit" }}>
            Buy Meril Medical Devices
          </h1>
          <p className="mt-4 text-base text-white/65 max-w-2xl">
            Curated buyer pages for the most-asked products and divisions. Each page lists in-stock options with same-day quotes via WhatsApp.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
          {GROUPS.map((g) => {
            const items = BUY_PAGES.filter(g.filter);
            if (!items.length) return null;
            return (
              <div key={g.label}>
                <h2 className="text-lg font-medium text-white inline-flex items-center gap-2 mb-5">
                  <MapPin size={16} className="text-[#2DD4BF]" /> {g.label}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/buy/${p.slug}`}
                      className="group flex items-start justify-between gap-3 bg-[#111] hover:bg-white/[0.04] border border-white/[0.06] hover:border-[#D4AF37]/30 px-5 py-4 rounded-sm transition-all"
                      data-testid={`buy-index-${p.slug}`}
                    >
                      <div>
                        <h3 className="text-sm font-medium text-white group-hover:text-[#D4AF37]"
                            style={{ fontFamily: "Outfit" }}>
                          {p.h1}
                        </h3>
                        <p className="mt-1 text-xs text-white/45 line-clamp-2">{p.description}</p>
                      </div>
                      <ArrowRight size={14} className="text-white/35 group-hover:text-[#D4AF37] mt-1 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
