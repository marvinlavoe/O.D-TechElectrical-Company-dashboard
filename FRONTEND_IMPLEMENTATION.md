# ⚡ ElectroManager — Frontend Implementation Guide

A detailed breakdown of every screen, component, route, and state structure for the React frontend.

---

## 1. Project Setup

### Install & Bootstrap

```bash
npm create vite@latest electromanager -- --template react
cd electromanager
npm install
```

### Install All Dependencies

```bash
# Core
npm install react-router-dom @supabase/supabase-js

# State & Data Fetching
npm install zustand @tanstack/react-query

# UI & Styling
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Icons
npm install lucide-react

# Calendar
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction

# Charts
npm install recharts

# Notifications
npm install react-hot-toast

# PDF & Excel Export
npm install jspdf jspdf-autotable xlsx

# Date Utilities
npm install date-fns

# PWA (Offline)
npm install -D vite-plugin-pwa
```

### Tailwind Config (`tailwind.config.js`)

```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary:  { DEFAULT: '#F59E0B', dark: '#D97706', light: '#FDE68A' },
        surface:  { DEFAULT: '#1E293B', card: '#0F172A', border: '#334155' },
        text:     { primary: '#F1F5F9', secondary: '#94A3B8', muted: '#64748B' },
        success:  '#10B981',
        warning:  '#F59E0B',
        danger:   '#EF4444',
        info:     '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

### Global CSS (`src/index.css`)

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-surface text-text-primary font-sans antialiased;
  }
  ::-webkit-scrollbar { @apply w-1.5; }
  ::-webkit-scrollbar-track { @apply bg-surface; }
  ::-webkit-scrollbar-thumb { @apply bg-surface-border rounded-full; }
}
```

### Environment Variables (`.env`)

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 2. Folder Structure

```
src/
├── assets/
│   └── logo.svg
├── components/
│   ├── ui/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Select.jsx
│   │   ├── Badge.jsx
│   │   ├── Avatar.jsx
│   │   ├── Modal.jsx
│   │   ├── Drawer.jsx
│   │   ├── StatCard.jsx
│   │   ├── DataTable.jsx
│   │   ├── EmptyState.jsx
│   │   └── LoadingSpinner.jsx
│   ├── layout/
│   │   ├── AppLayout.jsx
│   │   ├── AuthLayout.jsx
│   │   ├── Sidebar.jsx
│   │   └── Header.jsx
│   └── charts/
│       ├── RevenueChart.jsx
│       ├── JobStatusChart.jsx
│       └── WorkerPerformanceChart.jsx
├── pages/
│   ├── auth/
│   │   ├── SplashPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   └── ForgotPasswordPage.jsx
│   ├── dashboard/
│   │   ├── AdminDashboard.jsx
│   │   └── WorkerDashboard.jsx
│   ├── customers/
│   │   ├── CustomersPage.jsx
│   │   ├── CustomerDetailPage.jsx
│   │   └── CustomerForm.jsx
│   ├── jobs/
│   │   ├── JobsPage.jsx
│   │   ├── JobDetailPage.jsx
│   │   ├── JobCalendarView.jsx
│   │   └── JobForm.jsx
│   ├── workers/
│   │   ├── WorkersPage.jsx
│   │   └── WorkerDetailPage.jsx
│   ├── inventory/
│   │   └── InventoryPage.jsx
│   ├── billing/
│   │   ├── BillingPage.jsx
│   │   ├── QuoteForm.jsx
│   │   └── InvoiceDetail.jsx
│   ├── reports/
│   │   └── ReportsPage.jsx
│   ├── chat/
│   │   └── ChatPage.jsx
│   └── settings/
│       └── SettingsPage.jsx
├── store/
│   ├── useAuthStore.js
│   ├── useJobStore.js
│   └── useNotificationStore.js
├── services/
│   ├── auth.service.js
│   ├── customer.service.js
│   ├── job.service.js
│   ├── worker.service.js
│   ├── inventory.service.js
│   ├── billing.service.js
│   └── chat.service.js
├── hooks/
│   ├── useCustomers.js
│   ├── useJobs.js
│   └── useInventory.js
├── lib/
│   ├── supabase.js
│   └── utils.js
└── router/
    ├── index.jsx
    └── ProtectedRoute.jsx
```

