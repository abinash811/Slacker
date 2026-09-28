import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type DefaultValues, type FieldValues, type Resolver, type UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'

/**
 * The one way to build a form: react-hook-form driven by a zod schema.
 * Validates on submit, then live as the user fixes each field — matching
 * the "validate on submit, then live" rule in docs/DESIGN_SYSTEM.md.
 * Pass errors to `Field error={form.formState.errors.x?.message}`.
 */
export function useZodForm<TSchema extends z.ZodType<FieldValues, FieldValues>>(
  schema: TSchema,
  defaultValues: DefaultValues<z.input<TSchema>>,
): UseFormReturn<z.input<TSchema>, unknown, z.output<TSchema>> {
  return useForm<z.input<TSchema>, unknown, z.output<TSchema>>({
    // zodResolver's generic signature can't follow a generic schema; the cast is sound (same schema).
    resolver: zodResolver(schema as never) as unknown as Resolver<z.input<TSchema>, unknown, z.output<TSchema>>,
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
}
