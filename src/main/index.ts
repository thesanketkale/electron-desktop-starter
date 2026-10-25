import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { registerPrivilegedSchemes, setupProtocolHandler } from './protocol'
import { setupContentSecurityPolicy, setupPermissionHandlers } from './security'
import { initDatabase, closeDatabase } from './db'
import { SettingsManager } from './settings'
import { setupLogging, log } from './logging'
import { initUpdater, setUpdaterWindow } from './updater'
import { registerAllIpcHandlers } from './ipc/handlers'
import { setupApplicationMenu } from './menu'
import { createMainWindow } from './window'
import { DEEP_LINK_SCHEME } from '../shared/constants'

// 1. Register privileged schemes before app is ready
registerPrivilegedSchemes()

// 2. Request single-instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
  process.exit(0)
}

let mainWindow: BrowserWindow | null = null
let settingsManager: SettingsManager | null = null

// 3. Register deep-link protocol (foundation://)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME, process.execPath, [process.argv[1]!])
  }
} else {
  app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME)
}

// Handle second instance activation
app.on('second-instance', (_event, commandLine) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.focus()

    // Inspect commandLine for deep-link URL if needed
    const deepLinkUrl = commandLine.find((arg) => arg.startsWith(`${DEEP_LINK_SCHEME}://`))
    if (deepLinkUrl) {
      log.info(`Received deep-link via second-instance: ${deepLinkUrl}`)
    }
  }
})

// Application lifecycle setup
app.whenReady().then(() => {
  const userDataPath = app.getPath('userData')
  const isDev = process.env.NODE_ENV === 'development'

  // Initialize structured logging with redaction
  setupLogging(userDataPath)
  log.info(
    `Starting Electron Foundation v${app.getVersion()} [env: ${process.env.NODE_ENV || 'production'}]`
  )

  // Configure protocol and CSP headers
  const rendererPath = join(__dirname, '../renderer')
  setupProtocolHandler(rendererPath)
  setupContentSecurityPolicy(isDev)
  setupPermissionHandlers()

  // Initialize persistence & settings
  initDatabase(userDataPath)
  settingsManager = new SettingsManager(userDataPath)

  // Initialize auto-updater
  initUpdater(settingsManager.getSettings().updateChannel)

  // Register all secure IPC handlers
  registerAllIpcHandlers(settingsManager, isDev)

  // Application menu
  setupApplicationMenu()

  // Create main window
  mainWindow = createMainWindow(settingsManager)
  setUpdaterWindow(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && settingsManager) {
      mainWindow = createMainWindow(settingsManager)
      setUpdaterWindow(mainWindow)
    }
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
