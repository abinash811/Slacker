import { NavLink, Outlet } from 'react-router-dom'
import { Folder, ShieldCheck, SlidersHorizontal, Tags, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/settings/roles', label: 'Roles', icon: ShieldCheck },
  { to: '/settings/categories', label: 'Categories', icon: Folder },
  { to: '/settings/sla', label: 'SLA', icon: Timer },
  { to: '/settings/tags', label: 'Tags', icon: Tags },
  { to: '/settings/custom-fields', label: 'Custom Fields', icon: SlidersHorizontal },
]

export function SettingsShell() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Roles and the values people pick from when creating a ticket.</p>
      </div>
      <div className="flex flex-col gap-6 sm:flex-row">
        <aside className="flex shrink-0 flex-row gap-1 overflow-x-auto sm:w-44 sm:flex-col sm:overflow-visible">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  isActive && 'bg-muted text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </aside>
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
