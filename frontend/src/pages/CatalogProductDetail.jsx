import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, Package, Tag, Box, Factory,
  Phone, MessageCircle, Mail, Download, FileText, Shield,
  Award, BadgeCheck, Building2, Layers, Link2, GitCompare,
  Stethoscope, ClipboardList, CheckCircle2, Bone, BookOpen,
  HeartPulse, Microscope, Activity, Search, ChevronDown, ChevronUp
} from "lucide-react";
import { getCatalogProduct, submitLead } from "../lib/api";
import { toast } from "sonner";
import LeadCaptureModal from "../components/LeadCaptureModal";
import { SEO, buildProductSchema, buildBreadcrumbSchema } from "../components/SEO";

const API = process.env.REACT_APP_BACKEND_URL;
const DISTRICTS = ["Hyderabad","Rangareddy","Medchal-Malkajgiri","Sangareddy","Nalgonda","Warangal","Karimnagar","Khammam","Nizamabad","Adilabad","Mahabubnagar","Medak","Siddipet","Suryapet","Jagtial","Peddapalli","Kamareddy","Mancherial","Wanaparthy","Nagarkurnool","Vikarabad","Jogulamba Gadwal","Rajanna Sircilla","Kumuram Bheem","Mulugu","Narayanpet","Mahabubabad","Jayashankar","Jangaon","Nirmal","Yadadri","Bhadradri","Hanumakonda"];

const DIVISION_ICON_MAP = {
  "Trauma": Bone,
  "Cardiovascular": HeartPulse,
  "Diagnostics": Microscope,
  "Joint Replacement": Activity,
};

// Category-specific placeholder icons
function CategoryPlaceholder({ category, division }) {
  const cat = (category || "").toLowerCase();
  const DivIcon = DIVISION_ICON_MAP[division] || Bone;
  let label = division || "Medical Device";
  if (cat.includes("plate")) label = "Plating System";
  else if (cat.includes("nail")) label = "Intramedullary Nail";
  else if (cat.includes("screw") || cat.includes("bolt") || cat.includes("locking")) label = "Fixation Hardware";
  else if (cat.includes("instrument")) label = "Surgical Instrument";
  else if (cat.includes("stent")) label = "Coronary Stent";
  else if (cat.includes("valve")) label = "Heart Valve";
  else if (cat.includes("knee")) label = "Knee Implant";
  else if (cat.includes("hip")) label = "Hip Implant";
  else if (cat.includes("reagent")) label = "Diagnostic Reagent";
  else if (cat.includes("test")) label = "Diagnostic Test";
  else if (cat.includes("analyzer")) label = "Analyzer System";
  else if (cat.includes("implant")) label = "Medical Implant";
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-6">
      <div className="w-24 h-24 rounded-sm bg-[#0A0A0A]/5 border border-white/10 flex items-center justify-center">
        <DivIcon size={40} className="text-white/25" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-white/50">{label}</p>
        <p className="text-[10px] text-white/45 mt-0.5">Product image coming soon</p>
      </div>
    </div>
  );
}

// Brand display with parent company
function BrandDisplay({ brand, parentBrand }) {
  if (!brand) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2.5 py-1 rounded" data-testid="catalog-brand-badge">
      {brand}
      {parentBrand && parentBrand !== brand && (
        <span className="text-[#D4AF37] font-medium normal-case tracking-normal"> by {parentBrand}</span>
      )}
    </span>
  );
}

// Related products bucket component
const ACCENT_COLORS = {
  emerald: { badge: "text-[#2DD4BF] bg-[#2DD4BF]/10 border-[#2DD4BF]/20", label: "text-[#2DD4BF]" },
  amber: { badge: "text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/20", label: "text-[#D4AF37]" },
  blue: { badge: "text-[#2DD4BF] bg-[#2DD4BF]/10 border-[#2DD4BF]/20", label: "text-[#2DD4BF]" },
};

