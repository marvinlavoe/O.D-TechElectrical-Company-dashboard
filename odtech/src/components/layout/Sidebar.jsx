import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  HardHat,
  Package,
  FileText,
  MessageSquare,
  Settings,
  CreditCard,
  Zap,
  LogOut,
  X,
} from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import useSidebarStore from "../../store/useSidebarStore";
import Avatar from "../ui/Avatar";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/customers", icon: Users, label: "Customers" },
  { to: "/jobs", icon: Briefcase, label: "Jobs" },
  { to: "/workers", icon: HardHat, label: "Workers", adminOnly: true },
  { to: "/inventory", icon: Package, label: "Inventory" },
  { to: "/billing", icon: CreditCard, label: "Billing", adminOnly: true },
  { to: "/receipts", icon: FileText, label: "Receipts", adminOnly: true },
  { to: "/reports", icon: FileText, label: "Reports", adminOnly: true },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const { profile, logout } = useAuthStore();
  const navigate = useNavigate();
  const { isCollapsed, isMobileOpen, closeMobile } = useSidebarStore();

  // DEV bypass mode (set to true while testing without auth)
  const AUTH_BYPASS = true;
  const isAdmin = AUTH_BYPASS ? true : profile?.role === "admin";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const visible = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        bg-surface-card border-r border-surface-border
        flex flex-col flex-shrink-0
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-60'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Close button for mobile */}
        <button
          onClick={closeMobile}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-surface lg:hidden"
        >
          <X size={20} />
        </button>

        {/* Logo */}
        <div className={`flex items-center gap-2.5 px-5 py-5 border-b border-surface-border ${isCollapsed ? 'justify-center px-3' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-primary" />
          </div>
          {!isCollapsed && (
            <div>
              <p className="font-bold text-sm text-text-primary leading-none">
                O.D DASHBOARD
              </p>
              <p className="text-xs text-text-muted mt-0.5 capitalize">
                {profile?.role ?? "Loading…"}
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visible.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                 ${
                   isActive
                     ? "bg-primary/10 text-primary"
                     : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                 }`
              }
            >
              <Icon size={17} />
              {!isCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-surface-border p-3">
          <div className={`flex items-center gap-3 px-2 py-2 ${isCollapsed ? 'justify-center' : ''}`}>
            <Avatar
              name={profile?.full_name}
              src={profile?.avatar_url}
              size="sm"
            />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {profile?.full_name ?? "—"}
                </p>
                <p className="text-xs text-text-muted truncate">
                  {profile?.specialization ?? profile?.role ?? ""}
                </p>
              </div>
            )}
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg text-text-muted hover:bg-surface hover:text-danger transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
