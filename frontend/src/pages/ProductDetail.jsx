import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, MessageCircle, Package, FileText, Download,
  Shield, Award, Building2, ChevronRight, Phone, Mail,
  Ruler, Box, Factory, Tag, CheckCircle2, Share2, Copy,
  ExternalLink, Stethoscope, ClipboardList, BadgeCheck
} from "lucide-react";
import { getProduct, getProducts, submitLead } from "../lib/api";
import { toast } from "sonner";

/* ─── sub-components ─── */

function ProductTags({ product }) {
  const tags = [product.division, product.category, product.material].filter(Boolean);
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-2" data-testid="product-tags">
      {tags.map((t) => (
        <Link
          key={t}
          to={`/products?division=${encodeURIComponent(product.division)}`}
          className="text-xs font-medium text-slate-500 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 px-3 py-1 rounded-full transition-colors"
        >
          {t}
        </Link>
      ))}
    </div>
  );
}

function ShareButtons({ product }) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = `Check out ${product.product_name} from Agile Ortho`;
  const copyLink = () => {
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied!")).catch(() => {});
  };
  return (
    <div className="flex items-center gap-1" data-testid="share-buttons">
      <span className="text-xs text-slate-400 mr-1 font-medium">Share:</span>
      <a href={`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-full bg-slate-100 hover:bg-[#25D366] hover:text-white flex items-center justify-center text-slate-400 transition-colors" title="WhatsApp" data-testid="share-whatsapp"><MessageCircle size={13} /></a>
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-full bg-slate-100 hover:bg-[#0077B5] hover:text-white flex items-center justify-center text-slate-400 transition-colors" title="LinkedIn" data-testid="share-linkedin"><ExternalLink size={13} /></a>
      <a href={`mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-emerald-600 hover:text-white flex items-center justify-center text-slate-400 transition-colors" title="Email" data-testid="share-email"><Mail size={13} /></a>
      <button onClick={copyLink} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-700 hover:text-white flex items-center justify-center text-slate-400 transition-colors" title="Copy Link" data-testid="share-copy"><Copy size={13} /></button>
    </div>
  );
}

function TrustBadge({ icon: Icon, label, sub }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-emerald-600" />
      </div>
      <div>
        <span className="text-xs font-bold text-slate-700 leading-tight block">{label}</span>
        {sub && <span className="text-[10px] text-slate-400 leading-tight">{sub}</span>}
      </div>
    </div>
  );
}

function RelatedCard({ product }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group block bg-white border border-slate-200 rounded-lg overflow-hidden hover:border-emerald-300 hover:shadow-lg transition-all duration-300"
      data-testid={`related-product-${product.id}`}
    >
      <div className="h-36 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center relative overflow-hidden">
        <Package size={32} className="text-slate-200 group-hover:text-emerald-200 transition-colors" />
        <div className="absolute top-2 left-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{product.division}</span>
        </div>
      </div>
      <div className="p-4">
        <h4 className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-emerald-700 transition-colors leading-snug" style={{ fontFamily: "Chivo" }}>
          {product.product_name}
        </h4>
        {product.category && <p className="text-xs text-slate-400 mt-1">{product.category}</p>}
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold mt-3 group-hover:gap-2 transition-all">
          View Details <ChevronRight size={12} />
        </span>
      </div>
    </Link>
  );
}

const DISTRICTS = ["Hyderabad","Rangareddy","Medchal-Malkajgiri","Sangareddy","Nalgonda","Warangal","Karimnagar","Khammam","Nizamabad","Adilabad","Mahabubnagar","Medak","Siddipet","Suryapet","Jagtial","Peddapalli","Kamareddy","Mancherial","Wanaparthy","Nagarkurnool","Vikarabad","Jogulamba Gadwal","Rajanna Sircilla","Kumuram Bheem","Mulugu","Narayanpet","Mahabubabad","Jayashankar","Jangaon","Nirmal","Yadadri","Bhadradri","Hanumakonda"];

