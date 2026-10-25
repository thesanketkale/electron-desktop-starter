import { useEffect, useState } from 'react'
import type { UpdateInfo } from '@shared/types'

export function UpdaterView(): React.JSX.Element {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [loading, setLoading] = useState(false)

  const loadStatus = async (): Promise<void> => {
    try {
      const status = await window.api.update.getStatus()
      setUpdateInfo(status)
    } catch (err) {
      console.error('Failed to get update status:', err)
    }
  }

  useEffect(() => {
    void loadStatus()

    // Listen for live update events from main process
    const unsubscribe = window.api.update.onStatusChanged((info) => {
      setUpdateInfo(info)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleCheck = async (): Promise<void> => {
    setLoading(true)
    try {
      const result = await window.api.update.check()
      setUpdateInfo(result)
    } catch (err) {
      console.error('Check failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (): Promise<void> => {
    try {
      await window.api.update.download()
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  const handleInstall = (): void => {
    void window.api.update.quitAndInstall()
  }

  return (
    <div className="view-container">
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
            <h2 className="card-title">Release & Auto-Update Pipeline</h2>
            <p className="card-description">
              Powered by electron-updater with GitHub Releases or custom feed providers.
            </p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleCheck}
            disabled={loading || updateInfo?.state === 'checking'}
          >
            {loading || updateInfo?.state === 'checking' ? 'Checking...' : 'Check for Updates'}
          </button>
        </div>

        {updateInfo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px'
              }}
            >
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  CURRENT VERSION
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                  v{updateInfo.currentVersion}
                </div>
              </div>

              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  TARGET CHANNEL
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600, textTransform: 'uppercase' }}>
                  {updateInfo.channel}
                </div>
              </div>

              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  LIFECYCLE STATE
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600, textTransform: 'capitalize' }}>
                  {updateInfo.state.replace('-', ' ')}
                </div>
              </div>
            </div>

            {updateInfo.state === 'available' && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--success-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--success)'
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: '6px' }}>
                  New Version Available: v{updateInfo.availableVersion}
                </div>
                {updateInfo.releaseNotes && (
                  <p style={{ fontSize: '0.875rem', marginBottom: '12px' }}>
                    {updateInfo.releaseNotes}
                  </p>
                )}
                <button className="btn btn-primary btn-sm" onClick={handleDownload}>
                  Download Update
                </button>
              </div>
            )}

            {updateInfo.state === 'downloading' && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    fontSize: '0.875rem'
                  }}
                >
                  <span>Downloading package...</span>
                  <span>{updateInfo.progressPercent ?? 0}%</span>
                </div>
                <div
                  style={{
                    height: '8px',
                    width: '100%',
                    backgroundColor: 'var(--border-subtle)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${updateInfo.progressPercent ?? 0}%`,
                      backgroundColor: 'var(--accent)',
                      transition: 'width 200ms ease-out'
                    }}
                  />
                </div>
              </div>
            )}

            {updateInfo.state === 'downloaded' && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--success-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: '8px' }}>
                  Update v{updateInfo.availableVersion} downloaded and ready to install!
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleInstall}>
                  Restart & Install Now
                </button>
              </div>
            )}

            {updateInfo.state === 'not-available' && (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                You are currently on the latest available version.
              </div>
            )}

            {updateInfo.state === 'error' && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--danger-subtle)',
                  color: 'var(--danger)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem'
                }}
              >
                Error checking or downloading update: {updateInfo.errorMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
