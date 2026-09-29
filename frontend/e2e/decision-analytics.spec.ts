import { expect, test } from '@playwright/test'
import { makeTickets, mockApi } from './mock-api'

test('dashboard shows due-soon tickets, ticket age and a team scorecard', async ({ page }) => {
  const api = await mockApi(page, { tickets: makeTickets(8) })
  await page.goto('/')

  // Due in the next 24 hours: its own list, with a way to see all of them.
  const dueSoon = page.getByText('Due in the next 24 hours · 8')
  await expect(dueSoon).toBeVisible()
  expect(api.requests).toContainEqual(expect.stringMatching(/GET \/tickets\?.*sla_status=at_risk.*sort_by=sla_due_at&sort_dir=asc/))
  await expect(page.getByRole('link', { name: 'View all 8' }).nth(1)).toHaveAttribute('href', '/tickets?sla_status=at_risk')

  // Age of open tickets, with breaches called out in words.
  await expect(page.getByText('Over 7 days')).toBeVisible()
  await expect(page.getByLabel('Over 7 days: 1 open tickets')).toBeVisible()

  // Scorecard: overdue people are flagged with a badge, and a name opens their open tickets.
  const scorecard = page.getByRole('table')
  await expect(scorecard.getByRole('row', { name: /Priya Sharma/ })).toContainText('2 overdue')
  await expect(scorecard.getByRole('row', { name: /Arjun Rao/ })).toContainText('96%')
  await scorecard.getByRole('link', { name: 'Arjun Rao' }).click()
  await expect(page).toHaveURL(/\/tickets\?owner_id=2&state=active$/)
})
