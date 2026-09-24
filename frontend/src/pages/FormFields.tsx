import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SettingsPageHeader as PageHeader } from '@/components/SettingsPageHeader'
import { EmptyState } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import {
  useCategoriesAdmin,
  useCreateCategory,
  useCreateCustomField,
  useCreateTag,
  useCustomFields,
  useSlaSettings,
  useTags,
  useUpdateCategory,
  useUpdateCustomField,
  useUpdateSlaSettings,
  useUpdateTag,
} from '@/hooks/useApi'
import type { CustomFieldType } from '@/types/api'

function AddDialog({
  trigger,
  title,
  disabled,
  onSubmit,
  children,
}: {
  trigger: React.ReactNode
  title: string
  disabled: boolean
  onSubmit: () => void
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {children}
          <Button
            disabled={disabled}
            onClick={() => {
              onSubmit()
              setOpen(false)
            }}
          >
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function NewButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button size="sm" {...props}>
      <Plus className="h-4 w-4" /> New
    </Button>
  )
}

export function TagsSection() {
  const { data: tags } = useTags()
  const createTag = useCreateTag()
  const updateTag = useUpdateTag()
  const [name, setName] = useState('')

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <PageHeader
          title="Tags"
          description="Multi-select labels for a ticket — e.g. Appointment, Prescription — so one ticket can carry several at once."
        />
        <AddDialog trigger={<NewButton />} title="New tag" disabled={!name} onSubmit={() => { createTag.mutate(name); setName('') }}>
          <Field label="Name" htmlFor="new-tag-name">
            <Input id="new-tag-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Appointment" />
          </Field>
        </AddDialog>
      </div>
      <ArchivableList
        items={(tags ?? []).map((t) => ({ id: t.id, label: t.name, is_archived: t.is_archived }))}
        onArchiveToggle={(id, is_archived) => updateTag.mutate({ id, is_archived })}
      />
    </div>
  )
}

export function CategoriesSection() {
  const { data: categories } = useCategoriesAdmin()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const [name, setName] = useState('')

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <PageHeader title="Categories" description="The category dropdown shown on every ticket creation form." />
        <AddDialog trigger={<NewButton />} title="New category" disabled={!name} onSubmit={() => { createCategory.mutate(name); setName('') }}>
          <Field label="Name" htmlFor="new-category-name">
            <Input id="new-category-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Billing" />
          </Field>
        </AddDialog>
      </div>
      <ArchivableList
        items={(categories ?? []).map((c) => ({ id: c.id, label: c.name, is_archived: c.is_archived }))}
        onArchiveToggle={(id, is_archived) => updateCategory.mutate({ id, is_archived })}
      />
    </div>
  )
}

export function SlaSection() {
  const { data: settings } = useSlaSettings()
  const updateSettings = useUpdateSlaSettings()
  const [hours, setHours] = useState('')

  useEffect(() => {
    if (settings) setHours(String(settings.default_hours))
  }, [settings])

  const dirty = settings != null && hours !== '' && Number(hours) !== settings.default_hours

  return (
    <div>
      <PageHeader
        title="SLA"
        description="The resolution-time target applied to every new ticket. Changing it never affects tickets already created."
      />
      <div className="flex items-end gap-3 rounded-lg border border-border p-4">
        <Field label="Default SLA (hours)" htmlFor="sla-default-hours">
          <Input
            id="sla-default-hours"
            type="number"
            min={1}
            className="w-40"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </Field>
        <Button
          disabled={!dirty || updateSettings.isPending}
          onClick={() => updateSettings.mutate(Number(hours))}
        >
          {updateSettings.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

export function CustomFieldsSection() {
  const { data: fields } = useCustomFields()
  const createField = useCreateCustomField()
  const updateField = useUpdateCustomField()
  const [label, setLabel] = useState('')
  const [type, setType] = useState<CustomFieldType>('text')
  const [optionsText, setOptionsText] = useState('')

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <PageHeader title="Custom Fields" description="Extra fields shown on the ticket creation form — e.g. Business ID, Doctor ID." />
        <AddDialog
          trigger={<NewButton />}
          title="New custom field"
          disabled={!label || (type === 'dropdown' && !optionsText)}
          onSubmit={() => {
            const options = type === 'dropdown' ? optionsText.split(',').map((o) => o.trim()).filter(Boolean) : null
            createField.mutate({ label, field_type: type, options })
            setLabel('')
            setOptionsText('')
          }}
        >
          <Field label="Field label" htmlFor="new-field-label">
            <Input id="new-field-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Business ID" />
          </Field>
          <Field label="Type">
            <Select value={type} onValueChange={(v) => setType(v as CustomFieldType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="dropdown">Dropdown</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {type === 'dropdown' && (
            <Field label="Options (comma-separated)" htmlFor="new-field-options">
              <Input id="new-field-options" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="North, South, East, West" />
            </Field>
          )}
        </AddDialog>
      </div>
      <ArchivableList
        items={(fields ?? []).map((f) => ({
          id: f.id,
          label: `${f.label} — ${f.field_type}${f.options ? ` (${f.options.join(', ')})` : ''}`,
          is_archived: f.is_archived,
        }))}
        onArchiveToggle={(id, is_archived) => updateField.mutate({ id, is_archived })}
      />
    </div>
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

function ArchivableList({
  items,
  onArchiveToggle,
}: {
  items: { id: number; label: string; is_archived: boolean }[]
  onArchiveToggle: (id: number, is_archived: boolean) => void
}) {
  if (items.length === 0) {
    return <EmptyState variant="bordered">None yet.</EmptyState>
  }
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border p-1">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted',
            item.is_archived && 'bg-muted/30',
          )}
        >
          <span className={item.is_archived ? 'text-muted-foreground line-through' : 'text-foreground'}>{item.label}</span>
          <div className="flex items-center gap-2">
            {item.is_archived ? <Badge variant="neutral">Archived</Badge> : <Badge variant="success">Active</Badge>}
            <Button variant="ghost" size="sm" onClick={() => onArchiveToggle(item.id, !item.is_archived)}>
              {item.is_archived ? 'Unarchive' : 'Archive'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
