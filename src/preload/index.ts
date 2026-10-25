import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/constants'
import type {
  AppInfo,
  SecurityStatus,
  NoteRecord,
  SettingsData,
  UpdateInfo,
  IpcResult
} from '../shared/types'

async function invokeIpc<TReq, TRes>(channel: string, payload?: TReq): Promise<TRes> {
  const result = (await ipcRenderer.invoke(channel, payload)) as IpcResult<TRes>
  if (!result.success) {
    const error = new Error(result.error.message)
    error.name = result.error.code
    ;(error as unknown as { code?: string; details?: unknown }).code = result.error.code
    ;(error as unknown as { code?: string; details?: unknown }).details = result.error.details
    throw error
  }
  return result.data
}

export const api = {
  app: {
    getInfo: (): Promise<AppInfo> => invokeIpc(IPC_CHANNELS.APP_GET_INFO)
  },
  security: {
    verify: (): Promise<SecurityStatus> => invokeIpc(IPC_CHANNELS.SECURITY_VERIFY)
  },
  db: {
    executeMigrations: (): Promise<{
      previousVersion: number
      currentVersion: number
      appliedCount: number
    }> => invokeIpc(IPC_CHANNELS.DB_EXECUTE_MIGRATIONS),
    getNotes: (options?: {
      query?: string
      limit?: number
      offset?: number
    }): Promise<NoteRecord[]> => invokeIpc(IPC_CHANNELS.DB_GET_NOTES, options),
    createNote: (title: string, content: string): Promise<NoteRecord> =>
      invokeIpc(IPC_CHANNELS.DB_CREATE_NOTE, { title, content }),
    updateNote: (id: string, title: string, content: string): Promise<NoteRecord> =>
      invokeIpc(IPC_CHANNELS.DB_UPDATE_NOTE, { id, title, content }),
    deleteNote: (id: string): Promise<{ deleted: boolean; id: string }> =>
      invokeIpc(IPC_CHANNELS.DB_DELETE_NOTE, { id }),
    exportBackup: (destinationPath?: string): Promise<{ backupPath: string; sizeBytes: number }> =>
      invokeIpc(IPC_CHANNELS.DB_EXPORT_BACKUP, { destinationPath })
  },
  settings: {
    get: (): Promise<SettingsData> => invokeIpc(IPC_CHANNELS.SETTINGS_GET),
    set: (data: Partial<SettingsData>): Promise<SettingsData> =>
      invokeIpc(IPC_CHANNELS.SETTINGS_SET, data),
    getSecret: (key: string): Promise<{ key: string; hasValue: boolean; maskedPreview: string }> =>
      invokeIpc(IPC_CHANNELS.SETTINGS_GET_SECRET, { key }),
    setSecret: (
      key: string,
      value: string
    ): Promise<{ key: string; stored: boolean; encryptionMethod: string }> =>
      invokeIpc(IPC_CHANNELS.SETTINGS_SET_SECRET, { key, value })
  },
  log: {
    getEntries: (
      limit?: number
    ): Promise<Array<{ timestamp: string; level: string; message: string }>> =>
      invokeIpc(IPC_CHANNELS.LOG_GET_ENTRIES, { limit }),
    exportDiagnostics: (): Promise<{
      exportPath: string
      generatedAt: string
      entriesCount: number
    }> => invokeIpc(IPC_CHANNELS.LOG_EXPORT_DIAGNOSTICS)
  },
  update: {
    check: (): Promise<UpdateInfo> => invokeIpc(IPC_CHANNELS.UPDATE_CHECK),
    download: (): Promise<{ started: boolean }> => invokeIpc(IPC_CHANNELS.UPDATE_DOWNLOAD),
    quitAndInstall: (): Promise<void> => invokeIpc(IPC_CHANNELS.UPDATE_QUIT_AND_INSTALL),
    getStatus: (): Promise<UpdateInfo> => invokeIpc(IPC_CHANNELS.UPDATE_GET_STATUS),
    setChannel: (channel: 'latest' | 'beta'): Promise<{ channel: 'latest' | 'beta' }> =>
      invokeIpc(IPC_CHANNELS.UPDATE_SET_CHANNEL, { channel }),
    onStatusChanged: (callback: (info: UpdateInfo) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, info: UpdateInfo): void => {
        callback(info)
      }
      ipcRenderer.on('update:statusChanged', handler)
      return () => {
        ipcRenderer.removeListener('update:statusChanged', handler)
      }
    }
  }
}

// Expose safe, whitelisted API on window.api
try {
  contextBridge.exposeInMainWorld('api', api)
} catch {
  // Preload execution in non-isolated test environments
  ;(window as unknown as { api: typeof api }).api = api
}
