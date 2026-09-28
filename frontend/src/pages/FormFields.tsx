import { Controller } from 'react-hook-form'
import { Folder, SlidersHorizontal, Tags } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { SectionHeader } from '@/components/ui/typography'
import { CreateItemDialog } from '@/components/CreateItemDialog'
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
import { useZodForm } from '@/lib/form'
import { customFieldSchema, nameSchema, slaSchema } from '@/lib/schemas'

export function TagsSection() {
  const tags = useTags()
  const createTag = useCreateTag()
  const updateTag = useUpdateTag()
  const form = useZodForm(nameSchema, { name: '' })

  return (
    <div>
      <SectionHeader
        title="Tags"
        description="Multi-select labels for a ticket — e.g. Appointment, Prescription — so one ticket can carry several at once."
        actions={
          <CreateItemDialog
            noun="tag"
            description="Tags appear as chips on the ticket form."
            form={form}
            onSubmit={(v) => createTag.mutateAsync(v.name)}
          >
            <Field label="Name" htmlFor="new-tag-name" error={form.formState.errors.name?.message}>
              <Input
                id="new-tag-name"
                autoFocus
                aria-invalid={!!form.formState.errors.name}
                placeholder="e.g. Appointment"
                {...form.register('name')}
              />
            </Field>
          </CreateItemDialog>
        }
      />
      <ArchivableList
        query={tags}
        toItems={(data) => data.map((t) => ({ id: t.id, label: t.name, is_archived: t.is_archived }))}
        empty={{ icon: Tags, title: 'No tags yet', description: 'Create one so people can label tickets.' }}
        onArchiveToggle={(id, is_archived) => updateTag.mutate({ id, is_archived })}
      />
    </div>
  )
}

export function CategoriesSection() {
  const categories = useCategoriesAdmin()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const form = useZodForm(nameSchema, { name: '' })

  return (
    <div>
      <SectionHeader
        title="Categories"
        description="The category dropdown shown on every ticket creation form."
        actions={
          <CreateItemDialog
            noun="category"
            description="Every ticket must have one category."
            form={form}
            onSubmit={(v) => createCategory.mutateAsync(v.name)}
          >
            <Field label="Name" htmlFor="new-category-name" error={form.formState.errors.name?.message}>
              <Input
                id="new-category-name"
                autoFocus
                aria-invalid={!!form.formState.errors.name}
                placeholder="e.g. Billing"
                {...form.register('name')}
              />
            </Field>
          </CreateItemDialog>
        }
      />
      <ArchivableList
        query={categories}
        toItems={(data) => data.map((c) => ({ id: c.id, label: c.name, is_archived: c.is_archived }))}
        empty={{ icon: Folder, title: 'No categories yet', description: 'Tickets need at least one category before they can be created.' }}
        onArchiveToggle={(id, is_archived) => updateCategory.mutate({ id, is_archived })}
      />
    </div>
  )
}

export function SlaSection() {
  const settings = useSlaSettings()

  return (
    <div>
      <SectionHeader
        title="SLA"
        description="The resolution-time target applied to every new ticket. Changing it never affects tickets already created."
      />
      {settings.isError ? (
        <ErrorState variant="bordered" error={settings.error} onRetry={() => settings.refetch()} retrying={settings.isFetching} />
      ) : settings.isPending ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        // Keyed on the saved value so the form re-initialises after a save.
        <SlaForm key={settings.data.default_hours} savedHours={settings.data.default_hours} />
      )}
    </div>
  )
}

function SlaForm({ savedHours }: { savedHours: number }) {
  const updateSettings = useUpdateSlaSettings()
  const form = useZodForm(slaSchema, { default_hours: savedHours })
  const error = form.formState.errors.default_hours?.message

  return (
    <form
      noValidate
      className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-card"
      onSubmit={form.handleSubmit((v) => updateSettings.mutateAsync(v.default_hours).catch(() => {}))}
    >
      <Field label="Default SLA (hours)" htmlFor="sla-default-hours" hint="Whole hours, 1 or more." error={error}>
        <Input
          id="sla-default-hours"
          type="number"
          min={1}
          step={1}
          className="w-40"
          aria-invalid={!!error}
          {...form.register('default_hours')}
        />
      </Field>
      <Button type="submit" className="mt-5.5" disabled={!form.formState.isDirty} loading={form.formState.isSubmitting}>
        Save
      </Button>
    </form>
  )
}

