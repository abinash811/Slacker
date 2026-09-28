import { expect, test } from '@playwright/test'
import { mockApi } from './mock-api'

test('dashboard shows an error with a working retry', async ({ page }) => {
  const api = await mockApi(page)
  let fail = true
  api.on('GET', '/analytics/summary', (route) =>
    fail
      ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Database unavailable' }) })
      : route.fallback(),
  )
  await page.goto('/')
  await expect(page.getByText("Couldn't load dashboard numbers")).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Database unavailable')).toBeVisible()

  fail = false
  await page.getByRole('button', { name: 'Try again' }).first().click()
  await expect(page.getByText('Open tickets')).toBeVisible()
})

test('background action failures show an error toast', async ({ page }) => {
  const api = await mockApi(page)
  api.on('POST', /\/tickets\/\d+\/resolve/, (route) =>
    route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ detail: 'Ticket is already closed.' }) }),
  )
  await page.goto('/tickets/1')
  await page.getByRole('button', { name: 'Resolve ticket' }).click()
  await expect(page.getByText("Couldn't resolve ticket")).toBeVisible()
  await expect(page.getByText('Ticket is already closed.')).toBeVisible()
})

test('unknown routes show not found', async ({ page }) => {
  await mockApi(page)
  await page.goto('/does-not-exist')
  await expect(page.getByText('Page not found')).toBeVisible()
  await page.getByRole('link', { name: 'Go to dashboard' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('design gallery renders every section', async ({ page }) => {
  await mockApi(page)
  await page.goto('/design')
  for (const name of ['Typography', 'Buttons', 'Form controls', 'Feedback', 'Overlays', 'Table']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  }
})
