import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldSection } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TagPicker } from '@/components/TagPicker'
import { useCategories, useCreateTicket, useCustomFields, useTags, useTeams, useUsers } from '@/hooks/useApi'
import { describeError } from '@/lib/api'
import { PRIORITY_OPTIONS, toOptions } from '@/lib/tickets'
import type { TicketPriority } from '@/types/api'

const EMPTY_FORM = {
  title: '',
  description: '',
  customer: '',
  business_id: '',
  mobile_number: '',
  doctor_name: '',
  category_id: null as string | null,
  team_id: null as string | null,
  priority: 'medium' as TicketPriority,
  owner_id: null as string | null,
}

const REQUIRED = ['title', 'description', 'customer', 'category_id', 'team_id'] as const
const REQUIRED_MESSAGE: Record<(typeof REQUIRED)[number], string> = {
  title: 'Add a short title.',
  description: 'Describe the issue.',
  customer: 'Enter the customer or account.',
  category_id: 'Choose a category.',
  team_id: 'Choose a team.',
}

export function CreateTicketDialog() {
  const [open, setOpen] = useState(false)
  const { data: teams } = useTeams()
  const { data: categories } = useCategories()
  const { data: users } = useUsers()
  const { data: customFields } = useCustomFields(false)
  const { data: tags } = useTags(false)
  const createTicket = useCreateTicket()

  const [form, setForm] = useState(EMPTY_FORM)
  const [customValues, setCustomValues] = useState<Record<number, string>>({})
  const [tagIds, setTagIds] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)

  const defaultTeamId = (teams ?? []).find((t) => t.is_default)?.id
  const teamId = form.team_id ?? (defaultTeamId !== undefined ? String(defaultTeamId) : null)
  const values = { ...form, team_id: teamId }

  const errors = Object.fromEntries(
    REQUIRED.filter((key) => !values[key]).map((key) => [key, REQUIRED_MESSAGE[key]]),
  ) as Partial<Record<(typeof REQUIRED)[number], string>>
  const showError = (key: (typeof REQUIRED)[number]) => (submitted ? errors[key] : undefined)

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function reset() {
    setForm(EMPTY_FORM)
    setCustomValues({})
    setTagIds([])
    setSubmitted(false)
    createTicket.reset()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length > 0) return
    try {
      await createTicket.mutateAsync({
        title: values.title,
        description: values.description,
        customer: values.customer,
        business_id: values.business_id || undefined,
        mobile_number: values.mobile_number || undefined,
        doctor_name: values.doctor_name || undefined,
        category_id: Number(values.category_id),
        team_id: Number(values.team_id),
        priority: values.priority,
        owner_id: values.owner_id ? Number(values.owner_id) : null,
        push_to_slack: true,
        custom_field_values: Object.entries(customValues)
          .filter(([, value]) => value)
          .map(([field_definition_id, value]) => ({ field_definition_id: Number(field_definition_id), value })),
        tag_ids: tagIds,
      })
      setOpen(false)
      reset()
    } catch {
      // Shown inline via createTicket.error below.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus /> Create ticket
      </DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Create ticket</DialogTitle>
          <DialogDescription>It's posted to the team's Slack channel as soon as you create it.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <FieldSection title="Basics">
            <Field label="Title" htmlFor="ticket-title" error={showError('title')}>
              <Input
                id="ticket-title"
                aria-invalid={!!showError('title')}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Prescriptions not syncing"
              />
            </Field>
            <Field label="Description" htmlFor="ticket-description" error={showError('description')}>
              <Textarea
                id="ticket-description"
                aria-invalid={!!showError('description')}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </Field>
          </FieldSection>

          <FieldSection title="Contact">
            <Field label="Customer / account" htmlFor="ticket-customer" error={showError('customer')}>
              <Input
                id="ticket-customer"
                aria-invalid={!!showError('customer')}
                value={form.customer}
                onChange={(e) => set('customer', e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Business ID" htmlFor="ticket-business-id" required={false}>
                <Input id="ticket-business-id" value={form.business_id} onChange={(e) => set('business_id', e.target.value)} />
              </Field>
              <Field label="Mobile number" htmlFor="ticket-mobile-number" required={false}>
                <Input
                  id="ticket-mobile-number"
                  type="tel"
                  value={form.mobile_number}
                  onChange={(e) => set('mobile_number', e.target.value)}
                />
              </Field>
              <Field label="Doctor name" htmlFor="ticket-doctor-name" required={false}>
                <Input id="ticket-doctor-name" value={form.doctor_name} onChange={(e) => set('doctor_name', e.target.value)} />
              </Field>
            </div>
          </FieldSection>

          <FieldSection title="Routing">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Category" htmlFor="ticket-category" error={showError('category_id')}>
                <Select
                  id="ticket-category"
                  invalid={!!showError('category_id')}
                  value={form.category_id}
                  onValueChange={(v) => set('category_id', v)}
                  options={toOptions(categories)}
                />
              </Field>
              <Field label="Team" htmlFor="ticket-team" error={showError('team_id')}>
                <Select
                  id="ticket-team"
                  invalid={!!showError('team_id')}
                  value={teamId}
                  onValueChange={(v) => set('team_id', v)}
                  options={toOptions(teams)}
                />
              </Field>
              <Field label="Priority" htmlFor="ticket-priority">
                <Select
                  id="ticket-priority"
                  value={form.priority}
                  onValueChange={(v) => v && set('priority', v as TicketPriority)}
                  options={PRIORITY_OPTIONS}
                />
              </Field>
            </div>
            <Field label="Owner" htmlFor="ticket-owner" required={false}>
              <Select
                id="ticket-owner"
                value={form.owner_id}
                onValueChange={(v) => set('owner_id', v)}
                emptyLabel="Unassigned"
                placeholder="Unassigned"
                options={toOptions(users)}
              />
            </Field>
          </FieldSection>

          {((customFields ?? []).length > 0 || (tags ?? []).length > 0) && (
            <FieldSection title="Additional details">
              {(customFields ?? []).map((field) => (
                <Field key={field.id} label={field.label} htmlFor={`ticket-cf-${field.id}`} required={false}>
                  {field.field_type === 'dropdown' ? (
                    <Select
                      id={`ticket-cf-${field.id}`}
                      value={customValues[field.id] || null}
                      onValueChange={(v) => setCustomValues({ ...customValues, [field.id]: v ?? '' })}
                      emptyLabel="None"
                      options={(field.options ?? []).map((o) => ({ value: o, label: o }))}
                    />
                  ) : (
                    <Input
                      id={`ticket-cf-${field.id}`}
                      value={customValues[field.id] ?? ''}
                      onChange={(e) => setCustomValues({ ...customValues, [field.id]: e.target.value })}
                    />
                  )}
                </Field>
              ))}
              <Field label="Tags" required={false}>
                <TagPicker tags={tags ?? []} selectedIds={tagIds} onChange={setTagIds} />
              </Field>
            </FieldSection>
          )}

          {createTicket.isError && (
            <Alert tone="danger" title="Couldn't create ticket">
              {describeError(createTicket.error)}
            </Alert>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" loading={createTicket.isPending}>
              {createTicket.isPending ? 'Creating…' : 'Create & post to Slack'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
