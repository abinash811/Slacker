import { describe, expect, it } from 'vitest'
import { customFieldSchema, slaSchema, ticketSchema } from '@/lib/schemas'

const validTicket = {
  title: '  Sync broken ',
  description: 'Details',
  customer: 'Sunrise Clinic',
  business_id: '',
  mobile_number: '',
  doctor_name: '',
  category_id: '1',
  team_id: '2',
  priority: 'high',
  owner_id: null,
  custom_values: {},
  tag_ids: [],
}

describe('ticketSchema', () => {
  it('trims text and turns empty optionals into undefined', () => {
    const out = ticketSchema.parse(validTicket)
    expect(out.title).toBe('Sync broken')
    expect(out.business_id).toBeUndefined()
  })

  it('reports every missing required field with an instruction', () => {
    const result = ticketSchema.safeParse({ ...validTicket, title: ' ', customer: '', category_id: '' })
    expect(result.success).toBe(false)
    const messages = Object.fromEntries(result.error!.issues.map((i) => [i.path[0], i.message]))
    expect(messages).toEqual({
      title: 'Add a short title.',
      customer: 'Enter the customer or account.',
      category_id: 'Choose a category.',
    })
  })

  it('rejects an obviously invalid phone number', () => {
    expect(ticketSchema.safeParse({ ...validTicket, mobile_number: 'abc' }).success).toBe(false)
    expect(ticketSchema.safeParse({ ...validTicket, mobile_number: '+91 98450 12345' }).success).toBe(true)
  })
})

describe('customFieldSchema', () => {
  it('splits dropdown options and requires at least one', () => {
    expect(customFieldSchema.parse({ label: 'Region', field_type: 'dropdown', options: 'North, , South ' }).options).toEqual([
      'North',
      'South',
    ])
    const bad = customFieldSchema.safeParse({ label: 'Region', field_type: 'dropdown', options: ' , ' })
    expect(bad.success).toBe(false)
    expect(bad.error!.issues[0].path).toEqual(['options'])
  })

  it('drops options for text fields', () => {
    expect(customFieldSchema.parse({ label: 'Clinic ID', field_type: 'text', options: 'ignored' }).options).toBeNull()
  })
})

describe('slaSchema', () => {
  it('coerces the input string and requires a positive whole number', () => {
    expect(slaSchema.parse({ default_hours: '24' }).default_hours).toBe(24)
    expect(slaSchema.safeParse({ default_hours: '0' }).success).toBe(false)
    expect(slaSchema.safeParse({ default_hours: '1.5' }).success).toBe(false)
    expect(slaSchema.safeParse({ default_hours: '' }).success).toBe(false)
  })
})
