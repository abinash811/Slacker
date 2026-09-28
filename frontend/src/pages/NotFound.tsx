import { SearchX } from 'lucide-react'
import { ButtonLink } from '@/components/patterns/buttons'
import { EmptyState } from '@/components/patterns/states'

export function NotFound({
  title = 'Page not found',
  description = "The link may be broken, or the page may have moved.",
}: {
  title?: string
  description?: string
}) {
  return (
    <EmptyState
      bordered
      icon={SearchX}
      title={title}
      description={description}
      action={<ButtonLink variant="outline" to="/">Go to dashboard</ButtonLink>}
    />
  )
}
