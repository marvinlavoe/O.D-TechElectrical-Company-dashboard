import { Bell, Search, Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import useNotificationStore from '../../store/useNotificationStore'
import useSidebarStore from '../../store/useSidebarStore'

const PAGE_TITLES = {
  '/dashboard':       'Dashboard',
  '/customers':       'Customers',
  '/jobs':            'Jobs & Scheduling',
  '/workers':         'Workforce',
  '/inventory':       'Inventory',
  '/sales':           'Sales',
  '/billing':         'Billing & Quotations',
  '/reports':         'Reports & Analytics',
  '/chat':            'Messages',
  '/settings':        'Settings',
}

export default function Header() {
  const location = useLocation()
  const { unreadCount } = useNotificationStore()
  const { toggleCollapsed, toggleMobile } = useSidebarStore()

  const title = Object.entries(PAGE_TITLES).find(
    ([path]) => location.pathname.startsWith(path)
  )?.[1] ?? 'O.D DASHBOARD'

  return (
    <header className="h-14 bg-surface-card border-b border-surface-border flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
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
        <h1 className="text-base font-semibold text-text-primary">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            placeholder="Search…"
            className="bg-surface border border-surface-border rounded-lg pl-8 pr-4 py-1.5
                       text-sm text-text-primary placeholder:text-text-muted
                       focus:outline-none focus:border-primary transition-colors w-52"
          />
        </div>

        {/* Notification bell */}
        <button className="relative p-2 rounded-lg hover:bg-surface transition-colors">
          <Bell size={18} className="text-text-secondary" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-surface-card" />
          )}
        </button>
      </div>
    </header>
  )
}
