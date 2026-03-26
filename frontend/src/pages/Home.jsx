import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Truck, HeartPulse, Microscope, Bone, Stethoscope, Syringe, Activity, Package } from "lucide-react";
import { getProducts, getDivisions } from "../lib/api";

const DIVISION_ICONS = {
  "Orthopedics": Bone,
  "Cardiovascular": HeartPulse,
  "Diagnostics": Microscope,
  "ENT": Stethoscope,
  "Endo-surgical": Syringe,
  "Infection Prevention": Shield,
  "Peripheral Intervention": Activity,
};

const DIVISION_COLORS = {
  "Orthopedics": "bg-blue-50 text-blue-700 border-blue-200",
  "Cardiovascular": "bg-red-50 text-red-700 border-red-200",
  "Diagnostics": "bg-purple-50 text-purple-700 border-purple-200",
  "ENT": "bg-teal-50 text-teal-700 border-teal-200",
  "Endo-surgical": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Infection Prevention": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Peripheral Intervention": "bg-orange-50 text-orange-700 border-orange-200",
};

export default function Home() {
  const [divisions, setDivisions] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);

  useEffect(() => {
    getDivisions().then((r) => setDivisions(r.data.divisions)).catch(() => {});
    getProducts({ limit: 6 }).then((r) => setFeaturedProducts(r.data.products)).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-slate-900 overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0 opacity-20">
          <img
            src="https://images.pexels.com/photos/12104186/pexels-photo-12104186.jpeg"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 lg:py-36">
          <div className="max-w-2xl">
            <p className="text-emerald-400 text-sm font-bold uppercase tracking-[0.2em] mb-4 animate-fade-up">
              Authorized Meril Life Sciences Distributor &middot; Telangana
            </p>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight animate-fade-up stagger-1"
              style={{ fontFamily: "Chivo" }}
            >
              Mobility
              <br />
              <span className="text-emerald-400">Revolutionised</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-lg animate-fade-up stagger-2">
              Agile Ortho brings world-class Meril medical devices to hospitals and clinics across
              all 33 districts of Telangana. Orthopedics, Cardiovascular, Diagnostics, and more.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 animate-fade-up stagger-3">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-sm hover:bg-emerald-700 transition-colors"
                data-testid="hero-browse-btn"
              >
                Browse Catalog <ArrowRight size={16} />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 border border-slate-600 text-white font-semibold rounded-sm hover:bg-slate-800 transition-colors"
                data-testid="hero-quote-btn"
              >
                Request Bulk Quote
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: "93+", label: "Medical Devices" },
              { value: "8", label: "Product Divisions" },
              { value: "33", label: "Districts Covered" },
              { value: "180+", label: "Countries by Meril" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl sm:text-3xl font-black text-slate-900" style={{ fontFamily: "Chivo" }}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divisions Grid */}
      <section className="py-16 sm:py-20 bg-[#FAFAFA]" data-testid="divisions-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-10">
            <p className="text-emerald-600 text-xs font-bold uppercase tracking-[0.2em] mb-2">Product Portfolio</p>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Chivo" }}>
              8 Medical Divisions
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {divisions.map((div, i) => {
              const Icon = DIVISION_ICONS[div.name] || Shield;
              const colorClass = DIVISION_COLORS[div.name] || "bg-slate-50 text-slate-700 border-slate-200";
              return (
                <Link
                  key={div.name}
                  to={`/products?division=${encodeURIComponent(div.name)}`}
                  className={`group border rounded-sm p-6 hover-lift ${colorClass} animate-fade-up stagger-${i + 1}`}
                  data-testid={`division-card-${div.name.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <Icon size={24} className="mb-3" />
                  <h3 className="font-bold text-base mb-1" style={{ fontFamily: "Chivo" }}>{div.name}</h3>
                  <p className="text-sm opacity-75">{div.product_count} products</p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    View Products <ArrowRight size={12} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 sm:py-20 bg-white" data-testid="featured-products">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-emerald-600 text-xs font-bold uppercase tracking-[0.2em] mb-2">Featured</p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Chivo" }}>
                Top Products
              </h2>
            </div>
            <Link to="/products" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredProducts.map((p) => (
              <Link
                key={p.id}
                to={`/products/${p.id}`}
                className="group border border-slate-200 rounded-sm bg-white hover-lift overflow-hidden"
                data-testid={`product-card-${p.id}`}
              >
                <div className="h-40 bg-slate-100 flex items-center justify-center">
                  <Package size={40} className="text-slate-300" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm">
                      {p.division}
                    </span>
                    {p.category && (
                      <span className="text-[10px] text-slate-400">{p.category}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors" style={{ fontFamily: "Chivo" }}>
                    {p.product_name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                  {p.sku_code && (
                    <p className="text-xs font-mono text-slate-400 mt-2">SKU: {p.sku_code}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-900 py-16 sm:py-20" data-testid="cta-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight" style={{ fontFamily: "Chivo" }}>
            Need Medical Devices for Your Hospital?
          </h2>
          <p className="mt-3 text-slate-400 max-w-md mx-auto">
            Get competitive bulk pricing, fast delivery across Telangana, and dedicated technical support.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-sm hover:bg-emerald-700 transition-colors"
              data-testid="cta-quote-btn"
            >
              Request Bulk Quote
            </Link>
            <a
              href="https://wa.me/917416521222"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white font-semibold rounded-sm hover:bg-[#1DA851] transition-colors"
              data-testid="cta-whatsapp-btn"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "Licensed Distributor", desc: "MD-42 Wholesale Drug License holder with full regulatory compliance" },
              { icon: Truck, title: "Pan-Telangana Delivery", desc: "Fast logistics to all 33 districts with temperature-controlled transport" },
              { icon: HeartPulse, title: "Technical Support", desc: "Dedicated product specialists for surgical technique guidance" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-sm bg-emerald-50 flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{title}</h4>
                  <p className="text-sm text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
