export const APP_ID = 'io.github.thesanketkale.electron-foundation'
export const APP_NAME = 'Electron Foundation'
export const PROTOCOL_SCHEME = 'app'
export const PROTOCOL_ORIGIN = `${PROTOCOL_SCHEME}://-`
export const DEEP_LINK_SCHEME = 'foundation'

export const IPC_CHANNELS = {
  APP_GET_INFO: 'app:getInfo',
  DB_EXECUTE_MIGRATIONS: 'db:executeMigrations',
  DB_GET_NOTES: 'db:getNotes',
  DB_CREATE_NOTE: 'db:createNote',
  DB_UPDATE_NOTE: 'db:updateNote',
  DB_DELETE_NOTE: 'db:deleteNote',
  DB_EXPORT_BACKUP: 'db:exportBackup',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_SECRET: 'settings:getSecret',
  SETTINGS_SET_SECRET: 'settings:setSecret',
  LOG_GET_ENTRIES: 'log:getEntries',
  LOG_EXPORT_DIAGNOSTICS: 'log:exportDiagnostics',
  UPDATE_CHECK: 'update:check',
  UPDATE_DOWNLOAD: 'update:download',
  UPDATE_QUIT_AND_INSTALL: 'update:quitAndInstall',
  UPDATE_GET_STATUS: 'update:getStatus',
  UPDATE_SET_CHANNEL: 'update:setChannel',
  SECURITY_VERIFY: 'security:verify'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
