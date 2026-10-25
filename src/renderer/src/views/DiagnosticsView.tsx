import { useEffect, useState } from 'react'
import type { AppInfo } from '@shared/types'

interface LogMessage {
  timestamp: string
  level: string
  message: string
}

export function DiagnosticsView(): React.JSX.Element {
  const [logs, setLogs] = useState<LogMessage[]>([])
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [exportNotice, setExportNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadData = async (): Promise<void> => {
    setLoading(true)
    try {
      const [entries, info] = await Promise.all([
        window.api.log.getEntries(100),
        window.api.app.getInfo()
      ])
      setLogs(entries)
      setAppInfo(info)
    } catch (err) {
      console.error('Failed to load diagnostics data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleExport = async (): Promise<void> => {
    try {
      const result = await window.api.log.exportDiagnostics()
      setExportNotice(`Exported ${result.entriesCount} log entries to diagnostics bundle.`)
      setTimeout(() => setExportNotice(null), 5000)
    } catch (err) {
      console.error('Export failed:', err)
      setExportNotice('Failed to export diagnostics bundle.')
    }
  }

  return (
    <div
      className="view-container"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}
        >
          <div>
            <h2 className="card-title">Diagnostics & Structured Logs</h2>
            <p className="card-description">
              Rotated local logs with automated secret redaction and diagnostic export.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {exportNotice && <span className="badge badge-success">{exportNotice}</span>}
            <button className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading}>
              Refresh
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleExport}>
              Export Bundle
            </button>
          </div>
        </div>

        {appInfo && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px',
              marginBottom: '16px'
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--bg-surface-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem'
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Electron: </span>
              <strong>v{appInfo.electronVersion}</strong>
            </div>
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--bg-surface-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem'
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Node: </span>
              <strong>v{appInfo.nodeVersion}</strong>
            </div>
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--bg-surface-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem'
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Chromium: </span>
              <strong>v{appInfo.chromeVersion}</strong>
            </div>
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--bg-surface-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem'
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>OS: </span>
              <strong>
                {appInfo.platform} ({appInfo.arch})
              </strong>
            </div>
          </div>
        )}

        {/* Console viewer */}
        <div
          style={{
            backgroundColor: '#030712',
            color: '#f9fafb',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            height: '240px',
            overflowY: 'auto',
            border: '1px solid #1f2937'
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: '#9ca3af' }}>No log entries in memory buffer.</div>
          ) : (
            logs.map((entry, index) => (
              <div key={index} style={{ marginBottom: '4px', lineHeight: 1.4 }}>
                <span style={{ color: '#6b7280' }}>
                  [{entry.timestamp.split('T')[1]?.slice(0, 8)}]{' '}
                </span>
                <span
                  style={{
                    color:
                      entry.level === 'error'
                        ? '#ef4444'
                        : entry.level === 'warn'
                          ? '#f59e0b'
                          : '#10b981',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}
                >
                  {entry.level}
                </span>
                <span style={{ color: '#e5e7eb' }}> {entry.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
