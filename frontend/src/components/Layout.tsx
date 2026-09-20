import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { DevUserSwitcher } from '@/components/DevUserSwitcher'

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold tracking-tight">Support Ops</span>
            <nav className="flex items-center gap-1">
              <NavItem to="/">Dashboard</NavItem>
              <NavItem to="/tickets">Tickets</NavItem>
              <NavItem to="/teams">Teams &amp; Permissions</NavItem>
            </nav>
          </div>
          <DevUserSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground',
          isActive && 'bg-muted text-foreground',
        )
      }
    >
      {children}
    </NavLink>
  )
}
