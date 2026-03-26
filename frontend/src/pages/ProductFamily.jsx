import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Package, FileText, Download, ChevronRight,
  Phone, Mail, MessageCircle, Shield, Award, Building2,
  Box, Factory, Tag, Layers, BadgeCheck, Search
} from "lucide-react";
import { getProductFamilyDetail, submitLead } from "../lib/api";
import { toast } from "sonner";
import { SEO, buildBreadcrumbSchema } from "../components/SEO";

const API = process.env.REACT_APP_BACKEND_URL;

const DISTRICTS = ["Hyderabad","Rangareddy","Medchal-Malkajgiri","Sangareddy","Nalgonda","Warangal","Karimnagar","Khammam","Nizamabad","Adilabad","Mahabubnagar","Medak","Siddipet","Suryapet","Jagtial","Peddapalli","Kamareddy","Mancherial","Wanaparthy","Nagarkurnool","Vikarabad","Jogulamba Gadwal","Rajanna Sircilla","Kumuram Bheem","Mulugu","Narayanpet","Mahabubabad","Jayashankar","Jangaon","Nirmal","Yadadri","Bhadradri","Hanumakonda"];

export default function ProductFamily() {
  const { familyName } = useParams();
  const decodedName = decodeURIComponent(familyName);
  const [family, setFamily] = useState(null);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [variantSearch, setVariantSearch] = useState("");
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showBrochureForm, setShowBrochureForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", hospital_clinic: "", phone_whatsapp: "", email: "", district: "", message: "" });
  const [brochureData, setBrochureData] = useState({ name: "", phone: "", email: "", hospital: "", district: "" });
  const [submitting, setSubmitting] = useState(false);
  const [brochureSubmitting, setBrochureSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    window.scrollTo(0, 0);
    getProductFamilyDetail(decodedName)
      .then((r) => {
        setFamily(r.data.family);
        setVariants(r.data.variants);
      })
      .catch(() => toast.error("Product family not found"))
      .finally(() => setLoading(false));
  }, [decodedName]);

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
        product_interest: decodedName,
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
          <p className="text-sm text-slate-400">Loading product range...</p>
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="text-center py-40 font-[Manrope]">
        <Package size={48} className="mx-auto text-slate-300 mb-4" />
        <p className="text-slate-700 font-semibold">Product range not found</p>
        <Link to="/products" className="text-teal-600 font-medium mt-3 inline-block hover:text-teal-700 transition-colors">
          Back to Products
        </Link>
      </div>
    );
  }

  const imageUrl = family.images && family.images.length > 0
    ? `${API}/api/files/${family.images[0].storage_path}`
    : undefined;

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Products", url: "/products" },
    { name: family.division, url: `/products?division=${encodeURIComponent(family.division)}` },
    { name: decodedName },
  ];

  // Build smart column headers from variant data
  const allSpecs = {};
  variants.forEach(v => {
    if (v.technical_specifications) {
      Object.keys(v.technical_specifications).forEach(k => {
        if (!['system', 'type'].includes(k)) allSpecs[k] = true;
      });
    }
  });
  const specColumns = Object.keys(allSpecs).slice(0, 4);

  // Filter variants by search
  const filteredVariants = variantSearch
    ? variants.filter(v =>
        v.product_name.toLowerCase().includes(variantSearch.toLowerCase()) ||
        v.sku_code.toLowerCase().includes(variantSearch.toLowerCase()) ||
        (v.description || "").toLowerCase().includes(variantSearch.toLowerCase())
      )
    : variants;

  return (
    <div className="min-h-screen bg-white font-[Manrope]">
      <SEO
        title={`${decodedName} - Product Range`}
        description={family.description || `${decodedName} from ${family.manufacturer}. ${family.variant_count} variants available.`}
        canonical={`/products/family/${encodeURIComponent(decodedName)}`}
        image={imageUrl}
        jsonLd={[buildBreadcrumbSchema(breadcrumbs)]}
      />

      {/* ===== DARK HERO ===== */}
      <section className="bg-slate-900 relative overflow-hidden" data-testid="family-hero">
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500 via-transparent to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-8 lg:py-10">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-4" data-testid="breadcrumb">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={12} />
            <Link to="/products" className="hover:text-white transition-colors">Products</Link>
            <ChevronRight size={12} />
            <Link to={`/products?division=${encodeURIComponent(family.division)}`} className="hover:text-white transition-colors">{family.division}</Link>
            <ChevronRight size={12} />
            <span className="text-white font-medium truncate max-w-[250px]">{decodedName}</span>
          </nav>
          <Link to="/products" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors" data-testid="back-link">
            <ArrowLeft size={14} /> Back to All Products
          </Link>
        </div>
      </section>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-7xl mx-auto px-6 py-10 lg:py-14">

        {/* ═══ FAMILY OVERVIEW ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Image */}
          <div className="lg:col-span-5">
            <div className="sticky top-20 bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden" data-testid="family-image">
              <div className="aspect-square flex items-center justify-center overflow-hidden p-6">
                {imageUrl ? (
                  <img src={imageUrl} alt={decodedName} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center">
                    <Package size={80} className="text-slate-200 mx-auto" />
                    <p className="text-xs text-slate-400 mt-4 font-medium">Product Image Coming Soon</p>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap gap-2">
                {[family.division, family.category, family.material].filter(Boolean).map((t) => (
                  <span key={t} className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="lg:col-span-7 space-y-6" data-testid="family-info">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full" data-testid="family-division">
                {family.division}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                {family.category}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                <Layers size={10} /> {family.variant_count} variants
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight" data-testid="family-name">
              {decodedName}
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed" data-testid="family-description">
              {family.description}
            </p>

            {/* Quick attributes */}
            <div className="flex flex-wrap gap-2">
              {family.material && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                  <Box size={13} className="text-teal-500" /> {family.material}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                <Factory size={13} className="text-teal-500" /> {family.manufacturer}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                <Tag size={13} className="text-teal-500" /> {family.variant_count} SKUs available
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3 pt-2" data-testid="family-cta">
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setShowQuoteForm(true)} className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20" data-testid="request-quote-btn">
                  <Mail size={16} /> Request Bulk Quote
                </button>
                <a href={`https://wa.me/917416521222?text=${encodeURIComponent(`Hi, I'm interested in the ${decodedName} range. Can you share pricing and availability?`)}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-[#25D366] text-white text-sm font-bold rounded-xl hover:bg-[#1DA851] transition-all shadow-lg shadow-[#25D366]/20" data-testid="whatsapp-enquiry-btn">
                  <MessageCircle size={16} /> WhatsApp Enquiry
                </a>
              </div>
              <div className="flex gap-3">
                <a href="tel:+917416521222" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors" data-testid="call-btn">
                  <Phone size={14} /> Call Sales Team
                </a>
                {family.brochure ? (
                  <button onClick={() => setShowBrochureForm(true)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-teal-200 text-teal-700 text-sm font-semibold rounded-xl hover:bg-teal-50 transition-colors" data-testid="brochure-btn">
                    <Download size={14} /> Download Brochure
                  </button>
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

        {/* ═══ VARIANTS TABLE ═══ */}
        <div className="mt-14" data-testid="variants-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Available Variants & Sizes</h2>
              <p className="text-sm text-slate-500 mt-1">{variants.length} SKUs in this product range</p>
            </div>
            {variants.length > 5 && (
              <div className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={variantSearch}
                  onChange={(e) => setVariantSearch(e.target.value)}
                  placeholder="Search variants, SKUs..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 transition-colors"
                  data-testid="variant-search-input"
                />
              </div>
            )}
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white" data-testid="variants-table-wrapper">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="variants-table">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Product Name</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">SKU Code</th>
                    {specColumns.map(col => (
                      <th key={col} className="text-left px-5 py-3.5 font-semibold text-xs uppercase tracking-wider whitespace-nowrap capitalize">{col.replace(/_/g, " ")}</th>
                    ))}
                    <th className="text-center px-5 py-3.5 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVariants.map((v, i) => (
                    <tr
                      key={v.id}
                      className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} border-t border-slate-100 hover:bg-teal-50/30 transition-colors`}
                      data-testid={`variant-row-${v.sku_code}`}
                    >
                      <td className="px-5 py-3 font-medium text-slate-800 max-w-[300px]">
                        <span className="line-clamp-1">{v.product_name}</span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{v.sku_code}</td>
                      {specColumns.map(col => (
                        <td key={col} className="px-5 py-3 text-slate-600 whitespace-nowrap">
                          {v.technical_specifications?.[col] || "—"}
                        </td>
                      ))}
                      <td className="px-5 py-3 text-center">
                        <Link
                          to={`/products/${v.id}`}
                          className="inline-flex items-center gap-1 text-xs text-teal-600 font-semibold hover:text-teal-700 transition-colors"
                          data-testid={`view-variant-${v.sku_code}`}
                        >
                          Details <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredVariants.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">No variants match your search.</div>
            )}
          </div>
        </div>

        {/* ═══ NEED HELP BANNER ═══ */}
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
      </div>

      {/* ═══ QUOTE FORM MODAL ═══ */}
      {showQuoteForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowQuoteForm(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" data-testid="quote-modal">
            <div className="bg-slate-900 px-6 py-5">
              <h3 className="text-white font-bold text-lg">Request Bulk Quote</h3>
              <p className="text-slate-400 text-xs mt-1">For: {decodedName} ({family.variant_count} variants)</p>
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
                <button type="button" onClick={() => setShowQuoteForm(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors">
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ BROCHURE DOWNLOAD MODAL ═══ */}
      {showBrochureForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowBrochureForm(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" data-testid="brochure-modal">
            <div className="bg-teal-700 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Download size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Download Brochure</h3>
                  <p className="text-teal-200 text-xs mt-0.5">{decodedName}</p>
                </div>
              </div>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!brochureData.name || !brochureData.phone) {
                  toast.error("Name and phone number are required");
                  return;
                }
                setBrochureSubmitting(true);
                try {
                  // Use the first variant's ID for the brochure download
                  const firstVariantId = variants.length > 0 ? variants[0].id : "";
                  const res = await fetch(`${API}/api/brochure-download`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...brochureData, product_id: firstVariantId }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.detail || "Failed");
                  toast.success("Brochure download starting!");
                  setShowBrochureForm(false);
                  setBrochureData({ name: "", phone: "", email: "", hospital: "", district: "" });
                  const link = document.createElement("a");
                  link.href = `${API}${data.download_url}`;
                  link.download = `${decodedName} - Brochure.pdf`;
                  link.target = "_blank";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } catch {
                  toast.error("Failed to download. Please try again.");
                } finally {
                  setBrochureSubmitting(false);
                }
              }}
              className="p-6 space-y-3"
              data-testid="brochure-form"
            >
              <p className="text-xs text-slate-500 mb-1">Fill in your details to download the product brochure.</p>
              <input type="text" placeholder="Your Name *" value={brochureData.name} onChange={(e) => setBrochureData({ ...brochureData, name: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all" data-testid="brochure-name-input" />
              <input type="tel" placeholder="WhatsApp / Phone Number *" value={brochureData.phone} onChange={(e) => setBrochureData({ ...brochureData, phone: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all" data-testid="brochure-phone-input" />
              <input type="email" placeholder="Email Address" value={brochureData.email} onChange={(e) => setBrochureData({ ...brochureData, email: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all" data-testid="brochure-email-input" />
              <input type="text" placeholder="Hospital / Clinic Name" value={brochureData.hospital} onChange={(e) => setBrochureData({ ...brochureData, hospital: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all" data-testid="brochure-hospital-input" />
              <select value={brochureData.district} onChange={(e) => setBrochureData({ ...brochureData, district: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 bg-white transition-all" data-testid="brochure-district-select">
                <option value="">Select District (Optional)</option>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowBrochureForm(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={brochureSubmitting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors">
                  <Download size={14} /> {brochureSubmitting ? "Downloading..." : "Download PDF"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
