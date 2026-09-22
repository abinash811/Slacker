import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagPicker } from '@/components/TagPicker'
import { useCategories, useCreateTicket, useCustomFields, useSlaPolicies, useTags, useTeams, useUsers } from '@/hooks/useApi'
import type { TicketPriority } from '@/types/api'

const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent']

export function CreateTicketDialog() {
  const [open, setOpen] = useState(false)
  const { data: teams } = useTeams()
  const { data: categories } = useCategories()
  const { data: slaPolicies } = useSlaPolicies()
  const { data: users } = useUsers()
  const { data: customFields } = useCustomFields(false)
  const { data: tags } = useTags(false)
  const createTicket = useCreateTicket()

  const [form, setForm] = useState({
    title: '',
    description: '',
    customer: '',
    business_id: '',
    mobile_number: '',
    doctor_name: '',
    category_id: '',
    team_id: '',
    priority: 'medium' as TicketPriority,
    sla_policy_id: '',
    owner_id: '',
  })
  const [customValues, setCustomValues] = useState<Record<number, string>>({})
  const [tagIds, setTagIds] = useState<number[]>([])

  useEffect(() => {
    if (form.team_id) return
    const defaultTeam = (teams ?? []).find((t) => t.is_default)
    if (defaultTeam) setForm((f) => ({ ...f, team_id: String(defaultTeam.id) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams])

  const canSubmit = form.title && form.description && form.customer && form.category_id && form.team_id && form.sla_policy_id

  function reset() {
    const defaultTeam = (teams ?? []).find((t) => t.is_default)
    setForm({
      title: '',
      description: '',
      customer: '',
      business_id: '',
      mobile_number: '',
      doctor_name: '',
      category_id: '',
      team_id: defaultTeam ? String(defaultTeam.id) : '',
      priority: 'medium',
      sla_policy_id: '',
      owner_id: '',
    })
    setCustomValues({})
    setTagIds([])
  }

  async function handleSubmit() {
    if (!canSubmit) return
    await createTicket.mutateAsync({
      title: form.title,
      description: form.description,
      customer: form.customer,
      business_id: form.business_id || undefined,
      mobile_number: form.mobile_number || undefined,
      doctor_name: form.doctor_name || undefined,
      category_id: Number(form.category_id),
      team_id: Number(form.team_id),
      priority: form.priority,
      sla_policy_id: Number(form.sla_policy_id),
      owner_id: form.owner_id ? Number(form.owner_id) : null,
      push_to_slack: true,
      custom_field_values: Object.entries(customValues)
        .filter(([, value]) => value)
        .map(([field_definition_id, value]) => ({ field_definition_id: Number(field_definition_id), value })),
      tag_ids: tagIds,
    })
    reset()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Ticket</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create ticket</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Field label="Title" htmlFor="ticket-title">
            <Input id="ticket-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Description" htmlFor="ticket-description">
            <Textarea
              id="ticket-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="Customer / Account" htmlFor="ticket-customer">
            <Input id="ticket-customer" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Business ID" htmlFor="ticket-business-id">
              <Input id="ticket-business-id" value={form.business_id} onChange={(e) => setForm({ ...form, business_id: e.target.value })} />
            </Field>
            <Field label="Mobile Number" htmlFor="ticket-mobile-number">
              <Input id="ticket-mobile-number" value={form.mobile_number} onChange={(e) => setForm({ ...form, mobile_number: e.target.value })} />
            </Field>
            <Field label="Doctor Name" htmlFor="ticket-doctor-name">
              <Input id="ticket-doctor-name" value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <SimpleSelect
                value={form.category_id}
                onChange={(v) => setForm({ ...form, category_id: v })}
                options={(categories ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
              />
            </Field>
            <Field label="Team">
              <SimpleSelect
                value={form.team_id}
                onChange={(v) => setForm({ ...form, team_id: v })}
                options={(teams ?? []).map((t) => ({ value: String(t.id), label: t.name }))}
              />
            </Field>
            <Field label="Priority">
              <SimpleSelect
                value={form.priority}
                onChange={(v) => setForm({ ...form, priority: v as TicketPriority })}
                options={PRIORITIES.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))}
              />
            </Field>
            <Field label="SLA">
              <SimpleSelect
                value={form.sla_policy_id}
                onChange={(v) => setForm({ ...form, sla_policy_id: v })}
                options={(slaPolicies ?? []).map((s) => ({ value: String(s.id), label: s.name }))}
              />
            </Field>
          </div>
          <Field label="Owner (optional)">
            <SimpleSelect
              value={form.owner_id}
              onChange={(v) => setForm({ ...form, owner_id: v })}
              options={(users ?? []).map((u) => ({ value: String(u.id), label: u.name }))}
              allowEmpty
            />
          </Field>
          {(customFields ?? []).map((field) => (
            <Field key={field.id} label={field.label}>
              {field.field_type === 'dropdown' ? (
                <SimpleSelect
                  value={customValues[field.id] ?? ''}
                  onChange={(v) => setCustomValues({ ...customValues, [field.id]: v })}
                  options={(field.options ?? []).map((o) => ({ value: o, label: o }))}
                />
              ) : (
                <Input
                  value={customValues[field.id] ?? ''}
                  onChange={(e) => setCustomValues({ ...customValues, [field.id]: e.target.value })}
                />
              )}
            </Field>
          ))}
          <Field label="Tags (optional)">
            <TagPicker tags={tags ?? []} selectedIds={tagIds} onChange={setTagIds} />
          </Field>
          <Button className="mt-2" disabled={!canSubmit || createTicket.isPending} onClick={handleSubmit}>
            {createTicket.isPending ? 'Creating…' : 'Create & push to Slack'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function SimpleSelect({
  value,
  onChange,
  options,
  allowEmpty,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  allowEmpty?: boolean
}) {
  return (
    <Select value={value || undefined} onValueChange={(v) => onChange(v === '__none' ? '' : v)}>
      <SelectTrigger>
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value="__none">Unassigned</SelectItem>}
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
