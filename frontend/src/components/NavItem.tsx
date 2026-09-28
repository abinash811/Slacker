import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Navigation link for the top bar and the Settings sidebar: a shadcn ghost button that stays filled while active. */
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
          buttonVariants({ variant: 'ghost' }),
          'justify-start text-muted-foreground',
          isActive && 'bg-muted text-foreground',
          className,
        )
      }
    >
      {Icon && <Icon data-icon="inline-start" aria-hidden />}
      {children}
    </NavLink>
  )
}
