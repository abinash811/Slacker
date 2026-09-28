import { Bookmark, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/patterns/confirm-dialog'
import { FormField } from '@/components/patterns/form-field'
import { CreateItemDialog } from '@/components/CreateItemDialog'
import { useCreateSavedView, useDeleteSavedView, useMe, useSavedViews } from '@/hooks/useApi'
import { useZodForm } from '@/lib/form'
import { nameSchema } from '@/lib/schemas'
import { EMPTY_FILTERS } from '@/lib/tickets'
import { activeFilters, sameFilters, toFilterState } from '@/lib/views'
import type { TicketFiltersState } from '@/types/api'

interface View {
  key: string
  name: string
  filters: Partial<TicketFiltersState>
}

/**
 * One-click ticket views: built-in ones ("Pending on me"…) plus the user's own
 * saved filter sets. Picking a view replaces all filters; the view matching the
 * current filters is highlighted. "Save view" appears when the current filters
 * aren't already a view.
 */
export function ViewsBar({
  filters,
  onChange,
}: {
  filters: TicketFiltersState
  onChange: (next: Partial<TicketFiltersState>) => void
}) {
  const { data: me } = useMe()
  const { data: saved } = useSavedViews()
  const createView = useCreateSavedView()
  const deleteView = useDeleteSavedView()
  const form = useZodForm(nameSchema, { name: '' })

  const myId = me?.user.id
  const presets: View[] = [
    { key: 'all', name: 'All tickets', filters: {} },
    ...(myId !== undefined
      ? [
          { key: 'mine', name: 'Pending on me', filters: { owner_id: myId } },
          { key: 'support', name: 'My support tickets', filters: { support_assignee_id: myId } },
        ]
      : []),
    { key: 'breached', name: 'SLA breached', filters: { sla_status: 'breached' as const } },
  ]
  const views: (View & { id?: number })[] = [
    ...presets,
    ...(saved ?? []).map((v) => ({ key: `saved-${v.id}`, id: v.id, name: v.name, filters: toFilterState(v.filters) })),
  ]
  const isCurrent = (v: View) => sameFilters(v.filters, filters)
  const canSave = Object.keys(activeFilters(filters)).length > 0 && !views.some(isCurrent)

  return (
    <div role="toolbar" aria-label="Ticket views" className="flex flex-wrap items-center gap-1.5">
      {views.map((view) => (
        <div key={view.key} className="flex items-center">
          <Button
            size="sm"
            variant={isCurrent(view) ? 'secondary' : 'ghost'}
            aria-pressed={isCurrent(view)}
            onClick={() => onChange({ ...EMPTY_FILTERS, ...view.filters })}
          >
            {view.name}
          </Button>
          {view.id !== undefined && (
            <Tooltip>
              <TooltipTrigger render={<span />}>
                <ConfirmDialog
                  trigger={<Button variant="ghost" size="icon-xs" aria-label={`Delete view ${view.name}`} />}
                  triggerLabel={<X />}
                  title={`Delete "${view.name}"?`}
                  description="Only the saved view is removed; no tickets change. You can save it again anytime."
                  confirmLabel="Delete view"
                  onConfirm={() => deleteView.mutateAsync(view.id!)}
                />
              </TooltipTrigger>
              <TooltipContent>Delete view</TooltipContent>
            </Tooltip>
          )}
        </div>
      ))}
      {canSave && (
        <CreateItemDialog
          noun="view"
          settingsItem={false}
          triggerLabel="Save view"
          triggerVariant="outline"
          triggerIcon={Bookmark}
          submitLabel="Save view"
          description="Saves the current filters so you can reopen them in one click. Only you see your views."
          form={form}
          onSubmit={(v) => createView.mutateAsync({ name: v.name, filters: activeFilters(filters) })}
        >
          <FormField label="Name" htmlFor="view-name" error={form.formState.errors.name?.message}>
            <Input
              id="view-name"
              autoFocus
              aria-invalid={!!form.formState.errors.name}
              placeholder="e.g. Urgent billing"
              {...form.register('name')}
            />
          </FormField>
        </CreateItemDialog>
      )}
    </div>
  )
}
