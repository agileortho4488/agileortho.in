import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { COMPANY, DISCLAIMER_LINES } from "@/lib/constants";

export default function SiteFooter() {
  return (
    <footer data-testid="site-footer" className="border-t border-slate-200 bg-[#0B1F3F]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-2">
            <img src="/ao_logo_white.png" alt="Agile Ortho" className="h-12 w-auto" />
            <p data-testid="footer-tagline" className="mt-1 text-sm font-semibold text-emerald-400 tracking-wider uppercase">
              {COMPANY.tagline}
            </p>
            <p data-testid="footer-subtitle" className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
              Authorized Meril Life Sciences master distributor serving hospitals, clinics, and diagnostic centers across all 33 districts of Telangana.
            </p>
            <div className="mt-5 space-y-2">
              <a href={`tel:${COMPANY.phone}`} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                <Phone size={14} className="text-emerald-400" /> {COMPANY.phone}
              </a>
              <a href={`https://wa.me/${COMPANY.whatsapp.replace("+", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                <MessageCircle size={14} className="text-emerald-400" /> {COMPANY.whatsapp} (WhatsApp)
              </a>
              <a href={`mailto:${COMPANY.email}`} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                <Mail size={14} className="text-emerald-400" /> {COMPANY.email}
              </a>
              <div className="flex items-start gap-2 text-sm text-slate-400">
                <MapPin size={14} className="text-emerald-400 mt-0.5 shrink-0" /> {COMPANY.address}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <div className="text-sm font-semibold text-white mb-4">Quick Links</div>
            <ul className="space-y-2.5">
              <li><Link to="/products" className="text-sm text-slate-400 hover:text-white transition-colors">Products</Link></li>
              <li><Link to="/districts" className="text-sm text-slate-400 hover:text-white transition-colors">Districts</Link></li>
              <li><Link to="/about" className="text-sm text-slate-400 hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="text-sm text-slate-400 hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="/chat" className="text-sm text-slate-400 hover:text-white transition-colors">AI Assistant</Link></li>
              <li><a href="https://www.agileortho.shop" target="_blank" rel="noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors">Online Shop</a></li>
            </ul>
          </div>

          {/* Key Districts */}
          <div>
            <div className="text-sm font-semibold text-white mb-4">Key Districts</div>
            <ul className="space-y-2.5">
              <li><Link to="/districts/hyderabad" className="text-sm text-slate-400 hover:text-white transition-colors">Hyderabad</Link></li>
              <li><Link to="/districts/warangal" className="text-sm text-slate-400 hover:text-white transition-colors">Warangal</Link></li>
              <li><Link to="/districts/karimnagar" className="text-sm text-slate-400 hover:text-white transition-colors">Karimnagar</Link></li>
              <li><Link to="/districts/nizamabad" className="text-sm text-slate-400 hover:text-white transition-colors">Nizamabad</Link></li>
              <li><Link to="/districts/khammam" className="text-sm text-slate-400 hover:text-white transition-colors">Khammam</Link></li>
              <li><Link to="/districts" className="text-sm text-teal-400 hover:text-teal-300 transition-colors font-medium">All 33 Districts →</Link></li>
            </ul>
          </div>

          {/* Compliance */}
          <div>
            <div data-testid="footer-disclaimer-title" className="text-sm font-semibold text-white mb-4">Compliance</div>
            <ul className="space-y-2">
              {DISCLAIMER_LINES.map((line) => (
                <li key={line} className="text-xs text-slate-500 flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-700/50 pt-6 sm:flex-row">
          <div data-testid="footer-bottom" className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} {COMPANY.legalName}. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>GST: {COMPANY.gst}</span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <span>CIN Registered</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
