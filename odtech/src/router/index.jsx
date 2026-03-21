import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import AppLayout from '../components/layout/AppLayout'
import AuthLayout from '../components/layout/AuthLayout'

// Auth
import SplashPage        from '../pages/auth/SplashPage'
import LoginPage         from '../pages/auth/LoginPage'
import SignupPage        from '../pages/auth/SignupPage'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage'

// Dashboard
import AdminDashboard  from '../pages/dashboard/AdminDashboard'
import WorkerDashboard from '../pages/dashboard/WorkerDashboard'

// Customers
import CustomersPage      from '../pages/customers/CustomersPage'
import CustomerDetailPage from '../pages/customers/CustomerDetailPage'

// Jobs
import JobsPage      from '../pages/jobs/JobsPage'
import JobDetailPage from '../pages/jobs/JobDetailPage'

// Workers
import WorkersPage      from '../pages/workers/WorkersPage'
import WorkerDetailPage from '../pages/workers/WorkerDetailPage'

// Other modules
import InventoryPage from '../pages/inventory/InventoryPage'
import InventoryDetailPage from '../pages/inventory/InventoryDetailPage'
import BillingPage   from '../pages/billing/BillingPage'
import ReceiptsPage  from '../pages/receipts/ReceiptsPage'
import ReportsPage   from '../pages/reports/ReportsPage'
import ChatPage      from '../pages/chat/ChatPage'
import SettingsPage  from '../pages/settings/SettingsPage'

const router = createBrowserRouter([
  { path: '/', element: <SplashPage /> },

  {
    element: <AuthLayout />,
    children: [
      { path: '/login',           element: <LoginPage /> },
      { path: '/signup',          element: <SignupPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
    ],
  },

  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true,                    path: '/dashboard',        element: <AdminDashboard /> },
      { path: '/dashboard/worker',       element: <WorkerDashboard /> },
      { path: '/customers',              element: <CustomersPage /> },
      { path: '/customers/:id',          element: <CustomerDetailPage /> },
      { path: '/jobs',                   element: <JobsPage /> },
      { path: '/jobs/:id',               element: <JobDetailPage /> },
      { path: '/workers',                element: <WorkersPage /> },
      { path: '/workers/:id',            element: <WorkerDetailPage /> },
      { path: '/inventory',              element: <InventoryPage /> },
      { path: '/inventory/:id',          element: <InventoryDetailPage /> },
      { path: '/billing',                element: <BillingPage /> },
      { path: '/receipts',               element: <ReceiptsPage /> },
      { path: '/reports',                element: <ReportsPage /> },
      { path: '/chat',                   element: <ChatPage /> },
      { path: '/settings',               element: <SettingsPage /> },
      { path: '*',                       element: <Navigate to="/dashboard" replace /> },
    ],
  },
])

export default function Router() {
  return <RouterProvider router={router} />
}
