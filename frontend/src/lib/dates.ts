// Created-date filter helpers. The URL holds plain local dates (YYYY-MM-DD,
// inclusive on both ends); the API gets exact instants for the user's local
// day boundaries.

const pad = (n: number) => String(n).padStart(2, '0')
export const toDateString = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Start of the local day, as an ISO instant. */
export const dayStartIso = (date: string) => parse(date).toISOString()

/** Last millisecond of the local day, as an ISO instant (so the end date is inclusive). */
export function dayEndIso(date: string) {
  const d = parse(date)
  d.setDate(d.getDate() + 1)
  return new Date(d.getTime() - 1).toISOString()
}

export type DatePreset = 'any' | 'today' | '7d' | '30d' | 'month' | 'custom'

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom range…' },
]

/** The from/to dates a preset stands for, relative to `today`. */
export function presetRange(preset: DatePreset, today = new Date()): { from?: string; to?: string } {
  const t = toDateString(today)
  const daysAgo = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - n)
    return toDateString(d)
  }
  switch (preset) {
    case 'today':
      return { from: t, to: t }
    case '7d':
      return { from: daysAgo(6), to: t }
    case '30d':
      return { from: daysAgo(29), to: t }
    case 'month':
      return { from: toDateString(new Date(today.getFullYear(), today.getMonth(), 1)), to: t }
    default:
      return {}
  }
}

/** Which preset a from/to pair matches, or 'custom'. */
export function matchPreset(from?: string, to?: string, today = new Date()): DatePreset {
  if (!from && !to) return 'any'
  const hit = DATE_PRESETS.find(({ value }) => {
    if (value === 'any' || value === 'custom') return false
    const r = presetRange(value, today)
    return r.from === from && r.to === to
  })
  return hit?.value ?? 'custom'
}
