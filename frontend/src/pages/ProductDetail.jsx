import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, MessageCircle, Package, FileText, Download,
  Shield, Award, Building2, ChevronRight, Phone, Mail,
  Ruler, Box, Factory, Tag, CheckCircle2,
  Stethoscope, ClipboardList, BadgeCheck
} from "lucide-react";
import { getProduct, getProducts, submitLead } from "../lib/api";
import { toast } from "sonner";
import { SEO, buildProductSchema, buildBreadcrumbSchema } from "../components/SEO";

const API = process.env.REACT_APP_BACKEND_URL;

const DISTRICTS = ["Hyderabad","Rangareddy","Medchal-Malkajgiri","Sangareddy","Nalgonda","Warangal","Karimnagar","Khammam","Nizamabad","Adilabad","Mahabubnagar","Medak","Siddipet","Suryapet","Jagtial","Peddapalli","Kamareddy","Mancherial","Wanaparthy","Nagarkurnool","Vikarabad","Jogulamba Gadwal","Rajanna Sircilla","Kumuram Bheem","Mulugu","Narayanpet","Mahabubabad","Jayashankar","Jangaon","Nirmal","Yadadri","Bhadradri","Hanumakonda"];

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [related, setRelated] = useState([]);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", hospital_clinic: "", phone_whatsapp: "", email: "", district: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setActiveTab(0);
    setShowQuoteForm(false);
    window.scrollTo(0, 0);
    getProduct(id)
      .then((r) => {
        setProduct(r.data);
        return r.data;
      })
      .then((p) => {
        getProducts({ division: p.division, limit: 5 })
          .then((r) => setRelated((r.data.products || []).filter((rp) => rp.id !== id).slice(0, 4)))
          .catch(() => {});
      })
      .catch(() => toast.error("Product not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmitQuote = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone_whatsapp) {
      toast.error("Name and phone number are required");
      return;
    }
    setSubmitting(true);
    try {
      await submitLead({
        ...formData,
        inquiry_type: "Bulk Quote",
        product_interest: product?.product_name || "",
        source: "website",
      });
      toast.success("Quote request submitted! We'll contact you shortly.");
      setShowQuoteForm(false);
      setFormData({ name: "", hospital_clinic: "", phone_whatsapp: "", email: "", district: "", message: "" });
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40 font-[Manrope]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-40 font-[Manrope]">
        <Package size={48} className="mx-auto text-slate-300 mb-4" />
        <p className="text-slate-700 font-semibold">Product not found</p>
        <Link to="/products" className="text-teal-600 font-medium mt-3 inline-block hover:text-teal-700 transition-colors">
          Back to Products
        </Link>
      </div>
    );
  }

  const specs = typeof product.technical_specifications === "object" && product.technical_specifications !== null
    ? product.technical_specifications
    : {};
  const specEntries = Object.entries(specs).filter(([, v]) => v !== null && v !== "" && !/^\d+$/.test(String(v)));
  const hasSizes = product.size_variables && product.size_variables.length > 0;

  const imageUrl = product.images && product.images.length > 0
    ? `${API}/api/files/${product.images[0].storage_path}`
    : undefined;

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Products", url: "/products" },
    { name: product.division, url: `/products?division=${encodeURIComponent(product.division)}` },
    { name: product.product_name },
  ];

  const fullSpecRows = [
    ["Product Name", product.product_name],
    product.sku_code ? ["SKU / Catalog No.", product.sku_code] : null,
    product.material ? ["Material", product.material] : null,
    ...specEntries.map(([k, v]) => [k.replace(/_/g, " "), typeof v === "object" ? JSON.stringify(v) : String(v)]),
    product.pack_size ? ["Pack Size", product.pack_size] : null,
    ["Manufacturer", product.manufacturer],
    ["Division", product.division],
    product.category ? ["Category", product.category] : null,
  ].filter(Boolean);

  const TABS = [
    { label: "Overview", enabled: true },
    { label: "Specifications", enabled: specEntries.length > 0 },
    { label: "Sizes & Variants", enabled: hasSizes },
  ];

  return (
    <div className="min-h-screen bg-white font-[Manrope]">
      <SEO
        title={product.product_name}
        description={product.description || `${product.product_name} from ${product.manufacturer}. ${product.division} medical device available from authorized Meril distributor in Telangana.`}
        canonical={`/products/${id}`}
        image={imageUrl}
        type="product"
        jsonLd={[
          buildProductSchema(product, imageUrl),
          buildBreadcrumbSchema(breadcrumbs)
        ]}
      />
      {/* ===== DARK HERO BANNER ===== */}
      <section className="bg-slate-900 relative overflow-hidden" data-testid="product-detail-hero">
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500 via-transparent to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-8 lg:py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-4" data-testid="breadcrumb">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={12} />
            <Link to="/products" className="hover:text-white transition-colors">Products</Link>
            <ChevronRight size={12} />
            <Link to={`/products?division=${encodeURIComponent(product.division)}`} className="hover:text-white transition-colors">{product.division}</Link>
            <ChevronRight size={12} />
            <span className="text-white font-medium truncate max-w-[200px]">{product.product_name}</span>
          </nav>

          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            data-testid="back-link"
          >
            <ArrowLeft size={14} /> Back to All Products
          </Link>
        </div>
      </section>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-7xl mx-auto px-6 py-10 lg:py-14">

        {/* ════════ HERO GRID ════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left: Image */}
          <div className="lg:col-span-5">
            <div className="sticky top-20 bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden" data-testid="product-image">
              <div className="aspect-square flex items-center justify-center overflow-hidden p-6">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={`${API}/api/files/${product.images[0].storage_path}`}
                    alt={product.product_name}
                    className="w-full h-full object-contain"
                    data-testid="product-detail-image"
                  />
                ) : (
                  <div className="text-center">
                    <Package size={80} className="text-slate-200 mx-auto" />
                    <p className="text-xs text-slate-400 mt-4 font-medium">Product Image Coming Soon</p>
                  </div>
                )}
              </div>
              {/* Tags */}
              <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap gap-2" data-testid="product-tags">
                {[product.division, product.category, product.material].filter(Boolean).map((t) => (
                  <Link
                    key={t}
                    to={`/products?division=${encodeURIComponent(product.division)}`}
                    className="text-xs font-medium text-slate-500 bg-white hover:bg-teal-50 hover:text-teal-700 border border-slate-200 hover:border-teal-200 px-3 py-1 rounded-full transition-colors"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Info */}
          <div className="lg:col-span-7 space-y-6" data-testid="product-info">
            {/* Division badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full" data-testid="product-division">
                {product.division}
              </span>
              {product.category && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                  {product.category}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight" data-testid="product-name">
              {product.product_name}
            </h1>

            {product.sku_code && (
              <p className="text-xs font-mono text-slate-400 flex items-center gap-1.5" data-testid="product-sku">
                <Tag size={11} /> SKU: {product.sku_code}
              </p>
            )}

            {/* Description */}
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed" data-testid="product-description">
              {product.description}
            </p>

            {/* Quick attribute chips */}
            <div className="flex flex-wrap gap-2">
              {product.material && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                  <Box size={13} className="text-teal-500" /> {product.material}
                </span>
              )}
              {product.pack_size && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                  <Ruler size={13} className="text-teal-500" /> Pack: {product.pack_size}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                <Factory size={13} className="text-teal-500" /> {product.manufacturer}
              </span>
            </div>

            {/* Key features */}
            {specEntries.length > 0 && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6" data-testid="key-features">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Stethoscope size={15} className="text-teal-600" /> Key Features
                </h3>
                <ul className="space-y-2">
                  {specEntries.slice(0, 6).map(([key, value]) => (
                    <li key={key} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <CheckCircle2 size={15} className="text-teal-500 mt-0.5 shrink-0" />
                      <span><span className="font-semibold text-slate-700 capitalize">{key.replace(/_/g, " ")}:</span> {typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="space-y-3 pt-2" data-testid="hero-cta">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowQuoteForm(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20"
                  data-testid="request-quote-btn"
                >
                  <Mail size={16} /> Request Bulk Quote
                </button>
                <a
                  href={`https://wa.me/917416521222?text=${encodeURIComponent(`Hi, I'm interested in ${product.product_name} (${product.sku_code || ""}). Can you share pricing and availability for our hospital?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-[#25D366] text-white text-sm font-bold rounded-xl hover:bg-[#1DA851] transition-all shadow-lg shadow-[#25D366]/20"
                  data-testid="whatsapp-enquiry-btn"
                >
                  <MessageCircle size={16} /> WhatsApp Enquiry
                </a>
              </div>
              <div className="flex gap-3">
                <a
                  href="tel:+917416521222"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                  data-testid="call-btn"
                >
                  <Phone size={14} /> Call Sales Team
                </a>
                {product.brochure_url ? (
                  <a href={product.brochure_url} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-teal-200 text-teal-700 text-sm font-semibold rounded-xl hover:bg-teal-50 transition-colors" data-testid="brochure-btn">
                    <Download size={14} /> Download Brochure
                  </a>
                ) : (
                  <Link to="/contact" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors" data-testid="request-datasheet-btn">
                    <FileText size={14} /> Request Datasheet
                  </Link>
                )}
              </div>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100" data-testid="trust-badges">
              {[
                { icon: Shield, label: "ISO 13485 Certified", sub: "Quality Management" },
                { icon: Award, label: "CE Mark Compliant", sub: "European Standard" },
                { icon: BadgeCheck, label: "CDSCO Approved", sub: "Indian Regulatory" },
                { icon: Building2, label: "Authorized Distributor", sub: "Telangana Region" },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-teal-600" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 leading-tight block">{label}</span>
                    <span className="text-[10px] text-slate-400 leading-tight">{sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════════ QUOTE FORM MODAL ════════ */}
        {showQuoteForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="quote-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowQuoteForm(false); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" data-testid="quote-modal">
              <div className="bg-slate-900 px-6 py-5">
                <h3 className="text-white font-bold text-lg">Request Bulk Quote</h3>
                <p className="text-slate-400 text-xs mt-1">For: {product.product_name}</p>
              </div>
              <form onSubmit={handleSubmitQuote} className="p-6 space-y-3" data-testid="quote-form">
                <input type="text" placeholder="Your Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all" data-testid="quote-name-input" />
                <input type="text" placeholder="Hospital / Clinic" value={formData.hospital_clinic} onChange={(e) => setFormData({ ...formData, hospital_clinic: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all" data-testid="quote-hospital-input" />
                <input type="tel" placeholder="WhatsApp Number *" value={formData.phone_whatsapp} onChange={(e) => setFormData({ ...formData, phone_whatsapp: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all" data-testid="quote-phone-input" />
                <input type="email" placeholder="Email Address" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all" data-testid="quote-email-input" />
                <select value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 bg-white transition-all" data-testid="quote-district-select">
                  <option value="">Select District (Telangana)</option>
                  {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <textarea placeholder="Quantity needed, specific requirements..." value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={3} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 resize-none transition-all" data-testid="quote-message-input" />
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowQuoteForm(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors" data-testid="cancel-quote-btn">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors" data-testid="submit-quote-btn">
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ════════ TABBED CONTENT ════════ */}
        <div className="mt-14" data-testid="product-tabs">
          <h2 className="text-xl font-bold text-slate-900 mb-5 tracking-tight">Product Information</h2>
          <div className="flex border-b border-slate-200 gap-1">
            {TABS.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => tab.enabled && setActiveTab(i)}
                disabled={!tab.enabled}
                className={`px-5 py-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${
                  activeTab === i
                    ? "text-teal-700 border-b-2 border-teal-600 -mb-px"
                    : !tab.enabled
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                data-testid={`tab-${tab.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-slate-50 border border-slate-100 border-t-0 rounded-b-2xl p-6 lg:p-8">
            {/* Overview Tab */}
            {activeTab === 0 && (
              <div data-testid="tab-content-overview" className="space-y-8">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <ClipboardList size={16} className="text-teal-600" /> Product Description
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
                </div>

                {specEntries.length > 0 && (
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Stethoscope size={16} className="text-teal-600" /> Key Features
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                      {specEntries.map(([key, value]) => (
                        <li key={key} className="flex items-start gap-2.5 text-sm text-slate-600 py-1">
                          <CheckCircle2 size={15} className="text-teal-500 mt-0.5 shrink-0" />
                          <span><span className="font-semibold text-slate-700 capitalize">{key.replace(/_/g, " ")}:</span> {typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                        </li>
                      ))}
                      {product.material && (
                        <li className="flex items-start gap-2.5 text-sm text-slate-600 py-1">
                          <CheckCircle2 size={15} className="text-teal-500 mt-0.5 shrink-0" />
                          <span><span className="font-semibold text-slate-700">Material:</span> {product.material}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Building2 size={16} className="text-teal-600" /> Applications
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: "Hospitals & Multi-Specialty Centers", icon: Building2 },
                      { label: "Surgical Procedures", icon: Stethoscope },
                      { label: "Clinics & Diagnostic Centers", icon: ClipboardList },
                      { label: "Emergency & Trauma Care", icon: Shield },
                    ].map(({ label, icon: Ic }) => (
                      <div key={label} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100">
                        <Ic size={16} className="text-teal-600 shrink-0" />
                        <span className="text-sm text-slate-600 font-medium">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-3">Product Details</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[
                      { l: "Manufacturer", v: product.manufacturer },
                      { l: "Division", v: product.division },
                      product.category ? { l: "Category", v: product.category } : null,
                      product.material ? { l: "Material", v: product.material } : null,
                      product.pack_size ? { l: "Pack Size", v: product.pack_size } : null,
                      product.sku_code ? { l: "SKU Code", v: product.sku_code } : null,
                    ].filter(Boolean).map(({ l, v }) => (
                      <div key={l} className="bg-white rounded-xl px-4 py-3 border border-slate-100">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{l}</p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Specifications Tab */}
            {activeTab === 1 && specEntries.length > 0 && (
              <div data-testid="tab-content-specs">
                <h3 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
                  <FileText size={16} className="text-teal-600" /> Technical Specifications
                </h3>
                <div className="rounded-xl overflow-hidden border border-slate-200">
                  <table className="w-full text-sm" data-testid="specs-table">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider">Attribute</th>
                        <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fullSpecRows.map(([key, value], i) => (
                        <tr key={key + i} className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50"} border-t border-slate-100`}>
                          <td className="px-5 py-3 font-semibold text-slate-700 capitalize whitespace-nowrap">{key}</td>
                          <td className="px-5 py-3 text-slate-600">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sizes Tab */}
            {activeTab === 2 && hasSizes && (
              <div data-testid="tab-content-sizes">
                <h3 className="text-base font-bold text-slate-900 mb-4">Available Sizes & Variants</h3>
                <div className="flex flex-wrap gap-2">
                  {product.size_variables.map((s) => (
                    <span key={s} className="px-4 py-2.5 bg-white border border-slate-200 text-sm font-mono rounded-xl hover:border-teal-300 hover:bg-teal-50 transition-colors cursor-default">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ════════ NEED HELP BANNER ════════ */}
        <div className="mt-10 bg-slate-900 rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6" data-testid="help-banner">
          <div>
            <h3 className="text-white font-bold text-lg">Need Technical Assistance?</h3>
            <p className="text-slate-400 text-sm mt-1.5 max-w-md">Our product specialists can help with sizing, compatibility, and clinical applications across Telangana.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <a href="tel:+917416521222" className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20">
              <Phone size={14} /> Call Now
            </a>
            <Link to="/contact" className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 transition-colors" data-testid="contact-specialist-link">
              Contact Specialist <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* ════════ RELATED PRODUCTS ════════ */}
        {related.length > 0 && (
          <div className="mt-14" data-testid="related-products">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-teal-600 text-xs font-bold uppercase tracking-[0.2em] mb-2">More from {product.division}</p>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Related Products</h2>
              </div>
              <Link
                to={`/products?division=${encodeURIComponent(product.division)}`}
                className="text-sm text-teal-600 font-semibold hover:text-teal-700 transition-colors flex items-center gap-1"
                data-testid="view-all-related-link"
              >
                View All <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {related.map((rp) => (
                <Link
                  key={rp.id}
                  to={`/products/${rp.id}`}
                  className="group bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-lg hover:border-teal-200 transition-all duration-300"
                  data-testid={`related-product-${rp.id}`}
                >
                  <div className="h-40 bg-slate-50 flex items-center justify-center overflow-hidden p-3 relative">
                    {rp.images && rp.images.length > 0 ? (
                      <img
                        src={`${API}/api/files/${rp.images[0].storage_path}`}
                        alt={rp.product_name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <Package size={32} className="text-slate-200" />
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">{rp.division}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-teal-600 transition-colors leading-snug">
                      {rp.product_name}
                    </h4>
                    {rp.category && <p className="text-xs text-slate-400 mt-1">{rp.category}</p>}
                    <span className="inline-flex items-center gap-1 text-xs text-teal-600 font-semibold mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      View Details <ChevronRight size={12} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
