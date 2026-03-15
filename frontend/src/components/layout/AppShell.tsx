import { Outlet, useLocation } from 'react-router-dom'
import TopNav from './TopNav'
import SideNav from './SideNav'
import MobileDock from './MobileDock'
import { PageTransition } from '../visuals/PageTransition'

const AppShell = () => {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <SideNav />
      <div className="md:pl-60 flex-1 flex flex-col bg-[#f6f8fa] min-h-screen overflow-x-hidden">
        <TopNav />
        <main className="flex-1 overflow-x-hidden min-w-0 px-4 py-5 pb-20 md:px-8 md:py-6 md:pb-6">
          <PageTransition key={pathname}>
            <Outlet />
          </PageTransition>
        </main>
      </div>
      <MobileDock />
    </div>
  )
}

export default AppShell
