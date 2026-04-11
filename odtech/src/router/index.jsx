import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import AdminRoute from './AdminRoute'
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
import SalesPage     from '../pages/sales/SalesPage'
import MerchantHubPage from '../pages/merchant-hub/MerchantHubPage'
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
      { index: true,                    path: '/dashboard',        element: <AdminRoute><AdminDashboard /></AdminRoute> },
      { path: '/dashboard/worker',       element: <WorkerDashboard /> },
      { path: '/customers',              element: <CustomersPage /> },
      { path: '/customers/:id',          element: <CustomerDetailPage /> },
      { path: '/jobs',                   element: <JobsPage /> },
      { path: '/jobs/:id',               element: <JobDetailPage /> },
      { path: '/workers',                element: <AdminRoute><WorkersPage /></AdminRoute> },
      { path: '/workers/:id',            element: <AdminRoute><WorkerDetailPage /></AdminRoute> },
      { path: '/inventory',              element: <AdminRoute><InventoryPage /></AdminRoute> },
      { path: '/inventory/:id',          element: <AdminRoute><InventoryDetailPage /></AdminRoute> },
      { path: '/sales',                  element: <AdminRoute><SalesPage /></AdminRoute> },
      { path: '/merchant-hub',           element: <AdminRoute><MerchantHubPage /></AdminRoute> },
      { path: '/billing',                element: <AdminRoute><BillingPage /></AdminRoute> },
      { path: '/receipts',               element: <AdminRoute><ReceiptsPage /></AdminRoute> },
      { path: '/reports',                element: <AdminRoute><ReportsPage /></AdminRoute> },
      { path: '/chat',                   element: <ChatPage /> },
      { path: '/settings',               element: <SettingsPage /> },
      { path: '*',                       element: <Navigate to="/dashboard" replace /> },
    ],
  },
])

export default function Router() {
  return <RouterProvider router={router} />
}