---

## 3. Routing (`src/router/index.jsx`)

```jsx
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import AppLayout from '../components/layout/AppLayout'
import AuthLayout from '../components/layout/AuthLayout'

// Auth
import SplashPage from '../pages/auth/SplashPage'
import LoginPage from '../pages/auth/LoginPage'
import SignupPage from '../pages/auth/SignupPage'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage'

// Pages
import AdminDashboard from '../pages/dashboard/AdminDashboard'
import WorkerDashboard from '../pages/dashboard/WorkerDashboard'
import CustomersPage from '../pages/customers/CustomersPage'
import CustomerDetailPage from '../pages/customers/CustomerDetailPage'
import JobsPage from '../pages/jobs/JobsPage'
import JobDetailPage from '../pages/jobs/JobDetailPage'
import WorkersPage from '../pages/workers/WorkersPage'
import WorkerDetailPage from '../pages/workers/WorkerDetailPage'
import InventoryPage from '../pages/inventory/InventoryPage'
import BillingPage from '../pages/billing/BillingPage'
import ReportsPage from '../pages/reports/ReportsPage'
import ChatPage from '../pages/chat/ChatPage'
import SettingsPage from '../pages/settings/SettingsPage'

const router = createBrowserRouter([
  { path: '/',         element: <SplashPage /> },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login',           element: <LoginPage /> },
      { path: '/signup',          element: <SignupPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  {
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { path: '/dashboard',              element: <AdminDashboard /> },
      { path: '/dashboard/worker',       element: <WorkerDashboard /> },
      { path: '/customers',             element: <CustomersPage /> },
      { path: '/customers/:id',         element: <CustomerDetailPage /> },
      { path: '/jobs',                  element: <JobsPage /> },
      { path: '/jobs/:id',              element: <JobDetailPage /> },
      { path: '/workers',               element: <WorkersPage /> },
      { path: '/workers/:id',           element: <WorkerDetailPage /> },
      { path: '/inventory',             element: <InventoryPage /> },
      { path: '/billing',               element: <BillingPage /> },
      { path: '/reports',               element: <ReportsPage /> },
      { path: '/chat',                  element: <ChatPage /> },
      { path: '/settings',              element: <SettingsPage /> },
    ],
  },
])

export default function Router() {
  return <RouterProvider router={router} />
}
```

### Protected Route (`src/router/ProtectedRoute.jsx`)

```jsx
import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'

export default function ProtectedRoute({ children }) {
  const { session } = useAuthStore()
  return session ? children : <Navigate to="/login" replace />
}
```

---

## 4. Supabase Client (`src/lib/supabase.js`)

```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

---

## 5. Global State (`src/store/`)

### Auth Store (`useAuthStore.js`)

```js
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useAuthStore = create((set) => ({
  session: null,
  profile: null,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),

  logout: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null })
  },
}))

export default useAuthStore
```

### App Entry — Auth Listener (`src/main.jsx`)

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { supabase } from './lib/supabase'
import useAuthStore from './store/useAuthStore'
import Router from './router'
import './index.css'

const queryClient = new QueryClient()

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session)
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster position="top-right" />
    </QueryClientProvider>
  </React.StrictMode>
)
```

---

## 6. Layout Components

### Sidebar (`src/components/layout/Sidebar.jsx`)

