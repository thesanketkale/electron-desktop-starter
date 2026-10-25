import { useState, useEffect } from 'react'
import { SecurityView } from './views/SecurityView'
import { DatabaseView } from './views/DatabaseView'
import { SettingsView } from './views/SettingsView'
import { UpdaterView } from './views/UpdaterView'
import { DiagnosticsView } from './views/DiagnosticsView'
import type { AppInfo } from '@shared/types'

type ViewTab = 'security' | 'database' | 'settings' | 'updater' | 'diagnostics'

export function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<ViewTab>('security')
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    // Load app info and settings
    const init = async (): Promise<void> => {
      try {
        const [info, settings] = await Promise.all([
          window.api.app.getInfo(),
          window.api.settings.get()
        ])
        setAppInfo(info)
        setTheme(settings.theme)
      } catch (err) {
        console.error('Failed to initialize app state:', err)
      }
    }
    void init()
  }, [])

  useEffect(() => {
    const applyTheme = (t: 'system' | 'light' | 'dark'): void => {
      if (t === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
      } else {
        document.documentElement.setAttribute('data-theme', t)
      }
    }

    applyTheme(theme)

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = (e: MediaQueryListEvent): void => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
      }
      mediaQuery.addEventListener('change', listener)
      return () => mediaQuery.removeEventListener('change', listener)
    }
    return undefined
  }, [theme])

  const handleThemeChange = async (newTheme: 'system' | 'light' | 'dark'): Promise<void> => {
    setTheme(newTheme)
    try {
      await window.api.settings.set({ theme: newTheme })
    } catch (err) {
      console.error('Failed to persist theme:', err)
    }
  }

  return (
    <div className="app-container">
      {/* Titlebar / Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              backgroundColor: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 'bold'
            }}
          >
            F
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Electron Foundation</span>
          <span className="badge badge-success" style={{ marginLeft: '6px' }}>
            SECURE
          </span>
        </div>

        <div className="app-header-interactive">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="app-body">
        {/* Navigation Sidebar */}
        <nav className="sidebar">
          <button
            className={`nav-item ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            🛡️ Security Posture
          </button>
          <button
            className={`nav-item ${activeTab === 'database' ? 'active' : ''}`}
            onClick={() => setActiveTab('database')}
          >
            💾 SQLite Storage
          </button>
          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings & Secrets
          </button>
          <button
            className={`nav-item ${activeTab === 'updater' ? 'active' : ''}`}
            onClick={() => setActiveTab('updater')}
          >
            🚀 Auto-Updater
          </button>
          <button
            className={`nav-item ${activeTab === 'diagnostics' ? 'active' : ''}`}
            onClick={() => setActiveTab('diagnostics')}
          >
            📋 Diagnostics & Logs
          </button>
        </nav>

        {/* Content View */}
        <main className="main-content">
          {activeTab === 'security' && <SecurityView />}
          {activeTab === 'database' && <DatabaseView />}
          {activeTab === 'settings' && (
            <SettingsView currentTheme={theme} onThemeChange={handleThemeChange} />
          )}
          {activeTab === 'updater' && <UpdaterView />}
          {activeTab === 'diagnostics' && <DiagnosticsView />}
        </main>
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <div>
          <span>Electron Foundation v{appInfo?.version || '0.1.0'}</span>
          <span style={{ margin: '0 8px' }}>•</span>
          <span>SQLite WAL: Active</span>
          <span style={{ margin: '0 8px' }}>•</span>
          <span>Fuses: Verified</span>
        </div>
        <div>
          <span>
            OS: {appInfo?.platform || 'desktop'} ({appInfo?.arch || 'x64'})
          </span>
        </div>
      </footer>
    </div>
  )
}
