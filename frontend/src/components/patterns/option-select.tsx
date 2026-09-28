import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

/**
 * shadcn Select driven by an options list. Values are strings; `null` means
 * "nothing chosen". `emptyLabel` adds a selectable null row ("Unassigned",
 * "All teams"); without it, `placeholder` shows until something is picked.
 */
export function OptionSelect({
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
  const items: { value: string | null; label: string }[] = emptyLabel ? [{ value: null, label: emptyLabel }, ...options] : options
  return (
    <Select items={items} value={value} onValueChange={(v) => onValueChange((v as string | null) ?? null)} disabled={disabled}>
      <SelectTrigger id={id} aria-label={ariaLabel} aria-invalid={invalid || undefined} className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {items.map((item) => (
          <SelectItem key={item.value ?? '__empty'} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
