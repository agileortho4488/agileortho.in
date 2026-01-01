import "leaflet/dist/leaflet.css";
import "@/App.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";

import Home from "@/pages/Home";
import EducationHub from "@/pages/EducationHub";
import EducationCategory from "@/pages/EducationCategory";
import EducationTopic from "@/pages/EducationTopic";

import Conditions from "@/pages/Conditions";
import ConditionCategory from "@/pages/ConditionCategory";
import ConditionDetail from "@/pages/ConditionDetail";
import DoctorProfile from "@/pages/DoctorProfile";
import JoinSurgeon from "@/pages/JoinSurgeon";
import Surgeons from "@/pages/Surgeons";
import Events from "@/pages/Events";
import { BlogList, BlogArticle } from "@/pages/Blog";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminAnalytics from "@/pages/AdminAnalytics";
import AdminOutreach from "@/pages/AdminOutreach";
import AdminCRM from "@/pages/AdminCRM";
import NotFound from "@/pages/NotFound";
import CityLanding, { CITIES } from "@/pages/CityLanding";

export default function App() {
  return (
    <div data-testid="app-root" className="min-h-screen bg-white text-slate-900">
      <BrowserRouter>
        <SiteHeader />
        <Routes>
          <Route path="/" element={<Home />} />

          {/* Patient education library */}
          <Route path="/education" element={<EducationHub />} />
          <Route path="/education/:categoryKey" element={<EducationCategory />} />
          <Route path="/education/:categoryKey/:topicSlug" element={<EducationTopic />} />

          {/* Curated condition pages (separate from full library) */}
          <Route path="/conditions" element={<Conditions />} />
          <Route path="/conditions/category/:categoryKey" element={<ConditionCategory />} />
          <Route path="/conditions/:slug" element={<ConditionDetail />} />
          <Route path="/doctor/:slug" element={<DoctorProfile />} />
          <Route path="/join" element={<JoinSurgeon />} />
          <Route path="/surgeons" element={<Surgeons />} />
          <Route path="/events" element={<Events />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogArticle />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/outreach" element={<AdminOutreach />} />
          
          {/* SEO City Landing Pages */}
          {CITIES.map((city) => (
            <Route
              key={city.slug}
              path={`/orthopaedic-surgeons-${city.slug}`}
              element={<CityLanding citySlug={city.slug} />}
            />
          ))}
          
          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <SiteFooter />
        <Toaster />
      </BrowserRouter>
    </div>
  );
}