/* ─── main component ─── */

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
      <div className="flex items-center justify-center py-40">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-40">
        <p className="text-slate-500">Product not found.</p>
        <Link to="/products" className="text-emerald-600 font-medium mt-2 inline-block">Back to Products</Link>
      </div>
    );
  }

  const specs = typeof product.technical_specifications === "object" && product.technical_specifications !== null
    ? product.technical_specifications
    : {};
  const specEntries = Object.entries(specs).filter(([k, v]) => v !== null && v !== "" && !/^\d+$/.test(k));
  const hasSizes = product.size_variables && product.size_variables.length > 0;

  /* Build enriched spec table rows (merge product meta + technical specs) */
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
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 overflow-x-auto" data-testid="breadcrumb">
            <Link to="/" className="hover:text-slate-700 transition-colors whitespace-nowrap">Home</Link>
            <ChevronRight size={12} />
            <Link to="/products" className="hover:text-slate-700 transition-colors whitespace-nowrap">Products</Link>
            <ChevronRight size={12} />
            <Link to={`/products?division=${encodeURIComponent(product.division)}`} className="hover:text-slate-700 transition-colors whitespace-nowrap">{product.division}</Link>
            <ChevronRight size={12} />
            <span className="text-slate-700 font-medium truncate">{product.product_name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-10">
        <Link to="/products" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-6 transition-colors" data-testid="back-link">
          <ArrowLeft size={14} /> All Products
        </Link>

        {/* ════════ HERO ════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          {/* Left column: Image + Tags */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden sticky top-6">
              <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-white to-slate-50 overflow-hidden" data-testid="product-image">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={`${process.env.REACT_APP_BACKEND_URL}/api/files/${product.images[0].storage_path}`}
                    alt={product.product_name}
                    className="w-full h-full object-contain p-4"
                    data-testid="product-detail-image"
                  />
                ) : (
                  <div className="text-center">
                    <Package size={80} className="text-slate-200 mx-auto" />
                    <p className="text-xs text-slate-300 mt-4 font-medium">Product Image Coming Soon</p>
                  </div>
                )}
              </div>
              {/* Tags below image (like reference) */}
              <div className="px-5 py-4 border-t border-slate-100">
                <ProductTags product={product} />
              </div>
            </div>
          </div>

          {/* Right column: Info + CTA */}
          <div className="lg:col-span-7 space-y-5" data-testid="product-info">
            {/* Division & Category badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded" data-testid="product-division">
                {product.division}
              </span>
              {product.category && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded">
                  {product.category}
                </span>
              )}
            </div>

            {/* Social share row */}
            <div className="flex items-center justify-between">
              <ShareButtons product={product} />
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight" style={{ fontFamily: "Chivo" }} data-testid="product-name">
              {product.product_name}
            </h1>

            {product.sku_code && (
              <p className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
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
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg">
                  <Box size={13} className="text-emerald-500" /> {product.material}
                </span>
              )}
              {product.pack_size && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg">
                  <Ruler size={13} className="text-emerald-500" /> Pack: {product.pack_size}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg">
                <Factory size={13} className="text-emerald-500" /> {product.manufacturer}
              </span>
            </div>

            {/* Key features (if specs exist, show top ones as bullet features) */}
            {specEntries.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="key-features">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2" style={{ fontFamily: "Chivo" }}>
                  <Stethoscope size={15} className="text-emerald-600" /> Key Features
                </h3>
                <ul className="space-y-2">
                  {specEntries.map(([key, value]) => (
                    <li key={key} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                      <span><span className="font-semibold text-slate-700 capitalize">{key.replace(/_/g, " ")}:</span> {typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA Buttons — inline (primary actions) */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2" data-testid="hero-cta">
              <button
                onClick={() => setShowQuoteForm(true)}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-all hover:shadow-lg hover:shadow-emerald-600/20"
                data-testid="request-quote-btn"
              >
                <Mail size={16} /> Request Bulk Quote
              </button>
              <a
                href={`https://wa.me/917416521222?text=${encodeURIComponent(`Hi, I'm interested in ${product.product_name} (${product.sku_code || ""}). Can you share pricing and availability for our hospital?`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-[#25D366] text-white text-sm font-bold rounded-lg hover:bg-[#1DA851] transition-all hover:shadow-lg hover:shadow-[#25D366]/20"
                data-testid="whatsapp-enquiry-btn"
              >
                <MessageCircle size={16} /> WhatsApp Enquiry
              </a>
            </div>
            <div className="flex gap-3">
              <a
                href="tel:+917416521222"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                data-testid="call-btn"
              >
                <Phone size={14} /> Call Sales Team
              </a>
              {product.brochure_url ? (
                <a href={product.brochure_url} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-lg hover:bg-emerald-50 transition-colors" data-testid="brochure-btn">
                  <Download size={14} /> Download Brochure
                </a>
              ) : (
                <Link to="/contact" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors" data-testid="request-datasheet-btn">
                  <FileText size={14} /> Request Datasheet
                </Link>
              )}
            </div>

            {/* Trust badges row */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100" data-testid="trust-badges">
              <TrustBadge icon={Shield} label="ISO 13485 Certified" sub="Quality Management" />
              <TrustBadge icon={Award} label="CE Mark Compliant" sub="European Standard" />
              <TrustBadge icon={BadgeCheck} label="CDSCO Approved" sub="Indian Regulatory" />
              <TrustBadge icon={Building2} label="Authorized Distributor" sub="Telangana Region" />
            </div>
          </div>
        </div>

        {/* ════════ QUOTE FORM MODAL ════════ */}
        {showQuoteForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="quote-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowQuoteForm(false); }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" data-testid="quote-modal">
              <div className="bg-[#0B1F3F] px-6 py-5">
                <h3 className="text-white font-bold text-lg" style={{ fontFamily: "Chivo" }}>Request Bulk Quote</h3>
                <p className="text-slate-300 text-xs mt-1">For: {product.product_name}</p>
              </div>
              <form onSubmit={handleSubmitQuote} className="p-6 space-y-3" data-testid="quote-form">
                <input type="text" placeholder="Your Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10" data-testid="quote-name-input" />
                <input type="text" placeholder="Hospital / Clinic" value={formData.hospital_clinic} onChange={(e) => setFormData({ ...formData, hospital_clinic: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10" data-testid="quote-hospital-input" />
                <input type="tel" placeholder="WhatsApp Number *" value={formData.phone_whatsapp} onChange={(e) => setFormData({ ...formData, phone_whatsapp: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10" data-testid="quote-phone-input" />
                <input type="email" placeholder="Email Address" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10" data-testid="quote-email-input" />
                <select value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 bg-white" data-testid="quote-district-select">
                  <option value="">Select District (Telangana)</option>
                  {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <textarea placeholder="Quantity needed, specific requirements..." value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={3} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 resize-none" data-testid="quote-message-input" />
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowQuoteForm(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors" data-testid="cancel-quote-btn">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors" data-testid="submit-quote-btn">
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ════════ TABBED CONTENT ════════ */}
        <div className="mt-12" data-testid="product-tabs">
          <h2 className="text-lg font-black text-slate-900 mb-4" style={{ fontFamily: "Chivo" }}>Product Information</h2>
          <div className="flex border-b border-slate-200 gap-1">
            {TABS.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => tab.enabled && setActiveTab(i)}
                disabled={!tab.enabled}
                className={`px-5 py-3 text-sm font-semibold transition-colors relative whitespace-nowrap rounded-t-lg ${
                  activeTab === i
                    ? "text-emerald-700 bg-white border border-slate-200 border-b-white -mb-px"
                    : !tab.enabled
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
                data-testid={`tab-${tab.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 border-t-0 rounded-b-lg p-6 lg:p-8">
            {/* ── Overview Tab ── */}
            {activeTab === 0 && (
              <div data-testid="tab-content-overview" className="space-y-8">
                {/* Description */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2" style={{ fontFamily: "Chivo" }}>
                    <ClipboardList size={16} className="text-slate-400" /> Product Description
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
                </div>

                {/* Key Features (structured like reference page) */}
                {specEntries.length > 0 && (
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2" style={{ fontFamily: "Chivo" }}>
                      <Stethoscope size={16} className="text-slate-400" /> Key Features
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                      {specEntries.map(([key, value]) => (
                        <li key={key} className="flex items-start gap-2.5 text-sm text-slate-600 py-1">
                          <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                          <span><span className="font-semibold text-slate-700 capitalize">{key.replace(/_/g, " ")}:</span> {typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                        </li>
                      ))}
                      {product.material && (
                        <li className="flex items-start gap-2.5 text-sm text-slate-600 py-1">
                          <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                          <span><span className="font-semibold text-slate-700">Material:</span> {product.material}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Applications / Use Cases */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2" style={{ fontFamily: "Chivo" }}>
                    <Building2 size={16} className="text-slate-400" /> Applications
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: "Hospitals & Multi-Specialty Centers", icon: Building2 },
                      { label: "Surgical Procedures", icon: Stethoscope },
                      { label: "Clinics & Diagnostic Centers", icon: ClipboardList },
                      { label: "Emergency & Trauma Care", icon: Shield },
                    ].map(({ label, icon: Ic }) => (
                      <div key={label} className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3">
                        <Ic size={16} className="text-emerald-600 shrink-0" />
                        <span className="text-sm text-slate-600 font-medium">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick specs summary table */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-3" style={{ fontFamily: "Chivo" }}>Product Details</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[
                      { l: "Manufacturer", v: product.manufacturer },
                      { l: "Division", v: product.division },
                      product.category ? { l: "Category", v: product.category } : null,
                      product.material ? { l: "Material", v: product.material } : null,
                      product.pack_size ? { l: "Pack Size", v: product.pack_size } : null,
                      product.sku_code ? { l: "SKU Code", v: product.sku_code } : null,
                    ].filter(Boolean).map(({ l, v }) => (
                      <div key={l} className="bg-slate-50 rounded-lg px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{l}</p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Specifications Tab ── */}
            {activeTab === 1 && specEntries.length > 0 && (
              <div data-testid="tab-content-specs">
                <h3 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2" style={{ fontFamily: "Chivo" }}>
                  <FileText size={16} className="text-slate-400" /> Technical Specifications
                </h3>
                <div className="rounded-lg overflow-hidden border border-slate-200">
                  <table className="w-full text-sm" data-testid="specs-table">
                    <thead>
                      <tr className="bg-[#0B1F3F] text-white">
                        <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider">Attribute</th>
                        <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fullSpecRows.map(([key, value], i) => (
                        <tr key={key + i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="px-5 py-3 font-semibold text-slate-700 capitalize whitespace-nowrap">{key}</td>
                          <td className="px-5 py-3 text-slate-600">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Sizes Tab ── */}
            {activeTab === 2 && hasSizes && (
              <div data-testid="tab-content-sizes">
                <h3 className="text-base font-bold text-slate-900 mb-4" style={{ fontFamily: "Chivo" }}>Available Sizes & Variants</h3>
                <div className="flex flex-wrap gap-2">
                  {product.size_variables.map((s) => (
                    <span key={s} className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-sm font-mono rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors cursor-default">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ════════ NEED HELP BANNER ════════ */}
        <div className="mt-8 bg-[#0B1F3F] rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4" data-testid="help-banner">
          <div>
            <h3 className="text-white font-bold text-lg" style={{ fontFamily: "Chivo" }}>Need Technical Assistance?</h3>
            <p className="text-slate-300 text-sm mt-1">Our product specialists can help with sizing, compatibility, and clinical applications.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <a href="tel:+917416521222" className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-colors border border-white/20">
              <Phone size={14} /> Call Now
            </a>
            <Link to="/contact" className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors" data-testid="contact-specialist-link">
              Contact Specialist <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* ════════ RELATED PRODUCTS ════════ */}
        {related.length > 0 && (
          <div className="mt-12" data-testid="related-products">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Chivo" }}>You May Also Like</h2>
                <p className="text-sm text-slate-400 mt-1">More from {product.division}</p>
              </div>
              <Link
                to={`/products?division=${encodeURIComponent(product.division)}`}
                className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition-colors flex items-center gap-1"
              >
                View All <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((rp) => <RelatedCard key={rp.id} product={rp} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
