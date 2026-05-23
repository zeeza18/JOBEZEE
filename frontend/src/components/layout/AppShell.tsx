import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { cn } from '../../lib/utils'
import TopNav from './TopNav'
import SideNav from './SideNav'
import MobileDock from './MobileDock'
import { PageTransition } from '../visuals/PageTransition'
import FeedbackWidget from '../common/FeedbackWidget'

const AppShell = () => {
  const { pathname } = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden">
      <SideNav open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
      <div
        className={cn(
          'flex-1 flex flex-col bg-[#f6f8fa] min-w-0 overflow-hidden transition-all duration-300 ease-in-out',
          sidebarOpen ? 'md:pl-60' : 'md:pl-16'
        )}
      >
        <TopNav />
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 px-4 py-5 pb-20 md:px-8 md:py-6 md:pb-6">
          <PageTransition key={pathname}>
            <Outlet />
          </PageTransition>
        </main>
      </div>
      <MobileDock />
      <FeedbackWidget sidebarOpen={sidebarOpen} />
    </div>
  )
}

export default AppShell
