# ElectroManager — React App Implementation Plan

A comprehensive business management platform for electrical engineering companies. This plan organizes
development into **6 phases**, from project scaffolding through deployment, ensuring a stable, feature-rich
application is built incrementally.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Routing | React Router v6 |
| State | Zustand (global) + React Query (server state) |
| Backend / DB | Supabase (Auth, Postgres DB, Storage, Realtime) |
| Charts | Recharts |
| Calendar | FullCalendar (React adapter) |
| PDF/Excel Export | jsPDF + SheetJS |
| Notifications | React Hot Toast + Supabase Realtime |
| Offline Support | Workbox (PWA service worker) |
| Maps (Optional) | Leaflet.js + OpenStreetMap |

---

## Phase 1 — Project Setup & Foundation

> **Goal**: Scaffold the project, set up routing, design system, and shared layout components.

### 1.1 Project Scaffolding
- Run `npm create vite@latest electromanager -- --template react`
- Install all dependencies: Tailwind CSS, React Router, Zustand, React Query, Supabase JS client, Recharts, FullCalendar, jsPDF, SheetJS, Workbox plugin

### 1.2 Folder Structure

```
src/
├── assets/            # Images, icons, logos
├── components/        # Shared/reusable UI components
│   ├── ui/            # Buttons, Inputs, Badges, Modals, Cards
│   ├── layout/        # Sidebar, Header, PageWrapper
│   └── charts/        # Reusable chart wrappers
├── pages/             # One folder per screen/module
│   ├── auth/          # Login, Signup, ForgotPassword
│   ├── dashboard/
│   ├── customers/
│   ├── jobs/
│   ├── workers/
│   ├── inventory/
│   ├── reports/
│   ├── chat/
│   ├── billing/
│   └── settings/
├── store/             # Zustand stores per domain
├── hooks/             # Custom hooks
├── services/          # Supabase query functions
├── lib/               # supabase client, utils
└── router/            # React Router configuration
```

### 1.3 Supabase Setup
- Create Supabase project
- Configure `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Enable Row Level Security (RLS) policies on all tables
- Configure Supabase Storage buckets: `customer-files`, `job-photos`, `chat-attachments`

### 1.4 Shared UI Components
- `Button`, `Input`, `Select`, `Textarea`, `Badge`, `Avatar`
- `Modal` (with backdrop + focus trap)
- `DataTable` (sortable, searchable, paginated)
- `PageHeader`, `StatCard`, `EmptyState`, `LoadingSpinner`

### 1.5 Layout & Routing
- `AppLayout` — authenticated shell (Sidebar + Header + `<Outlet />`)
- `AuthLayout` — unauthenticated shell (centered card)
- Route guards: `<ProtectedRoute>` redirects unauthenticated users
- Role-based rendering: `admin` vs `worker` role from Supabase `profiles` table

### Deliverables
- [ ] Vite + React + Tailwind project running
- [ ] Supabase project connected
- [ ] Routing working with auth guard
- [ ] Design system tokens (colors, fonts, spacing) defined in `tailwind.config.js`
- [ ] Sidebar with all nav links and active state

---

## Phase 2 — Authentication & User Profiles

> **Goal**: Full auth flow + role-based access for Admin vs Worker.

### Screens
| Screen | Path |
|---|---|
| Splash Screen | `/` (redirects after 2s) |
| Login | `/login` |
| Signup | `/signup` |
| Forgot Password | `/forgot-password` |
| Reset Password | `/reset-password` |

### Supabase Tables
```sql
-- profiles (extends auth.users)
id uuid references auth.users primary key,
full_name text,
phone text,
role text check (role in ('admin', 'worker')),
avatar_url text,
specialization text,
created_at timestamptz default now()
```

### Features
- Supabase Email/Password auth with `onAuthStateChange` listener
- Redirect workers to worker dashboard, admins to admin dashboard
- Profile edit page (avatar upload to Supabase Storage)
- Session persistence (Supabase handles this natively)

### Deliverables
- [ ] Login / Signup / Forgot Password screens complete
- [ ] Role-based redirect after login
- [ ] Auth state in Zustand (`useAuthStore`)
- [ ] User profile CRUD

---

## Phase 3 — Core Modules (Screens 4–9)

> **Goal**: Implement all primary data management features.

---

### 3.1 Customer Management (`/customers`)

#### Supabase Table
```sql
customers: id, name, phone, email, address, project_type,
           payment_status, notes, created_at, updated_at
