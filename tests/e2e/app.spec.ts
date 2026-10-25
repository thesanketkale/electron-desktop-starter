import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page
} from '@playwright/test'
import { join } from 'node:path'
import type { api } from '../../src/preload/index'

declare const window: Window & { api: typeof api }

test.describe('Electron Foundation Desktop Application', () => {
  let app: ElectronApplication
  let page: Page

  test.beforeEach(async () => {
    app = await electron.launch({
      args: [join(__dirname, '../../out/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    })
    page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')
  })

  test.afterEach(async () => {
    if (app) {
      await app.close()
    }
  })

  test('launches application and renders window with correct title', async () => {
    const title = await page.title()
    expect(title).toBe('Electron Foundation')

    // App header title should be visible
    const headerTitle = page.locator('.app-header')
    await expect(headerTitle).toContainText('Electron Foundation')
    await expect(headerTitle).toContainText('SECURE')
  })

  test('verifies CSP header is served on app protocol response', async () => {
    const cspStatus = await page.evaluate(async () => {
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
      const sec = await window.api.security.verify()
      return {
        hasMeta: !!meta,
        metaHasDefaultSrcNone:
          meta?.getAttribute('content')?.includes("default-src 'none'") ?? false,
        cspEnforced: sec.cspEnforced
      }
    })
    expect(cspStatus.cspEnforced).toBe(true)
    expect(cspStatus.metaHasDefaultSrcNone).toBe(true)
  })

  test('verifies IPC roundtrip and rejection of invalid payload', async () => {
    // 1. Valid IPC invocation via exposed window.api
    const appInfo = await page.evaluate(async () => {
      return window.api.app.getInfo()
    })
    expect(appInfo.name).toBeDefined()
    expect(appInfo.electronVersion).toBeDefined()

    // 2. Invalid payload rejected by Zod schema
    const rejection = await page.evaluate(async () => {
      try {
        // Pass invalid payload: empty title
        await window.api.db.createNote('', 'content with no title')
        return { rejected: false, name: '' }
      } catch (err: unknown) {
        return {
          rejected: true,
          name: (err as Error).name,
          message: (err as Error).message
        }
      }
    })

    expect(rejection.rejected).toBe(true)
    expect(rejection.message).toContain('failed schema validation')
  })

  test('verifies database operations and migrations applied', async () => {
    // Switch to SQLite Database tab
    await page.getByRole('button', { name: /SQLite Storage/i }).click()
    await expect(page.locator('.card-title')).toContainText('Local SQLite Storage')

    // Fill form and add note
    await page.getByPlaceholder('Note title...').fill('E2E Test Note')
    await page.getByPlaceholder('Note content (optional)...').fill('Persistent note content')
    await page.getByRole('button', { name: 'Add Note' }).click()

    // Expect note to be in the list
    await expect(page.locator('.main-content')).toContainText('E2E Test Note')
  })

  test('verifies window.open is blocked by navigation guard', async () => {
    const windowOpened = await page.evaluate(() => {
      const opened = window.open('https://example.com', '_blank')
      return opened !== null
    })
    expect(windowOpened).toBe(false)
  })

  test('verifies settings persist across restarts', async () => {
    // Navigate to Settings
    await page.getByRole('button', { name: /Settings & Secrets/i }).click()
    await page.getByRole('button', { name: 'Dark', exact: true }).click()

    // Close app
    await app.close()

    // Restart app
    const restartedApp = await electron.launch({
      args: [join(__dirname, '../../out/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    })
    const newPage = await restartedApp.firstWindow()
    await newPage.waitForLoadState('domcontentloaded')

    // Verify dark theme is persisted
    const themeAttr = await newPage.evaluate(() => {
      return document.documentElement.getAttribute('data-theme')
    })
    expect(themeAttr).toBe('dark')

    await restartedApp.close()
  })
})
