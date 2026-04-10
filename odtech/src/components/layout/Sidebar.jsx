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
import { getUserRole } from "../../lib/authRoutes";

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
  const { session, profile, logout } = useAuthStore();
  const navigate = useNavigate();
  const { isCollapsed, isMobileOpen, closeMobile } = useSidebarStore();

  const role = getUserRole(profile, session?.user);
  const isAdmin = role === "admin";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const visible = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-shrink-0 flex-col
          border-r border-surface-border bg-surface-card
          transition-all duration-300 ease-in-out
          lg:static
          ${isCollapsed ? "w-16" : "w-60"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <button
          onClick={closeMobile}
          className="absolute right-4 top-4 rounded-lg p-1 hover:bg-surface lg:hidden"
        >
          <X size={20} />
        </button>

        <div
          className={`flex items-center gap-2.5 border-b border-surface-border px-5 py-5 ${
            isCollapsed ? "justify-center px-3" : ""
          }`}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Zap size={18} className="text-primary" />
          </div>
          {!isCollapsed && (
            <div>
              <p className="text-sm font-bold leading-none text-text-primary">
                O.D DASHBOARD
              </p>
              <p className="mt-0.5 text-xs capitalize text-text-muted">
                {role}
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {visible.map((item) => {
            const ItemIcon = item.icon

            return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                }`
              }
            >
              <ItemIcon size={17} />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-surface-border p-3">
          <div
            className={`flex items-center gap-3 px-2 py-2 ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <Avatar
              name={profile?.full_name || session?.user?.email || "User"}
              src={profile?.avatar_url}
              size="sm"
            />
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {profile?.full_name || session?.user?.email || "User"}
                </p>
                <p className="truncate text-xs text-text-muted">
                  {profile?.specialization || role}
                </p>
              </div>
            )}
            <button
              onClick={handleLogout}
              title="Logout"
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-danger"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