```

#### Features
- Customer list with search, filter (by project type, payment status), and pagination
- Add / Edit / Delete customer (slide-over drawer form)
- Customer detail page: project history timeline, payment status badge, attached files
- File attachments (wiring diagrams, site photos) → Supabase Storage `customer-files`
- Payment status: `Paid`, `Partial`, `Unpaid` — color-coded badge

---

### 3.2 Job Scheduling & Assignment (`/jobs`)

#### Supabase Tables
```sql
jobs: id, title, description, customer_id, status, priority,
      scheduled_date, scheduled_time, location, created_by, created_at

job_assignments: id, job_id, worker_id, assigned_at
```

#### Features
- **List View** — filterable by status (`Pending`, `In Progress`, `Completed`) and priority (`High`, `Medium`, `Low`)
- **Calendar View** — FullCalendar month/week/day view with job events; click to open detail
- **Add Job Drawer** — select customer, assign workers, set date/time, location, priority
- Drag-and-drop reschedule on calendar
- Job detail page: status updates, worker assignments, before/after photo uploads
- Status workflow: `Pending → In Progress → Completed`

---

### 3.3 Workforce Management (`/workers`)

#### Supabase Tables
```sql
-- Extends profiles table
work_logs: id, worker_id, job_id, hours_worked, date, notes
```

#### Features
- Worker directory: cards with avatar, name, specialization, current job badge
- Worker detail page: assigned jobs list, work log history, performance summary
- Work hours logging (admin can log hours per job per worker)
- Auto-suggest assignment: filter available workers by specialization and current workload
- Performance card: jobs completed this month, total hours, average rating

---

### 3.4 Inventory & Equipment Tracking (`/inventory`)

#### Supabase Table
```sql
inventory: id, name, category, quantity, unit, low_stock_threshold,
           assigned_to_job_id, supplier, cost_per_unit, created_at
```

#### Features
- Inventory list with category filter (Cables, Breakers, Tools, etc.)
- Add / Edit / Delete items
- **Low-stock alerts**: items below `low_stock_threshold` shown with a warning badge
- Assign materials to a job (deduct from stock)
- Usage history per item
- Usage report export (see Phase 5)

---

### 3.5 Billing & Quotations (`/billing`)

#### Supabase Tables
```sql
quotes: id, customer_id, items (jsonb), total, status, valid_until, created_at
invoices: id, quote_id, customer_id, amount_paid, balance, due_date, status
payments: id, invoice_id, amount, method, paid_at, notes
```

#### Features
- Create quotation: line-item builder (description, qty, unit price → auto-totals)
- Convert quote to invoice with one click
- Payment recording against invoice (supports partial payments)
- Outstanding balance tracker per customer
- PDF print/share of quote and invoice using jsPDF
- Payment status: `Draft`, `Sent`, `Paid`, `Overdue`

---

### 3.6 Reports & Analytics (`/reports`)

#### Features
- **Overview Cards**: Total jobs this month, revenue, active workers, open invoices
- **Charts** (Recharts):
  - Jobs by status (donut chart)
  - Revenue over time (line chart — weekly/monthly toggle)
  - Worker performance (bar chart — jobs completed)
  - Inventory usage (bar chart — top 5 categories)
- Date range filter (custom start/end dates)
- **Export**: PDF (jsPDF) and Excel (SheetJS) for all report tables

---

## Phase 4 — Communication & Notifications

> **Goal**: Real-time in-app messaging and notification system.

### 4.1 In-App Chat (`/chat`)

#### Supabase Tables
```sql
channels: id, name, job_id (nullable), created_by, created_at
messages: id, channel_id, sender_id, content, attachment_url, created_at
```

#### Features
- Channel sidebar: Direct Messages + Job Group Chats (auto-created per job)
- Real-time messages via **Supabase Realtime** subscriptions
- Text messages + image/file attachments (Supabase Storage)
- Read receipts (message `seen_by` array)
- Admin broadcast message to all workers

### 4.2 Notifications System

#### Features
- **Toast notifications** (React Hot Toast) for in-app actions
- **Notification centre** (bell icon in header): list of alerts
- Alert types:
  - 🔴 Low inventory stock
  - 🟡 Overdue invoice
  - 🔵 New job assigned (for workers)
  - ⏰ Upcoming job reminder (24h before scheduled time)
- Supabase Realtime subscription on `notifications` table
- Mark as read / clear all

#### Supabase Table
```sql
notifications: id, user_id, type, title, body, is_read, link, created_at
```

---

## Phase 5 — PWA & Offline Support

> **Goal**: Make the app installable and usable without internet connectivity.

### Features
- Configure **Vite PWA plugin** (Workbox) with service worker
- Cache strategy:
  - Static assets → Cache First
  - API/Supabase data → Network First with fallback to cache
- Offline indicator banner when connectivity lost
- Background sync: queue mutations (new job, customer update) while offline, sync on reconnect
- `manifest.json`: app name, icons, theme color for install prompt
- App installable as PWA on Android, iOS, and Desktop

---

## Phase 6 — Polish, Testing & Deployment

> **Goal**: Production-ready app with tests, performance tuning, and hosting.

### 6.1 Testing

#### Unit Tests (Vitest + React Testing Library)
- Auth store logic
- Billing total calculations
- Form validation utilities

#### Integration Tests
- Customer CRUD flow
- Job creation and worker assignment flow
- Invoice payment flow

#### End-to-End Tests (Playwright)
- Login → Dashboard navigation
- Create job → assign worker → mark complete
- Generate and download a PDF report

**Run tests:**
```bash
# Unit + Integration
npx vitest run

