import { z } from 'zod'
import { IPC_CHANNELS } from './constants'
import type { AppInfo, SecurityStatus, NoteRecord, SettingsData, UpdateInfo } from './types'

// App Schemas
export const AppGetInfoRequestSchema = z.void()
export const AppGetInfoResponseSchema = z.custom<AppInfo>()

// Security Schemas
export const SecurityVerifyRequestSchema = z.void()
export const SecurityVerifyResponseSchema = z.custom<SecurityStatus>()

// DB Schemas
export const DbExecuteMigrationsRequestSchema = z.void()
export const DbExecuteMigrationsResponseSchema = z.object({
  previousVersion: z.number().int(),
  currentVersion: z.number().int(),
  appliedCount: z.number().int()
})

export const DbGetNotesRequestSchema = z
  .object({
    query: z.string().optional(),
    limit: z.number().int().positive().max(100).default(50),
    offset: z.number().int().min(0).default(0)
  })
  .optional()
export const DbGetNotesResponseSchema = z.array(z.custom<NoteRecord>())

export const DbCreateNoteRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  content: z.string().max(10000, 'Content cannot exceed 10000 characters')
})
export const DbCreateNoteResponseSchema = z.custom<NoteRecord>()

export const DbUpdateNoteRequestSchema = z.object({
  id: z.string().uuid('Invalid note ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  content: z.string().max(10000, 'Content cannot exceed 10000 characters')
})
export const DbUpdateNoteResponseSchema = z.custom<NoteRecord>()

export const DbDeleteNoteRequestSchema = z.object({
  id: z.string().uuid('Invalid note ID')
})
export const DbDeleteNoteResponseSchema = z.object({
  deleted: z.boolean(),
  id: z.string()
})

export const DbExportBackupRequestSchema = z
  .object({
    destinationPath: z.string().optional()
  })
  .optional()
export const DbExportBackupResponseSchema = z.object({
  backupPath: z.string(),
  sizeBytes: z.number()
})

// Settings Schemas
export const SettingsGetRequestSchema = z.void()
export const SettingsGetResponseSchema = z.custom<SettingsData>()

export const SettingsSetRequestSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  updateChannel: z.enum(['latest', 'beta']).optional(),
  autoCheckUpdates: z.boolean().optional(),
  windowState: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      x: z.number().int().optional(),
      y: z.number().int().optional(),
      isMaximized: z.boolean()
    })
    .optional()
})
export const SettingsSetResponseSchema = z.custom<SettingsData>()

export const SettingsGetSecretRequestSchema = z.object({
  key: z.string().min(1).max(100)
})
export const SettingsGetSecretResponseSchema = z.object({
  key: z.string(),
  hasValue: z.boolean(),
  maskedPreview: z.string()
})

export const SettingsSetSecretRequestSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(1000)
})
export const SettingsSetSecretResponseSchema = z.object({
  key: z.string(),
  stored: z.boolean(),
  encryptionMethod: z.enum(['safeStorage', 'fallback-obfuscated'])
})

// Logging Schemas
export const LogGetEntriesRequestSchema = z
  .object({
    limit: z.number().int().positive().max(500).default(100)
  })
  .optional()
export const LogGetEntriesResponseSchema = z.array(
  z.object({
    timestamp: z.string(),
    level: z.string(),
    message: z.string()
  })
)

export const LogExportDiagnosticsRequestSchema = z.void()
export const LogExportDiagnosticsResponseSchema = z.object({
  exportPath: z.string(),
  generatedAt: z.string(),
  entriesCount: z.number()
})

// Update Schemas
export const UpdateCheckRequestSchema = z.void()
export const UpdateCheckResponseSchema = z.custom<UpdateInfo>()

export const UpdateDownloadRequestSchema = z.void()
export const UpdateDownloadResponseSchema = z.object({
  started: z.boolean()
})

