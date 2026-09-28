import { Check } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import type { Tag } from '@/types/api'

/** Multi-select tags as shadcn Toggles (each announces pressed/not pressed). */
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
  if (tags.length === 0) {
    return <p className="text-xs text-muted-foreground">No tags yet. Add them in Settings → Tags.</p>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const active = selectedIds.includes(tag.id)
        return (
          <Toggle
            key={tag.id}
            variant="outline"
            size="sm"
            pressed={active}
            disabled={disabled}
            onPressedChange={(pressed) =>
              onChange(pressed ? [...selectedIds, tag.id] : selectedIds.filter((i) => i !== tag.id))
            }
            className="rounded-full data-pressed:border-primary/30 data-pressed:bg-primary/10 data-pressed:text-primary"
          >
            {active && <Check data-icon="inline-start" />}
            {tag.name}
          </Toggle>
        )
      })}
    </div>
  )
}
