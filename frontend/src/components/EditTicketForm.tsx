import { FormProvider } from 'react-hook-form'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DialogClose, DialogFooter } from '@/components/ui/dialog'
import { LoadingButton } from '@/components/patterns/buttons'
import { FormSection } from '@/components/patterns/form-field'
import {
  TicketBasicsSection,
  TicketCategoryField,
  TicketContactSection,
  TicketCustomFields,
} from '@/components/TicketFormSections'
import { useCategories, useCustomFields, useUpdateTicket } from '@/hooks/useApi'
import { describeError } from '@/lib/api'
import { useZodForm } from '@/lib/form'
import { ticketDetailsSchema } from '@/lib/schemas'
import type { Ticket } from '@/types/api'

/**
 * The edit-ticket form (dialog body), loaded on demand by EditTicketDialog.
 * Owner, team, status, priority and tags are changed from the Actions card,
 * where each change is tracked on its own.
 */
export function EditTicketForm({ ticket, onSaved }: { ticket: Ticket; onSaved: () => void }) {
  const { data: categories } = useCategories()
  const { data: customFields } = useCustomFields(false)
  const updateTicket = useUpdateTicket(ticket.id)

  const form = useZodForm(ticketDetailsSchema, {
    title: ticket.title,
    description: ticket.description,
    customer: ticket.customer,
    business_id: ticket.business_id ?? '',
    mobile_number: ticket.mobile_number ?? '',
    doctor_name: ticket.doctor_name ?? '',
    category_id: String(ticket.category.id),
    custom_values: Object.fromEntries(ticket.custom_field_values.map((v) => [v.field_definition_id, v.value])),
  })
  const { isSubmitting, isDirty } = form.formState

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await updateTicket.mutateAsync({
        title: v.title,
        description: v.description,
        customer: v.customer,
        // Empty optional fields come back undefined; null clears them.
        business_id: v.business_id ?? null,
        mobile_number: v.mobile_number ?? null,
        doctor_name: v.doctor_name ?? null,
        category_id: Number(v.category_id),
        // Every active field is sent, so an emptied one is cleared.
        custom_field_values: (customFields ?? []).map((cf) => ({
          field_definition_id: cf.id,
          value: v.custom_values[cf.id] ?? '',
        })),
      })
      onSaved()
    } catch {
      // Shown inline via updateTicket.error below.
    }
  })

  return (
    <FormProvider {...form}>
      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <TicketBasicsSection />
        <TicketContactSection />
        <FormSection title="Classification">
          <TicketCategoryField categories={categories} />
          <TicketCustomFields fields={customFields ?? []} />
        </FormSection>

        {updateTicket.isError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Couldn't save changes</AlertTitle>
            <AlertDescription>{describeError(updateTicket.error)}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
          <LoadingButton type="submit" loading={isSubmitting} disabled={!isDirty}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </LoadingButton>
        </DialogFooter>
      </form>
    </FormProvider>
  )
}
