import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  Bone, HeartPulse, Activity, Microscope, ShieldCheck, Scissors,
  Wrench, Dumbbell, EarOff, Droplets, Heart, GitBranch, Cpu,
} from "lucide-react";
import { getDivisions } from "@/lib/api";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/Motion";
import CatalogSearchBar from "./CatalogSearchBar";

export const revalidate = 3600;

const DIVISION_ICONS = {
  Trauma: Bone,
  Cardiovascular: HeartPulse,
  "Joint Replacement": Activity,
  Diagnostics: Microscope,
  "Infection Prevention": ShieldCheck,
  "Endo Surgery": Scissors,
  Instruments: Wrench,
  "Sports Medicine": Dumbbell,
  ENT: EarOff,
  Urology: Droplets,
  "Critical Care": Heart,
  "Peripheral Intervention": GitBranch,
  Robotics: Cpu,
  Spine: Bone,
};

export async function generateMetadata() {
  const r = await getDivisions();
  const total = r?.total_products || 810;
  const n = r?.divisions?.length || 13;
  return {
    title: `Medical Device Catalog — ${total}+ Meril Products`,
    description: `Browse ${total}+ verified Meril medical devices across ${n} clinical divisions including Trauma, Cardiovascular, Joint Replacement, Diagnostics, and more. Authorized distributor for Telangana hospitals.`,
    alternates: { canonical: "/catalog" },
  };
}

export default async function CatalogIndexPage() {
  const r = await getDivisions();
  const divisions = r?.divisions || [];
  const totalProducts = r?.total_products || 0;
  const totalCategories = divisions.reduce((s, d) => s + (d.categories?.length || 0), 0);

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://agileortho.in" },
      { "@type": "ListItem", position: 2, name: "Product Catalog", item: "https://agileortho.in/catalog" },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="catalog-index">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      {/* Header */}
      <div className="border-b border-white/[0.06] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="h-px w-8 bg-[#D4AF37]" />
            <span className="text-xs font-bold text-[#D4AF37] tracking-[0.2em] uppercase">
              Verified Product Catalog
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-white" style={{ fontFamily: "Outfit" }} data-testid="catalog-title">
            Product Catalog
          </h1>
          <p className="mt-3 text-sm text-white/55">
            <span className="text-white font-medium">{totalProducts}</span> verified products across{" "}
            <span className="text-white font-medium">{divisions.length}</span> divisions and{" "}
            <span className="text-white font-medium">{totalCategories}</span> categories.
          </p>

          <Suspense fallback={<div className="mt-8 h-12 max-w-xl bg-white/5 rounded-sm animate-pulse" />}>
            <CatalogSearchBar />
          </Suspense>
        </div>
      </div>

      {/* Division Grid */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {divisions.map((div) => {
            const Icon = DIVISION_ICONS[div.name] || Bone;
            return (
              <StaggerItem key={div.slug}>
                <Link
                  href={`/catalog/${div.slug}`}
                  className="group card-premium rounded-sm p-6 block"
                  data-testid={`catalog-division-${div.slug}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center border border-white/[0.06] group-hover:border-[#D4AF37]/30 transition-colors">
                      <Icon size={18} strokeWidth={1.5} className="text-[#D4AF37]" />
                    </div>
                    <span className="text-xs font-bold text-[#2DD4BF] bg-[#2DD4BF]/10 px-2 py-0.5 rounded">
                      {div.product_count}
                    </span>
                  </div>
                  <h3 className="text-base font-medium text-white group-hover:text-[#D4AF37] transition-colors" style={{ fontFamily: "Outfit" }}>
                    {div.name}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(div.categories || []).slice(0, 3).map((cat) => (
                      <span key={cat} className="text-[10px] bg-white/5 text-white/55 px-1.5 py-0.5 rounded">{cat}</span>
                    ))}
                    {(div.categories || []).length > 3 && (
                      <span className="text-[10px] text-white/40">+{(div.categories || []).length - 3} more</span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-white/40">
                    <span>{(div.categories || []).length} categories · {(div.brands || []).length} brands</span>
                    <span className="text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      Browse <ArrowRight size={10} />
                    </span>
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </div>
  );
}
