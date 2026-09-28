import { describe, expect, it } from 'vitest'
import { dayEndIso, dayStartIso, matchPreset, presetRange } from '@/lib/dates'

const today = new Date(2026, 8, 28) // Sep 28, 2026 (local)

describe('dates', () => {
  it('computes preset ranges, both ends inclusive', () => {
    expect(presetRange('today', today)).toEqual({ from: '2026-09-28', to: '2026-09-28' })
    expect(presetRange('7d', today)).toEqual({ from: '2026-09-22', to: '2026-09-28' })
    expect(presetRange('30d', today)).toEqual({ from: '2026-08-30', to: '2026-09-28' })
    expect(presetRange('month', today)).toEqual({ from: '2026-09-01', to: '2026-09-28' })
    expect(presetRange('any', today)).toEqual({})
  })

  it('recognises a preset from its dates, otherwise custom', () => {
    expect(matchPreset(undefined, undefined, today)).toBe('any')
    expect(matchPreset('2026-09-22', '2026-09-28', today)).toBe('7d')
    expect(matchPreset('2026-09-01', '2026-09-15', today)).toBe('custom')
  })

  it('sends whole local days to the API', () => {
    const start = new Date(dayStartIso('2026-09-28'))
    const end = new Date(dayEndIso('2026-09-28'))
    expect([start.getDate(), start.getHours(), start.getMinutes()]).toEqual([28, 0, 0])
    expect([end.getDate(), end.getHours(), end.getMinutes(), end.getSeconds()]).toEqual([28, 23, 59, 59])
  })
})
