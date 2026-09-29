import { expect, test } from '@playwright/test'
import { makeTickets, mockApi, ticketDetail } from './mock-api'

test('pages through tickets 50 at a time', async ({ page }) => {
  const api = await mockApi(page, { tickets: makeTickets(120) })
  await page.goto('/tickets')

  await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()
  await expect(page.getByText('120 tickets')).toBeVisible()
  await expect(page.getByText('Showing 1–50 of 120')).toBeVisible()

  await page.getByLabel('Go to next page').click()
  await expect(page.getByText('Showing 51–100 of 120')).toBeVisible()
  await expect(page.getByRole('link', { name: '#1050' })).toBeVisible()
  expect(api.requests).toContainEqual(expect.stringMatching(/GET \/tickets\?.*page=2/))
})

test('sorts any column on the server, and resets to page 1', async ({ page }) => {
  const api = await mockApi(page, { tickets: makeTickets(120) })
  await page.goto('/tickets')
  await page.getByLabel('Go to next page').click()
  await expect(page.getByText('Showing 51–100 of 120')).toBeVisible()

  await page.getByRole('button', { name: 'Priority' }).click()
  await expect(page.getByText('Showing 1–50 of 120')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Priority' })).toHaveAttribute('aria-sort', 'descending')
  expect(api.requests).toContainEqual(expect.stringMatching(/sort_by=priority&sort_dir=desc.*page=1/))

  // Name columns sort too (joined on the server), ascending on second click.
  await page.getByRole('button', { name: 'Team' }).click()
  await page.getByRole('button', { name: 'Team' }).click()
  await expect(page.getByRole('columnheader', { name: 'Team' })).toHaveAttribute('aria-sort', 'ascending')
  expect(api.requests).toContainEqual(expect.stringMatching(/sort_by=team_name&sort_dir=asc/))
})

test('shows a filtered empty state with a way out', async ({ page }) => {
  await mockApi(page, { tickets: [] })
  await page.goto('/tickets?priority=high')
  await expect(page.getByText('No tickets match these filters')).toBeVisible()
  await page.getByRole('cell').getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByText('No tickets yet')).toBeVisible()
})

test('opens a ticket from the keyboard', async ({ page }) => {
  await mockApi(page)
  await page.goto('/tickets')
  await page.getByRole('link', { name: '#1000' }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/tickets\/1$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Prescriptions not syncing')
})

test('unknown ticket shows not found', async ({ page }) => {
  await mockApi(page)
  await page.goto('/tickets/999')
  await expect(page.getByText('Ticket not found')).toBeVisible()
})

test('edits a ticket’s details', async ({ page }) => {
  const api = await mockApi(page)
  let sent: Record<string, unknown> | undefined
  api.on('PATCH', '/tickets/1', (route) => {
    sent = route.request().postDataJSON()
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...ticketDetail(1), ...sent }) })
  })
  await page.goto('/tickets/1')

  await page.getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog', { name: /Edit ticket/ })
  await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeDisabled()

  await dialog.getByLabel('Business name').fill('ABT Private Ltd')
  await dialog.getByLabel('Doctor name').fill('Dr. Rao')
  await dialog.getByRole('button', { name: 'Save changes' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByText('Ticket updated')).toBeVisible()
  expect(sent).toMatchObject({ customer: 'ABT Private Ltd', doctor_name: 'Dr. Rao', business_id: null, category_id: 1 })
})

test('edit form asks for required details', async ({ page }) => {
  await mockApi(page)
  await page.goto('/tickets/1')
  await page.getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog', { name: /Edit ticket/ })
  await dialog.getByLabel('Business name').fill('')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog.getByText('Enter the business name.')).toBeVisible()
})
