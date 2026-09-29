import { expect, test } from '@playwright/test'
import { mockApi } from './mock-api'

test('create a key, get ready-to-paste setup for each app, then revoke it', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await page.getByRole('link', { name: 'Connect Claude' }).click()
  await expect(page.getByRole('heading', { name: 'Connect to Claude' })).toBeVisible()

  // Before a key exists: placeholders, one-click buttons disabled, no keys listed.
  await expect(page.getByText('No keys yet')).toBeVisible()
  await expect(page.getByLabel('Claude Desktop config', { exact: true })).toContainText('Bearer YOUR_KEY')

  await page.getByRole('button', { name: 'Create key' }).click()
  await expect(page.getByText('Copy your key now')).toBeVisible()
  await expect(page.getByLabel('Key', { exact: true })).toHaveText('slk_test1234secretvalue')

  // The new key is filled into every app's setup.
  await expect(page.getByLabel('Claude Desktop config', { exact: true })).toContainText('Bearer slk_test1234secretvalue')
  await expect(page.getByLabel('Claude Desktop config', { exact: true })).toContainText('http://localhost:8000/mcp')
  await page.getByRole('tab', { name: 'Claude Code' }).click()
  await expect(page.getByLabel('Claude Code command', { exact: true })).toContainText(
    'claude mcp add --transport http slacker http://localhost:8000/mcp --header "Authorization: Bearer slk_test1234secretvalue"',
  )
  await page.getByRole('tab', { name: 'Cursor' }).click()
  await expect(page.getByRole('link', { name: 'Add to Cursor' })).toHaveAttribute('href', /^cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?name=slacker&config=/)

  await page.getByRole('tab', { name: 'VS Code' }).click()
  await expect(page.getByRole('link', { name: 'Add to VS Code' })).toHaveAttribute('href', /^vscode:mcp\/install\?%7B%22name%22%3A%22slacker%22/)

  // Listed without the secret; revoking asks first.
  await expect(page.getByText('slk_test1234…')).toBeVisible()
  await page.getByRole('button', { name: 'Revoke' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Revoke key' }).click()
  await expect(page.getByText('Key revoked')).toBeVisible()
  await expect(page.getByText('No keys yet')).toBeVisible()
})
