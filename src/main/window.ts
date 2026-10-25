import { BrowserWindow } from 'electron'
import { join } from 'node:path'
import { PROTOCOL_ORIGIN } from '../shared/constants'
import { setupWindowSecurity } from './security'
import type { SettingsManager } from './settings'

export function createMainWindow(settingsManager: SettingsManager): BrowserWindow {
  const isDev = process.env.NODE_ENV === 'development'
  const savedState = settingsManager.getSettings().windowState

  const window = new BrowserWindow({
    width: savedState?.width ?? 1024,
    height: savedState?.height ?? 768,
    x: savedState?.x,
    y: savedState?.y,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: false,
    title: 'Electron Foundation',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  // Enforce security boundaries
  setupWindowSecurity(window, isDev)

  if (savedState?.isMaximized) {
    window.maximize()
  }

  // Gracefully display window once renderer is ready
  window.on('ready-to-show', () => {
    window.show()
  })

  // Track window state changes for persistence
  const saveState = (): void => {
    if (window.isDestroyed()) {
      return
    }
    const isMaximized = window.isMaximized()
    if (!isMaximized) {
      const bounds = window.getBounds()
      settingsManager.updateSettings({
        windowState: {
          width: bounds.width,
          height: bounds.height,
          x: bounds.x,
          y: bounds.y,
          isMaximized: false
        }
      })
    } else {
      settingsManager.updateSettings({
        windowState: {
          width: savedState?.width ?? 1024,
          height: savedState?.height ?? 768,
          isMaximized: true
        }
      })
    }
  }

  window.on('resize', saveState)
  window.on('move', saveState)
  window.on('close', saveState)

  // Load URL
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else if (isDev) {
    void window.loadURL('http://localhost:5173')
  } else {
    void window.loadURL(`${PROTOCOL_ORIGIN}/index.html`)
  }

  return window
}
