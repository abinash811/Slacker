import { test } from '@playwright/test'
import { mockApi } from './mock-api'
test('debug', async ({ page }) => {
  await mockApi(page)
  await page.goto('/tickets?date_from=2026-09-01&date_to=2026-09-28')
  await page.waitForTimeout(500)
  console.log('VIS', await page.getByLabel('Created to').count(), await page.getByRole('combobox', { name: 'Created date' }).innerText())
  await page.getByLabel('Created to').fill('2026-09-15')
  await page.waitForTimeout(300)
  console.log('D', page.url())
})
