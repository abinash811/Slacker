import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { OptionSelect } from '@/components/patterns/option-select'
import { DATE_PRESETS, matchPreset, presetRange, type DatePreset } from '@/lib/dates'

/**
 * "Created" date filter: quick ranges plus a custom from/to. Values are local
 * dates (YYYY-MM-DD), both ends inclusive.
 */
export function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from?: string
  to?: string
  onChange: (range: { date_from?: string; date_to?: string }) => void
}) {
  const matched = matchPreset(from, to)
  // Remember that the user picked "Custom" even before they fill in dates.
  const [customOpen, setCustomOpen] = useState(false)
  const preset: DatePreset = customOpen ? 'custom' : matched
  const labelFor = (p: DatePreset) =>
    p === 'any' ? 'Created: Any time' : `Created: ${DATE_PRESETS.find((o) => o.value === p)?.label.replace('…', '')}`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <OptionSelect
        aria-label="Created date"
        className="w-auto min-w-40"
        value={preset}
        onValueChange={(v) => {
          const next = (v ?? 'any') as DatePreset
          setCustomOpen(next === 'custom')
          if (next !== 'custom') {
            const r = presetRange(next)
            onChange({ date_from: r.from, date_to: r.to })
          }
        }}
        options={DATE_PRESETS.map((o) => ({ value: o.value, label: labelFor(o.value) }))}
      />
      {preset === 'custom' && (
        <>
          <Input
            type="date"
            aria-label="Created from"
            className="w-auto"
            value={from ?? ''}
            max={to}
            onChange={(e) => onChange({ date_from: e.target.value || undefined })}
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="Created to"
            className="w-auto"
            value={to ?? ''}
            min={from}
            onChange={(e) => onChange({ date_to: e.target.value || undefined })}
          />
        </>
      )}
    </div>
  )
}
