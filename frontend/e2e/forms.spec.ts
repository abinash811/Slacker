import { expect, test } from '@playwright/test'
import { mockApi, ticketDetail } from './mock-api'

test('create ticket validates on submit, then posts and confirms', async ({ page }) => {
  const api = await mockApi(page)
  let body: Record<string, unknown> | undefined
  api.on('POST', '/tickets', (route) => {
    body = route.request().postDataJSON()
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(ticketDetail(5)) })
  })
  await page.goto('/tickets')
  await page.getByRole('button', { name: 'Create ticket' }).click()
  const dialog = page.getByRole('dialog', { name: 'Create ticket' })

  await dialog.getByRole('button', { name: 'Create & post to Slack' }).click()
  await expect(dialog.getByText('Add a short title.')).toBeVisible()
  await expect(dialog.getByText('Choose a category.')).toBeVisible()
  await expect(dialog.getByLabel('Title')).toHaveAttribute('aria-invalid', 'true')
  // The default team is pre-selected, so it has no error.
  await expect(dialog.getByText('Choose a team.')).toHaveCount(0)

  await dialog.getByLabel('Title').fill('Sync broken')
  await expect(dialog.getByText('Add a short title.')).toHaveCount(0) // live re-validation
  await dialog.getByLabel('Description').fill('Since this morning')
  await dialog.getByLabel('Business name').fill('Sunrise Clinic')
  await dialog.getByRole('combobox', { name: 'Category' }).click()
  await page.getByRole('option', { name: 'Prescriptions' }).click()
  await dialog.getByRole('button', { name: 'Create & post to Slack' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByText('Ticket created and posted to Slack')).toBeVisible()
  expect(body).toMatchObject({ title: 'Sync broken', category_id: 1, team_id: 1, priority: 'medium' })
})

test('a failed create keeps the dialog open with the server message', async ({ page }) => {
  const api = await mockApi(page)
  api.on('POST', '/tags', (route) =>
    route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ detail: 'A tag with that name already exists.' }) }),
  )
  await page.goto('/settings/tags')
  await page.getByRole('button', { name: 'New' }).click()
  const dialog = page.getByRole('dialog', { name: 'New tag' })

  await dialog.getByRole('button', { name: 'Create tag' }).click()
  await expect(dialog.getByText('Enter a name.')).toBeVisible()

  await dialog.getByLabel('Name').fill('Appointment')
  await dialog.getByRole('button', { name: 'Create tag' }).click()
  await expect(dialog.getByText("Couldn't create tag")).toBeVisible()
  await expect(dialog.getByText('A tag with that name already exists.')).toBeVisible()
  await expect(dialog.getByLabel('Name')).toHaveValue('Appointment')
})

test('removing a member asks for confirmation first', async ({ page }) => {
  const api = await mockApi(page)
  await page.goto('/teams')
  await page.getByRole('button', { name: 'Support', exact: true }).click()
  await page.getByRole('button', { name: 'Remove', exact: true }).click()

  const confirm = page.getByRole('alertdialog', { name: 'Remove Priya Sharma?' })
  await expect(confirm).toBeVisible()
  await confirm.getByRole('button', { name: 'Cancel' }).click()
  expect(api.requests.some((r) => r.startsWith('DELETE'))).toBe(false)

  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await page.getByRole('button', { name: 'Remove member' }).click()
  await expect(page.getByText('Member removed')).toBeVisible()
  expect(api.requests).toContain('DELETE /teams/1/members/1')
})

test('SLA rejects invalid hours and saves valid ones', async ({ page }) => {
  const api = await mockApi(page)
  await page.goto('/settings/sla')
  const hours = page.getByLabel('Default SLA (hours)')
  await expect(hours).toHaveValue('24')
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()

  await hours.fill('0')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Enter a whole number of hours, 1 or more.')).toBeVisible()

  await hours.fill('48')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('SLA updated')).toBeVisible()
  expect(api.requests).toContain('PATCH /sla-settings')
})
