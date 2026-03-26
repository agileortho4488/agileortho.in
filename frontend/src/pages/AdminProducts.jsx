import { useState, useEffect, useCallback, useRef } from "react";
import {
  getAdminProducts, createAdminProduct, updateAdminProduct,
  deleteAdminProduct, uploadProductImages, deleteProductImage,
  bulkUploadImages, getFileUrl, startBrochureExtraction, getBrochureExtractionStatus,
} from "../lib/api";
import { toast } from "sonner";
import {
  Search, Trash2, Edit2, Plus, X, ChevronLeft, ChevronRight, Save,
  Upload, Image, ImagePlus, Loader2, FolderUp,
} from "lucide-react";

const DIVISIONS = [
  "Orthopedics", "Cardiovascular", "Diagnostics",
  "ENT", "Endo-surgical", "Infection Prevention", "Peripheral Intervention",
  "Critical Care", "Urology", "Robotics",
];

const EMPTY_FORM = {
  product_name: "", sku_code: "", division: "", category: "", description: "",
  material: "", pack_size: "", manufacturer: "Meril Life Sciences",
  seo_meta_title: "", seo_meta_description: "", brochure_url: "", status: "published",
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [division, setDivision] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [specsText, setSpecsText] = useState("");
  const [sizesText, setSizesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [productImages, setProductImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState(null);
  const fileInputRef = useRef(null);
  const bulkInputRef = useRef(null);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (division) params.division = division;
    if (search) params.search = search;
    getAdminProducts(params)
      .then((r) => { setProducts(r.data.products); setTotal(r.data.total); setPages(r.data.pages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, division, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSpecsText("");
    setSizesText("");
    setEditingId(null);
    setProductImages([]);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({
      product_name: p.product_name || "",
      sku_code: p.sku_code || "",
      division: p.division || "",
      category: p.category || "",
      description: p.description || "",
      material: p.material || "",
      pack_size: p.pack_size || "",
      manufacturer: p.manufacturer || "Meril Life Sciences",
      seo_meta_title: p.seo_meta_title || "",
      seo_meta_description: p.seo_meta_description || "",
      brochure_url: p.brochure_url || "",
      status: p.status || "published",
    });
    setSpecsText(p.technical_specifications ? JSON.stringify(p.technical_specifications, null, 2) : "");
    setSizesText((p.size_variables || []).join(", "));
    setEditingId(p.id);
    setProductImages(p.images || []);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.product_name || !form.division) {
      toast.error("Product name and division are required");
      return;
    }
    setSaving(true);
    try {
      let specs = {};
      if (specsText.trim()) {
        try { specs = JSON.parse(specsText); } catch { toast.error("Invalid JSON in specifications"); setSaving(false); return; }
      }
      const sizes = sizesText ? sizesText.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const payload = { ...form, technical_specifications: specs, size_variables: sizes };

      if (editingId) {
        await updateAdminProduct(editingId, payload);
        toast.success("Product updated");
      } else {
        await createAdminProduct(payload);
        toast.success("Product created");
      }
      setShowForm(false);
      fetchProducts();
    } catch {
      toast.error("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deleteAdminProduct(id);
      toast.success("Product deleted");
      fetchProducts();
    } catch { toast.error("Failed to delete"); }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !editingId) return;
    setUploading(true);
    try {
      const res = await uploadProductImages(editingId, files);
      const newImages = res.data.images || [];
      setProductImages((prev) => [...prev, ...newImages]);
      toast.success(`${res.data.uploaded} image(s) uploaded`);
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImageDelete = async (imageId) => {
    if (!editingId) return;
    try {
      await deleteProductImage(editingId, imageId);
      setProductImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success("Image removed");
    } catch {
      toast.error("Failed to remove image");
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFiles.length) return;
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const res = await bulkUploadImages(bulkFiles);
      setBulkResult(res.data);
      toast.success(`${res.data.matched} images matched to products`);
      fetchProducts();
    } catch {
      toast.error("Bulk upload failed");
    } finally {
      setBulkUploading(false);
    }
  };

  const handleBrochureExtraction = async () => {
    setExtracting(true);
    try {
      const res = await startBrochureExtraction();
      toast.success(res.data.message);
      setExtractStatus({ status: "running", processed: 0, total: 0, matched: 0 });
      const interval = setInterval(async () => {
        try {
          const s = await getBrochureExtractionStatus();
          setExtractStatus(s.data);
          if (s.data.status === "completed" || s.data.status === "failed") {
            clearInterval(interval);
            setExtracting(false);
            fetchProducts();
            toast.success(`Extraction done: ${s.data.matched} images matched`);
          }
        } catch { /* ignore polling errors */ }
      }, 5000);
    } catch {
      toast.error("Failed to start extraction");
      setExtracting(false);
    }
  };

  const imageCount = (p) => (p.images || []).length;

  return (
    <div className="p-6" data-testid="admin-products">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900" style={{ fontFamily: "Chivo" }}>Products</h1>
          <p className="text-sm text-slate-500">{total} products in catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBrochureExtraction}
            disabled={extracting}
            className="flex items-center gap-1.5 px-3 py-2 border border-indigo-200 text-indigo-700 text-sm font-medium rounded-sm hover:bg-indigo-50 transition-colors disabled:opacity-50"
            data-testid="extract-brochure-btn"
          >
            {extracting ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
            {extracting ? `Extracting... ${extractStatus?.matched || 0} matched` : "Extract from Brochures"}
          </button>
          <button
            onClick={() => { setShowBulkUpload(true); setBulkResult(null); setBulkFiles([]); }}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-sm hover:bg-slate-50 transition-colors"
            data-testid="bulk-upload-btn"
          >
            <FolderUp size={16} /> Bulk Images
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-sm hover:bg-emerald-700 transition-colors"
            data-testid="add-product-btn"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500 w-48"
            data-testid="product-search-input"
          />
        </div>
        <select
          value={division}
          onChange={(e) => { setDivision(e.target.value); setPage(1); }}
          className="px-2.5 py-1.5 border border-slate-200 rounded-sm text-sm bg-white"
          data-testid="division-filter"
        >
          <option value="">All Divisions</option>
          {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-sm text-slate-400">No products found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="products-table">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">Product</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">SKU</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">Division</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">Category</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">Images</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">Status</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50" data-testid={`product-row-${p.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {imageCount(p) > 0 ? (
                          <img
                            src={`${process.env.REACT_APP_BACKEND_URL}/api/files/${p.images[0].storage_path}`}
                            alt=""
                            className="w-8 h-8 object-contain rounded border border-slate-200"
                            loading="lazy"
                          />
                        ) : null}
                        <p className="font-semibold text-slate-900">{p.product_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">{p.sku_code}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-emerald-600">{p.division}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{p.category || "—"}</td>
                    <td className="px-4 py-3">
                      {imageCount(p) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <Image size={12} /> {imageCount(p)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-sm ${p.status === "published" ? "bg-emerald-50 text-emerald-700" : p.status === "draft" ? "bg-yellow-50 text-yellow-700" : "bg-slate-100 text-slate-500"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1 text-slate-400 hover:text-blue-600" data-testid={`edit-product-${p.id}`}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(p.id, p.product_name)} className="p-1 text-slate-400 hover:text-red-500" data-testid={`delete-product-${p.id}`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="p-1 border border-slate-200 rounded disabled:opacity-30" data-testid="prev-page-btn">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-slate-500">Page {page} of {pages}</span>
          <button onClick={() => setPage(page + 1)} disabled={page >= pages} className="p-1 border border-slate-200 rounded disabled:opacity-30" data-testid="next-page-btn">
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Create/Edit Drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex" data-testid="product-form-drawer">
          <div className="flex-1 bg-black/30" onClick={() => setShowForm(false)} />
          <div className="w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Chivo" }}>
                {editingId ? "Edit Product" : "Add New Product"}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:text-slate-900" data-testid="close-drawer-btn">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text" value={form.product_name}
                  onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500"
                  data-testid="form-product-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SKU Code</label>
                  <input type="text" value={form.sku_code}
                    onChange={(e) => setForm({ ...form, sku_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500"
                    data-testid="form-sku-code" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Division *</label>
                  <select value={form.division}
                    onChange={(e) => setForm({ ...form, division: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white outline-none focus:border-emerald-500"
                    data-testid="form-division">
                    <option value="">Select Division</option>
                    {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <input type="text" value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500"
                    data-testid="form-category" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Material</label>
                  <input type="text" value={form.material}
                    onChange={(e) => setForm({ ...form, material: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500 resize-none"
                  data-testid="form-description" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Technical Specifications (JSON)</label>
                <textarea value={specsText} onChange={(e) => setSpecsText(e.target.value)} rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-xs font-mono outline-none focus:border-emerald-500 resize-none"
                  placeholder='{"key": "value", "feature": true}' data-testid="form-specs" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sizes (comma separated)</label>
                  <input type="text" value={sizesText} onChange={(e) => setSizesText(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500"
                    placeholder="Small, Medium, Large" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pack Size</label>
                  <input type="text" value={form.pack_size}
                    onChange={(e) => setForm({ ...form, pack_size: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Manufacturer</label>
                <input type="text" value={form.manufacturer}
                  onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SEO Meta Title</label>
                  <input type="text" value={form.seo_meta_title}
                    onChange={(e) => setForm({ ...form, seo_meta_title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white outline-none focus:border-emerald-500"
                    data-testid="form-status">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Brochure URL</label>
                <input type="text" value={form.brochure_url}
                  onChange={(e) => setForm({ ...form, brochure_url: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm outline-none focus:border-emerald-500"
                  placeholder="https://..." />
              </div>

              {/* Image Upload Section */}
              {editingId && (
                <div data-testid="image-upload-section">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Product Images</label>
                  {/* Existing images */}
                  {productImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {productImages.map((img) => (
                        <div key={img.id} className="relative group border border-slate-200 rounded overflow-hidden aspect-square bg-slate-50" data-testid={`image-${img.id}`}>
                          <img
                            src={getFileUrl(img.storage_path)}
                            alt={img.original_filename}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                          <button
                            onClick={() => handleImageDelete(img.id)}
                            className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`delete-image-${img.id}`}
                          >
                            <X size={12} />
                          </button>
                          <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] px-1 py-0.5 truncate">
                            {img.original_filename}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Upload button */}
                  <input
                    type="file" ref={fileInputRef} onChange={handleImageUpload}
                    accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden
                    data-testid="image-file-input"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 w-full px-3 py-2.5 border-2 border-dashed border-slate-300 rounded text-sm text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
                    data-testid="upload-images-btn"
                  >
                    {uploading ? (
                      <><Loader2 size={16} className="animate-spin" /> Uploading...</>
                    ) : (
                      <><ImagePlus size={16} /> Click to upload images (JPEG, PNG, WebP &mdash; max 10MB)</>
                    )}
                  </button>
                </div>
              )}
              {!editingId && (
                <p className="text-xs text-slate-400 italic">Save the product first, then you can upload images.</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-semibold rounded-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  data-testid="save-product-btn"
                >
                  <Save size={16} /> {saving ? "Saving..." : editingId ? "Update Product" : "Create Product"}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-sm hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="bulk-upload-modal">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-900" style={{ fontFamily: "Chivo" }}>Bulk Image Upload</h3>
              <button onClick={() => setShowBulkUpload(false)} className="p-1 text-slate-400 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded p-3">
                <p className="text-sm text-slate-700 font-medium mb-1">Auto-matching by SKU</p>
                <p className="text-xs text-slate-500">
                  Name your files with the SKU code prefix. Example: <code className="bg-white px-1 py-0.5 rounded text-emerald-600 font-mono">MRL-ORTHO-001_front.jpg</code> will match to the product with SKU <strong>MRL-ORTHO-001</strong>.
                </p>
              </div>
              <input type="file" ref={bulkInputRef}
                accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden
                onChange={(e) => setBulkFiles(Array.from(e.target.files || []))}
              />
              <button
                type="button"
                onClick={() => bulkInputRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full px-3 py-4 border-2 border-dashed border-slate-300 rounded text-sm text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                data-testid="bulk-select-files-btn"
              >
                <Upload size={18} />
                {bulkFiles.length > 0 ? `${bulkFiles.length} files selected` : "Select image files"}
              </button>
              {bulkFiles.length > 0 && (
                <div className="max-h-32 overflow-y-auto bg-slate-50 rounded border border-slate-200 p-2">
                  {bulkFiles.map((f, i) => (
                    <p key={i} className="text-xs text-slate-600 truncate">{f.name} <span className="text-slate-400">({(f.size / 1024).toFixed(0)}KB)</span></p>
                  ))}
                </div>
              )}
              {bulkResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded p-3 space-y-1" data-testid="bulk-upload-result">
                  <p className="text-sm font-semibold text-emerald-800">
                    {bulkResult.matched} matched, {bulkResult.unmatched} unmatched
                  </p>
                  {bulkResult.uploads?.map((u, i) => (
                    <p key={i} className="text-xs text-emerald-700">{u.filename} &rarr; {u.product} ({u.sku})</p>
                  ))}
                  {bulkResult.errors?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-emerald-200">
                      {bulkResult.errors.map((e, i) => (
                        <p key={i} className="text-xs text-red-600">{e}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleBulkUpload}
                  disabled={bulkUploading || !bulkFiles.length}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-semibold rounded-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  data-testid="bulk-upload-submit-btn"
                >
                  {bulkUploading ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : <><Upload size={16} /> Upload & Match</>}
                </button>
                <button onClick={() => setShowBulkUpload(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-sm hover:bg-slate-50">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
