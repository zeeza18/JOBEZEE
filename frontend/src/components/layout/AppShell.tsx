import { Outlet, useLocation } from 'react-router-dom'
import TopNav from './TopNav'
import SideNav from './SideNav'
import MobileDock from './MobileDock'
import { PageTransition } from '../visuals/PageTransition'

const AppShell = () => {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen">
      <SideNav />
      <div className="md:pl-60 flex-1 flex flex-col bg-[#f6f8fa] min-h-screen">
        <TopNav />
        <main className="flex-1 px-6 py-6 md:px-8">
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
