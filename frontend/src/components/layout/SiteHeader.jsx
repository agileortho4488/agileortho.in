import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

function NavItem({ to, children, testId }) {
  return (
    <NavLink
      data-testid={testId}
      to={to}
      className={({ isActive }) =>
        [
          "text-sm font-medium",
          "text-slate-700 hover:text-slate-900",
          "transition-colors",
          isActive ? "text-slate-900" : "",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}

export default function SiteHeader() {
  const navigate = useNavigate();

  return (
    <header
      data-testid="site-header"
      className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            data-testid="site-logo-link"
            to="/"
            className="flex items-center gap-2"
          >
            <div
              data-testid="site-logo-mark"
              className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-600 to-sky-600 shadow-sm"
            />
            <div className="leading-tight">
              <div
                data-testid="site-logo-text"
                className="text-base font-semibold tracking-tight text-slate-900"
              >
                OrthoConnect
              </div>
              <div
                data-testid="site-logo-tagline"
                className="text-xs text-slate-500"
              >
                Ethical orthopaedic care discovery
              </div>
            </div>
          </Link>
        </div>

        <nav
          data-testid="site-nav"
          className="hidden items-center gap-6 md:flex"
        >
          <NavItem testId="nav-conditions-link" to="/conditions">
            Conditions
          </NavItem>
          <NavItem testId="nav-about-link" to="/about">
            About
          </NavItem>
          <NavItem testId="nav-contact-link" to="/contact">
            Contact
          </NavItem>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            data-testid="join-as-surgeon-button"
            onClick={() => navigate("/join")}
            className="rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
          >
            Join as Surgeon (Free)
          </Button>
        </div>
      </div>
    </header>
  );
}
