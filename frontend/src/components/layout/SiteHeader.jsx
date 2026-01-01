import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function NavItem({ to, children, testId, onClick }) {
  return (
    <NavLink
      data-testid={testId}
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "text-sm font-medium transition-colors",
          isActive
            ? "text-slate-900"
            : "text-slate-600 hover:text-slate-900",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}

export default function SiteHeader() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      data-testid="site-header"
      className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link
          data-testid="site-logo-link"
          to="/"
          className="flex items-center gap-2.5"
        >
          <div
            data-testid="site-logo-mark"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600"
          >
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <div className="hidden sm:block">
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
              An initiative of AgileOrtho
            </div>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav
          data-testid="site-nav"
          className="hidden items-center gap-8 md:flex"
        >
          <NavItem testId="nav-education-link" to="/education">
            Patient Education
          </NavItem>
          <NavItem testId="nav-about-link" to="/about">
            About
          </NavItem>
          <NavItem testId="nav-contact-link" to="/contact">
            Contact
          </NavItem>
          <a
            data-testid="nav-shop-link"
            href="https://www.agileortho.shop"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Shop
          </a>
        </nav>

        {/* CTA + Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          <Button
            data-testid="join-as-surgeon-button"
            onClick={() => navigate("/join")}
            className="hidden rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:inline-flex"
          >
            Join as Surgeon
          </Button>

          {/* Mobile Menu Button */}
          <button
            data-testid="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          data-testid="mobile-menu"
          className="border-t border-slate-200 bg-white px-4 py-4 md:hidden"
        >
          <nav className="flex flex-col gap-4">
            <NavItem
              testId="nav-education-link-mobile"
              to="/education"
              onClick={() => setMobileMenuOpen(false)}
            >
              Patient Education
            </NavItem>
            <NavItem
              testId="nav-about-link-mobile"
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </NavItem>
            <NavItem
              testId="nav-contact-link-mobile"
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </NavItem>
            <Button
              data-testid="join-as-surgeon-button-mobile"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/join");
              }}
              className="mt-2 w-full rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Join as Surgeon
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
