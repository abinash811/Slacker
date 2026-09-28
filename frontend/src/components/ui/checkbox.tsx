import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Checkbox with its label. The whole row is clickable. */
export function Checkbox({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-2.5 text-sm', disabled && 'cursor-not-allowed opacity-60', className)}>
      <CheckboxPrimitive.Root
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v)}
        disabled={disabled}
        className={cn(
          'focus-ring mt-px flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-background',
          'transition-colors duration-150 ease-standard',
          'data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground',
        )}
      >
        <CheckboxPrimitive.Indicator className="flex data-unchecked:hidden">
          <Check className="size-3" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <span className="flex flex-col gap-0.5">
        <span className="leading-4 text-foreground">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </span>
    </label>
  )
}
