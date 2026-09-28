import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tag } from '@/types/api'

/** Multi-select chips. Each chip is a toggle button with aria-pressed. */
export function TagPicker({
  tags,
  selectedIds,
  onChange,
  disabled,
}: {
  tags: Tag[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  disabled?: boolean
}) {
  function toggle(id: number) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id])
  }

  if (tags.length === 0) {
    return <p className="text-xs text-muted-foreground">No tags yet. Add them in Settings → Tags.</p>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const active = selectedIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => toggle(tag.id)}
            className={cn(
              'focus-ring inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
              'transition-colors duration-150 ease-standard disabled:opacity-50',
              active
                ? 'border-accent-foreground/20 bg-accent text-accent-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {active && <Check className="size-3" aria-hidden />}
            {tag.name}
          </button>
        )
      })}
    </div>
  )
}
