import { expect, test } from '@playwright/test'
import { mockApi, ticketDetail } from './mock-api'

const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

test('add a sub-issue from the main ticket, prefilled with its business details', async ({ page }) => {
  const api = await mockApi(page)
  let body: Record<string, unknown> | undefined
  api.on('POST', '/tickets', (route) => {
    body = route.request().postDataJSON()
    return route.fulfill(json(ticketDetail(5), 201))
  })
  await page.goto('/tickets/1')

  await expect(page.getByText('No sub-issues')).toBeVisible()
  await page.getByRole('button', { name: 'Add sub-issue' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add a sub-issue to #1001' })
  await expect(dialog.getByLabel('Business name')).toHaveValue('Sunrise Clinic')
  await expect(dialog.getByRole('combobox', { name: 'Category' })).toContainText('Prescriptions')

  await dialog.getByLabel('Title').fill('Check the sync server')
  await dialog.getByLabel('Description').fill('Part of the sync issue')
  await dialog.getByRole('button', { name: 'Create sub-issue' }).click()

  await expect(dialog).toBeHidden()
  expect(body).toMatchObject({ parent_id: 1, customer: 'Sunrise Clinic', category_id: 1, title: 'Check the sync server' })
})

test('main ticket lists sub-issues with progress; a sub-issue links back', async ({ page }) => {
  const api = await mockApi(page)
  const owner = ticketDetail(1).owner
  api.on('GET', '/tickets/1', (route) =>
    route.fulfill(
      json({
        ...ticketDetail(1),
        sub_issues: [
          { id: 2, ticket_number: 1002, title: 'Check the sync server', status: 'resolved', owner },
          { id: 3, ticket_number: 1003, title: 'Call the clinic', status: 'open', owner: null },
        ],
      }),
    ),
  )
  api.on('GET', '/tickets/3', (route) =>
    route.fulfill(
      json({
        ...ticketDetail(3),
        title: 'Call the clinic',
        parent: { id: 1, ticket_number: 1001, title: 'Prescriptions not syncing', status: 'open', owner },
      }),
    ),
  )
  await page.goto('/tickets/1')

  await expect(page.getByText('1 of 2 done')).toBeVisible()
  await page.getByRole('link', { name: '#1003' }).click()

  await expect(page).toHaveURL(/\/tickets\/3$/)
  await expect(page.getByText('Sub-issue of')).toBeVisible()
  // One level only: a sub-issue has no sub-issues section.
  await expect(page.getByRole('button', { name: 'Add sub-issue' })).toHaveCount(0)
  await page.getByRole('link', { name: '#1001 — Prescriptions not syncing' }).click()
  await expect(page).toHaveURL(/\/tickets\/1$/)
})
