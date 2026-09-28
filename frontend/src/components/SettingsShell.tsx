import { Outlet } from 'react-router-dom'
import { Folder, ShieldCheck, SlidersHorizontal, Tags, Timer } from 'lucide-react'
import { NavItem } from '@/components/NavItem'
import { PageHeader } from '@/components/ui/typography'

const NAV = [
  { to: '/settings/roles', label: 'Roles', icon: ShieldCheck },
  { to: '/settings/categories', label: 'Categories', icon: Folder },
  { to: '/settings/sla', label: 'SLA', icon: Timer },
  { to: '/settings/tags', label: 'Tags', icon: Tags },
  { to: '/settings/custom-fields', label: 'Custom fields', icon: SlidersHorizontal },
]

export function SettingsShell() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Roles and the values people pick from when creating a ticket." />
      <div className="flex flex-col gap-6 sm:flex-row">
        <nav aria-label="Settings" className="flex shrink-0 flex-row gap-1 overflow-x-auto sm:w-44 sm:flex-col sm:overflow-visible">
          {NAV.map(({ to, label, icon }) => (
            <NavItem key={to} to={to} icon={icon} className="py-2">
              {label}
            </NavItem>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
