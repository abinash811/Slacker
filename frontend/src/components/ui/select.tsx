import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Check, ChevronDown } from 'lucide-react'
import { controlClasses } from '@/components/ui/styles'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

/**
 * The one dropdown. Values are strings; `null` means "nothing chosen".
 * `emptyLabel` adds a selectable null row ("Unassigned", "All teams");
 * without it, `placeholder` shows until something is picked.
 */
export function Select({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  emptyLabel,
  disabled,
  invalid,
  className,
  'aria-label': ariaLabel,
}: {
  id?: string
  value: string | null
  onValueChange: (value: string | null) => void
  options: SelectOption[]
  placeholder?: string
  emptyLabel?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
  'aria-label'?: string
}) {
  const items: { value: string | null; label: string }[] = emptyLabel
    ? [{ value: null, label: emptyLabel }, ...options]
    : options

  return (
    <SelectPrimitive.Root
      items={items}
      value={value}
      onValueChange={(v) => onValueChange((v as string | null) ?? null)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        className={cn(
          controlClasses,
          'flex h-9 cursor-default items-center justify-between gap-2 px-3 text-left',
          'hover:border-muted-foreground/40 data-popup-open:border-ring data-placeholder:text-muted-foreground',
          'data-disabled:cursor-not-allowed data-disabled:bg-muted data-disabled:opacity-60',
          className,
        )}
      >
        <SelectPrimitive.Value className="truncate" placeholder={placeholder} />
        <SelectPrimitive.Icon className="shrink-0 text-muted-foreground">
          <ChevronDown className="size-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner className="z-50 outline-none" sideOffset={4} alignItemWithTrigger={false}>
          <SelectPrimitive.Popup
            className={cn(
              'max-h-(--available-height) min-w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-popover outline-none',
              'duration-100 ease-standard data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            )}
          >
            <SelectPrimitive.List>
              {items.map((item) => (
                <SelectPrimitive.Item
                  key={item.value ?? '__empty'}
                  value={item.value}
                  className={cn(
                    'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-7 pr-2 text-sm outline-none',
                    'data-highlighted:bg-muted data-selected:font-medium data-disabled:opacity-50',
                    item.value === null && 'text-muted-foreground',
                  )}
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2 flex size-4 items-center justify-center">
                    <Check className="size-3.5" />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
