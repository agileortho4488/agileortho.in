import { Link } from "react-router-dom";
import { DISCLAIMER_LINES } from "@/lib/constants";

export default function SiteFooter() {
  return (
    <footer data-testid="site-footer" className="border-t border-slate-200 bg-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500">
                <span className="text-sm font-bold text-white">A</span>
              </div>
              <div>
                <div
                  data-testid="footer-title"
                  className="text-base font-semibold text-white"
                >
                  OrthoConnect
                </div>
                <div className="text-xs text-slate-400">
                  An initiative of AgileOrtho
                </div>
              </div>
            </div>
            <p
              data-testid="footer-subtitle"
              className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400"
            >
              Patient-first orthopaedic education and surgeon discovery in India.
              No ads, no paid listings, no rankings.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <div className="text-sm font-semibold text-white mb-4">Quick Links</div>
            <ul className="space-y-2.5">
              <li>
                <Link to="/education" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Patient Education
                </Link>
              </li>
              <li>
                <Link to="/join" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Join as Surgeon
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-slate-400 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div>
            <div
              data-testid="footer-disclaimer-title"
              className="text-sm font-semibold text-white mb-4"
            >
              Disclaimer
            </div>
            <ul className="space-y-1.5">
              {DISCLAIMER_LINES.map((line) => (
                <li
                  data-testid={`footer-disclaimer-line-${line
                    .toLowerCase()
                    .replaceAll(" ", "-")
                    .replaceAll(/[^a-z0-9-]/g, "")}`}
                  key={line}
                  className="text-xs text-slate-500"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-6 sm:flex-row">
          <div
            data-testid="footer-bottom"
            className="text-xs text-slate-500"
          >
            © {new Date().getFullYear()} OrthoConnect by AgileOrtho. Built for patients and doctor dignity.
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>No ads</span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <span>No rankings</span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <span>Patient-first</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
