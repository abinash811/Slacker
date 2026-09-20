import { useState } from 'react'
import { SlidersHorizontal, Tags, Timer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  useCategoriesAdmin,
  useCreateCategory,
  useCreateCustomField,
  useCreateSlaPolicy,
  useCustomFields,
  useSlaPoliciesAdmin,
  useUpdateCategory,
  useUpdateCustomField,
  useUpdateSlaPolicy,
} from '@/hooks/useApi'
import type { CustomFieldType } from '@/types/api'

export function FormFields() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Form Fields &amp; Dropdowns</h1>
        <p className="text-sm text-muted-foreground">
          Manage the values people pick from when creating a ticket, and define custom fields.
        </p>
      </div>

      <CategoriesSection />
      <SlaPoliciesSection />
      <CustomFieldsSection />
    </div>
  )
}

function CategoriesSection() {
  const { data: categories } = useCategoriesAdmin()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const [name, setName] = useState('')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Tags className="h-4 w-4 text-muted-foreground" /> Categories
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ArchivableList
          items={(categories ?? []).map((c) => ({ id: c.id, label: c.name, is_archived: c.is_archived }))}
          onArchiveToggle={(id, is_archived) => updateCategory.mutate({ id, is_archived })}
        />
        <div className="flex gap-2 border-t border-border pt-3">
          <Input placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button
            disabled={!name}
            onClick={() => {
              createCategory.mutate(name)
              setName('')
            }}
          >
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SlaPoliciesSection() {
  const { data: policies } = useSlaPoliciesAdmin()
  const createPolicy = useCreateSlaPolicy()
  const updatePolicy = useUpdateSlaPolicy()
  const [name, setName] = useState('')
  const [hours, setHours] = useState('')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Timer className="h-4 w-4 text-muted-foreground" /> SLA Policies
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ArchivableList
          items={(policies ?? []).map((p) => ({
            id: p.id,
            label: `${p.name} (${p.duration_hours}h)${p.is_default ? ' — default' : ''}`,
            is_archived: p.is_archived,
          }))}
          onArchiveToggle={(id, is_archived) => updatePolicy.mutate({ id, is_archived })}
        />
        <div className="flex gap-2 border-t border-border pt-3">
          <Input placeholder="Name (e.g. 12 hours)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder="Duration (hours)"
            type="number"
            className="w-40"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <Button
            disabled={!name || !hours}
            onClick={() => {
              createPolicy.mutate({ name, duration_hours: Number(hours), is_default: false })
              setName('')
              setHours('')
            }}
          >
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CustomFieldsSection() {
  const { data: fields } = useCustomFields()
  const createField = useCreateCustomField()
  const updateField = useUpdateCustomField()
  const [label, setLabel] = useState('')
  const [type, setType] = useState<CustomFieldType>('text')
  const [optionsText, setOptionsText] = useState('')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" /> Custom Fields
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Extra fields shown on the ticket creation form — e.g. Business ID, Doctor ID, Mobile Number.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ArchivableList
          items={(fields ?? []).map((f) => ({
            id: f.id,
            label: `${f.label} — ${f.field_type}${f.options ? ` (${f.options.join(', ')})` : ''}`,
            is_archived: f.is_archived,
          }))}
          onArchiveToggle={(id, is_archived) => updateField.mutate({ id, is_archived })}
        />
        <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
          <Input placeholder="Field label (e.g. Business ID)" value={label} onChange={(e) => setLabel(e.target.value)} className="flex-1" />
          <Select value={type} onValueChange={(v) => setType(v as CustomFieldType)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="dropdown">Dropdown</SelectItem>
            </SelectContent>
          </Select>
          {type === 'dropdown' && (
            <Input
              placeholder="Options, comma-separated"
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              className="flex-1"
            />
          )}
          <Button
            disabled={!label || (type === 'dropdown' && !optionsText)}
            onClick={() => {
              const options = type === 'dropdown' ? optionsText.split(',').map((o) => o.trim()).filter(Boolean) : null
              createField.mutate({ label, field_type: type, options })
              setLabel('')
              setOptionsText('')
            }}
          >
            Add field
          </Button>
        </div>
      </CardContent>
    </Card>
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
    return <p className="rounded-md bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">None yet — add one below.</p>
  }
  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted',
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
