import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Public APIs
export const getProducts = (params) => api.get("/api/products", { params });
export const getProduct = (id) => api.get(`/api/products/${id}`);
export const getDivisions = () => api.get("/api/divisions");
export const submitLead = (data) => api.post("/api/leads", data);

// Admin APIs
export const adminLogin = (data) => api.post("/api/admin/login", data);
export const getAdminStats = () => api.get("/api/admin/stats");
export const getAdminPipeline = () => api.get("/api/admin/pipeline");
export const getAdminAnalytics = () => api.get("/api/admin/analytics");
export const getAdminLeads = (params) => api.get("/api/admin/leads", { params });
export const getAdminLead = (id) => api.get(`/api/admin/leads/${id}`);
export const updateAdminLead = (id, data) => api.put(`/api/admin/leads/${id}`, data);
export const deleteAdminLead = (id) => api.delete(`/api/admin/leads/${id}`);
export const getAdminProducts = (params) => api.get("/api/admin/products", { params });
export const createAdminProduct = (data) => api.post("/api/admin/products", data);
export const updateAdminProduct = (id, data) => api.put(`/api/admin/products/${id}`, data);
export const deleteAdminProduct = (id) => api.delete(`/api/admin/products/${id}`);
export const reprocessImport = (id) => api.post(`/api/admin/imports/${id}/reprocess`);

// Product Image APIs
export const uploadProductImages = (productId, files) => {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  return api.post(`/api/admin/products/${productId}/images`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const deleteProductImage = (productId, imageId) =>
  api.delete(`/api/admin/products/${productId}/images/${imageId}`);
export const bulkUploadImages = (files) => {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  return api.post("/api/admin/products/bulk-images", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const getFileUrl = (storagePath) =>
  `${API_URL}/api/files/${storagePath}`;

// Bulk Catalog Upload APIs
export const bulkCatalogUpload = (file, jobId) => {
  const formData = new FormData();
  formData.append("file", file);
  if (jobId) formData.append("job_id", jobId);
  return api.post("/api/admin/bulk-catalog/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });
};
export const getBulkJobs = () => api.get("/api/admin/bulk-catalog/jobs");
export const getBulkJob = (id) => api.get(`/api/admin/bulk-catalog/jobs/${id}`);
export const getBulkJobFiles = (id) => api.get(`/api/admin/bulk-catalog/jobs/${id}/files`);
export const startBulkProcessing = (id) => api.post(`/api/admin/bulk-catalog/jobs/${id}/process`);
export const approveBulkProducts = (id, approveIds) =>
  api.post(`/api/admin/bulk-catalog/jobs/${id}/approve`, { approve_ids: approveIds || [] });
export const deleteBulkJob = (id) => api.delete(`/api/admin/bulk-catalog/jobs/${id}`);

// Brochure Image Extraction APIs
export const startBrochureExtraction = () => api.post("/api/admin/extract-brochure-images");
export const getBrochureExtractionStatus = () => api.get("/api/admin/extract-brochure-images/status");
export const clearBrochureImages = () => api.delete("/api/admin/clear-brochure-images");
export const getProductsWithoutImages = () => api.get("/api/admin/products-without-images");

export default api;
