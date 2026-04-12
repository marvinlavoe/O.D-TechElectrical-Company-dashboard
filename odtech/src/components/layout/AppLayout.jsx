import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import useSidebarStore from '../../store/useSidebarStore'

export default function AppLayout() {
  const { isCollapsed } = useSidebarStore()

  return (
    <div className="flex min-h-screen overflow-hidden bg-surface text-text-primary">
      <Sidebar />
      <div className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-300 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <Header />
        <main className="flex-1 overflow-y-auto bg-surface px-4 py-4 sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
