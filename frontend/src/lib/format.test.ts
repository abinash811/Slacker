import { describe, expect, it } from 'vitest'
import { formatDuration, formatHours, formatPct } from '@/lib/format'

describe('format', () => {
  it('formats durations at the right granularity', () => {
    expect(formatDuration(90)).toBe('1m')
    expect(formatDuration(3 * 3600 + 5 * 60)).toBe('3h 5m')
    expect(formatDuration(2 * 86400 + 4 * 3600)).toBe('2d 4h')
    expect(formatDuration(-7200)).toBe('-2h 0m')
  })

  it('formats hours and percentages with a dash for missing values', () => {
    expect(formatHours(null)).toBe('—')
    expect(formatHours(0.5)).toBe('30m')
    expect(formatHours(6.44)).toBe('6.4h')
    expect(formatPct(null)).toBe('—')
    expect(formatPct(91.6)).toBe('92%')
  })
})
