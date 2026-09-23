import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCategories, useTeams, useUsers } from '@/hooks/useApi'
import type { TicketFiltersState } from '@/types/api'

interface Props {
  filters: TicketFiltersState
  onChange: (next: Partial<TicketFiltersState>) => void
}

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
const STATUSES = ['open', 'in_progress', 'pending', 'resolved', 'closed'] as const

export function FilterBar({ filters, onChange }: Props) {
  const { data: teams } = useTeams()
  const { data: categories } = useCategories()
  const { data: users } = useUsers()

  const hasAny = Object.values(filters).some((v) => v !== undefined)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        value={filters.search}
        onChange={(v) => onChange({ search: v })}
      />
      <FilterSelect
        label="Team"
        value={filters.team_id?.toString()}
        onChange={(v) => onChange({ team_id: v ? Number(v) : undefined })}
        options={(teams ?? []).map((t) => ({ value: t.id.toString(), label: t.name }))}
      />
      <FilterSelect
        label="Pending on"
        allLabel="Pending on: Anyone"
        value={filters.owner_id?.toString()}
        onChange={(v) => onChange({ owner_id: v ? Number(v) : undefined })}
        options={(users ?? []).map((u) => ({ value: u.id.toString(), label: u.name }))}
      />
      <FilterSelect
        label="Support owner"
        allLabel="Support owner: Anyone"
        value={filters.support_assignee_id?.toString()}
        onChange={(v) => onChange({ support_assignee_id: v ? Number(v) : undefined })}
        options={(users ?? []).map((u) => ({ value: u.id.toString(), label: u.name }))}
      />
      <FilterSelect
        label="Category"
        allLabel="All categories"
        value={filters.category_id?.toString()}
        onChange={(v) => onChange({ category_id: v ? Number(v) : undefined })}
        options={(categories ?? []).map((c) => ({ value: c.id.toString(), label: c.name }))}
      />
      <FilterSelect
        label="Priority"
        allLabel="All priorities"
        value={filters.priority}
        onChange={(v) => onChange({ priority: v as TicketFiltersState['priority'] })}
        options={PRIORITIES.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))}
      />
      <FilterSelect
        label="Status"
        allLabel="All statuses"
        value={filters.status}
        onChange={(v) => onChange({ status: v as TicketFiltersState['status'] })}
        options={STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
      />
      <FilterSelect
        label="SLA"
        allLabel="All SLA states"
        value={filters.sla_status}
        onChange={(v) => onChange({ sla_status: v as TicketFiltersState['sla_status'] })}
        options={[
          { value: 'breached', label: 'Breached' },
          { value: 'ok', label: 'On track' },
        ]}
      />
      {hasAny && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({
              team_id: undefined,
              owner_id: undefined,
              support_assignee_id: undefined,
              category_id: undefined,
              priority: undefined,
              status: undefined,
              sla_status: undefined,
              search: undefined,
            })
          }
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}

function SearchInput({ value, onChange }: { value: string | undefined; onChange: (v: string | undefined) => void }) {
  const [draft, setDraft] = useState(value ?? '')

  useEffect(() => setDraft(value ?? ''), [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft !== (value ?? '')) onChange(draft || undefined)
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search Business ID, Mobile, Doctor…"
        className="w-64 pl-8"
      />
    </div>
  )
}

function FilterSelect({
  label,
  allLabel,
  value,
  onChange,
  options,
}: {
  label: string
  allLabel?: string
  value: string | undefined
  onChange: (value: string | undefined) => void
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value ?? '__all'} onValueChange={(v) => onChange(v === '__all' ? undefined : v)}>
      <SelectTrigger className="w-auto min-w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all">{allLabel ?? `All ${label.toLowerCase()}s`}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
