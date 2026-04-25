import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, Clock, Calendar, ArrowRight, MessageCircle, Phone,
  CheckCircle2, AlertTriangle, Info, BookOpen,
} from "lucide-react";
import { GUIDES, getGuide } from "@/lib/guides";
import { BUY_PAGES } from "@/lib/buyPages";

export const revalidate = 86400;

export async function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return { title: "Guide Not Found" };
  return {
    title: g.metaTitle,
    description: g.description,
    keywords: g.keywords,
    alternates: { canonical: `/guides/${slug}` },
    openGraph: {
      title: g.title,
      description: g.description,
      url: `https://www.agileortho.in/guides/${slug}`,
      type: "article",
      publishedTime: g.datePublished,
      modifiedTime: g.dateModified,
      authors: ["Agile Healthcare Clinical Desk"],
    },
    twitter: { card: "summary_large_image", title: g.title, description: g.description },
  };
}

const CALLOUT_TONES = {
  info: { bg: "bg-sky-500/5", border: "border-sky-400/30", icon: Info, color: "text-sky-300" },
  warning: { bg: "bg-amber-500/5", border: "border-amber-400/30", icon: AlertTriangle, color: "text-amber-300" },
  success: { bg: "bg-emerald-500/5", border: "border-emerald-400/30", icon: CheckCircle2, color: "text-emerald-300" },
};

