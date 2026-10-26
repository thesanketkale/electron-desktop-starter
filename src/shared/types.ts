export interface AppInfo {
  name: string
  version: string
  electronVersion: string
  nodeVersion: string
  chromeVersion: string
  platform: NodeJS.Platform
  arch: string
  isPackaged: boolean
  userDataPath: string
}

export interface SecurityStatus {
  contextIsolation: boolean
  sandbox: boolean
  nodeIntegration: boolean
  webviewTag: boolean
  customProtocol: boolean
  cspEnforced: boolean
  fuses: {
    runAsNodeDisabled: boolean
    nodeOptionsDisabled: boolean
    inspectArgsDisabled: boolean
    embeddedAsarIntegrityValidated: boolean
    onlyLoadAppFromAsar: boolean
  }
}

export interface NoteRecord {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface SettingsData {
  theme: 'system' | 'light' | 'dark'
  updateChannel: 'latest' | 'beta'
  autoCheckUpdates: boolean
  windowState?: {
    width: number
    height: number
    x?: number
    y?: number
    isMaximized: boolean
  }
}

export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface UpdateInfo {
  state: UpdateState
  currentVersion: string
  availableVersion?: string
  releaseDate?: string
  releaseNotes?: string
  channel: 'latest' | 'beta'
  progressPercent?: number
  transferredBytes?: number
  totalBytes?: number
  errorMessage?: string
}

export interface IpcResponseSuccess<T> {
  success: true
  data: T
}

export interface IpcResponseError {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type IpcResult<T> = IpcResponseSuccess<T> | IpcResponseError
