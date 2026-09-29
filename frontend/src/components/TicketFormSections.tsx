import { Controller, useFormContext } from 'react-hook-form'
import { FormField, FormSection } from '@/components/patterns/form-field'
import { OptionSelect } from '@/components/patterns/option-select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { TicketDetailsInput } from '@/lib/schemas'
import { toOptions } from '@/lib/tickets'
import type { Category, CustomFieldDefinition } from '@/types/api'

/**
 * Form sections for a ticket's details, shared by the create and edit forms.
 * Render inside a react-hook-form `FormProvider` whose values include
 * `ticketDetailsSchema`'s fields.
 */

type TextField = 'title' | 'customer' | 'business_id' | 'mobile_number' | 'doctor_name'

function useTextField() {
  const { register, formState } = useFormContext<TicketDetailsInput>()
  return (name: TextField) => ({
    id: `ticket-${name.replace('_', '-')}`,
    'aria-invalid': !!formState.errors[name],
    ...register(name),
  })
}

export function TicketBasicsSection() {
  const { register, formState } = useFormContext<TicketDetailsInput>()
  const { errors } = formState
  const text = useTextField()
  return (
    <FormSection title="Basics">
      <FormField label="Title" htmlFor="ticket-title" error={errors.title?.message}>
        <Input {...text('title')} placeholder="e.g. Prescriptions not syncing" />
      </FormField>
      <FormField label="Description" htmlFor="ticket-description" error={errors.description?.message}>
        <Textarea id="ticket-description" aria-invalid={!!errors.description} {...register('description')} />
      </FormField>
    </FormSection>
  )
}

export function TicketContactSection() {
  const { errors } = useFormContext<TicketDetailsInput>().formState
  const text = useTextField()
  return (
    <FormSection title="Contact">
      <FormField label="Business name" htmlFor="ticket-customer" error={errors.customer?.message}>
        <Input {...text('customer')} />
      </FormField>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormField label="Business ID" htmlFor="ticket-business-id" required={false} error={errors.business_id?.message}>
          <Input {...text('business_id')} />
        </FormField>
        <FormField label="Mobile number" htmlFor="ticket-mobile-number" required={false} error={errors.mobile_number?.message}>
          <Input type="tel" {...text('mobile_number')} />
        </FormField>
        <FormField label="Doctor name" htmlFor="ticket-doctor-name" required={false} error={errors.doctor_name?.message}>
          <Input {...text('doctor_name')} />
        </FormField>
      </div>
    </FormSection>
  )
}

export function TicketCategoryField({ categories }: { categories: Category[] | undefined }) {
  const { control, formState } = useFormContext<TicketDetailsInput>()
  const error = formState.errors.category_id
  return (
    <FormField label="Category" htmlFor="ticket-category" error={error?.message}>
      <Controller
        control={control}
        name="category_id"
        render={({ field }) => (
          <OptionSelect
            id="ticket-category"
            invalid={!!error}
            value={field.value || null}
            onValueChange={(v) => field.onChange(v ?? '')}
            options={toOptions(categories)}
          />
        )}
      />
    </FormField>
  )
}

export function TicketCustomFields({ fields }: { fields: CustomFieldDefinition[] }) {
  const { control, register } = useFormContext<TicketDetailsInput>()
  return fields.map((cf) => (
    <FormField key={cf.id} label={cf.label} htmlFor={`ticket-cf-${cf.id}`} required={false}>
      {cf.field_type === 'dropdown' ? (
        <Controller
          control={control}
          name={`custom_values.${cf.id}`}
          render={({ field }) => (
            <OptionSelect
              id={`ticket-cf-${cf.id}`}
              value={field.value || null}
              onValueChange={(v) => field.onChange(v ?? '')}
              emptyLabel="None"
              options={(cf.options ?? []).map((o) => ({ value: o, label: o }))}
            />
          )}
        />
      ) : (
        <Input id={`ticket-cf-${cf.id}`} {...register(`custom_values.${cf.id}`)} />
      )}
    </FormField>
  ))
}