# E2E
npx playwright test
```

### 6.2 Performance Optimizations
- Code splitting with React lazy + Suspense per route
- React Query caching + stale-while-revalidate
- Virtualized lists for large data tables (react-window)
- Image optimization via Supabase Storage transform URLs

### 6.3 Role-Based Access Control (RBAC)
| Feature | Admin | Worker |
|---|---|---|
| View all jobs | ✅ | Own jobs only |
| Assign workers | ✅ | ❌ |
| Manage inventory | ✅ | View only |
| View all reports | ✅ | Own stats |
| Billing / Quotes | ✅ | ❌ |
| Chat | ✅ | ✅ |
| Profile edit | ✅ | Own only |

### 6.4 Deployment
- **Frontend**: Vercel (connect GitHub repo, auto-deploy on push to `main`)
- **Backend**: Supabase (managed — no server needed)
- Environment variables configured in Vercel dashboard
- Custom domain setup in Vercel

---

## Phased Timeline (Estimated)

| Phase | Duration | Key Milestone |
|---|---|---|
| Phase 1 — Foundation | Week 1–2 | Project running, design system done |
| Phase 2 — Auth | Week 2–3 | Login/signup flows complete |
| Phase 3 — Core Modules | Week 3–7 | All 6 main screens functional |
| Phase 4 — Chat & Notifications | Week 7–8 | Real-time features working |
| Phase 5 — PWA & Offline | Week 8–9 | App installable, offline-capable |
| Phase 6 — Testing & Deploy | Week 9–10 | Live on Vercel with all tests passing |

---

## Database Schema Overview (Supabase)

```
profiles      →  jobs (created_by)
profiles      →  job_assignments (assigned_to)
profiles      →  work_logs
profiles      →  messages (sends)
customers     →  jobs
customers     →  quotes
jobs          →  job_assignments
jobs          →  inventory (usage)
quotes        →  invoices
invoices      →  payments
notifications →  users (per user)
```

---

## Verification Plan

### Automated Tests
```bash
# Run all unit tests
npx vitest run --reporter=verbose

# Run E2E tests (requires local dev server running)
npx playwright test --headed
```

### Manual Verification Checklist
1. **Auth**: Register a new admin user → verify redirect to dashboard → logout → login as worker → verify limited view
2. **Customers**: Add a customer → attach a file → edit details → verify payment status change
3. **Jobs**: Create a job with High priority → assign to worker → switch to calendar view → confirm job appears on correct date
4. **Inventory**: Add item → set quantity below threshold → verify low-stock alert appears in notification centre
5. **Billing**: Create quotation → convert to invoice → record partial payment → verify outstanding balance
6. **Reports**: Navigate to `/reports` → change date range → verify charts update → export as PDF → verify PDF downloads correctly
7. **Chat**: Send a message in a job group chat → verify second logged-in user receives it in real time
8. **Offline**: Disable network → add a customer → re-enable network → verify data syncs to Supabase
9. **PWA**: Open app in Chrome → verify "Install" prompt → install → open from home screen → confirm works as standalone app
