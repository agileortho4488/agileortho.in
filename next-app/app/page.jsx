import Link from "next/link";
import { Workflow, ArrowRight } from "lucide-react";
import { listCatalogProducts } from "@/lib/api";

export const revalidate = 3600;

export default async function HomePage() {
  const r = await listCatalogProducts({ page: 1, limit: 12 });
  const products = r?.products || [];

  return (
    <main className="min-h-screen bg-ink">
      <header className="border-b border-white/[0.06] py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-gold font-bold text-sm tracking-widest uppercase">
            Agile Healthcare · Meril Authorized
          </span>
          <span className="text-xs text-white/60">Telangana · +91 7416521222</span>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-center gap-2 text-xs text-gold mb-4">
          <Workflow size={14} />
          <span className="uppercase tracking-widest font-bold">Next.js + Vercel POC</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-3xl">
          Authorized Meril Life Sciences Master Franchise — Telangana
        </h1>
        <p className="text-lg text-white/70 max-w-2xl">
          967+ medical devices across 13 clinical divisions, serving hospitals and surgeons across all 33 districts of Telangana.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-xl font-bold uppercase tracking-[0.1em] mb-6">
          Featured Products
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <Link
              key={p.slug}
              href={`/catalog/products/${p.slug}`}
              className="group bg-white/5 border border-white/10 rounded-sm p-4 hover:border-gold/60 transition-colors"
              data-testid={`product-card-${p.slug}`}
            >
              <p className="text-[10px] font-bold uppercase text-gold mb-2">
                {p.division_canonical || p.brand}
              </p>
              <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-gold transition-colors">
                {p.product_name_display || p.product_name}
              </h3>
              <div className="mt-3 flex items-center gap-1 text-[10px] text-white/45">
                View details <ArrowRight size={10} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/[0.06] mt-16 px-6 py-8 text-center text-xs text-white/45">
        © {new Date().getFullYear()} Agile Orthopedics Private Limited · Next.js POC
      </footer>
    </main>
  );
}
