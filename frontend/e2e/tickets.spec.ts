import { expect, test } from '@playwright/test'
import { makeTickets, mockApi } from './mock-api'

test('pages through tickets 50 at a time', async ({ page }) => {
  const api = await mockApi(page, { tickets: makeTickets(120) })
  await page.goto('/tickets')

  await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()
  await expect(page.getByText('120 tickets')).toBeVisible()
  await expect(page.getByText('Showing 1–50 of 120')).toBeVisible()

  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByText('Showing 51–100 of 120')).toBeVisible()
  await expect(page.getByRole('link', { name: '#1050' })).toBeVisible()
  expect(api.requests).toContainEqual(expect.stringMatching(/GET \/tickets\?.*page=2/))
})

test('sorts only on columns the server supports, and resets to page 1', async ({ page }) => {
  const api = await mockApi(page, { tickets: makeTickets(120) })
  await page.goto('/tickets')
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByText('Showing 51–100 of 120')).toBeVisible()

  await page.getByRole('button', { name: 'Priority' }).click()
  await expect(page.getByText('Showing 1–50 of 120')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Priority' })).toHaveAttribute('aria-sort', 'descending')
  expect(api.requests).toContainEqual(expect.stringMatching(/sort_by=priority&sort_dir=desc.*page=1/))

  // Title has no sort control at all.
  await expect(page.getByRole('columnheader', { name: 'Title' }).getByRole('button')).toHaveCount(0)
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
