import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { SEOProvider } from "./components/SEO";
import { Layout } from "./components/layout/Layout";
import { AdminLayout } from "./components/layout/AdminLayout";
import ChatWidget from "./components/ChatWidget";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Chat from "./pages/Chat";
import DistrictsIndex from "./pages/DistrictsIndex";
import DistrictPage from "./pages/DistrictPage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPipeline from "./pages/AdminPipeline";
import AdminLeads from "./pages/AdminLeads";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminProducts from "./pages/AdminProducts";
import AdminImports from "./pages/AdminImports";
import AdminWhatsApp from "./pages/AdminWhatsApp";
import "./App.css";

function App() {
  return (
    <SEOProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          {/* Public routes with header/footer */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/districts" element={<DistrictsIndex />} />
            <Route path="/districts/:slug" element={<DistrictPage />} />
          </Route>

          {/* Admin login (no layout) */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin routes with sidebar */}
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/pipeline" element={<AdminPipeline />} />
            <Route path="/admin/leads" element={<AdminLeads />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/imports" element={<AdminImports />} />
            <Route path="/admin/whatsapp" element={<AdminWhatsApp />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-white font-[Manrope]">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-slate-200">404</h1>
                <p className="text-slate-500 mt-2">Page not found</p>
                <a href="/" className="text-sm text-teal-600 font-medium mt-3 inline-block hover:text-teal-700">Go Home</a>
              </div>
            </div>
          } />
        </Routes>
        <ChatWidget />
      </BrowserRouter>
    </SEOProvider>
  );
}

export default App;
