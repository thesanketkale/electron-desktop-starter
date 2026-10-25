import { safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'
import { SettingsSetRequestSchema } from '../../shared/ipc'
import type { SettingsData } from '../../shared/types'

const DEFAULT_SETTINGS: SettingsData = {
  theme: 'system',
  updateChannel: 'latest',
  autoCheckUpdates: true,
  windowState: {
    width: 1024,
    height: 768,
    isMaximized: false
  }
}

export class SettingsManager {
  private settings: SettingsData
  private readonly settingsPath: string
  private readonly secretsPath: string

  constructor(storageDirectory: string) {
    mkdirSync(storageDirectory, { recursive: true })
    this.settingsPath = join(storageDirectory, 'settings.json')
    this.secretsPath = join(storageDirectory, 'secrets.dat')
    this.settings = this.loadSettings()
  }

  private loadSettings(): SettingsData {
    if (!existsSync(this.settingsPath)) {
      this.saveSettings(DEFAULT_SETTINGS)
      return { ...DEFAULT_SETTINGS }
    }

    try {
      const raw = readFileSync(this.settingsPath, 'utf-8')
      const parsed = JSON.parse(raw)
      const validated = SettingsSetRequestSchema.safeParse(parsed)
      if (validated.success) {
        return {
          ...DEFAULT_SETTINGS,
          ...validated.data
        }
      }
      return { ...DEFAULT_SETTINGS }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  }

  public getSettings(): SettingsData {
    return { ...this.settings }
  }

  public updateSettings(partial: Partial<SettingsData>): SettingsData {
    this.settings = {
      ...this.settings,
      ...partial,
      windowState: partial.windowState
        ? { ...this.settings.windowState, ...partial.windowState }
        : this.settings.windowState
    }
    this.saveSettings(this.settings)
    return { ...this.settings }
  }

  private saveSettings(data: SettingsData): void {
    writeFileSync(this.settingsPath, JSON.stringify(data, null, 2), 'utf-8')
  }

  // --- Secret Storage (safeStorage with Linux Fallback) ---

  private getFallbackKey(): Buffer {
    // Generate deterministic machine-local key for Linux headless/fallback environments
    const seed = `electron-foundation:${process.env.USER || process.env.USERNAME || 'default'}`
    return createHash('sha256').update(seed).digest()
  }

  private encryptFallback(plainText: string): string {
    const iv = randomBytes(12)
    const key = this.getFallbackKey()
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    let encrypted = cipher.update(plainText, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const tag = cipher.getAuthTag()
    return `fallback:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
  }

  private decryptFallback(cipherText: string): string {
    const parts = cipherText.split(':')
    if (parts.length !== 4 || parts[0] !== 'fallback') {
      throw new Error('Invalid fallback ciphertext format')
    }
    const iv = Buffer.from(parts[1]!, 'hex')
    const tag = Buffer.from(parts[2]!, 'hex')
    const encrypted = parts[3]!
    const key = this.getFallbackKey()
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  private loadSecretsMap(): Record<string, string> {
    if (!existsSync(this.secretsPath)) {
      return {}
    }
    try {
      const raw = readFileSync(this.secretsPath, 'utf-8')
      return JSON.parse(raw) as Record<string, string>
    } catch {
      return {}
    }
  }

  private saveSecretsMap(map: Record<string, string>): void {
    writeFileSync(this.secretsPath, JSON.stringify(map, null, 2), 'utf-8')
  }

  public setSecret(
    key: string,
    value: string
  ): { stored: boolean; encryptionMethod: 'safeStorage' | 'fallback-obfuscated' } {
    const map = this.loadSecretsMap()
    let method: 'safeStorage' | 'fallback-obfuscated' = 'safeStorage'

    if (safeStorage.isEncryptionAvailable()) {
      const encryptedBuffer = safeStorage.encryptString(value)
      map[key] = `safeStorage:${encryptedBuffer.toString('base64')}`
      method = 'safeStorage'
    } else {
      map[key] = this.encryptFallback(value)
      method = 'fallback-obfuscated'
    }

    this.saveSecretsMap(map)
    return { stored: true, encryptionMethod: method }
  }

  public getSecret(key: string): {
    key: string
    hasValue: boolean
    maskedPreview: string
    rawValue?: string
  } {
    const map = this.loadSecretsMap()
    const stored = map[key]

    if (!stored) {
      return { key, hasValue: false, maskedPreview: '' }
    }

    try {
      let decrypted = ''
      if (stored.startsWith('safeStorage:')) {
        const base64 = stored.replace('safeStorage:', '')
        decrypted = safeStorage.decryptString(Buffer.from(base64, 'base64'))
      } else if (stored.startsWith('fallback:')) {
        decrypted = this.decryptFallback(stored)
      } else {
        return { key, hasValue: false, maskedPreview: '' }
      }

      const maskedPreview =
        decrypted.length > 8 ? `${decrypted.slice(0, 4)}...${decrypted.slice(-4)}` : '••••••••'

      return { key, hasValue: true, maskedPreview, rawValue: decrypted }
    } catch {
      return { key, hasValue: false, maskedPreview: '' }
    }
  }
}