```jsx
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Briefcase, HardHat,
  Package, FileText, MessageSquare, Settings,
  CreditCard, Zap
} from 'lucide-react'
import useAuthStore from '../../store/useAuthStore'

const NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customers',  icon: Users,           label: 'Customers' },
  { to: '/jobs',       icon: Briefcase,       label: 'Jobs' },
  { to: '/workers',    icon: HardHat,         label: 'Workers',  adminOnly: true },
  { to: '/inventory',  icon: Package,         label: 'Inventory' },
  { to: '/billing',    icon: CreditCard,      label: 'Billing',  adminOnly: true },
  { to: '/reports',    icon: FileText,        label: 'Reports',  adminOnly: true },
  { to: '/chat',       icon: MessageSquare,   label: 'Chat' },
  { to: '/settings',   icon: Settings,        label: 'Settings' },
]

export default function Sidebar() {
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'

  return (
    <aside className="w-64 h-screen bg-surface-card border-r border-surface-border flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-surface-border">
        <Zap className="text-primary w-6 h-6" />
        <span className="font-bold text-lg text-text-primary">ElectroManager</span>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV.filter(item => !item.adminOnly || isAdmin).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors
               ${isActive
                 ? 'bg-primary/10 text-primary'
                 : 'text-text-secondary hover:bg-surface hover:text-text-primary'}`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div className="px-4 py-4 border-t border-surface-border">
        <p className="text-sm font-medium text-text-primary truncate">{profile?.full_name}</p>
        <p className="text-xs text-text-muted capitalize">{profile?.role}</p>
      </div>
    </aside>
  )
}
```

### Header (`src/components/layout/Header.jsx`)

```jsx
import { Bell, Search } from 'lucide-react'
import useNotificationStore from '../../store/useNotificationStore'

export default function Header({ title }) {
  const { unreadCount } = useNotificationStore()

  return (
    <header className="h-16 bg-surface-card border-b border-surface-border flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            placeholder="Search..."
            className="bg-surface border border-surface-border rounded-lg pl-9 pr-4 py-1.5 text-sm
                       text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary w-56"
          />
        </div>
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-surface transition-colors">
          <Bell size={20} className="text-text-secondary" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
          )}
        </button>
      </div>
    </header>
  )
}
```

### App Layout (`src/components/layout/AppLayout.jsx`)

```jsx
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-surface">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

---

## 7. Reusable UI Components

### Button (`src/components/ui/Button.jsx`)

```jsx
const variants = {
  primary:  'bg-primary hover:bg-primary-dark text-white',
  outline:  'border border-surface-border text-text-secondary hover:bg-surface hover:text-text-primary',
  danger:   'bg-danger hover:bg-red-600 text-white',
  ghost:    'text-text-secondary hover:bg-surface hover:text-text-primary',
}

export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
  return (
    <button
      className={`inline-flex items-center gap-2 font-medium rounded-lg transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
```

### Badge (`src/components/ui/Badge.jsx`)

```jsx
const colors = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger:  'bg-danger/10 text-danger',
  info:    'bg-info/10 text-info',
  default: 'bg-surface text-text-secondary',
}

