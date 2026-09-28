import { z } from 'zod'

// Form schemas. Messages follow the Writing rules: say what to do, not what's wrong.

const required = (message: string) => z.string().trim().min(1, message)
const optionalText = z.string().trim().optional().transform((v) => v || undefined)

export const nameSchema = z.object({ name: required('Enter a name.').max(80, 'Keep it under 80 characters.') })
export type NameValues = z.output<typeof nameSchema>

export const roleSchema = nameSchema.extend({
  can_create_settings: z.boolean(),
  can_edit_settings: z.boolean(),
  can_delete_settings: z.boolean(),
})

export const customFieldSchema = z
  .object({
    label: required('Enter a label.').max(80, 'Keep it under 80 characters.'),
    field_type: z.enum(['text', 'dropdown']),
    options: z.string(),
  })
  .transform(({ label, field_type, options }) => ({
    label,
    field_type,
    options: field_type === 'dropdown' ? options.split(',').map((o) => o.trim()).filter(Boolean) : null,
  }))
  .refine((v) => v.field_type === 'text' || (v.options?.length ?? 0) > 0, {
    message: 'Add at least one option, separated by commas.',
    path: ['options'],
  })

export const slaSchema = z.object({
  default_hours: z.coerce
    .number({ message: 'Enter a whole number of hours, 1 or more.' })
    .int('Enter a whole number of hours, 1 or more.')
    .min(1, 'Enter a whole number of hours, 1 or more.')
    .max(24 * 90, 'Keep it under 90 days.'),
})

export const addMemberSchema = z.object({
  user_id: z.string({ message: 'Choose a person.' }).min(1, 'Choose a person.'),
  role_id: z.string({ message: 'Choose a role.' }).min(1, 'Choose a role.'),
})

export const ticketSchema = z.object({
  title: required('Add a short title.').max(200, 'Keep the title under 200 characters.'),
  description: required('Describe the issue.'),
  customer: required('Enter the customer or account.'),
  business_id: optionalText,
  mobile_number: optionalText.refine((v) => !v || /^[+\d][\d\s-]{6,}$/.test(v), 'Enter a valid phone number.'),
  doctor_name: optionalText,
  category_id: z.string({ message: 'Choose a category.' }).min(1, 'Choose a category.'),
  team_id: z.string({ message: 'Choose a team.' }).min(1, 'Choose a team.'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  owner_id: z.string().nullable(),
  custom_values: z.record(z.string(), z.string()),
  tag_ids: z.array(z.number()),
})
