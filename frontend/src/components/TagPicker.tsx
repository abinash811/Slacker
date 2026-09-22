import { cn } from '@/lib/utils'
import type { Tag } from '@/types/api'

export function TagPicker({
  tags,
  selectedIds,
  onChange,
}: {
  tags: Tag[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
}) {
  function toggle(id: number) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id])
  }

  if (tags.length === 0) {
    return <p className="text-xs text-muted-foreground">No tags yet — add some in Form Fields &amp; Dropdowns.</p>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const active = selectedIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted',
            )}
          >
            {tag.name}
          </button>
        )
      })}
    </div>
  )
}
