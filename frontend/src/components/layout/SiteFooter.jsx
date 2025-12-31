import { DISCLAIMER_LINES } from "@/lib/constants";

export default function SiteFooter() {
  return (
    <footer data-testid="site-footer" className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <div
              data-testid="footer-title"
              className="text-sm font-semibold text-slate-900"
            >
              OrthoConnect
            </div>
            <div
              data-testid="footer-subtitle"
              className="mt-2 text-sm leading-relaxed text-slate-600"
            >
              Patient-first orthopaedic education and surgeon discovery in India.
              No ads, no paid listings, no rankings.
            </div>
          </div>
          <div>
            <div
              data-testid="footer-disclaimer-title"
              className="text-sm font-semibold text-slate-900"
            >
              Medical Disclaimer
            </div>
            <ul className="mt-2 space-y-1">
              {DISCLAIMER_LINES.map((line) => (
                <li
                  data-testid={`footer-disclaimer-line-${line
                    .toLowerCase()
                    .replaceAll(" ", "-")
                    .replaceAll(/[^a-z0-9-]/g, "")}`}
                  key={line}
                  className="text-sm text-slate-600"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div
          data-testid="footer-bottom"
          className="mt-8 text-xs text-slate-500"
        >
          © {new Date().getFullYear()} OrthoConnect. Built for patients and doctor
          dignity.
        </div>
      </div>
    </footer>
  );
}
