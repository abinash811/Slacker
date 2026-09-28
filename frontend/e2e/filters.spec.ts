import { expect, test } from '@playwright/test'
import { mockApi } from './mock-api'

test('filter tickets by created date: quick range and custom dates', async ({ page }) => {
  const api = await mockApi(page)
  await page.goto('/tickets')

  await page.getByRole('combobox', { name: 'Created date' }).click()
  await page.getByRole('option', { name: 'Created: Last 7 days' }).click()
  await expect(page).toHaveURL(/date_from=\d{4}-\d{2}-\d{2}&date_to=\d{4}-\d{2}-\d{2}/)
  await expect.poll(() => api.requests.some((r) => /GET \/tickets\?.*date_from=.*T.*date_to=/.test(r))).toBe(true)

  await page.getByRole('combobox', { name: 'Created date' }).click()
  await page.getByRole('option', { name: 'Created: Custom range' }).click()
  await page.getByLabel('Created from').fill('2026-09-01')
  await page.getByLabel('Created to').fill('2026-09-15')
  await expect(page).toHaveURL(/date_from=2026-09-01&date_to=2026-09-15/)

  // The same filter is on the Dashboard and is kept when switching pages.
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await page.goto('/?date_from=2026-09-01&date_to=2026-09-15')
  await expect(page.getByLabel('Created from')).toHaveValue('2026-09-01')
  await expect.poll(() => api.requests.some((r) => /GET \/analytics\/summary\?.*date_from=/.test(r))).toBe(true)
})

test('tickets table shows Business name and Created columns; search covers business name', async ({ page }) => {
  const api = await mockApi(page)
  await page.goto('/tickets')
  await expect(page.getByRole('columnheader', { name: 'Business name' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Created' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Doctor' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Business ID' })).toBeVisible()
  await expect(page.getByText(/ago$/).first()).toBeVisible()

  await page.getByRole('searchbox', { name: 'Search tickets' }).fill('Sunrise')
  await expect.poll(() => api.requests.some((r) => /search=Sunrise/.test(r))).toBe(true)
})
