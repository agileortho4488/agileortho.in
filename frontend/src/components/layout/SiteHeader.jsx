import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, MessageCircle } from "lucide-react";
import { COMPANY } from "@/lib/constants";

function NavItem({ to, children, testId, onClick }) {
  return (
    <NavLink
      data-testid={testId}
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `text-sm font-medium transition-colors ${isActive ? "text-teal-700" : "text-slate-600 hover:text-slate-900"}`
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
    <header data-testid="site-header" className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        <Link data-testid="site-logo-link" to="/" className="flex items-center gap-2.5">
          <img src="/ao_logo_horizontal.png" alt="Agile Ortho" className="h-8 sm:h-10 w-auto" data-testid="site-logo-mark" />
        </Link>

        <nav data-testid="site-nav" className="hidden items-center gap-7 md:flex">
          <NavItem testId="nav-products-link" to="/catalog">Products</NavItem>
          <NavItem testId="nav-districts-link" to="/districts">Districts</NavItem>
          <NavItem testId="nav-about-link" to="/about">About</NavItem>
          <NavItem testId="nav-contact-link" to="/contact">Contact</NavItem>
          <NavItem testId="nav-chat-link" to="/chat">AI Assistant</NavItem>
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

        <div className="flex items-center gap-3">
          <a
            href={`https://wa.me/${COMPANY.whatsapp.replace("+", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1DA851] transition-colors"
            data-testid="header-whatsapp-btn"
          >
            <MessageCircle size={15} /> WhatsApp
          </a>

          <button
            data-testid="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div data-testid="mobile-menu" className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            <NavItem testId="nav-products-link-mobile" to="/catalog" onClick={() => setMobileMenuOpen(false)}>Products</NavItem>
            <NavItem testId="nav-districts-link-mobile" to="/districts" onClick={() => setMobileMenuOpen(false)}>Districts</NavItem>
            <NavItem testId="nav-about-link-mobile" to="/about" onClick={() => setMobileMenuOpen(false)}>About</NavItem>
            <NavItem testId="nav-contact-link-mobile" to="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</NavItem>
            <NavItem testId="nav-chat-link-mobile" to="/chat" onClick={() => setMobileMenuOpen(false)}>AI Assistant</NavItem>
            <a href="https://www.agileortho.shop" target="_blank" rel="noreferrer" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-600">Shop</a>
            <a
              href={`https://wa.me/${COMPANY.whatsapp.replace("+", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white"
            >
              <MessageCircle size={15} /> WhatsApp Us
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