export default function Badge({ label, color = 'default' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {label}
    </span>
  )
}
```

### StatCard (`src/components/ui/StatCard.jsx`)

```jsx
export default function StatCard({ title, value, subtitle, icon: Icon, color = 'text-primary' }) {
  return (
    <div className="bg-surface-card rounded-xl p-5 border border-surface-border">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-text-secondary">{title}</p>
        <div className={`p-2 rounded-lg bg-surface ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
    </div>
  )
}
```

### DataTable (`src/components/ui/DataTable.jsx`)

```jsx
import { useState } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

export default function DataTable({ columns, data, pageSize = 10 }) {
  const [query, setQuery]   = useState('')
  const [page, setPage]     = useState(1)

  const filtered = data.filter(row =>
    columns.some(col => String(row[col.key] ?? '').toLowerCase().includes(query.toLowerCase()))
  )
  const totalPages = Math.ceil(filtered.length / pageSize)
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
      {/* Search */}
      <div className="p-4 border-b border-surface-border">
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1) }}
            placeholder="Search..."
            className="w-full bg-surface border border-surface-border rounded-lg pl-8 pr-3 py-1.5
                       text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-surface-border">
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {slice.map((row, i) => (
              <tr key={i} className="hover:bg-surface transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-text-secondary">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="p-4 border-t border-surface-border flex items-center justify-between">
        <p className="text-xs text-text-muted">
          Showing {Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
        </p>
        <div className="flex gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-1.5 rounded hover:bg-surface disabled:opacity-40">
            <ChevronLeft size={16} className="text-text-secondary" />
          </button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-1.5 rounded hover:bg-surface disabled:opacity-40">
            <ChevronRight size={16} className="text-text-secondary" />
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## 8. Screen-by-Screen Breakdown

### Screen 1 — Splash Page
**File**: `src/pages/auth/SplashPage.jsx`
- Full-screen dark background with animated logo and tagline
- Auto-redirect to `/login` after 2.5 seconds (`setTimeout` + `useNavigate`)

---

### Screen 2 — Login Page
**File**: `src/pages/auth/LoginPage.jsx`

```jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate                = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return toast.error(error.message)

    // Fetch role then redirect
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single()
    navigate(profile?.role === 'admin' ? '/dashboard' : '/dashboard/worker')
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
      <p className="text-center text-sm text-text-muted">
        <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
      </p>
    </form>
  )
}
```

---

### Screen 3 — Admin Dashboard
**File**: `src/pages/dashboard/AdminDashboard.jsx`

**Layout**:
```
┌─────────────────────────────────────────────┐
│  Stat Cards Row: Jobs Today | Revenue | Workers | Alerts │
├───────────────────────┬─────────────────────┤
│  Revenue Chart (line) │  Job Status (donut) │
├───────────────────────┴─────────────────────┤
│  Recent Jobs Table (last 5)                 │
│  Low Stock Alerts                           │
└─────────────────────────────────────────────┘
```

**Stat Cards**:
- Total jobs scheduled today
- Revenue this month (₵ or local currency)
- Active workers on jobs
- Overdue invoices count (with danger badge)

---

### Screen 4 — Customers Page
**File**: `src/pages/customers/CustomersPage.jsx`

**Features**:
- `DataTable` with columns: Name, Phone, Address, Project Type, Payment Status, Actions
- Filter bar: All | Active | Inactive | Payment status dropdown
- "Add Customer" button → opens `CustomerForm` in a `Drawer`
- Row click → navigate to `/customers/:id`

**Payment Status Badge Colors**:
| Status | Color |
|---|---|
| Paid | `success` |
| Partial | `warning` |
| Unpaid | `danger` |

---

### Screen 5 — Jobs Page
**File**: `src/pages/jobs/JobsPage.jsx`

**Layout**: Toggle between **List View** and **Calendar View**

**List View Columns**: Title, Customer, Technician(s), Scheduled Date, Priority, Status, Actions

**Calendar View**:
```jsx
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

<FullCalendar
  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
  headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
  events={jobs.map(job => ({
    id: job.id,
    title: job.title,
    start: job.scheduled_date + 'T' + job.scheduled_time,
    color: job.priority === 'High' ? '#EF4444' : job.priority === 'Medium' ? '#F59E0B' : '#10B981',
  }))}
  eventClick={({ event }) => navigate(`/jobs/${event.id}`)}
  editable={true}
  droppable={true}
/>
```

**Priority Badges**:
| Priority | Color |
|---|---|
| High | `danger` |
| Medium | `warning` |
| Low | `success` |

---

### Screen 6 — Workers Page
**File**: `src/pages/workers/WorkersPage.jsx`

**Layout**: Card grid view (not table) — each card shows:
- Avatar + name + specialization
- Current job badge (or "Available" in green)
- Jobs completed count
- "View Profile" link → `/workers/:id`

**Worker Detail Page** shows:
- Profile header (avatar, name, specialization, phone)
- Current assignment card
- Work log table (date | job | hours)
- Performance summary: jobs completed this month, total hours

---

### Screen 7 — Inventory Page
**File**: `src/pages/inventory/InventoryPage.jsx`

**Layout**:
```
┌─────────────────────────────────────────────┐
│ Filter: All | Cables | Breakers | Tools ...  │
├─────────────────────────────────────────────┤
│ DataTable: Name | Category | Qty | Unit |   │
│            Threshold | Status | Actions     │
└─────────────────────────────────────────────┘
```

**Low-stock logic**: if `quantity <= low_stock_threshold`, show warning badge and highlight row.

---

### Screen 8 — Billing Page
**File**: `src/pages/billing/BillingPage.jsx`

**Tabs**: Quotes | Invoices | Payments

**Quote Builder** (`QuoteForm.jsx`):
```
Customer dropdown
Line items table:
  [Description] [Qty] [Unit Price] [Total]
  [+ Add Item]
Subtotal / Tax / Grand Total (auto-calculated)
[Save as Draft] [Send to Customer] [Convert to Invoice]
```

**Invoice Status workflow**: `Draft → Sent → Partially Paid → Paid / Overdue`

**PDF export**:
```js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const doc = new jsPDF()
doc.text('ElectroManager — Invoice', 14, 15)
autoTable(doc, { head: [['Item', 'Qty', 'Price', 'Total']], body: lineItems })
doc.save(`invoice-${invoice.id}.pdf`)
```

---

### Screen 9 — Reports Page
**File**: `src/pages/reports/ReportsPage.jsx`

**Layout**:
```
┌──────────────────┬───────────────────────────┐
│  Date Range      │  Export: [PDF] [Excel]    │
├──────────────────┴───────────────────────────┤
│  Revenue Over Time (LineChart)               │
├──────────────────┬───────────────────────────┤
│  Job Status      │  Worker Performance       │
│  (PieChart)      │  (BarChart)               │
├──────────────────┴───────────────────────────┤
│  Inventory Usage (BarChart — top categories) │
└──────────────────────────────────────────────┘
```

**Excel Export**:
```js
import * as XLSX from 'xlsx'

const ws = XLSX.utils.json_to_sheet(reportData)
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Report')
XLSX.writeFile(wb, 'electromanager-report.xlsx')
```

---

### Screen 10 — Chat Page
**File**: `src/pages/chat/ChatPage.jsx`

**Layout**:
```
┌─────────────┬────────────────────────────────┐
│  Channels   │  Message Thread                │
│  ─────────  │  ──────────────────────        │
│  DMs        │  [Avatar] sender · timestamp   │
│  Job Chats  │  message content               │
│             │  ──────────────────────────    │
│             │  [Attach] [Input field] [Send] │
└─────────────┴────────────────────────────────┘
```

**Realtime subscription**:
```js
supabase
  .channel('messages')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages',
      filter: `channel_id=eq.${channelId}` },
    (payload) => setMessages(prev => [...prev, payload.new])
  )
  .subscribe()
```

---

### Screen 11 — Settings / Profile Page
**File**: `src/pages/settings/SettingsPage.jsx`

**Tabs**:
- **Profile** — Edit name, phone, avatar upload
- **Security** — Change password
- **Notifications** — Toggle notification preferences
- **System** (admin only) — Company name, logo, default currency

---

## 9. Data Fetching Pattern (React Query + Supabase)

```js
// src/hooks/useCustomers.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useAddCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (customer) => {
      const { error } = await supabase.from('customers').insert(customer)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}
```

---

## 10. PWA Configuration (`vite.config.js`)

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/.+\.supabase\.co\/.*/,
          handler: 'NetworkFirst',
          options: { cacheName: 'supabase-api', networkTimeoutSeconds: 10 },
        }],
      },
      manifest: {
        name: 'ElectroManager',
        short_name: 'ElectroMgr',
        theme_color: '#F59E0B',
        background_color: '#0F172A',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
```

---

## 11. Build & Run Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run unit tests
npx vitest run

# Run E2E tests
npx playwright test
```

---

*Last updated: March 2026*
