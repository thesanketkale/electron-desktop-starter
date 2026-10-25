import { autoUpdater } from 'electron-updater'
import { app, type BrowserWindow } from 'electron'
import { log } from '../logging'
import type { UpdateInfo, UpdateState } from '../../shared/types'

let updateState: UpdateState = 'idle'
let currentChannel: 'latest' | 'beta' = 'latest'
let availableVersion: string | undefined
let releaseNotes: string | undefined
let progressPercent: number | undefined
let transferredBytes: number | undefined
let totalBytes: number | undefined
let errorMessage: string | undefined

let mainWindow: BrowserWindow | null = null

export function setUpdaterWindow(window: BrowserWindow | null): void {
  mainWindow = window
}

function broadcastUpdateStatus(): void {
  const status = getUpdateStatus()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:statusChanged', status)
  }
}

export function initUpdater(initialChannel: 'latest' | 'beta' = 'latest'): void {
  autoUpdater.logger = log
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  setUpdateChannel(initialChannel)

  // Configure custom mock feed URL if provided in environment (for tests)
  const mockServerUrl = process.env.FOUNDATION_UPDATE_URL
  if (mockServerUrl) {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: mockServerUrl
    })
  }

  autoUpdater.on('checking-for-update', () => {
    updateState = 'checking'
    errorMessage = undefined
    broadcastUpdateStatus()
  })

  autoUpdater.on('update-available', (info) => {
    updateState = 'available'
    availableVersion = info.version
    releaseNotes = typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined
    broadcastUpdateStatus()
  })

  autoUpdater.on('update-not-available', () => {
    updateState = 'not-available'
    broadcastUpdateStatus()
  })

  autoUpdater.on('download-progress', (progress) => {
    updateState = 'downloading'
    progressPercent = Math.round(progress.percent)
    transferredBytes = progress.transferred
    totalBytes = progress.total
    broadcastUpdateStatus()
  })

  autoUpdater.on('update-downloaded', (info) => {
    updateState = 'downloaded'
    availableVersion = info.version
    broadcastUpdateStatus()
  })

  autoUpdater.on('error', (err) => {
    updateState = 'error'
    errorMessage = err ? err.message : 'Unknown auto-updater error'
    broadcastUpdateStatus()
  })
}

export function setUpdateChannel(channel: 'latest' | 'beta'): void {
  currentChannel = channel
  autoUpdater.channel = channel
  autoUpdater.allowPrerelease = channel === 'beta'
  broadcastUpdateStatus()
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  updateState = 'checking'
  errorMessage = undefined
  broadcastUpdateStatus()

  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    updateState = 'error'
    errorMessage = error instanceof Error ? error.message : 'Failed to check for updates'
    broadcastUpdateStatus()
  }

  return getUpdateStatus()
}

export async function startDownload(): Promise<boolean> {
  if (updateState !== 'available') {
    return false
  }

  try {
    await autoUpdater.downloadUpdate()
    return true
  } catch (error) {
    updateState = 'error'
    errorMessage = error instanceof Error ? error.message : 'Failed to download update'
    broadcastUpdateStatus()
    return false
  }
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall(false, true)
}

export function getUpdateStatus(): UpdateInfo {
  return {
    state: updateState,
    currentVersion: app.getVersion(),
    availableVersion,
    releaseNotes,
    channel: currentChannel,
    progressPercent,
    transferredBytes,
    totalBytes,
    errorMessage
  }
}
