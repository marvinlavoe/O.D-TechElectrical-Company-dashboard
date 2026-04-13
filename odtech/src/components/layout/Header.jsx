import { useEffect, useRef } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import useNotificationStore from "../../store/useNotificationStore";
import useSidebarStore from "../../store/useSidebarStore";
import useAuthStore from "../../store/useAuthStore";
import { supabase } from "../../lib/supabase";
import Button from "../ui/Button";
import Badge from "../ui/Badge";

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/customers": "Customers",
  "/jobs": "Jobs & Scheduling",
  "/workers": "Workforce",
  "/inventory": "Inventory",
  "/sales": "Sales",
  "/merchant-hub": "Merchant Hub",
  "/billing": "Billing & Quotations",
  "/reports": "Reports & Analytics",
  "/chat": "Messages",
  "/settings": "Settings",
};

function formatNotificationTime(dateValue) {
  if (!dateValue) return "Recently";

  const timestamp = new Date(dateValue).getTime();
  const diffMinutes = Math.max(
    0,
    Math.round((Date.now() - timestamp) / (1000 * 60)),
  );

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const bellRef = useRef(null);
  const { profile, session } = useAuthStore();
  const currentUser = session?.user || null;
  const currentUserId = currentUser?.id || null;
  const {
    notifications,
    unreadCount,
    loading,
    panelOpen,
    fetchNotifications,
    togglePanel,
    setPanelOpen,
    markRead,
    markAllRead,
  } = useNotificationStore();
  const { toggleCollapsed, toggleMobile } = useSidebarStore();

  const title =
    Object.entries(PAGE_TITLES).find(([path]) =>
      location.pathname.startsWith(path),
    )?.[1] ?? "O.D DASHBOARD";

  useEffect(() => {
    queueMicrotask(() => {
      fetchNotifications(profile, currentUser).catch(() => {});
    });

    const intervalId = window.setInterval(() => {
      fetchNotifications(profile, currentUser).catch(() => {});
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [currentUser, fetchNotifications, profile]);

  useEffect(() => {
    if (!currentUserId) {
      return undefined;
    }

    const channel = supabase
      .channel(`notifications-feed-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "jobs",
        },
        () => {
          fetchNotifications(profile, currentUser).catch(() => {});
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
        },
        () => {
          fetchNotifications(profile, currentUser).catch(() => {});
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchNotifications(profile, currentUser).catch(() => {});
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, currentUserId, fetchNotifications, profile]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setPanelOpen(false);
      }
    };

    if (panelOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelOpen, setPanelOpen]);

  const handleNotificationClick = (notification) => {
    markRead(notification.id);
    setPanelOpen(false);

    if (notification.href) {
      navigate(notification.href);
    }
  };

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-surface-border bg-surface-card px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <button
          onClick={toggleMobile}
          className="p-2 rounded-lg hover:bg-surface transition-colors lg:hidden"
        >
          <Menu size={20} className="text-text-secondary" />
        </button>
        <button
          onClick={toggleCollapsed}
          className="p-2 rounded-lg hover:bg-surface transition-colors hidden lg:block"
        >
          <Menu size={20} className="text-text-secondary" />
        </button>
        <h1 className="max-w-[42vw] truncate text-sm font-semibold text-text-primary sm:max-w-none sm:text-base">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative hidden sm:block">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            placeholder="Search..."
            className="bg-surface border border-surface-border rounded-lg pl-8 pr-4 py-1.5
                       text-sm text-text-primary placeholder:text-text-muted
                       focus:outline-none focus:border-primary transition-colors w-52"
          />
        </div>

        <div className="relative" ref={bellRef}>
          <button
            onClick={togglePanel}
            className="relative p-2 rounded-lg hover:bg-surface transition-colors"
          >
            <Bell size={18} className="text-text-secondary" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 bg-danger text-white text-[10px] rounded-full ring-2 ring-surface-card flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {panelOpen && (
            <div className="absolute right-0 z-40 mt-2 w-[calc(100vw-1rem)] max-w-[360px] overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-2xl sm:w-[360px]">
              <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
                <div>
                  <p className="font-semibold text-text-primary">Notifications</p>
                  <p className="text-xs text-text-muted">
                    {loading
                      ? "Refreshing updates..."
                      : unreadCount > 0
                        ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                        : "You're all caught up"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={markAllRead}
                  disabled={!notifications.length || unreadCount === 0}
                >
                  Mark all read
                </Button>
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full border-b border-surface-border px-4 py-3 text-left transition-colors hover:bg-surface ${
                        notification.is_read ? "opacity-80" : ""
                      }`}
                    >
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <p className="font-medium text-text-primary">
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-text-muted">
                        {notification.message}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge
                          label={notification.category}
                          color={
                            notification.level === "danger"
                              ? "danger"
                              : notification.level === "warning"
                                ? "warning"
                                : notification.level === "success"
                                  ? "success"
                                  : "info"
                          }
                        />
                        <span className="text-xs text-text-muted">
                          {formatNotificationTime(notification.created_at)}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-10 text-center">
                    <p className="font-medium text-text-primary">
                      No notifications yet
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      New chat, job, sales, billing, and inventory updates will
                      show up here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
