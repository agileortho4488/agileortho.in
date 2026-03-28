import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight, BadgeCheck, Package,
  Bone, HeartPulse, Microscope, Activity
} from "lucide-react";
import { getCatalogDivisions } from "../lib/api";

const DIVISION_ICONS = {
  bone: Bone,
  "heart-pulse": HeartPulse,
  microscope: Microscope,
  activity: Activity,
};

const DIVISION_GRADIENTS = {
  amber: "from-amber-600 to-amber-700",
  rose: "from-rose-600 to-rose-700",
  violet: "from-violet-600 to-violet-700",
  teal: "from-teal-600 to-teal-700",
};

const DIVISION_DESCRIPTIONS = {
  Trauma: "Plating systems, intramedullary nails, screws, and fixation devices for orthopedic trauma surgery.",
  Cardiovascular: "Coronary stents, heart valves, and vascular intervention devices for cardiac care.",
  Diagnostics: "Rapid diagnostic tests, biochemistry reagents, ELISA kits, and point-of-care testing solutions.",
  "Joint Replacement": "Total knee and hip replacement systems, implants, and components for arthroplasty.",
  "Endo Surgery": "Endoscopic staplers, trocars, hernia mesh, ligating clips, and minimally invasive surgical instruments.",
  "Infection Prevention": "Surgical gowns, drapes, sterilization products, and antiseptic solutions for OR safety.",
  ENT: "Sinus balloon systems, nasal splints, tracheostomy tubes, and ear-nose-throat surgical devices.",
  Instruments: "General surgical instruments, retractors, forceps, and specialized hand tools.",
  "Sports Medicine": "Arthroscopic implants, anchors, and fixation devices for sports injury repair.",
  Urology: "Catheters, ureteral stents, and urological intervention devices.",
  "Critical Care": "Ventilator circuits, infusion sets, and critical care consumables for ICU settings.",
  "Peripheral Intervention": "Peripheral vascular stents, balloon catheters, and guide wires.",
  Robotics: "Robotic-assisted surgical systems and components.",
  Spine: "Spinal implants, pedicle screws, and vertebral body replacement systems.",
};

export default function CatalogIndex() {
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCatalogDivisions()
      .then((r) => setDivisions(r.data.divisions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalProducts = divisions.reduce((sum, d) => sum + d.product_count, 0);
  const totalCategories = divisions.reduce((sum, d) => sum + d.categories.length, 0);

  return (
    <div className="min-h-screen bg-white font-[Manrope]" data-testid="catalog-index-page">
      {/* Hero */}
      <section className="bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-12 lg:py-16">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-6" data-testid="catalog-index-breadcrumb">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={12} />
            <span className="text-white font-medium">Products</span>
          </nav>

          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20 mb-4">
              <BadgeCheck size={10} /> Verified Product Catalog
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight" data-testid="catalog-index-title">
              Product Catalog
            </h1>
            <p className="mt-4 text-slate-400 text-base sm:text-lg leading-relaxed">
              {totalProducts} verified products across {divisions.length} divisions and {totalCategories} categories, enriched with manufacturer brochure data.
            </p>
          </div>
        </div>
      </section>

      {/* Division Cards */}
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        {loading ? (
          <div className="flex items-center justify-center py-28">
            <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="catalog-division-cards">
            {divisions.map((div) => {
              const Icon = DIVISION_ICONS[div.icon] || Package;
              const gradient = DIVISION_GRADIENTS[div.color] || DIVISION_GRADIENTS.amber;
              const desc = DIVISION_DESCRIPTIONS[div.name] || `${div.name} medical devices and equipment.`;
              return (
                <Link
                  key={div.slug}
                  to={`/catalog/${div.slug}`}
                  className="group relative bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-xl hover:border-slate-200 transition-all duration-300"
                  data-testid={`catalog-div-card-${div.slug}`}
                >
                  <div className={`h-2 bg-gradient-to-r ${gradient}`} />
                  <div className="p-7">
                    <div className="flex items-start justify-between mb-5">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                        <Icon size={22} className="text-white" />
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                        {div.product_count} products
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 group-hover:text-slate-700 transition-colors tracking-tight">
                      {div.name}
                    </h2>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">{desc}</p>

                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {div.categories.slice(0, 4).map((cat) => (
                        <span key={cat} className="text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">{cat}</span>
                      ))}
                      {div.categories.length > 4 && (
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">+{div.categories.length - 4} more</span>
                      )}
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <div className="flex gap-4 text-[11px] text-slate-400">
                        <span>{div.categories.length} categories</span>
                        <span>{div.brands.length} brands</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">
                        Browse <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
