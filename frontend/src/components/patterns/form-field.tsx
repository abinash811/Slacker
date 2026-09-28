import * as React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'

/**
 * Label + control + hint or error, on shadcn Field. Every form control goes
 * in one. Pass the control's `id` as `htmlFor`; set `aria-invalid` on the
 * control when `error` is set. `required={false}` appends "(optional)".
 */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: React.ReactNode
  error?: string | null
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <Field data-invalid={!!error || undefined} className={className}>
      <FieldLabel htmlFor={htmlFor}>
        {label}
        {required === false && <span className="font-normal text-muted-foreground">(optional)</span>}
      </FieldLabel>
      {children}
      {error ? <FieldError>{error}</FieldError> : hint ? <FieldDescription>{hint}</FieldDescription> : null}
    </Field>
  )
}

/** A titled group of fields in a long form (shadcn FieldSet + FieldLegend). */
export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <FieldSet className="border-t pt-4 first:border-0 first:pt-0">
      <FieldLegend variant="label" className="text-xs tracking-wide text-muted-foreground uppercase">
        {title}
      </FieldLegend>
      {children}
    </FieldSet>
  )
}

/** Checkbox with its label and optional description (shadcn's horizontal Field pattern). */
export function CheckboxField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <Field orientation="horizontal" data-disabled={disabled || undefined}>
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onCheckedChange(v)} disabled={disabled} />
      <FieldContent>
        <FieldLabel htmlFor={id} className="font-normal">
          {label}
        </FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
      </FieldContent>
    </Field>
  )
}
