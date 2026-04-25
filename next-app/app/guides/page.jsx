import Link from "next/link";
import { ArrowRight, Clock, BookOpen } from "lucide-react";
import { GUIDES } from "@/lib/guides";

export const revalidate = 86400;

export const metadata = {
  title: "Buying Guides — Orthopedic Implants, Cardiology & Procurement",
  description:
    "Long-form buying guides for Indian hospitals — Meril vs Zimmer, knee replacement comparison, hip stem selection, BioMime stent guide, CDSCO procurement and more.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndex() {
  // group by category
  const byCategory = GUIDES.reduce((acc, g) => {
    (acc[g.category] = acc[g.category] || []).push(g);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="guides-index-page">
      <section className="bg-[#0D0D0D] border-b border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2DD4BF] uppercase tracking-widest">
            <BookOpen size={12} /> Resources
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-light text-white tracking-tight" style={{ fontFamily: "Outfit" }}>
            Buying Guides for Indian Hospitals
          </h1>
          <p className="mt-4 text-base text-white/65 max-w-2xl leading-relaxed">
            Practical, surgeon- and procurement-focused articles to help you choose the right Meril implant, evaluate alternatives and set up sustainable hospital supply.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
          {Object.entries(byCategory).map(([cat, items]) => (
            <div key={cat}>
              <h2 className="text-lg font-medium text-white mb-5">{cat}</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {items.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/guides/${g.slug}`}
                    className="group block bg-[#111] hover:bg-white/[0.04] border border-white/[0.06] hover:border-[#D4AF37]/30 p-6 rounded-sm transition-all"
                    data-testid={`guides-index-${g.slug}`}
                  >
                    <h3 className="text-base sm:text-lg font-medium text-white group-hover:text-[#D4AF37] leading-snug" style={{ fontFamily: "Outfit" }}>
                      {g.title}
                    </h3>
                    <p className="mt-2 text-sm text-white/55 line-clamp-2 leading-relaxed">{g.summary}</p>
                    <div className="mt-4 flex items-center gap-4 text-xs text-white/40">
                      <span className="inline-flex items-center gap-1.5"><Clock size={12} /> {g.readMinutes} min read</span>
                      <span>Updated {new Date(g.dateModified).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <ArrowRight size={14} className="text-white/35 group-hover:text-[#D4AF37] ml-auto flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