export const UpdateQuitAndInstallRequestSchema = z.void()
export const UpdateQuitAndInstallResponseSchema = z.void()

export const UpdateGetStatusRequestSchema = z.void()
export const UpdateGetStatusResponseSchema = z.custom<UpdateInfo>()

export const UpdateSetChannelRequestSchema = z.object({
  channel: z.enum(['latest', 'beta'])
})
export const UpdateSetChannelResponseSchema = z.object({
  channel: z.enum(['latest', 'beta'])
})

// Contract Map
export const IpcContract = {
  [IPC_CHANNELS.APP_GET_INFO]: {
    request: AppGetInfoRequestSchema,
    response: AppGetInfoResponseSchema
  },
  [IPC_CHANNELS.SECURITY_VERIFY]: {
    request: SecurityVerifyRequestSchema,
    response: SecurityVerifyResponseSchema
  },
  [IPC_CHANNELS.DB_EXECUTE_MIGRATIONS]: {
    request: DbExecuteMigrationsRequestSchema,
    response: DbExecuteMigrationsResponseSchema
  },
  [IPC_CHANNELS.DB_GET_NOTES]: {
    request: DbGetNotesRequestSchema,
    response: DbGetNotesResponseSchema
  },
  [IPC_CHANNELS.DB_CREATE_NOTE]: {
    request: DbCreateNoteRequestSchema,
    response: DbCreateNoteResponseSchema
  },
  [IPC_CHANNELS.DB_UPDATE_NOTE]: {
    request: DbUpdateNoteRequestSchema,
    response: DbUpdateNoteResponseSchema
  },
  [IPC_CHANNELS.DB_DELETE_NOTE]: {
    request: DbDeleteNoteRequestSchema,
    response: DbDeleteNoteResponseSchema
  },
  [IPC_CHANNELS.DB_EXPORT_BACKUP]: {
    request: DbExportBackupRequestSchema,
    response: DbExportBackupResponseSchema
  },
  [IPC_CHANNELS.SETTINGS_GET]: {
    request: SettingsGetRequestSchema,
    response: SettingsGetResponseSchema
  },
  [IPC_CHANNELS.SETTINGS_SET]: {
    request: SettingsSetRequestSchema,
    response: SettingsSetResponseSchema
  },
  [IPC_CHANNELS.SETTINGS_GET_SECRET]: {
    request: SettingsGetSecretRequestSchema,
    response: SettingsGetSecretResponseSchema
  },
  [IPC_CHANNELS.SETTINGS_SET_SECRET]: {
    request: SettingsSetSecretRequestSchema,
    response: SettingsSetSecretResponseSchema
  },
  [IPC_CHANNELS.LOG_GET_ENTRIES]: {
    request: LogGetEntriesRequestSchema,
    response: LogGetEntriesResponseSchema
  },
  [IPC_CHANNELS.LOG_EXPORT_DIAGNOSTICS]: {
    request: LogExportDiagnosticsRequestSchema,
    response: LogExportDiagnosticsResponseSchema
  },
  [IPC_CHANNELS.UPDATE_CHECK]: {
    request: UpdateCheckRequestSchema,
    response: UpdateCheckResponseSchema
  },
  [IPC_CHANNELS.UPDATE_DOWNLOAD]: {
    request: UpdateDownloadRequestSchema,
    response: UpdateDownloadResponseSchema
  },
  [IPC_CHANNELS.UPDATE_QUIT_AND_INSTALL]: {
    request: UpdateQuitAndInstallRequestSchema,
    response: UpdateQuitAndInstallResponseSchema
  },
  [IPC_CHANNELS.UPDATE_GET_STATUS]: {
    request: UpdateGetStatusRequestSchema,
    response: UpdateGetStatusResponseSchema
  },
  [IPC_CHANNELS.UPDATE_SET_CHANNEL]: {
    request: UpdateSetChannelRequestSchema,
    response: UpdateSetChannelResponseSchema
  }
} as const