export function CustomFieldsSection() {
  const fields = useCustomFields()
  const createField = useCreateCustomField()
  const updateField = useUpdateCustomField()
  const form = useZodForm(customFieldSchema, { label: '', field_type: 'text', options: '' })
  const { errors } = form.formState
  const type = form.watch('field_type')

  return (
    <div>
      <SectionHeader
        title="Custom fields"
        description="Extra fields shown on the ticket creation form — e.g. Business ID, Doctor ID."
        actions={
          <CreateItemDialog
            noun="custom field"
            description="It's added to the ticket creation form as an optional field."
            form={form}
            onSubmit={(v) => createField.mutateAsync(v)}
          >
            <Field label="Field label" htmlFor="new-field-label" error={errors.label?.message}>
              <Input id="new-field-label" autoFocus aria-invalid={!!errors.label} placeholder="e.g. Clinic ID" {...form.register('label')} />
            </Field>
            <Field label="Type" htmlFor="new-field-type">
              <Controller
                control={form.control}
                name="field_type"
                render={({ field }) => (
                  <Select
                    id="new-field-type"
                    value={field.value}
                    onValueChange={(v) => v && field.onChange(v)}
                    options={[
                      { value: 'text', label: 'Text' },
                      { value: 'dropdown', label: 'Dropdown' },
                    ]}
                  />
                )}
              />
            </Field>
            {type === 'dropdown' && (
              <Field label="Options" htmlFor="new-field-options" hint="Separate options with commas." error={errors.options?.message}>
                <Input
                  id="new-field-options"
                  aria-invalid={!!errors.options}
                  placeholder="North, South, East, West"
                  {...form.register('options')}
                />
              </Field>
            )}
          </CreateItemDialog>
        }
      />
      <ArchivableList
        query={fields}
        toItems={(data) =>
          data.map((f) => ({
            id: f.id,
            label: f.label,
            meta: f.field_type === 'dropdown' ? `Dropdown · ${f.options?.join(', ')}` : 'Text',
            is_archived: f.is_archived,
          }))
        }
        empty={{ icon: SlidersHorizontal, title: 'No custom fields yet', description: 'Add one to capture extra details on every ticket.' }}
        onArchiveToggle={(id, is_archived) => updateField.mutate({ id, is_archived })}
      />
    </div>
  )
}

interface ArchivableItem {
  id: number
  label: string
  meta?: string
  is_archived: boolean
}

function ArchivableList<T>({
  query,
  toItems,
  empty,
  onArchiveToggle,
}: {
  query: { data?: T; isPending: boolean; isError: boolean; error: unknown; isFetching: boolean; refetch: () => unknown }
  toItems: (data: T) => ArchivableItem[]
  empty: { icon: LucideIcon; title: string; description: string }
  onArchiveToggle: (id: number, is_archived: boolean) => void
}) {
  if (query.isPending) {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-border p-1">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="m-2 h-5" />
        ))}
      </div>
    )
  }
  if (query.isError) {
    return <ErrorState variant="bordered" error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} />
  }
  const items = toItems(query.data as T)
  if (items.length === 0) {
    return <EmptyState variant="bordered" {...empty} />
  }
  return (
    <ul className="flex flex-col gap-1 rounded-lg border border-border bg-card p-1 shadow-card">
      {items.map((item) => (
        <li
          key={item.id}
          className={cn(
            'flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150 ease-standard hover:bg-muted/50',
            item.is_archived && 'bg-muted/30',
          )}
        >
          <span className="flex min-w-0 flex-col">
            <span className={item.is_archived ? 'text-muted-foreground line-through' : 'text-foreground'}>{item.label}</span>
            {item.meta && <span className="truncate text-xs text-muted-foreground">{item.meta}</span>}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            {item.is_archived ? <Badge variant="neutral">Archived</Badge> : <Badge variant="success">Active</Badge>}
            <Button variant="ghost" size="sm" onClick={() => onArchiveToggle(item.id, !item.is_archived)}>
              {item.is_archived ? 'Restore' : 'Archive'}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
