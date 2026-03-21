import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import useSidebarStore from '../../store/useSidebarStore'

export default function AppLayout() {
  const { isCollapsed } = useSidebarStore()

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-text-primary">
      <Sidebar />
      <div className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-300 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-surface">
          <Outlet />
        </main>
      </div>
    </div>
  )
}