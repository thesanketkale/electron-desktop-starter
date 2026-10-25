import { app } from 'electron'
import { join } from 'node:path'
import { IPC_CHANNELS } from '../../shared/constants'
import {
  AppGetInfoRequestSchema,
  SecurityVerifyRequestSchema,
  DbExecuteMigrationsRequestSchema,
  DbGetNotesRequestSchema,
  DbCreateNoteRequestSchema,
  DbUpdateNoteRequestSchema,
  DbDeleteNoteRequestSchema,
  DbExportBackupRequestSchema,
  SettingsGetRequestSchema,
  SettingsSetRequestSchema,
  SettingsGetSecretRequestSchema,
  SettingsSetSecretRequestSchema,
  LogGetEntriesRequestSchema,
  LogExportDiagnosticsRequestSchema,
  UpdateCheckRequestSchema,
  UpdateDownloadRequestSchema,
  UpdateQuitAndInstallRequestSchema,
  UpdateGetStatusRequestSchema,
  UpdateSetChannelRequestSchema
} from '../../shared/ipc'
import { registerIpcHandler } from './register'
import { getSecurityStatus } from '../security'
import { getDatabaseContext } from '../db'
import { applyMigrations } from '../db/migrator'
import type { SettingsManager } from '../settings'
import { getRecentLogs, generateDiagnosticsBundle } from '../logging'
import {
  checkForUpdates,
  startDownload,
  quitAndInstall,
  getUpdateStatus,
  setUpdateChannel
} from '../updater'

export function registerAllIpcHandlers(
  settingsManager: SettingsManager,
  isDev = process.env.NODE_ENV === 'development'
): void {
  // App info
  registerIpcHandler(
    IPC_CHANNELS.APP_GET_INFO,
    AppGetInfoRequestSchema,
    () => {
      return {
        name: app.getName(),
        version: app.getVersion(),
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        chromeVersion: process.versions.chrome,
        platform: process.platform,
        arch: process.arch,
        isPackaged: app.isPackaged,
        userDataPath: app.getPath('userData')
      }
    },
    isDev
  )

  // Security status
  registerIpcHandler(
    IPC_CHANNELS.SECURITY_VERIFY,
    SecurityVerifyRequestSchema,
    () => {
      return getSecurityStatus()
    },
    isDev
  )

  // Database operations
  registerIpcHandler(
    IPC_CHANNELS.DB_EXECUTE_MIGRATIONS,
    DbExecuteMigrationsRequestSchema,
    () => {
      const { db } = getDatabaseContext()
      return applyMigrations(db)
    },
    isDev
  )

  registerIpcHandler(
    IPC_CHANNELS.DB_GET_NOTES,
    DbGetNotesRequestSchema,
    (req) => {
      const { repository } = getDatabaseContext()
      return repository.getNotes(req?.query, req?.limit, req?.offset)
    },
    isDev
  )

  registerIpcHandler(
    IPC_CHANNELS.DB_CREATE_NOTE,
    DbCreateNoteRequestSchema,
    (req) => {
      const { repository } = getDatabaseContext()
      return repository.createNote(req.title, req.content)
    },
    isDev
  )

  registerIpcHandler(
    IPC_CHANNELS.DB_UPDATE_NOTE,
    DbUpdateNoteRequestSchema,
    (req) => {
      const { repository } = getDatabaseContext()
      return repository.updateNote(req.id, req.title, req.content)
    },
    isDev
  )

  registerIpcHandler(
    IPC_CHANNELS.DB_DELETE_NOTE,
    DbDeleteNoteRequestSchema,
    (req) => {
      const { repository } = getDatabaseContext()
      const deleted = repository.deleteNote(req.id)
      return { deleted, id: req.id }
    },
    isDev
  )

  registerIpcHandler(
    IPC_CHANNELS.DB_EXPORT_BACKUP,
    DbExportBackupRequestSchema,
    async (req) => {
      const { repository } = getDatabaseContext()
      const destination =
        req?.destinationPath ||
        join(
          app.getPath('userData'),
          `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`
        )

      const sizeBytes = await repository.exportBackup(destination)
      return {
        backupPath: destination,
        sizeBytes
      }
    },
    isDev
  )

  // Settings
  registerIpcHandler(
    IPC_CHANNELS.SETTINGS_GET,
    SettingsGetRequestSchema,
    () => {
      return settingsManager.getSettings()
    },
    isDev
  )

  registerIpcHandler(
    IPC_CHANNELS.SETTINGS_SET,
    SettingsSetRequestSchema,
    (req) => {
      const updated = settingsManager.updateSettings(req)
      if (req.updateChannel) {
        setUpdateChannel(req.updateChannel)
      }
      return updated
    },
    isDev
  )

  registerIpcHandler(
    IPC_CHANNELS.SETTINGS_GET_SECRET,
    SettingsGetSecretRequestSchema,
    (req) => {
      return settingsManager.getSecret(req.key)
    },
    isDev
  )

  registerIpcHandler(
    IPC_CHANNELS.SETTINGS_SET_SECRET,
    SettingsSetSecretRequestSchema,
    (req) => {
      return settingsManager.setSecret(req.key, req.value)
    },
    isDev
  )

  // Logging
  registerIpcHandler(
    IPC_CHANNELS.LOG_GET_ENTRIES,
    LogGetEntriesRequestSchema,
    (req) => {
      return getRecentLogs(req?.limit)
    },
    isDev
  )

  registerIpcHandler(
    IPC_CHANNELS.LOG_EXPORT_DIAGNOSTICS,
    LogExportDiagnosticsRequestSchema,
    () => {
      const { migrationResult } = getDatabaseContext()
      return generateDiagnosticsBundle(app.getPath('userData'), {
        databaseSchemaVersion: migrationResult.currentVersion
      })
    },
    isDev
  )

  // Auto-Update
  registerIpcHandler(
    IPC_CHANNELS.UPDATE_CHECK,
    UpdateCheckRequestSchema,
    async () => {
      return checkForUpdates()
    },
    isDev
  )

  registerIpcHandler(
    IPC_CHANNELS.UPDATE_DOWNLOAD,
    UpdateDownloadRequestSchema,
    async () => {
      const started = await startDownload()
      return { started }
    },
    isDev
  )

  registerIpcHandler(
    IPC_CHANNELS.UPDATE_QUIT_AND_INSTALL,
    UpdateQuitAndInstallRequestSchema,
    () => {
      quitAndInstall()
    },
    isDev
  )

  registerIpcHandler(
    IPC_CHANNELS.UPDATE_GET_STATUS,
    UpdateGetStatusRequestSchema,
    () => {
      return getUpdateStatus()
    },
    isDev
  )

  registerIpcHandler(
    IPC_CHANNELS.UPDATE_SET_CHANNEL,
    UpdateSetChannelRequestSchema,
    (req) => {
      setUpdateChannel(req.channel)
      settingsManager.updateSettings({ updateChannel: req.channel })
      return { channel: req.channel }
    },
    isDev
  )
}
