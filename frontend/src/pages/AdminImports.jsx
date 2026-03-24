import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Upload, FileText, Check, X, Clock, AlertCircle, ChevronDown, ChevronUp, Edit2, Trash2, CheckCircle2, RefreshCw } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_STYLES = {
  processing: { bg: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Clock, label: "Processing..." },
  completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Extraction Complete" },
  failed: { bg: "bg-red-50 text-red-700 border-red-200", icon: AlertCircle, label: "Failed" },
};

export default function AdminImports() {
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImport, setSelectedImport] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState({});
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [approving, setApproving] = useState(false);

  const token = localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchImports = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/imports`, { headers });
      const data = await res.json();
      setImports(data.imports || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchImports(); }, [fetchImports]);

  const fetchImportDetail = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/imports/${id}`, { headers });
      const data = await res.json();
      setSelectedImport(data);
    } catch { toast.error("Failed to load import details"); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are accepted");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/api/admin/import/pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      toast.success(`PDF uploaded! Extracting products from "${file.name}"...`);
      fetchImports();
      // Poll for completion
      pollImport(data.import_id);
    } catch {
      toast.error("Failed to upload PDF");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const pollImport = async (importId) => {
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${API_URL}/api/admin/imports/${importId}`, { headers });
        const data = await res.json();
        if (data.status === "completed") {
          clearInterval(poll);
          toast.success(`Extracted ${data.total_count} products from PDF!`);
          fetchImports();
          setSelectedImport(data);
        } else if (data.status === "failed") {
          clearInterval(poll);
          toast.error(`Extraction failed: ${data.error || "Unknown error"}`);
          fetchImports();
        }
      } catch {}
      if (attempts > 60) clearInterval(poll); // 5min timeout
    }, 5000);
  };

  const handleApproveAll = async () => {
    if (!selectedImport) return;
    setApproving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/imports/${selectedImport.id}/approve`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      toast.success(data.message);
      fetchImportDetail(selectedImport.id);
      fetchImports();
    } catch { toast.error("Failed to approve products"); }
    finally { setApproving(false); }
  };

  const handleApproveSelected = async (tempIds) => {
    if (!selectedImport) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/imports/${selectedImport.id}/approve`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ approve_ids: tempIds }),
      });
      const data = await res.json();
      toast.success(data.message);
      fetchImportDetail(selectedImport.id);
    } catch { toast.error("Failed to approve"); }
  };

  const handleEditProduct = async () => {
    if (!selectedImport || !editingProduct) return;
    try {
      await fetch(`${API_URL}/api/admin/imports/${selectedImport.id}/product/${editingProduct}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      toast.success("Product updated");
      setEditingProduct(null);
      fetchImportDetail(selectedImport.id);
    } catch { toast.error("Failed to update"); }
  };

  const handleDeleteProduct = async (tempId) => {
    if (!selectedImport || !window.confirm("Remove this product from the import?")) return;
    try {
      await fetch(`${API_URL}/api/admin/imports/${selectedImport.id}/product/${tempId}`, {
        method: "DELETE",
        headers,
      });
      toast.success("Product removed");
      fetchImportDetail(selectedImport.id);
    } catch { toast.error("Failed to remove"); }
  };

  const toggleExpand = (tempId) => {
    setExpandedProducts((prev) => ({ ...prev, [tempId]: !prev[tempId] }));
  };

  const startEdit = (product) => {
    setEditingProduct(product._temp_id);
    setEditForm({
      product_name: product.product_name || "",
      sku_code: product.sku_code || "",
      division: product.division || "",
      category: product.category || "",
      description: product.description || "",
      material: product.material || "",
    });
  };

  return (
    <div className="p-6" data-testid="admin-imports">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-slate-900" style={{ fontFamily: "Chivo" }}>PDF Catalog Importer</h1>
          <p className="text-sm text-slate-500">Upload manufacturer PDFs — Claude AI extracts product data automatically</p>
        </div>
        <label className={`flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-sm hover:bg-emerald-700 transition-colors cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
          <Upload size={16} />
          {uploading ? "Uploading..." : "Upload PDF"}
          <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" data-testid="pdf-upload-input" />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Import List */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-sm">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Import History</h3>
              <button onClick={() => { setLoading(true); fetchImports(); }} className="text-slate-400 hover:text-slate-700">
                <RefreshCw size={14} />
              </button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : imports.length === 0 ? (
              <div className="text-center py-12 px-4">
                <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No imports yet. Upload a PDF to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {imports.map((imp) => {
                  const style = STATUS_STYLES[imp.status] || STATUS_STYLES.processing;
                  const Icon = style.icon;
                  const isSelected = selectedImport?.id === imp.id;
                  return (
                    <button
                      key={imp.id}
                      onClick={() => fetchImportDetail(imp.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${isSelected ? "bg-emerald-50/50" : ""}`}
                      data-testid={`import-item-${imp.id}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FileText size={14} className="text-slate-400 shrink-0" />
                        <p className="text-sm font-semibold text-slate-900 truncate">{imp.filename}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${style.bg}`}>
                          <Icon size={10} /> {style.label}
                        </span>
                        {imp.total_count > 0 && (
                          <span className="text-[10px] text-slate-400">
                            {imp.approved_count}/{imp.total_count} approved
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Import Detail */}
        <div className="lg:col-span-2">
          {!selectedImport ? (
            <div className="bg-white border border-slate-200 rounded-sm flex items-center justify-center py-20">
              <div className="text-center">
                <Upload size={40} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-500 text-sm">Upload a PDF or select an import to review extracted products</p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-sm">
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: "Chivo" }}>{selectedImport.filename}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedImport.total_count} products extracted | {selectedImport.approved_count} approved
                    </p>
                  </div>
                  {selectedImport.status === "completed" && selectedImport.total_count > selectedImport.approved_count && (
                    <button
                      onClick={handleApproveAll}
                      disabled={approving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      data-testid="approve-all-btn"
                    >
                      <Check size={16} /> {approving ? "Approving..." : "Approve All & Publish"}
                    </button>
                  )}
                </div>
                {selectedImport.status === "processing" && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-sm">
                    <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-yellow-700">Claude AI is analyzing the PDF and extracting product data...</p>
                  </div>
                )}
                {selectedImport.status === "failed" && (
                  <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-sm">
                    <p className="text-sm text-red-700">{selectedImport.error || "Extraction failed"}</p>
                  </div>
                )}
              </div>

              {/* Product List */}
              {selectedImport.status === "completed" && (
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {(selectedImport.extracted_products || []).map((product, idx) => {
                    const isExpanded = expandedProducts[product._temp_id];
                    const isEditing = editingProduct === product._temp_id;
                    return (
                      <div
                        key={product._temp_id || idx}
                        className={`${product.approved ? "bg-emerald-50/30" : ""}`}
                        data-testid={`extracted-product-${product._temp_id}`}
                      >
                        {/* Row header */}
                        <div className="px-5 py-3 flex items-center gap-3">
                          <button onClick={() => toggleExpand(product._temp_id)} className="text-slate-400 hover:text-slate-700">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 truncate">{product.product_name}</p>
                              {product.approved && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  Published
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-emerald-600 font-medium">{product.division}</span>
                              {product.category && <span className="text-xs text-slate-400">| {product.category}</span>}
                              {product.sku_code && <span className="text-xs font-mono text-slate-400">| {product.sku_code}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {!product.approved && (
                              <>
                                <button
                                  onClick={() => handleApproveSelected([product._temp_id])}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                                  title="Approve & Publish"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => startEdit(product)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product._temp_id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                  title="Remove"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && !isEditing && (
                          <div className="px-5 pb-4 pl-14">
                            <p className="text-sm text-slate-600 mb-2">{product.description}</p>
                            {product.material && (
                              <p className="text-xs text-slate-500"><span className="font-semibold">Material:</span> {product.material}</p>
                            )}
                            {product.technical_specifications && Object.keys(product.technical_specifications).length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-semibold text-slate-600 mb-1">Specifications:</p>
                                <pre className="text-xs text-slate-500 bg-slate-50 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(product.technical_specifications, null, 2)}
                                </pre>
                              </div>
                            )}
                            {product.seo_meta_title && (
                              <p className="text-xs text-slate-400 mt-2"><span className="font-semibold">SEO Title:</span> {product.seo_meta_title}</p>
                            )}
                            {product.seo_meta_description && (
                              <p className="text-xs text-slate-400"><span className="font-semibold">Meta Desc:</span> {product.seo_meta_description}</p>
                            )}
                          </div>
                        )}

                        {/* Edit form */}
                        {isEditing && (
                          <div className="px-5 pb-4 pl-14 space-y-2">
                            <input
                              type="text"
                              value={editForm.product_name}
                              onChange={(e) => setEditForm({ ...editForm, product_name: e.target.value })}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-sm text-sm"
                              placeholder="Product Name"
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <input type="text" value={editForm.sku_code} onChange={(e) => setEditForm({ ...editForm, sku_code: e.target.value })} className="px-2.5 py-1.5 border border-slate-200 rounded-sm text-sm" placeholder="SKU" />
                              <input type="text" value={editForm.division} onChange={(e) => setEditForm({ ...editForm, division: e.target.value })} className="px-2.5 py-1.5 border border-slate-200 rounded-sm text-sm" placeholder="Division" />
                              <input type="text" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="px-2.5 py-1.5 border border-slate-200 rounded-sm text-sm" placeholder="Category" />
                            </div>
                            <textarea
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              rows={2}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-sm text-sm resize-none"
                              placeholder="Description"
                            />
                            <input type="text" value={editForm.material} onChange={(e) => setEditForm({ ...editForm, material: e.target.value })} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-sm text-sm" placeholder="Material" />
                            <div className="flex gap-2">
                              <button onClick={handleEditProduct} className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-sm hover:bg-emerald-700">Save</button>
                              <button onClick={() => setEditingProduct(null)} className="px-3 py-1.5 border border-slate-200 text-slate-700 text-sm rounded-sm hover:bg-slate-50">Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
