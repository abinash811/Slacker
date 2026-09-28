import { expect, test } from '@playwright/test'
import { mockApi } from './mock-api'

test('a read-only role sees Settings without any change controls', async ({ page }) => {
  await mockApi(page, { settings: { create: false, edit: false, delete: false } })
  await page.goto('/settings/tags')
  await expect(page.getByText("You can view Settings, but not change them")).toBeVisible()
  await expect(page.getByText('Appointment', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'New' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Archive' })).toHaveCount(0)

  await page.goto('/settings/sla')
  await expect(page.getByLabel('Default SLA (hours)')).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0)

  await page.goto('/teams')
  await page.getByRole('button', { name: 'Support', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Remove', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Set default' })).toHaveCount(0)
  await expect(page.getByLabel('Add member')).toHaveCount(0)
})

test('a create-only role can add but not archive, and is told why', async ({ page }) => {
  await mockApi(page, { settings: { create: true, edit: false, delete: false } })
  await page.goto('/settings/tags')
  await expect(page.getByText("You can't edit or archive items here")).toBeVisible()
  await expect(page.getByRole('button', { name: 'New' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Archive' })).toHaveCount(0)
})

test('if the server refuses anyway, the reason is shown', async ({ page }) => {
  const api = await mockApi(page)
  api.on('PATCH', /^\/tags\/\d+$/, (route) =>
    route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ detail: "Your role doesn't allow you to archive or remove items in Settings. Ask a Settings admin." }),
    }),
  )
  await page.goto('/settings/tags')
  await page.getByRole('button', { name: 'Archive' }).click()
  await expect(page.getByText("Couldn't update tag")).toBeVisible()
  await expect(page.getByText('Ask a Settings admin.')).toBeVisible()
})
