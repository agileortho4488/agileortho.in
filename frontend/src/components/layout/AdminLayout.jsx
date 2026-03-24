import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { LayoutDashboard, Users, Package, LogOut, ChevronRight, BarChart3, Kanban, FileUp, MessageCircle } from "lucide-react";

export const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) navigate("/admin/login");
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };

  const links = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/pipeline", icon: Kanban, label: "Pipeline" },
    { to: "/admin/leads", icon: Users, label: "Leads" },
    { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    { to: "/admin/products", icon: Package, label: "Products" },
    { to: "/admin/imports", icon: FileUp, label: "PDF Import" },
    { to: "/admin/whatsapp", icon: MessageCircle, label: "WhatsApp" },
  ];

  const isActive = (path) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0" data-testid="admin-sidebar">
        <div className="px-4 py-5 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-black text-xs" style={{ fontFamily: "Chivo" }}>M</span>
            </div>
            <span className="text-sm font-bold" style={{ fontFamily: "Chivo" }}>MedDevice Pro</span>
          </Link>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Admin Panel</p>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {links.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded text-sm transition-colors ${
                isActive(to) ? "bg-emerald-600/20 text-emerald-400 font-semibold" : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              data-testid={`admin-nav-${label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <Icon size={16} />
              {label}
              {isActive(to) && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          ))}
        </nav>
        <div className="px-2 py-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-red-400 transition-colors w-full"
            data-testid="admin-logout-btn"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};
