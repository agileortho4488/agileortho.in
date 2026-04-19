import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AdminLayout } from "./components/layout/AdminLayout";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPipeline from "./pages/AdminPipeline";
import AdminLeads from "./pages/AdminLeads";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminProducts from "./pages/AdminProducts";
import AdminImports from "./pages/AdminImports";
import AdminWhatsApp from "./pages/AdminWhatsApp";
import AdminReview from "./pages/AdminReview";
import AdminKnowledgeGraph from "./pages/AdminKnowledgeGraph";
import AdminWhatsAppFunnel from "./pages/AdminWhatsAppFunnel";
import AdminMarketIntelligence from "./pages/AdminMarketIntelligence";
import "./App.css";

/**
 * Agile Ortho — Internal Admin Console
 *
 * Public website (home, catalog, products, districts, etc.) lives on the
 * Next.js deployment at https://agileortho.in. This CRA is now **admin-only**:
 * - /             → redirects to /admin/login
 * - /admin/login  → password login
 * - /admin/*      → protected CRM + catalog management routes
 */
function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        {/* Root + anything not-matching → admin login */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/pipeline" element={<AdminPipeline />} />
          <Route path="/admin/leads" element={<AdminLeads />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/imports" element={<AdminImports />} />
          <Route path="/admin/whatsapp" element={<AdminWhatsApp />} />
          <Route path="/admin/review" element={<AdminReview />} />
          <Route path="/admin/knowledge-graph" element={<AdminKnowledgeGraph />} />
          <Route path="/admin/whatsapp-funnel" element={<AdminWhatsAppFunnel />} />
          <Route path="/admin/market-intelligence" element={<AdminMarketIntelligence />} />
        </Route>

        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] font-[Manrope]">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-white/20">404</h1>
                <p className="text-white/50 mt-2">
                  This area is for admin only. Looking for the public site?
                </p>
                <a
                  href="https://agileortho.in"
                  className="text-sm text-[#D4AF37] font-medium mt-3 inline-block hover:text-[#F2C94C]"
                >
                  Go to agileortho.in →
                </a>
                <p className="mt-4">
                  <a
                    href="/admin/login"
                    className="text-sm text-[#2DD4BF] font-medium hover:text-[#5EEAD4]"
                  >
                    Admin Login →
                  </a>
                </p>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
