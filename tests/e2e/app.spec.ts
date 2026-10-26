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
        NODE_ENV: 'production',
        ELECTRON_TEST: 'true'
      }
    })
    page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')
  })

  test.afterEach(async () => {
    if (app) {
      try {
        await app.close()
      } catch {
        // App may have already been closed
      }
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

    // Ensure theme attribute is applied
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    // Wait for the IPC settings save to complete
    await page.waitForFunction(async () => {
      const s = await window.api.settings.get()
      return s.theme === 'dark'
    })

    // Close app and clear reference to avoid double-close in afterEach
    const currentApp = app
    app = undefined as any
    await currentApp.close()

    // Restart app
    const restartedApp = await electron.launch({
      args: [join(__dirname, '../../out/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'production',
        ELECTRON_TEST: 'true'
      }
    })
    app = restartedApp
    const newPage = await restartedApp.firstWindow()
    await newPage.waitForLoadState('domcontentloaded')

    // Verify dark theme is persisted across restart (using auto-retrying locator assertion)
    await expect(newPage.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
})
