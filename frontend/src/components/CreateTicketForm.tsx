import { Controller, FormProvider } from 'react-hook-form'
import type { z } from 'zod'
import { DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/patterns/buttons'
import { FormField, FormSection } from '@/components/patterns/form-field'
import { OptionSelect } from '@/components/patterns/option-select'
import { TagPicker } from '@/components/TagPicker'
import {
  TicketBasicsSection,
  TicketCategoryField,
  TicketContactSection,
  TicketCustomFields,
} from '@/components/TicketFormSections'
import { useCategories, useCreateTicket, useCustomFields, useTags, useTeams, useUsers } from '@/hooks/useApi'
import { describeError } from '@/lib/api'
import { useZodForm } from '@/lib/form'
import { ticketSchema } from '@/lib/schemas'
import { PRIORITY_OPTIONS, toOptions } from '@/lib/tickets'
import type { Ticket, TicketPriority } from '@/types/api'

type TicketForm = z.input<typeof ticketSchema>

const EMPTY_FORM: TicketForm = {
  title: '',
  description: '',
  customer: '',
  business_id: '',
  mobile_number: '',
  doctor_name: '',
  category_id: '',
  team_id: '',
  priority: 'medium',
  owner_id: null,
  custom_values: {},
  tag_ids: [],
}

/**
 * The create-ticket form (dialog body). Loaded on demand by CreateTicketDialog,
 * so its form libraries aren't downloaded until someone opens the dialog.
 * Mounts fresh on every open, so it starts empty with the default team chosen.
 */
export function CreateTicketForm({ parent, onCreated }: { parent?: Ticket; onCreated: () => void }) {
  const { data: teams } = useTeams()
  const { data: categories } = useCategories()
  const { data: users } = useUsers()
  const { data: customFields } = useCustomFields(false)
  const { data: tags } = useTags(false)
  const createTicket = useCreateTicket()

  const defaultTeamId = parent?.team.id ?? (teams ?? []).find((t) => t.is_default)?.id
  const form = useZodForm(ticketSchema, {
    ...EMPTY_FORM,
    team_id: defaultTeamId !== undefined ? String(defaultTeamId) : '',
    // A sub-issue is about the same business: start from the main ticket's details.
    ...(parent && {
      customer: parent.customer,
      business_id: parent.business_id ?? '',
      mobile_number: parent.mobile_number ?? '',
      doctor_name: parent.doctor_name ?? '',
      category_id: String(parent.category.id),
      priority: parent.priority,
    }),
  })
  const { errors, isSubmitting } = form.formState
  const { control } = form

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await createTicket.mutateAsync({
        title: v.title,
        description: v.description,
        customer: v.customer,
        business_id: v.business_id,
        mobile_number: v.mobile_number,
        doctor_name: v.doctor_name,
        category_id: Number(v.category_id),
        team_id: Number(v.team_id),
        priority: v.priority,
        owner_id: v.owner_id ? Number(v.owner_id) : null,
        push_to_slack: true,
        custom_field_values: Object.entries(v.custom_values)
          .filter(([, value]) => value)
          .map(([field_definition_id, value]) => ({ field_definition_id: Number(field_definition_id), value })),
        tag_ids: v.tag_ids,
        parent_id: parent?.id ?? null,
      })
      onCreated()
    } catch {
      // Shown inline via createTicket.error below.
    }
  })

  return (
    <FormProvider {...form}>
      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <TicketBasicsSection />
        <TicketContactSection />

        <FormSection title="Routing">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TicketCategoryField categories={categories} />
            <FormField label="Team" htmlFor="ticket-team" error={errors.team_id?.message}>
              <Controller
                control={control}
                name="team_id"
                render={({ field }) => (
                  <OptionSelect
                    id="ticket-team"
                    invalid={!!errors.team_id}
                    value={field.value || null}
                    onValueChange={(v) => field.onChange(v ?? '')}
                    options={toOptions(teams)}
                  />
                )}
              />
            </FormField>
            <FormField label="Priority" htmlFor="ticket-priority">
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <OptionSelect
                    id="ticket-priority"
                    value={field.value}
                    onValueChange={(v) => v && field.onChange(v as TicketPriority)}
                    options={PRIORITY_OPTIONS}
                  />
                )}
              />
            </FormField>
          </div>
          <FormField label="Owner" htmlFor="ticket-owner" required={false}>
            <Controller
              control={control}
              name="owner_id"
              render={({ field }) => (
                <OptionSelect
                  id="ticket-owner"
                  value={field.value ?? null}
                  onValueChange={field.onChange}
                  emptyLabel="Unassigned"
                  placeholder="Unassigned"
                  options={toOptions(users)}
                />
              )}
            />
          </FormField>
        </FormSection>

        {((customFields ?? []).length > 0 || (tags ?? []).length > 0) && (
          <FormSection title="Additional details">
            <TicketCustomFields fields={customFields ?? []} />
            <FormField label="Tags" required={false}>
              <Controller
                control={control}
                name="tag_ids"
                render={({ field }) => <TagPicker tags={tags ?? []} selectedIds={field.value} onChange={field.onChange} />}
              />
            </FormField>
          </FormSection>
        )}

        {createTicket.isError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Couldn't create ticket</AlertTitle>
            <AlertDescription>{describeError(createTicket.error)}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
          <LoadingButton type="submit" loading={isSubmitting}>
            {isSubmitting ? 'Creating…' : parent ? 'Create sub-issue' : 'Create & post to Slack'}
          </LoadingButton>
        </DialogFooter>
      </form>
    </FormProvider>
  )
}