function RelatedBucket({ title, subtitle, items, divSlug, accentColor = "amber" }) {
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.amber;
  const DivIcon = Bone;
  return (
    <div data-testid={`related-bucket-${accentColor}`}>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-white/90 uppercase tracking-[0.1em]">{title}</h3>
        <p className="text-xs text-white/45 mt-0.5">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.slice(0, 8).map((item) => (
          <Link
            key={item.slug}
            to={`/catalog/products/${item.slug}`}
            className="group bg-[#0A0A0A] border border-white/[0.06] rounded-sm overflow-hidden hover:shadow-md hover:border-white/10 transition-all duration-200"
            data-testid={`related-item-${item.slug}`}
          >
            <div className="h-28 bg-white/5 flex items-center justify-center">
              <DivIcon size={28} className="text-slate-200" />
            </div>
            <div className="p-3">
              <span className={`inline-block text-[9px] font-bold border px-1.5 py-0.5 rounded-md mb-1.5 ${colors.badge}`}>
                {item.relationship_label}
              </span>
              <h4 className="text-xs font-bold text-white line-clamp-2 group-hover:text-[#D4AF37] transition-colors leading-snug">
                {item.product_name_display}
              </h4>
              {item.clinical_subtitle && (
                <p className="text-[10px] text-white/45 mt-1 line-clamp-1">{item.clinical_subtitle}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function CatalogProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", hospital_clinic: "", phone_whatsapp: "", email: "", district: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [skuSearch, setSkuSearch] = useState("");
  const [skuPage, setSkuPage] = useState(1);
  const [skuExpanded, setSkuExpanded] = useState(true);
  const [relatedBuckets, setRelatedBuckets] = useState(null);
  const [leadModal, setLeadModal] = useState({ open: false, inquiryType: "", productInterest: "", whatsappMessage: "", source: "" });
  const SKU_PAGE_SIZE = 30;

  useEffect(() => {
    setLoading(true);
    setRelatedBuckets(null);
    window.scrollTo(0, 0);
    getCatalogProduct(slug)
      .then((r) => setProduct(r.data))
      .catch(() => toast.error("Product not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  // Fetch relationship-based related products
  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/api/catalog/products/${slug}/related`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setRelatedBuckets(data); })
      .catch(() => {});
  }, [slug]);

  const handleSubmitQuote = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone_whatsapp) {
      toast.error("Name and phone number are required");
      return;
    }
    setSubmitting(true);
    try {
      await submitLead({ ...formData, inquiry_type: "Bulk Quote", product_interest: product?.product_name_display || "", source: "catalog" });
      toast.success("Quote request submitted! We'll contact you shortly.");
      setShowQuoteForm(false);
      setFormData({ name: "", hospital_clinic: "", phone_whatsapp: "", email: "", district: "", message: "" });
    } catch { toast.error("Failed to submit. Please try again."); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-40 bg-[#0A0A0A]"><div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" /></div>;
  if (!product) return <div className="text-center py-40 bg-[#0A0A0A]"><Package size={48} className="mx-auto text-white/35 mb-4" /><p className="text-white/70 font-semibold">Product not found</p><Link to="/catalog" className="text-[#D4AF37] font-medium mt-3 inline-block">Back to Products</Link></div>;

  const specs = product.technical_specifications || {};
  const specEntries = Object.entries(specs).filter(([, v]) => v !== null && v !== "");
  const isbrochureImage = product.image_type === "brochure_cover";
  const imageUrl = product.images?.length > 0 ? `${API}/api/files/${product.images[0].storage_path}` : undefined;
  const brochureDownloadUrl = product.brochure_url ? `${API}/api/files/${product.brochure_url}` : null;
  const skus = product.skus || [];
  const divSlug = product.division_slug || product.division?.toLowerCase().replace(/\s/g, "-") || "trauma";
  const divName = product.division || "Trauma";

  // SEO: Build descriptive alt text for product images
  const productAltText = [
    product.product_name_display,
    product.brand ? `by ${product.brand}` : null,
    product.material ? `made of ${product.material}` : null,
    product.category ? `(${product.category})` : null,
    "— Meril medical device available from Agile Healthcare, Telangana"
  ].filter(Boolean).join(" ");

  // SEO: Build JSON-LD schemas
  const productJsonLd = [
    buildProductSchema(
      { ...product, product_name: product.product_name_display, division: divName },
      imageUrl
    ),
    buildBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Product Catalog", url: "/catalog" },
      { name: divName, url: `/catalog/${divSlug}` },
      ...(product.category ? [{ name: product.category, url: `/catalog/${divSlug}?category=${encodeURIComponent(product.category)}` }] : []),
      { name: product.product_name_display }
    ])
  ];

  const productSeoDescription = [
    product.description,
    product.brand ? `Brand: ${product.brand}.` : null,
    product.material ? `Material: ${product.material}.` : null,
    skus.length > 0 ? `${skus.length} SKU variants available.` : null,
    "Order from Agile Healthcare — authorized Meril distributor in Telangana."
  ].filter(Boolean).join(" ").slice(0, 300);

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-[Manrope]" data-testid="catalog-product-detail">
      <SEO
        title={`${product.product_name_display}${product.brand ? ` — ${product.brand}` : ''} | ${divName}`}
        description={productSeoDescription}
        canonical={`/catalog/products/${product.slug}`}
        image={imageUrl}
        type="product"
        jsonLd={productJsonLd}
      />
      {/* ===== HERO BANNER ===== */}
      <section className="bg-[#0D0D0D] relative overflow-hidden" data-testid="catalog-detail-hero">
        <div className="absolute inset-0 opacity-10"><div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent" /></div>
        <div className="relative max-w-7xl mx-auto px-6 py-8 lg:py-10">
          <nav className="flex items-center gap-1.5 text-sm text-white/45 mb-4 flex-wrap" data-testid="catalog-detail-breadcrumb">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={12} />
            <Link to="/catalog" className="hover:text-white transition-colors">Products</Link>
            <ChevronRight size={12} />
            <Link to={`/catalog/${divSlug}`} className="hover:text-white transition-colors">{divName}</Link>
            {product.category && (<><ChevronRight size={12} /><Link to={`/catalog/${divSlug}?category=${encodeURIComponent(product.category)}`} className="hover:text-white transition-colors">{product.category}</Link></>)}
            <ChevronRight size={12} />
            <span className="text-white font-medium truncate max-w-[250px]">{product.product_name_display}</span>
          </nav>
          <Link to={`/catalog/${divSlug}`} className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white transition-colors" data-testid="catalog-back-link">
            <ArrowLeft size={14} /> Back to {divName} Catalog
          </Link>
        </div>
      </section>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-7xl mx-auto px-6 py-10 lg:py-14">

        {/* ════════ SECTION 1: PRODUCT FAMILY INFORMATION ════════ */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45 bg-white/5 border border-white/10 px-2.5 py-1 rounded">Product Family</span>
            {product.enriched_from_shadow && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#2DD4BF] bg-[#2DD4BF]/10 border border-emerald-200 px-2 py-0.5 rounded" data-testid="enrichment-badge">
                <BadgeCheck size={10} /> Brochure Verified
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left: Image Area */}
          <div className="lg:col-span-5">
            <div className="sticky top-20 space-y-4" data-testid="catalog-product-image">
              {/* Main product visual */}
              <div className="bg-white/5 border border-white/[0.06] rounded-sm overflow-hidden">
                <div className="aspect-square flex items-center justify-center overflow-hidden p-6">
                  {imageUrl && !isbrochureImage ? (
                    <img src={imageUrl} alt={productAltText} className="w-full h-full object-contain" data-testid="catalog-detail-image" />
                  ) : (
                    <CategoryPlaceholder category={product.category} division={divName} />
                  )}
                </div>
                <div className="px-5 py-4 border-t border-white/[0.06] flex flex-wrap gap-2" data-testid="catalog-product-tags">
                  <BrandDisplay brand={product.brand} parentBrand={product.parent_brand} />
                  <span className="text-xs font-medium text-white/40 bg-[#0A0A0A] border border-white/10 px-3 py-1 rounded">{product.division}</span>
                  {product.category && <span className="text-xs font-medium text-white/40 bg-[#0A0A0A] border border-white/10 px-3 py-1 rounded">{product.category}</span>}
                  {product.material && <span className="text-xs font-medium text-white/40 bg-[#0A0A0A] border border-white/10 px-3 py-1 rounded">{product.material}</span>}
                </div>
              </div>

              {/* Brochure thumbnail (secondary — only if image is brochure type) */}
              {imageUrl && isbrochureImage && (
                <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-3 flex items-center gap-3" data-testid="catalog-brochure-thumbnail">
                  <div className="w-16 h-20 bg-white/5 rounded-sm overflow-hidden border border-white/[0.06] shrink-0">
                    <img src={imageUrl} alt={`Product brochure for ${product.product_name_display} — ${divName} medical device by Meril`} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white/70 flex items-center gap-1.5"><BookOpen size={12} className="text-[#D4AF37]" /> Product Brochure</p>
                    <p className="text-[10px] text-white/45 mt-0.5 truncate">{product.shadow_source_files?.[0] || "Manufacturer brochure"}</p>
                  </div>
                  {brochureDownloadUrl ? (
                    <a href={brochureDownloadUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold rounded-sm border border-[#D4AF37]/20 hover:bg-[#D4AF37]/10 transition-colors shrink-0" data-testid="catalog-brochure-download">
                      <Download size={12} /> PDF
                    </a>
                  ) : (
                    <span className="text-[10px] text-white/45 px-2">View Only</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Product Family Info */}
          <div className="lg:col-span-7 space-y-6" data-testid="catalog-product-info">
            {/* Brand + Division — P1: "AURIC by Meril" */}
            <div className="flex items-center gap-2 flex-wrap">
              <BrandDisplay brand={product.brand} parentBrand={product.parent_brand} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#2DD4BF] bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 px-2.5 py-1 rounded" data-testid="catalog-division-badge">{product.division}</span>
              {product.category && <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 bg-white/5 border border-white/[0.06] px-2.5 py-1 rounded">{product.category}</span>}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight" data-testid="catalog-product-name">{product.product_name_display}</h1>

            {/* Clinical subtitle: Brand • Material • Coating */}
            {product.clinical_subtitle && (
              <p className="text-sm text-white/40 font-medium" data-testid="catalog-clinical-subtitle">{product.clinical_subtitle}</p>
            )}

            {/* P0: Renamed "Primary SKU" → "Family Code" */}
            {product.sku_code && (
              <p className="text-xs font-mono text-white/45 flex items-center gap-1.5" data-testid="catalog-family-code">
                <Tag size={11} /> Family Code: <span className="text-white/50 font-semibold">{product.sku_code}</span>
              </p>
            )}

            {/* Description */}
            <p className="text-sm sm:text-base text-white/50 leading-relaxed" data-testid="catalog-product-description">{product.description}</p>

            {/* Quick attribute chips */}
            <div className="flex flex-wrap gap-2">
              {product.material && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/50 bg-white/5 border border-white/[0.06] px-3 py-2 rounded-sm">
                  <Box size={13} className="text-[#D4AF37]" /> {product.material}
                </span>
              )}
              {product.pack_size && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/50 bg-white/5 border border-white/[0.06] px-3 py-2 rounded-sm">
                  <Layers size={13} className="text-[#D4AF37]" /> Pack: {product.pack_size}
                </span>
              )}
              {product.manufacturer && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/50 bg-white/5 border border-white/[0.06] px-3 py-2 rounded-sm">
                  <Factory size={13} className="text-[#D4AF37]" /> {product.manufacturer}
                </span>
              )}
              {skus.length > 0 && (
                <a href="#sku-table" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-3 py-2 rounded-sm hover:bg-[#D4AF37]/10 transition-colors">
                  <Layers size={13} /> {skus.length} SKU {skus.length === 1 ? "Variant" : "Variants"} <ChevronRight size={11} />
                </a>
              )}
            </div>

            {/* Key specs — P0: Title-cased labels */}
            {specEntries.length > 0 && (
              <div className="bg-white/5 border border-white/[0.06] rounded-sm p-6" data-testid="catalog-key-specs">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Stethoscope size={15} className="text-[#D4AF37]" /> Key Specifications
                </h3>
                <ul className="space-y-2.5">
                  {specEntries.slice(0, 6).map(([key, value]) => (
                    <li key={key} className="flex items-start gap-2.5 text-sm text-white/50">
                      <div className="w-5 h-5 rounded-full bg-[#2DD4BF]/15 flex items-center justify-center mt-0.5 shrink-0">
                        <CheckCircle2 size={12} className="text-[#2DD4BF]" />
                      </div>
                      <span><span className="font-semibold text-white/70">{key}:</span> {typeof value === "object" ? (Array.isArray(value) ? value.join(", ") : JSON.stringify(value)) : String(value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dedicated Brochure Download Section — P1 */}
            {(brochureDownloadUrl || product.shadow_source_files?.length > 0) && (
              <div className="bg-[#D4AF37]/10/50 border border-[#D4AF37]/20 rounded-sm p-5 flex items-center justify-between gap-4" data-testid="catalog-brochure-section">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white/90">Product Documentation</p>
                    <p className="text-xs text-white/40 mt-0.5">{product.shadow_source_files?.[0] || "Product brochure / IFU"}</p>
                  </div>
                </div>
                {brochureDownloadUrl ? (
                  <a href={brochureDownloadUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2.5 bg-[#D4AF37] text-white text-xs font-bold rounded-sm hover:bg-[#F2C94C] transition-colors shrink-0 shadow-sm" data-testid="catalog-brochure-btn">
                    <Download size={13} /> Download Brochure
                  </a>
                ) : (
                  <Link to="/contact" className="flex items-center gap-1.5 px-4 py-2.5 border border-amber-300 text-[#D4AF37] text-xs font-bold rounded-sm hover:bg-[#D4AF37]/10 transition-colors shrink-0">
                    <Mail size={13} /> Request Datasheet
                  </Link>
                )}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="space-y-3 pt-2" data-testid="catalog-cta">
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setShowQuoteForm(true)} className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-[#D4AF37] text-white text-sm font-bold rounded-sm hover:bg-[#F2C94C] transition-all shadow-lg shadow-amber-600/20" data-testid="catalog-request-quote-btn">
                  <Mail size={16} /> Request Bulk Quote
                </button>
                <button onClick={() => setLeadModal({ open: true, inquiryType: "Product Enquiry", productInterest: product.product_name_display, whatsappMessage: `Hi, I'm interested in ${product.product_name_display}${product.brand ? ` (${product.brand})` : ""}. Can you share pricing and availability?`, source: "product_detail" })}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-[#25D366] text-white text-sm font-bold rounded-sm hover:bg-[#1DA851] transition-all shadow-lg shadow-[#25D366]/20" data-testid="catalog-whatsapp-btn">
                  <MessageCircle size={16} /> WhatsApp Enquiry
                </button>
              </div>
              <a href="tel:+917416521222" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 text-white/50 text-sm font-semibold rounded-sm hover:bg-white/5 transition-colors">
                <Phone size={14} /> Call Sales Team
              </a>
              <Link
                to={`/catalog/compare?products=${product.slug}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 text-white/50 text-sm font-semibold rounded-sm hover:bg-white/5 hover:border-amber-300 transition-colors"
                data-testid="catalog-compare-btn"
              >
                <GitCompare size={14} /> Compare with Similar
              </Link>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.06]" data-testid="catalog-trust-badges">
              {[
                { icon: Shield, label: "ISO 13485 Certified", sub: "Quality Management" },
                { icon: Award, label: "CE Mark Compliant", sub: "European Standard" },
                { icon: BadgeCheck, label: "CDSCO Approved", sub: "Indian Regulatory" },
                { icon: Building2, label: "Authorized Distributor", sub: "Telangana Region" },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-sm bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0"><Icon size={16} className="text-[#D4AF37]" /></div>
                  <div><span className="text-xs font-bold text-white/70 leading-tight block">{label}</span><span className="text-[10px] text-white/45 leading-tight">{sub}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════════ SECTION 2: SKU / VARIANT INFORMATION ════════ */}
        {skus.length > 0 && (
          <div className="mt-14" id="sku-table" data-testid="catalog-sku-section">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2.5 py-1 rounded">SKU / Variant Information</span>
                <span className="text-sm text-white/45">{skus.length} {skus.length === 1 ? "variant" : "variants"} available</span>
              </div>
              <div className="flex items-center gap-2">
                {/* CSV Export */}
                <button
                  onClick={() => {
                    const parsedCols = product.sku_parsed_columns || [];
                    const colLabels = { side: "Side", holes: "Holes", length_mm: "Length (mm)", plate_type: "Plate Subtype", diameter_mm: "Dia. (mm)" };
                    const headers = ["#", "SKU Code", ...parsedCols.map(c => colLabels[c] || c), "Brand", "Source"];
                    const rows = skus.map((s, i) => {
                      const p = s.parsed || {};
                      return [i + 1, s.sku_code, ...parsedCols.map(c => p[c] ?? ""), s.brand || "", s.source === "shadow" ? "Brochure" : "Catalog"].join(",");
                    });
                    const csv = [headers.join(","), ...rows].join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${product.slug || "skus"}_variants.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white/40 bg-white/5 border border-white/10 rounded-sm hover:bg-white/5 transition-colors"
                  data-testid="sku-export-csv"
                >
                  <Download size={12} /> Export CSV
                </button>
                {skus.length > SKU_PAGE_SIZE && (
                  <button onClick={() => setSkuExpanded(!skuExpanded)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white/40 bg-white/5 border border-white/10 rounded-sm hover:bg-white/5 transition-colors">
                    {skuExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {skuExpanded ? "Collapse" : "Expand"}
                  </button>
                )}
              </div>
            </div>

            {/* SKU Search */}
            {skus.length > 10 && (
              <div className="mb-4 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
                <input
                  type="text" value={skuSearch} onChange={(e) => { setSkuSearch(e.target.value); setSkuPage(1); }}
                  placeholder="Search SKU codes, side, length..."
                  className="w-full sm:w-80 pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-sm text-sm text-white/70 placeholder-white/30 focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                  data-testid="sku-search-input"
                />
              </div>
            )}

            {(() => {
              const parsedCols = product.sku_parsed_columns || [];
              const colLabels = { side: "Side", holes: "Holes", length_mm: "Length (mm)", plate_type: "Plate Subtype", diameter_mm: "Dia. (mm)" };
              const hasDesc = skus.some((s) => s.description);

              // Filter SKUs
              const query = skuSearch.toLowerCase().trim();
              const filtered = query ? skus.filter(s => {
                const p = s.parsed || {};
                return s.sku_code.toLowerCase().includes(query) ||
                  (s.brand || "").toLowerCase().includes(query) ||
                  (p.side || "").toLowerCase().includes(query) ||
                  String(p.holes || "").includes(query) ||
                  String(p.length_mm || "").includes(query) ||
                  String(p.plate_type || "").toLowerCase().includes(query) ||
                  (s.product_name || "").toLowerCase().includes(query) ||
                  (s.sub_category || "").toLowerCase().includes(query);
              }) : skus;

              // Paginate
              const totalPages = Math.max(1, Math.ceil(filtered.length / SKU_PAGE_SIZE));
              const pageSkus = skuExpanded ? filtered.slice((skuPage - 1) * SKU_PAGE_SIZE, skuPage * SKU_PAGE_SIZE) : filtered.slice(0, 10);

              return (
                <>
                  {query && <p className="text-xs text-white/45 mb-2">{filtered.length} of {skus.length} SKUs match &quot;{skuSearch}&quot;</p>}

                  <div className="rounded-sm overflow-hidden border border-white/10" data-testid="catalog-sku-table">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-[#0D0D0D] text-white">
                            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap w-12">#</th>
                            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">SKU Code</th>
                            {parsedCols.map(col => (
                              <th key={col} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{colLabels[col] || col}</th>
                            ))}
                            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Product Name</th>
                            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Brand</th>
                            {hasDesc && <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Details</th>}
                            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageSkus.map((sku, i) => {
                            const globalIdx = (skuPage - 1) * SKU_PAGE_SIZE + i;
                            const parsed = sku.parsed || {};
                            return (
                              <tr key={sku.sku_code + globalIdx} className={`${globalIdx % 2 === 0 ? "bg-[#0A0A0A]" : "bg-white/5"} border-t border-white/[0.06] hover:bg-[#D4AF37]/10/30 transition-colors`}>
                                <td className="px-4 py-2.5 text-white/45 font-mono text-xs">{globalIdx + 1}</td>
                                <td className="px-4 py-2.5 font-mono font-semibold text-white/90 whitespace-nowrap text-xs" data-testid={`sku-code-${globalIdx}`}>{sku.sku_code}</td>
                                {parsedCols.map(col => (
                                  <td key={col} className="px-4 py-2.5 text-white/50 whitespace-nowrap text-xs">
                                    {col === "side" ? (
                                      parsed.side ? <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${parsed.side === "Left" ? "bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20" : "bg-orange-50 text-orange-600 border border-orange-100"}`}>{parsed.side}</span> : "—"
                                    ) : col === "length_mm" ? (
                                      parsed.length_mm ? `${parsed.length_mm}mm` : "—"
                                    ) : (
                                      parsed[col] ?? "—"
                                    )}
                                  </td>
                                ))}
                                <td className="px-4 py-2.5 text-white/70 max-w-xs truncate text-xs">{sku.product_name}</td>
                                <td className="px-4 py-2.5 text-white/50 whitespace-nowrap text-xs">{sku.brand || "—"}</td>
                                {hasDesc && <td className="px-4 py-2.5 text-white/40 max-w-sm truncate text-xs">{sku.description || "—"}</td>}
                                <td className="px-4 py-2.5">
                                  {sku.source === "shadow" ? (
                                    brochureDownloadUrl ? (
                                      <a href={brochureDownloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2DD4BF] bg-[#2DD4BF]/10 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors" data-testid={`sku-source-${globalIdx}`}>
                                        <BookOpen size={9} /> View Brochure
                                      </a>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2DD4BF] bg-[#2DD4BF]/10 px-2 py-0.5 rounded border border-emerald-200">
                                        <BookOpen size={9} /> Brochure
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/10">Catalog</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination controls */}
                  {skuExpanded && totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4" data-testid="sku-pagination">
                      <p className="text-xs text-white/45">
                        Showing {(skuPage - 1) * SKU_PAGE_SIZE + 1}-{Math.min(skuPage * SKU_PAGE_SIZE, filtered.length)} of {filtered.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSkuPage(Math.max(1, skuPage - 1))} disabled={skuPage <= 1}
                          className="px-3 py-1.5 border border-white/10 rounded-sm text-xs font-medium text-white/50 hover:bg-white/5 disabled:opacity-30 transition-colors">Prev</button>
                        <span className="text-xs text-white/45">Page {skuPage} of {totalPages}</span>
                        <button onClick={() => setSkuPage(Math.min(totalPages, skuPage + 1))} disabled={skuPage >= totalPages}
                          className="px-3 py-1.5 border border-white/10 rounded-sm text-xs font-medium text-white/50 hover:bg-white/5 disabled:opacity-30 transition-colors">Next</button>
                      </div>
                    </div>
                  )}

                  {!skuExpanded && filtered.length > 10 && (
                    <button onClick={() => setSkuExpanded(true)} className="mt-3 text-xs font-semibold text-[#D4AF37] hover:text-[#D4AF37] transition-colors">
                      Show all {filtered.length} variants...
                    </button>
                  )}
                </>
              );
            })()}

            {product.shadow_source_files?.length > 0 && (
              <div className="mt-4 flex items-center gap-2 text-xs text-white/45">
                <ClipboardList size={12} />
                <span>Data extracted from: {product.shadow_source_files.map((f, i) => (
                  <span key={f}>{i > 0 && ", "}{brochureDownloadUrl ? <a href={brochureDownloadUrl} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:underline">{f}</a> : f}</span>
                ))}</span>
              </div>
            )}
          </div>
        )}

        {/* ════════ FULL SPECIFICATIONS ════════ */}
        {specEntries.length > 0 && (
          <div className="mt-14" data-testid="catalog-full-specs">
            <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
              <FileText size={18} className="text-[#D4AF37]" /> Technical Specifications
            </h2>
            <div className="rounded-sm overflow-hidden border border-white/10">
              <table className="w-full text-sm">
                <thead><tr className="bg-[#0D0D0D] text-white"><th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider">Attribute</th><th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider">Value</th></tr></thead>
                <tbody>
                  {[
                    ["Product Name", product.product_name_display],
                    product.brand ? ["Brand", `${product.brand}${product.parent_brand && product.parent_brand !== product.brand ? ` by ${product.parent_brand}` : ""}`] : null,
                    product.sku_code ? ["Family Code", product.sku_code] : null,
                    product.material ? ["Material", product.material] : null,
                    ...specEntries.map(([k, v]) => [k, typeof v === "object" ? (Array.isArray(v) ? v.join(", ") : JSON.stringify(v)) : String(v)]),
                    product.pack_size ? ["Pack Size", product.pack_size] : null,
                    product.manufacturer ? ["Manufacturer", product.manufacturer] : null,
                    ["Division", product.division],
                    product.category ? ["Category", product.category] : null,
                  ].filter(Boolean).map(([key, value], i) => (
                    <tr key={key + i} className={`${i % 2 === 0 ? "bg-[#0A0A0A]" : "bg-white/5"} border-t border-white/[0.06]`}>
                      <td className="px-5 py-3 font-semibold text-white/70 whitespace-nowrap">{key}</td>
                      <td className="px-5 py-3 text-white/50">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════ QUOTE FORM MODAL ════════ */}
        {showQuoteForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowQuoteForm(false); }}>
            <div className="bg-[#0A0A0A] rounded-sm shadow-2xl w-full max-w-md overflow-hidden" data-testid="catalog-quote-modal">
              <div className="bg-[#0D0D0D] px-6 py-5">
                <h3 className="text-white font-bold text-lg">Request Bulk Quote</h3>
                <p className="text-white/45 text-xs mt-1">For: {product.product_name_display}{product.brand ? ` (${product.brand})` : ""}</p>
              </div>
              <form onSubmit={handleSubmitQuote} className="p-6 space-y-3">
                <input type="text" placeholder="Your Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-sm text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/10 transition-all" data-testid="catalog-quote-name" />
                <input type="text" placeholder="Hospital / Clinic" value={formData.hospital_clinic} onChange={(e) => setFormData({ ...formData, hospital_clinic: e.target.value })} className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-sm text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/50 transition-all" data-testid="catalog-quote-hospital" />
                <input type="tel" placeholder="WhatsApp Number *" value={formData.phone_whatsapp} onChange={(e) => setFormData({ ...formData, phone_whatsapp: e.target.value })} className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-sm text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/50 transition-all" data-testid="catalog-quote-phone" />
                <input type="email" placeholder="Email Address" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-sm text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/50 transition-all" />
                <select value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })} className="w-full px-3.5 py-2.5 bg-[#0A0A0A] border border-white/10 rounded-sm text-sm text-white/70 outline-none focus:border-[#D4AF37]/50 transition-all">
                  <option value="">Select District (Telangana)</option>
                  {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <textarea placeholder="Quantity needed, specific requirements..." value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={3} className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-sm text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/50 resize-none transition-all" />
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowQuoteForm(false)} className="flex-1 px-4 py-2.5 border border-white/10 text-white/50 text-sm font-semibold rounded-sm hover:bg-white/5 transition-colors">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-[#D4AF37] text-white text-sm font-bold rounded-sm hover:bg-[#F2C94C] disabled:opacity-50 transition-colors" data-testid="catalog-submit-quote">{submitting ? "Submitting..." : "Submit Request"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ════════ NEED HELP BANNER ════════ */}
        <div className="mt-14 bg-[#0D0D0D] rounded-sm p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6" data-testid="catalog-help-banner">
          <div><h3 className="text-white font-bold text-lg">Need Technical Assistance?</h3><p className="text-white/45 text-sm mt-1.5 max-w-md">Our product specialists can help with sizing, compatibility, and clinical applications.</p></div>
          <div className="flex gap-3 shrink-0">
            <a href="tel:+917416521222" className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0A0A]/10 text-white text-sm font-semibold rounded-sm hover:bg-[#0A0A0A]/20 transition-colors border border-white/20"><Phone size={14} /> Call Now</a>
            <Link to="/contact" className="flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] text-white text-sm font-bold rounded-sm hover:bg-[#F2C94C] transition-colors">Contact Specialist <ChevronRight size={14} /></Link>
          </div>
        </div>

        {/* ════════ RELATED PRODUCTS (Relationship-based) ════════ */}
        {relatedBuckets && (
          relatedBuckets.compatible_components?.length > 0 ||
          relatedBuckets.same_family_alternatives?.length > 0 ||
          relatedBuckets.related_system_products?.length > 0
        ) && (
          <div className="mt-14 space-y-10" data-testid="catalog-related-products">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-sm bg-white/5 flex items-center justify-center"><Link2 size={16} className="text-white/50" /></div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Related Products</h2>
            </div>

            {/* Compatible Components */}
            {relatedBuckets.compatible_components?.length > 0 && (
              <RelatedBucket
                title="Compatible Components"
                subtitle="Screws, bolts, and accessories designed for this system"
                items={relatedBuckets.compatible_components}
                divSlug={divSlug}
                accentColor="emerald"
              />
            )}

            {/* Same Family Alternatives */}
            {relatedBuckets.same_family_alternatives?.length > 0 && (
              <RelatedBucket
                title="Same Family Alternatives"
                subtitle="Variants, coated options, and alternative configurations"
                items={relatedBuckets.same_family_alternatives}
                divSlug={divSlug}
                accentColor="amber"
              />
            )}

            {/* Related System Products */}
            {relatedBuckets.related_system_products?.length > 0 && (
              <RelatedBucket
                title="Related System Products"
                subtitle="Products from the same clinical system"
                items={relatedBuckets.related_system_products}
                divSlug={divSlug}
                accentColor="blue"
              />
            )}
          </div>
        )}
      </div>

      {/* Lead Capture Modal */}
      <LeadCaptureModal
        isOpen={leadModal.open}
        onClose={() => setLeadModal({ ...leadModal, open: false })}
        inquiryType={leadModal.inquiryType}
        productInterest={leadModal.productInterest}
        whatsappMessage={leadModal.whatsappMessage}
        source={leadModal.source}
      />
    </div>
  );
}
