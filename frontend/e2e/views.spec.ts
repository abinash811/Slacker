import { expect, test } from '@playwright/test'
import { mockApi } from './mock-api'

test('built-in views apply their filters and show which is active', async ({ page }) => {
  const api = await mockApi(page)
  await page.goto('/tickets')
  const views = page.getByRole('toolbar', { name: 'Ticket views' })
  await expect(views.getByRole('button', { name: 'All tickets' })).toHaveAttribute('aria-pressed', 'true')

  await views.getByRole('button', { name: 'Pending on me' }).click()
  await expect(page).toHaveURL(/owner_id=1/) // the mocked current user is id 1
  await expect(views.getByRole('button', { name: 'Pending on me' })).toHaveAttribute('aria-pressed', 'true')
  await expect(views.getByRole('button', { name: 'All tickets' })).toHaveAttribute('aria-pressed', 'false')
  expect(api.requests).toContainEqual(expect.stringMatching(/GET \/tickets\?owner_id=1/))

  await views.getByRole('button', { name: 'All tickets' }).click()
  await expect(page).not.toHaveURL(/owner_id/)
})

test('save the current filters as a view, reopen it, then delete it', async ({ page }) => {
  await mockApi(page)
  await page.goto('/tickets?priority=urgent&sla_status=breached')
  const views = page.getByRole('toolbar', { name: 'Ticket views' })

  await views.getByRole('button', { name: 'Save view' }).click()
  const dialog = page.getByRole('dialog', { name: 'New view' })
  await dialog.getByRole('button', { name: 'Save view' }).click()
  await expect(dialog.getByText('Enter a name.')).toBeVisible()
  await dialog.getByLabel('Name').fill('Urgent breaches')
  await dialog.getByRole('button', { name: 'Save view' }).click()
  await expect(page.getByText('View saved')).toBeVisible()

  // It's now the active view, so "Save view" disappears.
  await expect(views.getByRole('button', { name: 'Urgent breaches', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(views.getByRole('button', { name: 'Save view' })).toHaveCount(0)

  await views.getByRole('button', { name: 'All tickets' }).click()
  await views.getByRole('button', { name: 'Urgent breaches', exact: true }).click()
  await expect(page).toHaveURL(/priority=urgent/)
  await expect(page).toHaveURL(/sla_status=breached/)

  await views.getByRole('button', { name: 'Delete view Urgent breaches' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete view' }).click()
  await expect(page.getByText('View deleted')).toBeVisible()
  await expect(views.getByRole('button', { name: 'Urgent breaches', exact: true })).toHaveCount(0)
})
