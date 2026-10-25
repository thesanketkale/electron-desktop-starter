import { useEffect, useState } from 'react'
import type { SettingsData } from '@shared/types'

interface SettingsViewProps {
  currentTheme: 'system' | 'light' | 'dark'
  onThemeChange: (theme: 'system' | 'light' | 'dark') => void
}

export function SettingsView({
  currentTheme,
  onThemeChange
}: SettingsViewProps): React.JSX.Element {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [secretKey, setSecretKey] = useState('')
  const [secretValue, setSecretValue] = useState('')
  const [secretStatus, setSecretStatus] = useState<string | null>(null)
  const [existingSecretPreview, setExistingSecretPreview] = useState<string | null>(null)

  const loadSettings = async (): Promise<void> => {
    try {
      const data = await window.api.settings.get()
      setSettings(data)
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  const checkSecret = async (key = 'api_key'): Promise<void> => {
    try {
      const result = await window.api.settings.getSecret(key)
      if (result.hasValue) {
        setExistingSecretPreview(result.maskedPreview)
      } else {
        setExistingSecretPreview(null)
      }
    } catch (err) {
      console.error('Failed to get secret:', err)
    }
  }

  useEffect(() => {
    void loadSettings()
    void checkSecret('api_key')
  }, [])

  const handleUpdateChannel = async (channel: 'latest' | 'beta'): Promise<void> => {
    try {
      await window.api.settings.set({ updateChannel: channel })
      await loadSettings()
    } catch (err) {
      console.error('Failed to update channel:', err)
    }
  }

  const handleSaveSecret = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!secretKey.trim() || !secretValue.trim()) return

    try {
      const result = await window.api.settings.setSecret(secretKey.trim(), secretValue.trim())
      setSecretStatus(`Stored successfully via ${result.encryptionMethod}`)
      setSecretValue('')
      await checkSecret(secretKey.trim())
      setTimeout(() => setSecretStatus(null), 4000)
    } catch (err) {
      console.error('Failed to save secret:', err)
      setSecretStatus('Failed to save secret')
    }
  }

  return (
    <div
      className="view-container"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      <div className="card">
        <h2 className="card-title">Preferences & Appearance</h2>
        <p className="card-description">
          Settings are schema-validated using Zod and saved to userData/settings.json.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontWeight: 500,
                fontSize: '0.875rem',
                marginBottom: '8px'
              }}
            >
              Theme
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {(['system', 'light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  className={`btn ${currentTheme === t ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => onThemeChange(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontWeight: 500,
                fontSize: '0.875rem',
                marginBottom: '8px'
              }}
            >
              Release Channel
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {(['latest', 'beta'] as const).map((ch) => (
                <button
                  key={ch}
                  className={`btn ${settings?.updateChannel === ch ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => handleUpdateChannel(ch)}
                >
                  {ch === 'latest' ? 'Stable (Latest)' : 'Beta (Prerelease)'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Credential & Secret Storage</h2>
        <p className="card-description">
          Encrypted with OS keychain (DPAPI on Windows, Keychain on macOS, Secret Service on Linux).
        </p>

        {existingSecretPreview && (
          <div
            style={{
              marginBottom: '16px',
              padding: '10px 14px',
              backgroundColor: 'var(--bg-surface-subtle)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Current api_key preview:{' '}
            </span>
            <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {existingSecretPreview}
            </code>
          </div>
        )}

        <form
          onSubmit={handleSaveSecret}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                marginBottom: '4px',
                fontWeight: 500
              }}
            >
              Secret Identifier Key
            </label>
            <input
              className="input"
              type="text"
              placeholder="e.g. api_key"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                marginBottom: '4px',
                fontWeight: 500
              }}
            >
              Secret Plaintext Value
            </label>
            <input
              className="input"
              type="password"
              placeholder="Enter sensitive key/token..."
              value={secretValue}
              onChange={(e) => setSecretValue(e.target.value)}
              required
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '4px'
            }}
          >
            {secretStatus && <span className="badge badge-success">{secretStatus}</span>}
            <button type="submit" className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>
              Encrypt & Store
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
