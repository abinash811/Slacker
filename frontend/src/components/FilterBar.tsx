import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { OptionSelect } from '@/components/patterns/option-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCategories, useTeams, useUsers } from '@/hooks/useApi'
import { EMPTY_FILTERS, PRIORITY_OPTIONS, STATUS_OPTIONS, toOptions } from '@/lib/tickets'
import type { TicketFiltersState } from '@/types/api'

interface Props {
  filters: TicketFiltersState
  onChange: (next: Partial<TicketFiltersState>) => void
}

const toId = (v: string | null) => (v ? Number(v) : undefined)

export function FilterBar({ filters, onChange }: Props) {
  const { data: teams } = useTeams()
  const { data: categories } = useCategories()
  const { data: users } = useUsers()

  const hasAny = Object.values(filters).some((v) => v !== undefined)

  return (
    <div className="flex flex-wrap items-center gap-2" role="search">
      <SearchInput value={filters.search} onChange={(v) => onChange({ search: v })} />
      <OptionSelect
        aria-label="Team"
        className="w-auto min-w-32"
        value={filters.team_id?.toString() ?? null}
        onValueChange={(v) => onChange({ team_id: toId(v) })}
        emptyLabel="All teams"
        options={toOptions(teams)}
      />
      <OptionSelect
        aria-label="Pending on"
        className="w-auto min-w-32"
        value={filters.owner_id?.toString() ?? null}
        onValueChange={(v) => onChange({ owner_id: toId(v) })}
        emptyLabel="Pending on: Anyone"
        options={toOptions(users)}
      />
      <OptionSelect
        aria-label="Support owner"
        className="w-auto min-w-32"
        value={filters.support_assignee_id?.toString() ?? null}
        onValueChange={(v) => onChange({ support_assignee_id: toId(v) })}
        emptyLabel="Support owner: Anyone"
        options={toOptions(users)}
      />
      <OptionSelect
        aria-label="Category"
        className="w-auto min-w-32"
        value={filters.category_id?.toString() ?? null}
        onValueChange={(v) => onChange({ category_id: toId(v) })}
        emptyLabel="All categories"
        options={toOptions(categories)}
      />
      <OptionSelect
        aria-label="Priority"
        className="w-auto min-w-32"
        value={filters.priority ?? null}
        onValueChange={(v) => onChange({ priority: (v ?? undefined) as TicketFiltersState['priority'] })}
        emptyLabel="All priorities"
        options={PRIORITY_OPTIONS}
      />
      <OptionSelect
        aria-label="Status"
        className="w-auto min-w-32"
        value={filters.status ?? null}
        onValueChange={(v) => onChange({ status: (v ?? undefined) as TicketFiltersState['status'] })}
        emptyLabel="All statuses"
        options={STATUS_OPTIONS}
      />
      <OptionSelect
        aria-label="SLA"
        className="w-auto min-w-32"
        value={filters.sla_status ?? null}
        onValueChange={(v) => onChange({ sla_status: (v ?? undefined) as TicketFiltersState['sla_status'] })}
        emptyLabel="All SLA states"
        options={[
          { value: 'breached', label: 'Breached' },
          { value: 'ok', label: 'On track' },
        ]}
      />
      {hasAny && (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
          Clear filters
        </Button>
      )}
    </div>
  )
}

function SearchInput({ value, onChange }: { value: string | undefined; onChange: (v: string | undefined) => void }) {
  const [draft, setDraft] = useState(value ?? '')
  const [lastValue, setLastValue] = useState(value)

  // Follow external resets (e.g. "Clear filters") without an effect.
  if (value !== lastValue) {
    setLastValue(value)
    setDraft(value ?? '')
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft !== (value ?? '')) onChange(draft || undefined)
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        aria-label="Search tickets"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search ID, mobile, doctor…"
        className="w-64 pl-8"
      />
    </div>
  )
}
