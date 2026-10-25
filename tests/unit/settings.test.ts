import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { SettingsManager } from '../../src/main/settings'

// Mock Electron safeStorage for node unit test environment
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (str: string) => Buffer.from(str),
    decryptString: (buf: Buffer) => buf.toString()
  }
}))

describe('Settings & Secret Storage Manager', () => {
  let tempDir: string
  let manager: SettingsManager

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'settings-test-'))
    manager = new SettingsManager(tempDir)
  })

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('loads default settings when file does not exist', () => {
    const settings = manager.getSettings()
    expect(settings.theme).toBe('system')
    expect(settings.updateChannel).toBe('latest')
    expect(settings.autoCheckUpdates).toBe(true)
  })

  it('persists updated settings to disk', () => {
    const updated = manager.updateSettings({
      theme: 'dark',
      updateChannel: 'beta'
    })
    expect(updated.theme).toBe('dark')
    expect(updated.updateChannel).toBe('beta')

    // Reload from disk in a fresh instance
    const freshInstance = new SettingsManager(tempDir)
    expect(freshInstance.getSettings().theme).toBe('dark')
    expect(freshInstance.getSettings().updateChannel).toBe('beta')
  })

  it('stores and retrieves encrypted secrets via fallback when safeStorage is unavailable', () => {
    const secretResult = manager.setSecret('test_api_key', 'sk-live-1234567890abcdef')
    expect(secretResult.stored).toBe(true)
    expect(secretResult.encryptionMethod).toBe('fallback-obfuscated')

    const retrieved = manager.getSecret('test_api_key')
    expect(retrieved.hasValue).toBe(true)
    expect(retrieved.maskedPreview).toContain('...')
    expect(retrieved.rawValue).toBe('sk-live-1234567890abcdef')
  })

  it('returns hasValue: false for nonexistent secrets', () => {
    const result = manager.getSecret('nonexistent_key')
    expect(result.hasValue).toBe(false)
    expect(result.maskedPreview).toBe('')
  })
})