function renderSection(section, idx) {
  switch (section.type) {
    case "p":
      return <p key={idx} className="text-base sm:text-[17px] leading-[1.85] text-white/75">{section.text}</p>;
    case "h2":
      return <h2 key={idx} className="text-2xl sm:text-3xl font-light text-white tracking-tight pt-6" style={{ fontFamily: "Outfit" }}>{section.text}</h2>;
    case "h3":
      return <h3 key={idx} className="text-lg sm:text-xl font-medium text-white tracking-tight pt-3" style={{ fontFamily: "Outfit" }}>{section.text}</h3>;
    case "ul":
      return (
        <ul key={idx} className="space-y-2 pl-1">
          {section.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-white/75 leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#D4AF37] flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={idx} className="space-y-2 pl-1">
          {section.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-white/75 leading-relaxed">
              <span className="mt-0.5 inline-flex w-6 h-6 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[#D4AF37] text-xs font-semibold flex-shrink-0">{i + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );
    case "table":
      return (
        <div key={idx} className="overflow-x-auto rounded border border-white/[0.08] bg-[#0F0F0F]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.04] border-b border-white/[0.08]">
                {section.headers.map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 font-medium text-white">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, r) => (
                <tr key={r} className="border-b border-white/[0.05] last:border-0">
                  {row.map((cell, c) => (
                    <td key={c} className="px-4 py-3 text-white/70 align-top leading-relaxed">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout": {
      const tone = CALLOUT_TONES[section.tone] || CALLOUT_TONES.info;
      const Icon = tone.icon;
      return (
        <div key={idx} className={`flex items-start gap-3 p-4 rounded border ${tone.bg} ${tone.border}`}>
          <Icon size={18} className={`flex-shrink-0 mt-0.5 ${tone.color}`} />
          <p className={`text-sm leading-relaxed ${tone.color}`}>{section.text}</p>
        </div>
      );
    }
    case "cta":
      return (
        <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded border border-[#D4AF37]/30 bg-[#D4AF37]/5">
          <p className="text-sm text-white/80 leading-relaxed">{section.text}</p>
          <a
            href={section.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#F2C94C] text-black font-semibold rounded-sm px-5 py-2.5 text-sm transition-all flex-shrink-0"
            data-testid={`guide-inline-cta-${idx}`}
          >
            <MessageCircle size={14} /> {section.label}
          </a>
        </div>
      );
    case "quote":
      return (
        <blockquote key={idx} className="border-l-2 border-[#D4AF37] pl-5 py-2 text-white/80 italic">
          <p className="text-base leading-relaxed">"{section.text}"</p>
          {section.attribution && <cite className="block mt-2 text-sm not-italic text-white/50">— {section.attribution}</cite>}
        </blockquote>
      );
    default:
      return null;
  }
}

export default async function GuidePage({ params }) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();

  const pageUrl = `https://www.agileortho.in/guides/${slug}`;
  const relatedGuides = GUIDES.filter((x) => x.slug !== slug && x.category === g.category).slice(0, 3);
  const relatedBuy = (g.relatedBuy || []).map((s) => BUY_PAGES.find((p) => p.slug === s)).filter(Boolean);

  // ── JSON-LD ────────────────────────────────────────────────────────────────
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${pageUrl}#article`,
    headline: g.title,
    description: g.description,
    url: pageUrl,
    datePublished: g.datePublished,
    dateModified: g.dateModified,
    author: {
      "@type": "Organization",
      name: "Agile Healthcare Clinical Desk",
      url: "https://www.agileortho.in/about",
    },
    publisher: { "@id": "https://www.agileortho.in/#organization" },
    mainEntityOfPage: pageUrl,
    image: "https://www.agileortho.in/agile_healthcare_logo.png",
    articleSection: g.category,
    keywords: g.keywords.join(", "),
    inLanguage: "en-IN",
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.agileortho.in/" },
      { "@type": "ListItem", position: 2, name: "Guides", item: "https://www.agileortho.in/guides" },
      { "@type": "ListItem", position: 3, name: g.title, item: pageUrl },
    ],
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: g.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <article className="min-h-screen bg-[#0A0A0A]" data-testid="guide-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* HERO */}
      <header className="bg-[#0D0D0D] border-b border-white/[0.06]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
          <nav className="flex items-center gap-1.5 text-sm text-white/45 mb-5 flex-wrap">
            <Link href="/" className="hover:text-white">Home</Link>
            <ChevronRight size={12} />
            <Link href="/guides" className="hover:text-white">Guides</Link>
            <ChevronRight size={12} />
            <span className="text-[#D4AF37] font-medium truncate">{g.category}</span>
          </nav>

          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#2DD4BF] bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 px-2.5 py-1 rounded">
            <BookOpen size={10} /> {g.category} Guide
          </span>

          <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-light text-white tracking-tight" style={{ fontFamily: "Outfit" }} data-testid="guide-h1">
            {g.title}
          </h1>

          <p className="mt-5 text-lg text-white/70 leading-relaxed">{g.summary}</p>

          <div className="mt-6 flex flex-wrap items-center gap-5 text-xs text-white/50">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} /> {g.readMinutes} min read
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} /> Updated {new Date(g.dateModified).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span className="text-white/40">By Agile Healthcare Clinical Desk</span>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16 space-y-6" data-testid="guide-body">
        {g.body.map(renderSection)}
      </div>

      {/* FAQ */}
      <section className="bg-[#0D0D0D] border-y border-white/[0.06] py-14" data-testid="guide-faq-section">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight" style={{ fontFamily: "Outfit" }}>
            Frequently asked
          </h2>
          <div className="mt-7 space-y-3">
            {g.faqs.map((q, i) => (
              <details key={q.q} className="group bg-[#111] border border-white/[0.06] rounded-sm overflow-hidden" data-testid={`guide-faq-${i}`}>
                <summary className="cursor-pointer px-6 py-4 flex items-center justify-between gap-4 text-white font-medium text-sm hover:bg-white/[0.03]">
                  <span>{q.q}</span>
                  <ArrowRight size={14} className="text-[#D4AF37] flex-shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-6 pb-5 pt-1 text-sm text-white/65 leading-relaxed">{q.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* RELATED BUY PAGES */}
      {relatedBuy.length > 0 && (
        <section className="py-14" data-testid="guide-related-buy">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-xl sm:text-2xl font-light text-white tracking-tight mb-6" style={{ fontFamily: "Outfit" }}>
              Ready to procure?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {relatedBuy.map((b) => (
                <Link
                  key={b.slug}
                  href={`/buy/${b.slug}`}
                  className="group flex items-start justify-between gap-3 bg-[#111] hover:bg-white/[0.04] border border-white/[0.06] hover:border-[#D4AF37]/30 px-5 py-4 rounded-sm transition-all"
                  data-testid={`guide-related-buy-${b.slug}`}
                >
                  <span className="text-sm text-white group-hover:text-[#D4AF37] font-medium">{b.h1}</span>
                  <ArrowRight size={14} className="text-white/35 group-hover:text-[#D4AF37] mt-1 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* MORE GUIDES + CTA */}
      <section className="bg-[#0D0D0D] border-t border-white/[0.06] py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {relatedGuides.length > 0 && (
            <>
              <h2 className="text-xl sm:text-2xl font-light text-white tracking-tight mb-6" style={{ fontFamily: "Outfit" }}>
                More {g.category} guides
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
                {relatedGuides.map((rg) => (
                  <Link
                    key={rg.slug}
                    href={`/guides/${rg.slug}`}
                    className="group block bg-[#111] hover:bg-white/[0.04] border border-white/[0.06] hover:border-[#D4AF37]/30 px-5 py-4 rounded-sm transition-all"
                    data-testid={`guide-related-${rg.slug}`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#2DD4BF]/70">{rg.category}</span>
                    <h3 className="mt-1 text-sm text-white group-hover:text-[#D4AF37] font-medium leading-snug" style={{ fontFamily: "Outfit" }}>
                      {rg.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <a
              href="https://wa.me/917416521222?text=Hi%2C%20I%20just%20read%20your%20buying%20guide%20and%20have%20a%20question."
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#F2C94C] text-black font-semibold rounded-sm px-6 py-3 text-sm transition-all"
              data-testid="guide-bottom-whatsapp"
            >
              <MessageCircle size={14} /> Talk to procurement
            </a>
            <a
              href="tel:+917416216262"
              className="inline-flex items-center gap-2 border border-white/15 hover:border-[#D4AF37]/40 text-white font-medium rounded-sm px-6 py-3 text-sm transition-all"
            >
              <Phone size={14} /> +91 74162 16262
            </a>
            <Link href="/guides" className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 text-white font-medium rounded-sm px-6 py-3 text-sm transition-all">
              All guides <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
