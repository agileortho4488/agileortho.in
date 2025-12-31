import "leaflet/dist/leaflet.css";
import "@/App.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";

import Home from "@/pages/Home";
import Conditions from "@/pages/Conditions";
import ConditionCategory from "@/pages/ConditionCategory";
import ConditionDetail from "@/pages/ConditionDetail";
import DoctorProfile from "@/pages/DoctorProfile";
import JoinSurgeon from "@/pages/JoinSurgeon";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";

export default function App() {
  return (
    <div data-testid="app-root" className="min-h-screen bg-white text-slate-900">
      <BrowserRouter>
        <SiteHeader />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/conditions" element={<Conditions />} />
          <Route path="/conditions/:slug" element={<ConditionDetail />} />
          <Route path="/doctor/:slug" element={<DoctorProfile />} />
          <Route path="/join" element={<JoinSurgeon />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
        <SiteFooter />
      </BrowserRouter>
    </div>
  );
}
