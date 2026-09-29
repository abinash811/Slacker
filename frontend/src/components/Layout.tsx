import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { DevUserSwitcher } from '@/components/DevUserSwitcher'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { NavItem } from '@/components/NavItem'
import { PageSkeleton } from '@/components/patterns/states'

export function Layout() {
  const location = useLocation()
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="focus-ring sr-only rounded-md bg-background px-3 py-2 text-sm focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50"
      >
        Skip to content
      </a>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold tracking-tight">Support Ops</span>
            <nav aria-label="Main" className="flex items-center gap-1">
              <NavItem to="/" end>Dashboard</NavItem>
              <NavItem to="/tickets">Tickets</NavItem>
              <NavItem to="/teams">Teams</NavItem>
              <NavItem to="/settings">Settings</NavItem>
              <NavItem to="/connect">Connect Claude</NavItem>
            </nav>
          </div>
          <DevUserSwitcher />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-6 py-6">
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}
