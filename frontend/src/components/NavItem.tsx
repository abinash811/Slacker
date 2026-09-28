import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Navigation link used by the top bar and the Settings sidebar. Active = muted fill + foreground text. */
export function NavItem({
  to,
  end,
  icon: Icon,
  children,
  className,
}: {
  to: string
  end?: boolean
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'focus-ring flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground',
          'transition-colors duration-150 ease-standard hover:bg-muted/60 hover:text-foreground',
          isActive && 'bg-muted text-foreground',
          className,
        )
      }
    >
      {Icon && <Icon className="size-4" aria-hidden />}
      {children}
    </NavLink>
  )
}
