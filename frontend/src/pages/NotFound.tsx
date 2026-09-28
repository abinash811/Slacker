import { SearchX } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

export function NotFound({
  title = 'Page not found',
  description = "The link may be broken, or the page may have moved.",
}: {
  title?: string
  description?: string
}) {
  return (
    <EmptyState
      variant="bordered"
      icon={SearchX}
      title={title}
      description={description}
      action={<ButtonLink variant="outline" to="/">Go to dashboard</ButtonLink>}
    />
  )
}
