import { describe, expect, it } from 'vitest'
import { ApiError, buildQuery, describeError } from '@/lib/api'

describe('describeError', () => {
  it('uses a FastAPI string detail', () => {
    expect(describeError(new ApiError(409, JSON.stringify({ detail: 'Tag already exists.' })))).toBe('Tag already exists.')
  })

  it('uses the first validation message from a detail list', () => {
    const body = JSON.stringify({ detail: [{ msg: 'Field required', loc: ['body', 'title'] }] })
    expect(describeError(new ApiError(422, body))).toBe('Field required')
  })

  it('never shows raw bodies for server errors', () => {
    expect(describeError(new ApiError(502, '<html>Bad gateway</html>'))).toMatch(/server ran into a problem/)
  })

  it('explains network failures', () => {
    expect(describeError(new TypeError('Failed to fetch'))).toMatch(/Can't reach the server/)
  })

  it('falls back for unknown values', () => {
    expect(describeError('boom')).toBe('Something went wrong. Try again.')
  })
})

describe('buildQuery', () => {
  it('drops empty values', () => {
    expect(buildQuery({ a: 1, b: undefined, c: '', d: 'x' })).toBe('?a=1&d=x')
    expect(buildQuery({})).toBe('')
  })
})
