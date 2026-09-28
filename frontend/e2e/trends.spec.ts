import { expect, test } from '@playwright/test'
import { mockApi } from './mock-api'

test('dashboard shows 12-week trends with hover values and a table view', async ({ page }) => {
  const api = await mockApi(page)
  await page.goto('/?team_id=2')
  const trends = page.getByRole('region', { name: 'Last 12 weeks' })
  await expect(trends.getByText('Created vs resolved')).toBeVisible()
  await expect(trends.getByText('Median resolution time')).toBeVisible()
  await expect(trends.getByText('SLA breaches', { exact: true })).toBeVisible()
  // Filters carry through; the time axis is fixed at 12 weeks.
  expect(api.requests).toContainEqual(expect.stringMatching(/GET \/analytics\/trends\?team_id=2&weeks=12/))

  // Latest median is labeled at the line's end.
  await expect(trends.getByText('4.6h')).toBeVisible()

  // Hovering a chart shows that week's values.
  const chart = trends.locator('[data-slot="chart"]').first()
  await chart.locator('.recharts-wrapper').hover({ position: { x: 170, y: 90 } })
  await expect(chart.locator('.recharts-tooltip-wrapper')).toContainText('Created')
  await expect(chart.locator('.recharts-tooltip-wrapper')).toContainText('Resolved')

  // Every chart can be read as a table.
  await trends.getByRole('button', { name: 'Show table' }).first().click()
  const table = trends.getByRole('table')
  await expect(table.getByRole('columnheader', { name: 'Created' })).toBeVisible()
  await expect(table.getByRole('row')).toHaveCount(13) // header + 12 weeks
})

test('trends show an empty state when there has been no activity', async ({ page }) => {
  const api = await mockApi(page)
  api.on('GET', '/analytics/trends', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        Array.from({ length: 12 }, (_, i) => ({
          week_start: new Date(Date.UTC(2026, 6, 6 + i * 7)).toISOString(),
          created: 0,
          resolved: 0,
          median_resolution_hours: null,
          sla_breached: 0,
        })),
      ),
    }),
  )
  await page.goto('/')
  await expect(page.getByText('No ticket activity yet')).toBeVisible()
})
